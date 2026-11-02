import { addMonths, compact, daysInMonth, dm, longDate, money, monthLabel, pct, shortDate } from '../../lib/dates';
import { acctName, billSoFar, byValue, fuelIn, groupBy, methodOf, sortTx, sum, txIn, vehName } from '../../queries/ledger';
import { SheetView } from './index';
import { acctRows, catRows, sourceSection, tiles, txRow } from '../../ui/shared';
import { S } from '../../data/storage';
import { cashBalance, hasCashActivity } from '../../queries/cash';
import { esc } from '../../lib/constants';
import { budgetColor, budgetText } from '../../queries/budgets';
/* Drill-down sheets: a day, a month, a category or account in a month, a vehicle's fuel. */
export function vsPrev(k:string,total:number){const p=addMonths(k,-1),pv=sum(txIn(p));if(!pv)return '—';const d=(total-pv)/pv;return (d<=0?'▼ ':'▲ ')+Math.abs(Math.round(d*100))+'%';}
export function vehSheet(p:string[]):SheetView{
    const k=p[1],items=fuelIn(k).filter(t=>t.vehicleId===p[2]).sort(sortTx),total=sum(items);
    return {title:(vehName(p[2])||'No vehicle')+' · fuel',sub:monthLabel(k),body:items.length?`${tiles([['Total',money(total)],['Fills',items.length],['Per fill',compact(total/items.length)],['Biggest',compact(items.slice().sort((a,b)=>b.amount-a.amount)[0].amount)]])}
      <h3>Paid with</h3><div class="list">${acctRows(items,total,'cash',id=>'acct|'+k+'|'+id)}${acctRows(items,total,'bank',id=>'acct|'+k+'|'+id)}${acctRows(items,total,'upi',id=>'acct|'+k+'|'+id)}${acctRows(items,total,'card',id=>'acct|'+k+'|'+id)}</div>
      <h3>Fills</h3><div class="list">${items.map(txRow).join('')}</div>`:'<div class="empty"><span>No fills this month.</span></div>'};
}
export function daySheet(p:string[]):SheetView{
    const k=p[1],items=S.tx.filter(t=>t.date===k).sort(sortTx),total=sum(items),mt=sum(txIn(k.slice(0,7)));
    return {title:longDate(k),sub:items.length?items.length+' expense'+(items.length===1?'':'s'):'No expenses',body:items.length?`${tiles([['Total',money(total)],['Of month',pct(total,mt)+'%'],['Expenses',items.length],['Biggest',compact(items.slice().sort((a,b)=>b.amount-a.amount)[0].amount)]])}
      <h3>By category</h3><div class="list">${catRows(items,total,c=>'cat|'+k.slice(0,7)+'|'+c)}</div><h3>Expenses</h3><div class="list">${items.map(txRow).join('')}</div>`:'<div class="empty"><span>Nothing was spent on this day.</span></div>'};
}
export function catAcctSheet(p:string[],kind:'cat'|'acct'):SheetView{
    const k=p[1],all=txIn(k),mt=sum(all);
    const items=(kind==='cat'?all.filter(t=>t.category===p[2]):all.filter(t=>t.accountId===p[2]&&(!p[3]||methodOf(t)===p[3]))).sort(sortTx);
    const total=sum(items),title=kind==='cat'?p[2]:acctName(p[2])+(p[3]==='upi'?' · UPI':'');
    const days=groupBy(items,t=>t.date).sort(byValue)[0];
    const budget=kind==='cat'&&S.budgets[p[2]]>0?{b:S.budgets[p[2]],left:S.budgets[p[2]]-total,ratio:total/S.budgets[p[2]]}:null;
    const bill=kind==='acct'?billSoFar(p[2]):null;
    const cashLine=kind==='acct'&&p[2]==='cash'&&hasCashActivity()?`<div class="kv" style="margin-top:12px"><span>Cash in hand right now</span><b>${esc(money(cashBalance()))}</b></div>`:'';
    const extra=(budget?`<div class="kv" style="margin-top:12px"><span>Budget ${esc(money(budget.b))} a month</span><b style="color:${budgetColor(budget.ratio)}">${esc(budgetText(budget))}</b></div>`:'')+(bill?`<div class="kv" style="margin-top:12px"><span>This bill so far (${esc(dm(bill.from))} – ${esc(dm(bill.to))})</span><b>${esc(money(bill.sum))}</b></div>`:'')+cashLine;
    return {title,sub:monthLabel(k),body:(items.length||budget||bill)?`${items.length?tiles([['Total',money(total)],['Of month',pct(total,mt)+'%'],['Expenses',items.length],['Avg each',compact(total/items.length)]]):''}${extra}
      ${items.length?(kind==='cat'?`<h3>Paid with</h3><div class="list">${acctRows(items,total,'cash',id=>'acct|'+k+'|'+id)}${acctRows(items,total,'bank',id=>'acct|'+k+'|'+id)}${acctRows(items,total,'upi',id=>'acct|'+k+'|'+id)}${acctRows(items,total,'card',id=>'acct|'+k+'|'+id)}</div>`:`<h3>By category</h3><div class="list">${catRows(items,total,c=>'cat|'+k+'|'+c)}</div>`):''}
      ${days?`<div class="kv" style="margin-top:12px"><span>Heaviest day</span><b>${esc(shortDate(days.key))} · ${esc(money(days.v))}</b></div>`:''}
      ${items.length?`<h3>Expenses</h3><div class="list">${items.map(txRow).join('')}</div>`:'<div class="hint" style="margin-top:12px">No expenses here this month.</div>'}`:'<div class="empty"><span>No expenses here.</span></div>'};
}
export function monthSheet(p:string[]):SheetView{
    const k=p[1],items=txIn(k).sort(sortTx),total=sum(items),dim=daysInMonth(k);
    return {title:monthLabel(k),sub:items.length+' expense'+(items.length===1?'':'s'),body:items.length?`${tiles([['Total',money(total)],['Per day',compact(total/dim)],['vs prev month',vsPrev(k,total)],['Biggest',compact(items.slice().sort((a,b)=>b.amount-a.amount)[0].amount)]])}
      <h3>By category</h3><div class="list">${catRows(items,total,c=>'cat|'+k+'|'+c)}</div>
      <h3>Paid with</h3>${sourceSection(items,total,id=>'acct|'+k+'|'+id)}
      <button type="button" class="btn-primary" style="margin-top:16px" data-open-month="${k}">Open ${esc(monthLabel(k))} in full</button>`:'<div class="empty"><span>No expenses in this month.</span></div>'};
}
