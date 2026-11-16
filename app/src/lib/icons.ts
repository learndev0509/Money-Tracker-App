/* ---------- shared pieces ---------- */
export const CALC_BTN = (ctx: string) =>
  `<button type="button" class="calc-btn" data-calc="${ctx}" aria-label="Calculator"><svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/></svg></button>`;
export const SEARCH_SVG = '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';
export const ICON: Record<'cash' | 'online' | 'bank' | 'card' | 'fuel' | 'upi' | 'filter' | 'sort' | 'brush', string> =
  {
    cash: '<svg viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/></svg>',
    online: '<svg viewBox="0 0 24 24"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>',
    bank: '<svg viewBox="0 0 24 24"><path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/></svg>',
    card: '<svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/></svg>',
    fuel: '<svg viewBox="0 0 24 24"><path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h14M7 7h6M15 9h2l3 3v7a1.5 1.5 0 0 1-3 0v-5h-2"/></svg>',
    upi: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v7h-7v-3"/></svg>',
    filter: '<svg viewBox="0 0 24 24"><path d="M3 5h18l-7 8v6l-4 2v-8z"/></svg>',
    sort: '<svg viewBox="0 0 24 24"><path d="M7 4v16M4 17l3 3 3-3M17 20V4M14 7l3-3 3 3"/></svg>',
    brush:
      '<svg viewBox="0 0 24 24"><path d="M20 3l-9 9M9.5 12.5l2 2M8 14c-2 0-3 1.5-3.5 3.5S3.5 20 2.5 21c3 0 6-.5 7.5-2a2.5 2.5 0 0 0-2-5z"/></svg>',
  };
export const CAT_ICON: Record<string, string> = {
  food: '<path d="M4 11h16a8 8 0 0 1-16 0zM9 5v3M12 4v4M15 5v3"/>',
  groceries: '<path d="M3 9h18l-2 11H5zM8 9a4 4 0 0 1 8 0"/>',
  transport:
    '<path d="M5 15l1.5-6h11L19 15M3 15h18v4H3zM7 19v2M17 19v2"/><circle cx="7.5" cy="15" r="1"/><circle cx="16.5" cy="15" r="1"/>',
  fuel: '<path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h14M7 7h6M15 9h2l3 3v7a1.5 1.5 0 0 1-3 0v-5h-2"/>',
  shopping: '<path d="M6 8h12l1 13H5zM9 8V6a3 3 0 0 1 6 0v2"/>',
  bills: '<path d="M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21zM9 8h6M9 12h6M9 16h3"/>',
  rent: '<path d="M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6"/>',
  health: '<path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 5.5-7 10-7 10zM12 9v6M9 12h6"/>',
  entertainment:
    '<path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4zM12 6v12"/>',
  other: '<path d="M3 12l9-9h9v9l-9 9zM16 8h.01"/>',
};
export const INC_ICON = '<path d="M12 3v11M7 9l5 5 5-5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>';
export const glyph = (paths: string, color: string) =>
  `<span class="ci" style="--cc:${color}"><svg viewBox="0 0 24 24">${paths}</svg></span>`;
