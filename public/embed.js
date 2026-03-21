(function () {
  'use strict';

  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var companyId = script.getAttribute('data-company') || 'demo';
  var pageContext = script.getAttribute('data-context') || '';
  var embedMode = script.getAttribute('data-mode') || 'float'; // 'float' | 'banner'
  var baseUrl = script.src.replace('/embed.js', '');

  var WIDGET_WIDTH  = 420;
  var WIDGET_HEIGHT = 680;
  var STORAGE_OPEN     = 'concierge_open_'      + companyId;
  var STORAGE_BUBBLE   = 'concierge_bubble_'    + companyId;
  var STORAGE_EXIT     = 'concierge_exit_'      + companyId;
  var STORAGE_ENGAGED  = 'concierge_engaged_'   + companyId;

  // ── Brand colors (applied after config fetch) ────────────────────
  var brandNavy    = '#1E2B3C';
  var brandPrimary = '#B03A3A';

  // ── Floating button ──────────────────────────────────────────────
  var btn = document.createElement('button');
  btn.id = 'concierge-btn';
  btn.setAttribute('aria-label', 'Open Event Concierge');
  btn.style.cssText = [
    'position:fixed',
    'bottom:24px',
    'right:24px',
    'width:60px',
    'height:60px',
    'border-radius:50%',
    'background:' + brandNavy,
    'border:none',
    'cursor:pointer',
    'box-shadow:0 4px 24px rgba(0,0,0,0.28)',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'z-index:2147483646',
    'transition:transform 0.2s, box-shadow 0.2s',
  ].join(';');
  btn.innerHTML = chatIcon();

  btn.addEventListener('mouseenter', function () {
    btn.style.transform = 'scale(1.08)';
    btn.style.boxShadow = '0 6px 32px rgba(0,0,0,0.32)';
  });
  btn.addEventListener('mouseleave', function () {
    btn.style.transform = 'scale(1)';
    btn.style.boxShadow = '0 4px 24px rgba(0,0,0,0.28)';
  });

  // ── Proactive speech bubble ───────────────────────────────────────
  var bubble = document.createElement('div');
  bubble.id = 'concierge-bubble';
  bubble.style.cssText = [
    'position:fixed',
    'bottom:96px',
    'right:16px',
    'max-width:260px',
    'background:#fff',
    'border-radius:16px 16px 4px 16px',
    'box-shadow:0 4px 24px rgba(0,0,0,0.14)',
    'padding:14px 16px 12px',
    'z-index:2147483645',
    'opacity:0',
    'transform:translateY(10px) scale(0.95)',
    'transition:opacity 0.3s, transform 0.3s',
    'pointer-events:none',
    'font-family:system-ui,-apple-system,sans-serif',
  ].join(';');

  bubble.innerHTML =
    '<button id="concierge-bubble-close" style="position:absolute;top:8px;right:10px;background:none;border:none;cursor:pointer;color:#9ca3af;font-size:16px;line-height:1;padding:0;">×</button>' +
    '<p style="margin:0 16px 8px 0;font-size:13.5px;font-weight:600;color:#111827;line-height:1.4;">Need help finding the right rentals?</p>' +
    '<p style="margin:0 0 10px;font-size:12.5px;color:#6b7280;line-height:1.4;">Tell me about your event and I\'ll recommend the perfect items in seconds.</p>' +
    '<button id="concierge-bubble-cta" style="background:' + brandNavy + ';color:#fff;border:none;border-radius:10px;padding:8px 14px;font-size:12.5px;font-weight:600;cursor:pointer;width:100%;">Let\'s find your rentals →</button>';

  // ── iframe panel ─────────────────────────────────────────────────
  var panel = document.createElement('div');
  panel.id = 'concierge-panel';
  panel.style.cssText = [
    'position:fixed',
    'bottom:96px',
    'right:24px',
    'width:' + WIDGET_WIDTH + 'px',
    'height:' + WIDGET_HEIGHT + 'px',
    'max-height:calc(100vh - 110px)',
    'max-width:calc(100vw - 32px)',
    'border-radius:20px',
    'overflow:hidden',
    'box-shadow:0 8px 40px rgba(0,0,0,0.18)',
    'z-index:2147483645',
    'display:none',
    'transition:opacity 0.25s, transform 0.25s',
    'opacity:0',
    'transform:translateY(12px) scale(0.97)',
  ].join(';');

  var iframeSrc = baseUrl + '/widget?company=' + encodeURIComponent(companyId);
  if (pageContext) iframeSrc += '&context=' + encodeURIComponent(pageContext);

  var iframe = document.createElement('iframe');
  iframe.src = iframeSrc;
  iframe.style.cssText = 'width:100%;height:100%;border:none;display:block;';
  iframe.setAttribute('title', 'Event Concierge');
  panel.appendChild(iframe);

  // ── Toggle logic ─────────────────────────────────────────────────
  var isOpen = false;

  function open() {
    isOpen = true;
    hideBubble();
    panel.style.display = 'block';
    requestAnimationFrame(function () {
      panel.style.opacity = '1';
      panel.style.transform = 'translateY(0) scale(1)';
    });
    btn.innerHTML = closeIcon();
    try { sessionStorage.setItem(STORAGE_OPEN, '1'); sessionStorage.setItem(STORAGE_ENGAGED, '1'); } catch (e) {}
  }

  function close() {
    isOpen = false;
    panel.style.opacity = '0';
    panel.style.transform = 'translateY(12px) scale(0.97)';
    setTimeout(function () { panel.style.display = 'none'; }, 250);
    btn.innerHTML = chatIcon();
    try { sessionStorage.removeItem(STORAGE_OPEN); } catch (e) {}
  }

  btn.addEventListener('click', function () { isOpen ? close() : open(); });

  // ── Bubble helpers ────────────────────────────────────────────────
  function showBubble() {
    bubble.style.pointerEvents = 'auto';
    bubble.style.opacity = '1';
    bubble.style.transform = 'translateY(0) scale(1)';
  }

  function hideBubble() {
    bubble.style.opacity = '0';
    bubble.style.transform = 'translateY(10px) scale(0.95)';
    bubble.style.pointerEvents = 'none';
  }

  // Bubble buttons wired after mount
  function wireBubble() {
    var closeBtn = document.getElementById('concierge-bubble-close');
    var ctaBtn   = document.getElementById('concierge-bubble-cta');
    if (closeBtn) closeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      hideBubble();
      try { sessionStorage.setItem(STORAGE_BUBBLE, '1'); } catch (e2) {}
    });
    if (ctaBtn) ctaBtn.addEventListener('click', function () {
      hideBubble();
      open();
    });
  }

  // ── Proactive trigger (8s delay, once per session) ────────────────
  function maybeShowProactiveBubble() {
    try {
      if (sessionStorage.getItem(STORAGE_BUBBLE)) return;
      if (sessionStorage.getItem(STORAGE_ENGAGED)) return;
    } catch (e) {}
    setTimeout(function () {
      if (isOpen) return;
      showBubble();
      // Auto-dismiss after 9s if not interacted with
      setTimeout(function () {
        if (!isOpen) hideBubble();
      }, 9000);
    }, 8000);
  }

  // ── Exit intent trigger (once per session) ────────────────────────
  function setupExitIntent() {
    document.addEventListener('mouseleave', function handler(e) {
      if (e.clientY > 10) return; // Only trigger when cursor leaves through the top
      try {
        if (sessionStorage.getItem(STORAGE_EXIT)) return;
        if (sessionStorage.getItem(STORAGE_ENGAGED)) return;
        sessionStorage.setItem(STORAGE_EXIT, '1');
      } catch (err) {}
      document.removeEventListener('mouseleave', handler);
      if (isOpen) return;
      // Show bubble with an exit-specific message
      var p = bubble.querySelector('p');
      if (p) p.textContent = 'Before you go — get a custom quote for your event in 30 seconds!';
      showBubble();
    });
  }

  // ── postMessage bridge ────────────────────────────────────────────
  window.addEventListener('message', function (e) {
    if (!e.data || typeof e.data !== 'object') return;
    switch (e.data.type) {
      case 'CONCIERGE_CLOSE': close(); break;
      case 'CONCIERGE_ADD_TO_CART':
        var addEvent = new CustomEvent('concierge:addToCart', { detail: e.data.item, bubbles: true });
        document.dispatchEvent(addEvent);
        if (typeof window.onConciergeAddToCart === 'function') window.onConciergeAddToCart(e.data.item);
        break;
      case 'CONCIERGE_VIEW_CART':
        var cartEvent = new CustomEvent('concierge:viewCart', { bubbles: true });
        document.dispatchEvent(cartEvent);
        if (typeof window.onConciergeViewCart === 'function') window.onConciergeViewCart();
        break;
    }
  });

  // ── Inline banner mode ────────────────────────────────────────────
  if (embedMode === 'banner') {
    var banner = document.createElement('div');
    banner.id = 'concierge-banner-strip';
    banner.style.cssText = [
      'display:flex',
      'align-items:center',
      'justify-content:space-between',
      'gap:12px',
      'background:' + brandNavy,
      'color:#fff',
      'border-radius:14px',
      'padding:14px 18px',
      'font-family:system-ui,-apple-system,sans-serif',
      'box-shadow:0 4px 20px rgba(0,0,0,0.14)',
      'cursor:default',
    ].join(';');

    banner.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;">' +
        '<div style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;shrink:0;">' +
          chatIcon() +
        '</div>' +
        '<div>' +
          '<div style="font-size:14px;font-weight:700;line-height:1.3;">Need help finding the right rentals?</div>' +
          '<div style="font-size:12px;opacity:0.75;margin-top:2px;">Tell me about your event — I\'ll recommend the perfect items.</div>' +
        '</div>' +
      '</div>' +
      '<button id="concierge-banner-cta" style="background:' + brandPrimary + ';color:#fff;border:none;border-radius:10px;padding:9px 16px;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap;shrink:0;">Let\'s find yours →</button>';

    // Insert the banner where the script tag is
    script.parentNode.insertBefore(banner, script);

    document.getElementById('concierge-banner-cta').addEventListener('click', function () {
      open();
    });

    // Apply brand colors after config fetch (update banner too)
    fetch(baseUrl + '/api/company?id=' + encodeURIComponent(companyId))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.config) {
          brandNavy    = data.config.navyColor    || brandNavy;
          brandPrimary = data.config.primaryColor || brandPrimary;
          banner.style.background = brandNavy;
          btn.style.background = brandNavy;
          var ctaEl = document.getElementById('concierge-banner-cta');
          if (ctaEl) ctaEl.style.background = brandPrimary;
          var bubbleCta = document.getElementById('concierge-bubble-cta');
          if (bubbleCta) bubbleCta.style.background = brandNavy;
        }
      })
      .catch(function () {});
  }

  // ── Mount ─────────────────────────────────────────────────────────
  document.body.appendChild(btn);
  document.body.appendChild(bubble);
  document.body.appendChild(panel);

  wireBubble();
  maybeShowProactiveBubble();
  setupExitIntent();

  // Re-open if was open before page navigation
  try { if (sessionStorage.getItem(STORAGE_OPEN)) open(); } catch (e) {}

  // ── Apply company brand colors (float mode only — banner mode fetches inline above) ──
  if (embedMode !== 'banner') {
    fetch(baseUrl + '/api/company?id=' + encodeURIComponent(companyId))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.config) {
          brandNavy    = data.config.navyColor    || brandNavy;
          brandPrimary = data.config.primaryColor || brandPrimary;
          btn.style.background = brandNavy;
          var ctaBtn = document.getElementById('concierge-bubble-cta');
          if (ctaBtn) ctaBtn.style.background = brandNavy;
        }
      })
      .catch(function () {});
  }

  // ── SVG helpers ───────────────────────────────────────────────────
  function chatIcon() {
    return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>';
  }
  function closeIcon() {
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>';
  }

  // Public API
  window.EventConcierge = { open: open, close: close };
})();
