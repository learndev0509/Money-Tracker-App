import { SheetView } from './index';
/* Set / change / remove PIN sheet; the handlers live in screens/security.ts. */
export function pinSheet(p:string[]):SheetView{
    const mode=p[1];
    const cur=`<label class="f">Current PIN<input id="p-cur" type="password" inputmode="numeric" maxlength="4" pattern="\\d{4}" autocomplete="off"></label>`;
    const nw=`<label class="f">New PIN (4 digits)<input id="p-new" type="password" inputmode="numeric" maxlength="4" pattern="\\d{4}" autocomplete="off"></label><label class="f">Repeat new PIN<input id="p-new2" type="password" inputmode="numeric" maxlength="4" pattern="\\d{4}" autocomplete="off"></label>`;
    const body=`<div class="form">${mode==='set'?nw:mode==='change'?cur+nw:cur}
      ${mode!=='remove'?'<div class="hint">The ledger on this phone is encrypted with the PIN (AES-256, key derived with PBKDF2). It cannot be recovered: forgetting it means erasing the app and restoring a backup. A 4-digit PIN has only 10,000 combinations, so it slows down someone with the phone\'s files rather than stopping them. Backups you copy or download are not encrypted.</div>':''}
      <button type="button" class="btn-primary" data-pin-save="${mode}">${mode==='set'?'Turn on PIN':mode==='change'?'Change PIN':'Remove PIN'}</button><button type="button" data-close>Cancel</button></div>`;
    return {title:mode==='set'?'Set a PIN':mode==='change'?'Change PIN':'Remove PIN',body,focus:mode==='set'?'#p-new':'#p-cur'};
}
