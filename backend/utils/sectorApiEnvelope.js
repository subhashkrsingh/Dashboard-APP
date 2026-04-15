function toOptionalBoolean(value) {
  return typeof value === "boolean" ? value : undefined;
}

function isObject(value) {
  return typeof value === "object" && value !== null;
}

function buildSuccessEnvelope(result = {}) {
  const payload = isObject(result) && Object.prototype.hasOwnProperty.call(result, "data") ? result.data : result;
  const payloadObject = isObject(payload) ? payload : null;
  const useCache =
    toOptionalBoolean(result.useCache) ??
    toOptionalBoolean(result.cached) ??
    toOptionalBoolean(payloadObject?.useCache) ??
    toOptionalBoolean(payloadObject?.cached) ??
    (result.cache?.source ? result.cache.source !== "live" : payloadObject?.source === "cache");
  const stale =
    toOptionalBoolean(result.stale) ??
    toOptionalBoolean(payloadObject?.stale) ??
    toOptionalBoolean(payloadObject?.isStale) ??
    toOptionalBoolean(result.cache?.isStale) ??
    false;
  const timestamp =
    result.timestamp ?? result.cache?.timestamp ?? (typeof payloadObject?.fetchedAt === "string" ? payloadObject.fetchedAt : Date.now());
  const source = result.cache?.source ?? payloadObject?.source ?? (useCache ? "cache" : "live");
  const normalizedData = payloadObject
    ? {
        ...payloadObject,
        cached: toOptionalBoolean(payloadObject.cached) ?? useCache,
        useCache: toOptionalBoolean(payloadObject.useCache) ?? useCache,
        stale: toOptionalBoolean(payloadObject.stale) ?? stale,
        isStale: toOptionalBoolean(payloadObject.isStale) ?? stale
      }
    : payload;
  const cacheMeta = {
    cached: useCache,
    stale,
    timestamp,
    source,
    isStale: stale
  };

  return {
    success: true,
    data: normalizedData,
    useCache,
    cached: useCache,
    stale,
    timestamp,
    cacheMeta,
    _cache: {
      ...(isObject(result.cache) ? result.cache : {}),
      cached: useCache,
      stale,
      timestamp,
      source,
      isStale: stale
    }
  };
}

function buildErrorEnvelope({ error, code, message, details } = {}) {
  return {
    success: false,
    error: error ?? code ?? "REQUEST_FAILED",
    message: message ?? "Request failed.",
    ...(isObject(details) ? details : {})
  };
}

module.exports = {
  buildSuccessEnvelope,
  buildErrorEnvelope
};
