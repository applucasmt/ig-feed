// ============================================================
// ENDPOINT: /api/status
// ============================================================
// Status do sistema para o painel admin
// ============================================================

import { getConfig, isInstagramConfigured, isUpstashConfigured } from '../src/config.js';
import { validateToken } from '../src/instagram.js';
import { getStorageMeta } from '../src/storage.js';
import { getCacheStats } from '../src/cache.js';
import { applyCors, handlePreflight } from '../src/cors.js';

export default async function handler(req, res) {
    try {
        const config = getConfig();
        applyCors(req, res, config.cors.allowedOrigins);
    } catch (e) {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }

    if (handlePreflight(req, res)) return;

    const config = getConfig();
    const authHeader = req.headers.authorization || '';
    const providedKey = authHeader.replace('Bearer ', '').trim();

    if (!config.admin.apiKey || providedKey !== config.admin.apiKey) {
        return res.status(401).json({ error: 'unauthorized' });
    }

    const status = {
        timestamp: new Date().toISOString(),
        environment: config.env,
        instagram: {
            configured: isInstagramConfigured(),
            connected: false,
            username: null,
            accountType: null,
            mediaCount: null
        },
        storage: getStorageMeta(),
        cache: getCacheStats(),
        config: {
            cacheDuration: config.cache.duration,
            pageSize: config.instagram.pageSize,
            maxPosts: config.storage.maxPosts,
            persistent: isUpstashConfigured()
        }
    };

    if (status.instagram.configured) {
        const validation = await validateToken(config);
        status.instagram.connected = validation.valid;
        status.instagram.username = validation.username || null;
        status.instagram.accountType = validation.accountType || null;
        status.instagram.mediaCount = validation.mediaCount || null;
        if (!validation.valid) status.instagram.error = validation.error;
    }

    return res.status(200).json(status);
}
