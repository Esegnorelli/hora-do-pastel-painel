// Colunas: quantos vizinhos abrem em cada dia; abaixo, se a loja abre (cheio) ou fecha (anel).

import { tooltip, colPath, textWidth } from '../ui.js';
import { nf0, DIAS } from '../format.js';

const d3 = window.d3;

export function semana(el, w, { loja, rows }) {
  el.replaceChildren();
  const viz = rows.filter((r) => r.dias_abertos);
  const days = DIAS.map(([k, label]) => ({ k, label, n: viz.filter((r) => r[k] === '1').length, loja: loja[k] || '' }));
  const hgt = 200, mt = 20, mb = 50, mr = 8;
  const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${w} ${hgt}`)
    .attr('role', 'group').attr('aria-label', 'Estabelecimentos abertos por dia da semana');
  const y = d3.scaleLinear([0, Math.max(1, viz.length)], [hgt - mb, mt]).nice();
  const ticks = y.ticks(4).filter(Number.isInteger);
  const ml = textWidth(svg, 'hp-lbl-muted', [nf0.format(d3.max(ticks) || 0)]) + 12;
  const x = d3.scaleBand(days.map((d) => d.k), [ml, w - mr]).padding(0.35);
  const cw = Math.min(24, x.bandwidth());
  const cx = (d) => x(d.k) + x.bandwidth() / 2;
  svg.selectAll('line.hp-grid-line').data(ticks).join('line').attr('class', 'hp-grid-line')
    .attr('x1', ml).attr('x2', w - mr).attr('y1', y).attr('y2', y);
  svg.selectAll('text.tick').data(ticks).join('text').attr('class', 'hp-lbl-muted tick')
    .attr('x', ml - 6).attr('y', (t) => y(t) + 4).attr('text-anchor', 'end').text((t) => nf0.format(t));
  svg.append('line').attr('class', 'hp-axis').attr('x1', ml).attr('x2', w - mr).attr('y1', y(0)).attr('y2', y(0));
  svg.selectAll('path.col').data(days).join('path').attr('class', 'hp-bar f-pastel col')
    .attr('d', (d) => colPath(cx(d) - cw / 2, y(0), y(d.n), cw));
  svg.selectAll('text.cap').data(days).join('text').attr('class', 'hp-lbl-muted cap')
    .attr('x', cx).attr('y', (d) => y(d.n) - 6).attr('text-anchor', 'middle').text((d) => nf0.format(d.n));
  svg.selectAll('text.day').data(days).join('text').attr('class', 'hp-lbl day')
    .attr('x', cx).attr('y', hgt - mb + 16).attr('text-anchor', 'middle').text((d) => d.label);
  svg.selectAll('circle.mark').data(days.filter((d) => d.loja !== '')).join('circle')
    .attr('class', (d) => 'mark ' + (d.loja === '1' ? 'hp-open' : 'hp-closed'))
    .attr('cx', cx).attr('cy', hgt - mb + 32).attr('r', 5);
  const tip = tooltip(el);
  const lojaTxt = (d) => (d.loja === '1' ? 'a loja abre' : d.loja === '0' ? 'a loja fecha' : 'horário da loja não informado');
  tip.bind(svg.selectAll('rect.hit').data(days).join('rect').attr('class', 'hp-hit hit')
    .attr('x', (d) => x(d.k)).attr('width', x.bandwidth()).attr('y', mt).attr('height', hgt - mt),
  (d) => [['hp-tip-val', nf0.format(d.n) + ' de ' + nf0.format(viz.length) + ' abertos'], ['hp-tip-head', d.label + ': ' + lojaTxt(d)]],
  (d) => [x(d.k), y(d.n)]);
  return days;
}
