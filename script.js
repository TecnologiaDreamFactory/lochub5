
// ========== Parallax Slider com Autoplay Infinito ==========
(function () {
    const slider = document.getElementById('parallaxSlider');
    const dotsContainer = document.getElementById('parallaxDots');
    if (!slider || !dotsContainer) return;

    const slides = Array.from(slider.querySelectorAll('.parallax-slide'));
    let current = 0;
    let timer;

    slides.forEach(function (slide) {
        slide.style.backgroundImage = "url('" + slide.dataset.bg + "')";
    });

    slides.forEach(function (_, i) {
        const dot = document.createElement('button');
        dot.className = 'parallax-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', 'Ir para slide ' + (i + 1));
        dot.addEventListener('click', function () {
            goTo(i);
            restart();
        });
        dotsContainer.appendChild(dot);
    });

    function goTo(index) {
        const outgoing = slides[current];

        // Congela a escala atual e inicia fade-out via CSS (.leaving)
        outgoing.style.transform = window.getComputedStyle(outgoing).transform;
        outgoing.style.animation = 'none';
        outgoing.classList.remove('active');
        outgoing.classList.add('leaving');
        dotsContainer.children[current].classList.remove('active');

        current = (index + slides.length) % slides.length;
        const incoming = slides[current];

        // Limpa qualquer estado anterior e reinicia o Ken Burns
        incoming.classList.remove('leaving');
        incoming.style.transform = '';
        incoming.style.animation = 'none';
        void incoming.offsetWidth;
        incoming.style.animation = '';

        incoming.classList.add('active');
        dotsContainer.children[current].classList.add('active');

        // Remove o leaving após o fade-out concluir
        setTimeout(function () {
            outgoing.classList.remove('leaving');
            outgoing.style.transform = '';
        }, 1300);
    }

    function next() {
        goTo(current + 1);
    }

    function restart() {
        clearInterval(timer);
        timer = setInterval(next, 7000);
    }

    restart();
})();

// Funções do Modal
function openModal(imageSrc, altText) {
    const modal = document.getElementById('photoModal');
    const modalImage = document.getElementById('modalImage');
    modalImage.src = imageSrc;
    modalImage.alt = altText;
    modal.style.display = 'flex';
    void modal.offsetWidth;
}

function closeModal() {
    document.getElementById('photoModal').style.display = 'none';
}

window.onclick = function(event) {
    const modal = document.getElementById('photoModal');
    if (event.target == modal) modal.style.display = 'none';
};

// ========== Carrosséis: thumbnails deslizam com zoom até o centro ==========

function initThumbnailCarousel(galleryEl) {
    if (!galleryEl || typeof gsap === 'undefined') return;

    const imagesStr = galleryEl.getAttribute('data-images');
    const altsStr   = galleryEl.getAttribute('data-alts');
    const textsStr  = galleryEl.getAttribute('data-texts');
    if (!imagesStr || !altsStr) return;

    const images = imagesStr.split(',').map(s => s.trim());
    const alts   = altsStr.split(',').map(s => s.trim());
    const texts  = textsStr ? textsStr.split('|').map(s => s.trim()) : [];

    const prevSlot   = galleryEl.querySelector('.carousel-slot--prev');
    const centerSlot = galleryEl.querySelector('.carousel-slot--center');
    const nextSlot   = galleryEl.querySelector('.carousel-slot--next');
    const prevBtn    = galleryEl.querySelector('.carousel-prev');
    const nextBtn    = galleryEl.querySelector('.carousel-next');
    const textEl     = galleryEl.querySelector('.carousel-item-text');

    if (!prevSlot || !centerSlot || !nextSlot) return;

    const centerInner = centerSlot.querySelector('.carousel-slot-inner');

    let currentIndex = 0;
    const total = images.length;
    let isAnimating = false;

    function getPrevIndex() { return (currentIndex - 1 + total) % total; }
    function getNextIndex() { return (currentIndex + 1) % total; }

    function applyContent(idx) {
        centerSlot.querySelector('img').src = images[idx];
        centerSlot.querySelector('img').alt = alts[idx] || '';

        // Preenche as miniaturas prev/next
        const pi = (idx - 1 + total) % total;
        const ni = (idx + 1) % total;
        if (prevSlot) {
            prevSlot.querySelector('img').src = images[pi];
            prevSlot.querySelector('img').alt = alts[pi] || '';
        }
        if (nextSlot) {
            nextSlot.querySelector('img').src = images[ni];
            nextSlot.querySelector('img').alt = alts[ni] || '';
        }

        if (textEl && texts[idx] !== undefined) textEl.textContent = texts[idx];
    }

    function resetState() {
        gsap.set(centerInner, { x: 0, scale: 1, opacity: 1, zIndex: 5 });
        // Garante que o texto está visível sem depender de animação prévia
        if (textEl) { textEl.style.opacity = '1'; textEl.style.transform = 'none'; }
    }

    // ── Animação: imagem desliza + zoom, texto faz fade ─────────────────────
    function navigate(direction) {
        if (isAnimating) return;
        isAnimating = true;

        const slideOut = centerSlot.offsetWidth * 0.4;
        const xOut = direction === 'next' ? -slideOut : slideOut;
        const xIn  = direction === 'next' ?  slideOut : -slideOut;

        // Saída: imagem desliza + dissolve (sem zoom)
        const tl = gsap.timeline();
        tl.to(centerInner, { x: xOut, opacity: 0, duration: 0.28, ease: 'power2.in' }, 0);
        if (textEl) tl.to(textEl, { opacity: 0, duration: 0.22, ease: 'power1.in' }, 0);

        tl.call(() => {
            currentIndex = direction === 'next' ? getNextIndex() : getPrevIndex();
            applyContent(currentIndex);

            // Entrada: imagem surge do lado oposto com slide + fade suave
            gsap.set(centerInner, { x: xIn, opacity: 0 });
            if (textEl) gsap.set(textEl, { opacity: 0 });

            const tl2 = gsap.timeline({ onComplete() { isAnimating = false; } });
            tl2.to(centerInner, { x: 0, opacity: 1, duration: 0.42, ease: 'power3.out' }, 0);
            if (textEl) tl2.to(textEl, { opacity: 1, duration: 0.55, ease: 'power2.out' }, 0.15);
        });
    }

    // Navegação apenas pelas setas (botões), não pela miniatura
    const prevBtn2 = prevSlot ? prevSlot.querySelector('.carousel-thumb-nav') : null;
    const nextBtn2 = nextSlot ? nextSlot.querySelector('.carousel-thumb-nav') : null;

    // ── Autoplay ─────────────────────────────────────────────────────────────
    const AUTOPLAY_DELAY = 4000;
    let autoplayTimer = null;

    function startAutoplay() {
        stopAutoplay();
        autoplayTimer = setInterval(() => navigate('next'), AUTOPLAY_DELAY);
    }

    function stopAutoplay() {
        if (autoplayTimer) { clearInterval(autoplayTimer); autoplayTimer = null; }
    }

    // Pausa ao interagir manualmente, retoma após 8 s de inatividade
    function onManualNav(direction) {
        stopAutoplay();
        navigate(direction);
        setTimeout(startAutoplay, 8000);
    }

    if (prevBtn2) {
        prevBtn2.addEventListener('click', (e) => { e.stopPropagation(); onManualNav('prev'); });
        prevBtn2.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') onManualNav('prev'); });
    }
    if (nextBtn2) {
        nextBtn2.addEventListener('click', (e) => { e.stopPropagation(); onManualNav('next'); });
        nextBtn2.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') onManualNav('next'); });
    }

    // Pausa quando o usuário passa o mouse sobre o carrossel
    galleryEl.addEventListener('mouseenter', stopAutoplay);
    galleryEl.addEventListener('mouseleave', startAutoplay);

    applyContent(currentIndex);
    resetState();
    startAutoplay();
}

// ========== Ticker infinito de clientes ==========

function initClientsTicker() {
    const track = document.querySelector('.clients-track');
    if (!track) return;

    // Só pausa com hover real (mouse). Em touch, mouseenter pode disparar sem mouseleave — a animação trava.
    const canHover = window.matchMedia('(hover: hover)').matches;
    if (!canHover) return;

    track.addEventListener('mouseenter', () => {
        track.style.animationPlayState = 'paused';
    });

    track.addEventListener('mouseleave', () => {
        track.style.animationPlayState = '';
    });
}

// Menu hambúrguer (mobile)
function initMobileMenu() {
    const toggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.main-nav');
    if (!toggle || !nav) return;

    toggle.addEventListener('click', () => {
        const isOpen = nav.classList.toggle('is-open');
        toggle.classList.toggle('is-open', isOpen);
        toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    const header = document.querySelector('header');
    const getHeaderHeight = () => header ? header.offsetHeight : 0;

    nav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (!href || !href.startsWith('#')) return;
            e.preventDefault();
            const id = href.slice(1);
            const target = document.getElementById(id);
            if (nav.classList.contains('is-open')) {
                nav.classList.remove('is-open');
                toggle.classList.remove('is-open');
                toggle.setAttribute('aria-expanded', 'false');
            }
            if (target) {
                setTimeout(() => {
                    const top = target.getBoundingClientRect().top + window.scrollY - getHeaderHeight();
                    window.scrollTo({ top, behavior: 'smooth' });
                    history.pushState(null, '', href);
                }, 400);
            }
        });
    });
}

// ========== WhatsApp flutuante: para acima do footer no mobile ==========
function initWhatsappFloat() {
    const btn    = document.querySelector('.whatsapp-float');
    const footer = document.querySelector('footer');
    if (!btn || !footer) return;

    const BASE   = 8;  // px do fundo quando footer fora de vista
    const GAP    = 8;  // px acima da borda do footer

    function update() {
        if (window.innerWidth > 768) {
            btn.style.bottom = '';
            return;
        }

        const footerTop = footer.getBoundingClientRect().top;
        const windowH   = window.innerHeight;

        // Quanto do footer já entrou pela borda inferior do viewport
        const footerVisible = windowH - footerTop;

        if (footerVisible > 0) {
            // Footer parcial ou totalmente visível: sobe o botão
            btn.style.bottom = (footerVisible + GAP) + 'px';
        } else {
            // Footer ainda abaixo da tela
            btn.style.bottom = BASE + 'px';
        }
    }

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    // iOS Safari: a barra de URL dinâmica altera o viewport sem disparar 'resize'
    if (window.visualViewport) {
        window.visualViewport.addEventListener('scroll', update);
        window.visualViewport.addEventListener('resize', update);
    }

    update();
}

// ========== Mosaico com zoom — Algumas de Nossas Soluções ==========
function initSolucoesMosaic() {
    var photos = [
        {
            src: 'img/backdrops.png',
            alt: 'Backdrops',
            title: 'Backdrops',
            text: 'Cenário que transforma palco e marca: backdrops em boxtruss sob medida para sua narrativa brilhar; montagem LocHub com precisão e impacto visual memorável.'
        },
        {
            src: 'img/paineismodulares.jpg',
            alt: 'Painéis modulares',
            title: 'Painéis modulares',
            text: 'Painéis modulares LocHub elevam seu cenário com montagem veloz, resistência e design imbatível: impacto de marca e operação segura em qualquer evento.'
        },
        {
            src: 'img/porticosimples.png',
            alt: 'Pórtico simples',
            title: 'Pórtico simples',
            text: 'Pórtico simples LocHub: entrada que vira vitrine com estrutura enxuta, engenharia imbatível e montagem rápida para marcas que exigem presença forte desde o primeiro metro.'
        },
        {
            src: 'img/gradesplasticas.png',
            alt: 'Grades plásticas',
            title: 'Grades plásticas',
            text: 'Grades plásticas LocHub demarcam fluxo com leveza visual e montagem imbatível: filas organizadas, segurança percebida e operação ágil em eventos de massa.'
        },
        {
            src: 'img/porticos.png',
            alt: 'Pórticos envelopados',
            title: 'Pórticos envelopados',
            text: 'A chegada vira cenário de marca com estrutura sólida, envelopamento vibrante e impacto visual de primeira impressão; LocHub engenharia do início ao fim.'
        },
        {
            src: 'img/porticosbox.png',
            alt: 'Pórticos em boxtruss Q30',
            title: 'Pórticos em boxtruss Q30',
            text: 'Engenharia modular de alta capacidade e vão para arcos com branding, luz e carga; LocHub monta com precisão e normas rigorosas.'
        },
        {
            src: 'img/porticosboxq15.png',
            alt: 'Pórticos boxtruss Q15',
            title: 'Pórticos boxtruss Q15',
            text: 'Perfil enxuto e leve para entradas ágeis, vãos compactos e envelopamento com charme; LocHub monta rápido com segurança, norma e acabamento impecável.'
        },
        {
            src: 'img/tendas.png',
            alt: 'Tendas em boxtruss',
            title: 'Tendas em boxtruss',
            text: 'Cobertura modular com vão amplo e resistência para operações, lounges e bastidores; LocHub entrega estrutura, lona e montagem com engenharia e prazos.'
        },
        {
            src: 'img/tendaspiramidais.png',
            alt: 'Tendas piramidais',
            title: 'Tendas piramidais',
            text: 'Silhueta icônica que domina o espaço: tendas piramidais robustas e visuais impactantes; locação LocHub com qualidade para festivais e corridas.'
        },
        {
            src: 'img/backdropcustom.png',
            alt: 'Backdrop customizado',
            title: 'Backdrop customizado',
            text: 'Sua arte vira cenário em medidas, cores e materiais únicos; LocHub transforma briefing em estrutura, impressão e montagem com precisão e impacto cinematográfico.'
        },
        {
            src: 'img/bebedourosindustriais.png',
            alt: 'Bebedouros industriais',
            title: 'Bebedouros industriais',
            text: 'Alta vazão, resistência e higiene para hidratar multidões em corridas e festivais; LocHub instala, abastece e retira rápido com logística e padrão profissional.'
        },
        {
            src: 'img/gradesmetalicas.png',
            alt: 'Grades metálicas',
            title: 'Grades metálicas',
            text: 'Delimitam fluxo, protegem o público e organizam filas com estrutura robusta; LocHub posiciona, interliga e retira com segurança e operação ágil.'
        }
    ];

    var container = document.getElementById('mosaic');
    if (!container) return;

    var overlay = document.createElement('div');
    overlay.id = 'mosaic-zoom-overlay';
    overlay.className = 'mosaic-zoom-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Detalhe da solução');
    document.body.appendChild(overlay);

    function zoomSize() {
        var w = window.innerWidth;
        var h = window.innerHeight;
        if (w > 900) {
            var reserveText = 400;
            return Math.max(220, Math.min(720, h - 48, w - reserveText - 56));
        }
        return Math.max(220, Math.min(720, w - 28, Math.floor(h * 0.52)));
    }

    function openZoom(item) {
        overlay.innerHTML = '';
        overlay.style.display = 'flex';

        var dialog = document.createElement('div');
        dialog.className = 'mosaic-zoom-dialog';

        var zoomed = document.createElement('img');
        zoomed.className = 'mosaic-zoom-dialog__img';
        zoomed.src = item.src;
        zoomed.alt = item.alt || '';
        var z = zoomSize();
        zoomed.style.width = '0';
        zoomed.style.height = '0';

        var aside = document.createElement('div');
        aside.className = 'mosaic-zoom-dialog__text';

        var closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'mosaic-zoom-dialog__close';
        closeBtn.setAttribute('aria-label', 'Fechar');
        closeBtn.innerHTML = '\u00D7';
        closeBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            closeZoom();
        });

        var h3 = document.createElement('h3');
        h3.className = 'mosaic-zoom-dialog__title';
        h3.textContent = item.title || item.alt || '';
        var p = document.createElement('p');
        p.className = 'mosaic-zoom-dialog__body';
        p.textContent = item.text || '';
        aside.appendChild(h3);
        aside.appendChild(p);

        dialog.appendChild(zoomed);
        dialog.appendChild(aside);
        dialog.appendChild(closeBtn);
        overlay.appendChild(dialog);

        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                zoomed.style.width = z + 'px';
                zoomed.style.height = z + 'px';
            });
        });
    }

    function closeZoom() {
        var zoomed = overlay.querySelector('.mosaic-zoom-dialog__img');
        if (zoomed) {
            zoomed.style.width = '0';
            zoomed.style.height = '0';
            var dialog = overlay.querySelector('.mosaic-zoom-dialog');
            if (dialog) {
                dialog.style.opacity = '0';
                dialog.style.transform = 'translateY(6px)';
            }
            setTimeout(function () {
                overlay.style.display = 'none';
                overlay.innerHTML = '';
            }, 280);
        } else {
            overlay.style.display = 'none';
            overlay.innerHTML = '';
        }
    }

    photos.forEach(function (item, i) {
        var cell = document.createElement('div');
        cell.className = 'solucoes-mosaic__cell';

        var img = document.createElement('img');
        img.src = item.src;
        img.alt = item.alt;
        if (i > 3) img.loading = 'lazy';

        cell.appendChild(img);
        cell.addEventListener('click', function () { openZoom(item); });
        container.appendChild(cell);
    });
}

// ========== Accordion "Porque contratar a LocHub?" ==========
function initFaqAccordion() {
    const items = document.querySelectorAll('.accordion .accordion-item');
    if (!items.length) return;

    items.forEach(function (item) {
        const header  = item.querySelector('.accordion-header');
        const body    = item.querySelector('.accordion-body');
        if (!header || !body) return;

        header.addEventListener('click', function () {
            const isOpen = item.classList.contains('is-open');

            // Fecha todos os itens
            items.forEach(function (other) {
                if (other.classList.contains('is-open')) {
                    other.classList.remove('is-open');
                    other.querySelector('.accordion-body').style.maxHeight = null;
                    other.querySelector('.accordion-header').setAttribute('aria-expanded', 'false');
                }
            });

            // Se o clicado estava fechado, abre
            if (!isOpen) {
                item.classList.add('is-open');
                body.style.maxHeight = body.scrollHeight + 'px';
                header.setAttribute('aria-expanded', 'true');
            }
        });

        // Acessibilidade: ativa via teclado
        header.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                header.click();
            }
        });
    });
}

// ========== Accordion "Porque contratar a LocHub?" ==========
(function () {
    function initLocHubAccordion() {
        const items = document.querySelectorAll('.accordion-section .accordion-item');
        if (!items.length) return;

        items.forEach(function (item) {
            const header = item.querySelector('.accordion-header');
            if (!header) return;

            header.addEventListener('click', function () {
                const isOpen = item.classList.contains('is-open');

                // Fecha todos os itens
                items.forEach(function (el) {
                    el.classList.remove('is-open');
                    el.querySelector('.accordion-header').setAttribute('aria-expanded', 'false');
                });

                // Abre o clicado (se estava fechado)
                if (!isOpen) {
                    item.classList.add('is-open');
                    header.setAttribute('aria-expanded', 'true');
                }
            });
        });
    }

    document.addEventListener('DOMContentLoaded', initLocHubAccordion);
})();

document.addEventListener('DOMContentLoaded', () => {
    // Garante que a página sempre inicia no topo, ignorando âncoras na URL
    window.scrollTo(0, 0);

    initThumbnailCarousel(document.getElementById('gallerySolucoes'));
    initClientsTicker();
    initMobileMenu();
    initWhatsappFloat();
    initSolucoesMosaic();
    initFaqAccordion();
});
