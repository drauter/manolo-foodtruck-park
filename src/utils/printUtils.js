let isPrinting = false;
export const printReceipt = (contentId) => {
  if (isPrinting) return;
  isPrinting = true;
  const el = document.getElementById(contentId);
  if (!el) { isPrinting = false; return; }
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:80mm;border:none;';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  doc.open();
  doc.write(`<!DOCTYPE html><html><head><style>
    @page { size: 80mm auto; margin: 0; }
    body { margin:0; padding:0; width:80mm; font-family:monospace; }
    * { -webkit-print-color-adjust:exact; print-color-adjust:exact; box-sizing:border-box; }
    table { display:table !important; width:100%; border-collapse:collapse; }
    thead { display:table-header-group !important; }
    tbody { display:table-row-group !important; }
    tr { display:table-row !important; }
    td, th { display:table-cell !important; }
  </style></head><body>${el.outerHTML}</body></html>`);
  doc.close();
  setTimeout(() => {
    iframe.contentWindow.print();
    setTimeout(() => { document.body.removeChild(iframe); isPrinting = false; }, 2000);
  }, 800);
};
