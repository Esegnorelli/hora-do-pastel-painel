// Mapa com ruas (Leaflet + OpenStreetMap) da vizinhança da loja.
// A biblioteca só é baixada quando o mapa aparece pela primeira vez; o mesmo mapa é reaproveitado
// a cada troca de loja ou filtro (só as camadas mudam).

import { h } from '../ui.js';
import { num, nf0 } from '../format.js';

const d3 = window.d3;
const CDN = 'https://cdn.jsdelivr.net/npm/';
const CSS = [
  ['leaflet@1.9.4/dist/leaflet.css', 'sha384-sHL9NAb7lN7rfvG5lfHpm643Xkcjzp4jFvuavGOndn6pjVqS6ny56CAt3nsEVT4H'],
  ['leaflet.markercluster@1.5.3/dist/MarkerCluster.css', 'sha384-pmjIAcz2bAn0xukfxADbZIb3t8oRT9Sv0rvO+BR5Csr6Dhqq+nZs59P0pPKQJkEV']
];
const LEAFLET = ['leaflet@1.9.4/dist/leaflet.js', 'sha384-cxOPjt7s7Iz04uaHJceBmS+qpjv2JkIHNVcuOrM+YHwZOmJGBXI00mdUXEq65HTH'];
const CLUSTER = ['leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js', 'sha384-eXVCORTRlv4FUUgS/xmOyr66XBVraen8ATNLMESp92FKXLAMiKkerixTiBvXriZr'];
const ANEIS = [1, 3, 5];
const AGRUPA_ACIMA = 30;

function injeta(tag, [path, sri]) {
  return new Promise((ok, falha) => {
    const el = tag === 'link' ? h('link', { rel: 'stylesheet', href: CDN + path }) : h('script', { src: CDN + path });
    el.integrity = sri;
    el.crossOrigin = 'anonymous';
    el.onload = ok;
    el.onerror = () => falha(new Error('Não carregou ' + path));
    // CSS do Leaflet entra antes do app.css para as regras do painel valerem por cima.
    if (tag === 'link') document.head.querySelector('link[rel="stylesheet"]').before(el);
    else document.head.append(el);
  });
}

let carga = null;
// O plugin de agrupamento depende do `L` global, então só entra depois do Leaflet.
export const carregaLeaflet = () => (carga ||= Promise.all([...CSS.map((c) => injeta('link', c)), injeta('script', LEAFLET)])
  .then(() => injeta('script', CLUSTER))
  .then(() => window.L));

const conteudo = (lines) => h('div', null, lines.filter(Boolean).map(([cls, text]) => h('div', { class: cls, text })));
const nomeAcessivel = (lines) => lines.filter(Boolean).map((l) => l[1]).join('. ');

export function criaMapa(el, L) {
  const box = h('div', { class: 'hp-leaflet' });
  el.replaceChildren(box);
  const map = L.map(box, { scrollWheelZoom: false, dragging: !L.Browser.mobile, attributionControl: false });
  L.control.attribution({ prefix: false }).addTo(map);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    referrerPolicy: 'strict-origin-when-cross-origin',
    attribution: '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap</a>'
  }).addTo(map);

  const aneis = L.layerGroup().addTo(map);
  const soltos = L.layerGroup().addTo(map);
  const grupos = L.markerClusterGroup({
    maxClusterRadius: 40,
    disableClusteringAtZoom: 16,
    showCoverageOnHover: false,
    iconCreateFunction: (c) => L.divIcon({ html: h('span', { class: 'hp-cluster', text: nf0.format(c.getChildCount()) }), className: 'hp-mk', iconSize: [34, 34] })
  }).addTo(map);
  const loja = L.layerGroup().addTo(map);

  // Os ícones são recriados a cada vez que entram no mapa (zoom, agrupamento); o nome acessível vai junto.
  map.on('layeradd', ({ layer }) => {
    const icon = layer.getElement && layer.getElement();
    if (!icon || !layer.options.keyboard) return;
    const nome = layer.getChildCount ? nf0.format(layer.getChildCount()) + ' concorrentes agrupados. Enter aproxima o mapa.' : layer.options.hpNome;
    if (nome) icon.setAttribute('aria-label', nome);
  });

  const ponto = (lat, lon, d, cls, lines, extra = {}) => {
    const box = Math.max(24, d);
    const dot = h('span', { class: 'hp-mk-dot ' + cls });
    dot.style.width = dot.style.height = d + 'px';
    const m = L.marker([lat, lon], { icon: L.divIcon({ html: dot, className: 'hp-mk', iconSize: [box, box] }), hpNome: nomeAcessivel(lines), riseOnHover: true, ...extra });
    m.bindTooltip(conteudo(lines), { direction: 'top', offset: [0, -d / 2], className: 'hp-ltip' });
    return m;
  };

  let enquadrado = null;
  return {
    // `todos`: concorrentes da loja sem filtro (fixam a escala de tamanho); `rows`: os que passam nos filtros.
    update({ loja: u, todos, rows, raio, lojaLines, concLines }) {
      map.invalidateSize();
      const centro = L.latLng(num(u.lat), num(u.lon));
      aneis.clearLayers();
      for (const k of ANEIS) {
        L.circle(centro, { radius: k * 1000, className: 'hp-lring' + (k === raio ? ' is-on' : ''), fill: false, interactive: false }).addTo(aneis);
        L.marker([centro.lat + k / 111.195, centro.lng], {
          icon: L.divIcon({ html: h('span', { class: 'hp-lring-lbl', text: k + ' km' }), className: 'hp-lring-wrap', iconSize: null }),
          interactive: false, keyboard: false
        }).addTo(aneis);
      }

      const size = d3.scaleSqrt([0, d3.max(todos, (r) => num(r.avaliacoes)) || 1], [10, 22]);
      const marcas = rows.filter((r) => num(r.lat) != null && num(r.lon) != null)
        .map((r) => ponto(num(r.lat), num(r.lon), size(num(r.avaliacoes) || 0), r.tipo === 'Pastelaria' ? 'f-pastel' : 'f-outro', concLines(r)));
      soltos.clearLayers();
      grupos.clearLayers();
      if (marcas.length > AGRUPA_ACIMA) grupos.addLayers(marcas);
      else marcas.forEach((m) => soltos.addLayer(m));

      loja.clearLayers();
      loja.addLayer(ponto(centro.lat, centro.lng, 26, 'f-loja is-loja', lojaLines(), { zIndexOffset: 1000 }));

      const chave = u.codigo + ':' + raio;
      if (chave !== enquadrado) {
        map.fitBounds(centro.toBounds(raio * 2000), { padding: [12, 12] });
        enquadrado = chave;
      }
    }
  };
}
