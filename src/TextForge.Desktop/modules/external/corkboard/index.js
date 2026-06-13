/**
 * TextForge Cork Board Module — v1.0.0
 * Canonical example of a TextForge external module.
 *
 * Contract:
 *   - Assigns window.__textforge_module_last__ = { mount, resolveLinkable }
 *   - mount(container, props) renders the UI and returns a cleanup function
 *   - resolveLinkable(entityId) returns { id, name } for a card, or null
 *
 * Storage: one JSON file at {storageBase}/cards.json?bookId={projectId}
 *
 * Card schema: { id: string, title: string, body: string, x: number, y: number, color: string }
 */
(function () {
  'use strict';

  // ── In-memory state ──────────────────────────────────────────────────────────

  /** @type {Map<string, Card>} */
  const cardStore = new Map();

  /**
   * @typedef {{ id: string, title: string, body: string, x: number, y: number, color: string }} Card
   */

  // ── Storage helpers ──────────────────────────────────────────────────────────

  function storageUrl(storageBase, projectId, path) {
    return `${storageBase}/${path}?bookId=${encodeURIComponent(projectId)}`;
  }

  async function loadCards(storageBase, projectId, boardId) {
    try {
      const res = await fetch(storageUrl(storageBase, projectId, `${boardId}/cards.json`));
      if (res.status === 404) return [];
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return [];
    }
  }

  async function saveCards(storageBase, projectId, boardId, cards) {
    try {
      await fetch(storageUrl(storageBase, projectId, `${boardId}/cards.json`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cards),
      });
    } catch {
      // best-effort; user will see stale state on reload if this fails
    }
  }

  // ── Utilities ────────────────────────────────────────────────────────────────

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  const COLORS = [
    '#f9e4a0', // yellow
    '#f9c4a0', // orange
    '#f9a0a0', // red
    '#a0f9c4', // green
    '#a0c4f9', // blue
    '#d4a0f9', // purple
    '#f9f9f9', // white
  ];

  function nextColor(cards) {
    const counts = {};
    COLORS.forEach(c => (counts[c] = 0));
    cards.forEach(c => { if (counts[c.color] !== undefined) counts[c.color]++; });
    return COLORS.reduce((a, b) => (counts[a] <= counts[b] ? a : b));
  }

  // ── Styles ───────────────────────────────────────────────────────────────────

  const STYLE_ID = 'tf-corkboard-styles';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = `
      .tf-cb-root {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        background: #c8a87a;
        background-image:
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.07) 0%, transparent 60%),
          url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='4' fill='%23b8965e'/%3E%3Crect x='0' y='0' width='2' height='2' fill='%23c0a060' opacity='0.4'/%3E%3C/svg%3E");
        font-family: ui-monospace, 'JetBrains Mono', monospace;
        position: relative;
        overflow: hidden;
      }

      .tf-cb-toolbar {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px;
        background: rgba(0,0,0,0.25);
        border-bottom: 1px solid rgba(0,0,0,0.3);
        flex-shrink: 0;
        backdrop-filter: blur(4px);
      }

      .tf-cb-toolbar-title {
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(255,255,255,0.7);
        flex: 1;
      }

      .tf-cb-btn {
        padding: 4px 10px;
        background: rgba(255,255,255,0.15);
        border: 1px solid rgba(255,255,255,0.25);
        border-radius: 4px;
        color: #fff;
        font-size: 11px;
        font-family: inherit;
        cursor: pointer;
        transition: background 0.1s;
        white-space: nowrap;
      }
      .tf-cb-btn:hover { background: rgba(255,255,255,0.28); }
      .tf-cb-btn:active { background: rgba(255,255,255,0.12); }

      .tf-cb-count {
        font-size: 11px;
        color: rgba(255,255,255,0.45);
      }

      .tf-cb-canvas {
        flex: 1;
        min-height: 0;
        position: relative;
        overflow: auto;
        cursor: default;
      }

      .tf-cb-inner {
        position: relative;
        min-width: 2400px;
        min-height: 1600px;
      }

      .tf-cb-card {
        position: absolute;
        width: 200px;
        min-height: 140px;
        border-radius: 3px;
        padding: 10px;
        box-shadow: 3px 4px 10px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.2);
        display: flex;
        flex-direction: column;
        gap: 6px;
        cursor: grab;
        user-select: none;
        transition: box-shadow 0.12s, transform 0.08s;
        transform: rotate(var(--rot, 0deg));
      }
      .tf-cb-card:hover {
        box-shadow: 4px 6px 16px rgba(0,0,0,0.45), 0 1px 3px rgba(0,0,0,0.25);
        z-index: 10;
      }
      .tf-cb-card.dragging {
        cursor: grabbing;
        box-shadow: 8px 12px 28px rgba(0,0,0,0.55);
        z-index: 100;
        transform: rotate(var(--rot, 0deg)) scale(1.04);
      }

      .tf-cb-card-pin {
        position: absolute;
        top: -10px;
        left: 50%;
        transform: translateX(-50%);
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: radial-gradient(circle at 35% 35%, #e04040, #8b0000);
        box-shadow: 0 2px 4px rgba(0,0,0,0.5);
        pointer-events: none;
      }

      .tf-cb-card-title {
        font-size: 12px;
        font-weight: 700;
        color: #1a1a1a;
        outline: none;
        border: none;
        background: transparent;
        font-family: inherit;
        resize: none;
        width: 100%;
        line-height: 1.3;
        min-height: 1.3em;
        padding: 0;
        overflow: hidden;
      }
      .tf-cb-card-title::placeholder { color: rgba(0,0,0,0.3); }

      .tf-cb-card-body {
        font-size: 11px;
        color: #333;
        outline: none;
        border: none;
        background: transparent;
        font-family: inherit;
        resize: none;
        width: 100%;
        flex: 1;
        min-height: 60px;
        padding: 0;
        line-height: 1.5;
      }
      .tf-cb-card-body::placeholder { color: rgba(0,0,0,0.3); }

      .tf-cb-card-footer {
        display: flex;
        gap: 4px;
        justify-content: flex-end;
        flex-shrink: 0;
      }

      .tf-cb-color-dot {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 2px solid rgba(0,0,0,0.2);
        cursor: pointer;
        transition: transform 0.1s;
        flex-shrink: 0;
      }
      .tf-cb-color-dot:hover { transform: scale(1.3); }

      .tf-cb-card-delete {
        width: 18px;
        height: 18px;
        border: none;
        background: rgba(0,0,0,0.12);
        border-radius: 3px;
        color: rgba(0,0,0,0.5);
        font-size: 13px;
        line-height: 1;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: inherit;
        transition: background 0.1s, color 0.1s;
      }
      .tf-cb-card-delete:hover { background: rgba(180,30,30,0.2); color: #900; }

      .tf-cb-empty {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        color: rgba(255,255,255,0.4);
        font-size: 13px;
        pointer-events: none;
        user-select: none;
      }
      .tf-cb-empty-icon {
        font-size: 40px;
        opacity: 0.5;
      }

      .tf-cb-saving {
        font-size: 10px;
        color: rgba(255,255,255,0.35);
        align-self: center;
      }
    `;
    document.head.appendChild(el);
  }

  // ── DOM helpers ──────────────────────────────────────────────────────────────

  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (k === 'className') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
      else el.setAttribute(k, v);
    });
    children.forEach(c => c && el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return el;
  }

  // ── Card DOM ─────────────────────────────────────────────────────────────────

  function renderCard(card, { onDragStart, onSave, onDelete, onColorChange }) {
    const rot = (((card.id.charCodeAt(0) + card.id.charCodeAt(1)) % 7) - 3) * 0.8;
    const el = h('div', {
      className: 'tf-cb-card',
      style: {
        left: card.x + 'px',
        top: card.y + 'px',
        background: card.color,
        '--rot': rot + 'deg',
      },
    });

    // Pin
    el.appendChild(h('div', { className: 'tf-cb-card-pin' }));

    // Title
    const titleEl = h('textarea', {
      className: 'tf-cb-card-title',
      rows: '1',
      placeholder: 'Title…',
    });
    titleEl.value = card.title;
    titleEl.addEventListener('input', () => {
      titleEl.style.height = 'auto';
      titleEl.style.height = titleEl.scrollHeight + 'px';
      card.title = titleEl.value;
      onSave();
    });
    // Grow on mount
    setTimeout(() => {
      titleEl.style.height = 'auto';
      titleEl.style.height = titleEl.scrollHeight + 'px';
    }, 0);
    el.appendChild(titleEl);

    // Body
    const bodyEl = h('textarea', {
      className: 'tf-cb-card-body',
      placeholder: 'Notes…',
    });
    bodyEl.value = card.body;
    bodyEl.addEventListener('input', () => {
      card.body = bodyEl.value;
      onSave();
    });
    el.appendChild(bodyEl);

    // Footer: color swatches + delete
    const footer = h('div', { className: 'tf-cb-card-footer' });
    COLORS.forEach(c => {
      const dot = h('div', {
        className: 'tf-cb-color-dot',
        style: {
          background: c,
          outline: c === card.color ? '2px solid rgba(0,0,0,0.5)' : 'none',
          outlineOffset: '1px',
        },
        title: 'Change color',
      });
      dot.addEventListener('click', e => {
        e.stopPropagation();
        onColorChange(card.id, c);
      });
      footer.appendChild(dot);
    });
    const del = h('button', { className: 'tf-cb-card-delete', title: 'Delete card' }, '×');
    del.addEventListener('click', e => { e.stopPropagation(); onDelete(card.id); });
    footer.appendChild(del);
    el.appendChild(footer);

    // Drag to move
    el.addEventListener('mousedown', e => {
      if (e.target === titleEl || e.target === bodyEl || e.target === del) return;
      if (e.target.classList.contains('tf-cb-color-dot')) return;
      e.preventDefault();
      onDragStart(e, card, el);
    });

    el.dataset.cardId = card.id;
    return el;
  }

  // ── Main mount ───────────────────────────────────────────────────────────────

  function mount(container, props) {
    injectStyles();

    const { storageBase, projectId, boardId, boardName } = props;
    let cards = [];
    let saveTimer = null;
    let savingEl = null;

    // ── Root
    const root = h('div', { className: 'tf-cb-root' });
    container.appendChild(root);

    // ── Toolbar
    const toolbar = h('div', { className: 'tf-cb-toolbar' });
    const titleSpan = h('span', { className: 'tf-cb-toolbar-title' }, boardName || 'Cork Board');
    const countEl = h('span', { className: 'tf-cb-count' }, '0 cards');
    savingEl = h('span', { className: 'tf-cb-saving' }, '');
    const addBtn = h('button', { className: 'tf-cb-btn' }, '+ New Card');
    toolbar.append(titleSpan, countEl, savingEl, addBtn);
    root.appendChild(toolbar);

    // ── Canvas
    const canvas = h('div', { className: 'tf-cb-canvas' });
    const inner = h('div', { className: 'tf-cb-inner' });
    canvas.appendChild(inner);
    root.appendChild(canvas);

    // ── Empty state
    const emptyEl = h('div', { className: 'tf-cb-empty' });
    emptyEl.appendChild(h('div', { className: 'tf-cb-empty-icon' }, '📌'));
    emptyEl.appendChild(h('div', {}, 'No cards yet'));
    emptyEl.appendChild(h('div', { style: { fontSize: '11px', opacity: '0.7' } }, 'Click "+ New Card" to start'));
    inner.appendChild(emptyEl);

    // ── Save (debounced)
    function scheduleSave() {
      clearTimeout(saveTimer);
      savingEl.textContent = '';
      saveTimer = setTimeout(async () => {
        savingEl.textContent = 'Saving…';
        await saveCards(storageBase, projectId, boardId, cards);
        savingEl.textContent = '';
      }, 600);
    }

    // ── Render all
    function updateEmpty() {
      emptyEl.style.display = cards.length === 0 ? 'flex' : 'none';
      countEl.textContent = cards.length === 1 ? '1 card' : `${cards.length} cards`;
    }

    function rerenderCard(card) {
      const existing = inner.querySelector(`[data-card-id="${card.id}"]`);
      const newEl = buildCardEl(card);
      if (existing) inner.replaceChild(newEl, existing);
      else inner.appendChild(newEl);
    }

    function buildCardEl(card) {
      return renderCard(card, {
        onDragStart: startDrag,
        onSave: scheduleSave,
        onDelete: (id) => {
          cards = cards.filter(c => c.id !== id);
          const el = inner.querySelector(`[data-card-id="${id}"]`);
          if (el) inner.removeChild(el);
          updateEmpty();
          scheduleSave();
        },
        onColorChange: (id, color) => {
          const card = cards.find(c => c.id === id);
          if (!card) return;
          card.color = color;
          rerenderCard(card);
          scheduleSave();
        },
      });
    }

    function renderAll() {
      // Remove old card elements
      inner.querySelectorAll('.tf-cb-card').forEach(el => inner.removeChild(el));
      cards.forEach(card => inner.appendChild(buildCardEl(card)));
      updateEmpty();
    }

    // ── Drag
    let dragging = null; // { card, el, startX, startY, origX, origY }

    function startDrag(e, card, el) {
      el.classList.add('dragging');
      const canvasRect = canvas.getBoundingClientRect();
      dragging = {
        card,
        el,
        startX: e.clientX + canvas.scrollLeft - canvasRect.left,
        startY: e.clientY + canvas.scrollTop - canvasRect.top,
        origX: card.x,
        origY: card.y,
      };
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    function onMouseMove(e) {
      if (!dragging) return;
      const canvasRect = canvas.getBoundingClientRect();
      const x = e.clientX + canvas.scrollLeft - canvasRect.left - (dragging.startX - dragging.origX);
      const y = e.clientY + canvas.scrollTop - canvasRect.top - (dragging.startY - dragging.origY);
      dragging.card.x = Math.max(0, x);
      dragging.card.y = Math.max(0, y);
      dragging.el.style.left = dragging.card.x + 'px';
      dragging.el.style.top = dragging.card.y + 'px';
    }

    function onMouseUp() {
      if (!dragging) return;
      dragging.el.classList.remove('dragging');
      scheduleSave();
      dragging = null;
    }

    // ── Add card
    addBtn.addEventListener('click', () => {
      const scrollX = canvas.scrollLeft;
      const scrollY = canvas.scrollTop;
      const canvasW = canvas.clientWidth;
      const canvasH = canvas.clientHeight;

      // Place near center of current viewport with slight randomness
      const x = scrollX + canvasW / 2 - 100 + (Math.random() - 0.5) * 200;
      const y = scrollY + canvasH / 2 - 70 + (Math.random() - 0.5) * 120;

      const card = {
        id: uid(),
        title: '',
        body: '',
        x: Math.max(20, Math.round(x)),
        y: Math.max(20, Math.round(y)),
        color: nextColor(cards),
      };
      cards.push(card);
      cardStore.set(card.id, card);
      inner.appendChild(buildCardEl(card));
      updateEmpty();
      scheduleSave();

      // Focus title of new card
      const newEl = inner.querySelector(`[data-card-id="${card.id}"]`);
      const ta = newEl?.querySelector('.tf-cb-card-title');
      if (ta) setTimeout(() => ta.focus(), 50);
    });

    // ── Load initial data
    loadCards(storageBase, projectId, boardId).then(loaded => {
      cards = Array.isArray(loaded) ? loaded : [];
      // Sync into cardStore for resolveLinkable
      cardStore.clear();
      cards.forEach(c => cardStore.set(c.id, c));
      renderAll();
    });

    // ── Cleanup
    return function cleanup() {
      clearTimeout(saveTimer);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      container.removeChild(root);
    };
  }

  // ── resolveLinkable ──────────────────────────────────────────────────────────

  function resolveLinkable(entityId) {
    const card = cardStore.get(entityId);
    if (!card) return null;
    return { id: card.id, name: card.title || '(Untitled card)' };
  }

  // ── UMD export ───────────────────────────────────────────────────────────────

  window.__textforge_module_last__ = { mount, resolveLinkable };
})();
