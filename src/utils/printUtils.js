let isPrinting = false;

export const printReceipt = (contentId) => {
  if (isPrinting) return;
  isPrinting = true;

  const el = document.getElementById(contentId);
  if (!el) {
    isPrinting = false;
    return;
  }

  const win = window.open('', '_blank', 'width=320,height=600,toolbar=0,scrollbars=0,status=0');

  win.document.write(`<!DOCTYPE html><html><head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      @page { size: 72mm auto; margin: 0; }
      html, body {
        margin: 0;
        padding: 0;
        width: 72mm;
        height: auto;
        background: white;
        font-family: "Courier New", Courier, monospace;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      pre {
        margin: 0;
        padding: 0;
        font-size: 12px;
        font-weight: bold;
        line-height: 1.4;
        white-space: pre;
        color: black;
      }
      img { display: block; max-width: 100%; margin: 0 auto; }
    </style>
  </head><body>${el.outerHTML}</body></html>`);

  win.document.close();

  win.onload = () => {
    win.focus();
    win.print();
    setTimeout(() => {
      win.close();
      isPrinting = false;
    }, 2000);
  };
};
