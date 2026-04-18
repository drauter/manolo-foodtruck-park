let isPrinting = false;

export const printReceipt = (contentId) => {
  if (isPrinting) return;
  isPrinting = true;

  const el = document.getElementById(contentId);
  if (!el) { isPrinting = false; return; }

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:0;left:-9999px;width:297mm;height:80mm;border:none;visibility:hidden;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(`<!DOCTYPE html><html><head><style>
    @page { size: 297mm 80mm; margin: 0; }
    html, body {
      margin: 0; padding: 0;
      width: 297mm; height: 80mm;
      background: white;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .rotate-wrap {
      transform: rotate(-90deg);
      transform-origin: left top;
      width: 80mm;
      position: absolute;
      top: 80mm;
      left: 0;
      font-family: "Courier New", Courier, monospace;
    }
    pre {
      margin: 0; padding: 2mm;
      font-size: 12px; font-weight: bold;
      line-height: 1.4; white-space: pre;
      color: black;
    }
    img { display: block; max-width: 100%; margin: 0 auto; }
  </style></head><body><div class="rotate-wrap">${el.outerHTML}</div></body></html>`);
  doc.close();

  setTimeout(() => {
    if (!iframe.contentWindow) { isPrinting = false; return; }
    iframe.contentWindow.print();
    setTimeout(() => {
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
      isPrinting = false;
    }, 800);
  }, 800);
};
