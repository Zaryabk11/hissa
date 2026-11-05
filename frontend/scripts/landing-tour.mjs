import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../public/landing-site');
let server;
let origin;

async function serve() {
  if (origin) return origin;
  server = createServer(async (req, res) => {
    if (req.url === '/host') {
      res.setHeader('Content-Type', 'text/html');
      res.end('<script>window.__msgs=[];addEventListener("message",e=>__msgs.push(e.data))</script><iframe title="Hissa" src="/index.html" style="width:100%;height:100vh;border:0"></iframe>');
      return;
    }
    const path = join(root, decodeURIComponent(req.url?.split('?')[0] || '/index.html'));
    if (!path.startsWith(root) || path === root) { res.writeHead(404).end(); return; }
    try {
      const data = await readFile(path);
      res.setHeader('Content-Type', { '.html': 'text/html', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.jpg': 'image/jpeg' }[extname(path)] || 'application/octet-stream');
      res.end(data);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  return origin;
}

export async function open(browser, { w = 1280, h = 800, rm = true, js = true, embed = false } = {}) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: rm ? 'reduce' : 'no-preference', javaScriptEnabled: js });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${await serve()}/${embed ? 'host' : 'index.html'}`, { waitUntil: 'domcontentloaded' });
  if (js) {
    const document = embed ? page.frameLocator('iframe') : page;
    await document.locator('html:not(.ld)').waitFor({ timeout: 12500 });
    if (errors.length) throw new Error(errors.join('\n'));
  }
  page.pageErrors = errors;
  return page;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const require = createRequire(import.meta.url);
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ headless: true, channel: 'chromium' });
  try {
    const page = await open(browser, { embed: true });
    const frame = page.frameLocator('iframe');
    const links = ['#nav-cta', '.hs-copy .cta', '#get'];
    for (const selector of links) {
      await page.evaluate(() => { window.__msgs.length = 0; });
      await frame.locator(selector).evaluate(link => link.click());
      const messages = await page.evaluate(() => window.__msgs);
      if (messages.length !== 1 || messages[0] !== 'hissa:explore') throw new Error(`${selector}: ${JSON.stringify(messages)}`);
    }
    for (const selector of ['.pill a', '.ft-links a[href]', '.ft-links a[aria-disabled]']) {
      await page.evaluate(() => { window.__msgs.length = 0; });
      await frame.locator(selector).first().evaluate(link => link.click());
      if (await page.evaluate(() => window.__msgs.length)) throw new Error(`${selector} posted a host message`);
    }
    if (page.pageErrors.length) throw new Error(page.pageErrors.join('\n'));
    await page.context().close();
    const noJs = await open(browser, { js: false });
    const text = await noJs.locator('body').innerText();
    if (!text.includes('One more roti is fine.') || !text.includes('Fair questions')) throw new Error('No-JS copy is hidden');
    await noJs.context().close();
    process.stdout.write('PASS iframe CTAs and unrelated links; PASS no-JS copy\n');
  } finally {
    await browser.close();
    server?.close();
  }
}
