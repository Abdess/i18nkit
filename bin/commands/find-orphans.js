'use strict';

/**
 * @fileoverview Find-orphans command - detects unused translation keys.
 * Scans source files to identify keys not referenced in code.
 * @module commands/find-orphans
 */

const { findOrphans } = require('../core');

module.exports = {
  name: 'find-orphans',
  category: 'validation',
  description: 'Find translation keys not used in source code',

  options: [{ flag: '--strict', description: 'Exit with error if orphans found' }],

  examples: ['i18nkit --find-orphans', 'i18nkit --find-orphans --strict'],

  async run(ctx) {
    const { srcDir, i18nDir, format, excludedFolders, verbose, strict, log, exitCodes } = ctx;

    const result = await findOrphans({
      srcDir,
      i18nDir,
      format,
      excludedFolders,
      verbose,
      strict,
      log,
      exitCodes: { success: exitCodes.SUCCESS, untranslated: exitCodes.UNTRANSLATED },
    });

    return { exitCode: result.exitCode ?? exitCodes.SUCCESS };
  },
};
