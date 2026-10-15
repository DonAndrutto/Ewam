const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const {createServer} = require('./server.cjs');

async function main() {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch(process.env.EWAM_BROWSER_PATH ? {executablePath:process.env.EWAM_BROWSER_PATH} : {});
  const page = await browser.newPage({viewport:{width:390,height:844}});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  fs.mkdirSync(path.join(__dirname,'../test-results'), {recursive:true});
  const settled = () => page.waitForFunction(() => readerReady && !restoringPosition && parkFrame === 0);
  try {
    await page.goto('http://127.0.0.1:'+server.address().port+'/Ewam/');
    await settled();
    await page.getByRole('button',{name:'Enter — Ewam Collection',exact:true}).click();
    await page.getByRole('button',{name:'Proceed to the Text',exact:true}).click();
    for (const collection of ['EWAM','PRAYERS']) {
      await page.evaluate(collection => switchCollection(collection), collection);
      await settled();
      for (const mode of ['scroll','pages']) {
        await page.evaluate(mode => {if (state.readingMode!==mode) toggleReadingMode();}, mode);
        await settled();
        await page.evaluate(() => jumpToSection(3));
        await settled();
        await page.waitForTimeout(250); // Let the title-return button finish appearing.
        await page.getByRole('button',{name:'Help',exact:true}).click();
        for (const viewport of [{width:320,height:568},{width:390,height:844},{width:568,height:320},{width:844,height:390},{width:1280,height:800}]) {
          await page.setViewportSize(viewport);
          await page.waitForFunction(() => document.getElementById('helpWires').viewBox.baseVal.width === innerWidth &&
            document.getElementById('helpWires').viewBox.baseVal.height === innerHeight &&
            pageLayoutFrame === 0 && helpLayoutFrame === 0 && parkFrame === 0 && !restoringPosition);
          const failures = await page.evaluate(() => {
            const failures = [];
            const overlaps = (a,b) => a.left<b.right-0.1 && a.right>b.left+0.1 && a.top<b.bottom-0.1 && a.bottom>b.top+0.1;
            const visible = el => {
              const r=el.getBoundingClientRect(), style=getComputedStyle(el);
              return r.width>0 && r.height>0 && style.visibility!=='hidden' && Number(style.opacity)>0.05 && r.bottom>0 && r.top<innerHeight;
            };
            const controls = [...document.querySelectorAll('#stickyStack button, #readerSearch, #scrollTopBtn, .reader-toolbar .bar-btn, #pageNavigation')].filter(visible);
            const iconBounds = icon => {
              const box=icon.getBBox(), matrix=icon.getScreenCTM();
              const a=new DOMPoint(box.x,box.y).matrixTransform(matrix);
              const b=new DOMPoint(box.x+box.width,box.y+box.height).matrixTransform(matrix);
              return {left:a.x,top:a.y,right:b.x,bottom:b.y};
            };
            const titleReturn=document.getElementById('scrollTopBtn'), pageNavigation=document.getElementById('pageNavigation');
            if (visible(titleReturn) && visible(pageNavigation) && overlaps(titleReturn.getBoundingClientRect(),pageNavigation.getBoundingClientRect())) {
              failures.push('Title-return button overlaps page navigation');
            }
            const controlBounds = control => {
              if (control.matches('.tab-btn')) {
                const range=document.createRange(); range.selectNodeContents(control);
                return range.getBoundingClientRect();
              }
              const icon=[...control.querySelectorAll('svg')].find(visible);
              return control.matches('.bar-btn,#scrollTopBtn') && icon ? iconBounds(icon) : control.getBoundingClientRect();
            };
            const labels = [...document.querySelectorAll('.help-label')];
            const rects = labels.map(el=>el.getBoundingClientRect());
            for (const [i,label] of labels.entries()) {
              const r=rects[i], name=label.textContent;
              if (r.left<0 || r.right>innerWidth || r.top<0 || r.bottom>innerHeight) failures.push(name+': outside viewport');
              for (let j=0;j<i;j++) if (overlaps(r,rects[j])) failures.push(name+': overlaps '+labels[j].textContent);
              for (const control of controls) if (overlaps(r,control.getBoundingClientRect())) failures.push(name+': overlaps control '+control.id);
              const target=document.querySelector(label.dataset.helpTarget);
              const wire=[...document.querySelectorAll('.help-wire')].find(el=>el.dataset.helpTarget===label.dataset.helpTarget);
              const points=wire?.getAttribute('points').trim().split(/\s+/).filter(Boolean).map(p=>{const [x,y]=p.split(',').map(Number);return {x,y};}) || [];
              if (points.length<2) {failures.push(name+': missing connector');continue;}
              const icon=[...target.querySelectorAll('svg')].find(visible);
              const targetRect=target.matches('.bar-btn,#scrollTopBtn') && icon ? iconBounds(icon) : target.getBoundingClientRect();
              const end=points[points.length-1];
              const distance=Math.hypot(Math.max(targetRect.left-end.x,0,end.x-targetRect.right),Math.max(targetRect.top-end.y,0,end.y-targetRect.bottom));
              if (distance>3.1) failures.push(name+': connector stops '+distance+'px from control '+JSON.stringify({end,rect:targetRect}));
              for (let j=1;j<points.length;j++) {
                const a=points[j-1],b=points[j];
                const crosses=r=>a.y===b.y
                  ? a.y>r.top+0.1 && a.y<r.bottom-0.1 && Math.max(a.x,b.x)>r.left+0.1 && Math.min(a.x,b.x)<r.right-0.1
                  : a.x>r.left+0.1 && a.x<r.right-0.1 && Math.max(a.y,b.y)>r.top+0.1 && Math.min(a.y,b.y)<r.bottom-0.1;
                if (a.x!==b.x && a.y!==b.y) failures.push(name+': diagonal connector');
                if (rects.some(crosses)) failures.push(name+': connector crosses a label');
                if (controls.some(control=>control!==target && crosses(controlBounds(control)))) failures.push(name+': connector crosses another control');
              }
            }
            const hint=document.getElementById('helpHint');
            if (visible(hint) && rects.some(r=>overlaps(r,hint.getBoundingClientRect()))) failures.push('Dismiss hint overlaps a label');
            return failures;
          });
          assert.deepEqual(failures,[],JSON.stringify({collection,mode,...viewport}));
          if (collection==='EWAM' && mode==='scroll' && [390,568].includes(viewport.width)) {
            await page.screenshot({path:path.join(__dirname,'../test-results/help-'+viewport.width+'x'+viewport.height+'.png')});
          }
        }
        const before=await page.evaluate(()=>({x:scrollX,y:scrollY}));
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#helpOverlay').isVisible(),false);
        assert.equal(await page.locator('#helpBtn').getAttribute('aria-expanded'),'false');
        assert.deepEqual(await page.evaluate(()=>({x:scrollX,y:scrollY})),before);
        await page.getByRole('button',{name:'Help',exact:true}).click();
        await page.getByRole('button',{name:'Tap anywhere to close',exact:true}).click();
        assert.equal(await page.locator('#helpOverlay').isVisible(),false);
      }
    }
    assert.deepEqual(errors,[]);
    console.log('PASS: Help labels stay clear of controls and each other; connectors reach icons within 3px without crossing labels or other controls across both collections, reading modes, phone, landscape and desktop; dismissal preserves position.');
  } finally {
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
