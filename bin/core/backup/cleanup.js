'use strict';

/**
 * @fileoverview Backup session cleanup and retention management.
 * @module backup/cleanup
 */

const { Session, parseSessionId } = require('./session');
const { removeDirSync } = require('./file-ops');
const { DEFAULT_CONFIG, getSessionDir, SessionStatus } = require('./constants');

/**
 * Returns session age in days
 * @param {string} sessionId
 * @returns {number}
 */
function getSessionAge(sessionId) {
  const parsed = parseSessionId(sessionId);
  if (!parsed) {
    return Infinity;
  }
  const now = new Date();
  const diff = now - parsed.timestamp;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function shouldKeepSession(session) {
  return (
    session.status === SessionStatus.IN_PROGRESS || session.status === SessionStatus.BACKING_UP
  );
}

function isWithinLimits(index, age, config) {
  return index < config.maxSessions && age <= config.maxAgeDays;
}

function categorizeSession(session, index, config) {
  const age = getSessionAge(session.id);
  return { session, keep: isWithinLimits(index, age, config) };
}

/**
 * @param {Object[]} sessions
 * @param {Object} config
 * @returns {{keep: Object[], delete: Object[]}}
 */
function selectSessionsForCleanup(sessions, config) {
  const protectedSessions = sessions.filter(shouldKeepSession);
  const cleanableSessions = sessions.filter(s => !shouldKeepSession(s));
  const categorized = cleanableSessions.map((s, i) => categorizeSession(s, i, config));
  const toKeep = categorized.filter(c => c.keep).map(c => c.session);
  const toDelete = categorized.filter(c => !c.keep).map(c => c.session);
  return { keep: [...protectedSessions, ...toKeep], delete: toDelete };
}

function logVerbose(verbose, log, message) {
  if (verbose) {
    log(message);
  }
}

function deleteSession(sessionDir, sessionId, ctx) {
  const { dryRun, verbose, log } = ctx;
  if (dryRun) {
    log(`Would delete: ${sessionId}`);
    return false;
  }
  try {
    removeDirSync(sessionDir);
    logVerbose(verbose, log, `Deleted: ${sessionId}`);
    return true;
  } catch (err) {
    logVerbose(verbose, log, `Failed to delete ${sessionId}: ${err.message}`);
    return false;
  }
}

function processDeletions(cwd, toDelete, ctx) {
  return toDelete.map(session => {
    const sessionDir = getSessionDir(cwd, session.id);
    return deleteSession(sessionDir, session.id, ctx);
  });
}

function handleEmptySessions(verbose, log) {
  logVerbose(verbose, log, 'No backup sessions found');
  return { deleted: 0, kept: 0 };
}

function handleNoDeletions(keep, verbose, log) {
  logVerbose(verbose, log, `Keeping all ${keep.length} sessions`);
  return { deleted: 0, kept: keep.length };
}

function executeCleanup(ctx) {
  const { cwd, sessions, config, dryRun, verbose, log } = ctx;
  const { keep, delete: toDelete } = selectSessionsForCleanup(sessions, config);
  if (toDelete.length === 0) {
    return handleNoDeletions(keep, verbose, log);
  }
  processDeletions(cwd, toDelete, { dryRun, verbose, log });
  return { deleted: dryRun ? 0 : toDelete.length, kept: keep.length };
}

function loadSessions(cwd) {
  const sessions = Session.listAll(cwd);
  return sessions.length === 0 ? null : sessions;
}

function buildCleanupContext(cwd, options) {
  const config = { ...DEFAULT_CONFIG, ...options };
  const { dryRun = false, verbose = false, log = console.log } = options;
  return { cwd, config, dryRun, verbose, log };
}

/**
 * Removes sessions exceeding retention limits
 * @param {string} cwd
 * @param {Object} [options]
 * @returns {{deleted: number, kept: number}}
 */
function cleanupOldSessions(cwd, options = {}) {
  const ctx = buildCleanupContext(cwd, options);
  const sessions = loadSessions(cwd);
  if (!sessions) {
    return handleEmptySessions(ctx.verbose, ctx.log);
  }
  return executeCleanup({ ...ctx, sessions });
}

function mapSessionForPreview(session) {
  return {
    id: session.id,
    age: getSessionAge(session.id),
    status: session.status,
    fileCount: session.fileCount,
  };
}

/**
 * Returns cleanup preview without executing
 * @param {string} cwd
 * @param {Object} [options]
 * @returns {{sessions: Object[], toDelete: Object[], toKeep: Object[]}}
 */
function getCleanupPreview(cwd, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };
  const sessions = Session.listAll(cwd);
  if (sessions.length === 0) {
    return { sessions: [], toDelete: [], toKeep: [] };
  }
  const { keep, delete: toDelete } = selectSessionsForCleanup(sessions, config);
  return {
    sessions,
    toDelete: toDelete.map(mapSessionForPreview),
    toKeep: keep.map(mapSessionForPreview),
  };
}

/**
 * @param {string} cwd
 * @param {Object} config
 * @returns {{deleted: number, kept: number}|null}
 */
function autoCleanupIfEnabled(cwd, config) {
  if (!config.autoCleanup) {
    return null;
  }
  return cleanupOldSessions(cwd, { ...config, verbose: false });
}

module.exports = {
  cleanupOldSessions,
  getCleanupPreview,
  autoCleanupIfEnabled,
};
