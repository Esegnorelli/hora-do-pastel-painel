// Aba "Conferência no Maps": resumo, filtro por situação, o que corrigir, mapa, avaliações e tabela.

import { fill, mount, dataTable, altTable, statusPill, statusIcon, stateMsg, announce, h, isNarrow, ORDEM_SITUACAO, sitOf } from '../ui.js';
import { num, nf0, fmtNota, fmtInt, fmtPct, shortName, clip, nameMax, plural } from '../format.js';
import { acoesDaUnidade, verificacao, PRECISA_ACAO } from '../acoes.js';
import { unidadesMap } from '../charts/unidades-map.js';
import { hbars } from '../charts/bars.js';

const d3 = window.d3;
const $ = (id) => document.getElementById(id);

export const unitLines = (r) => [
  ['hp-tip-val', num(r.nota) != null ? fmtNota(num(r.nota)) + '★ · ' + fmtInt(num(r.avaliacoes)) + ' avaliações' : 'Sem ficha no Maps'],
  ['hp-tip-head', r.unidade],
  ['hp-tip-flag', r.alertas ? r.situacao + ': ' + r.alertas : r.situacao, r.situacao]
];

// Filtros: "todas", "acao" (precisam de ação) ou uma situação.
const FILTROS = [
  ['todas', 'Todas', () => true],
  ['acao', 'Precisam de ação', (r) => PRECISA_ACAO.includes(r.situacao)],
  ...ORDEM_SITUACAO.map((s) => [s, s, (r) => r.situacao === s])
];

const ordem = (a, b) => ORDEM_SITUACAO.indexOf(a.situacao) - ORDEM_SITUACAO.indexOf(b.situacao) || a.codigo.localeCompare(b.codigo);

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

  const sel = $('conf-situacao');
  sel.replaceChildren(...FILTROS
    .map(([id, label, f]) => [id, label, unidades.filter(f).length])
    .filter(([id, , n]) => n > 0 || id === 'todas')
    .map(([id, label, n]) => new Option(`${label} (${nf0.format(n)})`, id)));

  const table = dataTable($('conf-tabela'), { columns: tableColumns(), rows: [], sortable: true, sort: null, pageSize: isNarrow() ? 6 : 0, empty: 'Nenhuma unidade com esse filtro e essa busca.' });
  const busca = $('conf-busca');

  const apply = (announceIt = false) => {
    const f = (FILTROS.find(([id]) => id === sel.value) || FILTROS[0])[2];
    const rows = unidades.filter(f).sort(ordem);
    drawActions(rows);
    drawMap(unidades, rows);
    drawBars(rows);
    const q = busca.value.trim().toLowerCase();
    table.update(rows.filter((r) => !q || Object.values(r).join(' ').toLowerCase().includes(q)));
    if (announceIt) announce(`${nf0.format(rows.length)} ${plural(rows.length, 'unidade', 'unidades')} com esse filtro.`);
  };
  sel.onchange = () => apply(true);
  busca.oninput = () => apply();
  apply();
}

function drawActions(rows) {
  const list = $('conf-acoes');
  const pend = rows.map((u) => ({ u, acoes: acoesDaUnidade(u) })).filter((x) => x.acoes.length);
  if (!pend.length) {
    list.replaceChildren(h('li', { class: 'hp-acoes-vazio', text: 'Nada a corrigir nas unidades deste filtro.' }));
    return;
  }
  list.replaceChildren(...pend.map(({ u, acoes }) => h('li', null,
    h('p', { class: 'hp-acoes-head' }, statusIcon(u.situacao), h('strong', { text: u.unidade }), h('span', { class: 'hp-note', text: u.situacao + (u.codigo !== '—' ? ' · ' + u.codigo : '') })),
    h('ul', null, acoes.map((a) => h('li', { text: a }))),
    evidencia(u)
  )));
}

// O que a pesquisa na internet mostrou: data e confiança à vista; resumo e fontes (só nomes dos sites, sem links)
// num <details>, para a lista continuar curta.
function evidencia(u) {
  const v = verificacao(u);
  if (!v) return null;
  return h('details', { class: 'hp-evidencia' },
    h('summary', { text: `Verificado na internet em ${v.data} · confiança ${v.confianca}` }),
    h('p', { text: v.resumo }),
    v.fontes.length ? h('p', { class: 'hp-evidencia-fontes', text: 'Fontes: ' + v.fontes.join('; ') + '.' }) : null);
}

function drawMap(todas, rows) {
  const el = $('conf-mapa');
  const comPos = rows.filter((r) => num(r.lat) != null);
  if (!comPos.length) {
    mount(el, () => stateMsg(el, 'Nenhuma unidade deste filtro tem posição no mapa.'));
  } else {
    // A projeção usa todas as unidades: o mapa não muda de enquadramento ao filtrar.
    mount(el, (e, w) => unidadesMap(e, w, { rows: comPos, fitRows: todas, tipLines: unitLines }));
  }
  altTable($('conf-mapa-alt'), [
    { key: 'unidade', label: 'Unidade', lead: true },
    { key: 'cidade', label: 'Cidade' },
    { key: 'situacao', label: 'Situação', text: (r) => statusPill(r.situacao) }
  ], comPos, 'Unidades no mapa');
}

function drawBars(rows) {
  const el = $('conf-barras');
  const comFicha = rows.filter((r) => num(r.avaliacoes) != null).sort((a, b) => num(b.avaliacoes) - num(a.avaliacoes));
  if (!comFicha.length) {
    mount(el, () => stateMsg(el, 'Nenhuma unidade deste filtro tem ficha com avaliações.'));
  } else {
    mount(el, (e, w) => hbars(e, w, {
      rows: comFicha,
      id: (r) => r.codigo + r.unidade,
      name: (r) => clip(shortName(r.unidade), nameMax(w)),
      value: (r) => num(r.avaliacoes),
      valueText: (r) => nf0.format(num(r.avaliacoes)) + ' · ' + fmtNota(num(r.nota)) + '★',
      cls: (r) => sitOf(r.situacao).cls,
      tipLines: unitLines,
      label: 'Avaliações no Google por unidade'
    }));
  }
  altTable($('conf-barras-alt'), [
    { key: 'unidade', label: 'Unidade', lead: true },
    { key: 'avaliacoes', label: 'Avaliações', num: true, text: (r) => fmtInt(num(r.avaliacoes)) },
    { key: 'nota', label: 'Nota', num: true, text: (r) => fmtNota(num(r.nota)) },
    { key: 'situacao', label: 'Situação', text: (r) => statusPill(r.situacao) }
  ], comFicha, 'Avaliações por unidade');
}

function tableColumns() {
  const diff = (flag) => (r) => (r[flag] === 'não' ? 'is-diff' : '');
  const numCol = (key, label, fmt) => ({ key, label, num: true, sort: (r) => num(r[key]), text: (r) => (num(r[key]) != null ? fmt(num(r[key])) : '') });
  return [
    { key: 'codigo', label: 'Código' },
    { key: 'unidade', label: 'Unidade', lead: true },
    { key: 'situacao', label: 'Situação', text: (r) => statusPill(r.situacao), sort: (r) => ORDEM_SITUACAO.indexOf(r.situacao) },
    { key: 'status_rede', label: 'Na rede' },
    { key: 'alertas', label: 'O que olhar' },
    { key: 'verificacao_resumo', label: 'Na internet', text: (r) => (r.verificacao_resumo ? `${r.verificacao_resumo} (confiança ${r.verificacao_confianca})` : '') },
    { key: 'endereco_planilha', label: 'Endereço na planilha' },
    { key: 'endereco_maps', label: 'Endereço no Maps', cls: diff('endereco_confere') },
    { key: 'telefone_planilha', label: 'Telefone na planilha' },
    { key: 'telefone_maps', label: 'Telefone no Maps', cls: diff('telefone_confere') },
    numCol('nota', 'Nota', fmtNota),
    numCol('avaliacoes', 'Avaliações', fmtInt),
    numCol('negativas_pct', 'Negativas (1–2★)', fmtPct),
    numCol('dias_abertos', 'Dias abertos', fmtInt),
    { key: 'tem_site', label: 'Site' },
    { key: 'tem_instagram', label: 'Instagram' }
  ];
}
