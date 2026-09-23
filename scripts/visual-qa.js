async page => {
 const failures=[]; const check=(ok,label)=>{if(!ok) failures.push(label)};
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173');
 let cases=0; const scrolls=[];
 for(const width of [1440,768,320]) {
  await page.setViewportSize({width,height:1000});
  for(const content of ['painting','photo','graphic','children']) {
   await page.getByLabel('Content',{exact:true}).selectOption(content);
   for(const ratio of ['4 / 5','1','3 / 2']) {
    await page.getByLabel('Opening',{exact:true}).selectOption(ratio);
    await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
    const state=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,frames:[...document.querySelectorAll('.sheet-grid .gallery-frame')].map(e=>{const o=e.querySelector('.gallery-frame__opening');const r=o.getBoundingClientRect();return {variant:e.dataset.variant,ratio:r.width/r.height,scrollX:o.scrollWidth>o.clientWidth+1,scrollY:o.scrollHeight>o.clientHeight+1,corner:[...e.querySelectorAll('.gallery-frame__tl,.gallery-frame__tr,.gallery-frame__bl,.gallery-frame__br')].every(c=>Math.abs(c.clientWidth-c.clientHeight)<1),contentWidth:r.width}})}));
    check(!state.overflow,`page overflow ${width}/${content}/${ratio}`);
    for(const f of state.frames) {
     cases++; const expected=ratio==='4 / 5'?.8:ratio==='1'?1:1.5;
     check(Math.abs(f.ratio-expected)<.003,`ratio ${width}/${content}/${ratio}/${f.variant}: ${f.ratio}`);
     check(f.corner&&!f.scrollX&&f.contentWidth>150,`geometry ${width}/${content}/${ratio}/${f.variant}`);
     if(f.scrollY)scrolls.push(`${width}/${content}/${ratio}/${f.variant}`);
    }
    if(width===320||content==='children') await page.locator('#collection').screenshot({path:`output/playwright/hardening/matrix-${width}-${content}-${ratio.replaceAll(' / ','-')}.png`});
   }
  }
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.getByLabel('Content',{exact:true}).selectOption('painting');
 await page.getByLabel('Opening',{exact:true}).selectOption('93.4 / 73.2');
 await page.locator('#collection').screenshot({path:'output/playwright/hardening/collection-desktop.png'});
 await page.locator('#examples').screenshot({path:'output/playwright/hardening/examples-desktop.png'});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'output/playwright/hardening/mobile-first-view.png'});
 await page.locator('#collection').screenshot({path:'output/playwright/hardening/collection-mobile.png'});
 await page.locator('#child-example').screenshot({path:'output/playwright/hardening/children-mobile.png'});
 check(errors.length===0,`browser errors: ${errors}`);
 if (scrolls.length) failures.push(...scrolls.map(s=>'unexpected scroll '+s));
 if (failures.length) throw new Error(JSON.stringify(failures));
 return {cases,failures,scrolls,errors};
}
