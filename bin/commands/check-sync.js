'use strict';

/**
 * @fileoverview Check-sync command - validates i18n file consistency.
 * Detects missing keys, identical values, and ICU format mismatches.
 * @module commands/check-sync
 */

const { checkSync } = require('../core');

module.exports = {
  name: 'check-sync',
  category: 'validation',
  description: 'Compare language files for missing or identical keys',

  options: [
    { flag: '--strict', description: 'Exit with error if missing or untranslated keys found' },
  ],

  examples: ['i18nkit --check-sync', 'i18nkit --check-sync --strict'],

  async run(ctx) {
    const { i18nDir, format, strict, log, exitCodes } = ctx;

    const result = await checkSync({
      i18nDir,
      format,
      strict,
      log,
      exitCodes: { success: exitCodes.SUCCESS, untranslated: exitCodes.UNTRANSLATED },
    });

    return { exitCode: result.exitCode ?? exitCodes.SUCCESS };
  },
};
