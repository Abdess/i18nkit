'use strict';

const MAX_TEXT_LENGTH = 500;
const API_BATCH_SIZE = 5;
const API_DELAY_MS = 100;

const translationCache = new Map();

const buildLangPair = (src, tgt) => `${src}|${tgt}`;
const buildCacheKey = (from, to, text) => `${from}:${to}:${text}`;

function buildMyMemoryUrl(ctx) {
  const { text, sourceLang, targetLang, email } = ctx;
  const base = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${buildLangPair(sourceLang, targetLang)}`;
  return email ? `${base}&de=${encodeURIComponent(email)}` : base;
}

function checkResponseStatus(data) {
  if (data.responseStatus !== 200) {
    throw new Error(data.responseDetails || 'Unknown error');
  }
}

function validateMyMemoryResponse(data) {
  if (!data?.responseData?.translatedText) {
    throw new Error('Invalid API response');
  }
  checkResponseStatus(data);
  return data.responseData.translatedText;
}

function getCachedOrNull(cacheKey) {
  return translationCache.has(cacheKey) ? translationCache.get(cacheKey) : null;
}

async function fetchTranslation(ctx) {
  const { text, fromLang, toLang, email } = ctx;
  const url = buildMyMemoryUrl({ text, sourceLang: fromLang, targetLang: toLang, email });
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return validateMyMemoryResponse(await response.json());
}

function handleTextTooLong(text, maxLength, verbose) {
  if (verbose) {
    console.log(`  [WARN] Text too long (${text.length} chars), keeping original`);
  }
  return text;
}

function handleTranslationError(error, text, verbose) {
  if (verbose) {
    console.log(`  [WARN] Translation failed: ${error.message}`);
  }
  return text;
}

function parseTranslateOptions(options = {}) {
  return {
    email: options.email || null,
    verbose: options.verbose || false,
    maxLength: options.maxLength || MAX_TEXT_LENGTH,
  };
}

async function doTranslate(ctx) {
  const { text, fromLang, toLang, email } = ctx;
  const result = await fetchTranslation({ text, fromLang, toLang, email });
  translationCache.set(buildCacheKey(fromLang, toLang, text), result);
  return result;
}

async function translate(ctx) {
  const { text, fromLang, toLang, options = {} } = ctx;
  const opts = parseTranslateOptions(options);
  if (text.length > opts.maxLength) {
    return handleTextTooLong(text, opts.maxLength, opts.verbose);
  }
  const cached = getCachedOrNull(buildCacheKey(fromLang, toLang, text));
  if (cached) {
    return cached;
  }
  try {
    return await doTranslate({ text, fromLang, toLang, email: opts.email });
  } catch (error) {
    return handleTranslationError(error, text, opts.verbose);
  }
}

function processBatchResult(ctx) {
  const { result, original, translationMap, verbose = false } = ctx;
  if (result.status === 'fulfilled') {
    translationMap.set(original, result.value);
    return false;
  }
  translationMap.set(original, original);
  if (verbose) {
    console.warn(`  [WARN] Failed: "${original.substring(0, 30)}..."`);
  }
  return true;
}

async function processBatch(batch, ctx) {
  const { fromLang, toLang, translationMap, options = {} } = ctx;
  const results = await Promise.allSettled(
    batch.map(text => translate({ text, fromLang, toLang, options })),
  );
  let failures = 0;
  results.forEach((result, j) => {
    if (
      processBatchResult({ result, original: batch[j], translationMap, verbose: options.verbose })
    ) {
      failures++;
    }
  });
  return failures;
}

function notifyProgress(onProgress, processed, total) {
  if (onProgress) {
    onProgress(processed, total);
  }
}

async function delayIfNeeded(processed, total, delayMs) {
  if (processed < total) {
    await new Promise(resolve => {
      setTimeout(resolve, delayMs);
    });
  }
}

function parseBatchOptions(options = {}) {
  return {
    batchSize: options.batchSize || API_BATCH_SIZE,
    delayMs: options.delayMs || API_DELAY_MS,
    onProgress: options.onProgress || null,
  };
}

async function processBatchIteration(ctx) {
  const { batch, batchCtx, opts, texts, i } = ctx;
  const failures = await processBatch(batch, batchCtx);
  const processed = Math.min(i + opts.batchSize, texts.length);
  notifyProgress(opts.onProgress, processed, texts.length);
  await delayIfNeeded(processed, texts.length, opts.delayMs);
  return failures;
}

async function translateBatch(ctx) {
  const { texts, fromLang, toLang, options = {} } = ctx;
  const opts = parseBatchOptions(options);
  const translationMap = new Map();
  let failedCount = 0;
  const batchCtx = { fromLang, toLang, translationMap, options };
  for (let i = 0; i < texts.length; i += opts.batchSize) {
    failedCount += await processBatchIteration({
      batch: texts.slice(i, i + opts.batchSize),
      batchCtx,
      opts,
      texts,
      i,
    });
  }
  return { translationMap, failedCount };
}

module.exports = {
  name: 'provider-mymemory',
  type: 'provider',

  meta: {
    description: 'Free translation via MyMemory API (rate limited)',
    version: '1.0.0',
  },

  options: [
    { flag: '--mymemory', type: 'boolean', description: 'Use MyMemory API (default provider)' },
    { flag: '--email <email>', type: 'string', description: 'Email for higher rate limits' },
  ],

  env: [
    { name: 'MYMEMORY_EMAIL', required: false, description: 'Email for higher API rate limits' },
  ],

  examples: ['i18nkit translate fr:en', 'i18nkit translate fr:en --email user@example.com'],

  translate: ctx => translate(ctx),
  translateBatch: ctx => translateBatch(ctx),
};
