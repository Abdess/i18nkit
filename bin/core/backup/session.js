'use strict';

/**
 * @fileoverview Backup session lifecycle management.
 * @module backup/session
 */

const path = require('path');
const crypto = require('crypto');
const {
  SessionStatus,
  VALID_TRANSITIONS,
  getSessionDir,
  getBackupsDir,
  getLatestFile,
} = require('./constants');
const { ensureDirSync, copyFilePreservingStructureSync, listDirsSync } = require('./file-ops');
const {
  createManifest,
  addFileToManifest,
  updateManifestStatus,
  writeManifestSync,
  readManifestSync,
} = require('./manifest');
const fs = require('../fs-adapter');

/**
 * Generates unique session ID: YYYY-MM-DD_HH-MM-SS_command_rand
 * @param {string} command
 * @returns {string}
 */
function generateSessionId(command) {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 8).replace(/:/g, '-');
  const cmd = command.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 20);
  const rand = crypto.randomBytes(2).toString('hex');
  return `${date}_${time}_${cmd}_${rand}`;
}

/**
 * @param {string} sessionId
 * @returns {{id: string, timestamp: Date, date: string, time: string}|null}
 */
function parseSessionId(sessionId) {
  const parts = sessionId.split('_');
  if (parts.length < 4) {
    return null;
  }
  const [date, time] = parts;
  const timestamp = new Date(`${date}T${time.replace(/-/g, ':')}`);
  return { id: sessionId, timestamp, date, time };
}

function getManifestValue(manifest, key, defaultValue) {
  return manifest?.[key] || defaultValue;
}

function extractSessionInfo(manifest, dir) {
  return {
    id: dir,
    status: getManifestValue(manifest, 'status', 'unknown'),
    fileCount: manifest?.files?.length || 0,
    command: getManifestValue(manifest, 'command', 'unknown'),
  };
}

function parseSessionForList(cwd, dir) {
  const parsed = parseSessionId(dir);
  if (!parsed) {
    return null;
  }
  const manifest = readManifestSync(cwd, dir);
  return {
    ...extractSessionInfo(manifest, dir),
    timestamp: parsed.timestamp,
  };
}

/**
 * Backup session with state machine lifecycle
 */
class Session {
  /**
   * @param {string} cwd
   * @param {string} command
   * @param {string} [sessionId]
   */
  constructor(cwd, command, sessionId = null) {
    this.cwd = cwd;
    this.command = command;
    this.id = sessionId || generateSessionId(command);
    this.sessionDir = getSessionDir(cwd, this.id);
    this.manifest = createManifest(this.id, command, cwd);
    this.files = [];
  }

  get status() {
    return this.manifest.status;
  }

  validateTransition(newStatus) {
    const allowed = VALID_TRANSITIONS[this.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new Error(`Invalid transition: ${this.status} -> ${newStatus}`);
    }
  }

  setStatus(status, stats = null, error = null) {
    this.validateTransition(status);
    updateManifestStatus(this.manifest, { status, stats, error });
    this.save();
  }

  save() {
    ensureDirSync(this.sessionDir);
    writeManifestSync(this.cwd, this.id, this.manifest);
  }

  start() {
    this.setStatus(SessionStatus.BACKING_UP);
    return this;
  }

  backupFile(filePath) {
    if (this.status !== SessionStatus.BACKING_UP) {
      throw new Error(`Cannot backup file in status: ${this.status}`);
    }
    const fileInfo = copyFilePreservingStructureSync(filePath, this.sessionDir, this.cwd);
    addFileToManifest(this.manifest, fileInfo);
    this.files.push(fileInfo);
    this.save();
    return fileInfo;
  }

  markReady() {
    this.setStatus(SessionStatus.READY);
    return this;
  }

  beginModifications() {
    this.setStatus(SessionStatus.IN_PROGRESS);
    return this;
  }

  saveReport(reportPath) {
    if (!fs.existsSync(reportPath)) {
      return null;
    }
    const reportDest = path.join(this.sessionDir, 'report.json');
    fs.copyFileSync(reportPath, reportDest);
    this.manifest.reportFile = 'report.json';
    this.save();
    return reportDest;
  }

  complete(stats = {}) {
    this.setStatus(SessionStatus.COMPLETED, stats);
    this.updateLatest();
    return this;
  }

  rollback() {
    this.setStatus(SessionStatus.ROLLED_BACK);
    return this;
  }

  fail(error) {
    updateManifestStatus(this.manifest, { status: SessionStatus.FAILED, error });
    this.save();
    return this;
  }

  updateLatest() {
    const latestFile = getLatestFile(this.cwd);
    try {
      fs.writeFileSync(latestFile, this.id, 'utf-8');
    } catch {
      // Non-critical: latest file update failure is acceptable
    }
  }

  getBackedUpFiles() {
    return this.manifest.files.map(f => ({
      original: path.join(this.cwd, f.original),
      backup: path.join(this.sessionDir, f.backup),
      size: f.size,
    }));
  }

  /**
   * @param {string} cwd
   * @param {string} sessionId
   * @returns {Session|null}
   */
  static load(cwd, sessionId) {
    const manifest = readManifestSync(cwd, sessionId);
    if (!manifest) {
      return null;
    }
    const session = new Session(cwd, manifest.command, sessionId);
    session.manifest = manifest;
    session.files = manifest.files || [];
    return session;
  }

  /**
   * @param {string} cwd
   * @returns {string|null}
   */
  static getLatestId(cwd) {
    const latestFile = getLatestFile(cwd);
    try {
      return fs.readFileSync(latestFile, 'utf-8').trim();
    } catch {
      return null;
    }
  }

  /**
   * @param {string} cwd
   * @returns {Session|null}
   */
  static loadLatest(cwd) {
    const latestId = Session.getLatestId(cwd);
    return latestId ? Session.load(cwd, latestId) : null;
  }

  /**
   * @param {string} cwd
   * @returns {Object[]}
   */
  static listAll(cwd) {
    const backupsDir = getBackupsDir(cwd);
    const dirs = listDirsSync(backupsDir);
    return dirs
      .map(dir => parseSessionForList(cwd, dir))
      .filter(Boolean)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * @param {string} cwd
   * @returns {Object[]}
   */
  static findIncomplete(cwd) {
    const sessions = Session.listAll(cwd);
    return sessions.filter(
      s => s.status === SessionStatus.BACKING_UP || s.status === SessionStatus.IN_PROGRESS,
    );
  }
}

module.exports = {
  Session,
  generateSessionId,
  parseSessionId,
};
