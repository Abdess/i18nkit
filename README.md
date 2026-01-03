# i18nkit

![i18nkit](assets/logo-with-title.png)

[![npm](https://img.shields.io/npm/v/i18nkit.svg)](https://npmjs.com/package/i18nkit)
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
npm install --save-dev i18nkit
```

### 2. Add scripts to package.json

```json
{
  "scripts": {
    "i18n": "i18nkit --lang fr --merge",
    "i18n:apply": "i18nkit --auto-apply --init-langs en,fr",
    "i18n:check": "i18nkit --check-sync --strict",
    "i18n:orphans": "i18nkit --find-orphans --strict",
    "i18n:translate": "i18nkit --translate fr:en",
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

**Generated `fr.json`:**

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

| Script                   | Command                     | Description                  |
| ------------------------ | --------------------------- | ---------------------------- |
| `npm run i18n`           | `--lang fr --merge`         | Extract, merge with existing |
| `npm run i18n:apply`     | `--auto-apply --init-langs` | Extract + replace + create   |
| `npm run i18n:check`     | `--check-sync --strict`     | Validate files are in sync   |
| `npm run i18n:orphans`   | `--find-orphans --strict`   | Find unused keys             |
| `npm run i18n:translate` | `--translate fr:en`         | Translate via API            |
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

```text
--src <path>          Source directory (default: src/app)
--i18n-dir <path>     i18n directory (default: src/assets/i18n)
--lang <code>         Language code
--format <type>       nested | flat (default: nested)
--merge               Merge with existing translations
--auto-apply          Extract and apply pipes
--init-langs <codes>  Create language files (e.g., en,fr,es)
--check-sync          Compare language files
--find-orphans        Find unused keys
--translate <src:tgt> Translate via API (e.g., fr:en)
--deepl               Use DeepL API
--watch               Watch mode
--dry-run             Preview only
--strict              Exit 1 on issues
--ci                  CI mode (strict + json output)
--verbose             Detailed output
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
[npm](https://npmjs.com/package/i18nkit) ·
[Issues](https://github.com/Abdess/i18nkit/issues) ·
[Plugin Guide](PLUGINS.md)
