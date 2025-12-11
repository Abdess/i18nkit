'use strict';

/**
 * @fileoverview Plugin validation and help formatting.
 * Validates plugin structure and generates CLI help output.
 * @module plugin-interface
 */

/** @type {Array<string>} */
const PLUGIN_TYPES = ['parser', 'adapter', 'provider'];

const checkName = p =>
  (!p.name || typeof p.name !== 'string') && 'Plugin must have a string "name"';
const checkType = p =>
  (!p.type || !PLUGIN_TYPES.includes(p.type)) &&
  `Plugin type must be one of: ${PLUGIN_TYPES.join(', ')}`;
const checkMeta = p => !p.meta?.description && 'Plugin must have meta.description';

function validateBasicFields(plugin) {
  return [checkName(plugin), checkType(plugin), checkMeta(plugin)].filter(Boolean);
}

function validateTypeSpecificMethods(plugin) {
  const methodErrors = {
    parser: () =>
      typeof plugin.extract !== 'function' &&
      'Parser plugins must have an extract(content, filePath, options) method',
    adapter: () =>
      typeof plugin.transform !== 'function' &&
      'Adapter plugins must have a transform(content, text, key, context) method',
    provider: () =>
      typeof plugin.translate !== 'function' &&
      typeof plugin.translateBatch !== 'function' &&
      'Provider plugins must have translate() or translateBatch() method',
  };
  const validator = methodErrors[plugin.type];
  return validator ? validator() : false;
}

/**
 * Validates a plugin has required fields and methods.
 * @param {Plugin} plugin
 * @returns {PluginValidation}
 */
function validatePlugin(plugin) {
  const errors = validateBasicFields(plugin);
  const typeError = validateTypeSpecificMethods(plugin);
  if (typeError) {
    errors.push(typeError);
  }
  return { valid: errors.length === 0, errors };
}

function formatPluginBasic(plugin) {
  const source = plugin.source || 'builtin';
  return [`  ${plugin.name} (${source})`, `    ${plugin.meta?.description || 'No description'}`];
}

function formatPluginOptions(plugin) {
  if (!plugin.options?.length) {
    return [];
  }
  return plugin.options.map(opt => `    ${opt.flag.padEnd(20)} ${opt.description}`);
}

/**
 * Formats plugin information for CLI help output.
 * @param {Plugin} plugin
 * @returns {string}
 */
function formatPluginHelp(plugin) {
  const lines = formatPluginBasic(plugin);
  if (plugin.extensions?.length) {
    lines.push(`    Extensions: ${plugin.extensions.join(', ')}`);
  }
  lines.push(...formatPluginOptions(plugin));
  if (plugin.env?.length) {
    lines.push(`    Env: ${plugin.env.map(e => e.name).join(', ')}`);
  }
  return lines.join('\n');
}

module.exports = { validatePlugin, formatPluginHelp };
