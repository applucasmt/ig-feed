// ============================================================
// SISTEMA DE ARMAZENAMENTO
// ============================================================
// Abstrai a persistência dos posts. Suporta:
// 1. Memória (padrão, funciona em Vercel warm)
// 2. Upstash Redis (persistente, opcional)
// ============================================================

import { isUpstashConfigured } from './config.js';

// Cache em memória (global, persiste enquanto a função está quente)
let memoryStore = {
    posts: [],           // Array de posts (ordenados: mais recentes primeiro)
    byId: new Map(),     // Índice por ID do Instagram
    lastSync: 0,         // Timestamp da última sincronização bem-sucedida
    lastError: null,
    totalFetched: 0      // Total acumulado de posts já buscados da API
};

// Chave no Redis
const REDIS_KEY = 'ig_feed:posts';
const REDIS_META_KEY = 'ig_feed:meta';

// ============================================================
// INICIALIZAÇÃO UPSTASH (se configurado)
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

// ============================================================
// API PÚBLICA DE STORAGE
// ============================================================

/**
 * Retorna todos os posts armazenados (sem limite de exibição)
 */
export async function getAllPosts() {
    // 1. Tenta Redis primeiro (se configurado)
    if (isUpstashConfigured()) {
        try {
            const result = await redisCommand(['GET', REDIS_KEY]);
            if (result && result.result) {
                const parsed = JSON.parse(result.result);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (e) {
            console.warn('[IG Feed] Erro ao ler Redis:', e.message);
        }
    }

    // 2. Fallback para memória
    return memoryStore.posts;
}

/**
 * Salva a lista completa de posts (sobrescreve)
 */
export async function saveAllPosts(posts) {
    // Ordena por timestamp decrescente (mais recentes primeiro)
    const sorted = [...posts].sort((a, b) => {
        const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return tb - ta;
    });

    // Atualiza memória
    memoryStore.posts = sorted;
    memoryStore.byId.clear();
    sorted.forEach(p => memoryStore.byId.set(p.id, p));
    memoryStore.lastSync = Date.now();

    // Persiste no Redis se configurado
    if (isUpstashConfigured()) {
        try {
            await redisCommand(['SET', REDIS_KEY, JSON.stringify(sorted)]);
            await redisCommand(['SET', REDIS_META_KEY, JSON.stringify({
                lastSync: memoryStore.lastSync,
                count: sorted.length
            })]);
        } catch (e) {
            console.warn('[IG Feed] Erro ao salvar no Redis:', e.message);
        }
    }
}

/**
 * Mescla posts novos com os existentes (sincronização incremental)
 * Retorna quantos posts foram adicionados
 */
export async function mergePosts(newPosts) {
    const existing = await getAllPosts();
    const existingIds = new Set(existing.map(p => p.id));

    let added = 0;
    const merged = [...existing];

    for (const post of newPosts) {
        if (!existingIds.has(post.id)) {
            merged.push(post);
            added++;
        } else {
            // Atualiza o post existente (pode ter ganhado mais likes, etc)
            const idx = merged.findIndex(p => p.id === post.id);
            if (idx !== -1) merged[idx] = { ...merged[idx], ...post };
        }
    }

    await saveAllPosts(merged);
    return added;
}

/**
 * Retorna metadados do storage
 */
export function getStorageMeta() {
    return {
        totalPosts: memoryStore.posts.length,
        lastSync: memoryStore.lastSync || null,
        lastSyncAgo: memoryStore.lastSync
            ? Math.floor((Date.now() - memoryStore.lastSync) / 1000)
            : null,
        lastError: memoryStore.lastError,
        totalFetched: memoryStore.totalFetched,
        persistent: isUpstashConfigured()
    };
}

/**
 * Registra erro de sincronização
 */
export function recordSyncError(error) {
    memoryStore.lastError = {
        message: error.message || String(error),
        timestamp: Date.now()
    };
}

/**
 * Limpa todo o storage
 */
export async function clearStorage() {
    memoryStore.posts = [];
    memoryStore.byId.clear();
    memoryStore.lastSync = 0;
    memoryStore.lastError = null;

    if (isUpstashConfigured()) {
        try {
            await redisCommand(['DEL', REDIS_KEY]);
            await redisCommand(['DEL', REDIS_META_KEY]);
        } catch (e) {
            console.warn('[IG Feed] Erro ao limpar Redis:', e.message);
        }
    }
}

/**
 * Inicializa o storage lendo do Redis (se disponível)
 */
export async function initStorage() {
    if (isUpstashConfigured() && memoryStore.posts.length === 0) {
        const posts = await getAllPosts();
        if (posts.length > 0) {
            memoryStore.posts = posts;
            posts.forEach(p => memoryStore.byId.set(p.id, p));
        }
    }
}
