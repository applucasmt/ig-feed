// ============================================================
// ENDPOINT: /api/feed
// ============================================================
// Retorna posts do storage (NÃO toca no Instagram)
// Query params:
//   ?limit=12  (opcional - limita apenas a EXIBIÇÃO)
// ============================================================

import { getConfig } from '../src/config.js';
import { getAllPosts, getStorageMeta, initStorage } from '../src/storage.js';
import { applyCors, handlePreflight } from '../src/cors.js';
import { getCachedResponse, setCachedResponse } from '../src/cache.js';

export default async function handler(req, res) {
    // CORS
    try {
        const config = getConfig();
        applyCors(req, res, config.cors.allowedOrigins);
    } catch (e) {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }

    if (handlePreflight(req, res)) return;

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Use GET' });
    }

    let config;
    try {
        config = getConfig();
    } catch (e) {
        return res.status(500).json({ error: 'configuration_error' });
    }

    // Cache da resposta HTTP por 60 segundos
    const cached = getCachedResponse(60);
    if (cached) {
        return res.status(200).json({
            ...cached.data,
            cached: true,
            cacheAge: cached.age
        });
    }

    // Inicializa storage (lê do Redis se disponível)
    await initStorage();

    // Lê posts armazenados
    const allPosts = await getAllPosts();
    const meta = getStorageMeta();

    // Aplica limite de EXIBIÇÃO (não afeta o armazenamento!)
    const displayLimit = parseInt(req.query.limit) || 0;
    const posts = displayLimit > 0
        ? allPosts.slice(0, displayLimit)
        : allPosts;

    const response = {
        posts: posts,
        count: posts.length,
        totalStored: meta.totalPosts,
        lastSync: meta.lastSync,
        lastSyncAgo: meta.lastSyncAgo,
        persistent: meta.persistent,
        cached: false
    };

    setCachedResponse(response);

    return res.status(200).json(response);
}
