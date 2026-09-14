// ============================================================
// CONFIGURAÇÃO CENTRAL DO SISTEMA
// Lê variáveis de ambiente e valida
// ============================================================

export function getConfig() {
    const config = {
        instagram: {
            accessToken: process.env.INSTAGRAM_ACCESS_TOKEN || '',
            userId: process.env.INSTAGRAM_USER_ID || '',
            apiVersion: process.env.INSTAGRAM_API_VERSION || 'v21.0',
            baseUrl: 'https://graph.facebook.com',
            pageSize: parseInt(process.env.INSTAGRAM_PAGE_SIZE) || 25
        },
        cache: {
            duration: parseInt(process.env.CACHE_DURATION) || 1800
        },
        storage: {
            maxPosts: parseInt(process.env.STORAGE_MAX_POSTS) || 500,
            upstashUrl: process.env.UPSTASH_REDIS_REST_URL || '',
            upstashToken: process.env.UPSTASH_REDIS_REST_TOKEN || ''
        },
        sync: {
            maxPages: parseInt(process.env.SYNC_MAX_PAGES) || 10
        },
        cors: {
            allowedOrigins: parseOrigins(process.env.ALLOWED_ORIGINS)
        },
        admin: {
            apiKey: process.env.ADMIN_API_KEY || ''
        },
        env: process.env.NODE_ENV || 'development'
    };

    validateConfig(config);
    return config;
}

function parseOrigins(originsStr) {
    if (!originsStr || originsStr === '*') return ['*'];
    return originsStr.split(',').map(s => s.trim()).filter(Boolean);
}

function validateConfig(config) {
    const missing = [];
    if (!config.instagram.accessToken) missing.push('INSTAGRAM_ACCESS_TOKEN');
    if (!config.instagram.userId) missing.push('INSTAGRAM_USER_ID');

    if (missing.length > 0 && config.env === 'production') {
        console.warn('[IG Feed] Variáveis ausentes: ' + missing.join(', '));
    }
}

export function isInstagramConfigured() {
    return Boolean(
        process.env.INSTAGRAM_ACCESS_TOKEN &&
        process.env.INSTAGRAM_USER_ID
    );
}

export function isUpstashConfigured() {
    return Boolean(
        process.env.UPSTASH_REDIS_REST_URL &&
        process.env.UPSTASH_REDIS_REST_TOKEN
    );
}
