// Filtros da aba de concorrência: estado padrão e a regra de quem passa. Funções puras, sem DOM.

import { num } from './format.js';
import { anuncia } from './data.js';

export const FILTROS_PADRAO = { raio: 3, tipo: '', anuncia: '', domingo: false, notaMin: 0 };

const ANUNCIA_REGRA = {
  sim: anuncia,
  nao: (r) => r.anuncia === 'Não',
  semsite: (r) => r.anuncia === 'Sem site',
  naover: (r) => r.anuncia === 'Não verificado'
};

// Concorrentes da loja que passam em todos os filtros (o raio também é filtro).
export function filtrar(rows, f) {
  return rows.filter((r) => num(r.distancia_km) <= f.raio
    && (!f.tipo || r.tipo === f.tipo)
    && (!f.anuncia || ANUNCIA_REGRA[f.anuncia](r))
    && (!f.domingo || r.abre_domingo === 'sim')
    && (!f.notaMin || (num(r.nota) ?? 0) >= f.notaMin));
}

const ANUNCIA_TEXTO = { sim: 'anunciam no Meta ou Google', nao: 'não anunciam', semsite: 'sem site', naover: 'anúncio não verificado' };

// Frase com os filtros em vigor, para o relatório impresso.
export function descreverFiltros(f) {
  const partes = [`a até ${f.raio} km`, f.tipo ? (f.tipo === 'Pastelaria' ? 'só pastelarias' : 'só outros tipos') : 'todos os tipos'];
  if (f.anuncia) partes.push(ANUNCIA_TEXTO[f.anuncia]);
  if (f.domingo) partes.push('abrem domingo');
  if (f.notaMin) partes.push(`nota ${String(f.notaMin.toFixed(1)).replace('.', ',')} ou mais`);
  return 'Concorrentes ' + partes.join(', ') + '.';
}
