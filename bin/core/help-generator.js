'use strict';

/**
 * @fileoverview CLI help text generator.
 * Builds formatted help output from commands, plugins, and detection results.
 * @module help-generator
 */

const { formatPluginHelp } = require('./plugin-interface');
const {
  formatCommandHelp,
  groupCommandsByCategory,
  COMMAND_CATEGORIES,
} = require('./command-interface');

function generateHeader(packageInfo) {
  const {
    name = 'i18nkit',
    version = '1.0.0',
    description = 'Universal i18n CLI',
  } = packageInfo || {};
  return `${name} v${version}\n${description}`;
}

function generateUsage() {
  return `USAGE:
  i18nkit [command] [options]
  i18nkit --extract [options]`;
}

function hasDetection(detected) {
  return detected.framework || detected.libraries?.length > 0 || detected.i18n;
}

function formatVersionLabel(item) {
  return `${item.label}${item.version ? ` v${item.version}` : ''}`;
}

function addDetectedLine(lines, label, value) {
  if (value) {
    lines.push(`  ${label}: ${value}`);
  }
}

function formatLibraries(detected) {
  return detected.libraries?.length > 0 ?
      detected.libraries.map(formatVersionLabel).join(', ')
    : null;
}

function formatAutoActivated(detected) {
  return detected.plugins?.length > 0 ? detected.plugins.join(', ') : null;
}

function generateDetectedSection(detected) {
  const lines = ['DETECTED PROJECT:'];
  addDetectedLine(lines, 'Framework', detected.framework && formatVersionLabel(detected.framework));
  addDetectedLine(lines, 'Libraries', formatLibraries(detected));
  addDetectedLine(lines, 'i18n', detected.i18n && formatVersionLabel(detected.i18n));
  addDetectedLine(lines, 'Auto-activated', formatAutoActivated(detected));
  return lines.join('\n');
}

function generateCommandsSection(commands) {
  const lines = ['COMMANDS:'];
  const grouped = groupCommandsByCategory(commands);

  for (const cat of COMMAND_CATEGORIES) {
    const catCommands = grouped[cat.id]?.commands || [];
    if (catCommands.length === 0) {
      continue;
    }
    lines.push(`\n  ${cat.label}:`);
    catCommands.forEach(cmd => lines.push(formatCommandHelp(cmd)));
  }

  return lines.join('\n');
}

function generateGlobalOptions() {
  return `GLOBAL OPTIONS:
  --config <path>         Path to config file (default: i18nkit.config.js)
  --src <dir>             Source directory (default: src)
  --locales <dir>         Locales directory (default: src/assets/i18n)
  --default-lang <code>   Default language (default: fr)
  --dry-run               Preview changes without writing
  --verbose               Verbose output
  --help, -h              Show this help
  --version, -v           Show version`;
}

function formatPluginsByType(plugins, type, label) {
  const items = plugins[type] || [];
  if (items.length === 0) {
    return [];
  }
  return [`\n  ${label}:`, ...items.map(formatPluginHelp)];
}

function getPluginCount(plugins, type) {
  return plugins[type]?.length || 0;
}

function countPlugins(plugins) {
  return (
    getPluginCount(plugins, 'parsers') +
    getPluginCount(plugins, 'adapters') +
    getPluginCount(plugins, 'providers')
  );
}

function generatePluginsSection(plugins) {
  const lines = ['PLUGINS:'];
  lines.push(
    ...formatPluginsByType(plugins, 'parsers', 'PARSERS (extract i18n from source files)'),
  );
  lines.push(...formatPluginsByType(plugins, 'adapters', 'ADAPTERS (i18n library integration)'));
  lines.push(...formatPluginsByType(plugins, 'providers', 'PROVIDERS (translation services)'));
  if (countPlugins(plugins) === 0) {
    lines.push('  No plugins loaded');
  }
  return lines.join('\n');
}

function collectPluginExamples(plugins) {
  if (!plugins) {
    return [];
  }
  const all = [
    ...(plugins.parsers || []),
    ...(plugins.adapters || []),
    ...(plugins.providers || []),
  ];
  return all.flatMap(p => p.examples || []);
}

function generateExamplesSection(plugins) {
  const lines = [
    'EXAMPLES:',
    '  # Extract i18n keys from Angular project',
    '  i18nkit --extract',
    '',
    '  # Check translation sync',
    '  i18nkit check-sync --strict',
    '',
    '  # Find orphan keys',
    '  i18nkit find-orphans',
    '',
    '  # Translate to English',
    '  i18nkit translate fr:en',
  ];

  const pluginExamples = collectPluginExamples(plugins);
  if (pluginExamples.length > 0) {
    lines.push('', '  # Plugin examples:');
    pluginExamples.slice(0, 3).forEach(ex => lines.push(`  ${ex}`));
  }

  return lines.join('\n');
}

function generateFooter() {
  return `DOCUMENTATION:
  https://github.com/Abdess/i18nkit

PLUGIN LOCATIONS:
  builtin:  <package>/bin/plugins/
  local:    .i18n/plugins/
  npm:      i18nkit-* packages`;
}

function addDetectedIfPresent(sections, detected) {
  if (detected && hasDetection(detected)) {
    sections.push(generateDetectedSection(detected));
  }
}

function addCommandsIfPresent(sections, commands) {
  if (commands?.length > 0) {
    sections.push(generateCommandsSection(commands));
  }
}

function buildHelpSections(config) {
  const { plugins, commands, detected, packageInfo } = config;
  const sections = [generateHeader(packageInfo), generateUsage()];
  addDetectedIfPresent(sections, detected);
  addCommandsIfPresent(sections, commands);
  sections.push(generateGlobalOptions());
  if (plugins) {
    sections.push(generatePluginsSection(plugins));
  }
  return sections;
}

/**
 * Generates complete CLI help text with all sections
 * @param {Object} config
 * @returns {string}
 */
function generateFullHelp(config) {
  const sections = buildHelpSections(config);
  sections.push(generateExamplesSection(config.plugins));
  sections.push(generateFooter());
  return sections.join('\n\n');
}

module.exports = { generateFullHelp };
