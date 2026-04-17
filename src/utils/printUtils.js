let isPrinting = false;

export const printReceipt = (contentId = 'printable-receipt-wrapper') => {
  if (isPrinting) return;
  isPrinting = true;

  const el = document.getElementById(contentId);
  if (!el) {
    console.error(`Element with id ${contentId} not found`);
    isPrinting = false;
    return;
  }

  // Create isolated iframe for cleaner thermal printing
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:80mm;border:none;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body { margin: 0; padding: 0; width: 80mm; font-family: monospace; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .receipt-print { display: block !important; width: 80mm !important; }
        </style>
      </head>
      <body>
        ${el.outerHTML}
        <script>
          window.onload = () => {
            window.print();
            setTimeout(() => {
              window.frameElement.remove();
            }, 1000);
          };
        </script>
      </body>
    </html>
  `);
  doc.close();

  // Reset printing flag after a delay
  setTimeout(() => {
    isPrinting = false;
  }, 3000);
};
