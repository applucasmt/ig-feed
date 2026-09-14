// ============================================================
// CONFIGURAÇÃO DE CORS
// ============================================================

export function applyCors(req, res, allowedOrigins) {
    const origin = req.headers.origin || '*';

    if (allowedOrigins.includes('*')) {
        res.setHeader('Access-Control-Allow-Origin', '*');
    } else if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
}

export function handlePreflight(req, res) {
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return true;
    }
    return false;
}
