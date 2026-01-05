'use strict';

/**
 * @fileoverview Session restoration and rollback operations.
 * @module backup/restore
 */

const { Session } = require('./session');
const { restoreFileSync } = require('./file-ops');
const { SessionStatus, getSessionDir } = require('./constants');
const fs = require('../fs-adapter');

function logIfVerbose(verbose, log, message) {
  if (verbose) {
    log(message);
  }
}

function handleMissingBackup(file, ctx) {
  logIfVerbose(ctx.verbose, ctx.log, `  Skip (backup missing): ${file.original}`);
  return { restored: false, skipped: true };
}

function handleDryRun(file, ctx) {
  ctx.log(`  Would restore: ${file.original}`);
  return { restored: true, skipped: false };
}

function performRestore(file, ctx) {
  restoreFileSync(file.backup, file.original);
  logIfVerbose(ctx.verbose, ctx.log, `  Restored: ${file.original}`);
  return { restored: true, skipped: false };
}

function restoreFileWithLogging(file, ctx) {
  if (!fs.existsSync(file.backup)) {
    return handleMissingBackup(file, ctx);
  }
  return ctx.dryRun ? handleDryRun(file, ctx) : performRestore(file, ctx);
}

function processRestoreFile(file, ctx) {
  try {
    return restoreFileWithLogging(file, ctx);
  } catch (err) {
    logIfVerbose(ctx.verbose, ctx.log, `  Error restoring ${file.original}: ${err.message}`);
    return { restored: false, skipped: true };
  }
}

function loadSessionOrThrow(cwd, sessionId) {
  const session = Session.load(cwd, sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  return session;
}

function countResults(results) {
  return {
    restored: results.filter(r => r.restored).length,
    skipped: results.filter(r => r.skipped).length,
  };
}

function executeRestore(files, ctx) {
  const results = files.map(file => processRestoreFile(file, ctx));
  return countResults(results);
}

function loadFilesOrEmpty(cwd, sessionId, log) {
  const session = loadSessionOrThrow(cwd, sessionId);
  const files = session.getBackedUpFiles();
  if (files.length === 0) {
    log('No files to restore');
  }
  return files;
}

function buildRestoreContext(options) {
  const { dryRun = false, verbose = false, log = console.log } = options;
  return { dryRun, verbose, log };
}

/**
 * Restores files from a backup session
 * @param {string} cwd
 * @param {string} sessionId
 * @param {Object} [options]
 * @returns {{restored: number, skipped: number}}
 */
function restoreSession(cwd, sessionId, options = {}) {
  const ctx = buildRestoreContext(options);
  const files = loadFilesOrEmpty(cwd, sessionId, ctx.log);
  if (files.length === 0) {
    return { restored: 0, skipped: 0 };
  }
  return executeRestore(files, ctx);
}

/**
 * Restores files from the latest backup session
 * @param {string} cwd
 * @param {Object} [options]
 * @returns {{restored: number, skipped: number}}
 */
function restoreLatest(cwd, options = {}) {
  const latestId = Session.getLatestId(cwd);
  if (!latestId) {
    throw new Error('No backup sessions found');
  }
  return restoreSession(cwd, latestId, options);
}

/**
 * Auto-rollback on failure during in-progress session
 * @param {string} cwd
 * @param {Session} session
 * @param {Object} [options]
 * @returns {{restored: number, skipped: number}}
 */
function autoRollback(cwd, session, options = {}) {
  const { log = console.log } = options;
  log('Auto-rollback initiated...');
  const result = restoreSession(cwd, session.id, options);
  session.rollback();
  log(`Rolled back ${result.restored} files`);
  return result;
}

/**
 * @param {string} cwd
 * @returns {Object|null}
 */
function checkIncompleteSession(cwd) {
  const incomplete = Session.findIncomplete(cwd);
  return incomplete.length > 0 ? incomplete[0] : null;
}

/**
 * Returns preview of restore operation
 * @param {string} cwd
 * @param {string} sessionId
 * @returns {Object|null}
 */
function formatRestorePreview(cwd, sessionId) {
  const session = Session.load(cwd, sessionId);
  if (!session) {
    return null;
  }
  const files = session.getBackedUpFiles();
  const sessionDir = getSessionDir(cwd, sessionId);
  const { command, timestamp } = session.manifest;
  return {
    sessionId,
    command,
    timestamp,
    status: session.status,
    fileCount: files.length,
    files: files.map(f => ({ path: f.original, exists: fs.existsSync(f.backup) })),
    sessionDir,
  };
}

function buildRecoveryActions(id) {
  return [
    { command: `i18nkit --restore ${id}`, description: 'Rollback to pre-modification state' },
    { command: 'i18nkit --force', description: 'Continue without rollback (risky)' },
  ];
}

function getInProgressRecovery(id) {
  return {
    severity: 'warning',
    message: `Incomplete session found: ${id}`,
    suggestion: `Files may have been partially modified. Run 'i18nkit --restore ${id}' to rollback.`,
    actions: buildRecoveryActions(id),
  };
}

function getBackingUpRecovery() {
  return {
    severity: 'info',
    message: 'Interrupted backup session',
    suggestion: 'Backup was incomplete. No files were modified. Safe to continue.',
    actions: [{ command: 'i18nkit [command]', description: 'Continue normally' }],
  };
}

/**
 * Returns recovery instructions for incomplete session
 * @param {Object|null} incomplete
 * @returns {Object|null}
 */
function getRecoveryInstructions(incomplete) {
  if (!incomplete) {
    return null;
  }
  const { status, id } = incomplete;
  if (status === SessionStatus.IN_PROGRESS) {
    return getInProgressRecovery(id);
  }
  if (status === SessionStatus.BACKING_UP) {
    return getBackingUpRecovery();
  }
  return null;
}

module.exports = {
  restoreSession,
  restoreLatest,
  autoRollback,
  checkIncompleteSession,
  formatRestorePreview,
  getRecoveryInstructions,
};
