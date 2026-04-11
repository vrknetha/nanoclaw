import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import {
  AGENT_RUNTIME,
  AGENT_RUNTIME_INVALID,
  AGENT_RUNTIME_RAW,
  AgentRuntime,
  ONECLI_URL,
} from '../core/config.js';
import { readEnvFile } from '../core/env.js';
import { cleanupOrphans } from './container-runtime.js';

export interface RuntimeDiagnosticDetails {
  runtimeEnvRaw: string;
  runtimeBinary: string;
  runtimeBinaryReady: boolean;
  hostRunnerPath?: string;
  hostMcpPath?: string;
  hostArtifactsPresent?: boolean;
  hostBuildAttempted?: boolean;
  hostBuildSucceeded?: boolean;
  onecliUrlConfigured: boolean;
  credentialPathStatus: 'onecli+env' | 'onecli-only' | 'env-only' | 'missing';
}

export interface RuntimeDiagnostics {
  mode: AgentRuntime;
  ok: boolean;
  errors: string[];
  warnings: string[];
  fixes: string[];
  checkedAt: string;
  details: RuntimeDiagnosticDetails;
}

export interface RuntimeDiagnosticsOptions {
  mode?: AgentRuntime;
  autoBuildHostRunner?: boolean;
}

let cachedDiagnostics: RuntimeDiagnostics | null = null;

function summarizeExecError(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  return err.message.replace(/\s+/g, ' ').trim();
}

function readCredentialPathStatus():
  | 'onecli+env'
  | 'onecli-only'
  | 'env-only'
  | 'missing' {
  const envKeys = readEnvFile([
    'CLAUDE_CODE_OAUTH_TOKEN',
    'ANTHROPIC_API_KEY',
    'ANTHROPIC_AUTH_TOKEN',
  ]);
  const hasEnvCredentials = Object.values(envKeys).some((v) => Boolean(v));
  const onecliConfigured = Boolean(ONECLI_URL?.trim());
  if (onecliConfigured && hasEnvCredentials) return 'onecli+env';
  if (onecliConfigured) return 'onecli-only';
  if (hasEnvCredentials) return 'env-only';
  return 'missing';
}

function checkContainerRuntime(errors: string[], fixes: string[]): boolean {
  try {
    execSync('docker info', {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 10_000,
    });
    return true;
  } catch (err) {
    errors.push(`Container runtime check failed: ${summarizeExecError(err)}`);
    fixes.push(
      'Start Docker (or your configured container runtime) and run `docker info`.',
    );
    return false;
  }
}

function buildHostArtifacts(
  hostRunnerPath: string,
  hostMcpPath: string,
  errors: string[],
  fixes: string[],
): { attempted: boolean; succeeded: boolean } {
  const attempted = true;
  try {
    execSync('npm --prefix container/agent-runner run build', {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 300_000,
    });
  } catch (err) {
    errors.push(`Host runner build failed: ${summarizeExecError(err)}`);
    fixes.push(
      'Run `npm --prefix container/agent-runner run build` and resolve build errors.',
    );
    return { attempted, succeeded: false };
  }

  if (!fs.existsSync(hostRunnerPath) || !fs.existsSync(hostMcpPath)) {
    errors.push(
      'Host runner build completed but required artifacts are still missing.',
    );
    fixes.push(
      'Verify `container/agent-runner/dist/index.js` and `container/agent-runner/dist/ipc-mcp-stdio.js` exist.',
    );
    return { attempted, succeeded: false };
  }
  return { attempted, succeeded: true };
}

export async function collectRuntimeDiagnostics(
  options: RuntimeDiagnosticsOptions = {},
): Promise<RuntimeDiagnostics> {
  const mode = options.mode ?? AGENT_RUNTIME;
  const errors: string[] = [];
  const warnings: string[] = [];
  const fixes: string[] = [];

  const hostRunnerPath = path.join(
    process.cwd(),
    'container',
    'agent-runner',
    'dist',
    'index.js',
  );
  const hostMcpPath = path.join(
    process.cwd(),
    'container',
    'agent-runner',
    'dist',
    'ipc-mcp-stdio.js',
  );

  let runtimeBinaryReady = false;
  let hostArtifactsPresent =
    fs.existsSync(hostRunnerPath) && fs.existsSync(hostMcpPath);
  let hostBuildAttempted = false;
  let hostBuildSucceeded = false;

  if (AGENT_RUNTIME_INVALID) {
    errors.push(
      `Invalid AGENT_RUNTIME value "${AGENT_RUNTIME_RAW}". Expected "host" or "container".`,
    );
    fixes.push(
      'Set `AGENT_RUNTIME=host` or `AGENT_RUNTIME=container` in your `.env`.',
    );
  }

  if (mode === 'container') {
    runtimeBinaryReady = checkContainerRuntime(errors, fixes);
  } else {
    runtimeBinaryReady = fs.existsSync(process.execPath);
    if (!runtimeBinaryReady) {
      errors.push(`Host runtime binary not found: ${process.execPath}`);
      fixes.push(
        'Install Node.js 20+ and ensure `node` is available on this host.',
      );
    }
    if (options.autoBuildHostRunner) {
      const build = buildHostArtifacts(
        hostRunnerPath,
        hostMcpPath,
        errors,
        fixes,
      );
      hostBuildAttempted = build.attempted;
      hostBuildSucceeded = build.succeeded;
      hostArtifactsPresent =
        build.succeeded &&
        fs.existsSync(hostRunnerPath) &&
        fs.existsSync(hostMcpPath);
    }
    if (!hostArtifactsPresent) {
      errors.push(
        'Host runtime requires built `container/agent-runner/dist` artifacts.',
      );
      fixes.push('Run `npm --prefix container/agent-runner run build`.');
    }
  }

  const credentialPathStatus = readCredentialPathStatus();
  if (credentialPathStatus === 'missing') {
    warnings.push(
      'No credentials detected in `.env` and no OneCLI URL configured.',
    );
    fixes.push(
      'Configure `ONECLI_URL` or set `CLAUDE_CODE_OAUTH_TOKEN` / `ANTHROPIC_API_KEY`.',
    );
  }

  const diagnostics: RuntimeDiagnostics = {
    mode,
    ok: errors.length === 0,
    errors,
    warnings,
    fixes: [...new Set(fixes)],
    checkedAt: new Date().toISOString(),
    details: {
      runtimeEnvRaw: AGENT_RUNTIME_RAW || '(unset)',
      runtimeBinary: mode === 'container' ? 'docker' : process.execPath,
      runtimeBinaryReady,
      hostRunnerPath: mode === 'host' ? hostRunnerPath : undefined,
      hostMcpPath: mode === 'host' ? hostMcpPath : undefined,
      hostArtifactsPresent: mode === 'host' ? hostArtifactsPresent : undefined,
      hostBuildAttempted: mode === 'host' ? hostBuildAttempted : undefined,
      hostBuildSucceeded: mode === 'host' ? hostBuildSucceeded : undefined,
      onecliUrlConfigured: Boolean(ONECLI_URL?.trim()),
      credentialPathStatus,
    },
  };

  cachedDiagnostics = diagnostics;
  return diagnostics;
}

export function getCachedRuntimeDiagnostics(): RuntimeDiagnostics | null {
  return cachedDiagnostics;
}

export function formatRuntimeDiagnosticsMessage(
  diagnostics: RuntimeDiagnostics,
): string {
  const lines: string[] = [];
  lines.push(`Runtime mode: ${diagnostics.mode}`);
  lines.push(`Health: ${diagnostics.ok ? 'healthy' : 'unhealthy'}`);
  lines.push(`Checked at: ${diagnostics.checkedAt}`);
  lines.push(`Runtime env: ${diagnostics.details.runtimeEnvRaw}`);
  lines.push(
    `Runtime binary: ${diagnostics.details.runtimeBinary} (${diagnostics.details.runtimeBinaryReady ? 'ready' : 'not ready'})`,
  );
  lines.push(`Credential path: ${diagnostics.details.credentialPathStatus}`);
  lines.push(
    `OneCLI configured: ${diagnostics.details.onecliUrlConfigured ? 'yes' : 'no'}`,
  );
  if (diagnostics.mode === 'host') {
    lines.push(
      `Host artifacts: ${diagnostics.details.hostArtifactsPresent ? 'present' : 'missing'}`,
    );
    if (diagnostics.details.hostBuildAttempted) {
      lines.push(
        `Host auto-build: ${diagnostics.details.hostBuildSucceeded ? 'succeeded' : 'failed'}`,
      );
    }
  }
  if (diagnostics.errors.length > 0) {
    lines.push('');
    lines.push('Errors:');
    for (const error of diagnostics.errors) {
      lines.push(`- ${error}`);
    }
  }
  if (diagnostics.warnings.length > 0) {
    lines.push('');
    lines.push('Warnings:');
    for (const warning of diagnostics.warnings) {
      lines.push(`- ${warning}`);
    }
  }
  if (diagnostics.fixes.length > 0) {
    lines.push('');
    lines.push('Fixes:');
    for (const fix of diagnostics.fixes) {
      lines.push(`- ${fix}`);
    }
  }
  return lines.join('\n');
}

export function formatRuntimeFailureMessage(
  diagnostics: RuntimeDiagnostics,
): string {
  return [
    'Runtime preflight failed.',
    formatRuntimeDiagnosticsMessage(diagnostics),
  ].join('\n\n');
}

export async function runRuntimeStartupPreflight(): Promise<RuntimeDiagnostics> {
  const diagnostics = await collectRuntimeDiagnostics({
    autoBuildHostRunner: AGENT_RUNTIME === 'host',
  });
  if (!diagnostics.ok) {
    throw new Error(formatRuntimeFailureMessage(diagnostics));
  }
  if (diagnostics.mode === 'container') {
    cleanupOrphans();
  }
  return diagnostics;
}
