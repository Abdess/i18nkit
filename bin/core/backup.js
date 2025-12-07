'use strict';

/**
 * @fileoverview File backup and restore for safe source modifications.
 * Creates timestamped backups before applying changes.
 * @module backup
 */

const fs = require('./fs-adapter');
const path = require('path');

const backupFiles = new Map();

function buildBackupPath(filePath, backupDir) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const relativePath = path.relative(process.cwd(), filePath);
  return path.join(backupDir, `${timestamp}_${relativePath.replace(/[/\\]/g, '_')}`);
}

function writeBackupFile(filePath, backupPath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    fs.writeFileSync(backupPath, content, 'utf-8');
    backupFiles.set(filePath, backupPath);
    return backupPath;
  } catch (err) {
    console.warn(`Warning: Cannot backup ${filePath}: ${err.message}`);
    return null;
  }
}

function shouldSkipBackup(enabled, dryRun) {
  return !enabled || dryRun;
}

/**
 * Creates a timestamped backup of a file
 * @param {string} filePath
 * @param {string} backupDir
 * @param {Object} [options]
 * @returns {string|null} Backup path or null if skipped
 */
function createBackup(filePath, backupDir, options = {}) {
  const { enabled = true, dryRun = false } = options;
  if (shouldSkipBackup(enabled, dryRun)) {
    return null;
  }
  fs.mkdirSync(backupDir, { recursive: true });
  return writeBackupFile(filePath, buildBackupPath(filePath, backupDir));
}

/**
 * Restores all backed-up files to their original locations
 * @returns {number} Count of restored files
 */
function restoreBackups() {
  let restored = 0;
  for (const [original, backup] of backupFiles) {
    try {
      const content = fs.readFileSync(backup, 'utf-8');
      fs.writeFileSync(original, content, 'utf-8');
      restored++;
    } catch {
      console.error(`Cannot restore ${original} from ${backup}`);
    }
  }
  return restored;
}

function getBackupFiles() {
  return backupFiles;
}

module.exports = { createBackup, restoreBackups, getBackupFiles };
