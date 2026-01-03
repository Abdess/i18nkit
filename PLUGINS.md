# i18nkit Plugin Development Guide

Create custom plugins to extend i18nkit for any framework, library, or
translation service.

## Plugin Types

| Type         | Purpose                                        | Required Method                     |
| ------------ | ---------------------------------------------- | ----------------------------------- |
| **parser**   | Extract translatable strings from source files | `extract()`                         |
| **adapter**  | Transform source code to use i18n syntax       | `transform()`                       |
| **provider** | Translate text via external API                | `translate()` or `translateBatch()` |

## Quick Start

```javascript
// plugins/my-parser.js
module.exports = {
  name: 'my-parser',
  type: 'parser',
  meta: { description: 'Extract strings from .xyz files' },
  extensions: ['.xyz'],
  extract(content, filePath, options) {
    return [{ text: 'Hello', context: 'greeting' }];
  },
};
```

Register in config:

```javascript
// i18nkit.config.js
module.exports = {
  plugins: ['./plugins/my-parser.js'],
};
```

---

## Parser Plugins

Extract translatable strings from source files.

### Parser Structure

```javascript
module.exports = {
  name: 'parser-xxx',
  type: 'parser',

  meta: {
    description: 'Human-readable description',
    version: '1.0.0',
  },

  extensions: ['.html', '.vue'],
  priority: 10,

  options: [
    {
      flag: '--skip-comments',
      type: 'boolean',
      description: 'Skip commented strings',
    },
  ],

  examples: ['i18nkit --extract --src src/app'],

  detect(ctx) {
    return ctx.pkg.dependencies?.['my-framework'];
  },

  extract(content, filePath, options) {
    return [
      { text: 'Hello World', context: 'greeting' },
      { text: 'Submit', context: 'buttons' },
    ];
  },
};
```

### extract() Method

**Signature:**
`extract(content: string, filePath: string, options?: object) => ExtractedItem[]`

**Parameters:**

- `content` - File content as string
- `filePath` - Absolute path to the file
- `options` - CLI options passed to the command

**Return:** Array of extracted items:

```javascript
{
  text: string,    // Translatable text
  context: string, // Category: 'buttons', 'labels', 'titles', etc.
  line?: number,   // Optional: line number
  attr?: string,   // Optional: attribute name ('placeholder', 'title')
}
```

### detect() Method

Auto-activate plugin when project matches criteria.

**Signature:** `detect(ctx: DetectionContext) => boolean`

```javascript
detect(ctx) {
  return ctx.pkg.dependencies?.['vue'] || ctx.files.includes('vite.config.js');
}
```

**Context object:**

- `ctx.pkg` - Parsed `package.json`
- `ctx.files` - List of files in project root
- `ctx.framework` - Detected framework (if any)

### Full Parser Example

```javascript
'use strict';

const PATTERNS = [
  { regex: /<template>([\s\S]*?)<\/template>/gi, context: 'template' },
  {
    regex: /\bplaceholder="([^"]+)"/gi,
    context: 'placeholders',
    attr: 'placeholder',
  },
  { regex: /\btitle="([^"]+)"/gi, context: 'titles', attr: 'title' },
];

function shouldSkip(text) {
  return !text.trim() || text.length < 2 || /^\d+$/.test(text);
}

function extractWithPatterns(content, patterns) {
  const results = [];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.regex.exec(content)) !== null) {
      const text = match[pattern.group || 1];
      if (!shouldSkip(text)) {
        results.push({
          text: text.trim(),
          context: pattern.context,
          attr: pattern.attr,
        });
      }
    }
  }
  return results;
}

module.exports = {
  name: 'parser-vue',
  type: 'parser',

  meta: {
    description: 'Extract i18n strings from Vue SFC templates',
    version: '1.0.0',
  },

  extensions: ['.vue'],
  priority: 10,

  detect(ctx) {
    return ctx.pkg.dependencies?.['vue'] || ctx.pkg.devDependencies?.['vue'];
  },

  extract(content, filePath, options = {}) {
    return extractWithPatterns(content, PATTERNS);
  },
};
```

---

## Adapter Plugins

Transform source code to use i18n function calls or pipes.

### Adapter Structure

```javascript
module.exports = {
  name: 'adapter-xxx',
  type: 'adapter',

  meta: {
    description: 'Transform to xxx syntax',
    version: '1.0.0',
  },

  detect(ctx) {
    return ctx.pkg.dependencies?.['xxx-i18n'];
  },

  transform(ctx) {
    const { content, rawText, key, context } = ctx;
    const newContent = content.replace(rawText, `$t('${key}')`);
    return { content: newContent, replacements: 1 };
  },

  updateImports(tsContent) {
    return tsContent;
  },
};
```

### transform() Method

**Signature:** `transform(ctx: TransformContext) => TransformResult`

**Context object:**

```javascript
{
  content: string,  // Current file content
  rawText: string,  // Original text to replace
  key: string,      // Generated translation key
  context: string,  // Context category
  filePath: string, // Path to file
}
```

**Return:**

```javascript
{
  content: string,     // Modified content
  replacements: number // Count of replacements made
}
```

### Full Adapter Example

```javascript
'use strict';

const ATTRS = ['placeholder', 'title', 'label', 'alt'];

function replaceAttribute(content, rawText, key, attr) {
  const search = `${attr}="${rawText}"`;
  if (!content.includes(search)) return { content, replaced: false };
  return {
    content: content.replace(search, `:${attr}="$t('${key}')"`),
    replaced: true,
  };
}

function replaceTextContent(content, rawText, key) {
  const regex = new RegExp(`>\\s*${escapeRegex(rawText)}\\s*<`, 'g');
  const newContent = content.replace(regex, `>{{ $t('${key}') }}<`);
  return { content: newContent, replaced: newContent !== content };
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  name: 'adapter-vue-i18n',
  type: 'adapter',

  meta: {
    description: 'Transform to vue-i18n $t() syntax',
    version: '1.0.0',
  },

  detect(ctx) {
    return ctx.pkg.dependencies?.['vue-i18n'];
  },

  transform(ctx) {
    const { content, rawText, key, context } = ctx;
    let result = { content, replacements: 0 };

    for (const attr of ATTRS) {
      const attrResult = replaceAttribute(result.content, rawText, key, attr);
      if (attrResult.replaced) {
        return { content: attrResult.content, replacements: 1 };
      }
    }

    const textResult = replaceTextContent(result.content, rawText, key);
    return {
      content: textResult.content,
      replacements: textResult.replaced ? 1 : 0,
    };
  },
};
```

---

## Provider Plugins

Translate text via external APIs.

### Provider Structure

```javascript
module.exports = {
  name: 'provider-xxx',
  type: 'provider',

  meta: {
    description: 'Translate via XXX API',
    version: '1.0.0',
  },

  options: [
    { flag: '--xxx', type: 'boolean', description: 'Use XXX provider' },
  ],

  env: [
    { name: 'XXX_API_KEY', required: true, description: 'API key for XXX' },
  ],

  examples: ['i18nkit translate fr:en --xxx'],

  translate(ctx) {},
  translateBatch(ctx) {},
};
```

### translate() Method

Translate a single string.

**Signature:** `translate(ctx: TranslateContext) => Promise<string>`

```javascript
{
  text: string,
  fromLang: string,
  toLang: string,
  options?: object,
}
```

### translateBatch() Method

Translate multiple strings efficiently.

**Signature:** `translateBatch(ctx: BatchContext) => Promise<BatchResult>`

```javascript
// Input
{
  texts: string[],
  fromLang: string,
  toLang: string,
  options?: object,
}

// Output
{
  translationMap: Map<string, string>,
  failedCount: number,
}
```

### Full Provider Example

```javascript
'use strict';

const API_URL = 'https://api.example.com/translate';

function getApiKey() {
  const key = process.env.EXAMPLE_API_KEY;
  if (!key) throw new Error('EXAMPLE_API_KEY environment variable required');
  return key;
}

async function callApi(texts, fromLang, toLang) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ texts, source: fromLang, target: toLang }),
  });

  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = await response.json();
  return data.translations;
}

module.exports = {
  name: 'provider-example',
  type: 'provider',

  meta: {
    description: 'Translate via Example API',
    version: '1.0.0',
  },

  options: [
    { flag: '--example', type: 'boolean', description: 'Use Example provider' },
  ],

  env: [
    { name: 'EXAMPLE_API_KEY', required: true, description: 'Example API key' },
  ],

  examples: ['EXAMPLE_API_KEY=xxx i18nkit translate fr:en --example'],

  async translate(ctx) {
    const { text, fromLang, toLang } = ctx;
    const results = await callApi([text], fromLang, toLang);
    return results[0];
  },

  async translateBatch(ctx) {
    const { texts, fromLang, toLang } = ctx;
    const translationMap = new Map();
    let failedCount = 0;

    try {
      const results = await callApi(texts, fromLang, toLang);
      texts.forEach((text, i) => translationMap.set(text, results[i]));
    } catch (error) {
      texts.forEach(text => translationMap.set(text, text));
      failedCount = texts.length;
    }

    return { translationMap, failedCount };
  },
};
```

---

## Plugin Loading

### Loading Order

1. **Builtin** - `<package>/bin/plugins/`
2. **Local** - `.i18n/plugins/` in project root
3. **npm** - Packages named `i18nkit-*` or `@i18nkit/*`

### Priority System

Higher priority = executed first. Default: `10`.

```javascript
module.exports = {
  name: 'my-parser',
  priority: 20,
};
```

### Config Loading

```javascript
// i18nkit.config.js
module.exports = {
  plugins: [
    './plugins/local-parser.js',
    'i18nkit-parser-svelte',
    '@myorg/i18nkit-provider-aws',
  ],
};
```

---

## Publishing to npm

### Package Naming

- `i18nkit-parser-xxx`
- `i18nkit-adapter-xxx`
- `i18nkit-provider-xxx`
- `@yourorg/i18nkit-*`

### package.json

```json
{
  "name": "i18nkit-parser-svelte",
  "version": "1.0.0",
  "description": "Svelte parser for i18nkit",
  "main": "index.js",
  "keywords": ["i18nkit", "i18n", "parser", "svelte"],
  "peerDependencies": {
    "i18nkit": ">=1.0.0"
  }
}
```

### Directory Structure

```text
i18nkit-parser-svelte/
├── index.js
├── package.json
├── README.md
└── test/
    └── parser.test.js
```

---

## Validation

Plugins are validated on load. Requirements:

| Field                           | Required | Type                                |
| ------------------------------- | -------- | ----------------------------------- |
| `name`                          | Yes      | string                              |
| `type`                          | Yes      | 'parser' \| 'adapter' \| 'provider' |
| `meta.description`              | Yes      | string                              |
| `extract`                       | parser   | function                            |
| `transform`                     | adapter  | function                            |
| `translate` or `translateBatch` | provider | function                            |

Invalid plugins log a warning and are skipped.

---

## Testing Plugins

```javascript
const { describe, it } = require('node:test');
const assert = require('node:assert');
const myParser = require('./my-parser');

describe('my-parser', () => {
  it('should have required fields', () => {
    assert.strictEqual(myParser.name, 'my-parser');
    assert.strictEqual(myParser.type, 'parser');
    assert.ok(myParser.meta?.description);
    assert.strictEqual(typeof myParser.extract, 'function');
  });

  it('should extract strings', () => {
    const content = '<h1>Hello World</h1>';
    const results = myParser.extract(content, 'test.html');
    assert.ok(results.length > 0);
    assert.strictEqual(results[0].text, 'Hello World');
  });
});
```

Run with:

```bash
node --test test/parser.test.js
```

---

## Builtin Plugins

Reference implementations in `bin/plugins/`:

| Plugin              | Type     | Description                  |
| ------------------- | -------- | ---------------------------- |
| `parser-angular`    | parser   | Angular HTML templates       |
| `parser-primeng`    | parser   | PrimeNG component attributes |
| `parser-typescript` | parser   | TypeScript string literals   |
| `adapter-transloco` | adapter  | Transloco pipe syntax        |
| `provider-mymemory` | provider | Free MyMemory API            |
| `provider-deepl`    | provider | DeepL API (pro)              |
