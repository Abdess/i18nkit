'use strict';

/**
 * @fileoverview Plugin discovery utilities for builtin, local, and npm sources.
 * Scans directories and resolves plugin modules.
 * @module plugin-resolver-utils
 */

const fs = require('./fs-adapter');
const path = require('path');

const BUILTIN_DIR = path.join(__dirname, '..', 'plugins');
const LOCAL_DIR = '.i18nkit/plugins';

/** @type {Record<string, string>} */
const BUILTIN_ALIASES = {
  '@i18nkit/parser-angular': 'parser-angular',
  '@i18nkit/parser-primeng': 'parser-primeng',
  '@i18nkit/parser-typescript': 'parser-typescript',
  '@i18nkit/adapter-transloco': 'adapter-transloco',
  '@i18nkit/provider-mymemory': 'provider-mymemory',
  '@i18nkit/provider-deepl': 'provider-deepl',
};

const DEFAULT_PARSERS = ['parser-angular', 'parser-primeng', 'parser-typescript'];
const DEFAULT_ADAPTER = 'adapter-transloco';
const DEFAULT_PROVIDER = 'provider-mymemory';
const TYPE_TO_PLURAL = Object.freeze({
  parser: 'parsers',
  adapter: 'adapters',
  provider: 'providers',
});

const tryLoadPath = p => (fs.existsSync(p) ? require(p) : null);

/**
 * Resolves plugin from builtin or local directories.
 * @param {string} identifier
 * @param {string} cwd
 * @returns {Plugin|null}
 */
function resolveFromBuiltinOrLocal(identifier, cwd) {
  const aliased = BUILTIN_ALIASES[identifier] || identifier;
  return (
    tryLoadPath(path.join(BUILTIN_DIR, `${aliased}.js`)) ||
    tryLoadPath(path.join(cwd, LOCAL_DIR, `${aliased}.js`))
  );
}

/**
 * Resolves plugin from relative path.
 * @param {string} identifier
 * @param {string} cwd
 * @returns {Plugin|null}
 */
function resolveFromRelative(identifier, cwd) {
  if (!identifier.startsWith('./') && !identifier.startsWith('../')) {
    return null;
  }
  return tryLoadPath(path.resolve(cwd, identifier));
}

/**
 * Resolves plugin from npm package.
 * @param {string} identifier
 * @returns {Plugin}
 * @throws {Error} If plugin not found
 */
function resolveFromNpm(identifier) {
  try {
    return require(identifier);
  } catch {
    throw new Error(`Plugin not found: ${identifier}`);
  }
}

function scanDir(dir, mapper) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.js'))
    .map(mapper)
    .filter(p => p?.name);
}

/**
 * Scans builtin plugins directory.
 * @returns {Plugin[]}
 */
function scanBuiltin() {
  return scanDir(BUILTIN_DIR, f => {
    try {
      return require(path.join(BUILTIN_DIR, f));
    } catch {
      return null;
    }
  });
}

/**
 * Scans local .i18n/plugins directory.
 * @param {string} cwd
 * @returns {Plugin[]}
 */
function scanLocal(cwd) {
  return scanDir(path.join(cwd, LOCAL_DIR), f => {
    try {
      return require(path.join(cwd, LOCAL_DIR, f));
    } catch {
      return null;
    }
  });
}

function scanScopedDir(nodeModules, scope) {
  const scopeDir = path.join(nodeModules, scope);
  if (!fs.existsSync(scopeDir)) {
    return [];
  }
  return fs.readdirSync(scopeDir).map(pkg => {
    try {
      return require(path.join(scopeDir, pkg));
    } catch {
      return null;
    }
  });
}

/**
 * Scans npm packages for i18nkit-* and @i18nkit/* plugins.
 * @param {string} cwd
 * @returns {Plugin[]}
 */
function scanNpm(cwd) {
  const nodeModules = path.join(cwd, 'node_modules');
  if (!fs.existsSync(nodeModules)) {
    return [];
  }
  const prefixed = fs
    .readdirSync(nodeModules)
    .filter(d => d.startsWith('i18nkit-'))
    .map(d => {
      try {
        return require(path.join(nodeModules, d));
      } catch {
        return null;
      }
    });
  const scoped = scanScopedDir(nodeModules, '@i18nkit');
  return [...prefixed, ...scoped].filter(p => p?.name);
}

module.exports = {
  DEFAULT_PARSERS,
  DEFAULT_ADAPTER,
  DEFAULT_PROVIDER,
  TYPE_TO_PLURAL,
  resolveFromBuiltinOrLocal,
  resolveFromRelative,
  resolveFromNpm,
  scanBuiltin,
  scanLocal,
  scanNpm,
};
