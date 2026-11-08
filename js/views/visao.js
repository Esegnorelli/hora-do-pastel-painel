// Aba "Visão da rede": resumo, pressão competitiva por loja, nota × avaliações e o que fazer esta semana.

import { h, fill, mount, dataTable, altTable, statusIcon, isNarrow } from '../ui.js';
import { num, nf0, nf1, nf2, fmtNota, fmtInt, fmtPct, shortName, clip, nameMax, plural, DIAS } from '../format.js';
import { ativas, resumoLoja, media, mediana, vals } from '../data.js';
import { hashFor } from '../tabs.js';
import { acoesDaUnidade, verificacao, PRECISA_ACAO } from '../acoes.js';
import { ranking } from '../charts/ranking.js';
import { dispersao } from '../charts/dispersao.js';

const $ = (id) => document.getElementById(id);

const MENOS = '\u2212';
const sinal = (v, fmt) => (v == null ? '—' : (v > 0 ? '+' : v < 0 ? MENOS : '') + fmt.format(Math.abs(v)));
const arred = (v, casas) => (v == null ? null : Math.round(v * 10 ** casas) / 10 ** casas);

// "segunda" → "às segundas"; "sábado" → "aos sábados".
const nosDias = (dia) => (dia.endsWith('a') ? 'às ' : 'aos ') + dia + 's';

// Uma linha por loja ativa: pastelarias perto, densidade, nota e avaliações contra os vizinhos a até 3 km.
function linhaLoja(data, u) {
  const todos = data.porLoja.get(u.codigo) || [];
  const viz = todos.filter((c) => num(c.distancia_km) <= 3);
  const s = resumoLoja(u, todos, 3);
  const avs = vals(viz, 'avaliacoes');
  return {
    u, viz, codigo: u.codigo, nome: shortName(u.unidade),
    p1: s.pastelarias_1km, p3: s.pastelarias_raio,
    dens1: num(u.densidade_1km), dens3: num(u.densidade_3km),
    nota: s.nota_loja, notaViz: s.nota_media,
    av: s.avaliacoes_loja, avViz: media(avs),
    neg: s.neg_loja, negViz: s.neg_media,
    medNota: mediana(vals(viz, 'nota').filter((v) => v > 0)),
    medAv: mediana(avs)
  };
}

const porPressao = (a, b) => b.p3 - a.p3 || b.p1 - a.p1 || a.u.unidade.localeCompare(b.u.unidade, 'pt-BR');

// Link real (abre em nova aba com o botão do meio); clique simples navega sem recarregar.
function link(route, text, ir) {
  return h('a', {
    href: hashFor(route), text,
    onclick: (ev) => {
      if (ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      ev.preventDefault();
      ir(route);
    }
  });
}

const negAcima = (r) => r.neg != null && r.negViz != null && Math.round(r.neg) > Math.round(r.negViz);

function fichasACorrigir(unidades) {
  return unidades.filter((u) => PRECISA_ACAO.includes(u.situacao))
    .sort((a, b) => PRECISA_ACAO.indexOf(a.situacao) - PRECISA_ACAO.indexOf(b.situacao) || a.unidade.localeCompare(b.unidade, 'pt-BR'));
}

// Dias em que a loja fecha e mais da metade dos vizinhos com horário conhecido abre.
function diasFechados(linhas) {
  return linhas.filter((r) => r.u.dias_abertos !== '').flatMap((r) => {
    const comHorario = r.viz.filter((c) => c.dias_abertos !== '');
    return DIAS.filter(([k]) => r.u[k] === '0').map(([k, , dia]) => ({
      r, dia, abrem: comHorario.filter((c) => c[k] === '1').length, total: comHorario.length
    })).filter((d) => d.abrem > d.total / 2);
  });
}

export function renderVisao(data, { ir }) {
  const linhas = ativas(data.unidades).map((u) => linhaLoja(data, u)).sort(porPressao);
  linhas.forEach((r, i) => { r.pos = i + 1; });
  const fichas = fichasACorrigir(data.unidades);
  const negativas = linhas.filter(negAcima).sort((a, b) => (b.neg - b.negViz) - (a.neg - a.negViz));
  const fechados = diasFechados(linhas);
  const irLoja = (r) => ir({ tab: 'concorrencia', loja: r.codigo });

  const top = linhas[0];
  fill($('vis-take'), {
    ativas: nf0.format(linhas.length),
    mais_pressao: top ? top.nome : null,
    mais_pressao_n: top ? nf0.format(top.p3) : null,
    fichas: nf0.format(fichas.length),
    negativas: nf0.format(negativas.length)
  });

  mount($('vis-ranking'), (el, w) => ranking(el, w, {
    rows: linhas,
    name: (r) => clip(r.nome, nameMax(w)),
    tipLines: (r) => [
      ['hp-tip-val', `${nf0.format(r.p3)} pastelarias a até 3 km · ${nf0.format(r.p1)} a até 1 km`],
      ['hp-tip-head', r.nome]
    ],
    onPick: irLoja,
    label: 'Pastelarias a até 3 km de cada loja ativa'
  }));
  dataTable($('vis-tabela'), {
    columns: [
      { key: 'pos', label: 'Posição', num: true },
      { key: 'nome', label: 'Loja', lead: true, text: (r) => link({ tab: 'concorrencia', loja: r.codigo }, r.nome, ir) },
      { key: 'p1', label: 'Pastelarias 1 km', num: true },
      { key: 'p3', label: 'Pastelarias 3 km', num: true },
      { key: 'dens1', label: 'Concorrentes/km² (1 km)', num: true, text: (r) => (r.dens1 == null ? '—' : nf2.format(r.dens1)) },
      { key: 'dens3', label: 'Concorrentes/km² (3 km)', num: true, text: (r) => (r.dens3 == null ? '—' : nf2.format(r.dens3)) },
      { key: 'nota', label: 'Nota da loja', num: true, text: (r) => fmtNota(r.nota) },
      { key: 'notaViz', label: 'Nota média dos vizinhos', num: true, text: (r) => fmtNota(r.notaViz) },
      { key: 'notaDif', label: 'Nota vs vizinhos', num: true, sort: (r) => notaDif(r), text: (r) => sinal(notaDif(r), nf1) },
      { key: 'av', label: 'Avaliações da loja', num: true, text: (r) => fmtInt(r.av) },
      { key: 'avViz', label: 'Avaliações médias dos vizinhos', num: true, text: (r) => fmtInt(arred(r.avViz, 0)) },
      { key: 'avDif', label: 'Avaliações vs vizinhos', num: true, sort: (r) => avDif(r), text: (r) => sinal(avDif(r), nf0) }
    ],
    rows: linhas,
    sortable: true,
    sort: { key: 'pos', dir: 'asc' },
    // No celular cada loja vira um cartão longo: mostra as primeiras e deixa o resto no "Mostrar mais".
    pageSize: isNarrow() ? 5 : 0
  });

  desenharDispersao(data, linhas);
  desenharLista({ fichas, negativas, fechados, ir });
}

const notaDif = (r) => (r.nota == null || r.notaViz == null ? null : arred(r.nota - r.notaViz, 1));
const avDif = (r) => (r.av == null || r.avViz == null ? null : arred(r.av - r.avViz, 0));

function desenharDispersao(data, linhas) {
  const linha = new Map(linhas.map((r) => [r.codigo, r]));
  const planilha = data.unidades.filter((u) => u.status_rede !== 'Fora da planilha' && num(u.nota) > 0 && num(u.avaliacoes) > 0);
  // A ordem decide quem ganha rótulo quando falta espaço: lojas ativas na ordem da pressão competitiva.
  const prio = (p) => (linha.has(p.u.codigo) ? linha.get(p.u.codigo).pos : Infinity);
  const lojas = planilha.map((u) => ({
    u, nota: num(u.nota), av: num(u.avaliacoes), ativa: u.status_rede === 'Ativa', nome: shortName(u.unidade)
  })).sort((a, b) => prio(a) - prio(b) || b.av - a.av);
  const ponto = new Map(lojas.map((p) => [p.u.codigo, p]));
  const medianas = linhas.filter((r) => r.medNota != null && r.medAv > 0 && ponto.has(r.codigo))
    .map((r) => ({ nota: r.medNota, av: r.medAv, n: r.viz.length, loja: ponto.get(r.codigo), nome: r.nome }));
  $('vis-fora').hidden = !lojas.some((p) => !p.ativa);

  const valor = (nota, av) => fmtNota(nota) + '★ · ' + nf0.format(Math.round(av)) + ' ' + plural(Math.round(av), 'avaliação', 'avaliações');
  mount($('vis-dispersao'), (el, w) => dispersao(el, w, {
    lojas: lojas.map((p) => Object.assign(p, { label: clip(p.nome, nameMax(w)) })),
    medianas,
    lojaLines: (p) => [['hp-tip-val', valor(p.nota, p.av)], ['hp-tip-head', p.nome + (p.ativa ? '' : ' · ' + p.u.status_rede.toLowerCase())]],
    medLines: (p) => [['hp-tip-val', valor(p.nota, p.av)], ['hp-tip-head', `Mediana de ${nf0.format(p.n)} vizinhos de ${p.nome}`]],
    label: 'Nota e avaliações de cada loja e mediana dos vizinhos a até 3 km'
  }));

  const rows = data.unidades.filter((u) => u.status_rede !== 'Fora da planilha' && (ponto.has(u.codigo) || linha.has(u.codigo)))
    .map((u) => ({ u, nome: shortName(u.unidade), viz: linha.get(u.codigo) }))
    .sort((a, b) => a.u.unidade.localeCompare(b.u.unidade, 'pt-BR'));
  altTable($('vis-dispersao-alt'), [
    { key: 'nome', label: 'Loja', lead: true },
    { key: 'status', label: 'Na rede', text: (r) => r.u.status_rede },
    { key: 'nota', label: 'Nota', num: true, text: (r) => fmtNota(num(r.u.nota)) },
    { key: 'av', label: 'Avaliações', num: true, text: (r) => fmtInt(num(r.u.avaliacoes)) },
    { key: 'medNota', label: 'Mediana da nota dos vizinhos', num: true, text: (r) => (r.viz ? fmtNota(r.viz.medNota) : '—') },
    { key: 'medAv', label: 'Mediana de avaliações dos vizinhos', num: true, text: (r) => (r.viz ? fmtInt(arred(r.viz.medAv, 0)) : '—') }
  ], rows, 'Nota e avaliações das lojas e dos vizinhos a até 3 km');
}

function grupo(id, titulo, itens, vazio) {
  const box = $(id);
  box.replaceChildren(
    h('h3', { text: `${titulo} (${nf0.format(itens.length)})` }),
    itens.length ? h('ul', { class: 'vis-list' }, itens.map((kids) => h('li', null, kids))) : h('p', { class: 'hp-note', text: vazio })
  );
}

function desenharLista({ fichas, negativas, fechados, ir }) {
  grupo('vis-fichas', 'Fichas a corrigir', fichas.map((u) => {
    const acoes = acoesDaUnidade(u);
    const v = verificacao(u);
    return [
      h('span', { class: 'hp-pill' }, statusIcon(u.situacao), u.situacao),
      ' — ', link({ tab: 'conferencia' }, shortName(u.unidade), ir), ': ',
      acoes[0] || 'confira a ficha na conferência.',
      v ? h('span', { class: 'hp-evidencia-tag', text: ` Verificado na internet em ${v.data}, confiança ${v.confianca}.` }) : '',
      acoes.length > 1 ? ` (+${acoes.length - 1} na conferência)` : ''
    ];
  }), 'Nenhuma ficha a corrigir.');

  grupo('vis-negativas', 'Lojas com % de negativas acima dos vizinhos', negativas.map((r) => [
    link({ tab: 'concorrencia', loja: r.codigo }, r.nome, ir),
    `: ${fmtPct(r.neg)} das avaliações são negativas; vizinhos a até 3 km: ${fmtPct(r.negViz)}.`,
    r.av != null && r.av < 20 ? ` Base pequena: ${nf0.format(r.av)} ${plural(r.av, 'avaliação', 'avaliações')}.` : ''
  ]), 'Nenhuma loja ativa tem % de negativas acima da média dos vizinhos.');

  grupo('vis-dias', 'Lojas fechadas em dias em que a maioria dos vizinhos abre', fechados.map((d) => [
    link({ tab: 'concorrencia', loja: d.r.codigo }, d.r.nome, ir),
    ` fecha ${nosDias(d.dia)}; ${nf0.format(d.abrem)} de ${nf0.format(d.total)} vizinhos abrem.`
  ]), 'Nenhuma loja ativa fecha em dia em que a maioria dos vizinhos abre.');
}
