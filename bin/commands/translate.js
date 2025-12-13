'use strict';

/**
 * @fileoverview Translate command - automated translation via external APIs.
 * Supports MyMemory (free) and DeepL (API key required).
 * @module commands/translate
 */

const { translateFile } = require('../core');

function parseTranslatePair(translatePair) {
  return (translatePair || '').split(':');
}

function validateTranslatePair(source, target, exitCodes) {
  if (!source || !target) {
    console.error('Invalid --translate format. Use: --translate fr:en');
    return { exitCode: exitCodes.ERROR };
  }
  return null;
}

function getTranslateOptions(ctx) {
  const { i18nDir, provider, useDeepL, translateEmail, verbose, dryRun, log } = ctx;
  return { i18nDir, provider, useDeepL, email: translateEmail, verbose, dryRun, log };
}

module.exports = {
  name: 'translate',
  category: 'translation',
  description: 'Translate a language file to another language',

  options: [
    { flag: '--translate <src:tgt>', description: 'Source and target languages (e.g., fr:en)' },
    { flag: '--deepl', description: 'Use DeepL API instead of MyMemory' },
    { flag: '--email <email>', description: 'Email for MyMemory rate limits' },
  ],

  examples: ['i18nkit --translate fr:en', 'i18nkit --translate fr:en --deepl'],

  async run(ctx) {
    const { translatePair, exitCodes } = ctx;
    const [source, target] = parseTranslatePair(translatePair);
    const error = validateTranslatePair(source, target, exitCodes);
    if (error) {
      return error;
    }
    await translateFile(source, target, getTranslateOptions(ctx));
    return { exitCode: exitCodes.SUCCESS };
  },
};
