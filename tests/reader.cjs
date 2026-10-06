const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {chromium} = require('playwright');

const root = path.resolve(__dirname, '..');
const server = require('./server.cjs').createServer();

async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch(process.env.EWAM_BROWSER_PATH ? {executablePath:process.env.EWAM_BROWSER_PATH} : {});
  const page = await browser.newPage({viewport:{width:390, height:844}});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const url = 'http://127.0.0.1:' + server.address().port;
  fs.mkdirSync(path.join(root, 'test-results'), {recursive:true});
  try {
    await page.goto(url);
    await page.evaluate(() => document.fonts.ready);
    await page.getByRole('button', {name:'Enter — Ewam Collection', exact:true}).click();
    await page.getByRole('button', {name:'Proceed to the Text', exact:true}).click();
    assert.equal(await page.locator('.reader-toolbar .bar-btn:visible').count(), 9);
    assert.deepEqual(await page.locator('.tab-syllable').allTextContents(), ['ཨེ','ཝཾ']);

    // The title return is progressive in the original scrolling reader too.
    await page.evaluate(() => jumpToSection(3));
    await page.waitForFunction(() => parkFrame === 0 && Math.abs(document.getElementById('section-3').getBoundingClientRect().top - readerLine()) < 2);
    await page.evaluate(() => {cancelPark(); window.scrollBy(0, 200);});
    await page.locator('#scrollTopBtn').click();
    await page.waitForFunction(() => parkFrame === 0 && Math.abs(document.getElementById('section-3').getBoundingClientRect().top - readerLine()) < 2);
    await page.locator('#scrollTopBtn').click();
    await page.waitForFunction(() => parkFrame === 0 && Math.abs(document.getElementById('section-2').getBoundingClientRect().top - readerLine()) < 2);
    const scrollAnchor = await page.evaluate(() => {
      const anchor = captureReadingAnchor();
      window.testAnchor = anchor;
      return anchor.block.id;
    });
    await page.locator('#btnPage').click();
    assert.equal(await page.locator('#btnPage').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.evaluate(() => readingPage.section), 2);
    assert.equal(await page.evaluate(() => testAnchor.block.id), scrollAnchor);
    assert.equal(await page.evaluate(() => isAutoScrolling || isTiltScrolling), false);
    assert.equal(await page.locator('#btnPlay').isDisabled(), true);

    // Every rendered line fragment, including offscreen columns, must fit vertically.
    // Sample front matter, long paragraphs, source images, and end matter in both volumes.
    const layouts = [
      {width:390,height:844,font:16}, {width:320,height:568,font:16},
      {width:844,height:390,font:16}, {width:1280,height:800,font:16},
      {width:390,height:844,font:40}, {width:568,height:320,font:40}
    ];
    let fragments = 0;
    for (const layout of layouts) {
      await page.setViewportSize({width:layout.width, height:layout.height});
      const report = await page.evaluate(({font}) => {
        state.fontSize = font;
        applyFontSize();
        const failures = [];
        let lines = 0;
        for (const tab of ['E','WAM']) {
          switchTab(tab);
          const sections = TABS_DATA[tab];
          const longest = sections.reduce((best, section, i) => section.blocks.length > sections[best].blocks.length ? i : best, 0);
          const art = sections.findIndex(section => section.blocks.some(block => block.runs.some(run => run.image)));
          for (const index of new Set([0,1,longest,Math.max(0,art),sections.length - 1])) {
            readingPage.section = index;
            readingPage.index = 0;
            layoutReadingPage();
            const area = document.getElementById('contentArea').getBoundingClientRect();
            const section = trackedSectionNodes[index];
            const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT);
            let node;
            while ((node = walker.nextNode())) {
              if (!node.textContent.trim()) continue;
              const range = document.createRange();
              range.selectNodeContents(node);
              for (const rect of range.getClientRects()) {
                if (!rect.width || !rect.height) continue;
                lines++;
                if (rect.top < area.top - 1 || rect.bottom > area.bottom + 1) {
                  failures.push({tab,index,bid:node.parentElement.closest('.block')?.id,top:rect.top-area.top,bottom:rect.bottom-area.bottom});
                }
              }
            }
            for (const img of section.querySelectorAll('img')) {
              const rect = img.getBoundingClientRect();
              if (rect.top < area.top - 1 || rect.bottom > area.bottom + 1) failures.push({tab,index,image:true});
            }
          }
        }
        const buttons = Array.from(document.querySelectorAll('.reader-toolbar .bar-btn')).map(button => button.getBoundingClientRect());
        const widths = buttons.map(rect => rect.width);
        if (Math.max(...widths) - Math.min(...widths) > 1 || buttons.some(rect => rect.left < 0 || rect.right > innerWidth)) failures.push({toolbar:true});
        const style = getComputedStyle(document.querySelector('.block'));
        if (style.animationName !== 'none' || style.transitionDuration !== '0s') failures.push({motion:true});
        return {failures:failures.slice(0,8),lines};
      }, layout);
      assert.deepEqual(report.failures, [], JSON.stringify(layout));
      fragments += report.lines;
      console.log('Line boundaries:', layout, report.lines, 'fragments');
    }

    await page.setViewportSize({width:390,height:844});
    await page.evaluate(() => {state.fontSize=16; applyFontSize(); switchTab('E');});
    await page.locator('#btnNextPage').click();
    assert.equal(await page.evaluate(() => readingPage.index), 1);
    await page.locator('#btnPreviousPage').click();
    assert.equal(await page.evaluate(() => readingPage.index), 0);
    assert.equal(await page.locator('#btnPreviousPage').isDisabled(), true);
    await page.locator('#btnPage').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => readingPage.index), 1);
    await page.mouse.click(370,250);
    assert.equal(await page.evaluate(() => readingPage.index), 2);
    await page.mouse.click(20,250);
    assert.equal(await page.evaluate(() => readingPage.index), 1);

    // Reflow keeps the visible character on the new page, including landscape/fullscreen.
    await page.evaluate(() => {window.testAnchor = captureReadingAnchor();});
    const anchorVisible = () => page.evaluate(() => {
      const rect = testAnchor.range.getBoundingClientRect();
      const area = document.getElementById('contentArea').getBoundingClientRect();
      return rect.left >= area.left - 1 && rect.right <= area.right + 1 && rect.top >= area.top - 1 && rect.bottom <= area.bottom + 1;
    });
    await page.locator('[onclick="changeFontSize(1)"]').click();
    assert.equal(await anchorVisible(), true, 'zoom anchor');
    await page.evaluate(() => {window.testAnchor = captureReadingAnchor();});
    await page.setViewportSize({width:844,height:390});
    await page.waitForFunction(() => pageLayoutFrame === 0);
    assert.equal(await anchorVisible(), true, 'landscape anchor');
    await page.screenshot({path:path.join(root,'test-results/landscape.png')});
    await page.evaluate(() => {window.testAnchor = captureReadingAnchor();});
    await page.locator('#btnFS').click();
    assert.equal(await page.locator('.reader-toolbar .bar-btn:visible').count(), 1);
    assert.equal(await page.locator('#pageNavigation').isVisible(), false);
    assert.equal(await page.locator('#scrollTopBtn').isVisible(), false);
    assert.equal(await anchorVisible(), true, 'fullscreen anchor');
    await page.mouse.click(820,150);
    assert.equal(await page.evaluate(() => readingPage.index > 0), true);
    await page.locator('#btnFS').click();
    assert.equal(await page.locator('.reader-toolbar .bar-btn:visible').count(), 9);
    await page.setViewportSize({width:390,height:844});
    await page.waitForFunction(() => pageLayoutFrame === 0);
    await page.screenshot({path:path.join(root,'test-results/portrait.png')});

    // Cross-title navigation is reversible, and the up button goes back one title.
    await page.evaluate(() => {readingPage.section=2; readingPage.index=0; layoutReadingPage(); turnReadingPage(-1);});
    assert.equal(await page.evaluate(() => readingPage.section), 1);
    assert.equal(await page.evaluate(() => readingPage.index === readingPage.count - 1), true);
    await page.locator('#btnNextPage').click();
    assert.equal(await page.evaluate(() => readingPage.section), 2);
    await page.evaluate(() => {turnReadingPage(1); scrollToTop();});
    assert.equal(await page.evaluate(() => readingPage.section), 2);
    assert.equal(await page.evaluate(() => readingPage.index), 0);
    await page.locator('#scrollTopBtn').click();
    assert.equal(await page.evaluate(() => readingPage.section), 1);

    // Source links, index, and search all use the same page-aware destination route.
    await page.evaluate(() => jumpToSource('WAM', TABS_DATA.WAM[2].blocks[3].id));
    await page.waitForFunction(() => state.activeTab === 'WAM' && readingPage.section === 2);
    await page.locator('[data-tab="INDEX"]').click();
    await page.waitForFunction(() => document.querySelectorAll('.index-item[aria-current="location"]').length === 1);
    assert.equal(await page.locator('.index-item[aria-current="location"]').count(), 1);
    await page.locator('.index-item[data-index-tab="E"]').nth(2).click();
    await page.waitForFunction(() => state.activeTab === 'E');
    await page.locator('#readerSearch').fill('བླ་མ');
    await page.waitForFunction(() => searchResults.some(result => result.tab === 'WAM'));
    await page.locator('.search-result').filter({has:page.locator('.search-result-volume', {hasText:'Wam'})}).first().click();
    await page.waitForFunction(() => state.activeTab === 'WAM' && document.getElementById('searchPanel').hidden);
    assert.equal(await page.evaluate(() => readingPage.anchor.block.closest('.section-block').classList.contains('page-section')), true);
    await page.locator('#btnPage').click();
    assert.equal(await page.evaluate(() => state.readingMode), 'scroll');
    assert.equal(await page.locator('.page-section').count(), 0);
    await page.locator('#btnPage').click();
    await page.reload();
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('#btnPage').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#pageNavigation').isVisible(), true);
    assert.deepEqual(errors, []);
    console.log('PASS:', fragments, 'line fragments; mode persistence, toolbar, title navigation, page turns, zoom, rotation, fullscreen, index and search.');
  } catch (error) {
    console.error('Reader state:', await page.evaluate(() => ({
      mode:state.readingMode, scroll:scrollY, line:readerLine(),
      sections:trackedSectionNodes.slice(0,5).map(node => ({id:node.id,top:node.getBoundingClientRect().top})),
      page:{section:readingPage.section,index:readingPage.index,count:readingPage.count}
    })));
    await page.screenshot({path:path.join(root,'test-results/failure.png')});
    throw error;
  } finally {
    await browser.close();
    server.close();
  }
}
main().catch(error => {console.error(error); server.close(); process.exitCode=1;});
