// ============================================================
// ENDPOINT: /api/refresh
// ============================================================
// Força sincronização imediata (ignora cache HTTP)
// ============================================================

import { getConfig } from '../src/config.js';
import { runSync } from '../src/sync.js';
import { clearCache } from '../src/cache.js';
import { clearStorage } from '../src/storage.js';
import { applyCors, handlePreflight } from '../src/cors.js';

export default async function handler(req, res) {
    try {
        const config = getConfig();
        applyCors(req, res, config.cors.allowedOrigins);
    } catch (e) {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }

    if (handlePreflight(req, res)) return;

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Use POST' });
    }

    const config = getConfig();
    const authHeader = req.headers.authorization || '';
    const providedKey = authHeader.replace('Bearer ', '').trim();

    if (!config.admin.apiKey || providedKey !== config.admin.apiKey) {
        return res.status(401).json({ error: 'unauthorized' });
    }

    // Limpa cache HTTP
    clearCache();

    // Se ?wipe=true, apaga todo o storage antes de sincronizar
    if (req.query.wipe === 'true') {
        await clearStorage();
    }

    const result = await runSync(config);

    return res.status(result.success ? 200 : 500).json(result);
}
