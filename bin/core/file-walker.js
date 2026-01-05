'use strict';

/**
 * @fileoverview Recursive directory walker for Angular/TypeScript projects.
 * Filters source files, extracts inline templates, and loads external templates.
 * @module file-walker
 */

const fs = require('./fs-adapter');
const path = require('path');

const DEFAULT_EXCLUDED_FOLDERS = ['node_modules', 'dist', '.git', 'coverage', 'e2e', '.angular'];
const DEFAULT_EXCLUDED_SET = new Set(DEFAULT_EXCLUDED_FOLDERS);

const VALID_SOURCE_RE = /\.(ts|html)$/;
const EXCLUDED_SOURCE_RE = /\.(spec|test|e2e|mock)\./;

const isValidSourceFile = file => VALID_SOURCE_RE.test(file) && !EXCLUDED_SOURCE_RE.test(file);

function validateDir(dir) {
  if (!fs.existsSync(dir)) {
    throw new Error(`Directory not found: ${dir}`);
  }
}

function shouldSkipEntry(entry, excludedSet) {
  return excludedSet.has(entry.name);
}

async function* processEntry(entry, dir, excludedSet) {
  const filePath = path.join(dir, entry.name);
  if (entry.isDirectory()) {
    yield* walkDirRecursive(filePath, excludedSet);
  } else if (isValidSourceFile(entry.name)) {
    yield filePath;
  }
}

async function* walkDirRecursive(dir, excludedSet) {
  validateDir(dir);
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (shouldSkipEntry(entry, excludedSet)) {
      continue;
    }
    yield* processEntry(entry, dir, excludedSet);
  }
}

async function* walkDirAsync(dir, excludedFolders = DEFAULT_EXCLUDED_FOLDERS) {
  const excludedSet =
    Array.isArray(excludedFolders) ? new Set(excludedFolders) : DEFAULT_EXCLUDED_SET;
  yield* walkDirRecursive(dir, excludedSet);
}

/**
 * Collects all .ts/.html files recursively, excluding test files
 * @param {string} dir
 * @param {string[]} [excludedFolders]
 * @returns {Promise<string[]>}
 */
const collectFiles = (dir, excludedFolders) => Array.fromAsync(walkDirAsync(dir, excludedFolders));

function readFileContent(filePath, verbose = false) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    if (verbose) {
      console.warn(`Warning: Cannot read ${filePath}`);
    }
    return null;
  }
}

function processTypeScriptFile(content, filePath, ctx) {
  const hasComponent = /@Component\s*\(/.test(content);
  if (!hasComponent) {
    return { template: null, typescript: content, type: 'component' };
  }
  const { template: inlineTemplate, tsCode } = extractInlineTemplate(content);
  const template = inlineTemplate || loadExternalTemplate(content, filePath, ctx);
  if (!template && !tsCode) {
    return null;
  }
  return { template, typescript: tsCode, type: 'component' };
}

/**
 * Extracts template and TypeScript content from a file
 * @param {string} filePath
 * @param {Set<string>} processedTemplates - Tracks processed templates to avoid duplicates
 * @param {boolean} [verbose=false]
 * @returns {FileContent|null}
 */
function getFileContent(filePath, processedTemplates, verbose = false) {
  const content = readFileContent(filePath, verbose);
  if (!content) {
    return null;
  }
  const ext = path.extname(filePath);
  if (ext === '.html') {
    return handleHtmlFile(content, filePath, processedTemplates);
  }
  if (ext !== '.ts') {
    return null;
  }
  return processTypeScriptFile(content, filePath, { processedTemplates, verbose });
}

function handleHtmlFile(content, filePath, processedTemplates) {
  const normalizedPath = path.resolve(filePath);
  if (processedTemplates.has(normalizedPath)) {
    return null;
  }
  processedTemplates.add(normalizedPath);
  return { template: content, typescript: null, type: 'html' };
}

function removeMatchedSections(content, matches) {
  const parts = [];
  let lastIndex = 0;
  for (const m of matches) {
    parts.push(content.slice(lastIndex, m.index));
    lastIndex = m.index + m[0].length;
  }
  parts.push(content.slice(lastIndex));
  return parts.join('');
}

function extractInlineTemplate(content) {
  const templateMatches = [...content.matchAll(/template\s*:\s*`([\s\S]*?)`/g)];
  if (templateMatches.length === 0) {
    return { template: null, tsCode: content };
  }
  const template = templateMatches.map(m => m[1]).join('\n');
  return { template, tsCode: removeMatchedSections(content, templateMatches) };
}

function resolveTemplatePath(content, filePath) {
  const urlMatch = content.match(/templateUrl\s*:\s*['"`]([^'"`]+)['"`]/);
  return urlMatch ? path.resolve(path.dirname(filePath), urlMatch[1]) : null;
}

function isTemplateInvalid(templatePath, processedTemplates) {
  return !templatePath || !fs.existsSync(templatePath) || processedTemplates.has(templatePath);
}

function tryReadTemplate(templatePath, verbose) {
  try {
    return fs.readFileSync(templatePath, 'utf-8');
  } catch {
    if (verbose) {
      console.warn(`Warning: Cannot read template ${templatePath}`);
    }
    return null;
  }
}

function loadExternalTemplate(content, filePath, ctx) {
  const { processedTemplates, verbose = false } = ctx;
  const templatePath = resolveTemplatePath(content, filePath);
  if (isTemplateInvalid(templatePath, processedTemplates)) {
    return null;
  }
  processedTemplates.add(templatePath);
  return tryReadTemplate(templatePath, verbose);
}

module.exports = {
  DEFAULT_EXCLUDED_FOLDERS,
  collectFiles,
  getFileContent,
};
