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
  await page.goto(FILE);await w(300);
  await page.fill('#w-first','Shreya');await click('#w-go');

  // --- UPI: a third online method tied to a bank account
  await click('#add-btn');
  await click('[data-method="online"]');
  ok('online shows bank / UPI / card',await page.$('#pay-block [data-method="upi"]')!==null&&await page.$('#pay-block .seg3')!==null);
  await click('[data-method="upi"]');
  ok('UPI picker asks for the bank',/UPI · Bank/.test(await txt('#pay-block .picker .pk-l'))&&await page.$eval('#pay-block .picker',e=>e.dataset.openPick)==='bank');
  await click('[data-open-pick="bank"]');await page.fill('#pick-search','hdfc');await w(100);await click('#pick-list [data-pick="HDFC Bank"]');
  ok('bank chosen keeps UPI selected',await page.$eval('#pay-block [data-method="upi"]',e=>e.classList.contains('on')));
  await page.fill('#f-amount','250');await click('#cat-chips .chip[data-cat="Food"]');await page.fill('#f-note','Swiggy');await click('#save-tx');
  ok('saved as UPI on HDFC',(await data()).tx[0].method==='upi'&&(await data()).tx[0].accountId===(await data()).accounts.find(a=>a.name==='HDFC Bank').id&&/UPI · HDFC Bank/.test(await txt('#recent')));
  ok('UPI stays selected for the next entry',await page.$eval('#pay-block [data-method="upi"]',e=>e.classList.contains('on')));
  // a plain bank transfer on the same account
  await click('[data-method="bank"]');await page.fill('#f-amount','1000');await click('#cat-chips .chip[data-cat="Bills"]');await page.fill('#f-note','Electricity');await click('#save-tx');
  // suggestion refills UPI
  await click('[data-method="cash"]');await page.fill('#f-note','sw');await w(100);await click('#note-suggest [data-note="Swiggy"]');
  ok('note suggestion restores UPI + bank',await page.$eval('#pay-block [data-method="upi"]',e=>e.classList.contains('on'))&&/HDFC Bank/.test(await txt('#pay-block .picker .pk-v')));
  await page.fill('#f-amount','150');await click('#save-tx');

  await click('nav [data-go="dashboard"]');
  const dash=await txt('#main');
  ok('split legend shows UPI and Bank separately',/UPI ₹400/.test(dash)&&/Bank ₹1,000/.test(dash),(dash.match(/Bank ₹[\d,]+ · \d+%UPI ₹[\d,]+ · \d+%/)||[''])[0]);
  const flat=dash.replace(/\s+/g,'');
  ok('Paid with has a UPI section and the bank row carries the account total',/BankaccountsHDFCBank3expenses100%₹1,400/.test(flat)&&/UPIHDFCBank2expenses29%₹400/.test(flat),(flat.match(/Bankaccounts.{0,60}/)||[''])[0]);
  await page.screenshot({path:SHOTS+'/01-upi-dashboard.png',fullPage:true});
  const hdfc=(await data()).accounts.find(a=>a.name==='HDFC Bank').id;
  await click('.prow[data-detail="acct|'+new Date().toISOString().slice(0,7)+'|'+hdfc+'|upi"]');
  ok('UPI row opens the bank filtered to UPI',/HDFC Bank · UPI/.test(await txt('#sheet-head'))&&/₹400/.test(await txt('#sheet-body'))&&!/Electricity/.test(await txt('#sheet-body')));
  await click('#sheet .txrow');
  ok('expense sheet labels UPI with its bank',/Online · UPI/.test(await txt('#sheet-body'))&&/Bank/.test(await txt('#sheet-body')));
  await click('#sheet button[data-close]');

  await click('nav [data-go="history"]');
  await page.selectOption('#h-method','upi');await w(160);
  const r=await txt('#hist-body');
  ok('UPI payment filter narrows to UPI rows',/2 expenses · filtered/.test(r)&&/Swiggy/.test(r)&&!/Electricity/.test(r)&&/UPI/.test(r));
  await click('#hist-filters [data-hf-clear]');

  await click('nav [data-go="settings"]');
  await click('#csv');await w(300);
  const csv=await page.evaluate(()=>document.querySelector('#import-text')?document.querySelector('#import-text').value:'');
  ok('CSV separates payment and account for UPI',/Online · UPI,HDFC Bank,Swiggy/.test(csv),csv.split('\n')[1]);
  // recurring on UPI
  await click('[data-detail="recur|new"]');await page.fill('#e-amount','499');await click('#sheet .chip[data-cat="Entertainment"]');await page.fill('#e-note','Netflix');
  await click('#sheet [data-method="upi"]');
  ok('recurring form offers UPI and keeps the remembered bank',await page.$eval('#sheet [data-method="upi"]',e=>e.classList.contains('on'))&&/HDFC Bank/.test(await txt('#sheet .picker .pk-v')));
  await page.selectOption('#e-day','28');await page.selectOption('#e-since','this');await click('#sheet [data-save-recur]');
  ok('recurring row shows UPI · bank',/Netflix/.test(await txt('#main'))&&/UPI · HDFC Bank/.test(await txt('#main')));

  // --- INCOME: money in, left to spend, cash in hand, recurring salary, CSV
  await click('#add-btn');
  await click('[data-detail="incomeform|new"]');
  ok('income form: From chips, cash or bank only',await page.$('#sheet .chip[data-cat="Salary"]')!==null&&await page.$('#sheet [data-method="cash"]')!==null&&await page.$('#sheet [data-method="upi"]')===null&&await page.$('#sheet [data-method="card"]')===null);
  ok('income form pre-picks the remembered bank',/HDFC Bank/.test(await txt('#sheet .picker .pk-v')));
  await page.fill('#e-amount','50000');await click('#sheet .chip[data-cat="Salary"]');await page.fill('#e-note','October');await click('#sheet [data-save-income]');
  ok('salary saved to income, not to expenses',(await data()).income.length===1&&(await data()).income[0].method==='bank'&&(await data()).tx.length===4);
  await click('[data-detail="incomeform|new"]');await page.fill('#e-amount','2000');await click('#sheet .chip[data-cat="Gift"]');await click('#sheet [data-method="cash"]');await click('#sheet [data-save-income]');
  await click('nav [data-go="dashboard"]');
  let d=await txt('#main');
  ok('hero shows left to spend against money in',/₹50,101 left of ₹52,000 in/.test(d),(d.match(/₹[\d,]+ left of ₹[\d,]+ in/)||[''])[0]);
  ok('Money in card lists both entries',/Money in/.test(d)&&/\+₹50,000/.test(d)&&/\+₹2,000/.test(d)&&/Salary · October/.test(d));
  ok('cash gift raises cash in hand',/₹2,000/.test(await txt('.cash-big')),await txt('.cash-big'));
  await page.screenshot({path:SHOTS+'/02-income-dashboard.png',fullPage:true});
  await click('.txrow[data-detail^="inc|"]:has-text("Salary")');
  ok('income sheet',/Money in/.test(await txt('#sheet-head'))&&/Received into/.test(await txt('#sheet-body')));
  await click('#sheet [data-detail^="incomeform|"]');await page.fill('#e-amount','55000');await click('#sheet [data-save-income]');
  ok('income edited in place',(await data()).income.find(t=>t.category==='Salary').amount===55000&&(await data()).income.length===2);
  await click('.txrow[data-detail^="inc|"]:has-text("Salary")');await click('#sheet [data-del-inc]');
  ok('income delete offers undo',(await data()).income.length===1&&/Deleted ₹55,000/.test(await txt('#toast-text')));
  await click('#toast-btn');
  ok('income undo restores',(await data()).income.length===2);
  await click('.cashcard [data-detail="cash|list"]');
  ok('cash history shows the cash gift as received',/Received · Gift/.test(await txt('#sheet-body')));
  await click('#sheet button[data-close]');


  await click('nav [data-go="settings"]');
  await click('[data-detail="recur|new"]');await click('#sheet [data-kind="income"]');
  ok('recurring form switches to money in',await page.$('#sheet .chip[data-cat="Salary"]')!==null&&await page.$('#sheet [data-method="upi"]')===null&&/Add recurring income/.test(await txt('#sheet [data-save-recur]')));
  await page.fill('#e-amount','60000');await click('#sheet .chip[data-cat="Salary"]');await page.fill('#e-note','Pay day');
  await page.selectOption('#e-day','1');await page.selectOption('#e-since','this');await click('#sheet [data-save-recur]');
  ok('recurring salary added this month with auto tag',(await data()).income.some(t=>t.recurringId&&t.amount===60000&&t.date.endsWith('-01'))&&(await data()).recurring.some(r=>r.kind==='income'));
  ok('recurring list marks it as money in',/Pay day/.test(await txt('#main'))&&/in/.test(await txt('#main .txrow .tag')));
  await click('#csv');await w(300);
  const csv2=await page.evaluate(()=>document.querySelector('#import-text').value);
  ok('CSV has a Type column with income rows',/^Date,Time,Weekday,Type,/.test(csv2)&&/,Income,60000,Salary,Online · Bank account,HDFC Bank,Pay day,yes/.test(csv2),csv2.split('\n').find(l=>/Income/.test(l)));
  await page.reload();await w(400);
  ok('reload does not duplicate the recurring salary',(await data()).income.filter(t=>t.recurringId).length===1);

  ok('no horizontal scroll',await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
  ok('no page errors',errors.length===0,errors.join('|'));
  console.log(results.join('\n'));await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
