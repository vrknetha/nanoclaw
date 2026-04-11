import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

import {
  CONTAINER_MAX_OUTPUT_SIZE,
  CONTAINER_TIMEOUT,
  IDLE_TIMEOUT,
} from '../core/config.js';
import { logger } from '../core/logger.js';
import { stopContainer } from './container-runtime.js';
import {
  OUTPUT_END_MARKER,
  OUTPUT_START_MARKER,
} from './container-runner-markers.js';
import {
  ContainerOutput,
  RunnerProcessSpec,
} from './container-runner-types.js';

function parseLegacyOutput(stdout: string): ContainerOutput {
  const startIdx = stdout.indexOf(OUTPUT_START_MARKER);
  const endIdx = stdout.indexOf(OUTPUT_END_MARKER);

  let jsonLine: string;
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    jsonLine = stdout
      .slice(startIdx + OUTPUT_START_MARKER.length, endIdx)
      .trim();
  } else {
    const lines = stdout.trim().split('\n');
    jsonLine = lines[lines.length - 1];
  }

  return JSON.parse(jsonLine) as ContainerOutput;
}

export function executeRunnerProcess(
  spec: RunnerProcessSpec,
): Promise<ContainerOutput> {
  const {
    group,
    input,
    command,
    args,
    env,
    onProcess,
    onOutput,
    options,
    runtime,
    runnerLabel,
    processName,
    startTime,
    logsDir,
    runtimeDetails,
    mounts,
  } = spec;

  return new Promise((resolve) => {
    const runner = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env,
    });

    onProcess(runner, processName);

    let stdout = '';
    let stderr = '';
    let stdoutTruncated = false;
    let stderrTruncated = false;

    runner.stdin.write(JSON.stringify(input));
    runner.stdin.end();

    let parseBuffer = '';
    let newSessionId: string | undefined;
    let outputChain = Promise.resolve();
    let timedOut = false;
    let hadStreamingOutput = false;
    const configuredTimeout =
      options?.timeoutMs ?? group.containerConfig?.timeout ?? CONTAINER_TIMEOUT;
    const timeoutMs =
      options?.timeoutMs != null
        ? configuredTimeout
        : Math.max(configuredTimeout, IDLE_TIMEOUT + 30_000);

    const killOnTimeout = () => {
      timedOut = true;
      logger.error(
        { group: group.name, runtime, processName },
        `${runnerLabel} timeout, stopping`,
      );
      if (runtime === 'container') {
        try {
          stopContainer(processName);
          return;
        } catch (err) {
          logger.warn(
            { group: group.name, processName, err },
            'Graceful stop failed, force killing',
          );
        }
      }
      runner.kill('SIGKILL');
    };

    let timeout = setTimeout(killOnTimeout, timeoutMs);
    const resetTimeout = () => {
      clearTimeout(timeout);
      timeout = setTimeout(killOnTimeout, timeoutMs);
    };

    runner.stdout.on('data', (data) => {
      const chunk = data.toString();

      if (!stdoutTruncated) {
        const remaining = CONTAINER_MAX_OUTPUT_SIZE - stdout.length;
        if (chunk.length > remaining) {
          stdout += chunk.slice(0, remaining);
          stdoutTruncated = true;
          logger.warn(
            { group: group.name, size: stdout.length },
            'Container stdout truncated due to size limit',
          );
        } else {
          stdout += chunk;
        }
      }

      if (onOutput) {
        parseBuffer += chunk;
        let startIdx: number;
        while ((startIdx = parseBuffer.indexOf(OUTPUT_START_MARKER)) !== -1) {
          const endIdx = parseBuffer.indexOf(OUTPUT_END_MARKER, startIdx);
          if (endIdx === -1) break;

          const jsonStr = parseBuffer
            .slice(startIdx + OUTPUT_START_MARKER.length, endIdx)
            .trim();
          parseBuffer = parseBuffer.slice(endIdx + OUTPUT_END_MARKER.length);

          try {
            const parsed: ContainerOutput = JSON.parse(jsonStr);
            if (parsed.newSessionId) {
              newSessionId = parsed.newSessionId;
            }
            hadStreamingOutput = true;
            resetTimeout();
            outputChain = outputChain.then(() => onOutput(parsed));
          } catch (err) {
            logger.warn(
              { group: group.name, error: err },
              'Failed to parse streamed output chunk',
            );
          }
        }
      }
    });

    runner.stderr.on('data', (data) => {
      const chunk = data.toString();
      const lines = chunk.trim().split('\n');
      for (const line of lines) {
        if (line) logger.debug({ container: group.folder }, line);
      }
      if (stderrTruncated) return;
      const remaining = CONTAINER_MAX_OUTPUT_SIZE - stderr.length;
      if (chunk.length > remaining) {
        stderr += chunk.slice(0, remaining);
        stderrTruncated = true;
        logger.warn(
          { group: group.name, size: stderr.length },
          'Container stderr truncated due to size limit',
        );
      } else {
        stderr += chunk;
      }
    });

    runner.on('close', (code) => {
      clearTimeout(timeout);
      const duration = Date.now() - startTime;

      if (timedOut) {
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const timeoutLog = path.join(logsDir, `agent-${ts}.log`);
        fs.writeFileSync(
          timeoutLog,
          [
            `=== Agent Run Log (TIMEOUT) ===`,
            `Timestamp: ${new Date().toISOString()}`,
            `Group: ${group.name}`,
            `Runtime: ${runtime}`,
            `Process: ${processName}`,
            `Duration: ${duration}ms`,
            `Exit Code: ${code}`,
            `Had Streaming Output: ${hadStreamingOutput}`,
          ].join('\n'),
        );

        if (hadStreamingOutput) {
          logger.info(
            { group: group.name, runtime, processName, duration, code },
            `${runnerLabel} timed out after output (idle cleanup)`,
          );
          outputChain.then(() => {
            resolve({
              status: 'success',
              result: null,
              newSessionId,
            });
          });
          return;
        }

        logger.error(
          { group: group.name, runtime, processName, duration, code },
          `${runnerLabel} timed out with no output`,
        );

        resolve({
          status: 'error',
          result: null,
          error: `${runnerLabel} timed out after ${timeoutMs}ms`,
        });
        return;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const logFile = path.join(logsDir, `agent-${timestamp}.log`);
      const isVerbose =
        process.env.LOG_LEVEL === 'debug' || process.env.LOG_LEVEL === 'trace';

      const logLines = [
        `=== Agent Run Log ===`,
        `Timestamp: ${new Date().toISOString()}`,
        `Group: ${group.name}`,
        `Runtime: ${runtime}`,
        `IsMain: ${input.isMain}`,
        `Duration: ${duration}ms`,
        `Exit Code: ${code}`,
        `Stdout Truncated: ${stdoutTruncated}`,
        `Stderr Truncated: ${stderrTruncated}`,
        ``,
      ];

      const isError = code !== 0;
      if (isVerbose || isError) {
        if (isVerbose) {
          logLines.push(`=== Input ===`, JSON.stringify(input, null, 2), ``);
        } else {
          logLines.push(
            `=== Input Summary ===`,
            `Prompt length: ${input.prompt.length} chars`,
            `Session ID: ${input.sessionId || 'new'}`,
            ``,
          );
        }
        logLines.push(
          `=== Spawn Command ===`,
          [command, ...args].join(' '),
          ``,
          `=== Runtime Details ===`,
          runtimeDetails.join('\n'),
          ``,
          `=== Stderr${stderrTruncated ? ' (TRUNCATED)' : ''} ===`,
          stderr,
          ``,
          `=== Stdout${stdoutTruncated ? ' (TRUNCATED)' : ''} ===`,
          stdout,
        );
      } else {
        logLines.push(
          `=== Input Summary ===`,
          `Prompt length: ${input.prompt.length} chars`,
          `Session ID: ${input.sessionId || 'new'}`,
          ``,
          `=== Runtime Details ===`,
          runtime === 'container'
            ? mounts
                .map((m) => `${m.containerPath}${m.readonly ? ' (ro)' : ''}`)
                .join('\n')
            : runtimeDetails.join('\n'),
          ``,
        );
      }

      fs.writeFileSync(logFile, logLines.join('\n'));
      logger.debug({ logFile, verbose: isVerbose }, 'Container log written');

      if (code !== 0) {
        logger.error(
          {
            group: group.name,
            runtime,
            code,
            duration,
            stderr,
            stdout,
            logFile,
          },
          `${runnerLabel} exited with error`,
        );

        resolve({
          status: 'error',
          result: null,
          error: `${runnerLabel} exited with code ${code}: ${stderr.slice(-200)}`,
        });
        return;
      }

      if (onOutput) {
        outputChain.then(() => {
          logger.info(
            { group: group.name, runtime, duration, newSessionId },
            `${runnerLabel} completed (streaming mode)`,
          );
          resolve({
            status: 'success',
            result: null,
            newSessionId,
          });
        });
        return;
      }

      try {
        const output = parseLegacyOutput(stdout);

        logger.info(
          {
            group: group.name,
            runtime,
            duration,
            status: output.status,
            hasResult: !!output.result,
          },
          `${runnerLabel} completed`,
        );

        resolve(output);
      } catch (err) {
        logger.error(
          {
            group: group.name,
            runtime,
            stdout,
            stderr,
            error: err,
          },
          'Failed to parse runner output',
        );

        resolve({
          status: 'error',
          result: null,
          error: `Failed to parse runner output: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    });

    runner.on('error', (err) => {
      clearTimeout(timeout);
      logger.error(
        { group: group.name, runtime, processName, error: err },
        `${runnerLabel} spawn error`,
      );
      resolve({
        status: 'error',
        result: null,
        error: `${runnerLabel} spawn error: ${err.message}`,
      });
    });
  });
}
