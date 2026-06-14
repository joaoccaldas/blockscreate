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
    await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'networkidle' });
    assert(await page.locator('#dailyCard').isHidden(), `${config.name}: daily should wait until a return visit`, errors);
    assert(await page.locator('#prologueBtn').isVisible(), `${config.name}: story prologue must be explicit on landing`, errors);
    await page.locator('#playBtn').click();
    assert(await page.locator('#intro').isVisible(), `${config.name}: New Journey should open the story introduction`, errors);
    assert(await page.locator('#introTitle').textContent() === 'There were no heroes.', `${config.name}: intro should explain the premise`, errors);
    await page.locator('#introNext').click();
    await page.locator('#introNext').click();
    await page.locator('#introNext').click();
    assert(await page.locator('#threadSelect').isVisible(), `${config.name}: Intro must lead to Location Choice`, errors);
    await page.locator('#threadStartBtn').click();
    
    await page.locator('#eraIntro').waitFor({ state: 'visible', timeout: 5000 });
    assert(await page.locator('#eraIntroTitle').textContent() === 'The Primordial Ocean', `${config.name}: prologue should begin before the First Cell`, errors);
    await page.locator('#eraIntroGo').click();
    await page.waitForTimeout(500);
    assert(await page.locator('#civPanel').isHidden(), `${config.name}: origin HUD should stay focused`);
    assert(await page.locator('#objectiveTitle').textContent() === '✦ Create The First Life', `${config.name}: prologue should have one clear goal`);
    assert(await page.locator('#discoveryPanel').isHidden(), `${config.name}: natural terrain must not create discoveries`);

    await page.keyboard.press('m');
    assert(await page.locator('#codexPanel').isVisible(), `${config.name}: map should open visibly`);
    await page.keyboard.press('Escape');
    assert(await page.locator('#codexPanel').isHidden(), `${config.name}: Escape should close the map`);
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

function assert(value, message, errors = []) {
  if (!value) {
    if (errors.length) console.error('Page errors:', errors);
    throw new Error(message);
  }
}
