'use strict';

const parserUtils = require('../core/parser-utils');

const PRIMENG_PATTERNS = [
  { regex: /<p-(?:button|splitButton)[^>]*\blabel="([^"]+)"/gi, context: 'buttons', attr: 'label' },
  {
    regex: /<p-(?:card|dialog|panel|fieldset)[^>]*\bheader="([^"]+)"/gi,
    context: 'titles',
    attr: 'header',
  },
  {
    regex: /<p-(?:tabPanel|accordionTab|steps?)[^>]*\bheader="([^"]+)"/gi,
    context: 'titles',
    attr: 'header',
  },
  { regex: /<p-column[^>]*\bheader="([^"]+)"/gi, context: 'columns', attr: 'header' },
  { regex: /<p-table[^>]*\bemptyMessage="([^"]+)"/gi, context: 'messages', attr: 'emptyMessage' },
  {
    regex: /<p-confirm[^>]*\b(?:message|header)="([^"]+)"/gi,
    context: 'messages',
    attr: 'message',
  },
  {
    regex: /<p-confirm[^>]*\b(?:acceptLabel|rejectLabel)="([^"]+)"/gi,
    context: 'buttons',
    attr: 'acceptLabel',
  },
  {
    regex:
      /<p-(?:dropdown|multiSelect|listbox)[^>]*\b(?:placeholder|emptyMessage|emptyFilterMessage|defaultLabel|selectedItemsLabel)="([^"]+)"/gi,
    context: 'placeholders',
    attr: 'placeholder',
  },
  {
    regex: /<p-fileUpload[^>]*\b(?:chooseLabel|uploadLabel|cancelLabel)="([^"]+)"/gi,
    context: 'buttons',
    attr: 'chooseLabel',
  },
  { regex: /<p-(?:chip|tag)[^>]*\b(?:label|value)="([^"]+)"/gi, context: 'labels', attr: 'value' },
  {
    regex: /<p-(?:inputNumber|calendar)[^>]*\b(?:prefix|suffix)="([^"]+)"/gi,
    context: 'labels',
    attr: 'prefix',
  },
  {
    regex: /<p-message[^>]*\b(?:text|summary|detail)="([^"]+)"/gi,
    context: 'messages',
    attr: 'text',
  },
  { regex: /<p-toast[^>]*\bsummary="([^"]+)"/gi, context: 'messages', attr: 'summary' },
];

module.exports = {
  name: 'parser-primeng',
  type: 'parser',

  meta: {
    description: 'Extract i18n strings from PrimeNG component attributes',
    version: '1.0.0',
  },

  extensions: ['.html', '.component.html'],
  priority: 20,

  examples: ['i18nkit --extract (auto-activated with PrimeNG)'],

  detect(ctx) {
    return ctx.pkg.dependencies?.primeng;
  },

  PRIMENG_PATTERNS,

  extract(content, filePath, options = {}) {
    const { skipTranslated = true } = options;
    const cleaned = parserUtils.cleanTranslocoExpressions(content, skipTranslated);
    return parserUtils.extractWithPatterns(cleaned, PRIMENG_PATTERNS);
  },
};
