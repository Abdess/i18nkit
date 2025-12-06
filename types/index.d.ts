/**
 * i18nkit - Universal i18n toolkit
 * @packageDocumentation
 */

export interface I18nKitConfig {
  /** Source directory to scan (default: 'src/app') */
  src?: string;
  /** Default language code */
  lang?: string;
  /** i18n files directory (default: 'src/assets/i18n') */
  i18nDir?: string;
  /** Output format: 'nested' or 'flat' (default: 'nested') */
  format?: 'nested' | 'flat';
  /** Create backups before modifying files (default: true) */
  backup?: boolean;
  /** Folders to exclude from scanning */
  excludedFolders?: string[];
  /** Extract from TypeScript object literals (default: false) */
  extractTsObjects?: boolean;
  /** Include already translated strings (default: false) */
  includeTranslated?: boolean;
  /** CI mode: enables strict and json (default: false) */
  ci?: boolean;
  /** Verbose output (default: false) */
  verbose?: boolean;
  /** JSON report output (default: false) */
  json?: boolean;
  /** Dry run mode (default: false) */
  dryRun?: boolean;
  /** Strict mode - exit 1 on issues (default: false) */
  strict?: boolean;
  /** Auto-apply translations (default: false) */
  autoApply?: boolean;
  /** Interactive mode for confirmations (default: false) */
  interactive?: boolean;
  /** Watch mode (default: false) */
  watch?: boolean;
  /** Use DeepL API instead of MyMemory (default: false) */
  deepl?: boolean;
  /** Email for MyMemory rate limit */
  email?: string;
  /** Languages to initialize */
  initLangs?: string[];
}

export interface ExtractionResult {
  file: string;
  text: string;
  rawText: string;
  displayText: string;
  context: string;
  key: string;
  attr?: string;
  isNew: boolean;
}

export interface ExtractionStats {
  files: number;
  clean: number;
  needsWork: number;
  total: number;
  added: number;
  byContext: Record<string, number>;
}

export interface SyncResult {
  totalKeys: number;
  languages: number;
  missingKeys: number;
  identicalValues: number;
  icuMessages: number;
  icuMismatches: number;
}

export interface OrphanResult {
  totalKeys: number;
  usedKeys: number;
  orphanKeys: number;
  dynamicPatterns: number;
}

export const EXIT_SUCCESS: 0;
export const EXIT_UNTRANSLATED: 1;
export const EXIT_ERROR: 2;
