const { expect } = require('@playwright/test');

async function open(page) {
  await page.goto('/');
  await expect(page.locator('#info')).toContainText('round-trip OK');
}

/** Wczytuje markdown do aplikacji (jak :e) i zwraca prostokąty widocznych węzłów. */
async function loadMap(page, md) {
  await page.evaluate(m => load(m), md);
  return boxes(page);
}

function boxes(page) {
  return page.evaluate(() =>
    vis().map(n => {
      const h = n.h || H;
      return {
        id: n.id,
        text: n.text,
        x: n.x,
        y: n.y,
        w: n.w,
        h,
        top: n.y - h / 2,
        bottom: n.y + h / 2,
        right: n.x + n.w,
      };
    })
  );
}

function overlaps(a, b) {
  return a.x < b.right && b.x < a.right && a.top < b.bottom && b.top < a.bottom;
}

function expectNoOverlaps(list) {
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++)
      expect(overlaps(list[i], list[j]), `"${list[i].text}" nachodzi na "${list[j].text}"`).toBe(false);
}

// --- wspólne dla testów interfejsu ---
const MD = '# Środek\n- Jeden\n  - 1a\n  - 1b\n- Dwa\n- Trzy\n';
const LONG = 'To jest bardzo długi tekst węzła, który zdecydowanie nie zmieści się w jednej linii';
/** Prostokąt węzła na ekranie (po transformacji pan/zoom). */
const box = (page, text) =>
  page.evaluate(t => {
    const n = [...vis(), ...(dnd ? vis(dnd.node) : [])].find(n => n.text === t); // także przeciągana gałąź
    const r = document.querySelector(`#g .n[data-id="${n.id}"] rect`).getBoundingClientRect();
    return { id: n.id, x: r.x, y: r.y, w: r.width, h: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2 };
  }, text);
const texts = page => page.evaluate(() => serialize(root));
const selText = page => page.evaluate(() => S().n.text);
const menu = page => page.locator('#menu');
const act = (page, a) => page.locator(`#menu [data-act="${a}"]`);

async function expectEditorOver(page, text) {
  const b = await box(page, text),
    e = await page.locator('#ed').boundingBox();
  expect(Math.abs(e.x - b.x)).toBeLessThan(2);
  expect(Math.abs(e.y - b.y)).toBeLessThan(2);
  expect(Math.abs(e.width - b.w)).toBeLessThan(2);
  expect(Math.abs(e.height - b.h)).toBeLessThan(2);
}
/** Punkt na węźle: fx = ułamek szerokości od lewej, fy = ułamek wysokości od góry. */
const at = (b, fx, fy) => [b.x + b.w * fx, b.y + b.h * fy];
const phParent = page =>
  page.evaluate(() => {
    const f = find(-1);
    return f && f.p.text;
  });

/**
 * Duża mapa do pomiarów wydajności (zawsze ta sama): `n` węzłów poza korzeniem, 8 głównych gałęzi,
 * każdy węzeł do 4 dzieci (ok. 5 poziomów), co trzeci tekst dłuższy (zawija się).
 * Zwinięte: cała 3. gałąź główna i co 9. węzeł z dziećmi od 3. poziomu.
 */
function bigMap(n) {
  const root = { t: 'Duża mapa', ch: [], d: 0 },
    q = [root];
  for (let i = 1; i <= n; i++) {
    while (q[0].ch.length >= (q[0] === root ? 8 : 4)) q.shift();
    const p = q[0],
      c = { t: `Węzeł ${i}` + (i % 3 ? '' : ' z dłuższym opisem, który zawija się w dwie linie'), ch: [], d: p.d + 1 };
    p.ch.push(c);
    q.push(c);
  }
  let k = 0;
  const md = (c, ind) =>
    `${ind}- ${c.t}${c.ch.length && ((c.d === 1 && root.ch[2] === c) || (c.d >= 3 && ++k % 9 === 0)) ? ' <!--c-->' : ''}\n` +
    c.ch.map(x => md(x, ind + '  ')).join('');
  return `# ${root.t}\n\n` + root.ch.map(c => md(c, '')).join('');
}

module.exports = {
  bigMap,
  open,
  loadMap,
  boxes,
  expectNoOverlaps,
  MD,
  LONG,
  box,
  texts,
  selText,
  menu,
  act,
  expectEditorOver,
  at,
  phParent,
};
