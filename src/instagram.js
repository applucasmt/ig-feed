// ============================================================
// CLIENT DA API OFICIAL DO INSTAGRAM (Graph API)
// ============================================================
// Documentação: https://developers.facebook.com/docs/instagram-api
// ============================================================

/**
 * Busca posts do Instagram COM PAGINAÇÃO
 * @param {object} config - Configuração
 * @param {object} options - { maxPages, onProgress }
 * @returns {Promise<{posts: Array, rateLimit: object, pages: number}>}
 */
export async function fetchAllPosts(config, options = {}) {
    const maxPages = options.maxPages || config.sync.maxPages;
    const onProgress = options.onProgress || (() => {});

    const allPosts = [];
    let after = null;
    let pageCount = 0;
    let rateLimit = null;
    let hasMore = true;

    while (hasMore && pageCount < maxPages) {
        pageCount++;

        const result = await fetchPage(config, after);
        allPosts.push(...result.posts);

        // Captura o rate limit dos headers
        if (result.rateLimit) rateLimit = result.rateLimit;

        // Verifica se há próxima página
        after = result.nextCursor;

        if (!after) {
            hasMore = false;
        } else {
            // Se estiver perto do rate limit, para
            if (rateLimit && isRateLimitHigh(rateLimit)) {
                console.warn('[IG Feed] Rate limit alto, parando paginação');
                hasMore = false;
            }
        }

        onProgress({
            page: pageCount,
            totalFetched: allPosts.length,
            hasMore: hasMore
        });
    }

    return {
        posts: allPosts,
        rateLimit: rateLimit,
        pages: pageCount
    };
}

/**
 * Busca UMA página de posts
 */
async function fetchPage(config, after = null) {
    const { accessToken, userId, apiVersion, baseUrl, pageSize } = config.instagram;

    if (!accessToken || !userId) {
        throw new Error('Instagram não configurado (token ou userId ausente)');
    }

    const fields = [
        'id',
        'caption',
        'media_type',
        'media_product_type',
        'media_url',
        'thumbnail_url',
        'permalink',
        'timestamp',
        'username',
        'children{media_url,media_type,thumbnail_url}'
    ].join(',');

    let url = `${baseUrl}/${apiVersion}/${userId}/media` +
        `?fields=${encodeURIComponent(fields)}` +
        `&limit=${pageSize}` +
        `&access_token=${accessToken}`;

    if (after) {
        url += `&after=${after}`;
    }

    const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
    });

    // Captura headers de rate limit
    const rateLimit = extractRateLimit(response.headers);

    if (!response.ok) {
        let errorMsg = `Instagram API Error (${response.status})`;
        try {
            const errorBody = await response.json();
            if (errorBody.error) {
                errorMsg += ': ' + (errorBody.error.message || 'desconhecido');
                if (errorBody.error.code === 190) {
                    errorMsg = 'Token do Instagram expirado ou inválido.';
                }
                if (errorBody.error.code === 4 || errorBody.error.code === 17) {
                    errorMsg = 'Rate limit da API do Instagram atingido. Tente novamente mais tarde.';
                }
            }
        } catch (e) {}
        throw new Error(errorMsg);
    }

    const data = await response.json();

    if (!data.data || !Array.isArray(data.data)) {
        return { posts: [], nextCursor: null, rateLimit: rateLimit };
    }

    const posts = data.data.map(normalizePost);

    // Extrai o cursor da próxima página
    const nextCursor = data.paging && data.paging.cursors
        ? data.paging.cursors.after
        : null;

    return {
        posts: posts,
        nextCursor: nextCursor,
        rateLimit: rateLimit
    };
}

/**
 * Extrai rate limit dos headers da resposta
 */
function extractRateLimit(headers) {
    const rateLimit = {};

    try {
        const appUsage = headers.get('x-app-usage');
        if (appUsage) {
            rateLimit.appUsage = JSON.parse(appUsage);
        }

        const businessUsage = headers.get('x-business-use-case-usage');
        if (businessUsage) {
            rateLimit.businessUsage = JSON.parse(businessUsage);
        }
    } catch (e) {}

    return rateLimit;
}

/**
 * Verifica se o rate limit está alto (>= 80%)
 */
function isRateLimitHigh(rateLimit) {
    if (!rateLimit || !rateLimit.appUsage) return false;
    const usage = rateLimit.appUsage;
    const max = Math.max(
        usage.call_count || 0,
        usage.total_cputime || 0,
        usage.total_time || 0
    );
    return max >= 80;
}

/**
 * Normaliza um post para o formato do widget
 */
function normalizePost(post) {
    const normalized = {
        id: post.id,
        type: post.media_type || 'IMAGE',
        productType: post.media_product_type || null,
        url: post.permalink || '',
        caption: post.caption || '',
        timestamp: post.timestamp || null,
        username: post.username || '',
        image: '',
        thumbnail: '',
        video: null,
        children: []
    };

    if (post.media_type === 'VIDEO') {
        normalized.image = post.thumbnail_url || post.media_url || '';
        normalized.thumbnail = post.thumbnail_url || post.media_url || '';
        normalized.video = post.media_url || null;
    } else if (post.media_type === 'CAROUSEL_ALBUM') {
        if (post.children && post.children.data && post.children.data.length > 0) {
            normalized.children = post.children.data.map(c => ({
                id: c.id,
                type: c.media_type,
                image: c.media_url || c.thumbnail_url || '',
                thumbnail: c.thumbnail_url || c.media_url || ''
            }));

            const firstChild = post.children.data[0];
            normalized.image = firstChild.media_url || firstChild.thumbnail_url || '';
            normalized.thumbnail = firstChild.thumbnail_url || firstChild.media_url || '';
        }
    } else {
        normalized.image = post.media_url || '';
        normalized.thumbnail = post.thumbnail_url || post.media_url || '';
    }

    return normalized;
}

/**
 * Valida token do Instagram
 */
export async function validateToken(config) {
    try {
        const { accessToken, userId, apiVersion, baseUrl } = config.instagram;

        const url = `${baseUrl}/${apiVersion}/${userId}` +
            `?fields=id,username,account_type,media_count` +
            `&access_token=${accessToken}`;

        const response = await fetch(url);

        if (!response.ok) {
            let errorMsg = `HTTP ${response.status}`;
            try {
                const body = await response.json();
                if (body.error && body.error.message) errorMsg = body.error.message;
            } catch (e) {}
            return { valid: false, error: errorMsg };
        }

        const data = await response.json();
        return {
            valid: true,
            username: data.username,
            accountType: data.account_type,
            mediaCount: data.media_count,
            id: data.id
        };
    } catch (error) {
        return { valid: false, error: error.message };
    }
}
