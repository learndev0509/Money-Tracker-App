import { SheetView, closeSheet } from './index';
import { form, ui } from '../../ui/state';
import { S, save } from '../../data/storage';
import { acct, chooseMsg } from '../../queries/ledger';
import { addMonths, daysInMonth, monthLabel, thisMonth, today } from '../../lib/dates';
import { editFormHTML } from './forms';
import { parseAmt } from '../../lib/calc';
import { toast } from '../../ui/toast';
import { render } from '../../ui/render';
import { MON, ordinal, uid } from '../../lib/constants';
import { remember } from '../../ui/pay';
import { applyRecurring } from '../../queries/recurring';
/* Recurring entry sheet (new or existing) and its save. */
export function recurSheet(p:string[]):SheetView{
    if(p[1]==='new'){if(!ui.editRec||ui.editRec.id){const day=1;ui.editRec={id:'',kind:'expense',amount:'',category:S.categories[0]||'Other',method:'bank',accountId:acct(form.lastBank)?form.lastBank:'',day,note:'',date:'',time:'',since:Math.min(day,daysInMonth(thisMonth()))<=+today().slice(8,10)?'next':'this',active:true};}}
    else if(!ui.editRec||ui.editRec.id!==p[1]){const r=S.recurring.find(x=>x.id===p[1]);if(!r)return {title:'Recurring expense',body:'<div class="hint">This recurring expense was deleted.</div>'};ui.editRec={...r,amount:String(r.amount),date:'',time:''};}
    const er=ui.editRec;return {title:er.id?'Recurring expense':'New recurring expense',sub:er.id?(er.lastApplied?'Last added in '+monthLabel(er.lastApplied):'Not added yet'):'Logged for you on the day you choose, every month',body:editFormHTML(er,'recur'),tall:true};
}
export function saveRecur(){
  const st=ui.editRec;if(!st)return;
  const amt=parseAmt(st.amount);if(!(amt>0)){toast('Enter an amount');return;}
  if(!st.category){toast('Pick a category');return;}
  if(st.method!=='cash'&&!acct(st.accountId)){toast(chooseMsg(st.method));return;}
  const rec={kind:(st.kind==='income'?'income':'expense') as 'income'|'expense',amount:Math.round(amt*100)/100,category:st.category,method:st.method,accountId:st.method==='cash'?'cash':st.accountId,day:Math.min(31,Math.max(1,+(st.day??0)||1)),note:String(st.note||'').trim(),active:st.active!==false};
  if(st.id){const r=S.recurring.find(x=>x.id===st.id);if(r)Object.assign(r,rec);save();closeSheet();render(false);toast('Recurring entry updated');return;}
  const r=Object.assign({id:uid(),since:st.since==='next'?addMonths(thisMonth(),1):thisMonth(),lastApplied:''},rec);
  S.recurring.push(r);save();remember(acct(r.accountId));closeSheet();
  const added=applyRecurring();render(false);if(!added)toast('Recurring entry added · first on the '+ordinal(r.day)+(r.since===thisMonth()?'':' of '+MON[+r.since.slice(5,7)-1]));
}
