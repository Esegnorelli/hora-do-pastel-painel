// Aplica o tema escolhido antes da primeira pintura (evita piscar). O resto fica em js/tabs.js.
try {
  var t = localStorage.getItem('hp-tema');
  if (t === 'dark' || t === 'light') document.documentElement.dataset.theme = t;
} catch (e) { /* sem localStorage: segue o sistema */ }
