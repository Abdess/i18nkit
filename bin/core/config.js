'use strict';

/**
 * @fileoverview Configuration loader with CLI argument merging.
 * Supports .js and .json config files with fallback chain.
 * @module config
 */

const fs = require('./fs-adapter');
const path = require('path');

const CONFIG_FILES = ['i18nkit.config.js', 'i18nkit.config.json', '.i18nkit.config.js'];

function tryLoadConfigFile(configFile, cwd = process.cwd()) {
  const configPath = path.join(cwd, configFile);
  if (!fs.existsSync(configPath)) {
    return null;
  }
  try {
    return configFile.endsWith('.js') ?
        require(configPath)
      : JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (err) {
    console.warn(`Warning: Cannot load ${configFile}: ${err.message}`);
    return null;
  }
}

/**
 * Loads config from .i18nkit.config.js or .json variants
 * @param {string} [cwd=process.cwd()]
 * @returns {Object}
 */
function loadConfig(cwd = process.cwd()) {
  for (const configFile of CONFIG_FILES) {
    const config = tryLoadConfigFile(configFile, cwd);
    if (config) {
      return config;
    }
  }
  return {};
}

function getConfigValue(config, configKey, defaultValue) {
  return configKey && config[configKey] !== undefined ? config[configKey] : defaultValue;
}

/**
 * Gets boolean flag from args or config with fallback
 * @param {string[]} args
 * @param {Object} config
 * @param {Object} opts
 * @returns {boolean}
 */
function getFlag(args, config, opts = {}) {
  const { flag, configKey, defaultValue = false } = opts;
  if (args.includes(flag)) {
    return true;
  }
  return getConfigValue(config, configKey, defaultValue);
}

function getValueFromArgs(args, flag) {
  const idx = args.indexOf(flag);
  if (idx === -1) {
    return null;
  }
  const value = args[idx + 1];
  return value && !value.startsWith('--') ? value : null;
}

/**
 * Gets string value from args or config with fallback
 * @param {string[]} args
 * @param {Object} config
 * @param {Object} opts
 * @returns {string|undefined}
 */
function getArgValue(args, config, opts = {}) {
  const { flag, configKey, defaultValue } = opts;
  const argValue = getValueFromArgs(args, flag);
  if (argValue !== null) {
    return argValue;
  }
  return configKey && config[configKey] !== undefined ? config[configKey] : defaultValue;
}

function parseArgListValue(value) {
  return value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function getConfigAsList(config, configKey) {
  if (!configKey || !config[configKey]) {
    return [];
  }
  return Array.isArray(config[configKey]) ? config[configKey] : [config[configKey]];
}

function getArgList(args, config, opts) {
  const { flag, configKey } = opts;
  const argValue = getValueFromArgs(args, flag);
  return argValue ? parseArgListValue(argValue) : getConfigAsList(config, configKey);
}

module.exports = { loadConfig, getFlag, getArgValue, getArgList };
