// Entrada: tema, abas, links diretos, carga dos dados e desenho das abas.

import { loadData } from './data.js';
import { parseHash, setHash, showTab, initTabs, initCopyLink, initTheme } from './tabs.js';
import { announce } from './ui.js';
import { renderConferencia } from './views/conferencia.js';
import { initConcorrencia, renderConcorrencia, lojaValida } from './views/concorrencia.js';

const state = { tab: 'conferencia', loja: null };
let data = null;

initTheme(document.getElementById('hp-tema'));
initCopyLink(document.getElementById('hp-copiar'));

function go(route, { push = false, focus = false } = {}) {
  state.tab = route.tab;
  const lojaMudou = route.loja && route.loja !== state.loja;
  if (route.loja) state.loja = route.loja;
  showTab(state.tab, { focus });
  if (data && lojaMudou) {
    state.loja = lojaValida(data, state.loja);
    renderConcorrencia(data, state.loja);
  }
  setHash(state, push);
}

initTabs((tab) => go({ tab }, { push: true }));
window.addEventListener('hashchange', () => go(parseHash(location.hash)));
window.addEventListener('popstate', () => go(parseHash(location.hash)));
go(parseHash(location.hash));

try {
  data = await loadData();
} catch (err) {
  console.error(err);
  const box = document.getElementById('hp-erro');
  box.textContent = 'Não foi possível carregar os dados (' + err.message + '). Recarregue a página; se continuar, avise quem mantém o painel.';
  box.hidden = false;
  document.querySelectorAll('.hp-chart').forEach((el) => el.replaceChildren());
  document.querySelectorAll('.hp-skel').forEach((el) => el.classList.remove('hp-skel'));
}

if (data) {
  renderConferencia(data);
  initConcorrencia(data, {
    getLoja: () => state.loja,
    setLoja: (cod) => {
      state.loja = cod;
      renderConcorrencia(data, cod);
      setHash(state);
      const loja = data.unidades.find((r) => r.codigo === cod);
      announce('Loja selecionada: ' + (loja ? loja.unidade : cod));
    }
  });
  state.loja = lojaValida(data, state.loja);
  renderConcorrencia(data, state.loja);
  setHash(state);
}
