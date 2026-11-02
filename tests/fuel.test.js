const {chromium}=require('playwright');
const SHOTS=''+__dirname+'/shots';require('fs').mkdirSync(SHOTS,{recursive:true});
const FILE='file://'+require('path').resolve(__dirname,'../index.html');
const KEY='money-tracker.v1';
const results=[];const ok=(n,c,x)=>results.push((c?'PASS ':'FAIL ')+n+(x?' — '+x:''));const w=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const browser=await chromium.launch();
  const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const txt=async s=>(await page.textContent(s))||'';const click=async s=>{await page.click(s);await w(160);};
  const data=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  await page.goto(FILE);await w(300);await page.fill('#w-first','Shreya');await click('#w-go');
  await click('#add-btn');

  // the card is closed until the Fuel button opens it; opening switches the main form to Fuel
  ok('fuel card is hidden by default behind a Fuel button',await page.$('#fuel-card')===null&&await page.$('#fuel-toggle')!==null&&await page.$eval('#cat-chips .chip.on',e=>e.dataset.cat)==='Food');
  await click('#fuel-toggle');
  ok('Fuel button opens the card first on Add and asks for a vehicle',await page.$('#fuel-card #veh-name')!==null&&await page.$eval('#main .view > :nth-child(2)',e=>e.id)==='fuel-card'&&await page.$eval('#fuel-toggle',e=>e.classList.contains('on')));
  ok('opening Fuel selects the Fuel category on the main form too',await page.$eval('#cat-chips .chip.on',e=>e.dataset.cat)==='Fuel');
  await click('#fuel-card [data-fuel-close]');
  ok('close button hides the card',await page.$('#fuel-card')===null&&!(await page.$eval('#fuel-toggle',e=>e.classList.contains('on'))));
  await click('#fuel-toggle');
  await page.fill('#veh-name','Swift');await page.press('#veh-name','Enter');await w(200);
  ok('vehicle added and selected',(await data()).vehicles.length===1&&await page.$eval('#fuel-card .chip[data-veh].on .t',e=>e.textContent)==='Swift');
  ok('no card yet: button says to choose one',/Choose the credit card…/.test(await txt('#fuel-card')));
  await click('#fuel-card [data-open-pick="card"]');await page.fill('#pick-search','regalia gold');await w(100);await click('#pick-list [data-pick="HDFC Bank Regalia Gold"]');
  ok('picker returns to the fuel card with the card chosen',await page.$eval('#sheet',e=>e.hidden)&&await page.$eval('#fuel-card .chip[data-fuel-acct].on .t',e=>e.textContent)==='HDFC Bank Regalia Gold');
  await page.fill('#fuel-amount','2000');await w(50);
  ok('button reads the whole fill',/Log fuel · ₹2,000 · Swift · HDFC Bank Regalia Gold/.test(await txt('#fuel-save')));
  await click('#fuel-save');await w(200);
  const d1=await data();
  ok('fill saved as a Fuel expense on the card with the vehicle',d1.tx.length===1&&d1.tx[0].category==='Fuel'&&d1.tx[0].method==='card'&&d1.tx[0].vehicleId===d1.vehicles[0].id&&/Saved/.test(await txt('#fuel-save')));
  ok('recent row names the vehicle',/Fuel · Swift/.test(await txt('#recent')));
  await w(900);
  ok('amount clears after a save, ready for the next fill',(await page.inputValue('#fuel-amount'))===''&&/₹2,000 this month · 1 fill/.test(await txt('#fuel-card'))&&/^Log fuel · Swift · HDFC Bank Regalia Gold$/.test(await txt('#fuel-save')));

  // second vehicle, second card, statement day shows the bill
  await click('#fuel-card [data-veh-new]');await page.fill('#veh-name','Activa');await click('#veh-add');
  ok('second vehicle starts blank',await page.$eval('#fuel-card .chip[data-veh].on .t',e=>e.textContent)==='Activa'&&(await page.inputValue('#fuel-amount'))===''&&await page.$eval('#fuel-card .chip[data-fuel-acct].on .t',e=>e.textContent)==='HDFC Bank Regalia Gold');
  await click('#fuel-card [data-open-pick="card"]');await page.fill('#pick-search','amex platinum travel');await w(100);await click('#pick-list [data-pick="American Express Platinum Travel"]');
  await page.fill('#fuel-amount','300');await click('#fuel-save');await w(1000);
  ok('two cards now sit as chips',await page.$$eval('#fuel-card .chip[data-fuel-acct]',l=>l.length)===2);
  await click('#fuel-card .chip[data-veh]:has-text("Swift")');
  ok('switching vehicle restores its own last card, amount stays empty',(await page.inputValue('#fuel-amount'))===''&&await page.$eval('#fuel-card .chip[data-fuel-acct].on .t',e=>e.textContent)==='HDFC Bank Regalia Gold');
  await page.fill('#fuel-amount','123');await click('#fuel-card [data-veh-new]');await page.fill('#veh-name','Scrap');
  await click('#fuel-card [data-fuel-close]');await click('#fuel-toggle');
  ok('closing the card clears the typed amount and the vehicle box',(await page.inputValue('#fuel-amount'))===''&&await page.$('#veh-name')===null&&(await data()).vehicles.length===2);
  await click('nav [data-go="settings"]');
  const amex=(await data()).accounts.find(a=>a.name==='American Express Platinum Travel').id;
  await page.selectOption('select[data-stmt="'+amex+'"]','15');await w(200);
  await click('#add-btn');
  ok('fuel stays open while moving between screens in a session',await page.$('#fuel-card')!==null);
  await click('#fuel-card .chip[data-fuel-acct="'+amex+'"]');await page.fill('#fuel-amount','2000');await w(60);
  ok('card chip shows its bill and the hint shows the bill after this fill',/American Express Platinum Travel\s*bill so far ₹300/.test(await txt('#fuel-card'))&&/After this, American Express Platinum Travel bill so far ₹2,300 \(closes 15 /.test(await txt('#fuel-hint')));
  await page.fill('#fuel-amount','');
  await page.screenshot({path:SHOTS+'/01-fuel-card.png',fullPage:true});

  // Month screen fuel card
  await click('nav [data-go="dashboard"]');
  const m=await txt('#main');
  ok('Month screen has the Fuel card with totals',/Fuel/.test(m)&&/Filled on 1 of \d+ days/.test(m)&&/Fills2/.test(m.replace(/\s+/g,''))&&/₹2,300/.test(m));
  ok('fill map marks today',await page.$('.fdays .fd.on.today')!==null&&await page.$$eval('.fdays .fd',l=>l.length)===new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate());
  ok('per-vehicle rows',/Swift/.test(m)&&/Activa/.test(m)&&/1 fill · ₹2,000 each/.test(m));
  ok('fuel share of the Amex bill',/American Express Platinum Travel · fuel is ₹300 of this bill/.test(m));
  await click('.prow[data-detail^="veh|"]');
  ok('vehicle sheet lists the fills',/Swift · fuel/.test(await txt('#sheet-head'))&&/Fills/.test(await txt('#sheet-body'))&&/₹2,000/.test(await txt('#sheet-body')));
  await click('#sheet button[data-close]');
  await page.screenshot({path:SHOTS+'/02-fuel-month.png',fullPage:true});

  // CSV + settings removal
  await click('nav [data-go="settings"]');await click('#csv');await w(300);
  const csv=await page.evaluate(()=>document.querySelector('#import-text').value);
  ok('CSV has a Vehicle column',/,Vehicle$/m.test(csv.split('\n')[0])&&/Fuel,Online · Credit card,HDFC Bank Regalia Gold,,,Swift/.test(csv),csv.split('\n')[2]);
  await click('[data-del-veh]');
  ok('removing a vehicle keeps its fills',(await data()).vehicles.length===1&&(await data()).tx.length===2);

  ok('no horizontal scroll',await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
  ok('no page errors',errors.length===0,errors.join('|'));
  console.log(results.join('\n'));await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
