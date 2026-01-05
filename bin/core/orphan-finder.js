'use strict';

/**
 * @fileoverview Unused translation key detector.
 * Scans source files to identify orphan keys not referenced in code.
 * @module orphan-finder
 */

const path = require('path');
const fs = require('./fs-adapter');
const { readJsonFile, flattenKeys, normalizeData } = require('./json-utils');
const { collectFiles } = require('./file-walker');
const { isTranslationFile, readI18nDirectory } = require('./sync-checker');
const { logListWithLimit } = require('./log-utils');

const DYNAMIC_KEY_RE = /(?:translate|transloco)\s*\(\s*[`'"]([^`'"]*)\$\{/g;
const CONCAT_KEY_RE = /['"`]([^'"`]+)['"]\s*\+\s*(?:\w+|['"`])/g;

async function getLangFiles(i18nDir) {
  const dirEntries = await readI18nDirectory(i18nDir);
  return dirEntries.filter(isTranslationFile).map(e => e.name);
}

async function loadRefData(i18nDir, refFile, format) {
  const refData = await readJsonFile(path.join(i18nDir, refFile));
  if (!refData) {
    throw new Error(`Cannot parse ${refFile}`);
  }
  return { refFile, allKeys: flattenKeys(normalizeData(refData, format)) };
}

async function loadReferenceKeysForOrphans(ctx) {
  const { i18nDir, format, log } = ctx;
  const langFiles = await getLangFiles(i18nDir);
  if (langFiles.length === 0) {
    log('No language files found.');
    return null;
  }
  return loadRefData(i18nDir, langFiles[0], format);
}

function detectDynamicPatterns(content, relPath, dynamicPatterns) {
  for (const match of content.matchAll(DYNAMIC_KEY_RE)) {
    dynamicPatterns.push({ file: relPath, pattern: `${match[1]}...` });
  }
  for (const match of content.matchAll(CONCAT_KEY_RE)) {
    if (match[1].includes('.') && !match[1].includes(' ')) {
      dynamicPatterns.push({ file: relPath, pattern: `${match[1]}+...` });
    }
  }
}

const QUOTED_STRING_RE = /['"`]([a-zA-Z][a-zA-Z0-9_.]+)['"`]/g;

function scanFileForKeyUsage(ctx) {
  const { content, relPath, keySet, keyUsageMap, dynamicPatterns } = ctx;
  detectDynamicPatterns(content, relPath, dynamicPatterns);

  for (const match of content.matchAll(QUOTED_STRING_RE)) {
    const candidate = match[1];
    if (keySet.has(candidate)) {
      keyUsageMap.set(candidate, true);
    }
  }
}

async function scanAllFilesForKeys(files, ctx) {
  const { srcDir, keySet, keyUsageMap, dynamicPatterns, verbose } = ctx;
  await Promise.all(
    files.map(async filePath => {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        scanFileForKeyUsage({
          content,
          relPath: path.relative(srcDir, filePath),
          keySet,
          keyUsageMap,
          dynamicPatterns,
        });
      } catch (err) {
        if (verbose) {
          console.warn(`Warning: Cannot read ${path.relative(srcDir, filePath)}: ${err.message}`);
        }
      }
    }),
  );
}

function partitionKeyUsage(keyUsageMap) {
  const usedKeys = [];
  const orphanKeys = [];
  for (const [key, used] of keyUsageMap) {
    (used ? usedKeys : orphanKeys).push(key);
  }
  return { usedKeys, orphanKeys };
}

function logDynamicPatterns(dynamicPatterns, log) {
  if (dynamicPatterns.length === 0) {
    return;
  }
  const uniquePatterns = [...new Set(dynamicPatterns.map(p => p.pattern))];
  logListWithLimit({
    items: uniquePatterns,
    label: `Dynamic key patterns detected`,
    limit: 5,
    log,
    prefix: '  [!] ',
  });
  log('  (Some orphans may be false positives due to dynamic keys)\n');
}

function logOrphanResults(results, log) {
  const { dynamicPatterns, orphanKeys, allKeys, usedKeys } = results;
  logDynamicPatterns(dynamicPatterns, log);

  if (orphanKeys.length > 0) {
    logListWithLimit({ items: orphanKeys, label: 'Orphan keys', limit: 20, log });
  } else {
    log('No orphan keys found.');
  }

  log(`\nSummary\n${'-'.repeat(50)}`);
  log(`Total keys:      ${allKeys.length}\nUsed keys:       ${usedKeys.length}`);
  log(`Orphan keys:     ${orphanKeys.length}\nDynamic patterns: ${dynamicPatterns.length}`);
}

async function scanAndCollect(ctx) {
  const { srcDir, excludedFolders, allKeys, verbose } = ctx;
  const keySet = new Set(allKeys);
  const keyUsageMap = new Map(allKeys.map(k => [k, false]));
  const dynamicPatterns = [];
  const files = await collectFiles(srcDir, excludedFolders);
  await scanAllFilesForKeys(files, { srcDir, keySet, keyUsageMap, dynamicPatterns, verbose });
  const { usedKeys, orphanKeys } = partitionKeyUsage(keyUsageMap);
  return { usedKeys, orphanKeys, dynamicPatterns, allKeys };
}

function buildOrphanResult(ctx) {
  const { results, strict, exitCodes, log } = ctx;
  const hasOrphans = strict && results.orphanKeys.length > 0;
  if (hasOrphans) {
    log('\nOrphan check failed (--strict mode)');
  }
  return {
    success: !hasOrphans,
    exitCode: hasOrphans ? exitCodes.untranslated : exitCodes.success,
    ...results,
  };
}

function logOrphanHeader(log) {
  log('Transloco Find Orphan Keys');
  log('='.repeat(50));
}

function getOrphanExitCodes(options) {
  return options.exitCodes || { success: 0, untranslated: 1 };
}

function handleNoRef(exitCodes) {
  return { success: true, exitCode: exitCodes.success, orphanKeys: [] };
}

async function executeOrphanScan(ctx) {
  const { srcDir, excludedFolders, allKeys, verbose, refFile, log, strict, exitCodes } = ctx;
  log(`Reference: ${refFile} (${allKeys.length} keys)\nScanning: ${srcDir}\n`);
  const results = await scanAndCollect({ srcDir, excludedFolders, allKeys, verbose });
  logOrphanResults(results, log);
  return buildOrphanResult({ results, strict, exitCodes, log });
}

function getOrphanDefaults() {
  return { format: 'nested', excludedFolders: [], verbose: false, strict: false, log: console.log };
}

function parseOrphanOptions(options) {
  const defaults = getOrphanDefaults();
  return { ...defaults, ...options, exitCodes: getOrphanExitCodes(options) };
}

/**
 * Scans source files to find translation keys not used in code
 * @param {OrphanOptions} [options]
 * @returns {Promise<OrphanResult>}
 * @example
 * const { orphanKeys } = await findOrphans({ i18nDir: './src/i18n', srcDir: './src/app' });
 */
async function findOrphans(options = {}) {
  const opts = parseOrphanOptions(options);
  logOrphanHeader(opts.log);
  const refResult = await loadReferenceKeysForOrphans({
    i18nDir: opts.i18nDir,
    format: opts.format,
    log: opts.log,
  });
  if (!refResult) {
    return handleNoRef(opts.exitCodes);
  }
  return executeOrphanScan({ ...refResult, ...opts });
}

module.exports = {
  findOrphans,
};
