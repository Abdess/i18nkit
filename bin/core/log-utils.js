'use strict';

/**
 * @fileoverview Logging utilities for CLI output formatting.
 * @module log-utils
 */

/**
 * Logs a list with truncation after limit
 * @param {Object} ctx
 */
function logListWithLimit(ctx) {
  const { items, label, limit, log, prefix = '  - ', formatter = item => item } = ctx;
  if (items.length === 0) {
    return;
  }
  log(`${label} (${items.length}):`);
  items.slice(0, limit).forEach(item => log(`${prefix}${formatter(item)}`));
  if (items.length > limit) {
    log(`  ... and ${items.length - limit} more`);
  }
}

module.exports = {
  logListWithLimit,
};
