'use strict';

/**
 * @fileoverview Backup system constants and path utilities.
 * @module backup/constants
 */

const path = require('path');

const BACKUP_ROOT = '.i18nkit';
const BACKUP_DIR = 'backups';
const LATEST_FILE = 'latest.txt';
const MANIFEST_FILE = 'manifest.json';
const STATUS_FILE = '.status';
const GITIGNORE_FILE = '.gitignore';

const SessionStatus = Object.freeze({
  PENDING: 'pending',
  BACKING_UP: 'backing-up',
  READY: 'ready',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  ROLLED_BACK: 'rolled-back',
  FAILED: 'failed',
});

const VALID_TRANSITIONS = Object.freeze({
  [SessionStatus.PENDING]: [SessionStatus.BACKING_UP, SessionStatus.FAILED],
  [SessionStatus.BACKING_UP]: [SessionStatus.READY, SessionStatus.FAILED],
  [SessionStatus.READY]: [SessionStatus.IN_PROGRESS, SessionStatus.FAILED],
  [SessionStatus.IN_PROGRESS]: [
    SessionStatus.COMPLETED,
    SessionStatus.ROLLED_BACK,
    SessionStatus.FAILED,
  ],
  [SessionStatus.COMPLETED]: [],
  [SessionStatus.ROLLED_BACK]: [],
  [SessionStatus.FAILED]: [],
});

const DEFAULT_CONFIG = Object.freeze({
  maxSessions: 10,
  maxAgeDays: 30,
  autoCleanup: true,
});

/**
 * @param {string} cwd
 * @returns {string}
 */
function getBackupRoot(cwd) {
  return path.join(cwd, BACKUP_ROOT);
}

/**
 * @param {string} cwd
 * @returns {string}
 */
function getBackupsDir(cwd) {
  return path.join(cwd, BACKUP_ROOT, BACKUP_DIR);
}

/**
 * @param {string} cwd
 * @returns {string}
 */
function getLatestFile(cwd) {
  return path.join(cwd, BACKUP_ROOT, BACKUP_DIR, LATEST_FILE);
}

/**
 * @param {string} cwd
 * @param {string} sessionId
 * @returns {string}
 */
function getSessionDir(cwd, sessionId) {
  return path.join(cwd, BACKUP_ROOT, BACKUP_DIR, sessionId);
}

/**
 * @param {string} cwd
 * @param {string} sessionId
 * @returns {string}
 */
function getManifestPath(cwd, sessionId) {
  return path.join(getSessionDir(cwd, sessionId), MANIFEST_FILE);
}

/**
 * @param {string} cwd
 * @param {string} sessionId
 * @returns {string}
 */
function getStatusPath(cwd, sessionId) {
  return path.join(getSessionDir(cwd, sessionId), STATUS_FILE);
}

module.exports = {
  BACKUP_ROOT,
  BACKUP_DIR,
  LATEST_FILE,
  MANIFEST_FILE,
  STATUS_FILE,
  GITIGNORE_FILE,
  SessionStatus,
  VALID_TRANSITIONS,
  DEFAULT_CONFIG,
  getBackupRoot,
  getBackupsDir,
  getLatestFile,
  getSessionDir,
  getManifestPath,
  getStatusPath,
};
