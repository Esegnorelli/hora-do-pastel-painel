/* Runtime mínimo para o painel fora do claude.ai.
   Implementa só o que a página usa: dash.data, dash.calc, dash.draw, dash.colors e dash.setLink.
   Os dados vêm dos CSVs em /data, carregados uma vez. */
(function () {
  const DATASETS = {
    unidades: 'data/unidades-maps.csv',
    concorrentes: 'data/concorrentes.csv'
  };

  const store = {};      // id -> {status, data, message}
  const calcs = {};      // id -> {inputs, fn}
  const draws = {};      // name -> fn

  Object.keys(DATASETS).forEach((id) => { store[id] = { status: 'loading', data: [] }; });

  const runCalcs = () => {
    for (const [id, c] of Object.entries(calcs)) {
      const ins = c.inputs.map((i) => store[i]);
      if (ins.some((s) => !s || s.status === 'error')) { store[id] = { status: 'error', data: [] }; continue; }
      if (ins.some((s) => s.status !== 'ok')) { store[id] = { status: 'loading', data: [] }; continue; }
      try {
        store[id] = { status: 'ok', data: c.fn(...ins.map((s) => s.data)) };
      } catch (e) {
        console.error('calc', id, e);
        store[id] = { status: 'error', data: [], message: String(e) };
      }
    }
  };

  const visible = (el) => !el.closest('[hidden]');

  const runDraw = (name) => {
    const fn = draws[name];
    if (!fn) return;
    document.querySelectorAll(`[data-draw="${name}"]`).forEach((el) => {
      if (!visible(el)) return;
      try { fn(el); } catch (e) { console.error('draw', name, e); }
    });
  };
  const runAll = () => Object.keys(draws).forEach(runDraw);

  window.dash = {
    // Dataviz reference categorical order; dark steps chosen for the dark surface.
    get colors() {
      const dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      return dark
        ? ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767']
        : ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
    },
    data(id) {
      const s = store[id] || { status: 'missing', data: [] };
      return { status: s.status, data: s.data, message: s.message || '', refreshing: false, meta: [] };
    },
    calc(id, spec) { calcs[id] = spec; runCalcs(); },
    draw(name, fn) {
      if (typeof fn === 'function') draws[name] = fn;
      runDraw(name);
    },
    onData(fn) { try { fn(); } catch (e) { console.error(e); } },
    setLink(name) { try { history.replaceState(null, '', '#' + name); } catch (e) { /* ignore */ } },
    loader() {},
    params() { return {}; },
    setParams() {},
    resetParams() {}
  };

  const load = async () => {
    await Promise.all(Object.entries(DATASETS).map(async ([id, url]) => {
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
        store[id] = { status: 'ok', data: d3.csvParse(await res.text()) };
      } catch (e) {
        console.error('dataset', id, e);
        store[id] = { status: 'error', data: [], message: String(e) };
      }
    }));
    runCalcs();
    runAll();
  };

  // Redesenha quando uma aba aparece e quando a largura de um gráfico muda.
  const watch = () => {
    new MutationObserver(runAll).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['hidden'] });
    if (window.ResizeObserver) {
      const widths = new WeakMap();
      const ro = new ResizeObserver((entries) => {
        for (const e of entries) {
          const el = e.target;
          const w = Math.round(e.contentRect.width);
          if (!w || widths.get(el) === w) continue;
          const first = !widths.has(el);
          widths.set(el, w);
          if (first) continue;
          const fn = draws[el.dataset.draw];
          if (fn && visible(el)) { try { fn(el); } catch (err) { console.error('draw', el.dataset.draw, err); } }
        }
      });
      document.querySelectorAll('[data-draw]').forEach((el) => {
        if (el.matches('div')) { widths.set(el, Math.round(el.clientWidth)); ro.observe(el); }
      });
    }
    let t = null;
    let lastW = window.innerWidth;
    window.addEventListener('resize', () => {
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      clearTimeout(t);
      t = setTimeout(runAll, 150);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { watch(); load(); });
  } else { watch(); load(); }
})();
