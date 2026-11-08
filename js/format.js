// Números e textos em pt-BR. Tudo que vem dos CSVs é string: `num` converte e devolve null para vazio.

export const nf0 = new Intl.NumberFormat('pt-BR');
export const nf1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const nf2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const num = (v) => {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const fmtInt = (v) => (v == null ? '—' : nf0.format(v));
export const fmtNota = (v) => (v == null ? '—' : nf1.format(v));
export const fmtPct = (v) => (v == null ? '—' : nf0.format(Math.round(v)) + '%');
export const fmtKm = (v) => (v == null ? '—' : nf2.format(v) + ' km');
export const fmtDec = (v) => (v == null ? '—' : nf1.format(v));

export const DIAS = [
  ['seg', 'Seg', 'segunda'], ['ter', 'Ter', 'terça'], ['qua', 'Qua', 'quarta'], ['qui', 'Qui', 'quinta'],
  ['sex', 'Sex', 'sexta'], ['sab', 'Sáb', 'sábado'], ['dom', 'Dom', 'domingo']
];

// "Porto Alegre - Floresta" → "POA · Floresta"; nomes de loja ficam curtos nos gráficos.
export const shortName = (name) => String(name).replace(/^Porto Alegre - /, 'POA · ').replace(/ - /, ' · ');
export const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
export const nameMax = (w) => (w < 420 ? 16 : w < 640 ? 22 : 28);

export const plural = (n, um, varios) => (n === 1 ? um : varios);
export const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
