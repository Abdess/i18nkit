'use strict';

/**
 * @fileoverview CLI command registry with auto-discovery.
 * Loads command modules from this directory and manages aliases.
 * @module commands
 */

const fs = require('../core/fs-adapter');
const path = require('path');

/**
 * @typedef {Object} Command
 * @property {string} name
 * @property {string} [category]
 * @property {string} [description]
 * @property {Array<string>} [aliases]
 * @property {Array<Object>} [options]
 * @property {Array<string>} [examples]
 * @property {function} run
 */

const COMMANDS_DIR = __dirname;
const EXCLUDED_FILES = ['index.js'];

function loadCommand(filePath) {
  try {
    const cmd = require(filePath);
    return cmd?.name && typeof cmd.run === 'function' ? cmd : null;
  } catch {
    return null;
  }
}

/**
 * Auto-discover and load all command modules from this directory
 * @returns {Map<string, Command>}
 */
function discoverCommands() {
  const commands = new Map();

  const files = fs
    .readdirSync(COMMANDS_DIR)
    .filter(f => f.endsWith('.js') && !EXCLUDED_FILES.includes(f));

  for (const file of files) {
    const command = loadCommand(path.join(COMMANDS_DIR, file));
    if (!command) {
      continue;
    }

    commands.set(command.name, command);
    command.aliases?.forEach(alias => commands.set(alias, command));
  }

  return commands;
}

const COMMANDS = discoverCommands();

/**
 * @param {string} name
 * @returns {Command|undefined}
 */
function getCommand(name) {
  return COMMANDS.get(name);
}

/**
 * @returns {Command[]}
 */
function getAllCommands() {
  return [...new Set(COMMANDS.values())];
}

module.exports = {
  getCommand,
  getAllCommands,
};
