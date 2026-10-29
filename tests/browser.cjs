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
<h2 id="hero">Музей «Пам’ять єврейського народу та Голокост в <span>Україні»</span></h2>
<p id="footer">Пн - Пт з <span>10:00 до 18:00</span></p>
<p id="year">Нові надходження (жовтень 2026 р.)</p>
<p id="split-year">2026 <em>р.</em></p>
<p id="boundary">на</p><p id="boundary-next">сайті</p>
<p id="br">з <br>10:00</p>
<p id="dynamic">текст</p><div id="ajax"></div></body></html>`);
  await page.evaluate(() => { window.Joomla = { getOptions: () => ({mode:'all',uk:'в, з, на, до, та',ru:'в, на, и, о',abbr:'г.',numberAbbr:'р., рр., г., гг.'}) }; });
  await page.evaluate(() => {
   window.originalSpan = document.querySelector('#hero span');
   window.spanClicks = 0;
   window.originalSpan.addEventListener('click', () => { window.spanClicks++; });
  });
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
  assert.equal(await text('#hero'), 'Музей «Пам’ять єврейського народу та\u00a0Голокост в\u00a0Україні»');
  assert.equal(await text('#footer'), 'Пн - Пт з\u00a010:00 до\u00a018:00');
  assert.equal(await text('#year'), 'Нові надходження (жовтень 2026\u00a0р.)');
  assert.equal(await text('#split-year'), '2026\u00a0р.');
  assert.equal(await text('#boundary'), 'на');
  assert.equal(await text('#boundary-next'), 'сайті');
  assert.equal(await text('#br'), 'з 10:00');
  assert.equal(await page.locator('#hero span').count(), 1);
  assert.equal(await page.evaluate(() => window.originalSpan === document.querySelector('#hero span')), true);
  await page.locator('#hero span').click();
  assert.equal(await page.evaluate(() => window.spanClicks), 1);
  // Browser layout must keep the preposition and following word on the same line.
  for (const width of [240, 400, 800]) {
   await page.locator('#hero').evaluate((element, width) => { element.style.width = width + 'px'; }, width);
   assert.equal(await page.locator('#hero').evaluate(element => {
    const first = element.firstChild;
    const index = first.nodeValue.lastIndexOf('в');
    const a = document.createRange(); a.setStart(first, index); a.setEnd(first, index + 1);
    const second = element.querySelector('span').firstChild;
    const b = document.createRange(); b.setStart(second, 0); b.setEnd(second, 1);
    return Math.abs(a.getBoundingClientRect().top - b.getBoundingClientRect().top) < 1;
   }), true, 'preposition wraps at width ' + width);
  }
  await page.evaluate(() => { document.querySelector('#footer span').firstChild.nodeValue = '11:00 до 19:00'; });
  await page.waitForFunction(() => document.querySelector('#footer').textContent === 'Пн - Пт з\u00a011:00 до\u00a019:00');
  // Observer must settle after its own replacements and keep existing NBSP stable.
  await page.waitForTimeout(100);
  assert.equal(await text('#text'), 'Мы в\u00a0доме и\u00a0на\u00a0улице');
  assert.deepEqual(errors, []);
  const disabled = await browser.newPage();
  await disabled.setContent('<html lang="uk"><body><p>2026 р.</p></body></html>');
  await disabled.evaluate(() => { window.Joomla = {getOptions: () => ({mode:'uk',uk:'',abbr:'',numberAbbr:''})}; });
  await disabled.addScriptTag({path: path.resolve(__dirname, '../media/js/nobreaktitles.js')});
  assert.equal(await disabled.locator('p').textContent(), '2026 р.');
  console.log('PASS: existing checks; Ukrainian heading and schedule across inline tags; year suffix; block/br boundaries; preserved DOM identity/listeners; wrapping at 240/400/800px; disabled rules');
 } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
