/**
 * printUtils.js
 * Utility to print content using a hidden iframe.
 * This ensures the print job only contains the specified element and its styling,
 * avoiding extra pages and layout issues from the main application.
 */

export const printReceipt = (contentId) => {
  const content = document.getElementById(contentId);
  if (!content) {
    console.error(`Element with id ${contentId} not found.`);
    return;
  }

  // Create a hidden iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;

  // Add basic thermal printing styles to the iframe
  const styles = `
    <html>
      <head>
        <title>Print Receipt</title>
        <style>
          @page {
            size: 72mm auto;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: monospace;
            width: 72mm;
            background: white;
          }
          /* Copy tailwind basics or specific styles needed */
          * {
            box-sizing: border-box;
          }
          img {
            max-width: 100%;
          }
          /* Ensure monospace and crisp sizing */
          .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
          .text-xs { font-size: 10px; line-height: 1.2; }
          .text-sm { font-size: 12px; line-height: 1.2; }
          .text-lg { font-size: 16px; line-height: 1.2; }
          .text-xl { font-size: 18px; line-height: 1.2; }
          .text-2xl { font-size: 24px; line-height: 1.2; }
          .font-black { font-weight: 900; }
          .font-bold { font-weight: 700; }
          .uppercase { text-transform: uppercase; }
          .italic { font-style: italic; }
          .tracking-tighter { letter-spacing: -0.05em; }
          .tracking-tight { letter-spacing: -0.02em; }
          .tracking-widest { letter-spacing: 0.1em; }
          .text-slate-900 { color: #0f172a; }
          .text-slate-400 { color: #94a3b8; }
          .text-emerald-500 { color: #10b981; }
          .text-emerald-600 { color: #059669; }
          .text-orange-500 { color: #f97316; }
          .text-slate-950 { color: #020617; }
          .border-b { border-bottom-width: 1px; }
          .border-b-2 { border-bottom-width: 2px; }
          .border-t { border-top-width: 1px; }
          .border-t-2 { border-top-width: 2px; }
          .border-slate-900 { border-color: #0f172a; }
          .border-slate-900\/10 { border-color: rgba(15, 23, 42, 0.1); }
          .border-slate-100 { border-color: #f1f5f9; }
          .border-double { border-style: double; }
          .border-dashed { border-style: dashed; }
          .flex { display: flex; }
          .flex-col { flex-direction: column; }
          .items-center { align-items: center; }
          .justify-center { justify-content: center; }
          .justify-between { justify-content: space-between; }
          .space-y-3 > * + * { margin-top: 0.75rem; }
          .space-y-2 > * + * { margin-top: 0.5rem; }
          .mb-6 { margin-bottom: 1.5rem; }
          .mb-4 { margin-bottom: 1rem; }
          .mb-2 { margin-bottom: 0.5rem; }
          .mt-1 { margin-top: 0.25rem; }
          .mt-2 { margin-top: 0.5rem; }
          .mt-4 { margin-top: 1rem; }
          .mt-8 { margin-top: 2rem; }
          .pt-4 { padding-top: 1rem; }
          .pt-2 { padding-top: 0.5rem; }
          .pb-6 { padding-bottom: 1.5rem; }
          .pb-4 { padding-bottom: 1rem; }
          .w-full { width: 100%; }
          .w-16 { width: 4rem; }
          .w-24 { width: 6rem; }
          .h-8 { height: 2rem; }
          .h-24 { height: 6rem; }
          .rounded-lg { border-radius: 0.5rem; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
          .px-4 { padding-left: 1rem; padding-right: 1rem; }
          .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
          .bg-slate-950 { background-color: #020617; }
          .bg-slate-900 { background-color: #0f172a; }
          .bg-white { background-color: #ffffff; }
          .text-white { color: #ffffff; }
          .divide-y > * + * { border-top-width: 1px; }
          .divide-slate-100 > * + * { border-color: #f1f5f9; }
          .underline { text-decoration-line: underline; }
          .decoration-2 { text-decoration-thickness: 2px; }
          .leading-none { line-height: 1; }
          .leading-tight { line-height: 1.25; }
          
          /* Custom overrides for thermal */
          #printable-invoice {
            width: 72mm !important;
            padding: 2mm !important;
            margin: 0 !important;
          }
          /* Hide tracking QR if it causes issues, but let's try keep it */
          img {
            filter: grayscale(100%) contrast(200%);
          }
        </style>
      </head>
      <body>
        <div id="printable-invoice">
          ${content.innerHTML}
        </div>
      </body>
    </html>
  `;

  doc.open();
  doc.write(styles);
  doc.close();

  // Wait for images (QR) to load before printing
  const images = doc.getElementsByTagName('img');
  let loadedImages = 0;

  const tryPrint = () => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  };

  if (images.length === 0) {
    tryPrint();
  } else {
    for (let i = 0; i < images.length; i++) {
      images[i].onload = () => {
        loadedImages++;
        if (loadedImages === images.length) {
          tryPrint();
        }
      };
      // For cached images
      if (images[i].complete) {
        images[i].onload();
      }
    }
    // Safety timeout
    setTimeout(() => {
      if (loadedImages < images.length) tryPrint();
    }, 2000);
  }
};
