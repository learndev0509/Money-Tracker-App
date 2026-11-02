import { ui } from '../../ui/state';
import { el, esc } from '../../lib/constants';
/*
 * The sheet stack: a detail string 'kind|arg|arg' names what to show; the kind picks a builder from
 * SHEETS, which returns the title, subtitle and body. Sheets stack (Back pops), and the drafts being
 * edited live in ui.editTx / editRec / editCash / editIncome until the sheet closes.
 */
import { calcSheet } from './calc';
import { cashFormSheet, cashListSheet } from './cash';
import { editSheet, txSheet } from './expense';
import { incSheet, incomeFormSheet } from './income';
import { installSheet, privacySheet, termsSheet } from './legal';
import { catAcctSheet, daySheet, monthSheet, vehSheet } from './period';
import { pickSheet } from './pick';
import { pinSheet } from './pin';
import { recurSheet } from './recurring';
import { trendSheet } from './trend';
export * from './forms';
export * from './pick';
export * from './expense';
export * from './recurring';
export * from './income';
export * from './cash';
export * from './calc';
export * from './trend';
export * from './legal';
export * from './pin';
export * from './period';

export interface SheetView{title:string;sub?:string;body:string;tall?:boolean;focus?:string}
/** Sheet kind (the part before the first '|') to the builder that renders it. */
const SHEETS:Record<string,(p:string[])=>SheetView>={
  pick:pickSheet,edit:editSheet,tx:txSheet,recur:recurSheet,incomeform:incomeFormSheet,inc:incSheet,cashform:cashFormSheet,cash:cashListSheet,calc:calcSheet,trend:trendSheet,
  privacy:privacySheet,terms:termsSheet,install:installSheet,pin:pinSheet,veh:vehSheet,day:daySheet,cat:p=>catAcctSheet(p,'cat'),acct:p=>catAcctSheet(p,'acct'),month:monthSheet,
};
export function sheetContent(detail:string):SheetView{const p=detail.split('|');return Object.hasOwn(SHEETS,p[0])?SHEETS[p[0]](p):{title:'Details',body:''};}

export function openSheet(detail:string){ui.sheetStack.push(detail);renderSheet();}
export function sheetBack(){ui.sheetStack.pop();if(ui.sheetStack.length)renderSheet();else closeSheet();}
export function closeSheet(){el('#sheet').classList.remove('over');ui.sheetStack=[];ui.pending=null;ui.pickQuery='';ui.editTx=null;ui.editRec=null;ui.editCash=null;ui.editIncome=null;el('#sheet').hidden=true;el('#sheet-panel').classList.remove('tall');document.body.classList.remove('locked');}
export function renderSheet(){
  const d=ui.sheetStack[ui.sheetStack.length-1];const r=sheetContent(d);
  el('#sheet-head').innerHTML=`<div class="sheet-title">${esc(r.title)}</div>${r.sub?`<div class="sheet-sub">${esc(r.sub)}</div>`:''}`;
  el('#sheet-body').innerHTML=r.body;
  el('#sheet-back').hidden=ui.sheetStack.length<2;
  el('#sheet-panel').classList.toggle('tall',!!r.tall);
  el('#sheet').hidden=false;document.body.classList.add('locked');el('#sheet-body').scrollTop=0;
  if(r.focus){const f=el(r.focus);if(f)try{f.focus({preventScroll:true});}catch(e){}}
}
export const topKind=()=>String(ui.sheetStack[ui.sheetStack.length-1]||'').split('|')[0];
export const sheetState=()=>{const k=topKind();return k==='edit'?ui.editTx:k==='recur'?ui.editRec:k==='cashform'?ui.editCash:k==='incomeform'?ui.editIncome:null;};
