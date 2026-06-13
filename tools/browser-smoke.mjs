/**
 * Real-browser smoke test for the player-visible opening flow.
 *
 * Run `npm install`, then `npx playwright install chromium` once. After that:
 * `npm run test:browser`.
 */
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const port = 8765;
const server = spawn('python3', ['-m', 'http.server', String(port)], { stdio: 'ignore' });
let browser;

try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  for (const config of [
    { name: 'desktop', viewport: { width: 1440, height: 900 } },
    { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  ]) {
    const context = await browser.newContext(config);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'networkidle' });
    assert(await page.locator('#dailyCard').isHidden(), `${config.name}: daily should wait until a return visit`);
    await page.locator('#playBtn').click();
    assert(await page.locator('#eraIntro').isVisible(), `${config.name}: Play should open the pre-life prologue`);
    assert(await page.locator('#eraIntroTitle').textContent() === 'Before Life', `${config.name}: prologue should begin before the First Cell`);
    await page.locator('#eraIntroGo').click();
    await page.waitForTimeout(500);
    assert(await page.locator('#civPanel').isHidden(), `${config.name}: origin HUD should stay focused`);
    assert(await page.locator('#objectiveTitle').textContent() === '✦ Create The First Life', `${config.name}: prologue should have one clear goal`);
    assert(await page.locator('#discoveryPanel').isHidden(), `${config.name}: natural terrain must not create discoveries`);

    await page.keyboard.press('m');
    assert(await page.locator('#mapPanel').isVisible(), `${config.name}: map should open visibly`);
    await page.keyboard.press('Escape');
    assert(await page.locator('#mapPanel').isHidden(), `${config.name}: Escape should close the map`);
    assert(errors.length === 0, `${config.name}: console errors: ${errors.join('; ')}`);
    await context.close();
    console.log(`✓ ${config.name} opening flow`);
  }
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}

async function waitForServer() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}`);
      if (res.ok) return;
    } catch (e) {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Local test server did not start');
}

function assert(value, message) {
  if (!value) throw new Error(message);
}
