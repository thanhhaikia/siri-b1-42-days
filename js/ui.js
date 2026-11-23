export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Escapes, then renders *emphasis* and ___ blanks.
export const fmt = (s) => esc(s).replace(/\*(.+?)\*/g, '<b class="hl">$1</b>').replace(/_{3,}/g, '<span class="blank"></span>');

export const speaker = (text, label = 'Nghe') =>
  `<button type="button" class="spk" data-say="${esc(text)}" aria-label="${label}: ${esc(text)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>`;

export const check = '<svg class="tick" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
