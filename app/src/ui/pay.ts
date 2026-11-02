import { Method } from '../data/model';
import { PayState, ui } from './state';
import { Account, AccountType } from '../data/model';
import { esc, norm, uid } from '../lib/constants';
import { S, save } from '../data/storage';
import { catIcon, incIcon } from './shared';
import { INCOME_SOURCES, acctTypeOf } from '../data/model';
import { acct, activeAccounts, lastUsed } from '../queries/ledger';
import { ICON, SEARCH_SVG } from '../lib/icons';
import { form, fuel } from './state';
import { closeSheet, sheetBack } from '../screens/sheets';
import { render } from './render';
import { toast } from './toast';
import { refreshFuel, refreshPay } from '../screens/add';
/* ---------- pay block (shared by Add, Edit, Recurring, Cash) ---------- */
export function chipsHTML(list:string[],sel:string,iconFn:(c:string)=>string){return list.map(c=>`<button type="button" class="chip ${c===sel?'on':''}" data-cat="${esc(c)}">${iconFn(c)}<span class="t">${esc(c)}</span></button>`).join('')||'<span class="hint">Add a category in Settings.</span>';}
export const catChipsHTML=(sel:string)=>chipsHTML(S.categories,sel,catIcon);
export const srcChipsHTML=(sel:string)=>chipsHTML(INCOME_SOURCES,sel,incIcon);
export function payBlockHTML(st:PayState,ctx:string,mode?:string){
  if(mode==='bank')st.method='bank';
  else if(mode==='in'&&st.method!=='cash'){st.method='bank';const a=acct(st.accountId);if(a&&a.type!=='bank')st.accountId='';}
  const online=st.method!=='cash';
  let html='';
  if(mode!=='bank')html+=`<h2>${mode==='in'?'Received into':'Paid with'}</h2>
    <div class="seg"><button type="button" data-method="cash" class="${!online?'on':''}">${ICON.cash}Cash</button><button type="button" data-method="online" class="${online?'on':''}">${mode==='in'?ICON.bank+'Bank account':ICON.online+'Online'}</button></div>`;
  if(online){
    const type=acctTypeOf(st.method);
    if(!mode)html+=`<div class="seg seg3">${(['bank','upi','card'] as const).map(m=>`<button type="button" data-method="${m}" class="${st.method===m?'on':''}">${ICON[m]}${({bank:'Bank',upi:'UPI',card:'Card'})[m]}</button>`).join('')}</div>`;
    const sel=acct(st.accountId);
    html+=`<button type="button" class="picker" data-open-pick="${type}" data-ctx="${ctx}"><span class="pk"><span class="pk-l">${st.method==='upi'?'UPI · Bank':type==='bank'?'Bank':'Credit card'}</span><span class="pk-v ${sel?'':'ph'}">${sel?esc(sel.name):'Search all '+(type==='bank'?'banks':'credit cards')+'…'}</span></span>${SEARCH_SVG}</button>`;
    const mine=activeAccounts(type).map(a=>({a,u:lastUsed(a.id)})).sort((x,y)=>y.u.localeCompare(x.u)).slice(0,5).map(x=>x.a);
    if(sel&&!mine.some(a=>a.id===sel.id))mine.unshift(sel);
    if(mine.length)html+=`<div class="chips">${mine.map(a=>`<button type="button" class="chip ${a.id===st.accountId?'on':''}" data-acct="${a.id}"><span class="t">${esc(a.name)}</span></button>`).join('')}</div>`;
    else html+=`<div class="hint" style="margin-top:8px">Pick a ${type==='bank'?'bank':'card'} once and it stays here for one-tap next time.</div>`;
  }
  return html;
}
export function setMethodOn(st:PayState,choice:Method|'online'){
  const m:Method=choice==='online'?(form.lastOnline||(form.lastCard&&!form.lastBank?'card':'bank')):choice;
  st.method=m;
  if(m==='cash'){st.accountId='cash';return;}
  const type=acctTypeOf(m),cur=acct(st.accountId);if(cur&&cur.type===type&&!cur.archived)return;
  const rem=acct(type==='bank'?form.lastBank:form.lastCard);st.accountId=rem&&rem.type===type&&!rem.archived?rem.id:'';
}
export function remember(a:Account|undefined){if(!a)return;if(a.type==='bank')form.lastBank=a.id;else if(a.type==='card')form.lastCard=a.id;}
export function chooseAccount(name:string|undefined,type:AccountType,ctx:string){
  name=String(name||'').replace(/\|/g,'').trim();if(!name)return;
  let a=S.accounts.find(x=>x.type===type&&norm(x.name)===norm(name));
  const existed=!!a,wasHidden=!!(a&&a.archived);
  if(!a){a={id:uid(),name,type,archived:false,statementDay:null};S.accounts.push(a);save();}
  else if(a.archived){a.archived=false;save();}
  if(ctx==='settings'){closeSheet();render(false);toast(!existed?'Added '+a.name:wasHidden?a.name+' is shown again':a.name+' is already in your list');return;}
  const st:PayState|null=ctx==='edit'?ui.editTx:ctx==='recur'?ui.editRec:ctx==='cash'?ui.editCash:ctx==='income'?ui.editIncome:ctx==='fuel'?fuel:form;
  if(st){st.method=st.method==='upi'&&type==='bank'?'upi':type;st.accountId=a.id;}remember(a);
  if(ctx==='form'){closeSheet();refreshPay();}else if(ctx==='fuel'){closeSheet();refreshFuel();}else sheetBack();
}

