// ============================================================
// INSTAGRAM FEED WIDGET v2.0
// ============================================================
// Uso mínimo:
//   <div id="instagram-feed"></div>
//   <script src="https://SEU-DOMINIO.vercel.app/widget.js"></script>
//
// A configuração é carregada automaticamente do backend (/api/config)
// e pode ser editada no painel: /admin
// ============================================================

(function() {
    'use strict';

    // ============================================================
    // CONFIGURAÇÃO PADRÃO (usada se a API falhar)
    // ============================================================
    const DEFAULTS = {
        apiBase: '',
        layout: 'grid',
        limit: 12,
        columns: 4,
        columnsTablet: 3,
        columnsMobile: 2,
        gap: 12,
        radius: 12,
        aspectRatio: '1/1',
        showCaption: false,
        showDate: false,
        showButton: true,
        showOverlay: true,
        autoplay: false,
        autoplayDelay: 4000,
        hoverEffect: 'zoom',
        lazyLoad: true,
        theme: 'dark',
        accentColor: '#EEBC5A',
        bgColor: '#0f172a',
        textColor: '#ffffff',
        overlayOpacity: 0.6
    };

    // Cache da config (para não fazer fetch toda vez)
    let globalConfig = null;
    let configPromise = null;

    // ============================================================
    // INICIALIZAÇÃO
    // ============================================================
    function init() {
        const containers = document.querySelectorAll('[id^="instagram-feed"], .ig-feed');

        containers.forEach(container => {
            if (container.dataset.igInitialized === 'true') return;
            container.dataset.igInitialized = 'true';

            setupWidget(container);
        });
    }

    // ============================================================
    // CONFIGURA UM WIDGET
    // ============================================================
    async function setupWidget(container) {
        try {
            // 1. Mostra loading
            container.classList.add('ig-feed');
            container.innerHTML = '<div class="ig-loading">' +
                '<div class="ig-spinner"></div>' +
                '<p>Carregando feed...</p>' +
                '</div>';

            // 2. Carrega a config global (do painel admin)
            const globalCfg = await loadGlobalConfig(container);

            // 3. Mescla: defaults < global < atributos data-* específicos
            const config = mergeConfigs(DEFAULTS, globalCfg, readDataAttributes(container));

            // 4. Aplica tema e classes
            container.classList.add('ig-layout-' + config.layout);
            container.classList.add('ig-theme-' + config.theme);
            applyCSSVariables(container, config);

            // 5. Carrega o CSS
            loadCSS(getApiBase(container) + '/widget.css');

            // 6. Busca os posts
            const posts = await fetchPosts(container, config);

            if (posts.length === 0) {
                renderEmpty(container);
                return;
            }

            // 7. Renderiza
            renderWidget(container, posts, config);

        } catch (err) {
            console.error('[IG Feed] Erro:', err);
            renderError(container);
        }
    }

    // ============================================================
    // CARREGA A CONFIG GLOBAL DO BACKEND
    // ============================================================
    async function loadGlobalConfig(container) {
        // Se já temos em cache na memória, usa
        if (globalConfig) return globalConfig;

        // Se já tem uma promise em andamento, espera ela
        if (configPromise) return configPromise;

        configPromise = (async () => {
            try {
                const base = getApiBase(container);
                const res = await fetch(base + '/api/config', {
                    cache: 'no-cache'
                });

                if (!res.ok) throw new Error('HTTP ' + res.status);

                const data = await res.json();
                if (data.success && data.config) {
                    globalConfig = data.config;
                    console.log('[IG Feed] Config carregada do backend:', globalConfig);
                    return globalConfig;
                }
                return null;
            } catch (err) {
                console.warn('[IG Feed] Não foi possível carregar config global, usando padrão:', err);
                return null;
            } finally {
                configPromise = null;
            }
        })();

        return configPromise;
    }

    // ============================================================
    // LÊ CONFIGURAÇÕES DOS ATRIBUTOS DATA-*
    // ============================================================
    function readDataAttributes(container) {
        const d = container.dataset;
        const attrs = {};

        if (d.apiBase) attrs.apiBase = d.apiBase;
        if (d.layout) attrs.layout = d.layout;
        if (d.limit) attrs.limit = parseInt(d.limit);
        if (d.columns) attrs.columns = parseInt(d.columns);
        if (d.columnsTablet) attrs.columnsTablet = parseInt(d.columnsTablet);
        if (d.mobileColumns) attrs.columnsMobile = parseInt(d.mobileColumns);
        if (d.gap) attrs.gap = parseInt(d.gap);
        if (d.radius) attrs.radius = parseInt(d.radius);
        if (d.aspectRatio) attrs.aspectRatio = d.aspectRatio;
        if (d.showCaption !== undefined) attrs.showCaption = d.showCaption === 'true';
        if (d.showDate !== undefined) attrs.showDate = d.showDate === 'true';
        if (d.showButton !== undefined) attrs.showButton = d.showButton !== 'false';
        if (d.showOverlay !== undefined) attrs.showOverlay = d.showOverlay !== 'false';
        if (d.autoplay !== undefined) attrs.autoplay = d.autoplay === 'true';
        if (d.autoplayDelay) attrs.autoplayDelay = parseInt(d.autoplayDelay);
        if (d.hoverEffect) attrs.hoverEffect = d.hoverEffect;
        if (d.lazyLoad !== undefined) attrs.lazyLoad = d.lazyLoad !== 'false';
        if (d.theme) attrs.theme = d.theme;

        return attrs;
    }

    // ============================================================
    // MESCLA CONFIGURAÇÕES
    // ============================================================
    function mergeConfigs(...configs) {
        const result = {};
        configs.forEach(cfg => {
            if (!cfg) return;
            Object.keys(cfg).forEach(key => {
                if (cfg[key] !== undefined && cfg[key] !== null && cfg[key] !== '') {
                    result[key] = cfg[key];
                }
            });
        });
        return result;
    }

    // ============================================================
    // APLICA VARIÁVEIS CSS
    // ============================================================
    function applyCSSVariables(container, config) {
        container.style.setProperty('--ig-columns', config.columns);
        container.style.setProperty('--ig-columns-tablet', config.columnsTablet);
        container.style.setProperty('--ig-columns-mobile', config.columnsMobile);
        container.style.setProperty('--ig-gap', config.gap + 'px');
        container.style.setProperty('--ig-radius', config.radius + 'px');
        container.style.setProperty('--ig-aspect', config.aspectRatio);

        // Cores personalizadas
        if (config.accentColor) container.style.setProperty('--ig-accent', config.accentColor);
        if (config.bgColor) container.style.setProperty('--ig-bg', config.bgColor);
        if (config.textColor) container.style.setProperty('--ig-text', config.textColor);
        if (config.overlayOpacity !== undefined) {
            container.style.setProperty('--ig-overlay', 'rgba(0, 0, 0, ' + config.overlayOpacity + ')');
        }
    }

    // ============================================================
    // CARREGA CSS
    // ============================================================
    function loadCSS(href) {
        if (document.querySelector('link[href="' + href + '"]')) return;

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
    }

    // ============================================================
    // DETECTA BASE URL DA API
    // ============================================================
    function getApiBase(container) {
        if (container.dataset.apiBase) return container.dataset.apiBase;

        // Procura a tag script do widget
        const scripts = document.querySelectorAll('script[src*="widget.js"]');
        if (scripts.length > 0) {
            const src = scripts[scripts.length - 1].src;
            // Remove "/widget.js" ou "/widget/widget.js" do final
            return src
                .replace(/\/widget\/widget\.js.*$/, '')
                .replace(/\/widget\.js.*$/, '');
        }

        return window.location.origin;
    }

    // ============================================================
    // BUSCA POSTS
    // ============================================================
    async function fetchPosts(container, config) {
        const base = getApiBase(container);
        const url = base + '/api/feed?limit=' + config.limit;

        const response = await fetch(url);
        if (!response.ok) throw new Error('HTTP ' + response.status);

        const data = await response.json();
        return data.posts || [];
    }

    // ============================================================
    // RENDERIZA O WIDGET
    // ============================================================
    function renderWidget(container, posts, config) {
        container.innerHTML = '';

        const grid = document.createElement('div');
        grid.className = 'ig-grid';

        posts.forEach((post, index) => {
            const item = createPostItem(post, config, index);
            grid.appendChild(item);
        });

        container.appendChild(grid);

        setupLightbox(container, posts, config);

        if (config.layout === 'carousel') {
            setupCarousel(container, config);
        }
    }

    // ============================================================
    // CRIA ITEM DE POST
    // ============================================================
    function createPostItem(post, config, index) {
        const item = document.createElement('div');
        item.className = 'ig-item ig-type-' + (post.type || 'IMAGE').toLowerCase();
        item.dataset.index = index;
        item.setAttribute('role', 'button');
        item.setAttribute('tabindex', '0');
        item.setAttribute('aria-label', 'Ver publicação: ' + (post.caption || 'sem legenda').substring(0, 60));

        const img = document.createElement('img');
        img.src = post.thumbnail || post.image || '';
        img.alt = post.caption ? post.caption.substring(0, 100) : 'Publicação do Instagram';
        img.loading = config.lazyLoad ? 'lazy' : 'eager';
        img.decoding = 'async';

        img.onerror = function() {
            this.src = 'data:image/svg+xml;base64,' + btoa(
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
                '<rect fill="#1e293b" width="100" height="100"/>' +
                '<text x="50" y="50" fill="#64748b" text-anchor="middle" dy=".3em" font-family="sans-serif" font-size="12">Indisponível</text>' +
                '</svg>'
            );
        };

        item.appendChild(img);

        if (config.showOverlay) {
            const overlay = document.createElement('div');
            overlay.className = 'ig-overlay';

            if (post.type === 'VIDEO') {
                overlay.innerHTML += '<div class="ig-icon ig-icon-video"><svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M8 5v14l11-7z"/></svg></div>';
            } else if (post.type === 'CAROUSEL_ALBUM') {
                overlay.innerHTML += '<div class="ig-icon ig-icon-carousel"><svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg></div>';
            }

            item.appendChild(overlay);
        }

        if (config.showCaption && post.caption) {
            const caption = document.createElement('div');
            caption.className = 'ig-caption';
            caption.textContent = post.caption.substring(0, 100);
            item.appendChild(caption);
        }

        item.addEventListener('click', () => openLightbox(item.closest('.ig-feed'), index));
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openLightbox(item.closest('.ig-feed'), index);
            }
        });

        return item;
    }

    // ============================================================
    // LIGHTBOX
    // ============================================================
    function setupLightbox(container, posts, config) {
        container._igPosts = posts;
        container._igConfig = config;
    }

    function openLightbox(container, index) {
        const posts = container._igPosts;
        const config = container._igConfig;
        const post = posts[index];
        if (!post) return;

        const lb = document.createElement('div');
        lb.className = 'ig-lightbox';
        lb.setAttribute('role', 'dialog');
        lb.setAttribute('aria-modal', 'true');
        lb.innerHTML =
            '<div class="ig-lightbox-overlay"></div>' +
            '<div class="ig-lightbox-content">' +
                '<button class="ig-lightbox-close" aria-label="Fechar">×</button>' +
                '<div class="ig-lightbox-media">' +
                    (post.type === 'VIDEO' && post.video
                        ? '<video src="' + post.video + '" controls autoplay playsinline></video>'
                        : '<img src="' + (post.image || post.thumbnail) + '" alt="">') +
                '</div>' +
                '<div class="ig-lightbox-info">' +
                    (post.caption ? '<p class="ig-lightbox-caption">' + escapeHTML(post.caption) + '</p>' : '') +
                    (post.timestamp ? '<time class="ig-lightbox-date">' + formatDate(post.timestamp) + '</time>' : '') +
                    (config.showButton && post.url
                        ? '<a class="ig-lightbox-button" href="' + post.url + '" target="_blank" rel="noopener noreferrer">Ver no Instagram</a>'
                        : '') +
                '</div>' +
            '</div>';

        document.body.appendChild(lb);
        document.body.style.overflow = 'hidden';

        const close = () => {
            lb.remove();
            document.body.style.overflow = '';
            document.removeEventListener('keydown', onKey);
        };

        const onKey = (e) => {
            if (e.key === 'Escape') close();
        };

        lb.querySelector('.ig-lightbox-close').addEventListener('click', close);
        lb.querySelector('.ig-lightbox-overlay').addEventListener('click', close);
        document.addEventListener('keydown', onKey);

        setTimeout(() => lb.querySelector('.ig-lightbox-close').focus(), 50);
    }

    // ============================================================
    // CAROUSEL
    // ============================================================
    function setupCarousel(container, config) {
        const grid = container.querySelector('.ig-grid');
        if (!grid) return;

        let currentIndex = 0;
        const total = grid.children.length;

        const prev = document.createElement('button');
        prev.className = 'ig-carousel-nav ig-carousel-prev';
        prev.innerHTML = '‹';
        prev.setAttribute('aria-label', 'Anterior');

        const next = document.createElement('button');
        next.className = 'ig-carousel-nav ig-carousel-next';
        next.innerHTML = '›';
        next.setAttribute('aria-label', 'Próximo');

        container.appendChild(prev);
        container.appendChild(next);

        const goTo = (index) => {
            currentIndex = (index + total) % total;
            grid.style.transform = 'translateX(-' + (currentIndex * 100) + '%)';
        };

        prev.addEventListener('click', () => goTo(currentIndex - 1));
        next.addEventListener('click', () => goTo(currentIndex + 1));

        if (config.autoplay) {
            let timer = setInterval(() => goTo(currentIndex + 1), config.autoplayDelay || 4000);

            container.addEventListener('mouseenter', () => clearInterval(timer));
            container.addEventListener('mouseleave', () => {
                timer = setInterval(() => goTo(currentIndex + 1), config.autoplayDelay || 4000);
            });
        }

        let startX = 0;
        container.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
        }, { passive: true });

        container.addEventListener('touchend', (e) => {
            const diff = startX - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 50) {
                goTo(currentIndex + (diff > 0 ? 1 : -1));
            }
        });
    }

    // ============================================================
    // ESTADOS VAZIOS / ERRO
    // ============================================================
    function renderEmpty(container) {
        container.innerHTML = '<div class="ig-empty">Nenhuma publicação encontrada.</div>';
    }

    function renderError(container) {
        container.innerHTML = '<div class="ig-error">Não foi possível carregar o feed.</div>';
    }

    // ============================================================
    // HELPERS
    // ============================================================
    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function formatDate(isoString) {
        try {
            const d = new Date(isoString);
            return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
        } catch (e) {
            return '';
        }
    }

    // ============================================================
    // INIT
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // API pública
    window.IGFeed = {
        init: init,
        clearCache: () => {
            globalConfig = null;
            configPromise = null;
        }
    };
})();
