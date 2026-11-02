import { SheetView, closeSheet, renderSheet, sheetState } from './index';
import { calcEval } from '../../lib/calc';
import { form, fuel, ui } from '../../ui/state';
import { el, esc } from '../../lib/constants';
import { money } from '../../lib/dates';
import { toast } from '../../ui/toast';
import { fuelBtnLabel, fuelHint } from '../add';
/* Calculator sheet over an amount field. */
export function calcSheet(p:string[]):SheetView{
    const r=calcEval(ui.calcExpr),keys=[['C','op'],['⌫','op'],['%','op'],['÷','op'],['7'],['8'],['9'],['×','op'],['4'],['5'],['6'],['−','op'],['1'],['2'],['3'],['+','op'],['00'],['0'],['.'],['=','eq']];
    return {title:'Calculator',sub:'Add up a bill, split it, take a percentage',body:`<div class="calc-disp"><span class="calc-expr" id="calc-expr">${esc(ui.calcExpr)}</span><span class="calc-res" id="calc-res">${Number.isFinite(r)&&/[+×÷−%]/.test(ui.calcExpr)?'= '+esc(money(r)):''}</span></div>
      <div class="calc-keys">${keys.map(([k,c])=>`<button type="button" class="${c||''}" data-ck="${k}">${k}</button>`).join('')}</div>
      <button type="button" class="btn-primary" style="margin-top:12px" data-calc-use>Use ${Number.isFinite(r)?esc(money(r)):'amount'}</button>`};
}
export function calcKey(k:string){
  if(k==='C')ui.calcExpr='';else if(k==='⌫')ui.calcExpr=ui.calcExpr.slice(0,-1);
  else if(k==='='){const r=calcEval(ui.calcExpr);if(Number.isFinite(r))ui.calcExpr=String(r);}
  else{const last=ui.calcExpr.slice(-1),isOp=(c:string)=>/[+×÷−]/.test(c);if(isOp(k)&&(ui.calcExpr===''||isOp(last)))ui.calcExpr=ui.calcExpr===''?'':ui.calcExpr.slice(0,-1)+k;else ui.calcExpr+=k;}
  renderSheet();
}
export function calcUse(){
  const r=calcEval(ui.calcExpr);if(!Number.isFinite(r)||r<0){toast('That does not add up yet');return;}
  const v=String(r);
  if(ui.calcTarget==='form'){form.amount=v;closeSheet();const i=el('#f-amount');if(i){i.value=v;i.focus();}return;}
  if(ui.calcTarget==='fuel'){fuel.amount=v;closeSheet();const i=el('#fuel-amount');if(i){i.value=v;}const b=el('#fuel-save'),h=el('#fuel-hint');if(b)b.textContent=fuelBtnLabel();if(h)h.textContent=fuelHint();return;}
  ui.sheetStack.pop();const st=sheetState();if(st)st.amount=v;renderSheet();
}
