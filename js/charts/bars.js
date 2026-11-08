// Barras horizontais com o nome à esquerda e o valor na ponta.
// Cor por classe (`cls(r)` define --st), para seguir a entidade e trocar com o tema sem redesenhar.

import { barPath, textWidth, tooltip } from '../ui.js';

const d3 = window.d3;

export function hbars(el, w, { rows, id, name, value, valueText, cls, strong = () => false, tipLines, label }) {
  el.replaceChildren();
  const band = 28;
  const hgt = Math.max(rows.length, 1) * band + 8;
  const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${w} ${hgt}`)
    .attr('role', 'group').attr('aria-label', label);
  const nameW = textWidth(svg, 'hp-lbl-strong', rows.map(name));
  const valW = textWidth(svg, 'hp-lbl-muted', rows.map(valueText));
  const ml = Math.min(nameW + 10, w * 0.5);
  const max = d3.max(rows, value) || 1;
  const x = d3.scaleLinear([0, max], [ml, Math.max(ml + 20, w - valW - 8)]);
  const y = d3.scaleBand(rows.map(id), [4, hgt - 4]).padding(0.3);
  const bh = Math.min(24, y.bandwidth());
  const yo = (r) => y(id(r)) + (y.bandwidth() - bh) / 2;
  svg.append('line').attr('class', 'hp-axis').attr('x1', ml).attr('x2', ml).attr('y1', 0).attr('y2', hgt);
  const tip = tooltip(el);
  const row = svg.selectAll('g.row').data(rows).join('g').attr('class', 'row');
  row.append('text').attr('class', (r) => (strong(r) ? 'hp-lbl-strong' : 'hp-lbl'))
    .attr('x', ml - 8).attr('y', (r) => yo(r) + bh / 2 + 4).attr('text-anchor', 'end').text(name);
  row.append('path').attr('class', (r) => 'hp-bar ' + cls(r))
    .attr('d', (r) => barPath(ml + 1, yo(r), Math.max(ml + 2, x(value(r))), bh));
  row.append('text').attr('class', 'hp-lbl-muted').attr('x', (r) => Math.max(ml + 2, x(value(r))) + 6)
    .attr('y', (r) => yo(r) + bh / 2 + 4).text(valueText);
  tip.bind(row.append('rect').attr('class', 'hp-hit').attr('x', 0).attr('width', w)
    .attr('y', (r) => y(id(r)) - 3).attr('height', y.bandwidth() + 6),
  tipLines, (r) => [Math.min(x(value(r)), w - 60), y(id(r))]);
}
