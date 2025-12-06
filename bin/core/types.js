'use strict';

/**
 * @fileoverview Shared type definitions for the i18nkit library.
 * All types are JSDoc-only for editor intellisense and documentation generation.
 * @module types
 */

/**
 * @typedef {Object} DetectedTech
 * @property {string} id
 * @property {string} label
 * @property {string} type - 'framework', 'library', or 'i18n'
 * @property {string} version
 */

/**
 * @typedef {Object} DetectionResult
 * @property {DetectedTech} framework
 * @property {Array<DetectedTech>} libraries
 * @property {DetectedTech} i18n
 * @property {Array<string>} plugins
 * @property {Array<DetectedTech>} details
 */

/**
 * @typedef {Object} LangFile
 * @property {string} name
 * @property {string} path
 */

/**
 * @typedef {Object} IcuMismatch
 * @property {string} key
 * @property {Array<string>} hasIcu
 * @property {Array<string>} missingIcu
 */

/**
 * @typedef {Object} IdenticalValue
 * @property {string} key
 * @property {string} value
 */

/**
 * @typedef {Object} IcuMessage
 * @property {string} key
 * @property {Array<string>} langs
 */

/**
 * @typedef {Object} SyncResult
 * @property {Set<string>} allKeys
 * @property {Array<LangFile>} langFiles
 * @property {Object<string, Array<string>>} missingByLang
 * @property {Array<IdenticalValue>} identicalValues
 * @property {Array<IcuMessage>} icuMessages
 * @property {Array<IcuMismatch>} icuMismatches
 */

/**
 * @typedef {Object} SyncCheckResult
 * @property {boolean} success
 * @property {number} exitCode
 * @property {SyncResult} result
 */

/**
 * @typedef {Object} DynamicPattern
 * @property {string} file
 * @property {string} pattern
 */

/**
 * @typedef {Object} OrphanResult
 * @property {boolean} success
 * @property {number} exitCode
 * @property {Array<string>} orphanKeys
 * @property {Array<string>} usedKeys
 * @property {Array<string>} allKeys
 * @property {Array<DynamicPattern>} dynamicPatterns
 */

/**
 * @typedef {Object} TranslateResult
 * @property {boolean} success
 * @property {number} translated
 * @property {number} failed
 */

/**
 * @typedef {Object} ModifiedFile
 * @property {string} file
 * @property {number} count
 */

/**
 * @typedef {Object} ApplyResult
 * @property {boolean} success
 * @property {boolean} aborted
 * @property {number} totalFiles
 * @property {number} totalReplacements
 * @property {Array<ModifiedFile>} modifiedFiles
 */

/**
 * @typedef {Object} Finding
 * @property {string} file
 * @property {number} line
 * @property {string} original
 * @property {string} key
 * @property {string} scope
 */

/**
 * @typedef {Object} ExitCodes
 * @property {number} success
 * @property {number} untranslated
 */

/**
 * @typedef {Object} TranslateOptions
 * @property {string} i18nDir
 * @property {Object} provider
 * @property {boolean} useDeepL
 * @property {string} email
 * @property {boolean} verbose
 * @property {boolean} dryRun
 * @property {Function} log
 */

/**
 * @typedef {Object} SyncOptions
 * @property {string} i18nDir
 * @property {string} format - 'nested' or 'flat'
 * @property {Function} log
 * @property {boolean} strict
 * @property {ExitCodes} exitCodes
 */

/**
 * @typedef {Object} OrphanOptions
 * @property {string} i18nDir
 * @property {string} srcDir
 * @property {string} format - 'nested' or 'flat'
 * @property {Array<string>} excludedFolders
 * @property {boolean} verbose
 * @property {boolean} strict
 * @property {Function} log
 * @property {ExitCodes} exitCodes
 */

/**
 * @typedef {Object} ApplyOptions
 * @property {string} srcDir
 * @property {string} backupDir
 * @property {Object} adapter
 * @property {boolean} backup
 * @property {boolean} dryRun
 * @property {boolean} verbose
 * @property {boolean} interactive
 * @property {Function} log
 */

/**
 * @typedef {Object} WatchOptions
 * @property {string} srcDir
 * @property {Array<string>} excludedFolders
 * @property {Function} onFileChange
 * @property {Function} onStart
 * @property {Function} log
 */

/**
 * @typedef {Object} FileContent
 * @property {string} template
 * @property {string} typescript
 * @property {string} type - 'component' or 'html'
 */

/**
 * @typedef {Object} ExtractedKey
 * @property {string} key
 * @property {string} original
 * @property {string} scope
 * @property {string} file
 * @property {number} line
 */

/**
 * @typedef {Object} ExtractResult
 * @property {Array<ExtractedKey>} findings
 * @property {Object<string, string>} keys
 * @property {number} filesScanned
 * @property {number} keysExtracted
 */

/**
 * @typedef {Object} FsAdapter
 * @property {Object} fs
 * @property {Object} fsp
 */

/**
 * @typedef {Object} PluginMeta
 * @property {string} description
 * @property {string} category
 */

/**
 * @typedef {Object} PluginOption
 * @property {string} flag
 * @property {string} description
 * @property {boolean} required
 */

/**
 * @typedef {Object} PluginEnv
 * @property {string} name
 * @property {string} description
 */

/**
 * @typedef {Object} Plugin
 * @property {string} name
 * @property {string} type - 'parser', 'adapter', or 'provider'
 * @property {PluginMeta} meta
 * @property {string} source - 'builtin', 'local', or 'npm'
 * @property {number} priority
 * @property {Array<string>} extensions
 * @property {Array<PluginOption>} options
 * @property {Array<PluginEnv>} env
 * @property {Array<string>} examples
 * @property {Function} detect
 * @property {Function} extract
 * @property {Function} transform
 * @property {Function} translate
 * @property {Function} translateBatch
 */

/**
 * @typedef {Object} PluginError
 * @property {string} source
 * @property {string} plugin
 * @property {string} error
 * @property {Array<string>} errors
 */

/**
 * @typedef {Object} PluginRegistry
 * @property {Array<Plugin>} parsers
 * @property {Array<Plugin>} adapters
 * @property {Array<Plugin>} providers
 * @property {Array<Plugin>} all
 * @property {Map<string, Plugin>} byName
 * @property {Array<PluginError>} errors
 */

/**
 * @typedef {Object} PluginValidation
 * @property {boolean} valid
 * @property {Array<string>} errors
 */

/**
 * @typedef {Object} DetectionContext
 * @property {DetectedTech} framework
 * @property {Array<DetectedTech>} libraries
 * @property {DetectedTech} i18n
 * @property {Object} packageJson
 */

/**
 * @typedef {Object} CommandOption
 * @property {string} flag
 * @property {string} description
 * @property {boolean} required
 */

/**
 * @typedef {Object} CommandMeta
 * @property {string} description
 * @property {string} category
 */

/**
 * @typedef {Object} Command
 * @property {string} name
 * @property {string} description
 * @property {string} category
 * @property {Array<string>} aliases
 * @property {Array<CommandOption>} options
 * @property {CommandMeta} meta
 * @property {Function} run
 */

module.exports = {};
