'use strict';

/**
 * @fileoverview CLI command categorization and help formatting.
 * Groups commands by category and generates formatted output.
 * @module command-interface
 */

const COMMAND_CATEGORIES = Object.freeze([
  { id: 'extraction', label: 'EXTRACTION' },
  { id: 'validation', label: 'VALIDATION' },
  { id: 'translation', label: 'TRANSLATION' },
  { id: 'development', label: 'DEVELOPMENT' },
  { id: 'maintenance', label: 'MAINTENANCE' },
]);

const getDescription = cmd => cmd.description || cmd.meta?.description || 'No description';
const getCategory = cmd => cmd.category || cmd.meta?.category;

function formatAliases(command) {
  return command.aliases?.length ? ` (${command.aliases.join(', ')})` : '';
}

function formatOption(opt) {
  const required = opt.required ? ' (required)' : '';
  return `    ${opt.flag.padEnd(24)} ${opt.description}${required}`;
}

function formatOptions(command) {
  return (command.options || []).map(formatOption);
}

/**
 * Formats command for CLI help output.
 * @param {Command} command
 * @returns {string}
 */
function formatCommandHelp(command) {
  const lines = [`  ${command.name}${formatAliases(command)}`, `    ${getDescription(command)}`];
  lines.push(...formatOptions(command));
  return lines.join('\n');
}

/**
 * Groups commands by category for organized help display.
 * @param {Command[]} commands
 * @returns {Record<string, {label: string, commands: Command[]}>}
 */
function groupCommandsByCategory(commands) {
  const byCategory = Object.groupBy(commands, c => getCategory(c) || 'other');

  const grouped = Object.fromEntries(
    COMMAND_CATEGORIES.map(cat => [
      cat.id,
      { label: cat.label, commands: byCategory[cat.id] || [] },
    ]),
  );

  if (byCategory.other?.length) {
    grouped.other = { label: 'OTHER', commands: byCategory.other };
  }

  return grouped;
}

module.exports = {
  COMMAND_CATEGORIES,
  formatCommandHelp,
  groupCommandsByCategory,
};
