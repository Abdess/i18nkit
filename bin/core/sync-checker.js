'use strict';

/**
 * @fileoverview Cross-language file synchronization checker.
 * Detects missing keys, identical values, and ICU format mismatches.
 * @module sync-checker
 */

const path = require('path');
const fs = require('./fs-adapter');
const {
  readJsonFile,
  flattenKeys,
  getNestedValue,
  isICUMessage,
  normalizeData,
} = require('./json-utils');
const {
  logSyncIssues,
  logSyncSummary,
  logSyncHeader,
  handleInsufficientLangs,
} = require('./sync-checker-utils');

const isTranslationFile = entry =>
  entry.isFile() &&
  entry.name.endsWith('.json') &&
  !entry.name.includes('report') &&
  !entry.name.includes('extracted');

async function readI18nDirectory(i18nDir) {
  try {
    return await fs.readdir(i18nDir, { withFileTypes: true });
  } catch {
    throw new Error(`i18n directory not found: ${i18nDir}`);
  }
}

async function loadLangFilesForSync(i18nDir) {
  const dirEntries = await readI18nDirectory(i18nDir);
  return dirEntries
    .filter(isTranslationFile)
    .map(f => ({ name: f.name.replace('.json', ''), path: path.join(i18nDir, f.name) }));
}

async function normalizeLangData(langFiles, format) {
  const langData = {};
  const allKeys = new Set();
  const results = await Promise.all(
    langFiles.map(async ({ name, path: filePath }) => {
      const data = await readJsonFile(filePath);
      if (!data) {
        throw new Error(`Cannot parse ${name}.json`);
      }
      return { name, data };
    }),
  );
  for (const { name, data } of results) {
    const normalized = normalizeData(data, format);
    const keys = flattenKeys(normalized);
    langData[name] = { data: normalized, keys: new Set(keys) };
    keys.forEach(k => allKeys.add(k));
  }
  return { langData, allKeys };
}

function getKeyEntries(key, langFiles, langData) {
  return langFiles
    .filter(({ name }) => langData[name].keys.has(key))
    .map(({ name }) => [name, getNestedValue(langData[name].data, key.split('.'))]);
}

function detectIcuStatus(entries) {
  return {
    icuLangs: entries.filter(([, v]) => isICUMessage(v)).map(([l]) => l),
    nonIcuLangs: entries.filter(([, v]) => v && !isICUMessage(v)).map(([l]) => l),
  };
}

const hasIcuMismatch = (icu, nonIcu) => icu.length > 0 && nonIcu.length > 0;
const hasUniqueValue = entries => new Set(Object.values(Object.fromEntries(entries))).size === 1;

function classifyKeyResult(key, entries, icuStatus) {
  const { icuLangs, nonIcuLangs } = icuStatus;
  if (hasIcuMismatch(icuLangs, nonIcuLangs)) {
    return { type: 'icuMismatch', key, hasIcu: icuLangs, missingIcu: nonIcuLangs };
  }
  if (icuLangs.length > 0) {
    return { type: 'icuMessage', key, langs: icuLangs };
  }
  if (hasUniqueValue(entries)) {
    return { type: 'identical', key, value: entries[0]?.[1] };
  }
  return null;
}

function analyzeKeyForSync(key, langFiles, langData) {
  const entries = getKeyEntries(key, langFiles, langData);
  if (entries.length < 2) {
    return null;
  }
  return classifyKeyResult(key, entries, detectIcuStatus(entries));
}

const CATEGORY_MAP = {
  icuMismatch: 'icuMismatches',
  icuMessage: 'icuMessages',
  identical: 'identicalValues',
};
const addToCategory = (cat, res) => {
  const k = res?.type && CATEGORY_MAP[res.type];
  if (k) {
    cat[k].push(res);
  }
};

function categorizeKeysForSync(allKeys, langFiles, langData) {
  const categories = { identicalValues: [], icuMessages: [], icuMismatches: [] };
  for (const key of allKeys) {
    addToCategory(categories, analyzeKeyForSync(key, langFiles, langData));
  }
  return categories;
}

function buildSyncResult(langFiles, langData, allKeys) {
  const missingByLang = Object.fromEntries(
    langFiles.map(({ name }) => [name, [...allKeys.difference(langData[name].keys)]]),
  );
  const { identicalValues, icuMessages, icuMismatches } = categorizeKeysForSync(
    allKeys,
    langFiles,
    langData,
  );
  return { allKeys, langFiles, missingByLang, identicalValues, icuMessages, icuMismatches };
}

const hasCriticalSyncIssues = sr =>
  Object.values(sr.missingByLang).some(k => k.length > 0) || sr.icuMismatches.length > 0;

function buildCheckSyncResult(ctx) {
  const { syncResult, strict, exitCodes, log } = ctx;
  const failed = strict && hasCriticalSyncIssues(syncResult);
  if (failed) {
    log('\nSync check failed (--strict mode)');
  }
  return {
    success: !failed,
    exitCode: failed ? exitCodes.untranslated : exitCodes.success,
    result: syncResult,
  };
}

async function performSyncCheck(langFiles, format, log) {
  log(`Comparing: ${langFiles.map(f => f.name).join(', ')}\n`);
  const { langData, allKeys } = await normalizeLangData(langFiles, format);
  const syncResult = buildSyncResult(langFiles, langData, allKeys);
  logSyncIssues(syncResult, log);
  logSyncSummary(syncResult, log);
  return syncResult;
}

const getExitCodes = options => options.exitCodes || { success: 0, untranslated: 1 };
const parseSyncOptions = opts => ({
  i18nDir: opts.i18nDir,
  format: opts.format || 'nested',
  log: opts.log || console.log,
  strict: opts.strict || false,
  exitCodes: getExitCodes(opts),
});

/**
 * Compares language files for missing keys, ICU mismatches, and duplicates
 * @param {SyncOptions} [options]
 * @returns {Promise<SyncCheckResult>}
 * @example
 * const { success, result } = await checkSync({ i18nDir: './src/i18n', strict: true });
 * console.log(result.missingByLang);
 */
async function checkSync(options = {}) {
  const opts = parseSyncOptions(options);
  logSyncHeader(opts.log);
  const langFiles = await loadLangFilesForSync(opts.i18nDir);
  if (langFiles.length < 2) {
    return handleInsufficientLangs(langFiles, opts.log);
  }
  const syncResult = await performSyncCheck(langFiles, opts.format, opts.log);
  return buildCheckSyncResult({
    syncResult,
    strict: opts.strict,
    exitCodes: opts.exitCodes,
    log: opts.log,
  });
}

module.exports = {
  checkSync,
  isTranslationFile,
  readI18nDirectory,
};
