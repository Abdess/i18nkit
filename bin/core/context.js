'use strict';

const { loadConfig } = require('./config');
const { parseArgs, detectCommand } = require('./args');
const { resolvePaths } = require('./paths');
const { loadPlugins } = require('./plugin-resolver');

/**
 * @typedef {Object} Context
 * @property {string[]} args
 * @property {Object} config
 * @property {string} cwd
 * @property {Object} exitCodes
 * @property {boolean} verbose
 * @property {boolean} jsonOutput
 * @property {boolean} strict
 * @property {boolean} dryRun
 * @property {boolean} ciMode
 * @property {boolean} useDeepL
 * @property {string} srcDir
 * @property {string} i18nDir
 * @property {string} reportDir
 * @property {string} backupDir
 * @property {string|null} lang
 * @property {string} format
 * @property {string} outputFile
 * @property {string} keyMappingFile
 * @property {string[]} excludedFolders
 * @property {boolean} merge
 * @property {boolean} skipTranslated
 * @property {boolean} extractTsObjects
 * @property {boolean} autoApply
 * @property {string[]} initLangs
 * @property {boolean} backup
 * @property {boolean} interactive
 * @property {string|null} translatePair
 * @property {string|null} translateEmail
 * @property {Array} parsers
 * @property {Object} adapter
 * @property {Object} provider
 * @property {function} log
 */

const EXIT_CODES = Object.freeze({
  SUCCESS: 0,
  UNTRANSLATED: 1,
  ERROR: 2,
});

/**
 * Create execution context from command line args
 * @param {string[]} [args]
 * @param {string} [cwd]
 * @returns {Context}
 */
function buildPluginConfig(config, flags) {
  const provider =
    flags.useDeepL ? '@i18nkit/provider-deepl' : config.provider || '@i18nkit/provider-mymemory';
  return { ...config, provider };
}

function createContext(args = process.argv.slice(2), cwd = process.cwd()) {
  const config = loadConfig(cwd);
  const flags = parseArgs(args, config);
  const paths = resolvePaths({ args, config, cwd, lang: flags.lang });
  const { parsers, adapter, provider } = loadPlugins(buildPluginConfig(config, flags), cwd);
  const log = (...msgs) => !flags.jsonOutput && console.log(...msgs);
  return {
    args,
    config,
    cwd,
    exitCodes: EXIT_CODES,
    ...flags,
    ...paths,
    parsers,
    adapter,
    provider,
    log,
  };
}

module.exports = {
  createContext,
  detectCommand,
  EXIT_CODES,
};
