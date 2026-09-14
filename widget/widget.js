// ============================================================
// INSTAGRAM FEED WIDGET v1.0
// ============================================================
// Uso:
//   <div id="instagram-feed" data-limit="12"></div>
//   <script src="https://SEU-DOMINIO.vercel.app/widget.js"></script>
// ============================================================

(function() {
    'use strict';

    // ============================================================
    // CONFIGURAÇÃO PADRÃO
    // ============================================================
    const DEFAULTS = {
        apiBase: '',            // Vazio = mesmo domínio do widget.js
        layout: 'grid',         // grid | carousel | masonry
        limit: 12,
        columns: 4,
        columnsTablet: 3,
        columnsMobile: 2,
        gap: 8,
        radius: 12,
        aspectRatio: '1/1',     // 1/1, 4/5, 16/9
        showCaption: false,
        showDate: false,
        showButton: true,
        showOverlay: true,
        autoplay: false,
        autoplayDelay: 4000,
        hoverEffect: 'zoom',    // zoom | fade | none
        lazyLoad: true,
        theme: 'dark'
    };

    // ============================================================
    // INICIALIZAÇÃO
    // ============================================================
    function init() {
        // Encontra todos os containers
        const containers = document.querySelectorAll('[id^="instagram-feed"], .ig-feed');

        containers.forEach(container => {
            if (container.dataset.igInitialized) return;
            container.dataset.igInitialized = 'true';

            setupWidget(container);
        });
    }

    // ============================================================
    // CONFIGURA UM WIDGET
    // ============================================================
    function setupWidget(container) {
        const config = readConfig(container);

        // Aplica variáveis CSS
        applyCSSVariables(container, config);

        // Mostra loading
        container.classList.add('ig-feed');
        container.classList.add('ig-layout-' + config.layout);
        container.classList.add('ig-theme-' + config.theme);
        container.innerHTML = '<div class="ig-loading">' +
            '<div class="ig-spinner"></div>' +
            '<p>Carregando feed...</p>' +
            '</div>';

        // Carrega CSS
        loadCSS(getApiBase(container) + '/widget.css');

        // Busca posts
        fetchPosts(container, config)
            .then(posts => {
                if (posts.length === 0) {
                    renderEmpty(container);
                } else {
                    renderWidget(container, posts, config);
                }
            })
            .catch(err => {
                console.error('[IG Feed] Erro:', err);
                renderError(container);
            });
    }

    // ============================================================
    // LÊ CONFIGURAÇÃO DOS ATRIBUTOS DATA-*
    // ============================================================
    function readConfig(container) {
        const d = container.dataset;
        return {
            apiBase: d.apiBase || DEFAULTS.apiBase,
            layout: d.layout || DEFAULTS.layout,
            limit: parseInt(d.limit) || DEFAULTS.limit,
            columns: parseInt(d.columns) || DEFAULTS.columns,
            columnsTablet: parseInt(d.columnsTablet) || DEFAULTS.columnsTablet,
            columnsMobile: parseInt(d.columnsMobile) || DEFAULTS.columnsMobile,
            gap: parseInt(d.gap) || DEFAULTS.gap,
            radius: parseInt(d.radius) || DEFAULTS.radius,
            aspectRatio: d.aspectRatio || DEFAULTS.aspectRatio,
            showCaption: d.showCaption === 'true',
            showDate: d.showDate === 'true',
            showButton: d.showButton !== 'false',
            showOverlay: d.showOverlay !== 'false',
            autoplay: d.autoplay === 'true',
            autoplayDelay: parseInt(d.autoplayDelay) || DEFAULTS.autoplayDelay,
            hoverEffect: d.hoverEffect || DEFAULTS.hoverEffect,
            lazyLoad: d.lazyLoad !== 'false',
            theme: d.theme || DEFAULTS.theme
        };
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
    // DETECTA O BASE URL DA API
    // ============================================================
    function getApiBase(container) {
        if (container.dataset.apiBase) return container.dataset.apiBase;

        // Descobre pela tag <script> que carregou o widget
        const scripts = document.querySelectorAll('script[src*="widget.js"]');
        if (scripts.length > 0) {
            const src = scripts[scripts.length - 1].src;
            return src.replace(/\/widget\.js.*$/, '');
        }

        return window.location.origin;
    }

    // ============================================================
    // BUSCA POSTS DA API
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
        // Limpa loading
        container.innerHTML = '';

        // Cria a estrutura
        const grid = document.createElement('div');
        grid.className = 'ig-grid';

        posts.forEach((post, index) => {
            const item = createPostItem(post, config, index);
            grid.appendChild(item);
        });

        container.appendChild(grid);

        // Lightbox
        setupLightbox(container, posts, config);

        // Carousel (se aplicável)
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

        // Imagem
        const img = document.createElement('img');
        img.src = post.thumbnail || post.image || '';
        img.alt = post.caption ? post.caption.substring(0, 100) : 'Publicação do Instagram';
        img.loading = config.lazyLoad ? 'lazy' : 'eager';
        img.decoding = 'async';

        img.onerror = function() {
            this.src = 'data:image/svg+xml;base64,' + btoa(
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
                '<rect fill="#1e293b" width="100" height="100"/>' +
                '<text x="50" y="50" fill="#64748b" text-anchor="middle" dy=".3em" font-family="sans-serif" font-size="12">Imagem indisponível</text>' +
                '</svg>'
            );
        };

        item.appendChild(img);

        // Overlay
        if (config.showOverlay) {
            const overlay = document.createElement('div');
            overlay.className = 'ig-overlay';

            // Ícone de tipo
            if (post.type === 'VIDEO') {
                overlay.innerHTML += '<div class="ig-icon ig-icon-video"><svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M8 5v14l11-7z"/></svg></div>';
            } else if (post.type === 'CAROUSEL_ALBUM') {
                overlay.innerHTML += '<div class="ig-icon ig-icon-carousel"><svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg></div>';
            }

            item.appendChild(overlay);
        }

        // Legenda
        if (config.showCaption && post.caption) {
            const caption = document.createElement('div');
            caption.className = 'ig-caption';
            caption.textContent = post.caption.substring(0, 100);
            item.appendChild(caption);
        }

        // Eventos
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

        // Cria o overlay
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

        // Fechar
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

        // Foco acessível
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

        // Autoplay
        if (config.autoplay) {
            let timer = setInterval(() => goTo(currentIndex + 1), config.autoplayDelay);

            container.addEventListener('mouseenter', () => clearInterval(timer));
            container.addEventListener('mouseleave', () => {
                timer = setInterval(() => goTo(currentIndex + 1), config.autoplayDelay);
            });
        }

        // Swipe
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
    // INICIALIZA
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expõe API pública
    window.IGFeed = { init: init };
})();
