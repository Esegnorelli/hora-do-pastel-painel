// Carrega os CSVs e calcula os resumos usados pelas abas. Funções puras, sem DOM.

import { num, DIAS } from './format.js';

const d3 = window.d3;

const FILES = { unidades: 'data/unidades-maps.csv', concorrentes: 'data/concorrentes.csv' };

export async function loadData() {
  const [unidades, concorrentes] = await Promise.all(Object.values(FILES).map(async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    return d3.csvParse(await res.text());
  }));
  const porLoja = d3.group(concorrentes, (r) => r.codigo);
  return { unidades, concorrentes, porLoja };
}

export const ativas = (unidades) => unidades
  .filter((r) => r.status_rede === 'Ativa')
  .sort((a, b) => a.unidade.localeCompare(b.unidade, 'pt-BR'));

export const ANUNCIA = ['Meta', 'Google', 'Meta e Google'];
export const anuncia = (r) => ANUNCIA.includes(r.anuncia);

const media = (xs) => (xs.length ? d3.mean(xs) : null);
const mediana = (xs) => (xs.length ? d3.median(xs) : null);
const vals = (rows, f) => rows.map((r) => num(r[f])).filter((v) => v != null);

export { media, mediana, vals };

// Resumo da loja contra os vizinhos a até `raio` km.
export function resumoLoja(loja, vizinhos, raio = 3) {
  const km = (c) => num(c.distancia_km);
  const ate = vizinhos.filter((c) => km(c) <= raio);
  const ate1 = vizinhos.filter((c) => km(c) <= 1);
  const avLoja = num(loja.avaliacoes);
  const lider = ate.slice().sort((a, b) => (num(b.avaliacoes) || 0) - (num(a.avaliacoes) || 0))[0];
  const notas = vals(ate, 'nota').filter((v) => v > 0);
  const negs = vals(ate, 'negativas_pct');
  return {
    ate_1km: ate1.length,
    pastelarias_1km: ate1.filter((c) => c.tipo === 'Pastelaria').length,
    ate_raio: ate.length,
    pastelarias_raio: ate.filter((c) => c.tipo === 'Pastelaria').length,
    nota_loja: num(loja.nota),
    avaliacoes_loja: avLoja,
    nota_media: media(notas),
    neg_loja: num(loja.negativas_pct),
    neg_media: media(negs),
    posicao: avLoja == null ? null : ate.filter((c) => (num(c.avaliacoes) || 0) > avLoja).length + 1,
    total: ate.length + 1,
    lider_nome: lider ? lider.nome : null,
    lider_avaliacoes: lider ? num(lider.avaliacoes) || 0 : null,
    anunciam: ate.filter(anuncia).length,
    com_site: ate.filter((c) => c.anuncia !== 'Sem site').length
  };
}

// "11:00-14:00,18:00-23:00|x|…" → por dia, lista de [início, fim] em minutos; [] = fechado; null = sem horário.
// Intervalo que passa da meia-noite termina depois de 1440.
export function parseHorarios(s) {
  if (!s) return null;
  const parts = s.split('|');
  if (parts.length !== 7) return null;
  const min = (t) => { const [hh, mm] = t.split(':').map(Number); return hh * 60 + mm; };
  return parts.map((p) => (p === 'x' || p === '' ? [] : p.split(',').map((iv) => {
    const [a, b] = iv.split('-').map(min);
    return [a, b <= a ? b + 1440 : b];
  })));
}

// Aberto em algum momento da hora [h, h+1)?
export const abertoNaHora = (intervalos, hora) => intervalos.some(([a, b]) => a < (hora + 1) * 60 && b > hora * 60);

export const diasAbertos = (r) => DIAS.filter(([k]) => r[k] === '1').map(([k]) => k);
