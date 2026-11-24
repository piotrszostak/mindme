/* Pomoc: treść (HELP) i panel. */
/* ---- pomoc ---- */
/** @type {Record<string, [string, string][]>} sekcja → [klawisze rozdzielone „|”, opis] */
const HELP = {
  Mysz: [
    ['klik', 'zaznacz'],
    ['dwuklik węzła', 'edytuj w węźle'],
    ['PPM', 'menu podręczne (na węźle najpierw go zaznacza)'],
    ['przeciągnij węzeł', 'przenieś: prawa część celu = dziecko, lewa góra/dół = brat przed/za; Esc anuluje'],
    ['przeciągnij tło', 'przesuń widok'],
    ['kółko', 'zoom'],
    ['dwuklik tła', 'odznacz węzeł'],
    ['Esc', 'odznacz węzeł'],
  ],
  Dotyk: [
    ['stuknij', 'zaznacz'],
    ['stuknij 2× węzeł', 'edytuj w węźle'],
    ['przytrzymaj węzeł', 'zaznacz i otwórz menu podręczne'],
    ['przytrzymaj tło', 'odznacz węzeł'],
    ['stuknij 2× tło', 'menu podręczne (zaznaczonego węzła albo całej mapy)'],
    ['przeciągnij węzeł', 'przenieś (jak myszą)'],
    ['przeciągnij tło', 'przesuń widok'],
    ['dwa palce', 'zoom'],
  ],
  'Edycja w węźle': [
    ['Enter|Esc', 'zatwierdź – węzeł zostaje zaznaczony; kolejny Enter doda brata'],
    ['Tab', 'zatwierdź i dodaj dziecko'],
    ['Ctrl+.|😊', 'wstaw emoji w miejscu kursora'],
    ['klik obok', 'zatwierdź'],
    ['pusty tekst', 'nowy węzeł znika, istniejący wraca do poprzedniego'],
  ],
  'Klawiatura (zwykły | vim)': [
    ['↑ ↓ ← →|h j k l', 'poruszanie (zgodnie z układem); vim z licznikiem, np. 3j'],
    ['Home|End|gg|G', 'pierwszy / ostatni węzeł'],
    ['0|$', 'pierwszy / ostatni brat'],
    ['Spacja|i|e', 'edytuj'],
    ['c', 'edytuj od pustego tekstu'],
    ['Enter|o|s', 'nowy brat poniżej (przy korzeniu – nowy korzeń)'],
    ['Shift+Enter|O|S', 'nowy brat powyżej'],
    ['Tab|a', 'nowe dziecko'],
    ['Ctrl+D', 'duplikuj gałąź (kopia zaraz za oryginałem)'],
    ['Ctrl+C|yy', 'kopiuj gałąź'],
    ['Ctrl+X|dd', 'wytnij gałąź'],
    ['Del|Backspace|x', 'usuń gałąź (bez kopiowania)'],
    ['Ctrl+V|p', 'wklej jako dziecko'],
    ['Ctrl+Shift+V|P', 'wklej jako brata'],
    ['Shift+Spacja|za', 'zwiń / rozwiń'],
    ['zR|zM', 'rozwiń / zwiń wszystko'],
    ['z1 … z9', 'pokaż do poziomu 1–9 (głębsze zwinięte)'],
    ['Alt+↑ ↓|K J', 'przesuń w górę / w dół'],
    ['Alt+→|L', 'wsuń poziom'],
    ['Shift+Tab|Alt+←|H', 'wysuń poziom'],
    ['Ctrl+Z|u', 'cofnij'],
    ['Ctrl+Shift+Z|Ctrl+R', 'ponów'],
    ['Ctrl+F|/', 'szukaj'],
    ['Ctrl+G|n', 'następne trafienie'],
    ['Ctrl+Shift+G|N', 'poprzednie trafienie'],
    ['Shift+1|=', 'dopasuj całą mapę'],
    ['Shift+2|zz', 'pokaż zaznaczony węzeł na środku (Shift+2 także przybliża)'],
    ['Ctrl+.', 'emoji na końcu tekstu węzła'],
    ['Menu', 'menu podręczne'],
    ['Ctrl+S|Ctrl+O', 'zapisz / otwórz'],
    ['Ctrl+/|?', 'pomoc'],
    [':', 'komenda'],
  ],
  Szukanie: [
    [
      'Ctrl+F',
      'pole zostaje otwarte: Enter / Shift+Enter (albo Ctrl+G / Ctrl+Shift+G) – następne / poprzednie trafienie',
    ],
    ['/', 'jak w vim: Enter szuka i zamyka pole, dalej n / N'],
    ['Esc', 'zamknij pole – zaznaczenie zostaje na trafieniu'],
  ],
  'Komendy (:)': [
    [':w|:e', 'zapisz / otwórz'],
    [':new tytuł', 'nowa mapa'],
    [':text', 'widok Markdown'],
    [':layout right', 'układ: right, left, both, down'],
    [':export svg', 'eksport: svg albo png'],
    [':theme dark', 'motyw: dark albo light'],
    [':fit|:test', 'dopasuj całą mapę / test zapisu'],
  ],
  'Format pliku': [
    ['# Tytuł', 'korzeń mapy; kolejny nagłówek = kolejny korzeń'],
    ['<!--style:{…}-->', 'wygląd mapy z panelu „Wygląd” (pod tytułem)'],
    ['- tekst', 'węzeł; wcięcie o 2 spacje = dziecko'],
    ['<!--c-->', 'zwinięty węzeł (na końcu linii)'],
    ['<!--layout:both-->', 'układ mapy (pod tytułem)'],
  ],
};
function buildHelp() {
  const touch = matchMedia('(hover: none)').matches,
    order = Object.keys(HELP);
  if (touch)
    order.sort((a, b) => Number(b === 'Dotyk') - Number(a === 'Dotyk')); /* na telefonie najpierw gesty dotykowe */
  $('help').innerHTML =
    `<div class="hh"><b>Pomoc</b><span>Esc lub ? – zamknij</span><button id="hx" type="button" aria-label="Zamknij pomoc" title="Zamknij (Esc)">${icon('close')}</button></div><div class="hb">` +
    order
      .map(
        t =>
          `<section><h3>${esc(t)}</h3><dl>${HELP[t]
            .map(
              ([k, d]) =>
                `<dt>${k
                  .split('|')
                  .map(x => `<kbd>${esc(x)}</kbd>`)
                  .join(' ')}</dt><dd>${esc(d)}</dd>`
            )
            .join('')}</dl></section>`
      )
      .join('') +
    '</div>';
  $('hx').onclick = toggleHelp;
}
function toggleHelp() {
  closeMenu();
  const h = $('help'),
    open = h.classList.toggle('open');
  /* panel na dolnej połowie: przesuń mapę w górę, żeby środek był w widocznej części (i z powrotem po zamknięciu) */
  if (open) {
    const hh = h.getBoundingClientRect().height,
      mh = $('main').getBoundingClientRect().height;
    h.dataset.shift = String(hh < mh - 2 ? hh / 2 : 0);
  }
  ty += (open ? -1 : 1) * (Number(h.dataset.shift) || 0);
  apply();
}
