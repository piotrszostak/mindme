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

module.exports = { open, loadMap, boxes, expectNoOverlaps };
