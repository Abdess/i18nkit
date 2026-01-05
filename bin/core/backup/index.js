'use strict';

/**
 * @fileoverview Backup system public API.
 * @module backup
 */

const { Session, generateSessionId, parseSessionId } = require('./session');
const { validateManifest, formatManifestForDisplay } = require('./manifest');
const {
  restoreSession,
  restoreLatest,
  autoRollback,
  checkIncompleteSession,
  formatRestorePreview,
  getRecoveryInstructions,
} = require('./restore');
const { cleanupOldSessions, getCleanupPreview, autoCleanupIfEnabled } = require('./cleanup');
const {
  ensureI18nkitGitignore,
  suggestGitignoreUpdate,
  addToProjectGitignore,
  initializeBackupStructure,
} = require('./gitignore');
const {
  SessionStatus,
  DEFAULT_CONFIG,
  BACKUP_ROOT,
  getBackupRoot,
  getBackupsDir,
  getSessionDir,
} = require('./constants');

/**
 * Creates and starts a new backup session
 * @param {string} cwd
 * @param {string} command
 * @returns {Session}
 */
function createBackupSession(cwd, command) {
  const session = new Session(cwd, command);
  initializeBackupStructure(cwd, { verbose: false });
  return session.start();
}

function logIncompleteWarning(instructions, log) {
  log(`\nWarning: ${instructions.message}`);
  log(`  ${instructions.suggestion}\n`);
}

function handleIncompleteSession(cwd, log) {
  const incomplete = checkIncompleteSession(cwd);
  if (!incomplete) {
    return;
  }
  const instructions = getRecoveryInstructions(incomplete);
  if (instructions?.severity === 'warning') {
    logIncompleteWarning(instructions, log);
  }
}

function executeWithSession(session, operation) {
  const result = operation({
    backupFile: filePath => session.backupFile(filePath),
    markReady: () => session.markReady(),
    beginModifications: () => session.beginModifications(),
    saveReport: reportPath => session.saveReport(reportPath),
  });
  session.complete({ filesModified: session.files.length });
  return result;
}

function logBackupSuccess(session, verbose, log) {
  if (verbose) {
    log(`Backup session: ${session.id}`);
    log(`Files backed up: ${session.files.length}`);
  }
}

function handleSuggestion(cwd, log) {
  const suggestion = suggestGitignoreUpdate(cwd);
  if (suggestion) {
    log(`\nTip: ${suggestion.message}`);
  }
}

function handleSessionError(session, error) {
  if (session.status === SessionStatus.IN_PROGRESS) {
    autoRollback(session.cwd, session, { log: console.log, verbose: false });
  } else {
    session.fail(error);
  }
}

function shouldSkipBackup(backup, dryRun) {
  return !backup || dryRun;
}

function handleBackupSuccess(ctx) {
  const { session, cwd, options } = ctx;
  const { log = console.log, verbose = false } = options;
  logBackupSuccess(session, verbose, log);
  handleSuggestion(cwd, log);
  autoCleanupIfEnabled(cwd, { ...DEFAULT_CONFIG, ...options });
}

function runWithBackup(ctx) {
  const { cwd, command, operation, options } = ctx;
  handleIncompleteSession(cwd, options.log || console.log);
  const session = createBackupSession(cwd, command);
  try {
    const result = executeWithSession(session, operation);
    handleBackupSuccess({ session, cwd, options });
    return result;
  } catch (error) {
    handleSessionError(session, error);
    throw error;
  }
}

/**
 * Wraps operation with backup session lifecycle
 * @param {Object} ctx - Context with cwd, command, operation, options
 * @returns {*} Operation result
 */
function withBackup(ctx) {
  const { cwd, command, operation, options = {} } = ctx;
  const { backup = true, dryRun = false } = options;
  if (shouldSkipBackup(backup, dryRun)) {
    return operation();
  }
  return runWithBackup({ cwd, command, operation, options });
}

/**
 * @param {string} cwd
 * @returns {Object[]}
 */
function listBackupSessions(cwd) {
  return Session.listAll(cwd);
}

/**
 * @param {string} cwd
 * @param {string} sessionId
 * @returns {Session|null}
 */
function getBackupSession(cwd, sessionId) {
  return Session.load(cwd, sessionId);
}

/**
 * @param {string} cwd
 * @returns {Session|null}
 */
function getLatestBackupSession(cwd) {
  return Session.loadLatest(cwd);
}

module.exports = {
  Session,
  SessionStatus,
  DEFAULT_CONFIG,
  BACKUP_ROOT,
  createBackupSession,
  withBackup,
  listBackupSessions,
  getBackupSession,
  getLatestBackupSession,
  restoreSession,
  restoreLatest,
  autoRollback,
  checkIncompleteSession,
  getRecoveryInstructions,
  formatRestorePreview,
  cleanupOldSessions,
  getCleanupPreview,
  initializeBackupStructure,
  ensureI18nkitGitignore,
  suggestGitignoreUpdate,
  addToProjectGitignore,
  generateSessionId,
  parseSessionId,
  validateManifest,
  formatManifestForDisplay,
  getBackupRoot,
  getBackupsDir,
  getSessionDir,
};
