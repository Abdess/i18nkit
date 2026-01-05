'use strict';

/**
 * @fileoverview Backward-compatible backup API wrapping new session-based system.
 * @module backup
 * @deprecated Use backup/index.js for new code
 */

const backup = require('./backup/index');

let currentSession = null;
const legacyBackupFiles = new Map();

function initSessionIfNeeded(cwd) {
  if (!currentSession) {
    currentSession = backup.createBackupSession(cwd, 'legacy-apply');
  }
  return currentSession;
}

function tryBackupFile(session, filePath) {
  const fileInfo = session.backupFile(filePath);
  const backupPath = require('path').join(session.sessionDir, fileInfo.backup);
  legacyBackupFiles.set(filePath, backupPath);
  return backupPath;
}

function shouldSkipLegacyBackup(enabled, dryRun) {
  return !enabled || dryRun;
}

function performLegacyBackup(filePath) {
  const cwd = process.cwd();
  const session = initSessionIfNeeded(cwd);
  try {
    return tryBackupFile(session, filePath);
  } catch (err) {
    console.warn(`Warning: Cannot backup ${filePath}: ${err.message}`);
    return null;
  }
}

/**
 * Creates a backup of a file (legacy API)
 * @param {string} filePath - File to backup
 * @param {string} _backupDir - Backup directory (ignored, uses .i18nkit/backups)
 * @param {Object} [options] - Options
 * @returns {string|null} Backup path or null if skipped
 */
function createBackup(filePath, _backupDir, options = {}) {
  const { enabled = true, dryRun = false } = options;
  return shouldSkipLegacyBackup(enabled, dryRun) ? null : performLegacyBackup(filePath);
}

/**
 * Restores all backed-up files (legacy API)
 * @returns {number} Count of restored files
 */
function restoreBackups() {
  if (!currentSession) {
    return 0;
  }
  const cwd = process.cwd();
  const result = backup.restoreSession(cwd, currentSession.id, { verbose: false });
  return result.restored;
}

/**
 * Gets the map of backed-up files (legacy API)
 * @returns {Map<string, string>}
 */
function getBackupFiles() {
  return legacyBackupFiles;
}

/**
 * Marks session as ready for modifications (new API bridge)
 */
function markReady() {
  if (currentSession && currentSession.status === 'backing-up') {
    currentSession.markReady();
  }
}

/**
 * Begins modification phase (new API bridge)
 */
function beginModifications() {
  if (currentSession && currentSession.status === 'ready') {
    currentSession.beginModifications();
  }
}

/**
 * Completes the backup session (new API bridge)
 * @param {Object} [stats] - Operation stats
 */
function completeSession(stats = {}) {
  if (currentSession) {
    currentSession.complete(stats);
    currentSession = null;
    legacyBackupFiles.clear();
  }
}

/**
 * Resets session state (for testing)
 */
function resetSession() {
  currentSession = null;
  legacyBackupFiles.clear();
}

module.exports = {
  createBackup,
  restoreBackups,
  getBackupFiles,
  markReady,
  beginModifications,
  completeSession,
  resetSession,

  ...backup,
};
