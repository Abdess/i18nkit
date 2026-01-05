'use strict';

/**
 * @fileoverview Gitignore management for backup directories.
 * @module backup/gitignore
 */

const path = require('path');
const fs = require('../fs-adapter');
const { BACKUP_ROOT, GITIGNORE_FILE } = require('./constants');
const { atomicWriteSync, ensureDirSync } = require('./file-ops');

const I18NKIT_GITIGNORE_CONTENT = `# i18nkit generated - do not edit
backups/
report.json
reports/
cache/
*.log
*.tmp
`;

const PROJECT_GITIGNORE_ENTRY = '.i18nkit/';
const GITIGNORE_MARKER = '# i18nkit';
const REQUIRED_ENTRIES = ['backups/', 'report.json', 'reports/'];

function getMissingEntries(content) {
  return REQUIRED_ENTRIES.filter(entry => !content.includes(entry));
}

function createGitignore(gitignorePath) {
  atomicWriteSync(gitignorePath, I18NKIT_GITIGNORE_CONTENT);
  return { created: true, updated: false, path: gitignorePath };
}

function updateGitignoreContent(gitignorePath, content, missing) {
  const additions = missing.join('\n');
  const separator = content.endsWith('\n') ? '' : '\n';
  const updated = `${content}${separator}${additions}\n`;
  atomicWriteSync(gitignorePath, updated);
  return { created: false, updated: true, added: missing, path: gitignorePath };
}

/**
 * Creates or updates .i18nkit/.gitignore
 * @param {string} cwd
 * @returns {{created: boolean, updated: boolean, path: string}}
 */
function ensureI18nkitGitignore(cwd) {
  const i18nkitDir = path.join(cwd, BACKUP_ROOT);
  const gitignorePath = path.join(i18nkitDir, GITIGNORE_FILE);
  ensureDirSync(i18nkitDir);
  if (!fs.existsSync(gitignorePath)) {
    return createGitignore(gitignorePath);
  }
  const content = fs.readFileSync(gitignorePath, 'utf-8');
  const missing = getMissingEntries(content);
  if (missing.length > 0) {
    return updateGitignoreContent(gitignorePath, content, missing);
  }
  return { created: false, updated: false, path: gitignorePath };
}

/**
 * @param {string} cwd
 * @returns {{exists: boolean, hasEntry: boolean, path: string}}
 */
function checkProjectGitignore(cwd) {
  const gitignorePath = path.join(cwd, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    return { exists: false, hasEntry: false, path: gitignorePath };
  }
  const content = fs.readFileSync(gitignorePath, 'utf-8');
  const hasEntry = content.includes(PROJECT_GITIGNORE_ENTRY) || content.includes(BACKUP_ROOT);
  return { exists: true, hasEntry, path: gitignorePath };
}

/**
 * Returns suggestion if .i18nkit/ not in project .gitignore
 * @param {string} cwd
 * @returns {{message: string, entry: string, path: string}|null}
 */
function suggestGitignoreUpdate(cwd) {
  const check = checkProjectGitignore(cwd);
  if (check.hasEntry) {
    return null;
  }
  return {
    message: `Add "${PROJECT_GITIGNORE_ENTRY}" to your .gitignore`,
    entry: PROJECT_GITIGNORE_ENTRY,
    path: check.path,
  };
}

function buildGitignoreEntry() {
  return `\n${GITIGNORE_MARKER}\n${PROJECT_GITIGNORE_ENTRY}\n`;
}

function appendToExistingGitignore(gitignorePath, content) {
  const newEntry = buildGitignoreEntry();
  const separator = content.endsWith('\n') ? '' : '\n';
  atomicWriteSync(gitignorePath, `${content}${separator}${newEntry}`);
}

function createNewGitignore(gitignorePath) {
  const newEntry = buildGitignoreEntry();
  atomicWriteSync(gitignorePath, `${newEntry.trim()}\n`);
}

/**
 * Adds .i18nkit/ to project .gitignore
 * @param {string} cwd
 * @returns {Object} Result with added, reason, path properties
 */
function addToProjectGitignore(cwd) {
  const check = checkProjectGitignore(cwd);
  if (check.hasEntry) {
    return { added: false, reason: 'Already present' };
  }
  if (check.exists) {
    const content = fs.readFileSync(check.path, 'utf-8');
    appendToExistingGitignore(check.path, content);
  } else {
    createNewGitignore(check.path);
  }
  return { added: true, path: check.path };
}

function handleAutoGitignore(cwd, verbose, log) {
  const result = addToProjectGitignore(cwd);
  if (result.added && verbose) {
    log(`Added ${PROJECT_GITIGNORE_ENTRY} to ${result.path}`);
  }
}

function logCreation(result, verbose, log) {
  if (result.created && verbose) {
    log(`Created ${result.path}`);
  }
}

function processSuggestion(ctx) {
  const { cwd, suggestion, autoAddGitignore, verbose, log } = ctx;
  if (suggestion && autoAddGitignore) {
    handleAutoGitignore(cwd, verbose, log);
    return null;
  }
  return suggestion;
}

/**
 * Initializes .i18nkit directory structure and gitignore
 * @param {string} cwd
 * @param {Object} [options]
 * @returns {{initialized: boolean, suggestion: Object|null}}
 */
function initializeBackupStructure(cwd, options = {}) {
  const { autoAddGitignore = false, log = console.log, verbose = false } = options;
  const i18nkitResult = ensureI18nkitGitignore(cwd);
  logCreation(i18nkitResult, verbose, log);
  const suggestion = suggestGitignoreUpdate(cwd);
  const finalSuggestion = processSuggestion({ cwd, suggestion, autoAddGitignore, verbose, log });
  return { initialized: true, suggestion: finalSuggestion };
}

module.exports = {
  ensureI18nkitGitignore,
  checkProjectGitignore,
  suggestGitignoreUpdate,
  addToProjectGitignore,
  initializeBackupStructure,
  I18NKIT_GITIGNORE_CONTENT,
  PROJECT_GITIGNORE_ENTRY,
};
