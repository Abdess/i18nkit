/**
 * i18nkit configuration example
 * Place this file in your project root as i18nkit.config.js
 */
module.exports = {
  // Source directory to scan
  src: 'src/app',

  // Default language code
  lang: 'fr',

  // i18n files directory
  i18nDir: 'src/assets/i18n',

  // Output format: 'nested' or 'flat'
  format: 'nested',

  // Create backups before modifying files
  backup: true,

  // Folders to exclude from scanning
  excludedFolders: ['node_modules', 'dist', '.git', 'coverage', 'e2e', '.angular'],

  // Also extract from TypeScript object literals (label: 'text', etc.)
  extractTsObjects: false,

  // Include already translated strings in extraction
  includeTranslated: false,
};
