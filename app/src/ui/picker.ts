import { esc, norm } from '../lib/constants';
import { form, fuel, ui } from './state';
import { S } from '../data/storage';
import { activeAccounts, lastUsed } from '../queries/ledger';
import { shortDate } from '../lib/dates';
import { BANK_ALIAS, DIR, type DirEntry } from '../lib/directory';
import type { Account } from '../data/model';
import { SEARCH_SVG } from '../lib/icons';
/* ---------- picker (bank / card directory with search) ---------- */
export function pickListHTML(type:'bank'|'card',ctx:string){
  const q=norm(ui.pickQuery.replace(/&/g,'')),qFull=norm(ui.pickQuery),toks=q?q.split(' '):[],inSettings=ctx==='settings';
  const stSel=ctx==='edit'?ui.editTx:ctx==='recur'?ui.editRec:ctx==='cash'?ui.editCash:ctx==='income'?ui.editIncome:ctx==='fuel'?fuel:form;
  const mine=(inSettings?S.accounts.filter(a=>a.type===type):activeAccounts(type)).map(a=>({a,u:lastUsed(a.id),n:S.tx.filter(t=>t.accountId===a.id).length})).sort((x,y)=>y.u.localeCompare(x.u));
  const selId=inSettings||!stSel?null:stSel.accountId;
  const mineSub=(x:{a:Account;u:string;n:number})=>inSettings?(x.a.archived?'Hidden · tap to show again':'Already in your list'):(x.n?x.n+' expense'+(x.n===1?'':'s')+(x.u?' · last '+shortDate(x.u.slice(0,10)):''):'Added by you');
  const mineNorm=new Set(mine.map(x=>norm(x.a.name)));
  const dir=DIR[type].filter(e=>!mineNorm.has(norm(e.name)));
  const hit=(h:string)=>toks.every(t=>h.includes(t));
  const row=(name:string,sub:string,sel:boolean)=>`<button type="button" class="pickrow" data-pick="${esc(name)}"><span class="name">${esc(name)}${sub?'<span class="small">'+esc(sub)+'</span>':''}</span>${sel?'<span class="tick">✓</span>':''}</button>`;
  const noun=type==='bank'?'bank':'credit card';
  let html='';
  if(toks.length){
    const m1=mine.filter(x=>hit(norm(x.a.name)+' '+(BANK_ALIAS[x.a.name]||'')));
    const m2=dir.filter(e=>hit(e.hay)).slice(0,80);
    if(m1.length)html+=`<div class="pick-group">Your ${noun}s</div><div class="list">${m1.map(x=>row(x.a.name,mineSub(x),x.a.id===selId)).join('')}</div>`;
    if(m2.length)html+=`<div class="pick-group">Matches</div><div class="list">${m2.map(e=>row(e.name,e.group,false)).join('')}</div>`;
    const isQ=(n:string)=>n===q||n===qFull;
    const exact=m1.some(x=>isQ(norm(x.a.name)))||m2.some(e=>isQ(norm(e.name)));
    const any=m1.length||m2.length;
    if(!any)html=`<div class="hint" style="padding:8px 0 4px">No ${noun} matches “${esc(ui.pickQuery.trim())}”.</div><div style="margin-top:10px"><button type="button" style="width:100%" data-pick-custom>Add “${esc(ui.pickQuery.trim())}” as a new ${noun}</button></div>`;
    else if(!exact)html+=`<div style="margin-top:14px;text-align:center"><button type="button" class="btn-link" style="text-align:center" data-pick-custom>Not the one? Add “${esc(ui.pickQuery.trim())}” as your own</button></div>`;
  }else{
    if(mine.length&&!inSettings)html+=`<div class="pick-group">Your ${noun}s</div><div class="list">${mine.map(x=>row(x.a.name,mineSub(x),x.a.id===selId)).join('')}</div>`;
    const groups=new Map<string,DirEntry[]>();dir.forEach(e=>{const g=groups.get(e.group);if(g)g.push(e);else groups.set(e.group,[e]);});
    groups.forEach((list,g)=>{html+=`<div class="pick-group">${esc(g)}</div><div class="list">${list.map(e=>row(e.name,'',false)).join('')}</div>`;});
  }
  return html;
}
export function pickerBody(type:'bank'|'card',ctx:string){
  const noun=type==='bank'?'banks':'credit cards';
  return `<div class="pick-search search">${SEARCH_SVG}<input id="pick-search" type="search" placeholder="Search ${noun} (e.g. ${type==='bank'?'SBI, HDFC, Kotak':'Regalia, Amex, SBI Cashback'})" value="${esc(ui.pickQuery)}" autocomplete="off" autocorrect="off" autocapitalize="off"></div><div id="pick-list">${pickListHTML(type,ctx)}</div>`;
}

