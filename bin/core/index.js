'use strict';

/**
 * @fileoverview i18nkit core library public API.
 * Exposes all extraction, translation, and synchronization utilities.
 * @module i18nkit/core
 */

const json = require('./json-utils');
const keys = require('./key-generator');
const files = require('./file-walker');
const backup = require('./backup');
const sync = require('./sync-checker');
const orphans = require('./orphan-finder');
const apply = require('./applier');
const translate = require('./translator');
const watch = require('./watcher');
const plugins = require('./plugin-resolver');
const config = require('./config');
const detector = require('./detector');
const help = require('./help-generator');
const fsAdapter = require('./fs-adapter');
const logUtils = require('./log-utils');

module.exports = {
  setFsAdapter: fsAdapter.setAdapter,
  resetFsAdapter: fsAdapter.resetAdapter,

  getArgValue: config.getArgValue,

  readJsonFile: json.readJsonFile,
  readJsonFileSync: json.readJsonFileSync,
  writeJsonFile: json.writeJsonFile,
  flattenJson: json.flattenJson,
  unflattenJson: json.unflattenJson,
  mergeDeep: json.mergeDeep,
  setNestedValue: json.setNestedValue,
  normalizeData: json.normalizeData,

  logListWithLimit: logUtils.logListWithLimit,

  slugify: keys.slugify,
  pathToScope: keys.pathToScope,

  collectFiles: files.collectFiles,
  getFileContent: files.getFileContent,

  restoreBackups: backup.restoreBackups,
  getBackupFiles: backup.getBackupFiles,

  checkSync: sync.checkSync,
  findOrphans: orphans.findOrphans,
  applyFindings: apply.applyFindings,
  applyTranslations: apply.applyTranslations,
  translateFile: translate.translateFile,
  watchFiles: watch.watchFiles,

  loadPlugins: plugins.loadPlugins,
  getResolver: plugins.getResolver,

  detectProject: detector.detectProject,
  generateFullHelp: help.generateFullHelp,
};
