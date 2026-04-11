import fs from 'fs';
import path from 'path';

import { OneCLI } from '@onecli-sh/sdk';

import { DATA_DIR, GROUPS_DIR, ONECLI_URL } from '../core/config.js';
import { readEnvFile } from '../core/env.js';
import { logger } from '../core/logger.js';
import { RegisteredGroup } from '../core/types.js';
import {
  resolveGroupFolderPath,
  resolveGroupIpcPath,
} from '../platform/group-folder.js';
import {
  ensureGroupIpcLayout,
  ensureGroupSessionSettings,
  syncGroupSkills,
} from './container-runner-layout.js';
import { HostRuntimeContext } from './container-runner-types.js';

const onecli = new OneCLI({ url: ONECLI_URL });

const HOST_AUTH_ENV_KEYS = [
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_AUTH_TOKEN',
  'ANTHROPIC_BASE_URL',
  'CLAUDE_CODE_OAUTH_TOKEN',
  'CLAUDE_MODEL',
  'ANTHROPIC_MODEL',
];

const HOST_RUNTIME_REWRITE_KEYS = [
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'http_proxy',
  'https_proxy',
  'ALL_PROXY',
  'all_proxy',
  'ANTHROPIC_BASE_URL',
];

const DOCKER_HOST_ALIASES = new Set([
  'host.docker.internal',
  'gateway.docker.internal',
  'docker.for.mac.host.internal',
  'docker.for.mac.localhost',
]);

function rewriteDockerHostAlias(urlValue: string): string {
  try {
    const parsed = new URL(urlValue);
    const host = parsed.hostname.toLowerCase();
    if (!DOCKER_HOST_ALIASES.has(host)) return urlValue;
    parsed.hostname = '127.0.0.1';
    return parsed.toString();
  } catch {
    return urlValue;
  }
}

export function normalizeHostRuntimeEnv(
  input: Record<string, string>,
): Record<string, string> {
  const env = { ...input };
  for (const key of HOST_RUNTIME_REWRITE_KEYS) {
    const current = env[key];
    if (!current) continue;
    env[key] = rewriteDockerHostAlias(current);
  }
  return env;
}

function writeOneCLICertificate(
  certificatePath: string,
  certificatePem: string,
): boolean {
  try {
    fs.mkdirSync(path.dirname(certificatePath), { recursive: true });
    fs.writeFileSync(certificatePath, certificatePem, { mode: 0o600 });
    return true;
  } catch (err) {
    logger.warn(
      { certificatePath, err },
      'Failed to write OneCLI CA certificate for host runtime',
    );
    return false;
  }
}

export async function getHostRuntimeCredentialEnv(
  agentIdentifier?: string,
): Promise<{
  env: Record<string, string>;
  onecliApplied: boolean;
  onecliCaPath?: string;
}> {
  const envFromFile = readEnvFile(HOST_AUTH_ENV_KEYS);
  const onecliUrl = ONECLI_URL?.trim();
  if (!onecliUrl) {
    return {
      env: {
        ...envFromFile,
      },
      onecliApplied: false,
    };
  }

  let onecliEnv: Record<string, string> = {};
  let onecliApplied = false;
  let onecliCaPath: string | undefined;

  try {
    const config = await onecli.getContainerConfig(agentIdentifier);
    onecliEnv = normalizeHostRuntimeEnv(config.env);
    onecliApplied = true;
    if (config.caCertificate && config.caCertificateContainerPath) {
      if (
        writeOneCLICertificate(
          config.caCertificateContainerPath,
          config.caCertificate,
        )
      ) {
        onecliCaPath = config.caCertificateContainerPath;
      }
    }
  } catch (err) {
    logger.warn(
      { err, agentIdentifier: agentIdentifier || 'default' },
      'OneCLI gateway not reachable for host runtime',
    );
  }

  return {
    env: {
      ...envFromFile,
      ...onecliEnv,
    },
    onecliApplied,
    onecliCaPath,
  };
}

export function prepareHostRuntimeContext(
  group: RegisteredGroup,
): HostRuntimeContext {
  const groupDir = resolveGroupFolderPath(group.folder);
  fs.mkdirSync(groupDir, { recursive: true });

  const groupSessionRoot = path.join(DATA_DIR, 'sessions', group.folder);
  const groupSessionsDir = path.join(groupSessionRoot, '.claude');
  ensureGroupSessionSettings(groupSessionsDir);
  syncGroupSkills(groupSessionsDir);

  const groupIpcDir = resolveGroupIpcPath(group.folder);
  ensureGroupIpcLayout(groupIpcDir);

  const globalDirCandidate = path.join(GROUPS_DIR, 'global');
  const globalDir = fs.existsSync(globalDirCandidate)
    ? globalDirCandidate
    : undefined;

  return {
    groupDir,
    globalDir,
    groupSessionRoot,
    groupSessionsDir,
    groupIpcDir,
  };
}
