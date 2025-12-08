'use strict';

/**
 * @fileoverview Output formatters for sync-checker results.
 * @module sync-checker-utils
 */

const { logListWithLimit } = require('./log-utils');

function logMissingKeys(missingByLang, log) {
  for (const [lang, keys] of Object.entries(missingByLang)) {
    if (keys.length === 0) {
      continue;
    }
    logListWithLimit({ items: keys, label: `Missing in ${lang}.json`, limit: 10, log });
    log();
  }
}

function logIdenticalValues(identicalValues, log) {
  if (identicalValues.length === 0) {
    return;
  }
  const truncate = v => (typeof v === 'string' && v.length > 40 ? `${v.substring(0, 37)}...` : v);
  logListWithLimit({
    items: identicalValues,
    label: 'Identical values across languages',
    limit: 10,
    log,
    formatter: ({ key, value }) => `${key}: "${truncate(value)}"`,
  });
  log();
}

function logIcuMismatches(icuMismatches, log) {
  if (icuMismatches.length === 0) {
    return;
  }
  log(`ICU structure mismatches (${icuMismatches.length}):`);
  icuMismatches.slice(0, 5).forEach(({ key, hasIcu, missingIcu }) => {
    log(`  [!] ${key}`);
    log(`      Has ICU: ${hasIcu.join(', ')} | Missing ICU: ${missingIcu.join(', ')}`);
  });
  if (icuMismatches.length > 5) {
    log(`  ... and ${icuMismatches.length - 5} more`);
  }
  log();
}

function logIcuMessages(icuMessages, log) {
  if (icuMessages.length === 0) {
    return;
  }
  logListWithLimit({
    items: icuMessages,
    label: 'ICU/Pluralization messages',
    limit: 5,
    log,
    formatter: ({ key }) => key,
  });
  log();
}

function logSyncIssues(sr, log) {
  logMissingKeys(sr.missingByLang, log);
  logIdenticalValues(sr.identicalValues, log);
  logIcuMismatches(sr.icuMismatches, log);
  logIcuMessages(sr.icuMessages, log);
}

function logSyncSummary(sr, log) {
  log('Summary');
  log('-'.repeat(50));
  log(`Total keys:        ${sr.allKeys.size}`);
  log(`Languages:         ${sr.langFiles.length}`);
  log(`Missing keys:      ${Object.values(sr.missingByLang).reduce((a, b) => a + b.length, 0)}`);
  log(`Identical values:  ${sr.identicalValues.length}`);
  log(`ICU messages:      ${sr.icuMessages.length}`);
  log(`ICU mismatches:    ${sr.icuMismatches.length}`);
}

function logSyncHeader(log) {
  log('Transloco Sync Check');
  log('='.repeat(50));
}

function handleInsufficientLangs(langFiles, log) {
  log(
    `Need at least 2 language files to compare.\nFound: ${langFiles.map(f => f.name).join(', ') || 'none'}`,
  );
  return { success: true, langFiles, result: null };
}

module.exports = {
  logSyncIssues,
  logSyncSummary,
  logSyncHeader,
  handleInsufficientLangs,
};
