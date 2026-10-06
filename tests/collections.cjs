const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const {createServer} = require('./server.cjs');
const root = path.resolve(__dirname, '..');
const server = createServer();

async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port + '/Ewam/';
  const browser = await chromium.launch(process.env.EWAM_BROWSER_PATH ? {executablePath:process.env.EWAM_BROWSER_PATH} : {});
  const context = await browser.newContext({viewport:{width:390,height:844}});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  fs.mkdirSync(path.join(root, 'test-results'), {recursive:true});
  const settled = () => page.waitForFunction(() => readerReady && !restoringPosition && parkFrame === 0);
  // Check the saved source character, rather than pixel scrollY, after reflow.
  const savedCharacterVisible = collection => page.evaluate(collection => {
    const saved = state.positions[collection];
    const block = saved && document.getElementById(saved.bid);
    const root = block?.querySelector('.tib');
    if (!root) return false;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let offset = saved.offset, node;
    while ((node = walker.nextNode())) {
      if (offset < node.length) {
        const rect = characterRange(node, offset).getBoundingClientRect();
        const area = document.getElementById('contentArea').getBoundingClientRect();
        return rect.right > 0 && rect.left < innerWidth && rect.bottom > (state.readingMode === 'pages' ? area.top : readerLine()) && rect.top < innerHeight;
      }
      offset -= node.length;
    }
    return false;
  }, collection);
  try {
    await page.goto(url);
    await settled();
    await page.getByRole('button', {name:'Enter — Ewam Collection', exact:true}).click();
    await page.locator('#welcomeCard').getByRole('button', {name:'Prayer Collection', exact:true}).click();
    await page.waitForFunction(() => state.activeTab === 'PRAYERS' && !welcomeOpen);
    assert.equal(await page.locator('#prayer-title').innerText(), await page.evaluate(() => PRAYER_TITLE));
    assert.equal(await page.locator('.index-chapter').count(), 12);
    assert.equal(await page.locator('.index-item').count(), 159);
    assert.equal(await page.locator('#contentArea .block').count(), 359);
    assert.equal(await page.evaluate(() => TABS_DATA.PRAYERS[0].blocks[1].id), 'prayer-p0206');
    assert.equal(await page.locator('.header-title').innerText(), 'Prayer Collection');
    assert.equal(await page.locator('[data-tab="E"]').isVisible(), false);
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#prayer-p0208 .tib')).fontFamily), 'Jomolhari, serif');

    // Scroll positions are independently retained across both switchers.
    await page.evaluate(() => jumpToSection(3));
    await settled();
    await page.evaluate(() => window.scrollBy(0,180));
    await page.waitForFunction(() => scrollY > 100);
    await page.evaluate(() => rememberPosition());
    const prayerBid = await page.evaluate(() => state.positions.PRAYERS.bid);
    await page.locator('#collectionBtn').click();
    await page.locator('#collectionMenu [data-collection="EWAM"]').click();
    await settled();
    assert.equal(await page.evaluate(() => state.collection), 'EWAM');
    await page.evaluate(() => jumpToSource('WAM', TABS_DATA.WAM[2].blocks[3].id));
    await settled();
    await page.evaluate(() => rememberPosition());
    const ewamBid = await page.evaluate(() => state.positions.EWAM.bid);
    await page.locator('[data-tab="INDEX"]').click();
    await page.locator('#indexList [data-collection="PRAYERS"]').click();
    await settled();
    assert.equal(await page.evaluate(() => state.positions.PRAYERS.bid), prayerBid);
    assert.equal(await savedCharacterVisible('PRAYERS'), true, 'prayer scroll bookmark');
    await page.locator('[data-tab="INDEX"]').click();
    await page.reload();
    await settled();
    assert.equal(await page.locator('#ykLoader').count(), 0, 'returning readers bypass opening artwork');
    assert.equal(await page.locator('#welcomeCard').evaluate(el => el.classList.contains('open')), false);
    assert.equal(await page.evaluate(() => state.activeTab), 'PRAYERS');
    assert.equal(await savedCharacterVisible('PRAYERS'), true, 'prayer scroll bookmark after reload');
    await page.locator('#collectionBtn').click();
    await page.locator('#collectionMenu [data-collection="EWAM"]').click();
    await settled();
    assert.equal(await page.evaluate(() => state.activeTab), 'WAM');
    assert.equal(await page.evaluate(() => state.positions.EWAM.bid), ewamBid);
    assert.equal(await savedCharacterVisible('EWAM'), true, 'Wam scroll bookmark');

    // Keyboard picker, page positions, layout changes, and source search.
    await page.locator('#collectionBtn').click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await settled();
    assert.equal(await page.evaluate(() => state.collection), 'PRAYERS');
    await page.locator('#btnPage').click();
    await page.evaluate(() => {readingPage.section=7; readingPage.index=0; layoutReadingPage(); turnReadingPage(1); rememberPosition();});
    const pageBookmark = await page.evaluate(() => ({...state.positions.PRAYERS}));
    await page.reload();
    await settled();
    assert.equal(await savedCharacterVisible('PRAYERS'), true, 'page bookmark after reload');
    assert.equal(await page.evaluate(() => state.positions.PRAYERS.bid), pageBookmark.bid);
    await page.locator('#readerSearch').fill('བླ་མ');
    await page.waitForFunction(() => searchResults.length > 0);
    assert.equal(await page.evaluate(() => searchResults.every(result => result.tab === 'PRAYERS')), true);
    await page.locator('.search-result').first().click();
    await settled();

    for (const viewport of [{width:320,height:568},{width:390,height:844},{width:844,height:390},{width:1280,height:800}]) {
      await page.setViewportSize(viewport);
      await page.waitForFunction(() => pageLayoutFrame === 0);
      const report = await page.evaluate(() => {
        const failures = [];
        for (const font of [16,40]) {
          state.fontSize = font; applyFontSize();
          const longest = TABS_DATA.PRAYERS.reduce((best, section, i, all) => section.blocks.reduce((n,b) => n+b.tibetan.length,0) > all[best].blocks.reduce((n,b) => n+b.tibetan.length,0) ? i : best, 0);
          for (const index of new Set([0,1,longest,TABS_DATA.PRAYERS.length-1])) {
            readingPage.section=index; readingPage.index=0; layoutReadingPage();
            const area = document.getElementById('contentArea').getBoundingClientRect();
            const walker = document.createTreeWalker(trackedSectionNodes[index], NodeFilter.SHOW_TEXT);
            let node;
            while ((node = walker.nextNode())) {
              const range = document.createRange(); range.selectNodeContents(node);
              for (const rect of range.getClientRects()) {
                if (rect.width && rect.height && (rect.top < area.top-1 || rect.bottom > area.bottom+1)) failures.push({font,index,top:rect.top-area.top,bottom:rect.bottom-area.bottom});
              }
            }
          }
        }
        return {failures:failures.slice(0,5), overflow:document.documentElement.scrollWidth > innerWidth};
      });
      assert.deepEqual(report.failures, [], JSON.stringify(viewport));
      assert.equal(report.overflow, false, 'horizontal overflow: ' + JSON.stringify(viewport));
    }
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(() => {state.fontSize=16; applyFontSize(); readingPage.section=1; readingPage.index=0; layoutReadingPage(); rememberPosition();});
    await page.screenshot({path:path.join(root,'test-results/prayers-portrait.png')});
    await page.locator('[data-tab="INDEX"]').click();
    await page.screenshot({path:path.join(root,'test-results/prayers-index.png')});
    await page.locator('[data-tab="INDEX"]').click();

    // First install precaches even the collection not selected by the reader.
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await page.waitForFunction(() => document.getElementById('offlineStatus').textContent.includes('available offline'));
    const cached = await page.evaluate(async () => {
      const key = (await caches.keys()).find(key => key.startsWith('ewam-reader:'));
      return (await (await caches.open(key)).keys()).map(request => new URL(request.url).pathname);
    });
    assert.equal(cached.some(file => file.endsWith('/content/ewam.js')), true);
    assert.equal(cached.some(file => file.endsWith('/content/prayers.js')), true);
    assert.equal(cached.some(file => file.includes('Jomolhari')), true);
    const manifest = await page.evaluate(async () => (await fetch('manifest.webmanifest')).json());
    assert.equal(manifest.start_url, './');
    assert.equal(manifest.scope, './');
    assert.equal(manifest.display, 'standalone');
    await context.setOffline(true);
    await page.reload();
    await settled();
    assert.equal(await page.evaluate(() => state.activeTab), 'PRAYERS');
    await page.locator('#collectionBtn').click();
    await page.locator('#collectionMenu [data-collection="EWAM"]').click();
    await settled();
    assert.equal(await page.locator('#contentArea .block').count() > 2000, true);
    await page.reload();
    await settled();
    assert.equal(await page.evaluate(() => state.activeTab), 'WAM');
    assert.equal(await page.evaluate(() => document.fonts.check('24px Jomolhari')), true);
    assert.deepEqual(errors, []);
    console.log('PASS: first-launch choice, both switchers, source import, independent scroll/page bookmarks, reopening, keyboard, search, mobile/landscape layouts, and both collections offline at a project URL.');
  } catch (error) {
    console.error('Collection state:', await page.evaluate(() => ({state, restoringPosition, parkFrame, readerReady})).catch(() => null));
    await page.screenshot({path:path.join(root,'test-results/collections-failure.png')});
    throw error;
  } finally { await browser.close(); server.close(); }
}
main().catch(error => {console.error(error); server.close(); process.exitCode=1;});
