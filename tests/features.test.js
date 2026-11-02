const {chromium}=require('playwright');
const SHOTS=''+__dirname+'/shots';
require('fs').mkdirSync(SHOTS,{recursive:true});
const FILE='file://'+require('path').resolve(__dirname,'../index.html');
const results=[];const ok=(name,cond,extra)=>{results.push((cond?'PASS ':'FAIL ')+name+(extra?' — '+extra:''));};
const w=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
  const browser=await chromium.launch();
  const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const page=await ctx.newPage();
  const errors=[];page.on('pageerror',e=>errors.push('pageerror: '+e.message));page.on('console',m=>{if(m.type()==='error'&&!/ERR_TUNNEL|fonts\.g/.test(m.text()))errors.push('console: '+m.text());});
  await page.goto(FILE);await w(300);
  const txt=async s=>(await page.textContent(s))||'';
  const click=async s=>{await page.click(s);await w(150);};
  const toastHas=async re=>{try{await page.waitForFunction(r=>new RegExp(r).test(document.querySelector('#toast').textContent),re.source,{timeout:4000});return true;}catch(e){return false;}};
  const welcome=async()=>{if(!(await page.$eval('#welcome',e=>e.hidden))){await page.fill('#w-first','Shreya');await page.fill('#w-last','Sanghavi');await click('#w-go');}};
  await welcome();

  // --- seed: one cash expense, one card expense via picker
  await click('#add-btn');
  await page.fill('#f-amount','120');await click('#cat-chips .chip[data-cat="Food"]');await page.fill('#f-note','Chai');await click('#save-tx');
  await click('[data-method="online"]');await click('[data-method="card"]');await click('[data-open-pick="card"]');
  await page.fill('#pick-search','regalia gold');await w(100);await click('#pick-list [data-pick="HDFC Bank Regalia Gold"]');
  await page.fill('#f-amount','3999');await click('#cat-chips .chip[data-cat="Shopping"]');await click('#save-tx');
  ok('seeded two expenses',/Chai/.test(await txt('#recent'))&&/Regalia/.test(await txt('#recent')));

  // --- 1. EDIT an expense
  await click('#recent .txrow');            // most recent = shopping 3999
  ok('expense sheet has Edit',await page.$('#sheet [data-detail^="edit|"]')!==null);
  await click('#sheet [data-detail^="edit|"]');
  ok('edit form shows amount',(await page.inputValue('#e-amount'))==='3999');
  await page.fill('#e-amount','4250.75');await page.fill('#e-note','Myntra');
  await click('#sheet .chip[data-cat="Entertainment"]');
  // change the card via picker from inside the edit sheet
  await click('#sheet [data-open-pick="card"]');await page.fill('#pick-search','amex platinum travel');await w(100);await click('#pick-list [data-pick="American Express Platinum Travel"]');
  ok('picker returns to edit form',await page.$('#e-amount')!==null&&/American Express Platinum Travel/.test(await txt('#sheet .picker .pk-v')));
  await click('#sheet [data-save-edit]');
  ok('edit saved and sheet closed',await page.$eval('#sheet',e=>e.hidden));
  await click('nav [data-go="dashboard"]');
  const dash=await txt('#main');
  ok('dashboard reflects edit (4,250.75 Entertainment on Amex)',/4,250\.75/.test(dash)&&/Entertainment/.test(dash)&&/American Express Platinum Travel/.test(dash));
  ok('old card no longer in Paid with',!/Regalia Gold/.test(dash));

  // --- 2. BUDGETS
  await click('nav [data-go="settings"]');
  ok('budgets card starts empty with an add row',await page.$('input[data-budget]')===null&&await page.$('#budget-cat')!==null&&/None yet/.test(await txt('#main')));
  await page.selectOption('#budget-cat','Entertainment');await page.fill('#budget-amt','4000');await click('#budget-add');
  ok('added budget appears as a row and leaves the dropdown',(await page.inputValue('input[data-budget="Entertainment"]'))==='4000'&&!(await page.$$eval('#budget-cat option',l=>l.map(o=>o.value))).includes('Entertainment')&&/250.75 over this month/.test(await txt('#main')));
  await page.selectOption('#budget-cat','Food');await page.fill('#budget-amt','5000');await page.press('#budget-amt','Enter');await w(200);
  ok('Enter in the amount box adds too; only budgeted categories are listed',await page.$$eval('input[data-budget]',l=>l.map(i=>i.dataset.budget).sort().join(','))==='Entertainment,Food');
  await click('nav [data-go="dashboard"]');
  ok('dashboard warns when a budget is over',/Entertainment is over budget/.test(await txt('.banner'))&&/by ₹250.75/.test(await txt('.banner')));
  const d2=await txt('#main');
  ok('budget card shows over and left',/250\.75 over/.test(d2)&&/4,880 left/.test(d2),d2.match(/.{0,40}over.{0,40}/)&&d2.match(/.{0,40}over.{0,40}/)[0]);
  ok('over-budget row red',await page.$eval('.prow .small.over',e=>!!e));
  await page.screenshot({path:SHOTS+'/01-dashboard-budgets.png',fullPage:true});
  await click('.prow[data-detail="cat|'+new Date().toISOString().slice(0,7)+'|Entertainment"]');
  ok('category sheet shows budget line',/Budget ₹4,000 a month/.test(await txt('#sheet-body')));
  await click('#sheet button[data-close]');
  // crossing a budget on save raises a warning toast after the saved toast
  await click('#add-btn');await page.fill('#f-amount','3900');await click('#cat-chips .chip[data-cat="Food"]');await click('[data-method="cash"]');await page.click('#save-tx');
  ok('crossing 80% shows an amber-stage warning',await toastHas(/Food is at 80% of its ₹5,000 budget/));
  await page.fill('#f-amount','1000');await page.click('#save-tx');
  ok('crossing the budget shows a red warning',await toastHas(/Food budget exceeded · ₹5,020 of ₹5,000/)&&await page.$eval('#toast',e=>e.classList.contains('warn')));
  await page.fill('#f-amount','50');await page.click('#save-tx');
  ok('further spends say how far over',await toastHas(/Food is ₹70 over its ₹5,000 budget/));
  await page.evaluate(k=>{const d=JSON.parse(localStorage.getItem(k));d.tx=d.tx.filter(t=>!(t.category==='Food'&&t.amount>=50&&t.note===''));localStorage.setItem(k,JSON.stringify(d));},'money-tracker.v1');
  await page.reload();await w(400);await welcome();
  await click('nav [data-go="settings"]');await click('[data-del-budget="Food"]');
  ok('removing a budget returns the category to the dropdown',(await page.$$eval('#budget-cat option',l=>l.map(o=>o.value))).includes('Food')&&await page.$('input[data-budget="Food"]')===null);
  await page.selectOption('#budget-cat','Food');await page.fill('#budget-amt','5000');await click('#budget-add');

  // --- 3. STATEMENT DAY on the Amex card
  await click('nav [data-go="settings"]');
  const amexId=await page.evaluate(()=>JSON.parse(localStorage.getItem('money-tracker.v1')).accounts.find(a=>a.name==='American Express Platinum Travel').id);
  await page.selectOption('select[data-stmt="'+amexId+'"]','15');await w(200);
  ok('statement day saved',/this bill so far/.test(await txt('#main')));
  await click('nav [data-go="dashboard"]');
  const d3=await txt('#main');
  ok('Month screen card row shows this bill so far with close date',/this bill so far ₹4,250\.75 \(closes 15 /.test(d3),d3.match(/this bill so far[^)]*\)/)&&d3.match(/this bill so far[^)]*\)/)[0]);
  await click('.prow[data-detail^="acct|"][data-detail$="|'+amexId+'"]');
  ok('card sheet shows bill period',/This bill so far \(/.test(await txt('#sheet-body')));
  await click('#sheet button[data-close]');

  // --- 4. RECURRING: rent on the 1st, start this month => added immediately
  await click('nav [data-go="settings"]');
  await click('[data-detail="recur|new"]');
  ok('recurring form open',await page.$('#e-day')!==null);
  await page.fill('#e-amount','18000');await click('#sheet .chip[data-cat="Rent"]');await page.fill('#e-note','Flat rent');
  await click('#sheet [data-method="bank"]');await click('#sheet [data-open-pick="bank"]');await page.fill('#pick-search','sbi');await w(100);await click('#pick-list [data-pick="State Bank of India"]');
  await page.selectOption('#e-day','1');await page.selectOption('#e-since','this');
  await click('#sheet [data-save-recur]');
  const st=await txt('#main');
  ok('recurring listed in settings',/Flat rent/.test(st)&&/last added/.test(st));
  await click('nav [data-go="dashboard"]');
  const d4=await txt('#main');
  ok('rent auto-added this month with auto tag',/18,000/.test(d4)&&/auto/.test(d4));
  // reload must NOT add it twice
  await page.reload();await w(400);await welcome();
  const n18=((await txt('#main')).match(/18,000/g)||[]).length;
  const count=await page.evaluate(()=>JSON.parse(localStorage.getItem('money-tracker.v1')).tx.filter(t=>t.recurringId).length);
  ok('reload does not duplicate recurring',count===1,'auto tx count='+count);
  // pause it
  await click('nav [data-go="settings"]');await click('[data-detail^="recur|"]');
  await page.selectOption('#e-active','0');await click('#sheet [data-save-recur]');
  ok('recurring paused',/paused/.test(await txt('#main')));

  // --- 5. CSV
  const csvBtn=await page.$('#csv');ok('CSV buttons present',!!csvBtn&&!!(await page.$('#csv-dl')));
  await click('#csv');await w(300);
  const csv=await page.evaluate(()=>document.querySelector('#import-text')?document.querySelector('#import-text').value:'');
  const toastTxt=await txt('#toast');
  ok('CSV produced (clipboard or fallback box)',/CSV copied/.test(toastTxt)||/^Date,Time,Weekday/.test(csv),toastTxt);
  if(csv)ok('CSV has 3 data rows + header',csv.split(/\r?\n/).length===4,'lines='+csv.split(/\r?\n/).length);
  // download CSV (headless Chromium allows downloads)
  const [dl]=await Promise.all([page.waitForEvent('download',{timeout:5000}).catch(()=>null),click('#csv-dl')]);
  ok('CSV download fired',!!dl,dl?dl.suggestedFilename():'no download event');

  // --- 6. BACKUP REMINDER: simulate old data, no backup
  await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('money-tracker.v1'));d.tx[0].date='2026-09-01';delete d.meta.lastBackup;localStorage.setItem('money-tracker.v1',JSON.stringify(d));});
  await page.reload();await w(400);await welcome();await click('nav [data-go="dashboard"]');
  ok('backup banner shows when never backed up and data > 7 days old',await page.$('.banner[data-go="settings"]')!==null);
  await click('.banner[data-go="settings"]');ok('banner goes to settings',await page.$eval('nav .tab.on',e=>e.dataset.go)==='settings');
  await click('#export');await w(300);
  ok('last backup date recorded',/Last backup/.test(await txt('#main'))&&!/never/.test((await txt('#main')).split('Last backup')[1].slice(0,30)));
  await click('nav [data-go="dashboard"]');
  ok('banner gone after backup',await page.$('.banner[data-go="settings"]')===null);
  await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('money-tracker.v1'));d.meta.lastBackup=Date.now()-31*864e5;localStorage.setItem('money-tracker.v1',JSON.stringify(d));});
  await page.reload();await w(400);await welcome();await click('nav [data-go="dashboard"]');
  ok('banner returns after 31 days',/Last backup 31 days ago/.test(await txt('#main')));

  // --- 7. PIN
  await click('nav [data-go="settings"]');await click('[data-detail="pin|set"]');
  await page.fill('#p-new','1234');await page.fill('#p-new2','1234');await click('#sheet [data-pin-save="set"]');
  ok('PIN set message',await toastHas(/PIN turned on/)&&/Change PIN/.test(await txt('#main')));
  await page.reload();await w(400);await welcome();
  ok('lock screen on reload',!(await page.$eval('#lock',e=>e.hidden)));
  await page.screenshot({path:SHOTS+'/02-lock.png'});
  for(const k of ['1','1','1','1'])await page.click('#keypad [data-key="'+k+'"]');await w(500);
  ok('wrong PIN rejected',!(await page.$eval('#lock',e=>e.hidden))&&/Wrong PIN/.test(await txt('#toast')));
  for(const k of ['1','2','3','4'])await page.click('#keypad [data-key="'+k+'"]');await w(200);
  ok('right PIN unlocks',await page.$eval('#lock',e=>e.hidden));
  // change with wrong current
  await click('nav [data-go="settings"]');await click('[data-detail="pin|change"]');
  await page.fill('#p-cur','0000');await page.fill('#p-new','5678');await page.fill('#p-new2','5678');await click('#sheet [data-pin-save="change"]');
  ok('wrong current PIN blocks change',await toastHas(/Current PIN is wrong/));
  await page.fill('#p-cur','1234');await page.fill('#p-new','5678');await page.fill('#p-new2','5678');await click('#sheet [data-pin-save="change"]');
  ok('PIN changed',await toastHas(/PIN changed/));
  await click('[data-detail="pin|remove"]');await page.fill('#p-cur','5678');await click('#sheet [data-pin-save="remove"]');await toastHas(/PIN removed/);
  ok('PIN removed',/Set a 4-digit PIN/.test(await txt('#main')));
  // forgot flow: set again, reload, erase
  await click('[data-detail="pin|set"]');await page.fill('#p-new','9999');await page.fill('#p-new2','9999');await click('#sheet [data-pin-save="set"]');await toastHas(/PIN turned on/);
  await page.reload();await w(400);await welcome();await click('#pin-forgot');await click('#pin-erase');
  ok('forgot PIN erases and unlocks',await page.$eval('#lock',e=>e.hidden)&&/₹0/.test(await txt('#main')));

  // --- restore round trip of a backup carrying all new structures
  await page.evaluate(()=>{localStorage.setItem('money-tracker.v1',JSON.stringify({accounts:[{id:'a1',name:'HDFC Bank',type:'bank'},{id:'c1',name:'Axis Bank Magnus',type:'card',statementDay:20}],categories:['Food','Transport','Other'],tx:[{id:'x',amount:50,category:'Food',accountId:'a1',date:'2026-10-02'}],budgets:{Food:'3000',Bad:0},recurring:[{id:'r1',amount:999,category:'Other',method:'card',accountId:'c1',day:5,note:'Netflix',active:true,since:'2026-10',lastApplied:''}]}));});
  await page.reload();await w(400);await welcome();
  const mig=await page.evaluate(()=>JSON.parse(localStorage.getItem('money-tracker.v1')));
  ok('migration keeps statementDay, budgets, recurring and applies due recurring',mig.accounts.find(a=>a.id==='c1').statementDay===20&&mig.budgets.Food===3000&&!('Bad' in mig.budgets)&&mig.recurring[0].lastApplied==='2026-10'&&mig.tx.some(t=>t.recurringId==='r1'));
  await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('money-tracker.v1'));d.pin='daec90c8';localStorage.setItem('money-tracker.v1',JSON.stringify(d));});
  await page.reload();await w(400);await welcome();
  ok('old hashed pin field does not lock the app',await page.$eval('#lock',e=>e.hidden));
  await click('nav [data-go="settings"]');await page.fill('#new-cat','Wedding');await click('#add-cat');
  ok('old pin field is dropped on the next save',!('pin' in (await page.evaluate(()=>JSON.parse(localStorage.getItem('money-tracker.v1'))))));
  for(const c of ['A','B','C','D','E','F','G','H'])await page.evaluate(k=>{const d=JSON.parse(localStorage.getItem('money-tracker.v1'));d.categories.push(k);localStorage.setItem('money-tracker.v1',JSON.stringify(d));},c);
  await page.reload();await w(400);await welcome();await click('nav [data-go="settings"]');
  const dots=await page.$$eval('[data-del-cat]',l=>l.map(b=>b.previousElementSibling.previousElementSibling.style.background));
  ok('thirteen categories get thirteen distinct colours, Other stays grey',new Set(dots).size===13&&dots[9]==='var(--c10)'&&dots[10]==='var(--c11)'&&!dots.slice(0,9).includes('var(--c10)'),dots.join(' '));
  ok('no horizontal scroll',await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
  await click('nav [data-go="settings"]');await page.screenshot({path:SHOTS+'/03-settings.png',fullPage:true});
  await page.emulateMedia({colorScheme:'dark'});await click('nav [data-go="dashboard"]');await page.screenshot({path:SHOTS+'/04-dashboard-dark.png',fullPage:true});
  ok('no page/console errors',errors.length===0,errors.join(' | '));
  console.log(results.join('\n'));
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
