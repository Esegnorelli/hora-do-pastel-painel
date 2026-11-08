// Aba "Concorrência por loja": resumo da loja, vizinhança, mais avaliados, dias e tabela de concorrentes.

import { fill, mount, dataTable, altTable, h } from '../ui.js';
import { num, nf0, fmtNota, fmtInt, fmtPct, fmtKm, clip, nameMax, DIAS } from '../format.js';
import { ativas, resumoLoja, anuncia } from '../data.js';
import { vizinhancaMap } from '../charts/vizinhanca.js';
import { hbars } from '../charts/bars.js';
import { semana } from '../charts/semana.js';
import { unitLines } from './conferencia.js';

const $ = (id) => document.getElementById(id);

export const concLines = (r) => [
  ['hp-tip-val', num(r.nota) != null ? fmtNota(num(r.nota)) + '★ · ' + fmtInt(num(r.avaliacoes) || 0) + ' avaliações' : 'Sem avaliações'],
  ['hp-tip-head', r.nome],
  ['hp-tip-head', (r.categoria || r.tipo) + ' · ' + fmtKm(num(r.distancia_km)) + (anuncia(r) ? ' · anuncia: ' + r.anuncia : '')]
];

const tipoCls = (r) => (r.loja ? 'f-loja' : r.tipo === 'Pastelaria' ? 'f-pastel' : 'f-outro');

let table = null;

export function initConcorrencia(data, { getLoja, setLoja }) {
  const sel = $('conc-loja');
  sel.replaceChildren(...ativas(data.unidades).map((r) => new Option(r.unidade, r.codigo)));
  sel.addEventListener('change', () => setLoja(sel.value));
  const busca = $('conc-busca');
  busca.addEventListener('input', () => renderConcorrencia(data, getLoja()));
}

export function lojaValida(data, cod) {
  const lista = ativas(data.unidades);
  return lista.some((r) => r.codigo === cod) ? cod : (lista[0] ? lista[0].codigo : null);
}

export function renderConcorrencia(data, cod) {
  const loja = data.unidades.find((r) => r.codigo === cod);
  if (!loja) return;
  $('conc-loja').value = cod;
  const viz = (data.porLoja.get(cod) || []).slice().sort((a, b) => num(a.distancia_km) - num(b.distancia_km));
  const s = resumoLoja(loja, viz, 3);
  const vals = {
    pastelarias_1km: nf0.format(s.pastelarias_1km),
    ate_1km: nf0.format(s.ate_1km),
    pastelarias_raio: nf0.format(s.pastelarias_raio),
    ate_raio: nf0.format(s.ate_raio),
    nota_loja: s.nota_loja == null ? null : fmtNota(s.nota_loja),
    nota_media: s.nota_media == null ? null : fmtNota(Math.round(s.nota_media * 10) / 10),
    avaliacoes_loja: s.avaliacoes_loja == null ? null : fmtInt(s.avaliacoes_loja),
    posicao: s.posicao,
    total: s.total,
    neg_loja: s.neg_loja == null ? null : fmtPct(s.neg_loja),
    neg_media: s.neg_media == null ? null : fmtPct(s.neg_media),
    lider_nome: s.lider_nome,
    lider_avaliacoes: s.lider_avaliacoes == null ? null : fmtInt(s.lider_avaliacoes),
    anunciam: nf0.format(s.anunciam),
    com_site: nf0.format(s.com_site)
  };
  fill($('conc-take'), vals);
  fill($('conc-tiles'), vals);

  mount($('conc-mapa'), (el, w) => vizinhancaMap(el, w, { loja, rows: viz, lojaLines: () => unitLines(loja), concLines }));

  const ate3 = viz.filter((r) => num(r.distancia_km) <= 3 && num(r.avaliacoes) != null);
  const top = ate3.slice().sort((a, b) => num(b.avaliacoes) - num(a.avaliacoes)).slice(0, 10)
    .map((r) => ({ ...r, key: r.place_id }));
  if (num(loja.avaliacoes) != null) top.push({ key: 'loja', loja: true, nome: 'Hora do Pastel', nota: loja.nota, avaliacoes: loja.avaliacoes, tipo: 'Loja' });
  top.sort((a, b) => num(b.avaliacoes) - num(a.avaliacoes));
  mount($('conc-barras'), (el, w) => hbars(el, w, {
    rows: top,
    id: (r) => r.key,
    name: (r) => clip(r.nome, nameMax(w)),
    value: (r) => num(r.avaliacoes),
    valueText: (r) => nf0.format(num(r.avaliacoes)) + (num(r.nota) != null ? ' · ' + fmtNota(num(r.nota)) + '★' : ''),
    cls: tipoCls,
    strong: (r) => r.loja,
    tipLines: (r) => (r.loja ? unitLines(loja) : concLines(r)),
    label: 'Mais avaliados a até 3 km'
  }));
  altTable($('conc-barras-alt'), [
    { key: 'nome', label: 'Nome', lead: true },
    { key: 'tipo', label: 'Tipo' },
    { key: 'avaliacoes', label: 'Avaliações', num: true, text: (r) => fmtInt(num(r.avaliacoes)) },
    { key: 'nota', label: 'Nota', num: true, text: (r) => fmtNota(num(r.nota)) }
  ], top, 'Mais avaliados a até 3 km');

  const ate3dias = viz.filter((r) => num(r.distancia_km) <= 3);
  mount($('conc-semana'), (el, w) => semana(el, w, { loja, rows: ate3dias }));
  const comHorario = ate3dias.filter((r) => r.dias_abertos);
  altTable($('conc-semana-alt'), [
    { key: 'label', label: 'Dia', lead: true },
    { key: 'n', label: 'Vizinhos abertos', num: true, text: (d) => nf0.format(d.n) + ' de ' + nf0.format(comHorario.length) },
    { key: 'loja', label: 'Loja', text: (d) => (d.loja === '1' ? 'Abre' : d.loja === '0' ? 'Fecha' : 'Sem horário') }
  ], DIAS.map(([k, label]) => ({ k, label, n: comHorario.filter((r) => r[k] === '1').length, loja: loja[k] || '' })), 'Abertos por dia');

  const columns = [
    { key: 'nome', label: 'Nome', lead: true },
    { key: 'tipo', label: 'Tipo', text: (r) => h('span', { class: 'hp-pill' }, h('span', { class: 'hp-sw ' + (r.tipo === 'Pastelaria' ? 'sw-pastel' : 'sw-outro'), 'aria-hidden': 'true' }), r.tipo) },
    { key: 'categoria', label: 'Categoria no Google' },
    { key: 'distancia_km', label: 'Distância (km)', num: true, sort: (r) => num(r.distancia_km), text: (r) => fmtKm(num(r.distancia_km)).replace(' km', '') },
    { key: 'nota', label: 'Nota', num: true, sort: (r) => num(r.nota), text: (r) => (num(r.nota) != null ? fmtNota(num(r.nota)) : '') },
    { key: 'avaliacoes', label: 'Avaliações', num: true, sort: (r) => num(r.avaliacoes), text: (r) => (num(r.avaliacoes) != null ? fmtInt(num(r.avaliacoes)) : '') },
    { key: 'negativas_pct', label: 'Negativas (1–2★)', num: true, sort: (r) => num(r.negativas_pct), text: (r) => (num(r.negativas_pct) != null ? fmtPct(num(r.negativas_pct)) : '') },
    { key: 'dias_abertos', label: 'Dias abertos', num: true, sort: (r) => num(r.dias_abertos) },
    { key: 'anuncia', label: 'Anuncia' },
    { key: 'redes', label: 'Redes sociais' },
    { key: 'endereco', label: 'Endereço' }
  ];
  const q = $('conc-busca').value.trim().toLowerCase();
  const rows = viz.filter((r) => !q || [r.nome, r.categoria, r.endereco, r.tipo, r.anuncia, r.redes].join(' ').toLowerCase().includes(q));
  if (!table) table = dataTable($('conc-tabela'), { columns, rows, sortable: true, sort: { key: 'distancia_km', dir: 'asc' }, pageSize: 25, empty: 'Nenhum concorrente com essa busca.' });
  else table.update(rows);
}
