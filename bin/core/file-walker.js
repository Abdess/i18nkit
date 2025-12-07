'use strict';

/**
 * @fileoverview Recursive directory walker for Angular/TypeScript projects.
 * Filters source files, extracts inline templates, and loads external templates.
 * @module file-walker
 */

const fs = require('./fs-adapter');
const path = require('path');

const DEFAULT_EXCLUDED_FOLDERS = ['node_modules', 'dist', '.git', 'coverage', 'e2e', '.angular'];

const VALID_SOURCE_RE = /\.(ts|html)$/;
const EXCLUDED_SOURCE_RE = /\.(spec|test|e2e|mock)\./;

const isValidSourceFile = file => VALID_SOURCE_RE.test(file) && !EXCLUDED_SOURCE_RE.test(file);

function validateDir(dir) {
  if (!fs.existsSync(dir)) {
    throw new Error(`Directory not found: ${dir}`);
  }
}

function shouldSkipEntry(entry, excludedFolders) {
  return excludedFolders.includes(entry.name);
}

async function* processEntry(entry, dir, excludedFolders) {
  const filePath = path.join(dir, entry.name);
  if (entry.isDirectory()) {
    yield* walkDirAsync(filePath, excludedFolders);
  } else if (isValidSourceFile(entry.name)) {
    yield filePath;
  }
}

async function* walkDirAsync(dir, excludedFolders = DEFAULT_EXCLUDED_FOLDERS) {
  validateDir(dir);
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (shouldSkipEntry(entry, excludedFolders)) {
      continue;
    }
    yield* processEntry(entry, dir, excludedFolders);
  }
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

function extractInlineTemplate(content) {
  const templateMatches = [...content.matchAll(/template\s*:\s*`([\s\S]*?)`/g)];
  if (templateMatches.length === 0) {
    return { template: null, tsCode: content };
  }
  const template = templateMatches.map(m => m[1]).join('\n');
  let tsCode = content;
  for (const m of templateMatches) {
    tsCode = tsCode.replace(m[0], '');
  }
  return { template, tsCode };
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
