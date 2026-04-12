import fs from 'fs';
import path from 'path';

import { NANOCLAW_CONFIG_DIR } from '../core/config.js';

const CLAUDE_SESSION_SETTINGS = {
  env: {
    CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1',
    CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD: '0',
    CLAUDE_CODE_DISABLE_AUTO_MEMORY: '0',
  },
};

/**
 * Ensure shared .claude/settings.json under NANOCLAW_CONFIG_DIR.
 * This is the single HOME for all agent processes.
 */
export function ensureSharedSessionSettings(): void {
  const claudeDir = path.join(NANOCLAW_CONFIG_DIR, '.claude');
  fs.mkdirSync(claudeDir, { recursive: true });
  const settingsFile = path.join(claudeDir, 'settings.json');

  let existingSettings: unknown = {};
  if (fs.existsSync(settingsFile)) {
    try {
      existingSettings = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
    } catch {
      existingSettings = {};
    }
  }

  const current =
    existingSettings && typeof existingSettings === 'object'
      ? (existingSettings as Record<string, unknown>)
      : {};
  const existingEnv =
    current.env && typeof current.env === 'object'
      ? (current.env as Record<string, unknown>)
      : {};
  const merged = {
    ...current,
    env: {
      ...existingEnv,
      ...CLAUDE_SESSION_SETTINGS.env,
    },
  };

  fs.writeFileSync(settingsFile, JSON.stringify(merged, null, 2) + '\n');
}

/**
 * Ensure ~/.config/nanoclaw/.claude/skills/ exists as a real directory.
 * In dev mode (container/skills/ source present), seed new or updated
 * skill folders into it. User-added skills are never removed.
 * In production (no source), just ensures the directory exists.
 */
export function syncGroupSkills(): void {
  const skillsDst = path.join(NANOCLAW_CONFIG_DIR, '.claude', 'skills');

  // Migrate legacy symlink to a real directory
  try {
    const stat = fs.lstatSync(skillsDst);
    if (stat.isSymbolicLink()) {
      fs.unlinkSync(skillsDst);
    }
  } catch {
    // doesn't exist yet
  }

  fs.mkdirSync(skillsDst, { recursive: true });

  // Dev mode: seed skills from source (container/skills/)
  const skillsSrc = path.join(process.cwd(), 'container', 'skills');
  if (!fs.existsSync(skillsSrc)) return;

  for (const entry of fs.readdirSync(skillsSrc, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const src = path.join(skillsSrc, entry.name);
    const dst = path.join(skillsDst, entry.name);
    const srcMarker = path.join(src, 'SKILL.md');
    const dstMarker = path.join(dst, 'SKILL.md');

    // Copy if skill doesn't exist at destination, or source is newer
    const needsCopy =
      !fs.existsSync(dstMarker) ||
      (fs.existsSync(srcMarker) &&
        fs.statSync(srcMarker).mtimeMs > fs.statSync(dstMarker).mtimeMs);

    if (needsCopy) {
      fs.cpSync(src, dst, { recursive: true });
    }
  }
}

export function ensureGroupIpcLayout(groupIpcDir: string): void {
  fs.mkdirSync(path.join(groupIpcDir, 'messages'), { recursive: true });
  fs.mkdirSync(path.join(groupIpcDir, 'tasks'), { recursive: true });
  fs.mkdirSync(path.join(groupIpcDir, 'input'), { recursive: true });
  fs.mkdirSync(path.join(groupIpcDir, 'memory-requests'), { recursive: true });
  fs.mkdirSync(path.join(groupIpcDir, 'memory-responses'), { recursive: true });
  fs.mkdirSync(path.join(groupIpcDir, 'permission-requests'), {
    recursive: true,
  });
  fs.mkdirSync(path.join(groupIpcDir, 'permission-responses'), {
    recursive: true,
  });
}
