// Abas, links diretos e "Copiar link".
// #visao, #conferencia, #concorrencia abrem a aba; #loja-0002 abre a concorrência com a loja escolhida.

import { announce } from './ui.js';

export const TABS = ['visao', 'conferencia', 'concorrencia'];

export function parseHash(hash) {
  const id = decodeURIComponent(String(hash || '').replace(/^#/, ''));
  const m = /^loja-([0-9]{4})$/.exec(id);
  if (m) return { tab: 'concorrencia', loja: m[1] };
  if (TABS.includes(id)) return { tab: id, loja: null };
  return { tab: TABS[0], loja: null };
}

export const hashFor = ({ tab, loja }) => (tab === 'concorrencia' && loja ? '#loja-' + loja : '#' + tab);

export function setHash(route, push = false) {
  const next = hashFor(route);
  if (location.hash === next) return;
  try {
    if (push) history.pushState(null, '', next); else history.replaceState(null, '', next);
  } catch { /* file:// ou sandbox sem history: segue sem link */ }
}

export function showTab(name, { focus = false } = {}) {
  // A partir daqui as abas seguem o atributo hidden; a dica do script inicial (data-tab) sai.
  delete document.documentElement.dataset.tab;
  document.querySelectorAll('.hp-tab').forEach((b) => {
    const on = b.dataset.tab === name;
    b.setAttribute('aria-selected', String(on));
    b.tabIndex = on ? 0 : -1;
    if (on && focus) b.focus();
  });
  document.querySelectorAll('.hp-panel').forEach((p) => { p.hidden = p.id !== name; });
}

// Teclado nas abas (padrão WAI-ARIA): setas, Home e End mudam de aba.
export function initTabs(onSelect) {
  const btns = [...document.querySelectorAll('.hp-tab')];
  btns.forEach((b, i) => {
    b.addEventListener('click', () => onSelect(b.dataset.tab));
    b.addEventListener('keydown', (ev) => {
      const j = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: btns.length - 1 }[ev.key];
      if (j == null) return;
      ev.preventDefault();
      const t = btns[(j + btns.length) % btns.length];
      onSelect(t.dataset.tab);
      t.focus();
    });
  });
}

export function initCopyLink(btn) {
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const url = location.href;
    let ok = false;
    try { await navigator.clipboard.writeText(url); ok = true; } catch { /* sem permissão: tenta o método antigo */ }
    if (!ok) {
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.setAttribute('readonly', '');
      ta.className = 'sr-only';
      document.body.append(ta);
      ta.select();
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      ta.remove();
    }
    const label = btn.querySelector('span');
    const old = label.textContent;
    label.textContent = ok ? 'Link copiado' : 'Não deu para copiar';
    announce(ok ? 'Link copiado: ' + url : 'Não deu para copiar o link. Copie da barra de endereço.');
    setTimeout(() => { label.textContent = old; }, 2000);
  });
}

// Tema: segue o sistema até a pessoa escolher; a escolha fica no localStorage.
export function initTheme(btn) {
  const KEY = 'hp-tema';
  const media = matchMedia('(prefers-color-scheme: dark)');
  const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const effective = () => document.documentElement.dataset.theme || (media.matches ? 'dark' : 'light');
  const paint = () => {
    const dark = effective() === 'dark';
    btn.querySelector('span').textContent = dark ? 'Usar tema claro' : 'Usar tema escuro';
  };
  const saved = read();
  if (saved === 'dark' || saved === 'light') document.documentElement.dataset.theme = saved;
  paint();
  media.addEventListener('change', paint);
  btn.addEventListener('click', () => {
    const next = effective() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(KEY, next); } catch { /* modo privado: vale só nesta visita */ }
    paint();
    document.dispatchEvent(new CustomEvent('hp:theme'));
  });
}
