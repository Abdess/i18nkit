'use strict';

/**
 * @fileoverview Apply command - replaces source text with translation keys.
 * Applies findings from report.json to source files with backup support.
 * @module commands/apply
 */

const { getArgValue, applyTranslations } = require('../core');

function getApplyOptions(ctx) {
  const { srcDir, backupDir, adapter, backup, dryRun, verbose, interactive, log } = ctx;
  return { srcDir, backupDir, adapter, backup, dryRun, verbose, interactive, log };
}

function validateApplyFile(applyFile, exitCodes) {
  if (!applyFile) {
    console.error('Missing --apply <report.json> argument');
    return { exitCode: exitCodes.ERROR };
  }
  return null;
}

module.exports = {
  name: 'apply',
  category: 'apply',
  description: 'Apply translations from a report file to source files',

  options: [
    { flag: '--apply <report.json>', description: 'Path to the report file' },
    { flag: '--backup', description: 'Create backups before modifying (default: on)' },
    { flag: '--no-backup', description: 'Disable backup creation' },
    { flag: '--interactive', description: 'Ask for confirmation before changes' },
  ],

  examples: ['i18nkit --apply .i18n/report.json', 'i18nkit --apply report.json --no-backup'],

  async run(ctx) {
    const { args, config, exitCodes } = ctx;
    const applyFile = getArgValue(args, config, '--apply', null, null);
    const error = validateApplyFile(applyFile, exitCodes);
    if (error) {
      return error;
    }
    await applyTranslations(applyFile, getApplyOptions(ctx));
    return { exitCode: exitCodes.SUCCESS };
  },
};
