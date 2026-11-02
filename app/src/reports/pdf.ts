import { Income, Tx } from '../data/model';
import { SRC_LABEL, acctName, byValue, groupBy, incIn, payLabel, sortTx, sources, sum, txIn, vehName } from '../queries/ledger';
import { S } from '../data/storage';
import { dm, fmtTime, midDate, monthLabel, pct, timeKey, today } from '../lib/dates';
import { METHODS } from '../data/model';
import { toast } from '../ui/toast';
import { download } from './backup';
/* ---------- PDF report (no library: A4, Helvetica, vector rupee sign) ---------- */
export const PDF_W=[278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584],PDF_WB=[278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584],PDF_RUPEE:[string,...number[]][]=[["m",0.4384,0.0],["m",0.1748,0.3524],["l",0.0,0.3524],["l",0.0,0.5086],["l",0.1734,0.5086],["q",0.245,0.5086,0.293,0.5308],["q",0.341,0.553,0.3467,0.6117],["l",0.0,0.6117],["l",0.0,0.7436],["l",0.3467,0.7436],["q",0.3396,0.798,0.2916,0.8209],["q",0.2436,0.8438,0.1734,0.8438],["l",0.0,0.8438],["l",0.0,1.0],["l",0.7421,1.0],["l",0.7421,0.8438],["l",0.4413,0.8438],["l",0.4413,0.8367],["q",0.4714,0.8309,0.4986,0.8087],["q",0.5258,0.7865,0.5416,0.7436],["l",0.7421,0.7436],["l",0.7421,0.6117],["l",0.5545,0.6117],["q",0.5473,0.5301,0.5057,0.4764],["q",0.4642,0.4226,0.3911,0.3911],["l",0.692,0.0],["z"]];
export interface PdfOpts{bold?:boolean;align?:'right'|'center';color?:string}
export const pdfWidth=(str:string,size:number,bold?:boolean)=>{const t=bold?PDF_WB:PDF_W;let w=0;for(const ch of String(str)){const c=ch.charCodeAt(0);w+=c>=32&&c<=126?t[c-32]:556;}return w*size/1000;};
export const pdfText=(str:string)=>'('+String(str).replace(/[^\x20-\x7e\u00a0-\u00ff\u2018\u2019\u201c\u201d\u2013\u2014\u2026]/g,'?').replace(/\u2026/g,'\x85').replace(/\u2018/g,'\x91').replace(/\u2019/g,'\x92').replace(/\u201c/g,'\x93').replace(/\u201d/g,'\x94').replace(/\u2013/g,'\x96').replace(/\u2014/g,'\x97').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')+')';
export function pdfDoc(){
  const pages:string[][]=[];let ops:string[]=[];const f=(v:number)=>(Math.round(v*100)/100).toString();
  const page=()=>{ops=[];pages.push(ops);};page();
  const api={
    W:595.28,H:841.89,
    newPage:page,pageNo:()=>pages.length,
    text(x:number,y:number,str:string,size:number,o:PdfOpts={}){const w=pdfWidth(str,size,o.bold);const tx=o.align==='right'?x-w:o.align==='center'?x-w/2:x;ops.push(`BT /${o.bold?'F2':'F1'} ${f(size)} Tf ${o.color||'0 g'} ${f(tx)} ${f(y)} Td ${pdfText(str)} Tj ET`);return w;},
    rupee(x:number,y:number,size:number,color?:string){const s=size*0.72,b=y+size*0.01;ops.push((color||'0 g')+' '+PDF_RUPEE.map(([c,...n])=>c==='m'?`${f(x+n[0]*s)} ${f(b+n[1]*s)} m`:c==='l'?`${f(x+n[0]*s)} ${f(b+n[1]*s)} l`:c==='q'?(()=>{const [cx,cy,ex,ey]=[x+n[0]*s,b+n[1]*s,x+n[2]*s,b+n[3]*s];return `${f(cx)} ${f(cy)} ${f(cx)} ${f(cy)} ${f(ex)} ${f(ey)} c`;})():'h').join(' ')+' f');return s*0.74;},
    amount(x:number,y:number,v:number,size:number,o:PdfOpts={}){const str=Math.abs(v).toLocaleString('en-IN',{minimumFractionDigits:v%1?2:0,maximumFractionDigits:2}),w=pdfWidth(str,size,o.bold),rw=size*0.72*0.74+size*0.12;const start=o.align==='right'?x-w-rw:x;api.rupee(start,y,size,o.color);api.text(start+rw,y,str,size,{bold:o.bold,color:o.color});},
    line(x1:number,y1:number,x2:number,y2:number,w?:number,color?:string){ops.push(`${color||'0.85 G'} ${f(w||0.5)} w ${f(x1)} ${f(y1)} m ${f(x2)} ${f(y2)} l S`);},
    rect(x:number,y:number,w:number,h:number,fill:string){ops.push(`${fill} ${f(x)} ${f(y)} ${f(w)} ${f(h)} re f`);},
    fit(str:string,size:number,maxW:number,bold?:boolean){str=String(str);if(pdfWidth(str,size,bold)<=maxW)return str;while(str.length&&pdfWidth(str+'…',size,bold)>maxW)str=str.slice(0,-1);return str+'…';},
    build(){
      const objs:string[]=[];const add=(s:string)=>{objs.push(s);return objs.length;};
      const font1=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'),font2=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
      const pagesId=objs.length+1+pages.length*2;const kids:number[]=[];
      pages.forEach(p=>{const stream=p.join('\n');const c=add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${api.W} ${api.H}] /Contents ${c} 0 R /Resources << /Font << /F1 ${font1} 0 R /F2 ${font2} 0 R >> >> >>`));});
      add(`<< /Type /Pages /Kids [${kids.map(k=>k+' 0 R').join(' ')}] /Count ${kids.length} >>`);
      const cat=add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
      let out='%PDF-1.4\n%\xe2\xe3\xcf\xd3\n';const offs:number[]=[];objs.forEach((o,i)=>{offs.push(out.length);out+=`${i+1} 0 obj\n${o}\nendobj\n`;});
      const xref=out.length;out+=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`+offs.map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${objs.length+1} /Root ${cat} 0 R >>\nstartxref\n${xref}\n%%EOF`;
      return Uint8Array.from(Array.from(out),ch=>ch.charCodeAt(0)&255);
    }
  };
  return api;
}
export function monthReportPDF(k:string){
  const tx=txIn(k).slice().sort((a,b)=>sortTx(b,a)),inc=incIn(k).slice().sort((a,b)=>sortTx(b,a));
  const rows:{t:Tx|Income;kind:'in'|'out'}[]=[...inc.map(t=>({t,kind:'in' as const})),...tx.map(t=>({t,kind:'out' as const}))].sort((a,b)=>sortTx(b.t,a.t));
  const totalIn=sum(inc),totalOut=sum(tx),name=(S.profile.firstName+' '+S.profile.lastName).trim();
  const d=pdfDoc(),L=40,R=d.W-40,ink='0.07 g',mute='0.45 g',green='0.08 0.5 0.3 rg',red='0.78 0.2 0.2 rg';
  const cols={date:L,note:L+44,pay:L+214,credit:L+388,debit:L+452,bal:R};
  let y = 0;
  const header=(first:boolean)=>{
    y=d.H-48;
    if(first){
      d.text(L,y,'Money tracker',10,{color:mute});d.text(R,y,'Generated '+midDate(today())+' at '+fmtTime(timeKey(new Date())),9,{align:'right',color:mute});y-=26;
      d.text(L,y,monthLabel(k)+' expense report',20,{bold:true,color:ink});y-=16;
      if(name)d.text(L,y,name,10,{color:mute});y-=26;
      const tiles:[string,number,string][]=[['Money in',totalIn,green],['Total expenses',totalOut,red],['Balance',totalIn-totalOut,totalIn-totalOut>=0?ink:red]];const tw=(R-L-20)/3;
      tiles.forEach((t,i)=>{const x=L+i*(tw+10);d.rect(x,y-40,tw,46,'0.96 g');d.text(x+10,y-8,t[0],8.5,{color:mute});d.amount(x+10,y-30,t[1],14,{bold:true,color:t[2]});});
      y-=58;d.text(L,y,'Entries: '+rows.length+(inc.length?' · '+inc.length+' money in':'')+' · '+tx.length+' expense'+(tx.length===1?'':'s'),9,{color:mute});y-=16;
    }
    d.text(L,28,'Money tracker by Zestera · '+monthLabel(k),8,{color:mute});d.text(R,28,'Page '+d.pageNo(),8,{color:mute,align:'right'});
    d.rect(L,y-6,R-L,18,'0.93 g');
    d.text(cols.date+6,y,'Date',8.5,{bold:true,color:ink});d.text(cols.note,y,'Notes',8.5,{bold:true,color:ink});d.text(cols.pay,y,'Paid with',8.5,{bold:true,color:ink});
    d.text(cols.credit,y,'Credit',8.5,{bold:true,color:ink,align:'right'});d.text(cols.debit,y,'Debit',8.5,{bold:true,color:ink,align:'right'});d.text(cols.bal,y,'Balance',8.5,{bold:true,color:ink,align:'right'});
    y-=22;
  };
  header(true);let bal=0;
  rows.forEach(r=>{
    if(y<70){d.newPage();header(false);}
    const t=r.t;bal+=r.kind==='in'?t.amount:-t.amount;
    d.text(cols.date+6,y,dm(t.date),9,{color:ink});
    const label=r.kind==='in'?(t.note?t.note+' ('+t.category+')':t.category+' received'):(t.note?t.note+' · '+t.category:t.category)+('vehicleId' in t&&t.vehicleId&&vehName(t.vehicleId)?' · '+vehName(t.vehicleId):'');
    d.text(cols.note,y,d.fit(label,9,cols.pay-cols.note-10),9,{color:ink});
    d.text(cols.pay,y,d.fit(r.kind==='in'?(t.method==='cash'?'Cash':acctName(t.accountId)):payLabel(t),8.5,108),8.5,{color:mute});
    if(r.kind==='in')d.amount(cols.credit,y,t.amount,9,{align:'right',color:green});else d.amount(cols.debit,y,t.amount,9,{align:'right',color:red});
    d.amount(cols.bal,y,bal,9,{align:'right',color:bal<0?red:ink});
    d.line(L,y-6,R,y-6,0.4,'0.9 G');y-=17;
  });
  if(y<100){d.newPage();y=d.H-60;}
  y-=6;d.rect(L,y-6,R-L,20,'0.93 g');d.text(cols.date+6,y,'Final balance',9.5,{bold:true,color:ink});d.amount(cols.credit,y,totalIn,9.5,{align:'right',bold:true,color:green});d.amount(cols.debit,y,totalOut,9.5,{align:'right',bold:true,color:red});d.amount(cols.bal,y,bal,9.5,{align:'right',bold:true,color:bal<0?red:ink});y-=34;
  const cats=groupBy(tx,t=>t.category).sort(byValue),srcs=sources(tx);
  if(cats.length){
    if(y<120+cats.length*15){d.newPage();y=d.H-60;}
    d.text(L,y,'By category',12,{bold:true,color:ink});d.text(R,y,'Paid with',12,{bold:true,color:ink,align:'right'});y-=18;
    const mid=L+(R-L)/2;
    const pc=(v:number)=>{const q=pct(v,totalOut);return (q===0&&v>0?'<1':q)+'%';};
    cats.forEach(g=>{d.text(L,y,d.fit(g.key,9,mid-L-120),9,{color:ink});d.text(mid-60,y,pc(g.v),9,{color:mute,align:'right'});d.amount(mid-16,y,g.v,9,{align:'right',color:ink});y-=15;});
    let y2=y+15*cats.length;METHODS.filter(m=>srcs[m]>0).forEach(m=>{d.text(mid+16,y2,SRC_LABEL[m],9,{color:ink});d.text(R-60,y2,pc(srcs[m]),9,{color:mute,align:'right'});d.amount(R,y2,srcs[m],9,{align:'right',color:ink});y2-=15;});
  }
  const bytes=d.build();
  return {bytes,name:'money-tracker-'+k+'.pdf'};
}
export function exportPDF(k:string){
  if(!txIn(k).length&&!incIn(k).length){toast('Nothing in '+monthLabel(k)+' to report');return;}
  const {bytes,name}=monthReportPDF(k);
  const file=new File([bytes],name,{type:'application/pdf'});
  if(navigator.canShare&&navigator.canShare({files:[file]})){navigator.share({files:[file],title:monthLabel(k)+' expense report'}).then(()=>toast('Report shared'),()=>{});return;}
  if(download(name,bytes,'application/pdf'))toast('Report downloaded · '+monthLabel(k));else toast('Download is not available here; open the hosted copy');
}

