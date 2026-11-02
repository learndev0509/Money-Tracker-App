import { View } from '../lib/constants';
import { S } from '../data/storage';
import { ui } from './state';
import { DAYS, MONTHS, el, reduceMotion } from '../lib/constants';
import { rAdd } from '../screens/add';
import { rDash } from '../screens/dashboard';
import { rHist } from '../screens/history';
import { rSettings } from '../screens/settings';
import { updateBadge } from './notify';
import { fmtTime, money, timeKey } from '../lib/dates';
export function applyTheme(){const t=S.meta.theme;if(t)document.documentElement.dataset.theme=t;else delete document.documentElement.dataset.theme;}
export function go(v:View){const changed=v!==ui.view;ui.view=v;try{if(location.hash!=='#'+v)location.hash=v;}catch(e){}render(changed);}

export function render(entering:boolean){
  const m=el('#main');
  m.classList.toggle('enter',!!entering&&!reduceMotion());
  m.innerHTML=({add:rAdd,dashboard:rDash,history:rHist,settings:rSettings})[ui.view]();
  document.querySelectorAll<HTMLElement>('.tab').forEach(b=>b.classList.toggle('on',b.dataset.go===ui.view));
  moveTabInd();updateBadge();
  if(entering){window.scrollTo(0,0);countUp();}
  updateClock();
}
export function slideMain(cls:string){if(reduceMotion())return;const m=el('#main');m.classList.remove('slide-l','slide-r');void m.offsetWidth;m.classList.add(cls);m.addEventListener('animationend',()=>m.classList.remove(cls),{once:true});}
export const ADD_BTN='<button type="button" class="btn-add" id="add-btn" data-go="add" aria-label="Add expense"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button>';
export function moveTabInd(){
  const ic=el('nav .tab.on .ic'),ind=el('.tab-ind');if(!ind)return;if(!ic){ind.classList.remove('live');return;}
  const parent=ind.parentElement;if(!parent)return;const r=ic.getBoundingClientRect(),b=parent.getBoundingClientRect();
  ind.style.transform=`translate(${r.left-b.left}px,${r.top-b.top}px)`;
  if(!ind.classList.contains('live'))requestAnimationFrame(()=>ind.classList.add('live'));
}
export function countUp(){
  if(reduceMotion())return;
  document.querySelectorAll<HTMLElement>('[data-count]').forEach(e=>{const to=+(e.dataset.count||0);if(!to)return;const t0=performance.now(),dur=650;const step=(now:number)=>{const p=Math.min(1,(now-t0)/dur),v=to*(1-Math.pow(1-p,3));e.textContent=money(p<1?Math.round(v):to);if(p<1)requestAnimationFrame(step);};requestAnimationFrame(step);});
}
export function updateClock(){
  const d=el('#clock-day'),r=el('#clock-rest');if(!d||!r)return;const n=new Date();
  d.textContent=DAYS[n.getDay()];r.textContent=n.getDate()+' '+MONTHS[n.getMonth()]+' '+n.getFullYear()+' · '+fmtTime(timeKey(n));
}
