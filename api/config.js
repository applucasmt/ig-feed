// ============================================================
// ENDPOINT: /api/config
// ============================================================
// Salva e carrega configurações visuais do widget
// GET  → retorna config atual
// POST → salva nova config (requer autenticação)
// ============================================================

import { getConfig } from '../src/config.js';
import { applyCors, handlePreflight } from '../src/cors.js';
import { isUpstashConfigured } from '../src/config.js';

const CONFIG_KEY = 'ig_feed:widget_config';

// Configuração padrão
const DEFAULT_CONFIG = {
    // Layout
    layout: 'grid',
    columns: 4,
    columnsTablet: 3,
    columnsMobile: 2,
    gap: 12,
    radius: 12,
    aspectRatio: '1/1',
    limit: 12,

    // Visual
    theme: 'dark',
    accentColor: '#EEBC5A',
    bgColor: '#0f172a',
    textColor: '#ffffff',
    overlayOpacity: 0.6,

    // Elementos
    showCaption: false,
    showDate: false,
    showButton: true,
    showOverlay: true,

    // Comportamento
    hoverEffect: 'zoom',
    lazyLoad: true,
    autoplay: false,
    autoplayDelay: 4000
};

// ============================================================
// HELPERS REDIS
// ============================================================
async function redisCommand(command) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return null;

    const response = await fetch(`${url}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(command)
    });

    if (!response.ok) return null;
    return await response.json();
}

// Memória local (fallback)
let memoryConfig = null;

// ============================================================
// ENDPOINT
// ============================================================
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

    // ============================================================
    // GET - Retorna configuração atual
    // ============================================================
    if (req.method === 'GET') {
        try {
            let savedConfig = null;

            // Tenta Redis
            if (isUpstashConfigured()) {
                const result = await redisCommand(['GET', CONFIG_KEY]);
                if (result && result.result) {
                    try {
                        savedConfig = JSON.parse(result.result);
                    } catch (e) {}
                }
            }

            // Fallback para memória
            if (!savedConfig) {
                savedConfig = memoryConfig;
            }

            // Mescla com padrão
            const finalConfig = { ...DEFAULT_CONFIG, ...(savedConfig || {}) };

            return res.status(200).json({
                success: true,
                config: finalConfig,
                defaults: DEFAULT_CONFIG
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // ============================================================
    // POST - Salva nova configuração
    // ============================================================
    if (req.method === 'POST') {
        // Autenticação
        const authHeader = req.headers.authorization || '';
        const providedKey = authHeader.replace('Bearer ', '').trim();

        if (!config.admin.apiKey || providedKey !== config.admin.apiKey) {
            return res.status(401).json({
                success: false,
                error: 'unauthorized',
                message: 'Chave de API inválida'
            });
        }

        try {
            const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            const newConfig = body.config || body;

            // Mescla com padrão para garantir todas as chaves
            const mergedConfig = { ...DEFAULT_CONFIG, ...newConfig };

            // Salva em memória
            memoryConfig = mergedConfig;

            // Salva em Redis
            if (isUpstashConfigured()) {
                await redisCommand(['SET', CONFIG_KEY, JSON.stringify(mergedConfig)]);
            }

            return res.status(200).json({
                success: true,
                message: 'Configuração salva com sucesso',
                config: mergedConfig
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
