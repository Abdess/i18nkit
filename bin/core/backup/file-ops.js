'use strict';

/**
 * @fileoverview Atomic file operations for backup system.
 * @module backup/file-ops
 */

const fs = require('../fs-adapter');
const nodeFsSync = require('fs');
const nodeFsPromises = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

function generateTempPath(targetPath) {
  const rand = crypto.randomBytes(4).toString('hex');
  return `${targetPath}.${Date.now()}.${rand}.tmp`;
}

/**
 * Writes content atomically via temp file + rename
 * @param {string} targetPath
 * @param {string} content
 * @returns {Promise<void>}
 */
async function atomicWrite(targetPath, content) {
  const tempPath = generateTempPath(targetPath);
  const dir = path.dirname(targetPath);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.writeFile(tempPath, content, 'utf-8');
    await fs.rename(tempPath, targetPath);
  } catch (err) {
    try {
      await fs.unlink(tempPath);
    } catch {
      // Cleanup failure is non-critical
    }
    throw err;
  }
}

/**
 * @param {string} targetPath
 * @param {string} content
 */
function atomicWriteSync(targetPath, content) {
  const tempPath = generateTempPath(targetPath);
  const dir = path.dirname(targetPath);
  fs.mkdirSync(dir, { recursive: true });
  try {
    fs.writeFileSync(tempPath, content, 'utf-8');
    nodeFsSync.renameSync(tempPath, targetPath);
  } catch (err) {
    try {
      nodeFsSync.unlinkSync(tempPath);
    } catch {
      // Cleanup failure is non-critical
    }
    throw err;
  }
}

/**
 * Copies file preserving directory structure relative to cwd
 * @param {string} srcFile
 * @param {string} destRoot
 * @param {string} cwd
 * @returns {Promise<{original: string, backup: string, size: number}>}
 */
async function copyFilePreservingStructure(srcFile, destRoot, cwd) {
  const relativePath = path.relative(cwd, srcFile);
  const destPath = path.join(destRoot, relativePath);
  const content = await fs.readFile(srcFile, 'utf-8');
  await atomicWrite(destPath, content);
  return {
    original: relativePath,
    backup: relativePath,
    size: Buffer.byteLength(content, 'utf-8'),
  };
}

/**
 * @param {string} srcFile
 * @param {string} destRoot
 * @param {string} cwd
 * @returns {{original: string, backup: string, size: number}}
 */
function copyFilePreservingStructureSync(srcFile, destRoot, cwd) {
  const relativePath = path.relative(cwd, srcFile);
  const destPath = path.join(destRoot, relativePath);
  const content = fs.readFileSync(srcFile, 'utf-8');
  atomicWriteSync(destPath, content);
  return {
    original: relativePath,
    backup: relativePath,
    size: Buffer.byteLength(content, 'utf-8'),
  };
}

/**
 * @param {string} backupPath
 * @param {string} originalPath
 * @returns {Promise<void>}
 */
async function restoreFile(backupPath, originalPath, _cwd) {
  const content = await fs.readFile(backupPath, 'utf-8');
  await atomicWrite(originalPath, content);
}

/**
 * @param {string} backupPath
 * @param {string} originalPath
 */
function restoreFileSync(backupPath, originalPath) {
  const content = fs.readFileSync(backupPath, 'utf-8');
  atomicWriteSync(originalPath, content);
}

/**
 * @param {string} dirPath
 * @returns {Promise<void>}
 */
async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * @param {string} dirPath
 */
function ensureDirSync(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * @param {string} dirPath
 * @returns {Promise<void>}
 */
async function removeDir(dirPath) {
  await nodeFsPromises.rm(dirPath, { recursive: true, force: true });
}

/**
 * @param {string} dirPath
 */
function removeDirSync(dirPath) {
  nodeFsSync.rmSync(dirPath, { recursive: true, force: true });
}

/**
 * @param {string} parentDir
 * @returns {Promise<string[]>}
 */
async function listDirs(parentDir) {
  try {
    const entries = await fs.readdir(parentDir, { withFileTypes: true });
    return entries.filter(e => e.isDirectory()).map(e => e.name);
  } catch {
    return [];
  }
}

/**
 * @param {string} parentDir
 * @returns {string[]}
 */
function listDirsSync(parentDir) {
  try {
    const entries = fs.readdirSync(parentDir, { withFileTypes: true });
    return entries.filter(e => e.isDirectory()).map(e => e.name);
  } catch {
    return [];
  }
}

module.exports = {
  atomicWrite,
  atomicWriteSync,
  copyFilePreservingStructure,
  copyFilePreservingStructureSync,
  restoreFile,
  restoreFileSync,
  ensureDir,
  ensureDirSync,
  removeDir,
  removeDirSync,
  listDirs,
  listDirsSync,
};
