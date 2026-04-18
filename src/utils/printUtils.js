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
  // Use 800px height to suggest a vertical page to the browser's render engine
  iframe.style.cssText = 'position:fixed;top:0;left:-9999px;width:80mm;height:800px;border:none;visibility:hidden;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(`<!DOCTYPE html><html><head><style>
    @page { 
      size: 80mm auto; 
      margin: 0; 
    }
    html, body {
      margin: 0;
      padding: 0;
      width: 80mm;
      background: white;
      font-family: "Courier New", Courier, monospace;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      overflow: hidden;
    }
    /* Wrap content in a 72mm-wide container to ensure it fits the printable area */
    .receipt-wrapper {
      width: 72mm;
      margin: 0 auto;
      overflow: hidden;
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
      padding: 0;
      white-space: pre !important;
      word-break: normal;
      overflow-wrap: normal;
      font-family: inherit;
      font-size: 12px;
      line-height: 1.4;
      font-weight: bold;
      color: black;
    }
    img { display: block; max-width: 100%; margin: 0 auto; }
  </style></head><body><div class="receipt-wrapper">${el.innerHTML}</div></body></html>`);
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
