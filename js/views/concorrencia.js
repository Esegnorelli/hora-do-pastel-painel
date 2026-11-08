// Aba "Concorrência por loja": filtros, resumo, mapa, mais avaliados, comparação, horários e tabela de concorrentes.
// Os filtros valem para tudo na aba e continuam iguais quando a loja muda.

import { fill, mount, dataTable, altTable, h, stateMsg, announce, downloadCSV, isNarrow } from '../ui.js';
import { num, nf0, nf2, fmtNota, fmtInt, fmtPct, fmtKm, clip, nameMax, norm, plural } from '../format.js';
import { ativas, anuncia, media, mediana, vals } from '../data.js';
import { FILTROS_PADRAO, filtrar, descreverFiltros } from '../filtros.js';
import { vizinhancaMap } from '../charts/vizinhanca.js';
import { carregaLeaflet, criaMapa } from '../charts/mapa-leaflet.js';
import { hbars } from '../charts/bars.js';
import { calor, abertosPorHora, HORAS } from '../charts/calor.js';
import { comparacao, SERIES } from '../charts/comparacao.js';

const $ = (id) => document.getElementById(id);
const VAZIO = 'Nenhum concorrente com esses filtros.';

export const concLines = (r) => [
  ['hp-tip-val', num(r.nota) != null ? fmtNota(num(r.nota)) + '★ · ' + fmtInt(num(r.avaliacoes) || 0) + ' avaliações' : 'Sem avaliações'],
  ['hp-tip-head', r.nome],
  ['hp-tip-head', (r.categoria || r.tipo) + ' · ' + fmtKm(num(r.distancia_km))]
];

// Sem situação da conferência aqui: status só aparece na aba de conferência.
const lojaLines = (u) => [
  ['hp-tip-val', num(u.nota) != null ? fmtNota(num(u.nota)) + '★ · ' + fmtInt(num(u.avaliacoes)) + ' avaliações' : 'Sem ficha no Maps'],
  ['hp-tip-head', 'Hora do Pastel · ' + u.unidade]
];

const tipoCls = (r) => (r.loja ? 'f-loja' : r.tipo === 'Pastelaria' ? 'f-pastel' : 'f-outro');
const simNao = (v) => (v === 'sim' ? 'Sim' : v === 'não' ? 'Não' : '');

const CTRL = { raio: 'conc-raio', tipo: 'conc-tipo', anuncia: 'conc-anuncia', notaMin: 'conc-nota', domingo: 'conc-domingo' };

function lerFiltros() {
  return {
    raio: Number($(CTRL.raio).value),
    tipo: $(CTRL.tipo).value,
    anuncia: $(CTRL.anuncia).value,
    notaMin: Number($(CTRL.notaMin).value),
    domingo: $(CTRL.domingo).checked
  };
}

function escreverFiltros(f) {
  $(CTRL.raio).value = String(f.raio);
  $(CTRL.tipo).value = f.tipo;
  $(CTRL.anuncia).value = f.anuncia;
  $(CTRL.notaMin).value = String(f.notaMin);
  $(CTRL.domingo).checked = f.domingo;
}

let table = null;
let rede = null;
let atual = { cod: null, filtrados: [] };

export function initConcorrencia(data, { getLoja, setLoja }) {
  const sel = $('conc-loja');
  sel.replaceChildren(...ativas(data.unidades).map((r) => new Option(r.unidade, r.codigo)));
  sel.addEventListener('change', () => setLoja(sel.value));

  const lojas = ativas(data.unidades);
  rede = Object.fromEntries(['nota', 'avaliacoes', 'negativas_pct', 'pct_5_estrelas'].map((k) => [k, mediana(vals(lojas, k))]));

  const aoFiltrar = () => {
    renderConcorrencia(data, getLoja());
    const n = atual.filtrados.length;
    announce(nf0.format(n) + ' ' + plural(n, 'concorrente', 'concorrentes') + ' a até ' + lerFiltros().raio + ' km com esses filtros.');
  };
  Object.values(CTRL).forEach((id) => $(id).addEventListener('change', aoFiltrar));
  $('conc-limpar').addEventListener('click', () => { escreverFiltros(FILTROS_PADRAO); aoFiltrar(); });
  $('conc-busca').addEventListener('input', () => renderConcorrencia(data, getLoja()));
  $('conc-csv').addEventListener('click', () => {
    const f = lerFiltros();
    downloadCSV(`concorrentes-${atual.cod}-${f.raio}km.csv`, table.sorted(), data.concorrentes.columns);
  });
}

export function lojaValida(data, cod) {
  const lista = ativas(data.unidades);
  return lista.some((r) => r.codigo === cod) ? cod : (lista[0] ? lista[0].codigo : null);
}

// Números do resumo com os filtros já aplicados (`rows` = vizinhos a até o raio que passam nos filtros).
function resumo(loja, rows, f) {
  const avLoja = num(loja.avaliacoes);
  const lider = rows.slice().sort((a, b) => (num(b.avaliacoes) || 0) - (num(a.avaliacoes) || 0))[0];
  const ate1 = rows.filter((r) => num(r.distancia_km) <= 1).length;
  const notaMediana = mediana(vals(rows, 'nota').filter((v) => v > 0));
  const negMedia = media(vals(rows, 'negativas_pct'));
  return {
    raio: f.raio,
    pastelarias_raio: nf0.format(rows.filter((r) => r.tipo === 'Pastelaria').length),
    ate_raio: nf0.format(rows.length),
    densidade: nf2.format(rows.length / (Math.PI * f.raio ** 2)),
    densidade_1km: nf2.format(ate1 / Math.PI),
    nota_loja: num(loja.nota) == null ? null : fmtNota(num(loja.nota)),
    nota_mediana: notaMediana == null ? null : fmtNota(notaMediana),
    avaliacoes_loja: avLoja == null ? null : fmtInt(avLoja),
    posicao: avLoja == null ? null : rows.filter((r) => (num(r.avaliacoes) || 0) > avLoja).length + 1 + 'º',
    total: nf0.format(rows.length + 1),
    neg_loja: num(loja.negativas_pct) == null ? null : fmtPct(num(loja.negativas_pct)),
    neg_media: negMedia == null ? null : fmtPct(negMedia),
    lider_nome: lider ? lider.nome : null,
    lider_avaliacoes: lider && num(lider.avaliacoes) != null ? fmtInt(num(lider.avaliacoes)) : null,
    anunciam: nf0.format(rows.filter(anuncia).length),
    com_site: nf0.format(rows.filter((r) => r.tem_site === 'sim').length)
  };
}

// Mapa com ruas quando o Leaflet carrega; sem ele (offline, CDN bloqueado) volta o mapa simples em d3.
let mapa = null;
let mapaEstado = 'novo'; // novo → carregando → pronto | falhou
let mapaParams = null;
function desenhaMapa(el, w) {
  if (mapaEstado === 'pronto') { mapa.update(mapaParams); return; }
  if (mapaEstado === 'falhou') { vizinhancaMap(el, w, mapaParams); return; }
  if (mapaEstado === 'carregando') return;
  mapaEstado = 'carregando';
  stateMsg(el, 'Carregando o mapa…');
  carregaLeaflet().then((L) => {
    mapa = criaMapa(el, L);
    mapaEstado = 'pronto';
    mapa.update(mapaParams);
  }, () => {
    mapaEstado = 'falhou';
    notaMapa();
    mount(el, desenhaMapa);
  });
}

function notaMapa() {
  const msgs = [
    mapaEstado === 'falhou' ? 'Mapa de ruas indisponível agora (sem conexão com o servidor de mapas); mostrando a versão simplificada.' : '',
    mapaParams && !mapaParams.rows.length ? VAZIO : ''
  ].filter(Boolean);
  const nota = $('conc-mapa-nota');
  nota.textContent = msgs.join(' ');
  nota.hidden = !msgs.length;
}

// Gráfico que pode ficar sem dados: com `msg`, a mensagem fica no lugar do desenho e a tabela equivalente some.
function grafico(id, altId, msg, draw) {
  $(altId).hidden = Boolean(msg);
  mount($(id), msg ? (el) => stateMsg(el, msg) : draw);
}

export function renderConcorrencia(data, cod) {
  const loja = data.unidades.find((r) => r.codigo === cod);
  if (!loja) return;
  $('conc-loja').value = cod;
  const f = lerFiltros();
  $('conc-filtros-print').textContent = descreverFiltros(f);
  const todos = (data.porLoja.get(cod) || []).slice().sort((a, b) => num(a.distancia_km) - num(b.distancia_km));
  const rows = filtrar(todos, f);
  atual = { cod, filtrados: rows };
  const vazio = !rows.length;

  const numeros = resumo(loja, rows, f);
  fill($('concorrencia'), numeros);
  $('conc-take-pos').hidden = num(loja.avaliacoes) == null;
  $('conc-take-semficha').hidden = num(loja.avaliacoes) != null;
  $('conc-take-lider').hidden = !numeros.lider_nome;

  mapaParams = { loja, todos, rows, raio: f.raio, lojaLines: () => lojaLines(loja), concLines };
  notaMapa();
  mount($('conc-mapa'), desenhaMapa);
  $('conc-mapa-alt').hidden = vazio;
  if (!vazio) {
    altTable($('conc-mapa-alt'), [
      { key: 'nome', label: 'Nome', lead: true },
      { key: 'tipo', label: 'Tipo' },
      { key: 'distancia_km', label: 'Distância', num: true, text: (r) => fmtKm(num(r.distancia_km)) },
      { key: 'avaliacoes', label: 'Avaliações', num: true, text: (r) => fmtInt(num(r.avaliacoes)) }
    ], rows, 'Concorrentes no mapa');
  }

  const top = rows.filter((r) => num(r.avaliacoes) != null)
    .sort((a, b) => num(b.avaliacoes) - num(a.avaliacoes)).slice(0, 10)
    .map((r) => ({ ...r, key: r.place_id }));
  if (num(loja.avaliacoes) != null) top.push({ key: 'loja', loja: true, nome: 'Hora do Pastel', nota: loja.nota, avaliacoes: loja.avaliacoes, tipo: 'Loja' });
  top.sort((a, b) => num(b.avaliacoes) - num(a.avaliacoes));
  const tituloBarras = 'Mais avaliados a até ' + f.raio + ' km';
  grafico('conc-barras', 'conc-barras-alt', vazio && VAZIO, (el, w) => hbars(el, w, {
    rows: top,
    id: (r) => r.key,
    name: (r) => clip(r.nome, nameMax(w)),
    value: (r) => num(r.avaliacoes),
    valueText: (r) => nf0.format(num(r.avaliacoes)) + (num(r.nota) != null ? ' · ' + fmtNota(num(r.nota)) + '★' : ''),
    cls: tipoCls,
    strong: (r) => r.loja,
    tipLines: (r) => (r.loja ? lojaLines(loja) : concLines(r)),
    label: tituloBarras
  }));
  if (!vazio) {
    altTable($('conc-barras-alt'), [
      { key: 'nome', label: 'Nome', lead: true },
      { key: 'tipo', label: 'Tipo' },
      { key: 'avaliacoes', label: 'Avaliações', num: true, text: (r) => fmtInt(num(r.avaliacoes)) },
      { key: 'nota', label: 'Nota', num: true, text: (r) => fmtNota(num(r.nota)) }
    ], top, tituloBarras);
  }

  const med = (k, filtro = () => true) => mediana(vals(rows, k).filter(filtro));
  const metricas = [
    { label: 'Nota', fmt: fmtNota, max: 5, k: 'nota', viz: med('nota', (v) => v > 0) },
    { label: 'Avaliações', fmt: (v) => fmtInt(v == null ? v : Math.round(v)), k: 'avaliacoes', viz: med('avaliacoes') },
    { label: 'Negativas (1–2★)', fmt: fmtPct, k: 'negativas_pct', viz: med('negativas_pct') },
    { label: '5 estrelas', fmt: fmtPct, k: 'pct_5_estrelas', viz: med('pct_5_estrelas') }
  ].map((m) => ({ ...m, loja: num(loja[m.k]), rede: rede[m.k] }));
  grafico('conc-comp', 'conc-comp-alt', vazio && VAZIO, (el, w) => comparacao(el, w, { metricas }));
  if (!vazio) {
    altTable($('conc-comp-alt'), [{ key: 'label', label: 'Métrica', lead: true }]
      .concat(SERIES.map((s) => ({ key: s.key, label: s.key === 'loja' ? 'Loja' : s.nome, num: true, text: (m) => m.fmt(m[s.key]) }))),
    metricas, 'Loja, vizinhos e rede');
  }

  const dados = abertosPorHora(rows, loja);
  const semHorario = !vazio && !dados.total;
  grafico('conc-calor', 'conc-calor-alt', vazio ? VAZIO : semHorario && 'Nenhum desses concorrentes tem horário no Google.', (el, w) => calor(el, w, { dados }));
  if (!vazio && !semHorario) {
    altTable($('conc-calor-alt'), [{ key: 'label', label: 'Dia', lead: true }]
      .concat(HORAS.map((hr, j) => ({ key: 'h' + hr, label: hr + 'h', num: true, text: (d) => nf0.format(d.horas[j].n) + (d.horas[j].loja ? ' ●' : '') }))),
    dados.dias, 'Vizinhos abertos por hora, de ' + nf0.format(dados.total) + ' com horário. ● = loja aberta.');
  }

  const columns = [
    { key: 'nome', label: 'Nome', lead: true },
    { key: 'tipo', label: 'Tipo', text: (r) => h('span', { class: 'hp-pill' }, h('span', { class: 'hp-sw ' + (r.tipo === 'Pastelaria' ? 'sw-pastel' : 'sw-outro'), 'aria-hidden': 'true' }), r.tipo) },
    { key: 'categoria', label: 'Categoria no Google' },
    { key: 'distancia_km', label: 'Distância (km)', num: true, sort: (r) => num(r.distancia_km), text: (r) => fmtKm(num(r.distancia_km)).replace(' km', '') },
    { key: 'nota', label: 'Nota', num: true, sort: (r) => num(r.nota), text: (r) => (num(r.nota) != null ? fmtNota(num(r.nota)) : '') },
    { key: 'avaliacoes', label: 'Avaliações', num: true, sort: (r) => num(r.avaliacoes), text: (r) => (num(r.avaliacoes) != null ? fmtInt(num(r.avaliacoes)) : '') },
    { key: 'negativas_pct', label: 'Negativas (1–2★)', num: true, sort: (r) => num(r.negativas_pct), text: (r) => (num(r.negativas_pct) != null ? fmtPct(num(r.negativas_pct)) : '') },
    { key: 'dias_abertos', label: 'Dias abertos', num: true, sort: (r) => num(r.dias_abertos) },
    { key: 'abre_domingo', label: 'Abre domingo', text: (r) => simNao(r.abre_domingo) },
    { key: 'fecha_depois_22h', label: 'Fecha depois das 22h', text: (r) => simNao(r.fecha_depois_22h) },
    { key: 'anuncia', label: 'Anuncia' },
    { key: 'redes', label: 'Redes sociais' },
    { key: 'endereco', label: 'Endereço' }
  ];
  const q = norm($('conc-busca').value.trim());
  const lista = rows.filter((r) => !q || norm([r.nome, r.categoria, r.endereco, r.tipo, r.anuncia, r.redes].join(' ')).includes(q));
  const empty = vazio ? VAZIO : 'Nenhum concorrente com essa busca.';
  // Recriada a cada desenho para a mensagem de vazio acompanhar o motivo; a ordenação escolhida continua.
  table = dataTable($('conc-tabela'), { columns, rows: lista, sortable: true, sort: table ? table.sort : { key: 'distancia_km', dir: 'asc' }, pageSize: isNarrow() ? 10 : 25, empty });
  $('conc-csv').disabled = !lista.length;
}
