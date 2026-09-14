// ============================================================
// SINCRONIZAÇÃO DE POSTS DO INSTAGRAM
// ============================================================
// Fluxo:
// 1. Busca posts da API (com paginação)
// 2. Mescla com o que já temos no storage (incremental)
// 3. Registra metadados e erros
// ============================================================

import { fetchAllPosts } from './instagram.js';
import { mergePosts, recordSyncError, getStorageMeta } from './storage.js';

/**
 * Executa sincronização completa
 * @returns {Promise<object>}
 */
export async function runSync(config, options = {}) {
    const startedAt = Date.now();

    try {
        console.log('[IG Feed] Iniciando sincronização...');

        // 1. Busca posts (com paginação automática)
        const progressLog = [];
        const result = await fetchAllPosts(config, {
            maxPages: options.maxPages || config.sync.maxPages,
            onProgress: (p) => {
                progressLog.push(p);
                console.log(`[IG Feed] Página ${p.page} - ${p.totalFetched} posts até agora`);
            }
        });

        // 2. Mescla com o storage (só adiciona novos)
        const added = await mergePosts(result.posts);

        const meta = getStorageMeta();
        const duration = Date.now() - startedAt;

        console.log(`[IG Feed] Sync concluída: ${result.posts.length} buscados, ${added} novos em ${duration}ms`);

        return {
            success: true,
            duration: duration,
            pagesFetched: result.pages,
            postsFetched: result.posts.length,
            newPosts: added,
            totalStored: meta.totalPosts,
            rateLimit: result.rateLimit,
            pages: progressLog
        };
    } catch (error) {
        recordSyncError(error);
        console.error('[IG Feed] Erro na sincronização:', error.message);

        return {
            success: false,
            error: error.message,
            duration: Date.now() - startedAt
        };
    }
}
