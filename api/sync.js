// ============================================================
// ENDPOINT: /api/sync
// ============================================================
// Sincroniza posts do Instagram
// Chamado pelo cron job da Vercel a cada 30 minutos
// Também pode ser chamado manualmente com Authorization
// ============================================================

import { getConfig } from '../src/config.js';
import { runSync } from '../src/sync.js';
import { applyCors, handlePreflight } from '../src/cors.js';

export default async function handler(req, res) {
    // CORS
    try {
        const config = getConfig();
        applyCors(req, res, config.cors.allowedOrigins);
    } catch (e) {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }

    if (handlePreflight(req, res)) return;

    const config = getConfig();

    // Autenticação: aceita tanto Authorization quanto User-Agent do cron
    const authHeader = req.headers.authorization || '';
    const providedKey = authHeader.replace('Bearer ', '').trim();
    const isCron = req.headers['user-agent'] === 'vercel-cron/1.0';

    if (!isCron && (!config.admin.apiKey || providedKey !== config.admin.apiKey)) {
        return res.status(401).json({
            error: 'unauthorized',
            message: 'Chave de API inválida'
        });
    }

    // Executa sincronização
    const result = await runSync(config);

    if (result.success) {
        return res.status(200).json(result);
    } else {
        return res.status(500).json(result);
    }
}
