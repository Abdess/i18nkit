'use strict';

/**
 * @fileoverview Auto-detection of frontend frameworks, UI libraries, and i18n solutions.
 * Analyzes package.json dependencies and root files to identify project stack.
 * @module detector
 */

const fs = require('./fs-adapter');
const path = require('path');

const stripVersion = v => v?.replace(/[\^~]/, '');
const getDep = (ctx, pkg) => ctx.pkg.dependencies?.[pkg];
const getVersion = pkg => ctx => stripVersion(getDep(ctx, pkg));

const DETECTION_RULES = [
  {
    id: 'angular',
    type: 'framework',
    detect: ctx => getDep(ctx, '@angular/core') || ctx.files.includes('angular.json'),
    plugins: ['parser-angular'],
    label: 'Angular',
    version: getVersion('@angular/core'),
  },
  {
    id: 'react',
    type: 'framework',
    detect: ctx => getDep(ctx, 'react'),
    plugins: ['parser-react'],
    label: 'React',
    version: getVersion('react'),
  },
  {
    id: 'vue',
    type: 'framework',
    detect: ctx => getDep(ctx, 'vue'),
    plugins: ['parser-vue'],
    label: 'Vue',
    version: getVersion('vue'),
  },
  {
    id: 'primeng',
    type: 'library',
    detect: ctx => getDep(ctx, 'primeng'),
    plugins: ['parser-primeng'],
    label: 'PrimeNG',
    version: getVersion('primeng'),
  },
  {
    id: 'material',
    type: 'library',
    detect: ctx => getDep(ctx, '@angular/material'),
    plugins: ['parser-material'],
    label: 'Angular Material',
    version: getVersion('@angular/material'),
  },
  {
    id: 'transloco',
    type: 'i18n',
    detect: ctx => getDep(ctx, '@jsverse/transloco') || getDep(ctx, '@ngneat/transloco'),
    plugins: ['adapter-transloco'],
    label: 'Transloco',
    version: ctx =>
      stripVersion(getDep(ctx, '@jsverse/transloco') || getDep(ctx, '@ngneat/transloco')),
  },
  {
    id: 'ngx-translate',
    type: 'i18n',
    detect: ctx => getDep(ctx, '@ngx-translate/core'),
    plugins: ['adapter-ngx-translate'],
    label: 'ngx-translate',
    version: getVersion('@ngx-translate/core'),
  },
  {
    id: 'react-i18next',
    type: 'i18n',
    detect: ctx => getDep(ctx, 'react-i18next'),
    plugins: ['adapter-react-i18next'],
    label: 'react-i18next',
    version: getVersion('react-i18next'),
  },
];

function readPackageJson(cwd) {
  const pkgPath = path.join(cwd, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  } catch {
    return {};
  }
}

function listRootFiles(cwd) {
  try {
    return fs.readdirSync(cwd);
  } catch {
    return [];
  }
}

function createEmptyDetected() {
  return { framework: null, libraries: [], i18n: null, plugins: new Set(), details: [] };
}

function buildDetail(rule, context) {
  const version = typeof rule.version === 'function' ? rule.version(context) : null;
  return { id: rule.id, label: rule.label, type: rule.type, version };
}

function applyRuleToDetected(rule, detail, detected) {
  detected.details.push(detail);
  rule.plugins.forEach(p => detected.plugins.add(p));
  if (rule.type === 'framework') {
    detected.framework = detail;
  }
  if (rule.type === 'library') {
    detected.libraries.push(detail);
  }
  if (rule.type === 'i18n') {
    detected.i18n = detail;
  }
}

function processDetectionRule(rule, context, detected) {
  if (!rule.detect(context)) {
    return;
  }
  applyRuleToDetected(rule, buildDetail(rule, context), detected);
}

/**
 * Detects framework, libraries, and i18n setup from package.json
 * @param {string} [cwd=process.cwd()]
 * @returns {DetectionResult}
 * @example
 * const result = detectProject('/path/to/project');
 * // { framework: { id: 'angular', label: 'Angular', version: '17.0.0' }, ... }
 */
function detectProject(cwd = process.cwd()) {
  const context = { pkg: readPackageJson(cwd), files: listRootFiles(cwd), cwd };
  const detected = createEmptyDetected();
  DETECTION_RULES.forEach(rule => processDetectionRule(rule, context, detected));
  detected.plugins = [...detected.plugins];
  return detected;
}

module.exports = {
  detectProject,
};
