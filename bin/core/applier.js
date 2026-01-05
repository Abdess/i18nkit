'use strict';

/**
 * @fileoverview Translation replacement engine.
 * Applies extracted i18n keys to source files with backup and rollback support.
 * @module applier
 */

const fs = require('./fs-adapter');
const path = require('path');
const { withBackup } = require('./backup');
const {
  groupFindingsByFile,
  confirmFileModifications,
  loadFileForReplacement,
  applyReplacementsToContent,
  tryUpdateTsImports,
  logApplyResults,
  loadAndValidateReport,
} = require('./applier-utils');

function getCompanionTsFile(htmlFilePath) {
  return htmlFilePath.replace(/\.html$/, '.ts');
}

function logTsUpdate(updated, tsFile, opts) {
  if (updated && opts.verbose) {
    console.log(`  + TranslocoPipe added to ${path.relative(opts.srcDir, tsFile)}`);
  }
}

function updateCompanionTsFile(htmlFilePath, opts) {
  const tsFile = getCompanionTsFile(htmlFilePath);
  if (!fs.existsSync(tsFile)) {
    return;
  }
  try {
    logTsUpdate(tryUpdateTsImports(tsFile, opts), tsFile, opts);
  } catch {
    if (opts.verbose) {
      console.warn(`  Warning: Could not update ${tsFile}`);
    }
  }
}

function applyTsPostProcessing(content, opts) {
  return opts.adapter.updateImports(content);
}

function applyPostProcessing(ctx) {
  const { relativeFile, content, count, filePath, opts } = ctx;
  if (count > 0 && /\.ts$/.test(relativeFile)) {
    return applyTsPostProcessing(content, opts);
  }
  if (count > 0 && /\.html$/.test(relativeFile)) {
    updateCompanionTsFile(filePath, opts);
  }
  return content;
}

function buildFileResult(ctx) {
  const { filePath, content, originalContent, count } = ctx;
  return {
    filePath,
    content,
    originalContent,
    fileReplacements: count,
    hasChanges: content !== originalContent,
  };
}

function processFileReplacements(relativeFile, fileFindings, opts) {
  const { srcDir, verbose = false, adapter } = opts;
  const filePath = path.join(srcDir, relativeFile);
  const originalContent = loadFileForReplacement(filePath, relativeFile, verbose);
  if (!originalContent) {
    return null;
  }
  const { content: replaced, count } = applyReplacementsToContent(
    originalContent,
    fileFindings,
    adapter,
  );
  const content = applyPostProcessing({ relativeFile, content: replaced, count, filePath, opts });
  return buildFileResult({ filePath, content, originalContent, count });
}

function writeFileChanges(ctx) {
  const { relativeFile, result, modifiedFiles, dryRun, verbose, log } = ctx;
  if (!result.hasChanges) {
    return { files: 0, replacements: 0 };
  }
  if (dryRun) {
    log(`[DRY RUN] ${relativeFile}: ${result.fileReplacements} replacement(s)`);
  } else {
    fs.writeFileSync(result.filePath, result.content, 'utf-8');
    modifiedFiles.push({ file: relativeFile, count: result.fileReplacements });
    if (verbose) {
      log(`Modified: ${relativeFile} (${result.fileReplacements} replacement(s))`);
    }
  }
  return { files: 1, replacements: result.fileReplacements };
}

function processSingleFile(ctx) {
  const { relativeFile, fileFindings, modifiedFiles, opts } = ctx;
  const result = processFileReplacements(relativeFile, fileFindings, opts);
  if (!result) {
    return { files: 0, replacements: 0 };
  }
  const { dryRun = false, verbose = false, log = console.log } = opts;
  return writeFileChanges({ relativeFile, result, modifiedFiles, dryRun, verbose, log });
}

function processAllFiles(findingsByFile, opts) {
  const modifiedFiles = [];
  let totalFiles = 0;
  let totalReplacements = 0;
  for (const [relativeFile, fileFindings] of findingsByFile) {
    const counts = processSingleFile({ relativeFile, fileFindings, modifiedFiles, opts });
    totalFiles += counts.files;
    totalReplacements += counts.replacements;
  }
  return { totalFiles, totalReplacements, modifiedFiles };
}

function getFilesToBackup(findingsByFile, opts) {
  const { srcDir } = opts;
  const files = [];
  for (const [relativeFile] of findingsByFile) {
    const filePath = path.join(srcDir, relativeFile);
    if (fs.existsSync(filePath)) {
      files.push(filePath);
    }
  }
  return files;
}

function backupFilesForSession(filesToBackup, sessionHelpers) {
  for (const filePath of filesToBackup) {
    if (sessionHelpers?.backupFile) {
      sessionHelpers.backupFile(filePath);
    }
  }
}

function saveReportIfNeeded(sessionHelpers, reportPath) {
  if (reportPath && sessionHelpers?.saveReport) {
    sessionHelpers.saveReport(reportPath);
  }
}

function transitionSessionState(sessionHelpers) {
  if (sessionHelpers?.markReady) {
    sessionHelpers.markReady();
  }
  if (sessionHelpers?.beginModifications) {
    sessionHelpers.beginModifications();
  }
}

function prepareSession(sessionHelpers, reportPath) {
  saveReportIfNeeded(sessionHelpers, reportPath);
  transitionSessionState(sessionHelpers);
}

function createApplyExecutor(ctx) {
  const { filesToBackup, reportPath, findingsByFile, opts } = ctx;
  return sessionHelpers => {
    backupFilesForSession(filesToBackup, sessionHelpers);
    prepareSession(sessionHelpers, reportPath);
    const results = processAllFiles(findingsByFile, opts);
    logApplyResults(results, opts);
    return { success: true, ...results };
  };
}

function logApplyHeader(log) {
  log('Auto-Apply Translations');
  log('-'.repeat(50));
}

function buildApplyContext(findingsByFile, opts) {
  const cwd = process.cwd();
  const { reportDir } = opts;
  const filesToBackup = getFilesToBackup(findingsByFile, opts);
  const reportPath = reportDir ? path.join(reportDir, 'report.json') : null;
  return { cwd, filesToBackup, reportPath, findingsByFile, opts };
}

async function confirmAndPrepare(findings, opts) {
  const { log = console.log, interactive = false } = opts;
  logApplyHeader(log);
  const findingsByFile = groupFindingsByFile(findings);
  const shouldProceed = await confirmFileModifications(findingsByFile, interactive, log);
  return shouldProceed ? findingsByFile : null;
}

function executeApplyWithBackup(findingsByFile, opts) {
  const { log = console.log, backup = true, dryRun = false } = opts;
  const ctx = buildApplyContext(findingsByFile, opts);
  const executeApply = createApplyExecutor(ctx);
  return withBackup({
    cwd: ctx.cwd,
    command: 'apply',
    operation: executeApply,
    options: { log, backup, dryRun },
  });
}

/**
 * Applies translation replacements from findings array
 * @param {Finding[]} findings
 * @param {ApplyOptions} [opts]
 * @returns {Promise<ApplyResult>}
 */
async function applyFindings(findings, opts = {}) {
  const findingsByFile = await confirmAndPrepare(findings, opts);
  return findingsByFile ?
      executeApplyWithBackup(findingsByFile, opts)
    : { success: false, aborted: true };
}

/**
 * Applies translations from a JSON report file
 * @param {string} reportPath - Path to extracted-keys.json
 * @param {ApplyOptions} [opts]
 * @returns {Promise<ApplyResult>}
 * @example
 * await applyTranslations('./extracted-keys.json', { srcDir: './src', adapter });
 */
function applyTranslations(reportPath, opts = {}) {
  const { log = console.log } = opts;
  log('Apply Translations');
  log('='.repeat(50));
  log(`Report: ${reportPath}\n`);
  const report = loadAndValidateReport(reportPath);
  return applyFindings(report.findings, opts);
}

module.exports = { applyFindings, applyTranslations };
