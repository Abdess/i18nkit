'use strict';

const parserUtils = require('../core/parser-utils');

const TS_EXTRACTION_PATTERNS = [
  { regex: /\blabel\s*:\s*['"]([^'"]+)['"]/gi, context: 'ts_labels' },
  { regex: /\btitle\s*:\s*['"]([^'"]+)['"]/gi, context: 'ts_titles' },
  { regex: /\btext\s*:\s*['"]([^'"]+)['"]/gi, context: 'ts_text' },
  { regex: /\bmessage\s*:\s*['"]([^'"]+)['"]/gi, context: 'ts_messages' },
  { regex: /\bsummary\s*:\s*['"]([^'"]+)['"]/gi, context: 'ts_messages' },
  { regex: /\bdetail\s*:\s*['"]([^'"]+)['"]/gi, context: 'ts_messages' },
  { regex: /\bheader\s*:\s*['"]([^'"]+)['"]/gi, context: 'ts_titles' },
  { regex: /\bplaceholder\s*:\s*['"]([^'"]+)['"]/gi, context: 'ts_placeholders' },
  { regex: /\btooltip\s*:\s*['"]([^'"]+)['"]/gi, context: 'ts_tooltips' },
  { regex: /\bdescription\s*:\s*['"]([^'"]+)['"]/gi, context: 'ts_text' },
  { regex: /\bhint\s*:\s*['"]([^'"]+)['"]/gi, context: 'ts_text' },
  { regex: /\bcaption\s*:\s*['"]([^'"]+)['"]/gi, context: 'ts_text' },
  { regex: /\bcontent\s*:\s*['"]([^'"]+)['"]/gi, context: 'ts_text' },
  { regex: /\bconfirmationMessage\s*:\s*['"]([^'"]+)['"]/gi, context: 'ts_messages' },
  { regex: /\berrorMessage\s*:\s*['"]([^'"]+)['"]/gi, context: 'ts_messages' },
  { regex: /\bsuccessMessage\s*:\s*['"]([^'"]+)['"]/gi, context: 'ts_messages' },
];

function shouldIgnoreTs(text) {
  return parserUtils.shouldIgnore(text) || parserUtils.isTranslationKey(text);
}

module.exports = {
  name: 'parser-typescript',
  type: 'parser',

  meta: {
    description: 'Extract i18n strings from TypeScript object literals',
    version: '1.0.0',
  },

  extensions: ['.ts', '.component.ts'],
  priority: 30,

  options: [
    {
      flag: '--extract-ts',
      type: 'boolean',
      description: 'Extract from TypeScript files (disabled by default)',
    },
  ],

  examples: ['i18nkit --extract --extract-ts'],

  detect(ctx) {
    return ctx.pkg.dependencies?.typescript || ctx.files.includes('tsconfig.json');
  },

  TS_EXTRACTION_PATTERNS,

  extract(content, filePath, options = {}) {
    const { extractTsObjects = false } = options;
    if (!extractTsObjects) {
      return [];
    }
    const cleaned = parserUtils.cleanTranslocoCode(content);
    return parserUtils.extractWithPatterns(cleaned, TS_EXTRACTION_PATTERNS, {
      shouldIgnoreFn: shouldIgnoreTs,
    });
  },
};
