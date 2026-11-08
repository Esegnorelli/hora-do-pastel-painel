// Nota × avaliações: cada loja da rede e, ligada a ela, a mediana dos vizinhos a até 3 km.
// Avaliações em escala logarítmica: as lojas vão de poucas a centenas de avaliações.

import { tooltip, placeLabels } from '../ui.js';
import { nf0, nf1 } from '../format.js';

const d3 = window.d3;

// lojas: [{ nota, av, ativa, label, r }]; medianas: [{ nota, av, loja, ... }] com `loja` apontando para o ponto da loja.
export function dispersao(el, w, { lojas, medianas, lojaLines, medLines, label }) {
  el.replaceChildren();
  const hgt = Math.round(Math.max(300, Math.min(440, w * 0.6)));
  const m = { t: 12, r: 16, b: 30, l: 34 };
  const all = lojas.concat(medianas);
  const lo = Math.floor((d3.min(all, (p) => p.nota) - 0.05) * 2) / 2;
  const hi = Math.min(5, Math.ceil((d3.max(all, (p) => p.nota) + 0.05) * 2) / 2);
  const e0 = Math.floor(Math.log10(d3.min(all, (p) => p.av)));
  const e1 = Math.max(e0 + 1, Math.ceil(Math.log10(d3.max(all, (p) => p.av))));
  const x = d3.scaleLog([10 ** e0, 10 ** e1], [m.l, w - m.r]);
  const y = d3.scaleLinear([lo, hi], [hgt - m.b, m.t]);
  const xt = d3.range(e0, e1 + 1).map((e) => 10 ** e);
  const yt = d3.range(lo, hi + 0.001, 0.5);
  all.forEach((p) => { p.x = x(p.av); p.y = y(p.nota); });

  const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${w} ${hgt}`)
    .attr('role', 'group').attr('aria-label', label);
  const axes = svg.append('g').attr('aria-hidden', 'true');
  axes.selectAll('line.v').data(xt).join('line').attr('class', 'hp-grid-line')
    .attr('x1', x).attr('x2', x).attr('y1', m.t).attr('y2', hgt - m.b);
  axes.selectAll('line.h').data(yt).join('line').attr('class', 'hp-grid-line')
    .attr('x1', m.l).attr('x2', w - m.r).attr('y1', y).attr('y2', y);
  axes.append('line').attr('class', 'hp-axis').attr('x1', m.l).attr('x2', w - m.r).attr('y1', hgt - m.b).attr('y2', hgt - m.b);
  axes.selectAll('text.x').data(xt).join('text').attr('class', 'hp-lbl-muted')
    .attr('x', x).attr('y', hgt - m.b + 16).attr('text-anchor', (t, i) => (i === xt.length - 1 ? 'end' : 'middle'))
    .text((t) => nf0.format(t));
  axes.selectAll('text.y').data(yt).join('text').attr('class', 'hp-lbl-muted')
    .attr('x', m.l - 6).attr('y', (t) => y(t) + 4).attr('text-anchor', 'end').text((t) => nf1.format(t));

  const g = svg.append('g').attr('aria-hidden', 'true');
  g.selectAll('line').data(medianas.filter((p) => p.loja)).join('line').attr('class', 'vis-link')
    .attr('x1', (p) => p.loja.x).attr('y1', (p) => p.loja.y).attr('x2', (p) => p.x).attr('y2', (p) => p.y);
  g.selectAll('circle.med').data(medianas).join('circle').attr('class', 'hp-dot f-vizinhos')
    .attr('cx', (p) => p.x).attr('cy', (p) => p.y).attr('r', 5);
  g.selectAll('circle.loja').data(lojas).join('circle').attr('class', (p) => (p.ativa ? 'hp-dot f-loja' : 'hp-closed'))
    .attr('cx', (p) => p.x).attr('cy', (p) => p.y).attr('r', (p) => (p.ativa ? 5 : 4));

  // Rótulos só nas lojas; os pontos das medianas e os números do eixo Y ficam como obstáculos.
  const items = lojas.map((p) => ({ x: p.x, y: p.y, r: 6, label: p.label, cls: 'hp-lbl' }))
    .concat(medianas.map((p) => ({ x: p.x, y: p.y, r: 6 })))
    .concat(yt.map((t) => ({ x: m.l - 16, y: y(t), r: 10 })));
  placeLabels(svg, items, w, hgt - m.b, 'hp-lbl');

  const tip = tooltip(el);
  const hits = svg.append('g');
  tip.bind(hits.selectAll('circle.med').data(medianas).join('circle').attr('class', 'hp-hit')
    .attr('cx', (p) => p.x).attr('cy', (p) => p.y).attr('r', 12), medLines, (p) => [p.x, p.y]);
  tip.bind(hits.selectAll('circle.loja').data(lojas).join('circle').attr('class', 'hp-hit')
    .attr('cx', (p) => p.x).attr('cy', (p) => p.y).attr('r', 12), lojaLines, (p) => [p.x, p.y]);
}
