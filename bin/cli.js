#!/usr/bin/env node

'use strict';

const { createContext, detectCommand, EXIT_CODES } = require('./core/context');
const { getCommand } = require('./commands');
const core = require('./core');

const args = process.argv.slice(2);
const commandName = detectCommand(args);
const command = getCommand(commandName);

if (!command) {
  console.error(`Unknown command: ${commandName}`);
  process.exit(EXIT_CODES.ERROR);
}

function handleError(err, verbose) {
  console.error('Error:', err.message);
  if (verbose) {
    console.error(err.stack);
  }

  const backups = core.getBackupFiles();
  if (backups.size > 0) {
    console.log('\nRestoring backups...');
    console.log(`Restored ${core.restoreBackups()} file(s)`);
  }

  process.exit(EXIT_CODES.ERROR);
}

async function main() {
  const ctx = createContext(args);

  try {
    const result = await command.run(ctx);
    const exitCode = result?.exitCode ?? EXIT_CODES.SUCCESS;

    if (exitCode !== null) {
      process.exit(exitCode);
    }
  } catch (err) {
    handleError(err, ctx.verbose);
  }
}

main();
