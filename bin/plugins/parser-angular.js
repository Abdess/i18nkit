'use strict';

const parserUtils = require('../core/parser-utils');

const EXTRACTION_PATTERNS = [
  { regex: /<(h[1-6])(?:\s[^>]*)?>([^<]+)<\/\1>/gi, context: 'titles', group: 2, attr: null },
  {
    regex: /<(p|span|div|li|td|th)(?:\s[^>]*)?>([^<]+)<\/\1>/gi,
    context: 'text',
    group: 2,
    attr: null,
  },
  { regex: /<(a)(?:\s[^>]*)?>([^<]+)<\/\1>/gi, context: 'links', group: 2, attr: null },
  { regex: /<(button)(?:\s[^>]*)?>([^<]+)<\/\1>/gi, context: 'buttons', group: 2, attr: null },
  { regex: /<(label)(?:\s[^>]*)?>([^<]+)<\/\1>/gi, context: 'labels', group: 2, attr: null },
  { regex: /<(option)(?:\s[^>]*)?>([^<]+)<\/\1>/gi, context: 'options', group: 2, attr: null },
  { regex: /\bplaceholder="([^"]+)"/gi, context: 'placeholders', attr: 'placeholder' },
  { regex: /\b(?:pTooltip|tooltip)="([^"]+)"/gi, context: 'tooltips', attr: 'pTooltip' },
  { regex: /\baria-label="([^"]+)"/gi, context: 'aria', attr: 'aria-label' },
  { regex: /\btitle="([^"]+)"/gi, context: 'titles', attr: 'title' },
];

module.exports = {
  name: 'parser-angular',
  type: 'parser',

  meta: {
    description: 'Extract i18n strings from Angular HTML templates',
    version: '1.0.0',
  },

  extensions: ['.html', '.component.html'],
  priority: 10,

  options: [
    {
      flag: '--skip-translated',
      type: 'boolean',
      description: 'Skip already translated strings (default: true)',
    },
  ],

  examples: ['i18nkit --extract --src src/app'],

  detect(ctx) {
    return ctx.pkg.dependencies?.['@angular/core'] || ctx.files.includes('angular.json');
  },

  EXTRACTION_PATTERNS,

  extract(content, filePath, options = {}) {
    const { skipTranslated = true } = options;
    const cleaned = parserUtils.cleanTranslocoExpressions(content, skipTranslated);
    return parserUtils.extractWithPatterns(cleaned, EXTRACTION_PATTERNS);
  },
};
