'use strict';

/**
 * @fileoverview Path resolution for i18n directories and output files.
 * Merges CLI arguments with config file settings.
 * @module paths
 */

const path = require('path');
const { getArgValue } = require('./config');
const { DEFAULT_EXCLUDED_FOLDERS } = require('./file-walker');

function resolveI18nDir(args, config, cwd) {
  return getArgValue(args, config, {
    flag: '--i18n-dir',
    configKey: 'i18nDir',
    defaultValue: path.join(cwd, 'src', 'assets', 'i18n'),
  });
}

function resolveSrcDir(args, config, cwd) {
  return getArgValue(args, config, {
    flag: '--src',
    configKey: 'src',
    defaultValue: path.join(cwd, 'src', 'app'),
  });
}

function resolveOutputFile(ctx) {
  const { args, config, i18nDir, lang } = ctx;
  return getArgValue(args, config, {
    flag: '--output',
    configKey: 'output',
    defaultValue: path.join(i18nDir, lang ? `${lang}.json` : 'extracted.json'),
  });
}

/**
 * Resolves all paths needed for extraction and translation
 * @param {Object} ctx
 * @returns {Object}
 */
function resolvePaths(ctx) {
  const { args, config, cwd, lang = null } = ctx;
  const i18nDir = resolveI18nDir(args, config, cwd);
  const reportDir = path.join(cwd, '.i18n');
  return {
    srcDir: resolveSrcDir(args, config, cwd),
    i18nDir,
    reportDir,
    backupDir: path.join(reportDir, 'backup'),
    outputFile: resolveOutputFile({ args, config, i18nDir, lang }),
    keyMappingFile: path.join(cwd, '.i18n-keys.json'),
    excludedFolders: config.excludedFolders || DEFAULT_EXCLUDED_FOLDERS,
  };
}

module.exports = {
  resolvePaths,
};
