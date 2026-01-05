'use strict';

const DEEPL_FREE_ENDPOINT = 'https://api-free.deepl.com/v2/translate';
const DEEPL_PRO_ENDPOINT = 'https://api.deepl.com/v2/translate';

function getEndpoint(apiKey) {
  return apiKey.endsWith(':fx') ? DEEPL_FREE_ENDPOINT : DEEPL_PRO_ENDPOINT;
}

function getApiKey(options) {
  const apiKey = options.apiKey || process.env.DEEPL_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPL_API_KEY environment variable required for DeepL provider');
  }
  return apiKey;
}

function buildDeepLRequest(texts, ctx) {
  return {
    method: 'POST',
    headers: { Authorization: `DeepL-Auth-Key ${ctx.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: texts,
      source_lang: ctx.fromLang.toUpperCase(),
      target_lang: ctx.toLang.toUpperCase(),
    }),
  };
}

async function doTranslateBatch(ctx) {
  const { texts, fromLang, toLang, options = {} } = ctx;
  const apiKey = getApiKey(options);
  const response = await fetch(
    getEndpoint(apiKey),
    buildDeepLRequest(texts, { fromLang, toLang, apiKey }),
  );
  if (!response.ok) {
    throw new Error(`DeepL API error: ${response.status} - ${await response.text()}`);
  }
  const data = await response.json();
  return data.translations.map(t => t.text);
}

async function translate(ctx) {
  const { text, fromLang, toLang, options = {} } = ctx;
  const result = await doTranslateBatch({ texts: [text], fromLang, toLang, options });
  return result[0];
}

async function translateBatch(ctx) {
  const { texts, fromLang, toLang, options = {} } = ctx;
  const translated = await doTranslateBatch({ texts, fromLang, toLang, options });
  return {
    translationMap: new Map(texts.map((t, i) => [t, translated[i]])),
    failedCount: 0,
  };
}

module.exports = {
  name: 'provider-deepl',
  type: 'provider',

  meta: {
    description: 'High-quality translation via DeepL API (requires API key)',
    version: '1.0.0',
  },

  options: [{ flag: '--deepl', type: 'boolean', description: 'Use DeepL API instead of MyMemory' }],

  env: [{ name: 'DEEPL_API_KEY', required: true, description: 'DeepL API key (free or pro)' }],

  examples: [
    'DEEPL_API_KEY=xxx i18nkit translate fr:en --deepl',
    'i18nkit translate fr:en --deepl',
  ],

  translate,
  translateBatch,
};
