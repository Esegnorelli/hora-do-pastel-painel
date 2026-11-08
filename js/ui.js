// Peças de interface compartilhadas: DOM seguro, status, tooltip, rótulos, tabelas, estados, CSV.
// Tudo que vem dos dados entra como texto (textContent / d3.text), nunca como HTML.

const d3 = window.d3;

export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

// Preenche os [data-k] de um bloco com valores já formatados.
export function fill(root, values) {
  root.querySelectorAll('[data-k]').forEach((el) => {
    const v = values[el.dataset.k];
    el.textContent = v == null || v === '' ? '—' : String(v);
    el.classList.remove('hp-skel');
  });
}

/* ---------- Status da conferência ---------- */
export const SITUACAO = {
  'Confere': { cls: 'st-ok', icon: '✓' },
  'Divergência': { cls: 'st-warn', icon: '!' },
  'Fora da planilha': { cls: 'st-serious', icon: '!' },
  'Não encontrada': { cls: 'st-crit', icon: '×' },
  'Desativada': { cls: 'st-off', icon: '–' }
};
export const ORDEM_SITUACAO = ['Não encontrada', 'Fora da planilha', 'Divergência', 'Confere', 'Desativada'];
export const sitOf = (s) => SITUACAO[s] || SITUACAO.Desativada;
export const statusIcon = (sit) => h('span', { class: 'hp-ico ' + sitOf(sit).cls, 'aria-hidden': 'true', text: sitOf(sit).icon });
export const statusPill = (sit) => h('span', { class: 'hp-pill' }, statusIcon(sit), sit);

/* ---------- Estados ---------- */
export const stateMsg = (el, msg, isError = false) => el.replaceChildren(h('div', { class: 'hp-state' + (isError ? ' is-error' : ''), role: isError ? 'alert' : null, text: msg }));

let liveEl = null;
export function announce(msg) {
  liveEl = liveEl || document.getElementById('hp-live');
  if (!liveEl) return;
  liveEl.textContent = '';
  // Esvaziar e preencher no quadro seguinte faz leitores de tela repetirem mensagens iguais.
  requestAnimationFrame(() => { liveEl.textContent = msg; });
}

/* ---------- Redesenho por largura ---------- */
// Cada gráfico se desenha com a largura do contêiner; o ResizeObserver redesenha quando a largura muda,
// inclusive quando a aba aparece (largura passa de 0 ao valor real).
const ro = new ResizeObserver((entries) => {
  for (const e of entries) {
    const el = e.target;
    const w = Math.round(e.contentRect.width);
    if (w > 0 && el._hpDraw && w !== el._hpW) { el._hpW = w; safeDraw(el, w); }
  }
});
function safeDraw(el, w) {
  try { el._hpDraw(el, w); } catch (err) { console.error(err); stateMsg(el, 'Não foi possível desenhar este gráfico.', true); }
}
export function mount(el, draw) {
  if (!el._hpDraw) ro.observe(el);
  el._hpDraw = draw;
  const w = Math.round(el.clientWidth);
  el._hpW = w;
  if (w > 0) safeDraw(el, w);
}

/* ---------- Formas ---------- */
// Barra horizontal: base reta, ponta de dados arredondada 4px.
export const barPath = (x0, y, x1, hgt) => {
  const w = Math.max(0, x1 - x0);
  const r = Math.min(4, hgt / 2, w);
  return `M${x0},${y}H${x0 + w - r}Q${x0 + w},${y} ${x0 + w},${y + r}V${y + hgt - r}Q${x0 + w},${y + hgt} ${x0 + w - r},${y + hgt}H${x0}Z`;
};
// Coluna: base reta embaixo, topo arredondado 4px.
export const colPath = (x, y0, y1, w) => {
  const hgt = Math.max(0, y0 - y1);
  const r = Math.min(4, w / 2, hgt);
  return `M${x},${y0}V${y0 - hgt + r}Q${x},${y0 - hgt} ${x + r},${y0 - hgt}H${x + w - r}Q${x + w},${y0 - hgt} ${x + w},${y0 - hgt + r}V${y0}Z`;
};

export function textWidth(svg, cls, texts) {
  const probe = svg.append('g').attr('aria-hidden', 'true');
  const w = d3.max(texts, (t) => probe.append('text').attr('class', cls).text(t).node().getComputedTextLength()) || 0;
  probe.remove();
  return w;
}

/* ---------- Tooltip ---------- */
// Linhas: [classe, texto, situação?]. Mouse passa por cima; toque toca; teclado foca.
export function tooltip(host) {
  const tip = h('div', { class: 'hp-tip', hidden: true, role: 'tooltip' });
  host.append(tip);
  const show = (lines, x, y) => {
    tip.replaceChildren(...lines.filter(Boolean).map(([cls, text, sit]) => h('div', { class: cls }, sit ? statusIcon(sit) : null, text)));
    tip.hidden = false;
    const w = host.clientWidth, tw = tip.offsetWidth, th = tip.offsetHeight;
    tip.style.left = Math.max(0, Math.min(w - tw, x + 12)) + 'px';
    tip.style.top = (y - th - 10 < 0 ? y + 16 : y - th - 10) + 'px';
  };
  const hide = () => { tip.hidden = true; };
  host.addEventListener('click', hide);
  const bind = (sel, linesFn, posFn) => sel
    .attr('tabindex', 0)
    .attr('role', 'img')
    .attr('aria-label', (d) => linesFn(d).filter(Boolean).map((l) => l[1]).join('. '))
    .on('pointerenter', (ev, d) => { if (ev.pointerType === 'mouse') show(linesFn(d), ...posFn(d)); })
    .on('pointerleave', (ev) => { if (ev.pointerType === 'mouse') hide(); })
    .on('click', (ev, d) => { ev.stopPropagation(); show(linesFn(d), ...posFn(d)); })
    .on('focus', (ev, d) => show(linesFn(d), ...posFn(d)))
    .on('blur', hide)
    .on('keydown', (ev) => { if (ev.key === 'Escape') hide(); });
  return { show, hide, bind };
}

/* ---------- Rótulos que não se sobrepõem ---------- */
// Tenta direita, esquerda, acima e abaixo; se nada couber, não rotula.
export function placeLabels(svg, items, w, hgt, cls) {
  const placed = items.map((p) => ({ x0: p.x - p.r, x1: p.x + p.r, y0: p.y - p.r, y1: p.y + p.r }));
  const hit = (b) => placed.some((o) => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0);
  const g = svg.append('g').attr('aria-hidden', 'true');
  for (const p of items.filter((q) => q.label)) {
    const t = g.append('text').attr('class', p.cls || cls).text(p.label);
    const tw = t.node().getComputedTextLength();
    const o = p.r + 3;
    const tries = [
      { x: p.x + o, y: p.y + 4, a: 'start', b: { x0: p.x + o - 1, x1: p.x + o + tw + 1, y0: p.y - 8, y1: p.y + 7 } },
      { x: p.x - o, y: p.y + 4, a: 'end', b: { x0: p.x - o - tw - 1, x1: p.x - o + 1, y0: p.y - 8, y1: p.y + 7 } },
      { x: p.x, y: p.y - o - 4, a: 'middle', b: { x0: p.x - tw / 2 - 1, x1: p.x + tw / 2 + 1, y0: p.y - o - 16, y1: p.y - o - 1 } },
      { x: p.x, y: p.y + o + 13, a: 'middle', b: { x0: p.x - tw / 2 - 1, x1: p.x + tw / 2 + 1, y0: p.y + o, y1: p.y + o + 15 } }
    ];
    const ok = tries.find((c) => c.b.x0 >= 0 && c.b.x1 <= w && c.b.y0 >= 0 && c.b.y1 <= hgt && !hit(c.b));
    if (ok) { t.attr('x', ok.x).attr('y', ok.y).attr('text-anchor', ok.a); placed.push(ok.b); } else t.remove();
  }
}

/* ---------- Tabelas ---------- */
// columns: [{ key, label, num?, lead?, sort?(r) → valor, text?(r) → string|Node, cls?(r) → classe extra }]
// Ordenável quando `sortable`; no celular a tabela vira cartões e a ordenação passa para um <select>.
// `pageSize` mostra as primeiras linhas e um botão "Mostrar mais" (evita páginas enormes no celular).
export function dataTable(table, { columns, rows = [], sort = null, sortable = false, empty = 'Nada para mostrar.', onSort = null, pageSize = 0 }) {
  const state = { rows, sort, shown: pageSize || Infinity };
  const thead = h('thead');
  const tbody = h('tbody');
  table.replaceChildren(thead, tbody);
  table.classList.add('hp-table', 'is-cards');
  const wrapEl = table.closest('.hp-table-wrap') || table;
  let more = null;
  if (pageSize) {
    more = wrapEl.parentElement.querySelector(':scope > .hp-more');
    if (!more) { more = h('div', { class: 'hp-more' }); wrapEl.after(more); }
  }

  const sortVal = (c, r) => (c.sort ? c.sort(r) : r[c.key]);
  const cmp = (a, b) => {
    if (a == null || a === '') return b == null || b === '' ? 0 : 1;
    if (b == null || b === '') return -1;
    return typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'pt-BR', { numeric: true });
  };
  const sorted = () => {
    if (!state.sort) return state.rows;
    const c = columns.find((x) => x.key === state.sort.key);
    if (!c) return state.rows;
    const dir = state.sort.dir === 'desc' ? -1 : 1;
    // Vazios sempre no fim, nos dois sentidos.
    return state.rows.slice().sort((a, b) => {
      const va = sortVal(c, a), vb = sortVal(c, b);
      const ea = va == null || va === '', eb = vb == null || vb === '';
      if (ea || eb) return ea === eb ? 0 : ea ? 1 : -1;
      return dir * cmp(va, vb);
    });
  };

  let mobileSel = null;
  if (sortable) {
    const wrap = table.closest('.hp-table-wrap') || table;
    mobileSel = wrap.parentElement.querySelector(':scope > .hp-sort-mobile select');
    if (!mobileSel) {
      mobileSel = h('select', { class: 'hp-select' });
      wrap.before(h('label', { class: 'hp-sort-mobile' }, h('span', { class: 'hp-ctrl-label', text: 'Ordenar por' }), mobileSel));
    }
    mobileSel.replaceChildren(...columns.flatMap((c) => [
      new Option(c.label + (c.num ? ' (maior primeiro)' : ' (A–Z)'), c.key + ':' + (c.num ? 'desc' : 'asc')),
      new Option(c.label + (c.num ? ' (menor primeiro)' : ' (Z–A)'), c.key + ':' + (c.num ? 'asc' : 'desc'))
    ]));
    mobileSel.onchange = () => { const [key, dir] = mobileSel.value.split(':'); setSort({ key, dir }); };
  }

  const setSort = (s) => {
    state.sort = s;
    renderHead();
    renderBody();
    if (onSort) onSort(s);
  };

  function renderMore(total) {
    if (!more) return;
    const rest = total - Math.min(total, state.shown);
    if (rest <= 0) { more.replaceChildren(); return; }
    const step = Math.min(pageSize, rest);
    more.replaceChildren(
      h('span', { class: 'hp-note', text: `Mostrando ${Math.min(total, state.shown)} de ${total}.` }),
      h('button', { type: 'button', class: 'hp-btn', text: `Mostrar mais ${step}`, onclick: () => { state.shown += pageSize; renderBody(true); } }),
      h('button', { type: 'button', class: 'hp-btn', text: 'Mostrar todos', onclick: () => { state.shown = Infinity; renderBody(true); } })
    );
  }

  function renderHead() {
    thead.replaceChildren(h('tr', null, columns.map((c) => {
      const active = state.sort && state.sort.key === c.key;
      const th = h('th', { scope: 'col', class: c.num ? 'num' : null, 'aria-sort': sortable ? (active ? (state.sort.dir === 'desc' ? 'descending' : 'ascending') : 'none') : null });
      if (!sortable) { th.textContent = c.label; return th; }
      th.append(h('button', {
        type: 'button', class: 'hp-sort', text: c.label,
        onclick: () => setSort({ key: c.key, dir: active ? (state.sort.dir === 'desc' ? 'asc' : 'desc') : (c.num ? 'desc' : 'asc') })
      }));
      return th;
    })));
    if (mobileSel && state.sort) mobileSel.value = state.sort.key + ':' + state.sort.dir;
  }

  function renderBody(keepFocus = false) {
    const list = sorted();
    renderMore(list.length);
    if (!list.length) {
      tbody.replaceChildren(h('tr', { class: 'is-empty' }, h('td', { colspan: columns.length, class: 'is-lead', text: empty })));
      return;
    }
    const before = tbody.rows.length;
    tbody.replaceChildren(...list.slice(0, state.shown).map((r) => h('tr', null, columns.map((c) => {
      const v = c.text ? c.text(r) : r[c.key];
      const extra = c.cls ? c.cls(r) : '';
      const td = h('td', { class: [c.num ? 'num' : '', c.lead ? 'is-lead' : '', extra || ''].join(' ').trim() || null, 'data-label': c.label });
      if (v instanceof Node) td.append(v); else td.textContent = v == null ? '' : String(v);
      return td;
    }))));
    // Depois de "Mostrar mais", o foco vai para a primeira linha nova (teclado não volta ao topo).
    if (keepFocus && tbody.rows[before]) {
      const cell = tbody.rows[before].cells[0];
      cell.tabIndex = -1;
      cell.focus();
    }
  }

  renderHead();
  renderBody();
  return {
    update(newRows) { state.rows = newRows; state.shown = pageSize || Infinity; renderBody(); },
    sorted,
    get sort() { return state.sort; }
  };
}

// Tabela equivalente de um gráfico, dentro de <details class="hp-alt">.
export function altTable(details, columns, rows, caption) {
  if (!details) return;
  let table = details.querySelector('table');
  if (!table) {
    details.replaceChildren(h('summary', { text: 'Ver os dados em tabela' }), h('div', { class: 'hp-table-wrap' }, table = h('table')));
  }
  dataTable(table, { columns, rows });
  if (caption) table.prepend(h('caption', { class: 'sr-only', text: caption }));
}

/* ---------- CSV ---------- */
// Células que começam com = + - @ viram texto no Excel/Sheets (evita fórmula vinda de dado raspado).
const safeCell = (v) => (/^[=+\-@\t\r]/.test(String(v ?? '')) && !/^-?\d/.test(String(v)) ? "'" + v : v);
export function downloadCSV(filename, rows, columns) {
  const clean = rows.map((r) => Object.fromEntries(columns.map((c) => [c, safeCell(r[c] ?? '')])));
  const text = '\ufeff' + d3.csvFormat(clean, columns) + '\n';
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = h('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
