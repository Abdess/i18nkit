'use strict';

/**
 * @fileoverview Plugin resolution engine with caching and auto-discovery.
 * Resolves plugins from builtin, local (.i18n/plugins), and npm sources.
 * @module plugin-resolver
 */

const { validatePlugin } = require('./plugin-interface');
const {
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
} = require('./plugin-resolver-utils');

/**
 * Plugin resolution and registry management.
 * Caches resolved plugins and maintains a registry of discovered plugins.
 */
class PluginResolver {
  /**
   * @param {string} [cwd=process.cwd()] - Working directory for resolution
   */
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    /** @type {Map<string, Plugin>} */
    this.cache = new Map();
    /** @type {PluginRegistry|null} */
    this.registry = null;
  }

  /**
   * Resolves a plugin by identifier (name, path, or npm package).
   * @param {string} identifier - Plugin identifier
   * @returns {Plugin|null}
   */
  resolve(identifier) {
    if (this.cache.has(identifier)) {
      return this.cache.get(identifier);
    }
    const plugin =
      resolveFromBuiltinOrLocal(identifier, this.cwd) ||
      resolveFromRelative(identifier, this.cwd) ||
      resolveFromNpm(identifier);
    this.cache.set(identifier, plugin);
    return plugin;
  }

  /**
   * Discovers all available plugins from all sources.
   * @returns {PluginRegistry}
   */
  discoverAll() {
    if (this.registry) {
      return this.registry;
    }
    this.registry = {
      parsers: [],
      adapters: [],
      providers: [],
      all: [],
      byName: new Map(),
      errors: [],
    };
    this._loadFromSource('builtin', () => this._scanBuiltin());
    this._loadFromSource('local', () => this._scanLocal());
    this._loadFromSource('npm', () => this._scanNpm());
    return this.registry;
  }

  _loadFromSource(sourceName, loader) {
    try {
      for (const plugin of loader()) {
        this._registerPlugin({ ...plugin, source: sourceName });
      }
    } catch (err) {
      this.registry.errors.push({ source: sourceName, error: err.message });
    }
  }

  _handleInvalidPlugin(plugin, validation) {
    this.registry.errors.push({
      plugin: plugin.name || 'unknown',
      source: plugin.source,
      errors: validation.errors,
    });
  }

  _addPluginToRegistry(plugin) {
    this.registry.byName.set(plugin.name, plugin);
    this.registry.all.push(plugin);
    this.cache.set(plugin.name, plugin);
    const plural = TYPE_TO_PLURAL[plugin.type];
    if (plural) {
      this.registry[plural].push(plugin);
    }
  }

  _registerPlugin(plugin) {
    const validation = validatePlugin(plugin);
    if (!validation.valid) {
      this._handleInvalidPlugin(plugin, validation);
      return;
    }
    if (!this.registry.byName.has(plugin.name)) {
      this._addPluginToRegistry(plugin);
    }
  }

  _scanBuiltin() {
    return scanBuiltin();
  }

  _scanLocal() {
    return scanLocal(this.cwd);
  }

  _scanNpm() {
    return scanNpm(this.cwd);
  }

  /**
   * @param {'parser'|'adapter'|'provider'} type
   * @returns {Plugin[]}
   */
  getByType(type) {
    return this.discoverAll()[TYPE_TO_PLURAL[type]] || [];
  }

  /**
   * @param {string} name
   * @returns {Plugin|undefined}
   */
  getByName(name) {
    return this.discoverAll().byName.get(name);
  }

  /**
   * Filters plugins by detection context (framework, libraries detected).
   * @param {DetectionContext} context
   * @returns {Plugin[]}
   */
  filterByDetection(context) {
    return this.discoverAll().all.filter(plugin => {
      if (typeof plugin.detect !== 'function') {
        return false;
      }
      try {
        return plugin.detect(context);
      } catch {
        return false;
      }
    });
  }

  /**
   * Loads plugins from configuration with defaults.
   * @param {Object} [config={}]
   * @param {string[]} [config.parsers] - Parser plugin names
   * @param {string} [config.adapter] - Adapter plugin name
   * @param {string} [config.provider] - Provider plugin name
   * @returns {{parsers: Plugin[], adapter: Plugin, provider: Plugin}}
   */
  loadFromConfig(config = {}) {
    const parsers = (config.parsers || DEFAULT_PARSERS)
      .map(name => this.resolve(name))
      .sort((a, b) => (a.priority || 100) - (b.priority || 100));
    return {
      parsers,
      adapter: this.resolve(config.adapter || DEFAULT_ADAPTER),
      provider: this.resolve(config.provider || DEFAULT_PROVIDER),
    };
  }

  reset() {
    this.cache.clear();
    this.registry = null;
  }
}

/** @type {PluginResolver|null} */
let defaultResolver = null;

/**
 * Gets or creates the default resolver for the given working directory.
 * @param {string} [cwd=process.cwd()]
 * @returns {PluginResolver}
 */
function getResolver(cwd = process.cwd()) {
  if (!defaultResolver || defaultResolver.cwd !== cwd) {
    defaultResolver = new PluginResolver(cwd);
  }
  return defaultResolver;
}

/**
 * Convenience function to load plugins from config.
 * @param {Object} [config={}]
 * @param {string} [cwd=process.cwd()]
 * @returns {{parsers: Plugin[], adapter: Plugin, provider: Plugin}}
 */
const loadPlugins = (config = {}, cwd = process.cwd()) => getResolver(cwd).loadFromConfig(config);

module.exports = { getResolver, loadPlugins };
