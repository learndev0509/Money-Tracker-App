const {chromium}=require('playwright');
const SHOTS=''+__dirname+'/shots';require('fs').mkdirSync(SHOTS,{recursive:true});
const FILE='file://'+require('path').resolve(__dirname,'../index.html');
const results=[];const ok=(n,c,x)=>results.push((c?'PASS ':'FAIL ')+n+(x?' — '+x:''));const w=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const browser=await chromium.launch();
  const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const txt=async s=>(await page.textContent(s))||'';const click=async s=>{await page.click(s);await w(160);};
  await page.goto(FILE);await w(400);
  // welcome: animated logo present, little text
  ok('welcome has animated logo pieces',await page.$('#welcome .lg-anim .lg-coin')!==null&&await page.$('#welcome .lg-shine')!==null);
  const wtext=(await txt('#welcome')).replace(/\s+/g,' ').trim();
  ok('welcome text is short (< 260 chars)',wtext.length<260,wtext.length+' chars');
  await page.screenshot({path:SHOTS+'/01-welcome.png'});await w(1600);await page.screenshot({path:SHOTS+'/02-welcome-settled.png',fullPage:true});
  await page.fill('#w-first','Shreya');await page.fill('#w-last','Sanghavi');await click('#w-go');
  ok('dashboard after welcome',/Good (morning|afternoon|evening), Shreya!/.test(await txt('.g-hi')));
  ok('entrance class on main when opening a screen',await page.$eval('#main',e=>e.classList.contains('enter')));

  // seed: two expenses with notes, one cash
  await click('#add-btn');
  await page.fill('#f-amount','180');await click('#cat-chips .chip[data-cat="Food"]');await page.fill('#f-note','Swiggy');
  await click('[data-method="online"]');await click('[data-method="card"]');await click('[data-open-pick="card"]');await page.fill('#pick-search','hdfc millennia');await w(100);await click('#pick-list [data-pick="HDFC Bank Millennia"]');
  await click('#save-tx');
  await page.fill('#f-amount','60');await click('#cat-chips .chip[data-cat="Food"]');await page.fill('#f-note','Chai');await click('[data-method="cash"]');await click('#save-tx');

  // 2. NOTE AUTOCOMPLETE
  const sug0=await txt('#note-suggest');
  ok('frequent notes shown before typing',/Swiggy/.test(sug0)&&/Chai/.test(sug0),sug0.slice(0,80));
  await click('[data-method="cash"]');await click('#cat-chips .chip[data-cat="Other"]');
  await page.fill('#f-note','sw');await w(100);
  ok('typing filters suggestions',/Swiggy/.test(await txt('#note-suggest'))&&!/Chai/.test(await txt('#note-suggest')));
  await click('#note-suggest [data-note="Swiggy"]');
  ok('suggestion fills note, category and card',(await page.inputValue('#f-note'))==='Swiggy'&&await page.$eval('#cat-chips .chip.on',e=>e.dataset.cat)==='Food'&&/HDFC Bank Millennia/.test(await txt('#pay-block .picker .pk-v')));
  await page.screenshot({path:SHOTS+'/03-add-suggest.png',fullPage:true});
  await page.fill('#f-amount','220');await click('#save-tx');

  // 1. UNDO
  await click('nav [data-go="dashboard"]');
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('money-tracker.v1')).tx.length);
  await click('#main .txrow');await click('#sheet [data-del-tx]');
  ok('delete shows undo toast',/Deleted/.test(await txt('#toast-text'))&&!(await page.$eval('#toast-btn',e=>e.hidden)));
  const mid=await page.evaluate(()=>JSON.parse(localStorage.getItem('money-tracker.v1')).tx.length);
  await click('#toast-btn');
  const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('money-tracker.v1')).tx.length);
  ok('undo restores the expense',mid===before-1&&after===before,before+'→'+mid+'→'+after);
  ok('restored toast',/Restored/.test(await txt('#toast-text')));

  // 5. CASH IN HAND
  ok('cash card appears once cash was spent',await page.$('.cashcard')!==null);
  ok('cash balance negative before any withdrawal',/-?₹60/.test(await txt('.cash-big'))&&await page.$('.cash-big.neg')!==null,await txt('.cash-big'));
  await click('.cashcard [data-detail="cashform|withdrawal"]');
  ok('withdrawal form is bank-only',await page.$('#sheet [data-method="cash"]')===null&&await page.$('#sheet [data-open-pick="bank"]')!==null);
  await page.fill('#e-amount','2000');await click('#sheet [data-open-pick="bank"]');await page.fill('#pick-search','kotak');await w(100);await click('#pick-list [data-pick="Kotak Mahindra Bank"]');
  ok('bank picked inside the cash form',/Kotak Mahindra Bank/.test(await txt('#sheet .picker .pk-v')));
  await click('#sheet [data-save-cash]');
  ok('balance after withdrawal = 2000-60',/₹1,940/.test(await txt('.cash-big')),await txt('.cash-big'));
  await click('.cashcard [data-detail="cashform|adjust"]');await page.fill('#e-amount','1500');await click('#sheet [data-save-cash]');
  ok('set cash in hand overrides',/₹1,500/.test(await txt('.cash-big')));
  // new cash spend after adjust reduces it
  await click('#add-btn');await page.fill('#f-amount','100');await click('#cat-chips .chip[data-cat="Transport"]');await click('[data-method="cash"]');await page.fill('#f-note','Auto');await click('#save-tx');
  await click('nav [data-go="dashboard"]');
  ok('cash spend after adjust reduces balance to 1400',/₹1,400/.test(await txt('.cash-big')),await txt('.cash-big'));
  await click('.cashcard [data-detail="cash|list"]');
  const hist=await txt('#sheet-body');
  ok('cash history lists withdrawal, adjust and spends',/Withdrawal/.test(hist)&&/Set to/.test(hist)&&/Auto/.test(hist));
  await page.screenshot({path:SHOTS+'/04-cash-history.png'});
  await click('#sheet button[data-close]');
  ok('paid-with cash row shows in hand',/₹1,400 in hand/.test(await txt('#main')));
  await page.screenshot({path:SHOTS+'/05-dashboard.png',fullPage:true});

  // 7. HISTORY: newest first, dropdowns for year, month, category, payment and sort, search
  await click('nav [data-go="history"]');
  const pick=async(id,v)=>{await page.selectOption(id,v);await w(160);};
  ok('history has no charts',await page.$('#hist-body .chart')===null&&await page.$('#hist-body .hero')===null&&await page.$('#hist-body .prow')===null);
  const curM=new Date().getMonth()+1,curY=new Date().getFullYear();
  ok('five dropdowns: year, month, category, paid with, sort',await page.$$eval('#hist-filters select',l=>l.map(s=>s.id).join(','))==='h-year,h-month,h-cat,h-method,h-sort');
  ok('year and month default to now',(await page.inputValue('#h-year'))===String(curY)&&(await page.inputValue('#h-month'))===String(curM));
  ok('future months are disabled, no future years',await page.$$eval('#h-month option',l=>l.filter(o=>+o.value>new Date().getMonth()+1).every(o=>o.disabled))&&await page.$$eval('#h-year option',l=>l.every(o=>+o.value<=new Date().getFullYear())));
  ok('category dropdown lists every category, payment dropdown every method',await page.$$eval('#h-cat option',l=>l.map(o=>o.value)).then(v=>v[0]===''&&v.includes('Food')&&v.includes('Fuel')&&v.includes('Other'))&&await page.$$eval('#h-method option',l=>l.map(o=>o.value).join(','))===',cash,bank,upi,card');
  const order=await page.$$eval('#hist-body .txrow .note',l=>l.map(e=>e.textContent.trim()));
  ok('expenses listed newest first',order[0]==='· Auto'&&order[order.length-1]==='· Swiggy',order.join(','));
  await pick('#h-method','cash');
  let r=await txt('#hist-body');
  ok('payment dropdown narrows the month list',/Chai/.test(r)&&/Auto/.test(r)&&!/Swiggy/.test(r)&&/2 expenses · filtered/.test(r)&&await page.$eval('#h-method',e=>e.classList.contains('on')),r.slice(0,80));
  await pick('#h-cat','Food');
  r=await txt('#hist-body');
  ok('cash + Food narrows to Chai',/Chai/.test(r)&&!/Auto/.test(r)&&/1 expense · filtered/.test(r));
  await click('#hist-filters [data-hf-clear]');
  ok('clear resets category and payment',(await page.inputValue('#h-cat'))===''&&(await page.inputValue('#h-method'))===''&&/4 expenses/.test(await txt('#hist-body')));
  await pick('#h-sort','high');
  const amts=await page.$$eval('#hist-body .txrow .amt',l=>l.map(e=>+e.textContent.replace(/[^\d.]/g,'')));
  ok('sort by amount high to low is a flat list in order',amts.join(',')==='220,180,100,60'&&await page.$('#hist-body .dayhead')===null,amts.join(','));
  await pick('#h-sort','old');
  ok('oldest first reverses the order',(await page.$$eval('#hist-body .txrow .note',l=>l.map(e=>e.textContent.trim())))[0]==='· Swiggy');
  await pick('#h-sort','new');
  await page.fill('#hist-search','zzz');await w(100);
  ok('no-match state offers clear',/No expenses match/.test(await txt('#hist-body'))&&await page.$('#hist-body [data-hf-clear]')!==null);
  await click('#hist-body [data-hf-clear]');
  ok('clear resets to the month list',/expenses/.test(await txt('#hist-body'))&&(await page.inputValue('#hist-search'))===''&&await page.$('#h-month')!==null);
  await page.evaluate(k=>{const d=JSON.parse(localStorage.getItem(k));d.tx.push({id:'old',amount:999,category:'Other',accountId:'cash',method:'cash',date:'2025-03-04',time:'10:00',note:'Old one',recurringId:''},{id:'fut',amount:5,category:'Other',accountId:'cash',method:'cash',date:'2031-01-01',time:'',note:'From the future',recurringId:''});localStorage.setItem(k,JSON.stringify(d));},'money-tracker.v1');
  await page.reload();await w(400);await click('nav [data-go="history"]');
  ok('a past year appears in the dropdown, a future-dated entry does not add a year',await page.$$eval('#h-year option',l=>l.map(o=>o.value).join(','))===curY+',2025');
  await pick('#h-year','2025');
  ok('past year opens on December with its months enabled',(await page.inputValue('#h-month'))==='12'&&await page.$$eval('#h-month option',l=>l.every(o=>!o.disabled)));
  await pick('#h-month','3');
  ok('March 2025 shows the old expense',/March 2025 · 1 expense/.test(await txt('#hist-body'))&&/Old one/.test(await txt('#hist-body')));
  await page.screenshot({path:SHOTS+'/06-history.png',fullPage:true});
  await page.evaluate(k=>{const d=JSON.parse(localStorage.getItem(k));d.tx=d.tx.filter(t=>t.id!=='old'&&t.id!=='fut');localStorage.setItem(k,JSON.stringify(d));},'money-tracker.v1');
  await page.reload();await w(400);

  // 3. OPEN ON ADD SCREEN
  await click('nav [data-go="settings"]');
  await click('#start-seg [data-start="add"]');
  await page.goto(FILE);await w(400);
  ok('opens on Add when set (no hash)',/Add expense/.test(await txt('h1'))&&await page.$('nav .tab.on')===null);
  await click('nav [data-go="settings"]');await click('#start-seg [data-start="dashboard"]');
  await page.goto(FILE);await w(400);
  ok('opens on Month when reset',await page.$eval('nav .tab.on',e=>e.dataset.go)==='dashboard');

  // reduced motion: no enter class
  await page.emulateMedia({reducedMotion:'reduce'});await click('nav [data-go="history"]');
  ok('reduced motion skips entrance animations',!(await page.$eval('#main',e=>e.classList.contains('enter'))));
  await page.emulateMedia({reducedMotion:'no-preference',colorScheme:'dark'});
  await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('money-tracker.v1'));d.profile={firstName:'',lastName:''};localStorage.setItem('money-tracker.v1',JSON.stringify(d));});
  await page.goto(FILE);await w(1800);await page.screenshot({path:SHOTS+'/07-welcome-dark.png',fullPage:true});
  ok('no horizontal scroll',await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
  ok('no page errors',errors.length===0,errors.join('|'));
  console.log(results.join('\n'));await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
