'use strict';

const TRANSLATABLE_ATTRS = [
  'placeholder',
  'pTooltip',
  'tooltip',
  'title',
  'label',
  'header',
  'emptyMessage',
  'emptyFilterMessage',
  'summary',
  'detail',
  'message',
  'acceptLabel',
  'rejectLabel',
  'chooseLabel',
  'uploadLabel',
  'cancelLabel',
  'prefix',
  'suffix',
  'defaultLabel',
  'selectedItemsLabel',
  'text',
  'value',
];

const ATTR_REPLACEMENT_MAP = Object.fromEntries(
  TRANSLATABLE_ATTRS.map(attr => [attr, attr === 'aria-label' ? 'attr.aria-label' : attr]),
);

const TAG_CONTENT_RE =
  /(<(?:h[1-6]|p|span|div|li|td|th|a|button|label|option)[^>]*>)\s*([^<]+?)\s*(<\/(?:h[1-6]|p|span|div|li|td|th|a|button|label|option)>)/gi;

const hasTranslocoPipe = content => /\bTranslocoPipe\b/.test(content);
const hasTranslocoImport = content => /@jsverse\/transloco/.test(content);

function addToExistingImport(content) {
  return content.replace(
    /import\s*\{([^}]+)\}\s*from\s*['"]@jsverse\/transloco['"]/,
    (match, imports) => {
      const importList = imports.split(',').map(s => s.trim());
      if (!importList.includes('TranslocoPipe')) {
        importList.push('TranslocoPipe');
      }
      return `import { ${importList.join(', ')} } from '@jsverse/transloco'`;
    },
  );
}

function addNewTranslocoImport(content) {
  const lastImportMatch = content.match(/^(import\s+.+from\s+['"][^'"]+['"];?\s*\n)/gm);
  if (!lastImportMatch) {
    return content;
  }
  const lastImport = lastImportMatch.at(-1);
  const insertPos = content.lastIndexOf(lastImport) + lastImport.length;
  return `${content.slice(0, insertPos)}import { TranslocoPipe } from '@jsverse/transloco';\n${content.slice(insertPos)}`;
}

function addPipeToImportsArray(content) {
  return content.replace(/imports\s*:\s*\[([^\]]+)\]/, (match, imports) => {
    const importList = imports
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    if (!importList.includes('TranslocoPipe')) {
      importList.push('TranslocoPipe');
    }
    return `imports: [${importList.join(', ')}]`;
  });
}

function addTranslocoPipeImport(content) {
  if (hasTranslocoPipe(content)) {
    return content;
  }
  const withImport =
    hasTranslocoImport(content) ? addToExistingImport(content) : addNewTranslocoImport(content);
  return addPipeToImportsArray(withImport);
}

function replaceAttributes(content, rawText, translocoExpr) {
  let result = content;
  let replacements = 0;
  for (const attr of TRANSLATABLE_ATTRS) {
    const search = `${attr}="${rawText}"`;
    if (!result.includes(search)) {
      continue;
    }
    const bindAttr = ATTR_REPLACEMENT_MAP[attr] ?? attr;
    result = result.replaceAll(search, `[${bindAttr}]=${translocoExpr}`);
    replacements++;
  }
  return { content: result, replacements };
}

function buildTagReplacement(parts, rawText, key) {
  const [, open, text, close] = parts;
  return text.trim() === rawText ? `${open}{{ '${key}' | transloco }}${close}` : parts[0];
}

function replaceTagContent(content, rawText, key) {
  const result = content.replace(TAG_CONTENT_RE, (...parts) =>
    buildTagReplacement(parts, rawText, key),
  );
  return { content: result, replaced: result !== content };
}

function transformTemplate(ctx) {
  const { content, rawText, key } = ctx;
  const translocoExpr = `"'${key}' | transloco"`;
  const result = replaceAttributes(content, rawText, translocoExpr);

  if (result.replacements === 0) {
    const tagResult = replaceTagContent(result.content, rawText, key);
    return { content: tagResult.content, replacements: tagResult.replaced ? 1 : 0 };
  }
  return result;
}

module.exports = {
  name: 'adapter-transloco',
  type: 'adapter',

  meta: {
    description: 'Transform extracted strings to Transloco pipe syntax',
    version: '1.0.0',
  },

  examples: ['i18nkit --extract --apply (uses Transloco syntax)'],

  detect(ctx) {
    return (
      ctx.pkg.dependencies?.['@jsverse/transloco'] || ctx.pkg.dependencies?.['@ngneat/transloco']
    );
  },

  TRANSLATABLE_ATTRS,
  ATTR_REPLACEMENT_MAP,

  transform(ctx) {
    const { content, rawText, key, context } = ctx;
    if (context?.startsWith('ts_')) {
      return { content, replacements: 0 };
    }
    return transformTemplate({ content, rawText, key });
  },

  updateImports(tsContent) {
    return addTranslocoPipeImport(tsContent);
  },

  addTranslocoPipeImport,
  replaceAttributes,
  replaceTagContent,
};
