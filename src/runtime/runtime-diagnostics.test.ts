import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockExecSync = vi.fn();
const mockExistsSync = vi.fn();
const mockCleanupOrphans = vi.fn();

vi.mock('child_process', () => ({
  execSync: (...args: unknown[]) => mockExecSync(...args),
}));

vi.mock('fs', () => ({
  default: {
    existsSync: (...args: unknown[]) => mockExistsSync(...args),
  },
}));

async function loadRuntimeDiagnosticsModule(config: {
  AGENT_RUNTIME: 'host' | 'container';
  AGENT_RUNTIME_RAW?: string;
  AGENT_RUNTIME_INVALID?: string;
  ONECLI_URL?: string;
  envVars?: Record<string, string | undefined>;
}) {
  vi.resetModules();
  vi.doMock('../core/config.js', () => ({
    AGENT_RUNTIME: config.AGENT_RUNTIME,
    AGENT_RUNTIME_RAW: config.AGENT_RUNTIME_RAW || config.AGENT_RUNTIME,
    AGENT_RUNTIME_INVALID: config.AGENT_RUNTIME_INVALID,
    ONECLI_URL: config.ONECLI_URL || '',
  }));
  vi.doMock('../core/env.js', () => ({
    readEnvFile: () => config.envVars || {},
  }));
  vi.doMock('./container-runtime.js', () => ({
    cleanupOrphans: (...args: unknown[]) => mockCleanupOrphans(...args),
  }));
  return import('./runtime-diagnostics.js');
}

beforeEach(() => {
  vi.clearAllMocks();
  mockExistsSync.mockReturnValue(true);
});

afterEach(() => {
  vi.resetModules();
});

describe('runtime-diagnostics', () => {
  it('reports healthy container runtime when docker check passes', async () => {
    mockExecSync.mockReturnValue('');
    const mod = await loadRuntimeDiagnosticsModule({
      AGENT_RUNTIME: 'container',
    });

    const diagnostics = await mod.collectRuntimeDiagnostics();

    expect(diagnostics.mode).toBe('container');
    expect(diagnostics.ok).toBe(true);
    expect(diagnostics.errors).toEqual([]);
    expect(mockExecSync).toHaveBeenCalledWith('docker info', {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 10000,
    });
  });

  it('reports unhealthy container runtime when docker check fails', async () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('cannot connect');
    });
    const mod = await loadRuntimeDiagnosticsModule({
      AGENT_RUNTIME: 'container',
    });

    const diagnostics = await mod.collectRuntimeDiagnostics();

    expect(diagnostics.ok).toBe(false);
    expect(diagnostics.errors.join(' ')).toContain(
      'Container runtime check failed',
    );
    expect(diagnostics.fixes.join(' ')).toContain('docker info');
  });

  it('auto-builds host runner artifacts during startup preflight', async () => {
    mockExecSync.mockReturnValue('');
    mockExistsSync.mockImplementation((pathValue: string) => {
      return (
        pathValue.endsWith('/container/agent-runner/dist/index.js') ||
        pathValue.endsWith('/container/agent-runner/dist/ipc-mcp-stdio.js') ||
        pathValue === process.execPath
      );
    });
    const mod = await loadRuntimeDiagnosticsModule({
      AGENT_RUNTIME: 'host',
      ONECLI_URL: 'http://localhost:10254',
      envVars: { CLAUDE_CODE_OAUTH_TOKEN: 'token' },
    });

    const diagnostics = await mod.runRuntimeStartupPreflight();

    expect(diagnostics.ok).toBe(true);
    expect(diagnostics.details.hostBuildAttempted).toBe(true);
    expect(mockExecSync).toHaveBeenCalledWith(
      'npm --prefix container/agent-runner run build',
      {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 300000,
      },
    );
    expect(mockCleanupOrphans).not.toHaveBeenCalled();
  });

  it('fails startup preflight when host auto-build fails', async () => {
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd.includes('npm --prefix container/agent-runner run build')) {
        throw new Error('build failed');
      }
      return '';
    });
    mockExistsSync.mockImplementation(
      (pathValue: string) => pathValue === process.execPath,
    );
    const mod = await loadRuntimeDiagnosticsModule({
      AGENT_RUNTIME: 'host',
    });

    await expect(mod.runRuntimeStartupPreflight()).rejects.toThrow(
      'Runtime preflight failed',
    );
  });

  it('flags invalid AGENT_RUNTIME values as hard errors', async () => {
    mockExecSync.mockReturnValue('');
    const mod = await loadRuntimeDiagnosticsModule({
      AGENT_RUNTIME: 'container',
      AGENT_RUNTIME_RAW: 'weird',
      AGENT_RUNTIME_INVALID: 'weird',
    });

    const diagnostics = await mod.collectRuntimeDiagnostics();

    expect(diagnostics.ok).toBe(false);
    expect(diagnostics.errors.join(' ')).toContain(
      'Invalid AGENT_RUNTIME value',
    );
    expect(diagnostics.fixes.join(' ')).toContain('AGENT_RUNTIME=host');
  });
});
