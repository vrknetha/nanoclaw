import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockExecSync = vi.fn();
const mockExistsSync = vi.fn();

vi.mock('child_process', () => ({
  execSync: (...args: unknown[]) => mockExecSync(...args),
}));

vi.mock('fs', () => ({
  default: {
    existsSync: (...args: unknown[]) => mockExistsSync(...args),
  },
}));

async function loadRuntimeDiagnosticsModule(config: {
  ONECLI_URL?: string;
  envVars?: Record<string, string | undefined>;
}) {
  vi.resetModules();
  vi.doMock('../core/config.js', () => ({
    ONECLI_URL: config.ONECLI_URL || '',
  }));
  vi.doMock('../core/env.js', () => ({
    readEnvFile: () => config.envVars || {},
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
  it('reports healthy when host artifacts exist', async () => {
    const mod = await loadRuntimeDiagnosticsModule({
      ONECLI_URL: 'http://localhost:10254',
      envVars: { CLAUDE_CODE_OAUTH_TOKEN: 'token' },
    });

    const diagnostics = await mod.collectRuntimeDiagnostics();

    expect(diagnostics.ok).toBe(true);
    expect(diagnostics.errors).toEqual([]);
  });

  it('reports unhealthy when host artifacts missing', async () => {
    mockExistsSync.mockImplementation(
      (pathValue: string) => pathValue === process.execPath,
    );
    const mod = await loadRuntimeDiagnosticsModule({});

    const diagnostics = await mod.collectRuntimeDiagnostics();

    expect(diagnostics.ok).toBe(false);
    expect(diagnostics.errors.join(' ')).toContain('artifacts');
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
    const mod = await loadRuntimeDiagnosticsModule({});

    await expect(mod.runRuntimeStartupPreflight()).rejects.toThrow(
      'Runtime preflight failed',
    );
  });

  it('warns when no credentials are configured', async () => {
    const mod = await loadRuntimeDiagnosticsModule({});

    const diagnostics = await mod.collectRuntimeDiagnostics();

    expect(diagnostics.warnings.join(' ')).toContain('No credentials');
  });
});
