'use strict';

/**
 * @fileoverview Version command - displays package and Node.js versions.
 * @module commands/version
 */

module.exports = {
  name: 'version',

  run() {
    const pkg = require('../../package.json');
    console.log(`${pkg.name} v${pkg.version}`);
    console.log(`Node.js ${process.version}`);
    return { exitCode: 0 };
  },
};
