'use strict';

/**
 * @fileoverview Filesystem abstraction layer for dependency injection.
 * Enables mocking in tests without monkey-patching Node.js fs module.
 * @module fs-adapter
 */

const nodeFs = require('fs');
const nodeFsp = nodeFs.promises;

let fs = nodeFs;
let fsp = nodeFsp;

/**
 * Injects custom fs implementation for testing
 * @param {FsAdapter} adapter
 */
const setAdapter = adapter => {
  fs = adapter.fs || nodeFs;
  fsp = adapter.fsp || nodeFsp;
};

const resetAdapter = () => {
  fs = nodeFs;
  fsp = nodeFsp;
};

const existsSync = path => fs.existsSync(path);
const readFileSync = (path, encoding = 'utf-8') => fs.readFileSync(path, encoding);
const writeFileSync = (path, data, encoding = 'utf-8') => fs.writeFileSync(path, data, encoding);
const readdirSync = (path, options) => fs.readdirSync(path, options);
const statSync = path => fs.statSync(path);
const watch = (path, options, listener) => fs.watch(path, options, listener);
const mkdirSync = (path, options) => fs.mkdirSync(path, options);
const copyFileSync = (src, dest) => fs.copyFileSync(src, dest);

const readFile = (path, encoding = 'utf-8') => fsp.readFile(path, encoding);
const writeFile = (path, data, encoding = 'utf-8') => fsp.writeFile(path, data, encoding);
const readdir = (path, options) => fsp.readdir(path, options);
const mkdir = (path, options) => fsp.mkdir(path, options);
const rename = (oldPath, newPath) => fsp.rename(oldPath, newPath);
const unlink = path => fsp.unlink(path);
const copyFile = (src, dest) => fsp.copyFile(src, dest);
const rm = (path, options) => fsp.rm(path, options);

module.exports = {
  setAdapter,
  resetAdapter,
  existsSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  mkdirSync,
  copyFileSync,
  statSync,
  watch,
  readFile,
  writeFile,
  readdir,
  mkdir,
  rename,
  unlink,
  copyFile,
  rm,
};
