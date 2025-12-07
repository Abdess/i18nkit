'use strict';

/**
 * @fileoverview Shared text extraction patterns and utilities for all parsers.
 * Handles HTML entities, ignore patterns, and Transloco expression cleanup.
 * @module parser-utils
 */

/**
 * @typedef {Object} ExtractedText
 * @property {string} text
 * @property {string} rawText
 * @property {string} context
 * @property {string} [attr]
 */

const IGNORE_PATTERNS = [
  /^\s*$/,
  /^\d+(\.\d+)?$/,
  /^[a-z]+:\/\//i,
  /^#[0-9a-f]{3,8}$/i,
  /^(true|false|null|undefined)$/i,
  /^\{\{[^}]*\}\}$/,
  /^@(if|for|switch|else|case|defer|empty|placeholder|loading|error)\b/,
  /^&\w+;$/,
  /&[a-z]+;/i,
  /^\d+(px|rem|em|vh|vw|%|°|deg|ms|s)$/,
  /^[<>{}[\]()]+$/,
  /\w+\(\)$/,
];

const HTML_ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
  '&ndash;': '–',
  '&mdash;': '—',
  '&laquo;': '«',
  '&raquo;': '»',
  '&euro;': '€',
  '&copy;': '©',
  '&reg;': '®',
};

const ICON_CLASS_PATTERN =
  /class="[^"]*\b(?:material-symbols|pi-icon|pi pi-|fa[rsbldt]?(?:\s|"|-)|icon\b|bi-|symbol)/i;

/**
 * Decodes HTML entities to their character equivalents.
 * @param {string} str
 * @returns {string}
 * @example decodeHtmlEntities('&amp;') // '&'
 */
function decodeHtmlEntities(str) {
  if (!str) {
    return str;
  }
  let result = str;
  for (const [entity, char] of Object.entries(HTML_ENTITIES)) {
    result = result.replaceAll(entity, char);
  }
  return result.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
}

/**
 * Determines if text should be ignored (too short, numeric, URL, etc.).
 * @param {string} text
 * @returns {boolean}
 */
function shouldIgnore(text) {
  if (!text) {
    return true;
  }
  const trimmed = text.trim();
  return trimmed.length < 2 || trimmed.length > 500 || IGNORE_PATTERNS.some(p => p.test(trimmed));
}

function isIconContainer(match) {
  return ICON_CLASS_PATTERN.test(match);
}

/**
 * Removes already-translated Transloco expressions from template.
 * @param {string} template
 * @param {boolean} [skipTranslated=true]
 * @returns {string}
 */
function cleanTranslocoExpressions(template, skipTranslated = true) {
  if (!skipTranslated) {
    return template;
  }
  return template
    .replace(/\{\{[^}]*\|\s*transloco[^}]*(\{[^}]*\})?[^}]*\}\}/g, '')
    .replace(/\[[\w.-]+\]="[^"]*\|\s*transloco[^"]*"/g, '')
    .replace(/\{\{\s*t\s*\([^)]*\)\s*\}\}/g, '')
    .replace(/"'[^']+'\s*\|\s*transloco[^"]*"/g, '""')
    .replace(/\*transloco\s*=\s*"[^"]*"/g, '')
    .replace(/\*transloco\s*=\s*'[^']*'/g, '');
}

/**
 * Removes Transloco function calls from TypeScript code.
 * @param {string} code
 * @returns {string}
 */
function cleanTranslocoCode(code) {
  return code
    .replace(/translate\s*\(\s*['"][^'"]+['"]\s*\)/g, '')
    .replace(/transloco\s*\(\s*['"][^'"]+['"]\s*\)/g, '')
    .replace(/\|\s*transloco/g, '');
}

function extractMatchText(match, group, decodeFn) {
  const rawText = (match[group] || '').trim().replace(/\s+/g, ' ');
  return { rawText, text: decodeFn(rawText) };
}

function shouldAddMatch(ctx) {
  const { text, key, seen, shouldIgnoreFn } = ctx;
  return !shouldIgnoreFn(text) && !seen.has(key);
}

function processPatternMatch(match, pattern, ctx) {
  const { options, seen, results } = ctx;
  const { context, group = 1, attr } = pattern;
  if (isIconContainer(match[0])) {
    return;
  }
  const { rawText, text } = extractMatchText(match, group, options.decodeFn);
  const key = `${context}:${text}`;
  if (shouldAddMatch({ text, key, seen, shouldIgnoreFn: options.shouldIgnoreFn })) {
    seen.add(key);
    results.push({ text, rawText, context, attr });
  }
}

function getExtractOptions(options) {
  return {
    shouldIgnoreFn: options.shouldIgnoreFn || shouldIgnore,
    decodeFn: options.decodeFn || decodeHtmlEntities,
  };
}

function processPatternMatches(content, pattern, ctx) {
  for (const match of content.matchAll(pattern.regex)) {
    processPatternMatch(match, pattern, ctx);
  }
}

/**
 * Extracts translatable text using regex patterns.
 * @param {string} content
 * @param {Array<Object>} patterns
 * @param {Object} [options]
 * @returns {Array<ExtractedText>}
 */
function extractWithPatterns(content, patterns, options = {}) {
  const results = [];
  const ctx = { options: getExtractOptions(options), seen: new Set(), results };
  for (const pattern of patterns) {
    processPatternMatches(content, pattern, ctx);
  }
  return results;
}

/**
 * Checks if text looks like a translation key (dot-separated).
 * @param {string} text
 * @returns {boolean}
 * @example isTranslationKey('common.buttons.save') // true
 */
function isTranslationKey(text) {
  return /^[a-z][a-z0-9]*(\.[a-z][a-z0-9_]*)+$/i.test(text);
}

module.exports = {
  decodeHtmlEntities,
  shouldIgnore,
  cleanTranslocoExpressions,
  cleanTranslocoCode,
  extractWithPatterns,
  isTranslationKey,
};
