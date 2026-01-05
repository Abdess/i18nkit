'use strict';

/**
 * @fileoverview JSON manipulation utilities for nested i18n structures.
 * Handles flattening, unflattening, deep merging, and ICU message detection.
 * @module json-utils
 */

const fs = require('./fs-adapter');
const path = require('path');

const KEY_SEPARATOR = ':::';

/**
 * @param {string} filePath
 * @param {boolean} [verbose=false]
 * @returns {Object|null}
 */
function readJsonFileSync(filePath, verbose = false) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    if (verbose) {
      console.warn(`Warning: Cannot parse ${filePath}: ${err.message}`);
    }
    return null;
  }
}

/**
 * @param {string} filePath
 * @param {boolean} [verbose=false]
 * @returns {Promise<Object|null>}
 */
async function readJsonFile(filePath, verbose = false) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    if (verbose) {
      console.warn(`Warning: Cannot parse ${filePath}: ${err.message}`);
    }
    return null;
  }
}

/**
 * @param {string} filePath
 * @param {Object} data
 * @returns {Promise<void>}
 */
async function writeJsonFile(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function navigateToParent(obj, keyPath) {
  let current = obj;
  for (let i = 0; i < keyPath.length - 1; i++) {
    current[keyPath[i]] ??= {};
    current = current[keyPath[i]];
  }
  return current;
}

function resolveFinalKey(current, key, value) {
  if (current[key] && current[key] !== value) {
    return `${key}_${hashText(value)}`;
  }
  return key;
}

function setNestedValue(obj, keyPath, value) {
  const current = navigateToParent(obj, keyPath);
  const originalKey = keyPath.at(-1);
  const existed = Object.hasOwn(current, originalKey);
  const finalKey = resolveFinalKey(current, originalKey, value);
  current[finalKey] = value;
  return { path: [...keyPath.slice(0, -1), finalKey], isNew: !existed };
}

function getNestedValue(obj, keyPath) {
  let current = obj;
  for (const key of keyPath) {
    if (!current || typeof current !== 'object') {
      return undefined;
    }
    current = current[key];
  }
  return current;
}

const isNestedObject = v => typeof v === 'object' && v !== null;
const buildKey = (prefix, key) => (prefix ? `${prefix}.${key}` : key);

function flattenKeys(obj, prefix = '') {
  return Object.entries(obj).flatMap(([key, value]) => {
    const fullKey = buildKey(prefix, key);
    return isNestedObject(value) ? flattenKeys(value, fullKey) : [fullKey];
  });
}

const escapeKey = key => (key.includes('.') ? key.replaceAll('.', KEY_SEPARATOR) : key);
const unescapeKey = key => (key.includes(KEY_SEPARATOR) ? key.replaceAll(KEY_SEPARATOR, '.') : key);

const isPlainObject = v => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Flattens nested JSON to dot-notation keys
 * @param {Object} obj
 * @param {string} [prefix='']
 * @param {Object} [result={}]
 * @returns {Record<string, string>}
 * @example
 * flattenJson({ user: { name: 'John' } }) // { 'user.name': 'John' }
 */
function flattenJson(obj, prefix = '', result = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = buildKey(prefix, escapeKey(key));
    if (isPlainObject(value)) {
      flattenJson(value, fullKey, result);
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

function ensurePath(obj, parts) {
  return parts.slice(0, -1).reduce((current, part) => {
    if (!Object.hasOwn(current, part) || !isPlainObject(current[part])) {
      current[part] = {};
    }
    return current[part];
  }, obj);
}

/**
 * Restores nested structure from dot-notation keys
 * @param {Record<string, string>} obj
 * @returns {Object}
 * @example
 * unflattenJson({ 'user.name': 'John' }) // { user: { name: 'John' } }
 */
function unflattenJson(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const parts = key.split('.').map(unescapeKey);
    ensurePath(result, parts)[parts.at(-1)] = value;
  }
  return result;
}

function mergeValue(result, key, value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (isPlainObject(value)) {
    return mergeDeep(result[key] ?? {}, value);
  }
  return Object.hasOwn(result, key) ? result[key] : value;
}

/**
 * Deep merges source into target, preserving existing values
 * @param {Object} target
 * @param {Object} source
 * @returns {Object}
 */
function mergeDeep(target, source) {
  const result = { ...target };
  for (const [key, value] of Object.entries(source)) {
    result[key] = mergeValue(result, key, value);
  }
  return result;
}

function hashText(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36).substring(0, 6);
}

/**
 * Detects ICU MessageFormat syntax (plural, select, selectordinal)
 * @param {*} value
 * @returns {boolean}
 */
function isICUMessage(value) {
  if (typeof value !== 'string') {
    return false;
  }
  return /\{[^}]+,\s*(plural|select|selectordinal)\s*,/.test(value);
}

function normalizeData(data, format) {
  const isFlat = format === 'flat' || typeof Object.values(data)[0] === 'string';
  return isFlat ? unflattenJson(data) : data;
}

module.exports = {
  readJsonFileSync,
  readJsonFile,
  writeJsonFile,
  setNestedValue,
  getNestedValue,
  flattenKeys,
  flattenJson,
  unflattenJson,
  mergeDeep,
  isICUMessage,
  normalizeData,
};
