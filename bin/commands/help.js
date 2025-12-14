'use strict';

/**
 * @fileoverview Help command - displays CLI usage and available commands.
 * Auto-detects project type and shows relevant plugin information.
 * @module commands/help
 */

const { generateFullHelp, detectProject, getResolver } = require('../core');

module.exports = {
  name: 'help',

  run(ctx) {
    const detected = detectProject(ctx.cwd);
    const resolver = getResolver(ctx.cwd);
    const { getAllCommands } = require('./index');

    console.log(
      generateFullHelp({
        packageInfo: require('../../package.json'),
        detected,
        plugins: {
          parsers: resolver.getByType('parser'),
          adapters: resolver.getByType('adapter'),
          providers: resolver.getByType('provider'),
        },
        commands: getAllCommands(),
      }),
    );

    return { exitCode: 0 };
  },
};
