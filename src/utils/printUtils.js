let isPrinting = false;

export const printReceipt = (contentId) => {
  if (isPrinting) return;
  isPrinting = true;

  const el = document.getElementById(contentId);
  if (!el) {
    console.error(`Receipt element '${contentId}' not found`);
    isPrinting = false;
    return;
  }

  const iframe = document.createElement('iframe');
  // height:1px forces the browser to calculate layout; visibility:hidden keeps it off-screen
  iframe.style.cssText = 'position:fixed;top:0;left:-9999px;width:80mm;height:1px;border:none;visibility:hidden;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(`<!DOCTYPE html><html><head><style>
    @page { size: 80mm auto; margin: 0; }   /* 👈 solo este cambio */
    html, body {
      margin: 0;
      padding: 0;
      width: 80mm;
      height: auto;
      background: white;
      font-family: "Courier New", Courier, monospace;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @media print {
      html, body {
        width: 80mm;
        margin: 0;
        padding: 0;
      }
    }
    * { box-sizing: border-box; }
    pre {
      margin: 0;
      padding: 2mm;
      white-space: pre;
      word-break: normal;
      overflow-wrap: normal;
      font-family: inherit;
      font-size: 12px;
      line-height: 1.4;
      font-weight: bold;
      color: black;
    }
    img { display: block; max-width: 100%; margin: 0 auto; }
  </style></head><body>${el.outerHTML}</body></html>`);
  doc.close();

  setTimeout(() => {
    if (!iframe.contentWindow) { isPrinting = false; return; }
    iframe.contentWindow.print();
    setTimeout(() => {
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
      isPrinting = false;
    }, 2000);
  }, 800);
};
