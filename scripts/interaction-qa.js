async page => {
 const failures=[];let checks=0;const check=(ok,label)=>{checks++;if(!ok)failures.push(label)};
 await page.goto('http://127.0.0.1:5173');await page.setViewportSize({width:1440,height:1000});
 const frames=page.locator('.sheet-grid .gallery-frame');
 for(let i=0;i<6;i++) {
  const f=frames.nth(i);await f.scrollIntoViewIfNeeded();const b=await f.boundingBox();
  await page.mouse.move(b.x+12,b.y+12);await page.waitForTimeout(40);
  const a=await f.getAttribute('style');
  await f.screenshot({path:`output/playwright/hardening/light-${i}-left.png`});
  await page.mouse.move(b.x+b.width-12,b.y+b.height-12);await page.waitForTimeout(40);
  const z=await f.getAttribute('style');
  await f.screenshot({path:`output/playwright/hardening/light-${i}-right.png`});
  check(a!==z&&a.includes('--light-x'),`responds ${i}`);
  check(JSON.stringify(b)===JSON.stringify(await f.boundingBox()),`stationary ${i}`);
  await page.mouse.move(0,0);check(!(await f.getAttribute('style'))?.includes('--light'),`leave ${i}`);
  await page.mouse.move(b.x+12,b.y+12);await page.waitForTimeout(40);
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(40);
  check(!(await f.getAttribute('style'))?.includes('--light'),`dynamic reduced reset ${i}`);
  await page.mouse.move(b.x+25,b.y+25);await page.waitForTimeout(40);
  check(!(await f.getAttribute('style'))?.includes('--light'),`reduced static ${i}`);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await f.dispatchEvent('pointermove',{pointerType:'touch',clientX:b.x+10,clientY:b.y+10});await page.waitForTimeout(40);
  check(!(await f.getAttribute('style'))?.includes('--light'),`touch static ${i}`);
  await f.dispatchEvent('pointermove',{pointerType:'mouse',clientX:b.x+10,clientY:b.y+10});await f.dispatchEvent('pointercancel');await page.waitForTimeout(40);
  check(!(await f.getAttribute('style'))?.includes('--light'),`cancel pending ${i}`);
 }
 await page.getByLabel('Pointer light').uncheck();
 for(let i=0;i<6;i++) {const f=frames.nth(i);await f.hover();await page.waitForTimeout(30);check(!(await f.getAttribute('style'))?.includes('--light'),`disabled ${i}`);}
 await page.getByLabel('Pointer light').check();await frames.first().hover();await page.waitForTimeout(40);check((await frames.first().getAttribute('style'))?.includes('--light'),'reenabled');
 await page.getByLabel('Content',{exact:true}).selectOption('children');
 const button=page.locator('.sheet-grid button').first();await button.focus();await page.keyboard.press('Enter');check(await page.locator('.sheet-grid output').first().textContent()==='1 mark left here.','keyboard child');
 await page.keyboard.press('Space');check(await page.locator('.sheet-grid output').first().textContent()==='2 marks left here.','space child');
 await page.getByLabel('Opening',{exact:true}).selectOption('1');check(await page.locator('.sheet-grid output').first().textContent()==='2 marks left here.','ratio preserves child state');
 await page.getByLabel('Content',{exact:true}).selectOption('painting');await page.getByLabel('Opening',{exact:true}).selectOption('93.4 / 73.2');
 check(await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return ids.length===new Set(ids).size}),'unique SVG ids');
 for(const width of [1920,1024,1001,1000,850,681,680,390,320]) {await page.setViewportSize({width,height:900});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`breakpoint ${width}`);}
 const browser=page.context().browser();
 for(const dpr of [1,1.25,2]) {
  const ctx=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:dpr});const p=await ctx.newPage();await p.goto('http://127.0.0.1:5173');await p.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
  await p.screenshot({path:`output/playwright/hardening/dpr-${dpr}.png`,fullPage:true});
  for(const variant of ['baroque-gold','champagne-rococo','ebonised-black','modern-black']) await p.locator(`.sheet-grid [data-variant="${variant}"]`).screenshot({path:`output/playwright/hardening/detail-${variant}-${dpr}.png`});
  check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`DPR ${dpr}`);await ctx.close();
 }
 const mobile=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});const mp=await mobile.newPage();await mp.goto('http://127.0.0.1:5173');await mp.locator('.sheet-grid .gallery-frame').first().tap();check(!(await mp.locator('.sheet-grid .gallery-frame').first().getAttribute('style'))?.includes('--light'),'real touch context');await mp.screenshot({path:'output/playwright/hardening/touch-mobile.png',fullPage:true});await mobile.close();
 await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>document.body.style.zoom='1.25');check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'125 percent zoom');await page.screenshot({path:'output/playwright/hardening/zoom-125.png',fullPage:true});await page.evaluate(()=>document.body.style.zoom='');
 if (failures.length) throw new Error(JSON.stringify(failures));
 return {checks,failures};
}
