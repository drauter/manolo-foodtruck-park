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
        <style>
          @page { size: 80mm auto; margin: 0; }
          html, body { 
            margin: 0; 
            padding: 0; 
            width: 80mm;
            height: auto;
            font-family: monospace;
          }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
          table { display: table !important; width: 100%; border-collapse: collapse; }
          thead { display: table-header-group !important; }
          tbody { display: table-row-group !important; }
          tr { display: table-row !important; }
          td, th { display: table-cell !important; }
          .receipt-print { 
            display: block !important; 
            width: 80mm !important; 
            break-inside: avoid !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
        </style>
      </head>
      <body style="overflow: hidden;">
        <div style="break-inside: avoid; page-break-inside: avoid;">
          ${el.outerHTML}
        </div>
        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
              setTimeout(() => {
                window.frameElement.remove();
              }, 500);
            }, 100);
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
