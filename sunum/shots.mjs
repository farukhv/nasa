// Captures 1920x1080 screenshots of the running app (http://localhost:5173) for the jury deck.
import { chromium } from 'playwright';
import fs from 'node:fs';
const OUT = new URL('./assets/shots/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto('http://localhost:5173/');
const waitPlan = async (ms = 7000) => { await page.waitForTimeout(ms); await page.waitForFunction(() => !document.querySelector('.overlaymsg'), null, { timeout: 60000 }).catch(() => {}); await page.waitForTimeout(600); };
await waitPlan(12000);
const shot = async (name) => { await page.screenshot({ path: OUT + name + '.png' }); console.log('shot', name); };
const key = async (k, ms = 7000) => { await page.mouse.click(900, 500); await page.keyboard.press(k); await waitPlan(ms); };
await shot('01_nominal');
await key('l', 1500); await shot('02_safety');
await key('l', 1500); await shot('03_science');
await key('l', 1500); await shot('04_terrain');
await key('l', 1500);
// select Three Forks POI: click on canvas at its approx position (grid 600,600 → compute from canvas transform is hard; use centre-ish guess then verify by panel text)
const mapBox = await page.locator('.mapwrap canvas').boundingBox();
// try a few candidate points around the map centre to hit the TF marker
let hit = false;
for (const [fx, fy] of [[0.50, 0.50], [0.49, 0.49], [0.51, 0.51], [0.48, 0.5], [0.52, 0.5], [0.5, 0.48], [0.5, 0.52]]) {
  await page.mouse.click(mapBox.x + mapBox.width * fx, mapBox.y + mapBox.height * fy); await page.waitForTimeout(400);
  if (await page.getByText('Navcam ham görüntüleri').count()) { hit = true; break; }
}
console.log('POI hit', hit);
if (hit) { await page.getByText('Varınca ne göreceğim').first().scrollIntoViewIfNeeded(); await page.waitForTimeout(500); await shot('05_pov_navcam'); }
await key('5'); await shot('06_progress45');
await key('3'); await shot('07_suit_leak');
await key('2'); await shot('08_sep_shelter');
await key('h', 1500); await page.keyboard.press('Space'); await page.waitForTimeout(1500); await shot('09_hud'); await page.keyboard.press('Escape'); await page.waitForTimeout(500);
await key('1');
await key('6', 12000); await shot('10_insight');
await key('6', 12000);
await browser.close();
