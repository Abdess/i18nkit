'use strict';

/**
 * @fileoverview Translation key generation from source text.
 * Slugifies text and derives scope from file paths.
 * @module key-generator
 */

const path = require('path');
const { decodeHtmlEntities } = require('./parser-utils');

const MAX_KEY_LENGTH = 50;

/**
 * Converts text to a translation key (lowercase, underscored, max 50 chars)
 * @param {string} text
 * @returns {string}
 * @example
 * slugify("Hello World!") // "hello_world"
 */
function slugify(text) {
  return (
    decodeHtmlEntities(text)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/['']/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(w => w.length > 1)
      .slice(0, 6)
      .join('_')
      .substring(0, MAX_KEY_LENGTH) || 'text'
  );
}

/**
 * Derives scope array from file path (e.g., "users/profile.component.ts" → ["users", "profile"])
 * @param {string} filePath
 * @param {string} baseDir
 * @returns {string[]}
 */
function pathToScope(filePath, baseDir) {
  const relative = path.relative(baseDir, filePath);
  const parts = relative.split(path.sep);
  const fileName = parts
    .pop()
    .replace(/\.(component|html|ts)$/g, '')
    .replace(/\.component$/, '');

  const ignoredFolders = [
    'components',
    'pages',
    'shared',
    'common',
    'features',
    'dialogs',
    'forms',
    'ui',
    'lib',
  ];
  const significantParts = parts.filter(p => !ignoredFolders.includes(p));

  const scope = significantParts
    .concat(fileName !== 'app' && fileName !== parts.at(-1) ? [fileName] : [])
    .filter(Boolean);

  return scope.length > 0 ? scope : ['app'];
}

module.exports = {
  slugify,
  pathToScope,
};
