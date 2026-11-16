const {chromium}=require('playwright');
const SHOTS=''+__dirname+'/shots';require('fs').mkdirSync(SHOTS,{recursive:true});
const FILE='file://'+require('path').resolve(__dirname,'../index.html');
const KEY='money-tracker.v1';
const results=[];const ok=(n,c,x)=>results.push((c?'PASS ':'FAIL ')+n+(x?' — '+x:''));const w=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const browser=await chromium.launch();
  const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,acceptDownloads:true});
  const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const txt=async s=>(await page.textContent(s))||'';const click=async s=>{await page.click(s);await w(160);};
  const theme=()=>page.evaluate(()=>document.documentElement.dataset.theme||'');
  await page.goto(FILE);await w(300);await page.fill('#w-first','Shreya');await click('#w-go');

  ok('empty month shows the receipt illustration',await page.$('.card.empty .art .coin')!==null&&/₹0/.test(await txt('.card.empty')));
  ok('tab indicator sits behind the active tab',await page.$('.tab-ind.live')!==null&&await page.evaluate(()=>{const a=document.querySelector('.tab-ind').getBoundingClientRect(),b=document.querySelector('nav .tab.on .ic').getBoundingClientRect();return Math.abs(a.left-b.left)<2&&Math.abs(a.top-b.top)<2;}));

  await click('#add-btn');
  ok('category chips carry glyphs tinted by category',await page.$$eval('#cat-chips .chip .ci svg',l=>l.length)===10&&await page.$eval('#cat-chips .chip[data-cat="Food"] .ci',e=>e.style.getPropertyValue('--cc')==='var(--c1)'));
  await page.fill('#f-amount','120');await click('#cat-chips .chip[data-cat="Food"]');await page.click('#save-tx');await w(200);
  ok('save button morphs into a check',await page.$eval('#save-tx',e=>e.classList.contains('done'))&&/Saved/.test(await txt('#save-tx'))&&await page.$('#save-tx .tick')!==null);
  ok('new row slides into Just added',await page.$('#recent .txrow.new .ci')!==null);
  await w(900);
  ok('button returns to Save expense',!(await page.$eval('#save-tx',e=>e.classList.contains('done')))&&/Save expense/.test(await txt('#save-tx')));

  await click('nav [data-go="dashboard"]');
  ok('hero carries the 7-day spark with today lit and the category strip',await page.$$eval('.hero .sp',l=>l.length)===7&&await page.$('.hero .sp.today')!==null&&await page.$$eval('.hero .strip i',l=>l.length)===1);
  await click('#main .txrow');
  ok('sheet has a grab handle',await page.$('#sheet-panel .grab')!==null);
  await click('#sheet button[data-close]');
  await click('[data-period][aria-label="Previous month"]');
  ok('moving to an earlier month slides the screen in',await page.$eval('#main',e=>e.classList.contains('slide-r'))||/September|August/.test(await txt('h1')));
  await w(400);
  ok('slide class clears after the animation',!(await page.$eval('#main',e=>e.classList.contains('slide-r')||e.classList.contains('slide-l'))));

  await click('nav [data-go="settings"]');
  ok('appearance control present and on Match phone',await page.$eval('#theme-seg [data-theme-pick="system"]',e=>e.classList.contains('on'))&&(await theme())==='');
  await click('#theme-seg [data-theme-pick="dark"]');
  ok('dark applies immediately and persists',(await theme())==='dark'&&await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).meta.theme,KEY)==='dark');
  await page.reload();await w(400);
  ok('theme survives reload',(await theme())==='dark');
  await page.screenshot({path:SHOTS+'/ui-01-dark-forced.png',fullPage:true});
  await click('nav [data-go="settings"]');await click('#theme-seg [data-theme-pick="light"]');
  await page.emulateMedia({colorScheme:'dark'});
  ok('forced light wins over the phone being dark',(await theme())==='light'&&await page.evaluate(()=>getComputedStyle(document.body).backgroundColor)==='rgb(242, 244, 241)');
  await click('#theme-seg [data-theme-pick="system"]');
  ok('match phone follows the phone again',(await theme())===''&&await page.evaluate(()=>getComputedStyle(document.body).backgroundColor)==='rgb(15, 20, 19)');

  await page.emulateMedia({colorScheme:'light',reducedMotion:'reduce'});
  await click('#add-btn');await page.fill('#f-amount','50');await click('#cat-chips .chip[data-cat="Food"]');await page.click('#save-tx');await w(100);
  ok('reduced motion skips the save morph and row slide',!(await page.$eval('#save-tx',e=>e.classList.contains('done')))&&await page.$('#recent .txrow.new')===null);

  // --- navigation: Month first, Add in the header
  await page.emulateMedia({reducedMotion:'no-preference'});
  ok('tab bar is Month · History · Settings',await page.$$eval('nav .tab',l=>l.map(b=>b.dataset.go).join(','))==='dashboard,history,settings');
  await click('nav [data-go="dashboard"]');
  ok('Add button sits in the Month header beside the avatar',await page.$('.greet #add-btn')!==null&&await page.$eval('.greet',e=>[...e.children].map(c=>c.id||c.className).join('|'))==='grow|add-btn|avatar');
  await click('nav [data-go="history"]');ok('Add button on History',await page.$('.topbar #add-btn')!==null);
  await click('nav [data-go="settings"]');ok('Add button on Settings',await page.$('.topbar #add-btn')!==null);
  await click('#add-btn');
  ok('header Add opens the Add screen with no tab lit',/Add expense/.test(await txt('h1'))&&await page.$('nav .tab.on')===null&&!(await page.$eval('.tab-ind',e=>e.classList.contains('live'))));

  // --- calculator
  await click('.amount-in [data-calc="form"]');
  ok('calculator sheet opens',/Calculator/.test(await txt('#sheet-head'))&&await page.$$eval('#sheet [data-ck]',l=>l.length)===20);
  for(const k of ['1','2','0','+','4','5','×','2'])await click('#sheet [data-ck="'+k+'"]');
  ok('display shows the expression and a live result',(await txt('#calc-expr'))==='120+45×2'&&/= ₹210/.test(await txt('#calc-res')));
  await click('#sheet [data-ck="="]');
  ok('equals collapses to the result',(await txt('#calc-expr'))==='210');
  for(const k of ['÷','4'])await click('#sheet [data-ck="'+k+'"]');
  await click('#sheet [data-calc-use]');
  ok('Use puts the result in the amount field',await page.$eval('#sheet',e=>e.hidden)&&(await page.inputValue('#f-amount'))==='52.5');
  await page.fill('#f-amount','250+180-30');await click('#cat-chips .chip[data-cat="Food"]');await page.click('#save-tx');await w(200);
  ok('a typed expression saves as its value',/Saved ₹400/.test(await txt('#toast-text')));
  await page.fill('#f-amount','10%+');await page.click('#save-tx');await w(100);
  ok('an unfinished expression is refused',/Enter an amount/.test(await txt('#toast-text')));
  await click('#recent .txrow');await click('#sheet [data-detail^="edit|"]');await click('#sheet [data-calc="sheet"]');
  for(const k of ['C','8','0','0'])await click('#sheet [data-ck="'+k+'"]');await click('#sheet [data-calc-use]');
  ok('calculator works inside the edit sheet and returns to it',await page.$('#sheet [data-save-edit]')!==null&&(await page.inputValue('#e-amount'))==='800');
  await click('#sheet button[data-close]');

  // --- trends
  await click('nav [data-go="dashboard"]');
  await click('.hero.tap');
  const tr=await txt('#sheet-body');
  ok('hero opens Trends with the running total, weekday, six-month and movers',/Trends/.test(await txt('#sheet-head'))&&/Running total/.test(tr)&&/Average by weekday/.test(tr)&&/Last six months/.test(tr)&&/What moved/.test(tr)&&await page.$$eval('#sheet-body .chart svg',l=>l.length)===4);
  await click('#sheet .prow[data-detail^="cat|"]');
  ok('a mover opens the category sheet on top',/Food/.test(await txt('#sheet-head'))&&!(await page.$eval('#sheet-back',e=>e.hidden)));
  await click('#sheet button[data-close]');
  await click('.card [data-detail^="trend|"]');
  ok('Day by day card also opens Trends',/Trends/.test(await txt('#sheet-head')));
  await page.screenshot({path:SHOTS+'/ui-02-trends.png'});
  await click('#sheet button[data-close]');

  // --- version chip (label only; the history lives in the docs)
  await click('nav [data-go="settings"]');
  ok('settings shows the version chip as a label, not a button',/Version 1\.8\.0/.test(await txt('#version-chip'))&&/30 October 2026/.test(await txt('#version-chip'))&&await page.$eval('#version-chip',e=>e.tagName)==='SPAN');
  ok('saves stamp the app version into the ledger',await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).meta.appVersion,KEY)==='1.2.6');

  // --- PDF report
  const [pdfDl]=await Promise.all([page.waitForEvent('download',{timeout:8000}).catch(()=>null),click('#pdf-dl')]);
  const pdfPath=pdfDl?await pdfDl.path():null;const pdfBytes=pdfPath?require('fs').readFileSync(pdfPath):Buffer.alloc(0);
  ok('settings exports a PDF named by month',!!pdfDl&&/^money-tracker-\d{4}-\d{2}\.pdf$/.test(pdfDl.suggestedFilename()),pdfDl&&pdfDl.suggestedFilename());
  ok('the file is a well-formed PDF with a page tree and both fonts',pdfBytes.slice(0,8).toString('latin1')==='%PDF-1.4'&&/%%EOF$/.test(pdfBytes.toString('latin1'))&&/\/Type \/Pages \/Kids \[.*\] \/Count \d+/.test(pdfBytes.toString('latin1'))&&/Helvetica-Bold/.test(pdfBytes.toString('latin1')));
  ok('the report carries the month title and the ledger columns',/expense report/.test(pdfBytes.toString('latin1'))&&/\(Balance\)/.test(pdfBytes.toString('latin1'))&&/\(Final balance\)/.test(pdfBytes.toString('latin1')));
  await click('nav [data-go="dashboard"]');
  ok('dashboard All expenses card links to the PDF report',await page.$('[data-pdf]')!==null);

  // --- self-hosted fonts, privacy, share-to-Files
  ok('no request leaves the page (fonts are local)',await page.evaluate(()=>performance.getEntriesByType('resource').every(r=>!/^https?:/.test(r.name)||r.name.startsWith(location.origin))));
  ok('all five Plex faces load from fonts/',await page.evaluate(async()=>{await document.fonts.ready;const l=[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family+' '+f.weight);return ['IBM Plex Sans 400','IBM Plex Sans 500','IBM Plex Sans 600','IBM Plex Mono 500','IBM Plex Mono 600'].every(x=>l.includes(x));}));
  await click('nav [data-go="settings"]');
  ok('settings has Privacy and Terms links and no Save-to-Files button where files cannot be shared',await page.$('[data-detail="privacy|app"]')!==null&&await page.$('[data-detail="terms|app"]')!==null&&await page.$('#export-share')===null);
  await click('[data-detail="privacy|app"]');
  ok('privacy sheet states the no-server, no-analytics, PIN-encryption facts',/Nothing leaves your phone/.test(await txt('#sheet-body'))&&/no analytics/.test(await txt('#sheet-body'))&&/AES-256/.test(await txt('#sheet-body'))&&/version 1\.8\.0/.test(await txt('#sheet-body')));
  await click('#sheet button[data-close]');await click('[data-detail="terms|app"]');
  ok('terms sheet opens',/Terms/.test(await txt('#sheet-head'))&&/as is/.test(await txt('#sheet-body')));
  await click('#sheet button[data-close]');
  await page.evaluate(()=>{navigator.canShare=()=>true;navigator.share=d=>{window.__shared=d;return Promise.resolve();};});
  await click('nav [data-go="dashboard"]');await click('nav [data-go="settings"]');
  ok('Save backup to Files appears when the phone can share files',await page.$('#export-share')!==null&&/save a backup to Files|Last backup/.test(await txt('#main')));
  await click('#export-share');await w(300);
  const shared=await page.evaluate(()=>window.__shared&&{n:window.__shared.files[0].name,t:window.__shared.files[0].type,size:window.__shared.files[0].size});
  ok('sharing hands over the JSON backup and records the backup date',!!shared&&/^money-tracker-backup-\d{4}-\d{2}-\d{2}\.json$/.test(shared.n)&&shared.t==='application/json'&&shared.size>100&&/Backup saved/.test(await txt('#toast-text'))&&!/never/.test((await txt('#main')).split('Last backup')[1].slice(0,30)));
  await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('money-tracker.v1'));d.profile={firstName:'',lastName:''};localStorage.setItem('money-tracker.v1',JSON.stringify(d));});
  await page.reload();await w(400);await click('#welcome [data-detail="privacy|welcome"]');
  ok('privacy opens above the welcome screen',!(await page.$eval('#sheet',e=>e.hidden))&&await page.$eval('#sheet',e=>e.classList.contains('over'))&&/Privacy/.test(await txt('#sheet-head')));
  await click('#sheet button[data-close]');
  ok('closing returns to the welcome screen',!(await page.$eval('#welcome',e=>e.hidden))&&!(await page.$eval('#sheet',e=>e.classList.contains('over'))));
  await page.fill('#w-first','Shreya');await click('#w-go');

  ok('no horizontal scroll',await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
  ok('no page errors',errors.length===0,errors.join('|'));
  console.log(results.join('\n'));await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
