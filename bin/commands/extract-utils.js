'use strict';

/**
 * @fileoverview Extract command utilities.
 * File scanning, progress tracking, and output formatting.
 * @module commands/extract-utils
 */

const path = require('path');
const { getFileContent, setNestedValue, slugify, pathToScope } = require('../core');

const noop = () => undefined;

function createIntervalCallback(state) {
  return () => {
    state.dots = (state.dots + 1) % 4;
    const dots = '.'.repeat(state.dots);
    const spaces = ' '.repeat(3 - state.dots);
    process.stdout.write(`\rScanning${dots}${spaces} ${state.scanned}/${state.total} files`);
  };
}

function createProgressTracker(ctx) {
  const { verbose, jsonOutput, totalFiles } = ctx;
  const skipProgress = verbose || jsonOutput || !process.stdout.isTTY || totalFiles <= 50;
  if (skipProgress) {
    return { start: noop, stop: noop, increment: noop };
  }

  const state = { dots: 0, scanned: 0, total: totalFiles, interval: null };

  return {
    start: () => {
      process.stdout.write('Scanning');
      state.interval = setInterval(createIntervalCallback(state), 200);
    },
    stop: () => {
      if (state.interval) {
        clearInterval(state.interval);
        process.stdout.write(`\r${' '.repeat(50)}\r`);
      }
    },
    increment: () => {
      state.scanned++;
    },
  };
}

function updateStats(stats, context, isNew) {
  stats.total++;
  if (isNew) {
    stats.added++;
  }
  stats.byContext[context] = (stats.byContext[context] ?? 0) + 1;
}

function buildFinding(extraction, ctx) {
  const { text, rawText, context, attr } = extraction;
  const { relativePath, result, keyMapping, scope, stats } = ctx;

  const keyPath = keyMapping[text]?.split('.') ?? [...scope, context, slugify(text)];
  const { path: finalPath, isNew } = setNestedValue(result, keyPath, text);
  const fullKey = finalPath.join('.');
  const displayText = text.length > 80 ? `${text.substring(0, 77)}...` : text;

  updateStats(stats, context, isNew);

  return {
    file: relativePath,
    text,
    rawText: rawText ?? text,
    displayText,
    context,
    key: fullKey,
    attr,
    isNew,
  };
}

function extractSingleSource(parser, source, extractCtx) {
  const { options, seen, results } = extractCtx;
  for (const r of parser.extract(source, '', options)) {
    const key = `${r.context}:${r.text}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push(r);
    }
  }
}

function extractFromContent(fileData, ctx) {
  const { parsers, skipTranslated, extractTsObjects } = ctx;
  const results = [];
  const seen = new Set();
  const sources = [fileData.template, fileData.typescript].filter(Boolean);
  const extractCtx = { options: { skipTranslated, extractTsObjects }, seen, results };

  for (const parser of parsers) {
    for (const source of sources) {
      extractSingleSource(parser, source, extractCtx);
    }
  }
  return results;
}

function handleEmptyExtractions(stats) {
  stats.clean++;
  return [];
}

function mapExtractionsToFindings(extractions, filePath, ctx) {
  const { srcDir, result, stats, keyMapping } = ctx;
  stats.needsWork++;
  const scope = pathToScope(filePath, srcDir);
  const relativePath = path.relative(srcDir, filePath);
  const findingCtx = { relativePath, result, keyMapping, scope, stats };
  return extractions.map(e => buildFinding(e, findingCtx));
}

function processFile(filePath, ctx) {
  const { processedTemplates, verbose, stats } = ctx;
  const fileData = getFileContent(filePath, processedTemplates, verbose);
  if (!fileData) {
    return [];
  }

  stats.files++;
  const extractions = extractFromContent(fileData, ctx);
  if (extractions.length === 0) {
    return handleEmptyExtractions(stats);
  }

  return mapExtractionsToFindings(extractions, filePath, ctx);
}

function scanFiles(files, ctx) {
  const progress = createProgressTracker({ ...ctx, totalFiles: files.length });
  progress.start();
  const findings = files.flatMap(filePath => {
    progress.increment();
    return processFile(filePath, ctx);
  });
  progress.stop();
  return findings;
}

function getFindingMarker(merge, isNew) {
  if (!merge) {
    return '-';
  }
  return isNew ? '+' : '=';
}

function formatFindingLines(finding, merge) {
  return [
    `  [${finding.context}] ${finding.key}`,
    `    ${getFindingMarker(merge, finding.isNew)} "${finding.displayText}"`,
  ];
}

function logFileGroup(file, fileFindings, ctx) {
  ctx.log(`\n${file}`);
  fileFindings.forEach(f => formatFindingLines(f, ctx.merge).forEach(l => ctx.log(l)));
}

function logVerboseFindings(findings, ctx) {
  const findingsByFile = Object.groupBy(findings, f => f.file);
  Object.entries(findingsByFile).forEach(([file, ff]) => logFileGroup(file, ff, ctx));
}

function logContextBreakdown(contexts, log) {
  if (contexts.length === 0) {
    return;
  }
  log('\nBy context:');
  contexts.toSorted((a, b) => b[1] - a[1]).forEach(([k, v]) => log(`  ${k}: ${v}`));
}

function logSummary(stats, ctx) {
  const { merge, log } = ctx;
  log('\nSummary');
  log('-'.repeat(50));
  log(`Files scanned:     ${stats.files}`);
  log(`Translated:        ${stats.clean}`);
  log(`Need translation:  ${stats.needsWork}`);
  log(`Strings found:     ${stats.total}`);
  if (merge) {
    log(`New strings:       ${stats.added}`);
  }
  logContextBreakdown(Object.entries(stats.byContext), log);
}

function getExtractMode(skipTranslated) {
  return skipTranslated ? 'Extract Untranslated' : 'Extract All';
}

function logHeader(ctx) {
  const { srcDir, outputFile, backupDir, skipTranslated, dryRun, backup, log } = ctx;
  log(`Transloco ${getExtractMode(skipTranslated)}`);
  log('='.repeat(50));
  log(`Source: ${srcDir}`);
  if (!dryRun) {
    log(`Output: ${outputFile}`);
  }
  if (backup) {
    log(`Backup: ${backupDir}`);
  }
  log();
}

module.exports = {
  scanFiles,
  logVerboseFindings,
  logSummary,
  logHeader,
};
