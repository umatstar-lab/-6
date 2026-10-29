const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
 const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
 try {
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.setContent(`<html lang="ru"><body>
<h1>В доме</h1><article><p id="text">Мы в доме и на улице</p></article>
<aside><span id="module">На сайте</span></aside><a href="/в доме" title="на сайте">О сайте</a>
<textarea>На сайте</textarea><input value="В доме"><select><option>На сайте</option></select>
<div contenteditable="true"><b>На сайте</b></div><pre><span>На сайте</span></pre>
<div data-nobreaktitles="off"><span>На сайте</span></div>
<script type="application/json" id="data">{"text":"На сайте"}</script><style>/* На сайте */</style>
<p id="dynamic">текст</p><div id="ajax"></div></body></html>`);
  await page.evaluate(() => { window.Joomla = { getOptions: () => ({mode:'ru',ru:'в, на, и, о',abbr:'г.'}) }; });
  await page.addScriptTag({ path: path.resolve(__dirname, '../media/js/nobreaktitles.js') });
  const text = sel => page.locator(sel).textContent();
  assert.equal(await text('h1'), 'В\u00a0доме');
  assert.equal(await text('#text'), 'Мы в\u00a0доме и\u00a0на\u00a0улице');
  assert.equal(await text('#module'), 'На\u00a0сайте');
  assert.equal(await text('a'), 'О\u00a0сайте');
  assert.equal(await page.locator('a').getAttribute('href'), '/в доме');
  assert.equal(await page.locator('a').getAttribute('title'), 'на сайте');
  for (const sel of ['textarea','option','[contenteditable]','pre','[data-nobreaktitles]']) assert.equal(await text(sel), 'На сайте');
  assert.equal(await page.locator('input').inputValue(), 'В доме');
  assert.equal(await text('#data'), '{"text":"На сайте"}');
  await page.evaluate(() => {
   document.querySelector('#dynamic').firstChild.nodeValue = 'На сайте';
   document.querySelector('#ajax').innerHTML = '<section><p>В доме</p><code>На сайте</code></section>';
  });
  await page.waitForFunction(() => document.querySelector('#dynamic').textContent === 'На\u00a0сайте' && document.querySelector('#ajax p').textContent === 'В\u00a0доме');
  assert.equal(await text('#ajax code'), 'На сайте');
  // Observer must settle after its own replacements and keep existing NBSP stable.
  await page.waitForTimeout(100);
  assert.equal(await text('#text'), 'Мы в\u00a0доме и\u00a0на\u00a0улице');
  assert.deepEqual(errors, []);
  console.log('PASS: headings, articles, modules, links, exclusions, AJAX, characterData, idempotence; no browser errors');
 } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
