# i18nkit

![i18nkit](assets/logo-with-title.png)

[![npm](https://img.shields.io/npm/v/@abdess76/i18nkit.svg)](https://npmjs.com/package/@abdess76/i18nkit)
[![node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![zero-deps](https://img.shields.io/badge/dependencies-0-blue.svg)](package.json)
[![docs](https://img.shields.io/badge/API-docs-blue.svg)](https://abdess.github.io/i18nkit/)

---

Universal i18n toolkit: extract translation keys, sync language files, detect
missing translations. Zero dependencies, extensible via plugins.

## Why i18nkit?

Managing translations is tedious: find hardcoded strings, create translation
keys, keep language files in sync. **i18nkit automates it.**

| Problem                          | Solution                       |
| -------------------------------- | ------------------------------ |
| Hardcoded strings in templates   | Auto-extract translatable text |
| Manual pipe/function replacement | Auto-apply in one command      |
| Missing translations across lang | Sync check with CI integration |
| Unused keys bloating bundles     | Orphan detection to clean up   |
| Manual translation copy-paste    | API translation (free + pro)   |

## Current Support

- **Angular + Transloco** - Full support out of the box
- **PrimeNG components** - Auto-extraction of translatable attributes

Extensible via plugins for other frameworks and libraries.

## Quick Start

### 1. Install

```bash
npm install --save-dev @abdess76/i18nkit
```

### 2. Add scripts to package.json

```json
{
  "scripts": {
    "i18n": "i18nkit --lang fr --merge",
    "i18n:apply": "i18nkit --auto-apply --init-langs en,fr",
    "i18n:check": "i18nkit --check-sync --strict",
    "i18n:orphans": "i18nkit --find-orphans --strict",
    "i18n:translate": "i18nkit --translate en:fr",
    "i18n:watch": "i18nkit --watch",
    "i18n:ci": "npm run i18n:check && npm run i18n:orphans"
  }
}
```

### 3. Run

```bash
# First time: extract + apply + create language files
npm run i18n:apply

# Development: watch mode
npm run i18n:watch

# Before commit / CI
npm run i18n:ci
```

## How It Works

**Before:**

```html
<h1>Welcome to our app</h1>
<button label="Submit" />
<input placeholder="Enter your name" />
```

**After:**

```html
<h1>{{ 'home.titles.welcome_to_our_app' | transloco }}</h1>
<button [label]="'home.buttons.submit' | transloco" />
<input [placeholder]="'home.forms.enter_your_name' | transloco" />
```

**Generated `en.json`:**

```json
{
  "home": {
    "titles": { "welcome_to_our_app": "Welcome to our app" },
    "buttons": { "submit": "Submit" },
    "forms": { "enter_your_name": "Enter your name" }
  }
}
```

## Commands

### Core Commands

| Command        | Description                              |
| -------------- | ---------------------------------------- |
| `extract`      | Extract i18n strings from source files   |
| `check-sync`   | Compare language files for missing keys  |
| `find-orphans` | Find translation keys not used in source |
| `translate`    | Translate a language file via API        |
| `watch`        | Watch for file changes and re-run        |
| `backup`       | Manage backup sessions and restore files |

### NPM Scripts Examples

| Script                   | Command                     | Description                  |
| ------------------------ | --------------------------- | ---------------------------- |
| `npm run i18n`           | `--lang fr --merge`         | Extract, merge with existing |
| `npm run i18n:apply`     | `--auto-apply --init-langs` | Extract + replace + create   |
| `npm run i18n:check`     | `--check-sync --strict`     | Validate files are in sync   |
| `npm run i18n:orphans`   | `--find-orphans --strict`   | Find unused keys             |
| `npm run i18n:translate` | `--translate en:fr`         | Translate via API            |
| `npm run i18n:watch`     | `--watch`                   | Re-run on file changes       |

## Configuration

Create `i18nkit.config.js` in your project root:

```javascript
module.exports = {
  src: 'src/app',
  i18nDir: 'src/assets/i18n',
  lang: 'fr',
  format: 'nested',
  backup: true,
  excludedFolders: ['node_modules', 'dist', '.git'],
};
```

Or `i18nkit.config.json`:

```json
{
  "src": "src/app",
  "i18nDir": "src/assets/i18n",
  "lang": "fr",
  "format": "nested"
}
```

## Supported Patterns

### HTML Templates

| Pattern      | Example                            |
| ------------ | ---------------------------------- |
| Text content | `<h1>Welcome</h1>`                 |
| Attributes   | `alt`, `title`, `placeholder`      |
| Angular 17+  | `@if`, `@for`, `@switch`, `@defer` |

### Component Libraries

| Library          | Extracted Attributes         |
| ---------------- | ---------------------------- |
| PrimeNG          | `label`, `tooltip`, `header` |
| Angular Material | `placeholder`, `label`       |
| Bootstrap        | `title`, `alt`               |

## Translation APIs

```bash
# Free: MyMemory API
npm run i18n:translate

# Free with higher rate limit
npx i18nkit --translate fr:en --email you@example.com

# Pro: DeepL API (best quality)
DEEPL_API_KEY=xxx npx i18nkit --translate fr:en --deepl
```

## CI/CD Integration

### GitHub Actions

```yaml
name: i18n
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run i18n:ci
```

## Backup & Restore

Source files are backed up before modification. Full session management with
restore, cleanup, and audit capabilities.

### Automatic Backup

```bash
# Backup enabled by default with --auto-apply
npm run i18n:apply

# Disable backup if needed
npx i18nkit --auto-apply --no-backup

# Initialize backup structure explicitly
npx i18nkit --init-backups --auto-gitignore
```

### Session Structure

```text
.i18nkit/
├── .gitignore              # Auto-managed (excludes backups/, report.json)
├── report.json             # Current extraction report
└── backups/
    └── 2026-01-05_15-39-28_apply_ae9c/
        ├── manifest.json   # Session metadata with status tracking
        ├── report.json     # Archived extraction report
        └── src/            # Original source files
```

### Session Management

```bash
# List all backup sessions
npx i18nkit --list-backups

# Show detailed info for a session
npx i18nkit --backup-info 2026-01-05_15-39-28_apply_ae9c
```

### Restore from Backup

```bash
# Restore specific session
npx i18nkit --restore 2026-01-05_15-39-28_apply_ae9c

# Restore latest session
npx i18nkit --restore-latest

# Preview restore without applying
npx i18nkit --restore-latest --dry-run
```

### Manual Cleanup

```bash
# Clean old sessions (interactive)
npx i18nkit --cleanup-backups

# Keep only last 5 sessions
npx i18nkit --cleanup-backups --keep 5

# Remove sessions older than 7 days
npx i18nkit --cleanup-backups --max-age 7

# Combine options
npx i18nkit --cleanup-backups --keep 3 --max-age 14
```

### Auto-Cleanup Configuration

Old sessions are automatically cleaned up based on configuration.

```javascript
// i18nkit.config.js
module.exports = {
  backup: {
    enabled: true,
    maxSessions: 10, // Keep max 10 sessions
    retentionDays: 30, // Delete sessions older than 30 days
    autoCleanup: true, // Auto-cleanup on each run
  },
};
```

### Session Status

Sessions track their lifecycle status:

| Status        | Description                      |
| ------------- | -------------------------------- |
| `pending`     | Session created, not started     |
| `backing_up`  | Backup in progress               |
| `in_progress` | Apply operation running          |
| `completed`   | Successfully finished            |
| `failed`      | Error occurred (check manifest)  |
| `restored`    | Files restored from this session |

## Key Mapping

Override auto-generated keys with `.i18n-keys.json`:

```json
{
  "Welcome to our app": "common.welcome",
  "Submit": "buttons.submit",
  "Cancel": "buttons.cancel"
}
```

## Plugin System

i18nkit is built to be extended. Create plugins for any framework, library, or
translation service.

| Plugin Type  | Purpose                    | Example Use Case   |
| ------------ | -------------------------- | ------------------ |
| **parser**   | Extract strings from files | Vue, Svelte, React |
| **adapter**  | Transform to i18n syntax   | i18next, vue-i18n  |
| **provider** | Translate via API          | Google, AWS, Azure |

### Quick Example

```javascript
// plugins/my-parser.js
module.exports = {
  name: 'parser-vue',
  type: 'parser',
  meta: { description: 'Extract from Vue SFC' },
  extensions: ['.vue'],
  detect: ctx => ctx.pkg.dependencies?.['vue'],
  extract(content) {
    return [{ text: 'Hello', context: 'greeting' }];
  },
};
```

```javascript
// i18nkit.config.js
module.exports = {
  plugins: ['./plugins/my-parser.js'],
};
```

**Full guide:** [PLUGINS.md](PLUGINS.md)

### Community Plugins

Publish your plugin to npm:

```bash
npm publish i18nkit-parser-svelte
```

i18nkit auto-discovers packages named `i18nkit-*` or `@yourorg/i18nkit-*`.

**Want to contribute?** Check [builtin plugins](bin/plugins/) for reference
implementations.

## Options

### Global Options

```text
--config <path>       Path to config file (default: i18nkit.config.js)
--src <path>          Source directory (default: src/app)
--locales <path>      Locales directory (default: src/assets/i18n)
--default-lang <code> Default language (default: fr)
--dry-run             Preview changes without writing
--verbose             Detailed output
--help, -h            Show help
--version, -v         Show version
```

### Extraction Options

```text
--lang <code>         Language code for output file
--format <type>       Output format: nested | flat (default: nested)
--merge               Merge with existing translations
--auto-apply          Extract AND apply pipes in one command
--init-langs <codes>  Create language files (e.g., en,fr,es)
--include-translated  Include already translated strings
--extract-ts-objects  Extract from TypeScript object literals
--skip-translated     Skip already translated strings (default: true)
```

### Validation Options

```text
--check-sync          Compare language files for missing keys
--find-orphans        Find unused translation keys
--strict              Exit with error code 1 on issues
--ci                  CI mode (strict + json output)
```

### Translation Options

```text
--translate <src:tgt> Translate via API (e.g., fr:en)
--deepl               Use DeepL API (requires DEEPL_API_KEY)
--mymemory            Use MyMemory API (default)
--email <email>       Email for MyMemory rate limits
```

### Backup Options

```text
--backup              Enable backup before modifications (default)
--no-backup           Disable backup
--list-backups        List all backup sessions
--backup-info <id>    Show backup session details
--restore [id]        Restore from backup (latest if no id)
--restore-latest      Restore from most recent backup
--cleanup-backups     Remove old backup sessions
--keep <n>            Keep last n sessions (default: 10)
--max-age <days>      Max session age in days (default: 30)
--init-backups        Initialize backup directory structure
--auto-gitignore      Auto-add .i18nkit to .gitignore
```

### Watch Options

```text
--watch               Watch mode for file changes
```

## Exit Codes

| Code | Meaning                                            |
| ---- | -------------------------------------------------- |
| 0    | Success                                            |
| 1    | Missing translations or sync problems (`--strict`) |
| 2    | Error (file not found, parse error)                |

## API Documentation

Full API reference:
[abdess.github.io/i18nkit](https://abdess.github.io/i18nkit/)

## Requirements

- Node.js >= 22.0.0

## Contributing

i18nkit welcomes community contributions:

- **Plugins** - Create parsers for new frameworks, adapters for i18n libraries,
  or providers for translation APIs
- **Bug reports** - Open an issue with reproduction steps
- **Feature requests** - Suggest improvements via GitHub issues

See [PLUGINS.md](PLUGINS.md) for the plugin development guide.

## License

MIT

---

[GitHub](https://github.com/Abdess/i18nkit) ·
[npm](https://npmjs.com/package/@abdess76/i18nkit) ·
[Issues](https://github.com/Abdess/i18nkit/issues) · [Plugin Guide](PLUGINS.md)
