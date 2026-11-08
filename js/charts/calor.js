// Mapa de calor: quantos vizinhos estão abertos em cada dia e hora (10h às 24h),
// com o horário da própria loja contornado. Em telas estreitas os eixos trocam de lugar
// (dias nas colunas, horas nas linhas) para cada célula manter pelo menos 24px de toque.

import { h, tooltip } from '../ui.js';
import { nf0, DIAS } from '../format.js';
import { parseHorarios, abertoNaHora } from '../data.js';

const d3 = window.d3;
export const HORAS = d3.range(10, 24);
const NIVEIS = 5;

// Por dia e hora: vizinhos abertos (entre os que têm horário) e se a loja está aberta (null = sem horário).
export function abertosPorHora(rows, loja) {
  const hor = rows.map((r) => parseHorarios(r.horarios)).filter(Boolean);
  const daLoja = parseHorarios(loja.horarios);
  return {
    total: hor.length,
    lojaTemHorario: daLoja != null,
    dias: DIAS.map(([k, label], i) => ({
      k, label,
      horas: HORAS.map((hr) => ({ hr, n: hor.filter((d) => abertoNaHora(d[i], hr)).length, loja: daLoja ? abertoNaHora(daLoja[i], hr) : null }))
    }))
  };
}

// Trechos contínuos em que a loja abre: [[primeira hora, última hora + 1), …] em índices de HORAS.
const faixas = (horas) => horas.reduce((acc, c, j) => {
  if (!c.loja) return acc;
  const last = acc[acc.length - 1];
  if (last && last[1] === j) last[1] = j + 1; else acc.push([j, j + 1]);
  return acc;
}, []);

const faixaHora = (hr) => hr + 'h–' + (hr + 1) + 'h';
const lojaTxt = (c) => (c.loja == null ? 'horário da loja não informado' : c.loja ? 'loja aberta' : 'loja fechada');

export function calor(el, w, { dados }) {
  el.replaceChildren();
  const { total, dias } = dados;
  const max = d3.max(dias, (d) => d3.max(d.horas, (c) => c.n)) || 0;
  const nivel = (n) => (n === 0 ? 0 : Math.max(1, Math.ceil((n / max) * NIVEIS)));

  el.append(h('ul', { class: 'hp-legend hm-legend' },
    h('li', null, h('span', { text: '0' }),
      h('span', { class: 'hm-key', 'aria-hidden': 'true' }, d3.range(NIVEIS + 1).map((k) => h('span', { class: 'hm-sw hm-' + k }))),
      h('span', { text: nf0.format(max) + ' abertos' })),
    dados.lojaTemHorario ? h('li', null, h('span', { class: 'hm-sw is-loja', 'aria-hidden': 'true' }), 'Horário da loja') : null));

  const ml = 36, mt = 22;
  const vert = (w - ml) / HORAS.length < 24;
  const cw = vert ? (w - ml) / DIAS.length : (w - ml) / HORAS.length;
  const ch = vert ? 26 : 28;
  const hgt = mt + (vert ? HORAS.length : DIAS.length) * ch;
  // i = dia, j = hora → canto da célula.
  const xy = (i, j) => (vert ? [ml + i * cw, mt + j * ch] : [ml + j * cw, mt + i * ch]);

  const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${w} ${hgt}`)
    .attr('role', 'group').attr('aria-label', 'Vizinhos abertos por dia e hora. Use as setas para andar entre as células.');

  const passoHora = !vert && cw < 30 ? 2 : 1;
  svg.selectAll('text.hr').data(HORAS.filter((hr, j) => j % passoHora === 0)).join('text').attr('class', 'hp-lbl-muted hr')
    .attr('x', (hr) => (vert ? ml - 6 : xy(0, hr - 10)[0] + cw / 2))
    .attr('y', (hr) => (vert ? xy(0, hr - 10)[1] + ch / 2 + 4 : mt - 8))
    .attr('text-anchor', vert ? 'end' : 'middle').text((hr) => hr + 'h');
  svg.selectAll('text.dia').data(dias).join('text').attr('class', 'hp-lbl dia')
    .attr('x', (d, i) => (vert ? xy(i, 0)[0] + cw / 2 : ml - 8))
    .attr('y', (d, i) => (vert ? mt - 8 : xy(i, 0)[1] + ch / 2 + 4))
    .attr('text-anchor', vert ? 'middle' : 'end').text((d) => d.label);

  const cells = dias.flatMap((d, i) => d.horas.map((c, j) => ({ ...c, i, j, dia: d.label })));
  const g = svg.append('g');
  const pos = (c) => xy(c.i, c.j);
  g.selectAll('rect.hm-cell').data(cells).join('rect')
    .attr('class', (c) => 'hm-cell hm-' + nivel(c.n))
    .attr('x', (c) => pos(c)[0] + 1).attr('y', (c) => pos(c)[1] + 1)
    .attr('width', cw - 2).attr('height', ch - 2).attr('rx', 2);
  if (cw >= 26) {
    g.selectAll('text.hm-txt').data(cells).join('text')
      .attr('class', (c) => 'hm-txt hm-' + nivel(c.n))
      .attr('x', (c) => pos(c)[0] + cw / 2).attr('y', (c) => pos(c)[1] + ch / 2 + 4)
      .attr('text-anchor', 'middle').text((c) => nf0.format(c.n));
  }

  const bandas = dias.flatMap((d, i) => faixas(d.horas).map(([a, b]) => ({ i, a, b })));
  g.selectAll('rect.hm-loja').data(bandas).join('rect').attr('class', 'hm-loja')
    .attr('x', (b) => xy(b.i, b.a)[0] + 1).attr('y', (b) => xy(b.i, b.a)[1] + 1)
    .attr('width', (b) => (vert ? cw : (b.b - b.a) * cw) - 2)
    .attr('height', (b) => (vert ? (b.b - b.a) * ch : ch) - 2).attr('rx', 2);

  const tip = tooltip(el);
  const hits = g.selectAll('rect.hp-hit').data(cells).join('rect').attr('class', 'hp-hit')
    .attr('x', (c) => pos(c)[0]).attr('y', (c) => pos(c)[1]).attr('width', cw).attr('height', ch);
  tip.bind(hits,
    (c) => [['hp-tip-val', nf0.format(c.n) + ' de ' + nf0.format(total) + ' abertos'], ['hp-tip-head', c.dia + ', ' + faixaHora(c.hr) + ' · ' + lojaTxt(c)]],
    (c) => [pos(c)[0] + cw / 2, pos(c)[1]]);

  // Uma parada de Tab para a grade inteira; as setas andam entre as células.
  const nodes = hits.nodes();
  const foca = (k) => { hits.attr('tabindex', (c, n) => (n === k ? 0 : -1)); nodes[k].focus(); };
  hits.attr('tabindex', (c, n) => (n === 0 ? 0 : -1))
    .on('keydown.grade', (ev, c) => {
      const delta = { ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0] }[ev.key];
      if (!delta) return;
      ev.preventDefault();
      const [dr, dc] = delta;
      const [di, dj] = vert ? [dc, dr] : [dr, dc]; // em pé, linha = hora e coluna = dia
      const i = Math.min(DIAS.length - 1, Math.max(0, c.i + di));
      const j = Math.min(HORAS.length - 1, Math.max(0, c.j + dj));
      foca(i * HORAS.length + j);
    });
}
