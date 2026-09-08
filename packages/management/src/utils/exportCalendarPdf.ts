export type DailyPdfEntryTone = 'neutral' | 'success' | 'danger' | 'warning';

export type DailyPdfEntry = {
  name: string;
  detail: string;
  tone?: DailyPdfEntryTone;
};

export type DailyPdfSection = {
  date: string;
  holidayName?: string;
  entries: DailyPdfEntry[];
};

export type DailyPdfReport = {
  title: string;
  period: string;
  branchName?: string;
  days: DailyPdfSection[];
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return entities[character];
  });
}

function renderEntry({ name, detail, tone = 'neutral' }: DailyPdfEntry) {
  return `<li class="report-entry report-entry--${tone}">
    <strong>${escapeHtml(name)}</strong>
    <span>${escapeHtml(detail)}</span>
  </li>`;
}

function renderDay({ date, holidayName, entries }: DailyPdfSection) {
  const rows = entries.length
    ? `<ul class="report-entries">${entries.map(renderEntry).join('')}</ul>`
    : '<p class="report-empty">ไม่มีรายการพนักงาน</p>';
  return `<section class="report-day">
    <header class="report-day__header">
      <h2>${escapeHtml(date)}</h2>
      ${holidayName ? `<span class="report-holiday">${escapeHtml(holidayName)}</span>` : ''}
    </header>
    ${rows}
  </section>`;
}

/** Opens a print-ready daily report. The browser print dialog can save it as PDF. */
export function exportDailyReportAsPdf({
  title,
  period,
  branchName,
  days,
}: DailyPdfReport) {
  const printWindow = window.open('', '_blank', 'popup,width=960,height=900');
  if (!printWindow) return false;

  const styles = Array.from(
    document.querySelectorAll('style, link[rel="stylesheet"]'),
  )
    .map((style) => style.outerHTML)
    .join('\n');
  const reportDays = days.length
    ? days.map(renderDay).join('')
    : '<p class="report-empty report-empty--page">ไม่พบรายการสำหรับเดือนนี้</p>';

  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
<html lang="th">
  <head>
    <base href="${document.baseURI}" />
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    ${styles}
    <style>
      @page { size: A4 portrait; margin: 12mm; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #201914; background: #fff; font-family: Kanit, sans-serif; }
      .report-header { margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #3c2d24; }
      .report-title { margin: 0; font-size: 24px; line-height: 1.25; font-weight: 700; }
      .report-meta { margin: 5px 0 0; color: #60493b; font-size: 14px; }
      .report-days { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
      .report-day { break-inside: avoid; border: 1px solid #e8ddd5; border-radius: 9px; overflow: hidden; }
      .report-day__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; padding: 9px 11px; background: #fbf7f4; border-bottom: 1px solid #eee4dd; }
      .report-day__header h2 { margin: 0; font-size: 15px; line-height: 1.35; font-weight: 700; }
      .report-holiday { color: #b94136; font-size: 12px; font-weight: 700; text-align: right; }
      .report-entries { margin: 0; padding: 0; list-style: none; }
      .report-entry { display: flex; flex-direction: column; gap: 2px; padding: 8px 11px; border-bottom: 1px solid #f0e8e2; font-size: 13px; line-height: 1.35; }
      .report-entry:last-child { border-bottom: 0; }
      .report-entry strong { font-size: 14px; }
      .report-entry span { color: #60493b; }
      .report-entry--success { background: #edf8f0; color: #256c45; }
      .report-entry--success span { color: #256c45; }
      .report-entry--danger { background: #fff0f0; color: #b94136; }
      .report-entry--danger span { color: #b94136; }
      .report-entry--warning { background: #fff8eb; color: #8a5b12; }
      .report-entry--warning span { color: #8a5b12; }
      .report-empty { margin: 0; padding: 12px; color: #766f6a; font-size: 13px; }
      .report-empty--page { border: 1px solid #e8ddd5; border-radius: 9px; }
      @media print { .report-days { gap: 8px; } }
    </style>
  </head>
  <body>
    <header class="report-header">
      <h1 class="report-title">${escapeHtml(title)}</h1>
      <p class="report-meta">${escapeHtml([branchName, period].filter(Boolean).join(' · '))}</p>
    </header>
    <main class="report-days">${reportDays}</main>
  </body>
</html>`);
  printWindow.document.close();

  window.setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 250);
  return true;
}
