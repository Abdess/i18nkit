'use strict';

/**
 * @fileoverview Extract command - scans source files for translatable strings.
 * Supports Angular templates, TypeScript, and PrimeNG components.
 * @module commands/extract
 */

const fs = require('../core/fs-adapter');
const path = require('path');

const {
  readJsonFileSync,
  readJsonFile,
  writeJsonFile,
  flattenJson,
  unflattenJson,
  mergeDeep,
  collectFiles,
  applyFindings,
} = require('../core');
const { scanFiles, logVerboseFindings, logSummary, logHeader } = require('./extract-utils');

async function initSingleLang(lang, sourceJson, ctx) {
  const { i18nDir, format, log } = ctx;
  const langFile = path.join(i18nDir, `${lang}.json`);
  const existing = await readJsonFile(langFile);
  const base = existing && format === 'flat' ? unflattenJson(existing) : existing || {};
  const merged = mergeDeep(base, sourceJson);
  const output = format === 'flat' ? flattenJson(merged) : merged;
  await writeJsonFile(langFile, output);
  log(`  Created/Updated: ${lang}.json`);
}

async function initLanguageFiles(result, ctx) {
  const { initLangs, i18nDir, log } = ctx;
  if (initLangs.length === 0) {
    return;
  }
  log('\nInitializing language files...');
  await fs.mkdir(i18nDir, { recursive: true });
  await Promise.all(initLangs.map(lang => initSingleLang(lang, result, ctx)));
}

function logFindingsSummary(findings, ctx) {
  const { verbose, log } = ctx;
  if (verbose || findings.length === 0) {
    return;
  }
  const unique = [...new Map(findings.map(f => [f.key, f])).values()];
  if (unique.length <= 15) {
    log('\nStrings extracted:');
    unique.forEach(i => log(`  ${i.key}: "${i.displayText}"`));
  } else {
    log(`\nUse --verbose to see all ${unique.length} strings`);
  }
}

async function writeReport(findings, stats, ctx) {
  const { reportDir } = ctx;
  await writeJsonFile(path.join(reportDir, 'report.json'), { stats, findings });
  ctx.log(`Report: ${path.join(reportDir, 'report.json')}`);
}

function formatResult(result, format) {
  return format === 'flat' ? flattenJson(result) : result;
}

function logDryRunOutput(result, format, log) {
  log('\n[DRY RUN] Generated JSON:');
  log(JSON.stringify(formatResult(result, format), null, 2));
}

async function writeMainOutput(ctx) {
  const { outputFile, format, result, log } = ctx;
  await writeJsonFile(outputFile, formatResult(result, format));
  log(`\nExtracted: ${outputFile}`);
}

function shouldWriteReport(ctx) {
  return (ctx.jsonOutput || ctx.autoApply) && !ctx.dryRun;
}

async function writeOutputs(findings, stats, ctx) {
  if (ctx.dryRun && !ctx.autoApply) {
    logDryRunOutput(ctx.result, ctx.format, ctx.log);
    return;
  }
  if (!ctx.dryRun) {
    await writeMainOutput(ctx);
  }
  if (shouldWriteReport(ctx)) {
    await writeReport(findings, stats, ctx);
  }
  logFindingsSummary(findings, ctx);
}

async function loadMergeResult(ctx) {
  const { outputFile, format, merge, log } = ctx;
  if (!merge) {
    return {};
  }
  const existing = await readJsonFile(outputFile);
  if (!existing) {
    return {};
  }
  log(`Merging with existing: ${path.basename(outputFile)}\n`);
  return format === 'flat' ? unflattenJson(existing) : existing;
}

function getAutoApplyOpts(ctx) {
  const { srcDir, backupDir, adapter, backup, dryRun, verbose, interactive, log } = ctx;
  return { srcDir, backupDir, adapter, backup, dryRun, verbose, interactive, log };
}

async function runAutoApply(findings, ctx) {
  ctx.log(`\n${'='.repeat(50)}`);
  await applyFindings(findings, getAutoApplyOpts(ctx));
}

async function handleResults(findings, stats, ctx) {
  await writeOutputs(findings, stats, ctx);
  if (!ctx.dryRun) {
    await initLanguageFiles(ctx.result, ctx);
  }
  if (ctx.autoApply) {
    await runAutoApply(findings, ctx);
  }
}

function buildRunContext(ctx, data) {
  return { ...ctx, ...data, processedTemplates: new Set() };
}

function loadKeyMapping(keyMappingFile) {
  return fs.existsSync(keyMappingFile) ? readJsonFileSync(keyMappingFile) || {} : {};
}

function initStats() {
  return { files: 0, clean: 0, needsWork: 0, total: 0, added: 0, byContext: {} };
}

function logVerboseIfNeeded(findings, ctx) {
  if (ctx.verbose && findings.length > 0) {
    logVerboseFindings(findings, ctx);
  }
}

async function scanAndPrepare(ctx) {
  const keyMapping = loadKeyMapping(ctx.keyMappingFile);
  const result = await loadMergeResult(ctx);
  const stats = initStats();
  const files = await collectFiles(ctx.srcDir, ctx.excludedFolders);
  const runCtx = buildRunContext(ctx, { result, stats, keyMapping });
  return { result, stats, findings: scanFiles(files, runCtx) };
}

async function processResults(data, ctx) {
  logVerboseIfNeeded(data.findings, ctx);
  logSummary(data.stats, ctx);
  if (data.stats.total > 0) {
    await handleResults(data.findings, data.stats, { ...ctx, result: data.result });
  }
}

function buildExtractResult(data, strict) {
  const { result, findings, stats } = data;
  if (stats.total === 0) {
    return { result, findings, stats, exitCode: 0, message: 'No untranslated strings found.' };
  }
  return { result, findings, stats, exitCode: strict ? 1 : 0 };
}

module.exports = {
  name: 'extract',
  category: 'extraction',
  description: 'Extract i18n strings from source files',

  options: [
    { flag: '--src <path>', description: 'Source directory (default: src/app)' },
    { flag: '--output <path>', description: 'Output JSON file' },
    { flag: '--lang <code>', description: 'Language code for output file' },
    { flag: '--merge', description: 'Merge with existing JSON file' },
    { flag: '--include-translated', description: 'Include all strings' },
    { flag: '--extract-ts-objects', description: 'Extract from TypeScript objects' },
    { flag: '--format <type>', description: 'Output format: nested or flat' },
    { flag: '--auto-apply', description: 'Extract AND apply in one command' },
  ],

  examples: ['i18nkit --dry-run', 'i18nkit --lang fr --merge', 'i18nkit --auto-apply --backup'],

  async run(ctx) {
    logHeader(ctx);
    const data = await scanAndPrepare(ctx);
    await processResults(data, ctx);
    return buildExtractResult(data, ctx.strict);
  },
};
