// Mapa esquemático das unidades (projeção de Mercator, sem fundo), coloridas pela situação.

import { tooltip, placeLabels, sitOf } from '../ui.js';
import { num, shortName } from '../format.js';

const d3 = window.d3;

export function unidadesMap(el, w, { rows, fitRows = rows, tipLines }) {
  el.replaceChildren();
  const pos = (list) => list.filter((r) => num(r.lat) != null && num(r.lon) != null)
    .map((r) => ({ r, lon: num(r.lon), lat: num(r.lat) }));
  const pts = pos(rows);
  if (!pts.length) return;
  const mp = { type: 'MultiPoint', coordinates: pos(fitRows).map((p) => [p.lon, p.lat]) };
  const fit = d3.geoMercator().fitWidth(Math.max(100, w - 72), mp);
  const bb = d3.geoPath(fit).bounds(mp);
  const hgt = Math.round(Math.max(220, Math.min(420, bb[1][1] - bb[0][1] + 56)));
  const proj = d3.geoMercator().fitExtent([[36, 28], [w - 36, hgt - 28]], mp);
  const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${w} ${hgt}`)
    .attr('class', 'is-clipped').attr('role', 'group').attr('aria-label', 'Mapa das unidades no Rio Grande do Sul');
  svg.append('path').datum(d3.geoGraticule().step([0.5, 0.5])()).attr('class', 'hp-grat').attr('d', d3.geoPath(proj));
  pts.forEach((p) => { [p.x, p.y] = proj([p.lon, p.lat]); });
  // Rotula primeiro o que pede ação.
  const rank = (p) => (p.r.situacao === 'Confere' ? 1 : 0);
  const items = pts.slice().sort((a, b) => rank(a) - rank(b) || (num(b.r.avaliacoes) || 0) - (num(a.r.avaliacoes) || 0))
    .map((p) => ({ x: p.x, y: p.y, r: 6, label: shortName(p.r.unidade) }));
  placeLabels(svg, items, w, hgt, 'hp-lbl');
  const g = svg.append('g');
  g.selectAll('circle.hp-dot').data(pts).join('circle')
    .attr('class', (p) => 'hp-dot ' + sitOf(p.r.situacao).cls)
    .attr('cx', (p) => p.x).attr('cy', (p) => p.y).attr('r', 6);
  const tip = tooltip(el);
  tip.bind(g.selectAll('circle.hp-hit').data(pts).join('circle')
    .attr('class', 'hp-hit').attr('cx', (p) => p.x).attr('cy', (p) => p.y).attr('r', 13),
  (p) => tipLines(p.r), (p) => [p.x, p.y]);
}
