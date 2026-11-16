const {chromium}=require('playwright');
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..'),ORIGIN='https://money.test',KEY='money-tracker.v1';
const results=[];const ok=(n,c,x)=>results.push((c?'PASS ':'FAIL ')+n+(x?' — '+x:''));const w=ms=>new Promise(r=>setTimeout(r,ms));
const MIME={'.html':'text/html','.js':'application/javascript','.json':'application/json','.woff':'font/woff','.png':'image/png','.svg':'image/svg+xml'};
(async()=>{
  const browser=await chromium.launch();
  const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,ignoreHTTPSErrors:true});
  await ctx.route(ORIGIN+'/**',route=>{const u=new URL(route.request().url());let f=path.join(ROOT,u.pathname==='/'?'index.html':u.pathname);if(!fs.existsSync(f))return route.fulfill({status:404,body:''});route.fulfill({status:200,contentType:MIME[path.extname(f)]||'application/octet-stream',body:fs.readFileSync(f)});});
  await ctx.addInitScript(()=>{window.__notes=[];window.__badge=null;
    class N{constructor(t,o){window.__notes.push({t,o});}static requestPermission(){return Promise.resolve(window.__perm||'granted');}}
    Object.defineProperty(N,'permission',{get:()=>window.__perm||'granted'});window.Notification=N;
    navigator.setAppBadge=n=>{window.__badge=n;return Promise.resolve();};navigator.clearAppBadge=()=>{window.__badge=0;return Promise.resolve();};});
  const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const txt=async s=>(await page.textContent(s))||'';const click=async s=>{await page.click(s);await w(160);};
  const raw=()=>page.evaluate(k=>localStorage.getItem(k),KEY);
  const unlocked=async()=>{try{await page.waitForFunction(()=>document.querySelector('#lock').hidden,null,{timeout:8000});return true;}catch(e){return false;}};
  const cdp=await ctx.newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  const {authenticatorId}=await cdp.send('WebAuthn.addVirtualAuthenticator',{options:{protocol:'ctap2',transport:'internal',hasResidentKey:true,hasUserVerification:true,isUserVerified:true,hasPrf:true,automaticPresenceSimulation:true}});
  await page.goto(ORIGIN+'/index.html');await w(400);
  ok('app serves from an https origin, declares five local faces and the service worker precaches them',await page.evaluate(()=>location.origin)===ORIGIN&&await page.evaluate(()=>[...document.fonts].length)===5&&await page.evaluate(async()=>{const r=await navigator.serviceWorker.ready;const c=await caches.open('money-tracker-v8');const ks=(await c.keys()).map(k=>new URL(k.url).pathname);return ['/fonts/plex-mono-500.woff','/icon-180.png','/manifest.json'].every(x=>ks.includes(x));}));
  await page.fill('#w-first','Shreya');await click('#w-go');

  // --- Face ID needs a PIN first
  await click('nav [data-go="settings"]');
  ok('Face ID controls hidden until a PIN exists',await page.$('[data-face]')===null);
  await click('[data-detail="pin|set"]');await page.fill('#p-new','1234');await page.fill('#p-new2','1234');await click('#sheet [data-pin-save="set"]');await w(600);
  ok('with a PIN, Settings offers Face ID unlock',await page.$('[data-face="enrol"]')!==null&&/FaceIDunlockOff/.test((await txt('#main')).replace(/\s+/g,'')));
  await click('[data-face="enrol"]');await w(1200);
  const blob=JSON.parse(await raw());
  ok('enrolling creates a passkey and a Face ID wrapper beside the PIN wrapper',/Face ID unlock is on/.test(await txt('#toast-text'))&&blob.enc===2&&blob.pin&&blob.face&&blob.face.id&&blob.face.salt&&blob.face.ct&&await page.$('[data-face="remove"]')!==null);
  const creds=await cdp.send('WebAuthn.getCredentials',{authenticatorId});
  ok('the authenticator holds one resident credential for money.test',creds.credentials.length===1&&creds.credentials[0].rpId==='money.test'&&creds.credentials[0].isResidentCredential===true);

  // --- lock, then unlock with Face ID
  await click('#add-btn');await page.fill('#f-amount','150');await click('#cat-chips .chip[data-cat="Food"]');await click('[data-method="cash"]');await click('#save-tx');await w(300);
  await page.reload();await w(500);
  ok('locked on reload with the Face ID button offered',!(await page.$eval('#lock',e=>e.hidden))&&!(await page.$eval('#pin-face',e=>e.hidden))&&/Use Face ID or enter your PIN/.test(await txt('#lock-sub')));
  await click('#pin-face');
  ok('Face ID unlocks the encrypted ledger',await unlocked()&&/₹150/.test(await txt('#main')));
  // --- PIN still works as the fallback, and changing it keeps Face ID
  await page.reload();await w(500);for(const k of ['1','2','3','4'])await page.click('#keypad [data-key="'+k+'"]');
  ok('PIN remains the fallback',await unlocked());
  await click('nav [data-go="settings"]');await click('[data-detail="pin|change"]');await page.fill('#p-cur','1234');await page.fill('#p-new','5678');await page.fill('#p-new2','5678');await click('#sheet [data-pin-save="change"]');await w(600);
  const b2=JSON.parse(await raw());
  ok('changing the PIN re-wraps only the PIN side; the Face ID wrapper is untouched',b2.face.ct===blob.face.ct&&b2.pin.ct!==blob.pin.ct&&b2.ct!==blob.ct);
  await page.reload();await w(500);await click('#pin-face');
  ok('Face ID still unlocks after a PIN change',await unlocked());
  // --- wrong passkey cannot unlock
  await cdp.send('WebAuthn.clearCredentials',{authenticatorId});
  await page.reload();await w(500);await click('#pin-face');await w(800);
  ok('without the passkey, Face ID fails closed and the PIN path remains',!(await page.$eval('#lock',e=>e.hidden)));
  for(const k of ['5','6','7','8'])await page.click('#keypad [data-key="'+k+'"]');
  ok('PIN unlocks after a failed Face ID',await unlocked());
  await click('nav [data-go="settings"]');await click('[data-face="remove"]');await w(300);
  ok('turning Face ID off drops the wrapper',!JSON.parse(await raw()).face&&await page.$('[data-face="enrol"]')!==null);
  await click('[data-detail="pin|remove"]');await page.fill('#p-cur','5678');await click('#sheet [data-pin-save="remove"]');await w(600);
  ok('removing the PIN leaves plain JSON and no Face ID controls',!/"enc"/.test(await raw())&&await page.$('[data-face]')===null);

  // --- budget notifications + badge
  await page.selectOption('#budget-cat','Food');await page.fill('#budget-amt','1000');await click('#budget-add');await w(200);
  ok('adding the first budget asks for alerts and shows them On',/AlertsonthisphoneOn/.test((await txt('#main')).replace(/\s+/g,''))&&await page.$('[data-alerts="off"]')!==null);
  await click('#add-btn');await click('#cat-chips .chip[data-cat="Food"]');await click('[data-method="cash"]');
  await page.fill('#f-amount','700');await page.click('#save-tx');await w(1700);
  let notes=await page.evaluate(()=>window.__notes);
  ok('crossing 80% toasts but does not notify',/Food is at 85%/.test(await txt('#toast-text'))&&notes.length===0);
  await page.fill('#f-amount','60');await page.click('#save-tx');await w(1700);
  notes=await page.evaluate(()=>window.__notes);
  ok('crossing 90% posts a notification',notes.length===1&&/Budget alert · Food/.test(notes[0].t)&&/91%/.test(notes[0].o.body)&&notes[0].o.tag==='budget-Food',JSON.stringify(notes[0]));
  ok('badge is clear while nothing is over',await page.evaluate(()=>window.__badge)===0);
  await page.fill('#f-amount','100');await page.click('#save-tx');await w(1700);
  notes=await page.evaluate(()=>window.__notes);
  ok('exceeding the budget posts a second notification and sets the badge to 1',notes.length===2&&/exceeded/.test(notes[1].o.body)&&await page.evaluate(()=>window.__badge)===1);
  await page.fill('#f-amount','20');await page.click('#save-tx');await w(1700);
  ok('further spends while over do not notify again',(await page.evaluate(()=>window.__notes)).length===2);
  await click('nav [data-go="settings"]');await click('[data-alerts="off"]');
  ok('alerts can be turned off and the choice is stored',/AlertsonthisphoneOff/.test((await txt('#main')).replace(/\s+/g,''))&&await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).meta.alerts,KEY)===false);
  await click('[data-del-budget="Food"]');await w(200);
  ok('removing the over budget clears the badge',await page.evaluate(()=>window.__badge)===0);
  await page.evaluate(()=>{window.__perm='denied';});await click('nav [data-go="dashboard"]');await click('nav [data-go="settings"]');
  ok('denied permission is reported as blocked',/Blocked in iPhone Settings/.test(await txt('#main')));

  ok('no page errors',errors.length===0,errors.join('|'));
  console.log(results.join('\n'));await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
