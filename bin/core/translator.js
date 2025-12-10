'use strict';

/**
 * @fileoverview Automated translation of i18n JSON files.
 * Supports DeepL API and free MyMemory service with duplicate caching.
 * @module translator
 */

const path = require('path');
const { readJsonFile, writeJsonFile, flattenJson, unflattenJson } = require('./json-utils');

async function prepareTranslationData(sourceLang, i18nDir) {
  const sourceFile = path.join(i18nDir, `${sourceLang}.json`);
  const sourceJson = await readJsonFile(sourceFile);
  if (!sourceJson) {
    throw new Error(`Source file not found or invalid: ${sourceFile}`);
  }

  const flat = flattenJson(sourceJson);
  const entries = Object.entries(flat).filter(([, v]) => v && typeof v === 'string');
  const keys = entries.map(([k]) => k);
  const values = entries.map(([, v]) => v);
  const uniqueValues = [...new Set(values)];

  return { keys, values, uniqueValues };
}

function logTranslateHeader(ctx) {
  const { sourceLang, targetLang, useDeepL, log } = ctx;
  log('Transloco Auto-Translate');
  log('='.repeat(50));
  log(`Source: ${sourceLang}.json -> Target: ${targetLang}.json`);
  log(`Provider: ${useDeepL ? 'DeepL' : 'MyMemory (free)'}`);
  log();
}

function logTranslationSummary(ctx) {
  const { valuesCount, failedCount, useDeepL, email, log } = ctx;
  log('\nSummary');
  log('-'.repeat(50));
  log(`Strings translated: ${valuesCount - failedCount}/${valuesCount}`);
  if (failedCount > 0) {
    log(`Failed translations: ${failedCount} (kept original text)`);
  }
  log(`Provider: ${useDeepL ? 'DeepL API' : 'MyMemory (free)'}`);
  if (!useDeepL && !email) {
    log('Tip: Use --email=your@email.com for higher rate limits');
  }
}

async function executeDeepLTranslation(ctx) {
  const { uniqueValues, sourceLang, targetLang, provider } = ctx;
  const translated = await provider.translateBatch(uniqueValues, sourceLang, targetLang);
  return {
    translationMap: new Map(uniqueValues.map((v, i) => [v, translated[i]])),
    failedCount: 0,
  };
}

function executeMyMemoryTranslation(ctx) {
  const { uniqueValues, sourceLang, targetLang, provider, email, verbose } = ctx;
  return provider.translateBatch(uniqueValues, sourceLang, targetLang, {
    email,
    verbose,
    onProgress: (processed, total) => {
      if (processed < total) {
        process.stdout.write(`\r  Progress: ${processed}/${total}`);
      }
    },
  });
}

function executeTranslation(ctx) {
  return ctx.useDeepL ? executeDeepLTranslation(ctx) : executeMyMemoryTranslation(ctx);
}

async function saveTranslationResult(ctx) {
  const { targetJson, targetFile, startTime, dryRun = false, log = console.log } = ctx;

  if (dryRun) {
    log('\n[DRY RUN] Would write:');
    log(JSON.stringify(targetJson, null, 2));
    return;
  }

  await writeJsonFile(targetFile, targetJson);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log(`\nTranslated: ${targetFile} (${elapsed}s)`);
}

function buildTranslatedOutput(ctx) {
  const { keys, values, translationMap, i18nDir, targetLang } = ctx;
  const translatedFlat = Object.fromEntries(
    keys.map((k, i) => [k, translationMap.get(values[i]) ?? values[i]]),
  );
  return {
    targetJson: unflattenJson(translatedFlat),
    targetFile: path.join(i18nDir, `${targetLang}.json`),
  };
}

function logDuplicateInfo(ctx) {
  const { values, uniqueValues, verbose, log } = ctx;
  if (values.length > uniqueValues.length && verbose) {
    log(`  ${values.length - uniqueValues.length} duplicate strings will use cache`);
  }
}

async function performTranslation(ctx) {
  const { uniqueValues, sourceLang, targetLang, provider, useDeepL, email, verbose, log } = ctx;
  log(`Translating ${uniqueValues.length} unique strings...`);

  const result = await executeTranslation({
    uniqueValues,
    sourceLang,
    targetLang,
    provider,
    useDeepL,
    email,
    verbose,
  });
  log();
  return result;
}

function handleEmptyTranslation(log) {
  log('No strings to translate.');
  return { success: true, translated: 0 };
}

function buildTranslationContext(ctx) {
  const { uniqueValues, sourceLang, targetLang, provider, useDeepL, email, verbose, log } = ctx;
  return { uniqueValues, sourceLang, targetLang, provider, useDeepL, email, verbose, log };
}

function buildOutputContext(ctx, translationMap) {
  const { keys, values, i18nDir, targetLang } = ctx;
  return { keys, values, translationMap, i18nDir, targetLang };
}

async function runTranslation(ctx) {
  logDuplicateInfo(ctx);
  const startTime = Date.now();
  const { translationMap, failedCount } = await performTranslation(buildTranslationContext(ctx));
  const { targetJson, targetFile } = buildTranslatedOutput(buildOutputContext(ctx, translationMap));
  await saveTranslationResult({
    targetJson,
    targetFile,
    startTime,
    dryRun: ctx.dryRun,
    log: ctx.log,
  });
  logTranslationSummary({
    valuesCount: ctx.values.length,
    failedCount,
    useDeepL: ctx.useDeepL,
    email: ctx.email,
    log: ctx.log,
  });
  return { success: true, translated: ctx.values.length - failedCount, failed: failedCount };
}

function parseTranslateOptions(options) {
  const {
    i18nDir,
    provider,
    useDeepL = false,
    email,
    verbose = false,
    dryRun = false,
    log = console.log,
  } = options;
  return { i18nDir, provider, useDeepL, email, verbose, dryRun, log };
}

/**
 * Translates a JSON language file using DeepL or MyMemory
 * @param {string} sourceLang - Source language code (e.g., 'en')
 * @param {string} targetLang - Target language code (e.g., 'fr')
 * @param {TranslateOptions} [options]
 * @returns {Promise<TranslateResult>}
 * @example
 * await translateFile('en', 'fr', { i18nDir: './src/i18n', provider: deepLProvider });
 */
async function translateFile(sourceLang, targetLang, options = {}) {
  const opts = parseTranslateOptions(options);
  logTranslateHeader({ sourceLang, targetLang, useDeepL: opts.useDeepL, log: opts.log });
  const data = await prepareTranslationData(sourceLang, opts.i18nDir);
  if (data.keys.length === 0) {
    return handleEmptyTranslation(opts.log);
  }
  return runTranslation({ ...data, sourceLang, targetLang, ...opts });
}

module.exports = {
  translateFile,
};
