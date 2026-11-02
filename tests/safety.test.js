const {chromium}=require('playwright');
const SHOTS=''+__dirname+'/shots';require('fs').mkdirSync(SHOTS,{recursive:true});
const FILE='file://'+require('path').resolve(__dirname,'../index.html');
const KEY='money-tracker.v1',SNAP='money-tracker.v1.snapshots';
const results=[];const ok=(n,c,x)=>results.push((c?'PASS ':'FAIL ')+n+(x?' — '+x:''));const w=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const browser=await chromium.launch();
  const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const txt=async s=>(await page.textContent(s))||'';const click=async s=>{await page.click(s);await w(160);};
  const txCount=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)).tx.length,KEY);
  const unlocked=async()=>{try{await page.waitForFunction(()=>document.querySelector('#lock').hidden,null,{timeout:8000});return true;}catch(e){return false;}};
  const snaps=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)||'[]'),SNAP);
  const welcome=async()=>{if(!(await page.$eval('#welcome',e=>e.hidden))){await page.fill('#w-first','Shreya');await click('#w-go');}};
  const add=async(amt,note)=>{await page.fill('#f-amount',amt);await click('#cat-chips .chip[data-cat="Food"]');await page.fill('#f-note',note);await click('[data-method="cash"]');await click('#save-tx');};
  await page.goto(FILE);await w(300);await welcome();

  // --- 1. SNAPSHOTS: one per day, taken from the state before the day's first save
  await click('#add-btn');
  await add('100','One');
  ok('first save of the day keeps the state before it (empty ledger)',(await snaps()).length===1&&JSON.parse((await snaps())[0].raw).tx.length===0,'snaps='+(await snaps()).length);
  await add('200','Two');
  let s=await snaps();
  ok('still one snapshot the same day',s.length===1,'snaps='+s.length);
  await page.evaluate(k=>{const l=JSON.parse(localStorage.getItem(k));l[0].day='2026-10-28';localStorage.setItem(k,JSON.stringify(l));},SNAP);
  await add('300','Three');
  s=await snaps();
  ok('new day adds a snapshot of the previous state',s.length===2&&s[0].day===new Date().toISOString().slice(0,10)&&JSON.parse(s[0].raw).tx.length===2,'days='+s.map(x=>x.day).join(','));
  await click('nav [data-go="settings"]');
  const st=await txt('#main');
  ok('settings lists automatic copies',/Automatic copies/.test(st)&&/28 October 2026/.test(st)&&/2 expenses/.test(st));
  await page.screenshot({path:SHOTS+'/01-snapshots.png',fullPage:true});

  // --- 2. RESTORE a snapshot (confirm step, then replaces the ledger)
  await click('[data-ask="snap:2026-10-28"]');
  ok('restore asks to confirm',await page.$('[data-restore-snap="2026-10-28"]')!==null);
  await click('[data-restore-snap="2026-10-28"]');
  ok('snapshot restored',(await txCount())===0&&/Restored 0 expenses/.test(await txt('#toast-text')),'tx='+(await txCount()));

  // --- 3. DELETE ALL with undo
  await click('#add-btn');await add('50','Chai');await add('60','Auto');
  await click('nav [data-go="settings"]');await click('[data-ask="wipe"]');await click('#wipe');
  ok('wipe empties the ledger and offers undo',(await txCount())===0&&/All expenses deleted/.test(await txt('#toast-text'))&&!(await page.$eval('#toast-btn',e=>e.hidden)));
  await click('#toast-btn');
  ok('undo brings everything back',(await txCount())===2&&/Restored 2 expenses/.test(await txt('#toast-text')),'tx='+(await txCount()));
  ok('undo is single use',await page.$eval('#toast-btn',e=>e.hidden));

  // --- 4. PIN encrypts the stored ledger and its snapshots
  const raw=()=>page.evaluate(k=>localStorage.getItem(k),KEY);
  const storedCount=async()=>{await click('nav [data-go="settings"]');return +((await txt('#main')).match(/Expenses stored on this device(\d+)/)||[0,-1])[1];};
  const enc=s=>{try{const o=JSON.parse(s);return !!(o&&(o.enc===1||o.enc===2)&&o.ct&&o.iv);}catch(e){return false;}};
  const encMain=s=>{try{const o=JSON.parse(s);return !!(o&&o.enc===2&&o.ct&&o.iv&&o.pin&&o.pin.salt&&o.pin.ct&&!o.face);}catch(e){return false;}};
  await click('[data-detail="pin|set"]');await page.fill('#p-new','1111');await page.fill('#p-new2','1111');await click('#sheet [data-pin-save="set"]');await w(300);
  ok('setting a PIN encrypts the ledger under a wrapped master key',/ledger encrypted/.test(await txt('#toast-text'))&&encMain(await raw())&&!/Chai/.test(await raw()));
  ok('snapshots are encrypted too',(await snaps()).every(s=>enc(s.raw))&&(await snaps()).length===2,'snaps='+(await snaps()).length);
  await click('#add-btn');await add('70','Dosa');await w(300);
  ok('later saves stay encrypted and keep the expense count on the copy',encMain(await raw())&&(await snaps())[0].n===2);
  await page.reload();await w(400);
  ok('locked on reload with nothing rendered',!(await page.$eval('#lock',e=>e.hidden))&&(await txt('#main')).trim()==='');
  for(const k of ['9','9','9','9'])await page.click('#keypad [data-key="'+k+'"]');await w(600);
  ok('wrong PIN cannot decrypt',!(await page.$eval('#lock',e=>e.hidden))&&/Wrong PIN/.test(await txt('#toast-text')));
  for(const k of ['1','1','1','1'])await page.click('#keypad [data-key="'+k+'"]');
  ok('right PIN decrypts and renders the ledger',await unlocked()&&/Dosa/.test(await txt('#main'))&&(await storedCount())===3);
  await click('nav [data-go="settings"]');await click('[data-detail="pin|change"]');
  await page.fill('#p-cur','1111');await page.fill('#p-new','2222');await page.fill('#p-new2','2222');await click('#sheet [data-pin-save="change"]');await w(400);
  const after=await raw(),beforeWrap=JSON.parse(await raw()).pin.ct;
  await page.reload();await w(400);for(const k of ['1','1','1','1'])await page.click('#keypad [data-key="'+k+'"]');await w(700);
  ok('old PIN no longer unlocks after a change',!(await page.$eval('#lock',e=>e.hidden)));
  for(const k of ['2','2','2','2'])await page.click('#keypad [data-key="'+k+'"]');
  ok('changed PIN re-wraps the master key and unlocks',encMain(after)&&await unlocked()&&(await storedCount())===3);
  // a store written by 1.1–1.7 (enc:1, ledger encrypted directly with the PIN key) upgrades on first unlock
  await page.evaluate(async k=>{const d=JSON.parse(localStorage.getItem('money-tracker.v1.snapshots')||'[]');const plain=JSON.stringify({profile:{firstName:'Shreya',lastName:''},accounts:[],categories:['Food'],tx:[{id:'L',amount:77,category:'Food',accountId:'cash',method:'cash',date:'2026-10-20',time:'10:00',note:'Legacy',recurringId:''}],income:[],cashIn:[],budgets:{},recurring:[],vehicles:[],meta:{},flags:{v2:true}});
    const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));const base=await crypto.subtle.importKey('raw',new TextEncoder().encode('money-tracker:4321'),'PBKDF2',false,['deriveKey']);const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:100000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt']);const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(plain));const b=u=>btoa(String.fromCharCode(...new Uint8Array(u)));localStorage.setItem(k,JSON.stringify({enc:1,salt:b(salt),iv:b(iv),ct:b(ct)}));localStorage.removeItem('money-tracker.v1.snapshots');},KEY);
  await page.reload();await w(400);
  ok('legacy enc:1 store locks the app',!(await page.$eval('#lock',e=>e.hidden)));
  for(const k of ['4','3','2','1'])await page.click('#keypad [data-key="'+k+'"]');
  const u1=await unlocked();await click('nav [data-go="dashboard"]');
  ok('legacy store unlocks with its PIN and is upgraded to the wrapped format',u1&&/Legacy/.test(await txt('#main'))&&encMain(await raw()));
  await page.reload();await w(400);for(const k of ['4','3','2','1'])await page.click('#keypad [data-key="'+k+'"]');
  const u2=await unlocked();await click('nav [data-go="dashboard"]');
  ok('upgraded store unlocks again with the same PIN',u2&&/Legacy/.test(await txt('#main')));
  await click('nav [data-go="settings"]');await click('[data-detail="pin|change"]');await page.fill('#p-cur','4321');await page.fill('#p-new','2222');await page.fill('#p-new2','2222');await click('#sheet [data-pin-save="change"]');await w(400);
  await page.evaluate(k=>{localStorage.setItem(k,JSON.stringify({accounts:[],categories:['Food'],tx:[]}));},'__scratch');
  await click('nav [data-go="settings"]');await click('[data-detail="pin|remove"]');await page.fill('#p-cur','2222');await click('#sheet [data-pin-save="remove"]');await w(400);
  ok('removing the PIN stores plain JSON again',!enc(await raw())&&/Legacy/.test(await raw())&&(await snaps()).every(s=>!enc(s.raw)));

  // --- 5. ERASE from the lock screen clears snapshots too
  await click('[data-detail="pin|set"]');await page.fill('#p-new','1111');await page.fill('#p-new2','1111');await click('#sheet [data-pin-save="set"]');await w(300);
  await page.reload();await w(400);await click('#pin-forgot');await click('#pin-erase');
  ok('erase removes snapshots',(await snaps()).length===0&&await page.evaluate(k=>localStorage.getItem(k)===null,KEY));

  // --- 6. INSTALL CARD: only on iOS outside a Home Screen app
  ok('no install card on a non-iOS browser',await page.$('#w-install[hidden]')!==null&&await page.$('.banner[data-detail="install|how"]')===null);
  const ios=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'});
  const ip=await ios.newPage();ip.on('pageerror',e=>errors.push(e.message));
  const itxt=async s=>(await ip.textContent(s))||'';const iclick=async s=>{await ip.click(s);await w(160);};
  await ip.goto(FILE);await w(300);
  ok('welcome shows install steps on iOS Safari',!(await ip.$eval('#w-install',e=>e.hidden))&&/Add to your Home Screen first/.test(await itxt('#w-install'))&&/Add to Home Screen/.test(await itxt('#w-install')));
  await ip.screenshot({path:SHOTS+'/02-welcome-install.png',fullPage:true});
  await ip.fill('#w-first','Shreya');await iclick('#w-go');
  ok('month screen carries the install banner',await ip.$('.banner[data-detail="install|how"]')!==null);
  await iclick('.banner[data-detail="install|how"]');
  ok('banner opens the steps sheet',/Add to Home Screen/.test(await itxt('#sheet-head'))&&/Copy backup first/.test(await itxt('#sheet-body')));
  await ip.screenshot({path:SHOTS+'/03-install-sheet.png'});
  await iclick('#sheet [data-install-later]');
  ok('Not now hides the banner for this session',await ip.$eval('#sheet',e=>e.hidden)&&await ip.$('.banner[data-detail="install|how"]')===null);
  await ios.close();

  ok('no horizontal scroll',await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
  ok('no page errors',errors.length===0,errors.join('|'));
  console.log(results.join('\n'));await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
