'use strict';

const fs = require('./fs-adapter');
const readline = require('readline');
const { createBackup, getBackupFiles } = require('./backup');

const isValidFinding = f => f.file && f.text && f.key && !f.context?.startsWith('ts_');

function addFindingToMap(map, finding) {
  if (!map.has(finding.file)) {
    map.set(finding.file, []);
  }
  map.get(finding.file).push(finding);
}

function groupFindingsByFile(findings) {
  const findingsByFile = new Map();
  findings.filter(isValidFinding).forEach(f => addFindingToMap(findingsByFile, f));
  return findingsByFile;
}

function promptUser(question, interactive) {
  if (!interactive) {
    return Promise.resolve(true);
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const { promise, resolve } = Promise.withResolvers();
  rl.question(`${question} (y/N) `, answer => {
    rl.close();
    resolve(['y', 'yes'].includes(answer.toLowerCase()));
  });
  return promise;
}

async function confirmFileModifications(findingsByFile, interactive, log) {
  if (!interactive || findingsByFile.size === 0) {
    return true;
  }
  log(`\nAbout to modify ${findingsByFile.size} file(s):`);
  for (const [file, fileFindings] of findingsByFile) {
    log(`  ${file} (${fileFindings.length} replacement(s))`);
  }
  const proceed = await promptUser('\nProceed with modifications?', interactive);
  if (!proceed) {
    log('Aborted by user.');
  }
  return proceed;
}

function loadFileForReplacement(filePath, relativeFile, verbose) {
  if (!fs.existsSync(filePath)) {
    if (verbose) {
      console.warn(`Skipped (not found): ${relativeFile}`);
    }
    return null;
  }
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    if (verbose) {
      console.warn(`Skipped (read error): ${relativeFile}`);
    }
    return null;
  }
}

function applyReplacementsToContent(content, fileFindings, adapter) {
  let result = content;
  let count = 0;
  for (const finding of fileFindings) {
    const transformed = adapter.transform(
      result,
      finding.rawText || finding.text,
      finding.key,
      finding.context,
    );
    result = transformed.content;
    count += transformed.replacements;
  }
  return { content: result, count };
}

function tryUpdateTsImports(tsFile, opts) {
  const { backupDir, adapter, backup = true, dryRun = false } = opts;
  createBackup(tsFile, backupDir, { enabled: backup, dryRun });
  const tsContent = fs.readFileSync(tsFile, 'utf-8');
  const updatedTs = adapter.updateImports(tsContent);
  if (updatedTs === tsContent) {
    return false;
  }
  if (!dryRun) {
    fs.writeFileSync(tsFile, updatedTs, 'utf-8');
  }
  return true;
}

function logBackupInfo(opts, log) {
  const backupFiles = getBackupFiles();
  if (opts.backup && !opts.dryRun && backupFiles.size > 0) {
    log(`Backups created:   ${backupFiles.size} (in ${opts.backupDir})`);
  }
}

function logModifiedFiles(modifiedFiles, dryRun, log) {
  if (!dryRun && modifiedFiles.length > 0) {
    log('\nModified files:');
    modifiedFiles.forEach(({ file, count }) => log(`  ${file} (${count})`));
  }
}

function logApplyResults(results, opts) {
  const { log = console.log } = opts;
  log(`\nFiles modified:    ${results.totalFiles}`);
  log(`Replacements:      ${results.totalReplacements}`);
  logBackupInfo(opts, log);
  logModifiedFiles(results.modifiedFiles, opts.dryRun, log);
}

function loadAndValidateReport(reportPath) {
  if (!fs.existsSync(reportPath)) {
    throw new Error(
      `Report file not found: ${reportPath}\nRun with --json first to generate a report file.`,
    );
  }
  try {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
    if (!Array.isArray(report.findings)) {
      throw new Error('missing findings array');
    }
    return report;
  } catch (err) {
    throw new Error(`Cannot parse report: ${err.message}`);
  }
}

module.exports = {
  groupFindingsByFile,
  confirmFileModifications,
  loadFileForReplacement,
  applyReplacementsToContent,
  tryUpdateTsImports,
  logApplyResults,
  loadAndValidateReport,
};
