import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', error => {
    errors.push(error.message);
  });
  
  await page.goto('https://joaoccaldas.github.io/blockscreate/');
  await page.waitForTimeout(2000);
  
  if (errors.length > 0) {
    console.error('LIVE ERRORS:', errors);
  } else {
    console.log('No live errors detected.');
  }
  await browser.close();
})();
