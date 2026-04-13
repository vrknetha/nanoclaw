/**
 * X Integration - Configuration
 *
 * All environment-specific settings in one place.
 * Override via environment variables or modify defaults here.
 */

import path from 'path';
import os from 'os';

const HOME_DIR = process.env.HOME || os.homedir();
const AGENT_ROOT = process.env.AGENT_ROOT || path.join(HOME_DIR, 'myclaw');
const PROFILE_ROOT = path.join(AGENT_ROOT, 'data', 'browser-profiles', 'x');

/**
 * Configuration object with all settings
 */
export const config = {
  // Chrome executable path
  // Default: standard macOS Chrome location
  // Override: CHROME_PATH environment variable
  chromePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',

  // Shared browser profile directory for persistent login sessions
  browserDataDir: path.join(PROFILE_ROOT, 'user-data'),

  // Auth state marker file
  authPath: path.join(PROFILE_ROOT, 'auth.json'),

  // Browser viewport settings
  viewport: {
    width: 1280,
    height: 800,
  },

  // Timeouts (in milliseconds)
  timeouts: {
    navigation: 30000,
    elementWait: 5000,
    afterClick: 1000,
    afterFill: 1000,
    afterSubmit: 3000,
    pageLoad: 3000,
  },

  // X character limits
  limits: {
    tweetMaxLength: 280,
  },

  // Chrome launch arguments
  chromeArgs: [
    '--disable-blink-features=AutomationControlled',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-sync',
  ],

  // Args to ignore when launching Chrome
  chromeIgnoreDefaultArgs: ['--enable-automation'],
};
