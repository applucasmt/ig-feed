// ============================================================
// CACHE SIMPLES EM MEMÓRIA (para respostas HTTP)
// ============================================================
// Este cache é diferente do storage: ele guarda a RESPOSTA
// do endpoint /api/feed por N segundos para não recalcular
// a cada requisição.

let cache = {
    data: null,
    timestamp: 0,
    hits: 0,
    misses: 0
};

export function getCachedResponse(maxAge) {
    const age = (Date.now() - cache.timestamp) / 1000;
    if (cache.data && age < maxAge) {
        cache.hits++;
        return { data: cache.data, age: Math.floor(age) };
    }
    cache.misses++;
    return null;
}

export function setCachedResponse(data) {
    cache.data = data;
    cache.timestamp = Date.now();
}

export function getCacheStats() {
    return {
        hits: cache.hits,
        misses: cache.misses,
        hasData: Boolean(cache.data),
        age: cache.timestamp
            ? Math.floor((Date.now() - cache.timestamp) / 1000)
            : null
    };
}

export function clearCache() {
    cache.data = null;
    cache.timestamp = 0;
}
