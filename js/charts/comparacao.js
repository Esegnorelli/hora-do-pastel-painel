// Loja × mediana dos vizinhos × mediana da rede: um painel por métrica, as três barras na mesma escala do painel.
// Valor ausente aparece como "—", nunca como barra zerada.

import { barPath, textWidth, tooltip } from '../ui.js';

const d3 = window.d3;

export const SERIES = [
  { key: 'loja', label: 'Loja', nome: 'Hora do Pastel', cls: 'f-loja' },
  { key: 'viz', label: 'Vizinhos', nome: 'Mediana dos vizinhos', cls: 'f-vizinhos' },
  { key: 'rede', label: 'Rede', nome: 'Mediana da rede', cls: 'f-rede' }
];

// metricas: [{ label, fmt(v) → texto, max?, loja, viz, rede }]
export function comparacao(el, w, { metricas }) {
  el.replaceChildren();
  const cols = w >= 880 ? 4 : w >= 440 ? 2 : 1;
  const gapX = 32, gapY = 16, band = 28, top = 26, bh = 16;
  const pw = (w - gapX * (cols - 1)) / cols;
  const ph = top + SERIES.length * band;
  const linhas = Math.ceil(metricas.length / cols);
  const hgt = linhas * ph + (linhas - 1) * gapY;
  const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${w} ${hgt}`)
    .attr('role', 'group').attr('aria-label', 'Loja, mediana dos vizinhos e mediana da rede em cada métrica');
  const fmt = (m, s) => (m[s.key] == null ? '—' : m.fmt(m[s.key]));
  const ml = textWidth(svg, 'hp-lbl-strong', SERIES.map((s) => s.label)) + 10;
  const vw = textWidth(svg, 'hp-lbl-muted', metricas.flatMap((m) => SERIES.map((s) => fmt(m, s)))) + 8;

  const itens = metricas.flatMap((m, k) => {
    const ox = (k % cols) * (pw + gapX), oy = Math.floor(k / cols) * (ph + gapY);
    const max = m.max ?? (d3.max(SERIES, (s) => m[s.key]) || 1);
    const x = d3.scaleLinear([0, max], [ml, Math.max(ml + 20, pw - vw)]);
    return SERIES.map((s, i) => ({ m, s, v: m[s.key], ox, oy, x, y: oy + top + i * band }));
  });

  svg.selectAll('text.titulo').data(metricas).join('text').attr('class', 'hp-lbl-strong titulo')
    .attr('x', (m, k) => (k % cols) * (pw + gapX)).attr('y', (m, k) => Math.floor(k / cols) * (ph + gapY) + 14).text((m) => m.label);
  svg.selectAll('line.hp-axis').data(metricas).join('line').attr('class', 'hp-axis')
    .attr('x1', (m, k) => (k % cols) * (pw + gapX) + ml).attr('x2', (m, k) => (k % cols) * (pw + gapX) + ml)
    .attr('y1', (m, k) => Math.floor(k / cols) * (ph + gapY) + top - 2).attr('y2', (m, k) => Math.floor(k / cols) * (ph + gapY) + ph);

  const cy = (d) => d.y + (band - bh) / 2;
  const tip0 = (d) => (d.v == null ? d.ox + ml : d.ox + d.x(d.v));
  svg.selectAll('text.serie').data(itens).join('text').attr('class', (d) => (d.s.key === 'loja' ? 'hp-lbl-strong serie' : 'hp-lbl serie'))
    .attr('x', (d) => d.ox + ml - 8).attr('y', (d) => cy(d) + bh / 2 + 4).attr('text-anchor', 'end').text((d) => d.s.label);
  svg.selectAll('path.hp-bar').data(itens.filter((d) => d.v != null)).join('path').attr('class', (d) => 'hp-bar ' + d.s.cls)
    .attr('d', (d) => barPath(d.ox + ml + 1, cy(d), Math.max(d.ox + ml + 2, tip0(d)), bh));
  svg.selectAll('text.valor').data(itens).join('text').attr('class', 'hp-lbl-muted valor')
    .attr('x', (d) => Math.max(d.ox + ml + 2, tip0(d)) + 6).attr('y', (d) => cy(d) + bh / 2 + 4).text((d) => fmt(d.m, d.s));

  const tip = tooltip(el);
  tip.bind(svg.selectAll('rect.hp-hit').data(itens).join('rect').attr('class', 'hp-hit')
    .attr('x', (d) => d.ox).attr('width', pw).attr('y', (d) => d.y).attr('height', band),
  (d) => [['hp-tip-val', fmt(d.m, d.s)], ['hp-tip-head', d.s.nome + ' · ' + d.m.label]],
  (d) => [Math.min(tip0(d), w - 80), d.y]);
}
