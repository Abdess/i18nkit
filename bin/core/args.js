'use strict';

/**
 * @typedef {Object} ParsedFlags
 * @property {boolean} verbose
 * @property {boolean} jsonOutput
 * @property {boolean} strict
 * @property {boolean} dryRun
 * @property {boolean} ciMode
 * @property {boolean} useDeepL
 * @property {boolean} merge
 * @property {boolean} skipTranslated
 * @property {boolean} extractTsObjects
 * @property {boolean} autoApply
 * @property {boolean} backup
 * @property {boolean} interactive
 * @property {string|null} lang
 * @property {string} format
 * @property {string|null} translatePair
 * @property {string|null} translateEmail
 * @property {string[]} initLangs
 */

const { getFlag, getArgValue, getArgList } = require('./config');

const flag = (args, config, opts) => getFlag(args, config, opts);
const value = (args, config, opts) => getArgValue(args, config, opts);

/**
 * Parse command line arguments into structured flags
 * @param {string[]} args
 * @param {Object} config
 * @returns {ParsedFlags}
 */
function parseCiMode(args, config) {
  const ciMode = flag(args, config, { flag: '--ci', configKey: 'ci' });
  if (!ciMode) {
    return { ciMode: false, jsonOutput: false, strict: false };
  }
  return { ciMode: true, jsonOutput: true, strict: true };
}

function parseBooleanFlags(args, config) {
  return {
    verbose: flag(args, config, { flag: '--verbose', configKey: 'verbose' }),
    dryRun: flag(args, config, { flag: '--dry-run', configKey: 'dryRun' }),
    useDeepL: flag(args, config, { flag: '--deepl', configKey: 'deepl' }),
    merge: flag(args, config, { flag: '--merge', configKey: 'merge' }),
    skipTranslated: !flag(args, config, {
      flag: '--include-translated',
      configKey: 'includeTranslated',
    }),
    extractTsObjects: flag(args, config, {
      flag: '--extract-ts-objects',
      configKey: 'extractTsObjects',
    }),
    autoApply: flag(args, config, { flag: '--auto-apply', configKey: 'autoApply' }),
    interactive: flag(args, config, { flag: '--interactive', configKey: 'interactive' }),
  };
}

function parseBackupFlag(args, config) {
  if (args.includes('--no-backup')) {
    return false;
  }
  return flag(args, config, { flag: '--backup', configKey: 'backup', defaultValue: true });
}

function parseValueFlags(args, config) {
  return {
    lang: value(args, config, { flag: '--lang', configKey: 'lang' }),
    format: value(args, config, { flag: '--format', configKey: 'format', defaultValue: 'nested' }),
    translatePair: value(args, config, { flag: '--translate', configKey: 'translate' }),
    translateEmail: value(args, config, { flag: '--email', configKey: 'email' }),
    initLangs: getArgList(args, config, { flag: '--init-langs', configKey: 'initLangs' }),
  };
}

function parseArgs(args, config = {}) {
  const ci = parseCiMode(args, config);
  const bools = parseBooleanFlags(args, config);
  const vals = parseValueFlags(args, config);
  const jsonOutput = ci.jsonOutput || flag(args, config, { flag: '--json', configKey: 'json' });
  const strict = ci.strict || flag(args, config, { flag: '--strict', configKey: 'strict' });
  return {
    ...bools,
    ...vals,
    ciMode: ci.ciMode,
    jsonOutput,
    strict,
    backup: parseBackupFlag(args, config),
  };
}

const COMMAND_ALIASES = {
  orphans: 'find-orphans',
  '--orphans': 'find-orphans',
  '--find-orphans': 'find-orphans',
  '--check-sync': 'check-sync',
  '--watch': 'watch',
};

const POSITIONAL_COMMANDS = [
  'check-sync',
  'find-orphans',
  'translate',
  'apply',
  'watch',
  'extract',
];

function detectFromFlags(args) {
  if (args.some(a => a.startsWith('--translate'))) {
    return 'translate';
  }
  if (args.some(a => a.startsWith('--apply'))) {
    return 'apply';
  }
  const flagCmd = args.find(a => COMMAND_ALIASES[a]);
  return flagCmd ? COMMAND_ALIASES[flagCmd] : null;
}

function detectHelpOrVersion(args) {
  if (args.includes('--help') || args.includes('-h')) {
    return 'help';
  }
  if (args.includes('--version') || args.includes('-v')) {
    return 'version';
  }
  return null;
}

function detectPositionalCommand(args) {
  const firstArg = args[0];
  if (!firstArg || !POSITIONAL_COMMANDS.includes(firstArg)) {
    return null;
  }
  return COMMAND_ALIASES[firstArg] || firstArg;
}

function detectCommand(args) {
  return (
    detectHelpOrVersion(args) || detectPositionalCommand(args) || detectFromFlags(args) || 'extract'
  );
}

module.exports = { parseArgs, detectCommand };
