/* Pomoc: treść (HELP) i panel. */
/* ---- pomoc ---- */
/** pierwsza litera mała (opisy w pomocy) @param {string} s */
const lc1 = s => s.charAt(0).toLowerCase() + s.slice(1);
/** wiersz sekcji „Klawiatura” z tabeli czynności: skróty zwykłe i vim, nazwa (dopisek) @param {Act} a @returns {[string, string]} */
function helpRow(a) {
  if (a.help) return a.help;
  const d = a.d || (a.tip && lc1(a.tip));
  return [[...(a.k || []), ...(a.v || [])].join('|'), lc1(a.t) + (d ? ` (${d})` : '')];
}
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
    ['przytrzymaj tło', 'odznacz węzeł i otwórz menu całej mapy'],
    ['stuknij 2× tło', 'menu podręczne (zaznaczonego węzła albo całej mapy)'],
    ['przeciągnij węzeł', 'przenieś (jak myszą)'],
    ['przeciągnij tło', 'przesuń widok'],
    ['dwa palce', 'zoom'],
  ],
  'Edycja w węźle': [
    ['Enter|Esc', 'zatwierdź – węzeł zostaje zaznaczony; kolejny Enter doda brata'],
    ['Tab', 'zatwierdź i dodaj dziecko'],
    ['Ctrl+Enter', 'nowa linia w tekście węzła'],
    ['Ctrl+.|😊', 'wstaw emoji w miejscu kursora'],
    ['klik obok', 'zatwierdź'],
    ['pusty tekst', 'nowy węzeł znika, istniejący wraca do poprzedniego'],
  ],
  'Widok .md': [
    ...MDA.map(a => /** @type {[string, string]} */ ([a.k, lc1(a.t) + (a.d ? ` (${a.d})` : '')])),
    ['Enter|Shift+Enter', 'w polu szukania: następne / poprzednie trafienie (bez polskich znaków i wielkości liter)'],
    ['Ctrl+Z', 'cofnij zmianę w tekście (także czynności z paska)'],
    ['Ctrl+S|Esc', 'zapisz / wróć do mapy (Esc w polu szukania zamyka pole)'],
  ],
  'Klawiatura (zwykły | vim)': [
    ...ACT.filter(a => a.help !== false && (a.k || a.v)).map(helpRow),
    ['z|g|y|d|3', 'po chwili bez kolejnego klawisza dymek podpowiedzi pokazuje dalsze klawisze i czynności'],
  ],
  Szukanie: [
    [
      'Ctrl+F',
      'pole zostaje otwarte: Enter / Shift+Enter (albo Ctrl+G / Ctrl+Shift+G) – następne / poprzednie trafienie',
    ],
    ['/', 'jak w vim: Enter szuka i zamyka pole, dalej n / N'],
    ['Esc', 'zamknij pole – zaznaczenie zostaje na trafieniu'],
    [
      'Alt+Enter',
      'w polu: lista wszystkich trafień ze ścieżką od korzenia (trafienia widać też od razu pod polem); Enter / klik przechodzi do węzła',
    ],
    ['zolw', 'bez polskich znaków i wielkości liter: znajdzie „Żółw”'],
  ],
  'Komendy (:)': [
    [':', 'otwiera pole u góry z dwukropkiem: wpisana komenda jest pierwsza na liście, Enter ją uruchamia'],
    [':w|:e', 'zapisz / otwórz'],
    [':new tytuł', 'nowa mapa'],
    [':text', 'widok Markdown'],
    [':layout ' + Object.keys(LAY)[0], 'układ: ' + Object.keys(LAY).join(', ')],
    [':export svg', 'eksport: svg albo png'],
    [':theme dark', 'tryb jasny / ciemny: dark albo light'],
    [':fit|:test', 'dopasuj całą mapę / test zapisu'],
  ],
  'Format pliku': [
    ['--- … ---', 'frontmatter na początku pliku: zostaje bez zmian, poza mapą'],
    ['# Tytuł', 'korzeń mapy; kolejny nagłówek = kolejny korzeń'],
    ['<!--style:{…}-->', 'wygląd mapy z panelu „Wygląd” (pod tytułem)'],
    ['- tekst', 'węzeł; wcięcie o 2 spacje = dziecko'],
    ['  dalsza linia', 'wcięta linia tuż pod węzłem: kolejna linia jego tekstu'],
    ['<!--c-->', 'zwinięty węzeł (na końcu linii)'],
    ['<!--layout:both-->', 'układ mapy (pod tytułem)'],
    ['inne linie', 'akapity, ## itp.: poza mapą; zapis pyta, zanim je usunie'],
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
