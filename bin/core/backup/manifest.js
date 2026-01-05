'use strict';

/**
 * @fileoverview Session manifest creation and persistence.
 * @module backup/manifest
 */

const fs = require('../fs-adapter');
const path = require('path');
const { atomicWrite, atomicWriteSync } = require('./file-ops');
const { MANIFEST_FILE, getSessionDir } = require('./constants');

const MANIFEST_VERSION = '1.0';

/**
 * Creates new session manifest
 * @param {string} sessionId
 * @param {string} command
 * @param {string} cwd
 * @returns {Object}
 */
function createManifest(sessionId, command, cwd) {
  return {
    version: MANIFEST_VERSION,
    id: sessionId,
    timestamp: new Date().toISOString(),
    command,
    cwd,
    status: 'pending',
    files: [],
    reportFile: null,
    stats: { filesModified: 0, filesBackedUp: 0 },
    error: null,
  };
}

/**
 * @param {Object} manifest
 * @param {{original: string, backup: string, size: number}} fileInfo
 */
function addFileToManifest(manifest, fileInfo) {
  manifest.files.push({
    original: fileInfo.original,
    backup: fileInfo.backup,
    size: fileInfo.size,
    backedUpAt: new Date().toISOString(),
  });
  manifest.stats.filesBackedUp = manifest.files.length;
}

/**
 * @param {Object} manifest
 * @param {Object} ctx - Context with status, stats, error properties
 */
function updateManifestStatus(manifest, ctx) {
  const { status, stats = null, error = null } = ctx;
  manifest.status = status;
  manifest.updatedAt = new Date().toISOString();
  if (stats) {
    manifest.stats = { ...manifest.stats, ...stats };
  }
  if (error) {
    manifest.error = {
      message: error.message,
      stack: error.stack,
      occurredAt: new Date().toISOString(),
    };
  }
}

function getManifestPath(cwd, sessionId) {
  return path.join(getSessionDir(cwd, sessionId), MANIFEST_FILE);
}

/**
 * @param {string} cwd
 * @param {string} sessionId
 * @param {Object} manifest
 * @returns {Promise<void>}
 */
async function writeManifest(cwd, sessionId, manifest) {
  const manifestPath = getManifestPath(cwd, sessionId);
  const content = JSON.stringify(manifest, null, 2);
  await atomicWrite(manifestPath, content);
}

/**
 * @param {string} cwd
 * @param {string} sessionId
 * @param {Object} manifest
 */
function writeManifestSync(cwd, sessionId, manifest) {
  const manifestPath = getManifestPath(cwd, sessionId);
  const content = JSON.stringify(manifest, null, 2);
  atomicWriteSync(manifestPath, content);
}

/**
 * @param {string} cwd
 * @param {string} sessionId
 * @returns {Promise<Object|null>}
 */
async function readManifest(cwd, sessionId) {
  const manifestPath = getManifestPath(cwd, sessionId);
  try {
    const content = await fs.readFile(manifestPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * @param {string} cwd
 * @param {string} sessionId
 * @returns {Object|null}
 */
function readManifestSync(cwd, sessionId) {
  const manifestPath = getManifestPath(cwd, sessionId);
  try {
    const content = fs.readFileSync(manifestPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function hasRequiredField(manifest, field) {
  return Boolean(manifest[field]);
}

/**
 * @param {Object} manifest
 * @returns {Object} Result with valid and error properties
 */
function validateManifest(manifest) {
  if (!manifest) {
    return { valid: false, error: 'Manifest is null' };
  }
  const requiredFields = [
    { field: 'version', error: 'Missing version' },
    { field: 'id', error: 'Missing session id' },
    { field: 'timestamp', error: 'Missing timestamp' },
  ];
  for (const { field, error } of requiredFields) {
    if (!hasRequiredField(manifest, field)) {
      return { valid: false, error };
    }
  }
  if (!Array.isArray(manifest.files)) {
    return { valid: false, error: 'Invalid files array' };
  }
  return { valid: true };
}

function formatDate(timestamp) {
  return timestamp ? new Date(timestamp).toLocaleString() : 'unknown';
}

/**
 * @param {Object} manifest
 * @returns {Object}
 */
function formatManifestForDisplay(manifest) {
  return {
    id: manifest.id,
    date: formatDate(manifest.timestamp),
    status: manifest.status || 'unknown',
    fileCount: manifest.files?.length || 0,
    command: manifest.command || 'unknown',
    hasReport: Boolean(manifest.reportFile),
  };
}

module.exports = {
  createManifest,
  addFileToManifest,
  updateManifestStatus,
  writeManifest,
  writeManifestSync,
  readManifest,
  readManifestSync,
  validateManifest,
  formatManifestForDisplay,
};
