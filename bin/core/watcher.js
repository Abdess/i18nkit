'use strict';

/**
 * @fileoverview File system watcher for incremental extraction.
 * Monitors .ts/.html files with debouncing and recursive support.
 * @module watcher
 */

const fs = require('./fs-adapter');
const path = require('path');

const WATCH_DEBOUNCE_MS = 500;
const watchDebounceMap = new Map();

function isWatchableFile(filename) {
  if (!filename || !/\.(ts|html)$/.test(filename)) {
    return false;
  }
  return !/\.(spec|test|e2e|mock)\./.test(filename);
}

function createWatchHandler(options = {}) {
  const { srcDir, onFileChange, log = console.log } = options;

  return filePath => {
    const now = Date.now();
    if (now - (watchDebounceMap.get(filePath) || 0) < WATCH_DEBOUNCE_MS) {
      return;
    }
    watchDebounceMap.set(filePath, now);
    log(
      `\n[${new Date().toLocaleTimeString()}] Change detected: ${path.relative(srcDir, filePath)}`,
    );
    if (onFileChange) {
      onFileChange(filePath);
    }
  };
}

function watchSubdirectory(dir, handleChange, excludedFolders) {
  for (const file of fs.readdirSync(dir)) {
    if (excludedFolders.includes(file)) {
      continue;
    }
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      watchSubdirectory(filePath, handleChange, excludedFolders);
    }
  }
  fs.watch(dir, { recursive: false }, (_, filename) => {
    if (!isWatchableFile(filename)) {
      return;
    }
    const filePath = path.join(dir, filename);
    if (fs.existsSync(filePath)) {
      handleChange(filePath);
    }
  });
}

function watchDirRecursive(dir, handleChange, excludedFolders = []) {
  if (!fs.existsSync(dir)) {
    return;
  }
  watchSubdirectory(dir, handleChange, excludedFolders);
}

function setupRecursiveWatch(ctx) {
  const { srcDir, excludedFolders, handleChange, log } = ctx;
  const watcher = fs.watch(srcDir, { recursive: true }, (_, filename) => {
    if (!isWatchableFile(filename) || excludedFolders.some(f => filename.includes(f))) {
      return;
    }
    const filePath = path.join(srcDir, filename);
    if (fs.existsSync(filePath)) {
      handleChange(filePath);
    }
  });
  watcher.on('error', err => console.error('Watch error:', err.message));
  log('Using recursive watch (native support)');
}

function setupFallbackWatch(ctx) {
  const { srcDir, excludedFolders, handleChange, log } = ctx;
  log('Recursive watch not supported, using directory watchers');
  watchDirRecursive(srcDir, handleChange, excludedFolders);
}

function logWatchHeader(srcDir, log) {
  log('Transloco Watch Mode');
  log('='.repeat(50));
  log(`Watching: ${srcDir}\nPress Ctrl+C to stop\n`);
}

function initWatch(ctx) {
  try {
    setupRecursiveWatch(ctx);
  } catch {
    setupFallbackWatch(ctx);
  }
}

/**
 * Watches source directory for .ts/.html changes
 * @param {WatchOptions} [options]
 * @example
 * watchFiles({ srcDir: './src', onFileChange: path => extract(path) });
 */
function watchFiles(options = {}) {
  const { srcDir, excludedFolders = [], onFileChange, onStart, log = console.log } = options;
  logWatchHeader(srcDir, log);
  const handleChange = createWatchHandler({ srcDir, onFileChange, log });
  initWatch({ srcDir, excludedFolders, handleChange, log });
  if (onStart) {
    onStart();
  }
}

module.exports = { watchFiles };
