'use strict';

/**
 * @fileoverview Watch command - file system watcher for incremental extraction.
 * Monitors source files and re-runs extraction on changes.
 * @module commands/watch
 */

const { watchFiles } = require('../core');
const extract = require('./extract');

module.exports = {
  name: 'watch',
  category: 'development',
  description: 'Watch for file changes and re-run extraction',

  examples: ['i18nkit --watch', 'i18nkit --watch --verbose'],

  run(ctx) {
    const { srcDir, excludedFolders, log } = ctx;

    const runExtract = async () => {
      try {
        await extract.run(ctx);
      } catch (err) {
        console.error('Error:', err.message);
      }
    };

    watchFiles({ srcDir, excludedFolders, log, onFileChange: runExtract, onStart: runExtract });

    return { exitCode: null };
  },
};
