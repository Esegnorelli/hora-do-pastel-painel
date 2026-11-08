// Aba "Conferência no Maps": resumo, mapa, avaliações por unidade e tabela unidade por unidade.

import { fill, mount, dataTable, altTable, statusPill, ORDEM_SITUACAO, sitOf } from '../ui.js';
import { num, nf0, fmtNota, fmtInt, fmtPct, shortName, clip, nameMax } from '../format.js';
import { unidadesMap } from '../charts/unidades-map.js';
import { hbars } from '../charts/bars.js';

const d3 = window.d3;
const $ = (id) => document.getElementById(id);

export const unitLines = (r) => [
  ['hp-tip-val', num(r.nota) != null ? fmtNota(num(r.nota)) + '★ · ' + fmtInt(num(r.avaliacoes)) + ' avaliações' : 'Sem ficha no Maps'],
  ['hp-tip-head', r.unidade],
  ['hp-tip-flag', r.alertas ? r.situacao + ': ' + r.alertas : r.situacao, r.situacao]
];

export function renderConferencia({ unidades }) {
  const planilha = unidades.filter((r) => r.status_rede !== 'Fora da planilha');
  const noMaps = planilha.filter((r) => r.no_maps === 'sim');
  const notas = noMaps.map((r) => num(r.nota)).filter((v) => v > 0);
  const resumo = {
    planilha: nf0.format(planilha.length),
    confere: nf0.format(planilha.filter((r) => r.situacao === 'Confere').length),
    divergencia: nf0.format(planilha.filter((r) => r.situacao === 'Divergência').length),
    sem_ficha: nf0.format(planilha.filter((r) => r.no_maps !== 'sim' && r.status_rede === 'Ativa').length),
    desativadas: nf0.format(planilha.filter((r) => r.status_rede === 'Inativa').length),
    fora: nf0.format(unidades.filter((r) => r.situacao === 'Fora da planilha').length),
    nota_media: notas.length ? fmtNota(Math.round(d3.mean(notas) * 10) / 10) : null,
    avaliacoes: nf0.format(d3.sum(noMaps, (r) => num(r.avaliacoes) || 0))
  };
  fill($('conf-take'), resumo);
  fill($('conf-tiles'), resumo);

  mount($('conf-mapa'), (el, w) => unidadesMap(el, w, { rows: unidades, tipLines: unitLines }));
  altTable($('conf-mapa-alt'), [
    { key: 'unidade', label: 'Unidade', lead: true },
    { key: 'cidade', label: 'Cidade' },
    { key: 'situacao', label: 'Situação', text: (r) => statusPill(r.situacao) }
  ], unidades.filter((r) => num(r.lat) != null), 'Unidades no mapa');

  const comFicha = unidades.filter((r) => num(r.avaliacoes) != null).sort((a, b) => num(b.avaliacoes) - num(a.avaliacoes));
  mount($('conf-barras'), (el, w) => hbars(el, w, {
    rows: comFicha,
    id: (r) => r.codigo + r.unidade,
    name: (r) => clip(shortName(r.unidade), nameMax(w)),
    value: (r) => num(r.avaliacoes),
    valueText: (r) => nf0.format(num(r.avaliacoes)) + ' · ' + fmtNota(num(r.nota)) + '★',
    cls: (r) => sitOf(r.situacao).cls,
    tipLines: unitLines,
    label: 'Avaliações no Google por unidade'
  }));
  altTable($('conf-barras-alt'), [
    { key: 'unidade', label: 'Unidade', lead: true },
    { key: 'avaliacoes', label: 'Avaliações', num: true, text: (r) => fmtInt(num(r.avaliacoes)) },
    { key: 'nota', label: 'Nota', num: true, text: (r) => fmtNota(num(r.nota)) },
    { key: 'situacao', label: 'Situação', text: (r) => statusPill(r.situacao) }
  ], comFicha, 'Avaliações por unidade');

  const diff = (flag) => (r) => (r[flag] === 'não' ? 'is-diff' : '');
  const columns = [
    { key: 'codigo', label: 'Código' },
    { key: 'unidade', label: 'Unidade', lead: true },
    { key: 'situacao', label: 'Situação', text: (r) => statusPill(r.situacao), sort: (r) => ORDEM_SITUACAO.indexOf(r.situacao) },
    { key: 'status_rede', label: 'Na rede' },
    { key: 'alertas', label: 'O que olhar' },
    { key: 'endereco_planilha', label: 'Endereço na planilha' },
    { key: 'endereco_maps', label: 'Endereço no Maps', cls: diff('endereco_confere') },
    { key: 'telefone_planilha', label: 'Telefone na planilha' },
    { key: 'telefone_maps', label: 'Telefone no Maps', cls: diff('telefone_confere') },
    { key: 'nota', label: 'Nota', num: true, sort: (r) => num(r.nota), text: (r) => (num(r.nota) != null ? fmtNota(num(r.nota)) : '') },
    { key: 'avaliacoes', label: 'Avaliações', num: true, sort: (r) => num(r.avaliacoes), text: (r) => (num(r.avaliacoes) != null ? fmtInt(num(r.avaliacoes)) : '') },
    { key: 'negativas_pct', label: 'Negativas (1–2★)', num: true, sort: (r) => num(r.negativas_pct), text: (r) => (num(r.negativas_pct) != null ? fmtPct(num(r.negativas_pct)) : '') },
    { key: 'dias_abertos', label: 'Dias abertos', num: true, sort: (r) => num(r.dias_abertos) },
    { key: 'tem_site', label: 'Site' },
    { key: 'tem_instagram', label: 'Instagram' }
  ];
  const ordered = unidades.slice().sort((a, b) => ORDEM_SITUACAO.indexOf(a.situacao) - ORDEM_SITUACAO.indexOf(b.situacao) || a.codigo.localeCompare(b.codigo));
  const table = dataTable($('conf-tabela'), { columns, rows: ordered, sortable: true, empty: 'Nenhuma unidade com essa busca.' });
  const busca = $('conf-busca');
  busca.oninput = () => {
    const q = busca.value.trim().toLowerCase();
    table.update(ordered.filter((r) => !q || Object.values(r).join(' ').toLowerCase().includes(q)));
  };
}
