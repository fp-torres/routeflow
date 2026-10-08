/* global window, document */
// Aplica o tema salvo antes da renderização (evita "piscar" claro/escuro).
(function () {
  try {
    var pref = localStorage.getItem('rf-theme') || 'system';
    var dark =
      pref === 'dark' ||
      (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (_error) {
    // armazenamento indisponível (ex.: navegação privada)
  }
})();
