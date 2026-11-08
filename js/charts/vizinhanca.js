// Vizinhança da loja: anéis de 1, 3 e 5 km e os concorrentes como pontos (tamanho = avaliações).

import { tooltip, placeLabels } from '../ui.js';
import { num, clip, nameMax } from '../format.js';

const d3 = window.d3;

export function vizinhancaMap(el, w, { loja, rows, lojaLines, concLines }) {
  el.replaceChildren();
  const center = [num(loja.lon), num(loja.lat)];
  const deg = (km) => km / 111.195;
  const ring = (km) => d3.geoCircle().center(center).radius(deg(km))();
  const hgt = Math.round(Math.max(300, Math.min(480, w * 0.85)));
  const proj = d3.geoMercator().fitExtent([[8, 8], [w - 8, hgt - 8]], ring(5.1));
  const path = d3.geoPath(proj);
  const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${w} ${hgt}`)
    .attr('class', 'is-clipped').attr('role', 'group').attr('aria-label', 'Concorrentes ao redor da loja');
  for (const k of [5, 3, 1]) {
    svg.append('path').datum(ring(k)).attr('class', 'hp-ring').attr('d', path);
    const [rx, ry] = proj([center[0], center[1] + deg(k)]);
    svg.append('text').attr('class', 'hp-lbl-muted').attr('x', rx).attr('y', ry + 13).attr('text-anchor', 'middle').text(k + ' km');
  }
  const pts = rows.map((r) => { const [x, y] = proj([num(r.lon), num(r.lat)]); return { r, x, y }; });
  const size = d3.scaleSqrt([0, d3.max(pts, (p) => num(p.r.avaliacoes) || 0) || 1], [4, 12]);
  pts.forEach((p) => { p.rad = size(num(p.r.avaliacoes) || 0); });
  const [lx, ly] = proj(center);
  const top = pts.slice().sort((a, b) => (num(b.r.avaliacoes) || 0) - (num(a.r.avaliacoes) || 0)).slice(0, w < 420 ? 4 : 6);
  const items = [{ x: lx, y: ly, r: 9, label: 'Hora do Pastel', cls: 'hp-lbl-strong' }]
    .concat(top.map((p) => ({ x: p.x, y: p.y, r: p.rad, label: clip(p.r.nome, nameMax(w)) })))
    .concat(pts.filter((p) => !top.includes(p)).map((p) => ({ x: p.x, y: p.y, r: p.rad })));
  const g = svg.append('g');
  g.selectAll('circle.hp-dot').data(pts.slice().sort((a, b) => b.rad - a.rad)).join('circle')
    .attr('class', (p) => 'hp-dot ' + (p.r.tipo === 'Pastelaria' ? 'f-pastel' : 'f-outro'))
    .attr('cx', (p) => p.x).attr('cy', (p) => p.y).attr('r', (p) => p.rad);
  g.append('circle').attr('class', 'hp-dot f-loja').attr('cx', lx).attr('cy', ly).attr('r', 8);
  placeLabels(svg, items, w, hgt, 'hp-lbl');
  const tip = tooltip(el);
  tip.bind(g.selectAll('circle.hp-hit').data(pts).join('circle')
    .attr('class', 'hp-hit').attr('cx', (p) => p.x).attr('cy', (p) => p.y).attr('r', (p) => Math.max(12, p.rad + 3)),
  (p) => concLines(p.r), (p) => [p.x, p.y]);
  tip.bind(g.append('circle').datum(loja).attr('class', 'hp-hit').attr('cx', lx).attr('cy', ly).attr('r', 14),
    lojaLines, () => [lx, ly]);
}
