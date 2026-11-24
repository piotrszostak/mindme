/* Ikony SVG (24×24, kreska w kolorze tekstu) i nazwy układów. */
/* ---- ikony (SVG 24×24, kreska w kolorze tekstu) ---- */
/** @type {Record<string, string | [string, string?]>} */
const IC = {
  open: 'M3 7h6l2 2h10v10H3z',
  save: 'M5 3h11l3 3v15H5z M8 3v5h8V3 M8 14h8v7H8z',
  undo: 'M9 14L4 9l5-5 M4 9h10a6 6 0 010 12h-3',
  redo: 'M15 14l5-5-5-5 M20 9H10a6 6 0 000 12h3',
  more: 'M5 12h.01 M12 12h.01 M19 12h.01',
  fit: 'M4 9V4h5 M20 9V4h-5 M4 15v5h5 M20 15v5h-5',
  edit: 'M4 20h4L19 9l-4-4L4 16z M14 6l4 4',
  child: 'M3 9h7v6H3z M10 12h5 M18 9v6 M15 12h6',
  sibdown: 'M6 3h12v6H6z M12 13v8 M8 17h8',
  sibup: 'M6 15h12v6H6z M12 3v8 M8 7h8',
  del: 'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13 M10 11v6 M14 11v6',
  copy: 'M8 8h12v12H8z M4 16V4h12',
  dup: 'M8 8h12v12H8z M4 16V4h12 M14 11v6 M11 14h6',
  cut: 'M6 7a3 3 0 100-.01 M6 20a3 3 0 100-.01 M8 8l12 10 M8 16L20 6',
  paste: 'M9 3h6v4H9z M7 5H5v16h14V5h-2',
  fold: 'M6 9l6 6 6-6',
  unfold: 'M9 6l6 6-6 6',
  indent: 'M4 5h16 M11 12h9 M11 19h9 M4 9l4 3-4 3',
  outdent: 'M4 5h16 M11 12h9 M11 19h9 M8 9l-4 3 4 3',
  up: 'M12 19V5 M6 11l6-6 6 6',
  emoji: 'M12 21a9 9 0 100-18 9 9 0 000 18z M8 14s1.5 2 4 2 4-2 4-2 M9 9.5h.01 M15 9.5h.01',
  sliders: 'M4 6h9 M17 6h3 M15 4v4 M4 12h3 M11 12h9 M9 10v4 M4 18h11 M19 18h1 M17 16v4',
  close: 'M6 6l12 12 M18 6L6 18',
  map: 'M9 10h6v4H9z M15 12h2 M17 12c2 0 2-5 4-5 M17 12c2 0 2 5 4 5 M9 12H7 M7 12c-2 0-2-5-4-5 M7 12c-2 0-2 5-4 5',
  down: 'M12 5v14 M6 13l6 6 6-6',
  text: 'M6 3h9l4 4v14H6z M9 9h3 M9 13h7 M9 17h7',
  newmap: 'M6 3h9l4 4v14H6z M12 10v7 M8.5 13.5h7',
  image: 'M4 5h16v14H4z M4 15l5-5 5 5 3-3 3 3',
  theme: 'M20 14A8 8 0 0110 4a8 8 0 1010 10z',
  help: 'M12 21a9 9 0 100-18 9 9 0 000 18z M9.5 9.5a2.5 2.5 0 115 0c0 1.7-2.5 2-2.5 3.5 M12 17h.01',
  cmd: 'M4 7l5 5-5 5 M12 17h8',
  lright: ['M3 12h4 M7 12c4 0 4-6 8-6h6 M7 12h14 M7 12c4 0 4 6 8 6h6'],
  lleft: ['M3 12h4 M7 12c4 0 4-6 8-6h6 M7 12h14 M7 12c4 0 4 6 8 6h6', 'matrix(-1 0 0 1 24 0)'],
  lboth: ['M9 12h6 M9 12c-3 0-3-6-6-6 M9 12c-3 0-3 6-6 6 M15 12c3 0 3-6 6-6 M15 12c3 0 3 6 6 6'],
  ldown: ['M3 12h4 M7 12c4 0 4-6 8-6h6 M7 12h14 M7 12c4 0 4 6 8 6h6', 'rotate(90 12 12)'],
};
/** @param {string} n nazwa ikony z `IC` */
const icon = n => {
  const v = IC[n],
    [d, t] = Array.isArray(v) ? v : [v];
  return `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"${t ? ` transform="${t}"` : ''}/></svg>`;
};
/** @type {Record<string, [string, string]>} układ: [ikona, opis] */
const LAY = {
  right: ['lright', 'w prawo'],
  left: ['lleft', 'w lewo'],
  both: ['lboth', 'na obie strony'],
  down: ['ldown', 'w dół'],
};
