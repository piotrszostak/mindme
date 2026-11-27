/* Dymek podpowiedzi klawiszy (which-key, 2.6): po prefiksie vim (z g y d) albo liczniku (3, 12) i ok. 400 ms bez
   kolejnego klawisza pokazuje możliwe dalsze klawisze z nazwami czynności z `ACT` (pola `v`, `cnt`) – nowe skróty
   dopisują się same. Nie bierze fokusu i nie przechwytuje klawiszy: naciśnięcia obsługuje dalej `normal()`, a ten plik
   po każdym z nich tylko sprawdza, czy coś czeka (`pend`, `cnt`). Słuchacz musi być dodany po tym z keys.js. */
const WK_MS = 400;
let wkT = 0;
/** same modyfikatory: Shift przed R w „zR” to jeszcze nie kolejny klawisz */
const WK_MOD = ['Shift', 'Control', 'Alt', 'AltGraph', 'Meta', 'CapsLock'];
/**
 * wiersze dymka [klawisze, nazwa]: kontynuacje prefiksu albo – bez prefiksu – czynności z licznikiem
 * @param {string} p prefiks ('' = po samym liczniku) @returns {[string, string][]}
 */
function wkRows(p) {
  if (!p) return ACT.filter(a => a.cnt && a.v).map(a => [(a.v || []).join(' '), a.t]);
  /** @type {{ k: string, t: string, n: string }[]} n – nazwa z „N” zamiast numeru (z1…z9) */
  const r = [];
  for (const a of ACT)
    for (const s of a.v || []) {
      if (s.length !== 2 || s[0] !== p) continue;
      const k = s[1],
        n = a.t.replace(/\d+$/, 'N'),
        last = r[r.length - 1];
      /* kolejne cyfry tej samej czynności w jednym wierszu: „1–9 Pokaż do poziomu N” */
      if (/^\d$/.test(k) && last && /^\d/.test(last.k) && last.n === n) {
        last.k = last.k[0] + '–' + k;
        last.t = n;
      } else r.push({ k, t: a.t, n });
    }
  return r.map(x => [x.k, x.t]);
}
function wkShow() {
  wkT = 0;
  /* tylko w trybie mapy; nigdy razem z paletą, menu, okienkiem emoji ani edycją */
  if (mode !== 'NORMAL' || tv || editing || menuOpen || emoOpen || palOpen || dnd || (!pend && !cnt)) return;
  const rows = wkRows(pend);
  if (!rows.length) return;
  const w = $('wk');
  w.replaceChildren(
    ...rows.flatMap(([k, t]) => {
      const b = document.createElement('kbd'),
        s = document.createElement('span');
      b.textContent = k;
      s.textContent = t;
      return [b, s];
    })
  );
  w.classList.add('open');
}
function wkHide() {
  clearTimeout(wkT);
  wkT = 0;
  $('wk').classList.remove('open');
}
window.addEventListener('keydown', ev => {
  if (WK_MOD.includes(ev.key)) return;
  wkHide();
  if (mode === 'NORMAL' && !tv && (pend || cnt)) wkT = setTimeout(wkShow, WK_MS);
});
/* klik albo dotyk (mapa, pasek, menu) zamyka dymek */
document.addEventListener('pointerdown', wkHide, true);
