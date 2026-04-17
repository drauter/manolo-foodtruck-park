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
  // Avoid setting height:1px which might make the browser think it's a landscape page initially
  iframe.style.cssText = 'position:fixed;top:0;left:-9999px;width:80mm;height:auto;border:none;visibility:hidden;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(`<!DOCTYPE html><html><head><style>
    @page { 
      size: 80mm 3276mm; 
      margin: 0; 
    }
    html, body {
      margin: 0;
      padding: 0;
      width: 80mm;
      height: auto;
      background: white;
      font-family: "Courier New", Courier, monospace;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      overflow-x: hidden;
    }
    @media print {
      html, body {
        width: 80mm;
        max-width: 80mm;
        margin: 0;
        padding: 0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
    pre {
      font-size: 12px !important;
      line-height: 1.4 !important;
      transform: none !important;
      zoom: 1 !important;
      margin: 0;
      white-space: pre !important;
    }
    * { box-sizing: border-box; }
    /* The actual content should be slightly narrower than the paper */
    .receipt-container {
      width: 72mm;
      margin: 0 auto;
    }
  </style></head><body><div class="receipt-container">${el.innerHTML}</div></body></html>`);
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
