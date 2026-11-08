// Pressão competitiva: uma barra por loja com as pastelarias a até 3 km.
// O trecho a até 1 km sai da base em cor cheia; o de 1 a 3 km continua em tom claro da mesma cor.
// Cada linha é um link: clique, toque ou Enter abre a concorrência da loja.

import { barPath, textWidth, tooltip } from '../ui.js';

const d3 = window.d3;

const flatPath = (x0, y, x1, hgt) => `M${x0},${y}H${x1}V${y + hgt}H${x0}Z`;

const rankingValue = (r) => `${r.p3} (${r.p1} a 1 km)`;

export function ranking(el, w, { rows, name, tipLines, onPick, label }) {
  el.replaceChildren();
  const band = 28;
  const hgt = Math.max(rows.length, 1) * band + 8;
  const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${w} ${hgt}`)
    .attr('role', 'group').attr('aria-label', label);
  const nameW = textWidth(svg, 'hp-lbl', rows.map(name));
  const valW = textWidth(svg, 'hp-lbl-muted', rows.map(rankingValue));
  const ml = Math.min(nameW + 10, w * 0.5);
  const x = d3.scaleLinear([0, d3.max(rows, (r) => r.p3) || 1], [ml, Math.max(ml + 20, w - valW - 8)]);
  const y = d3.scaleBand(rows.map((r) => r.codigo), [4, hgt - 4]).padding(0.3);
  const bh = Math.min(24, y.bandwidth());
  const yo = (r) => y(r.codigo) + (y.bandwidth() - bh) / 2;
  const x0 = ml + 1;
  const end = (v) => Math.max(x0, x(v));
  svg.append('line').attr('class', 'hp-axis').attr('x1', ml).attr('x2', ml).attr('y1', 0).attr('y2', hgt);

  const row = svg.selectAll('g.row').data(rows).join('g').attr('class', 'row');
  row.append('text').attr('class', 'hp-lbl').attr('x', ml - 8).attr('y', (r) => yo(r) + bh / 2 + 4)
    .attr('text-anchor', 'end').text(name);
  row.filter((r) => r.p3 > r.p1).append('path').attr('class', 'hp-bar is-tint f-pastel')
    .attr('d', (r) => barPath(end(r.p1), yo(r), end(r.p3), bh));
  row.filter((r) => r.p1 > 0).append('path').attr('class', 'hp-bar f-pastel')
    .attr('d', (r) => (r.p3 > r.p1 ? flatPath : barPath)(x0, yo(r), end(r.p1), bh));
  row.append('text').attr('class', 'hp-lbl-muted').attr('x', (r) => end(r.p3) + 6)
    .attr('y', (r) => yo(r) + bh / 2 + 4).text(rankingValue);

  const tip = tooltip(el);
  tip.bind(row.append('rect').attr('class', 'hp-hit').attr('x', 0).attr('width', w)
    .attr('y', (r) => y(r.codigo) - 3).attr('height', y.bandwidth() + 6),
  tipLines, (r) => [Math.min(end(r.p3), w - 60), y(r.codigo)])
    .attr('role', 'link')
    .attr('aria-label', (r) => tipLines(r).map((l) => l[1]).join('. ') + '. Abrir a concorrência da loja')
    .on('click', (ev, r) => { ev.stopPropagation(); onPick(r); })
    .on('keydown', (ev, r) => {
      if (ev.key === 'Escape') tip.hide();
      if (ev.key === 'Enter') { ev.preventDefault(); onPick(r); }
    });
}
