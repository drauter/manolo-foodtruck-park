/**
 * printUtils.js
 * Utility to print content using a hidden iframe.
 * This ensures the print job only contains the specified element and its styling,
 * avoiding extra pages and layout issues from the main application.
 */

export const printReceipt = (contentId) => {
  const content = document.getElementById(contentId);
  if (!content) return;

  // Clone the content to avoid issues with React
  const contentClone = content.cloneNode(true);
  
  // Create a full HTML document string
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page { margin: 0; size: 72mm auto; }
          body { 
            margin: 0; 
            padding: 0; 
            width: 72mm; 
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
            background: white;
            color: black;
            -webkit-print-color-adjust: exact;
          }
          * { box-sizing: border-box; }
          img { max-width: 100%; height: auto; display: block; filter: grayscale(1) contrast(1.5); }
          
          /* Inline critical styles for consistent thermal output */
          .flex { display: flex; }
          .flex-col { flex-direction: column; }
          .items-center { align-items: center; }
          .justify-between { justify-content: space-between; }
          .justify-center { justify-content: center; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .w-full { width: 100%; }
          .font-black { font-weight: 900; }
          .font-bold { font-weight: 700; font-family: monospace; }
          .uppercase { text-transform: uppercase; }
          .italic { font-style: italic; }
          .tracking-tighter { letter-spacing: -0.05em; }
          .tracking-widest { letter-spacing: 0.1em; }
          .text-2xl { font-size: 24pt; }
          .text-lg { font-size: 14pt; }
          .text-sm { font-size: 10pt; }
          .text-xs { font-size: 8pt; }
          .p-2 { padding: 0.5rem; }
          .p-4 { padding: 1rem; }
          .mb-2 { margin-bottom: 0.5rem; }
          .mb-4 { margin-bottom: 1rem; }
          .mb-6 { margin-bottom: 1.5rem; }
          .mt-1 { margin-top: 0.25rem; }
          .mt-4 { margin-top: 1rem; }
          .mt-8 { margin-top: 2rem; }
          .pt-4 { padding-top: 1rem; }
          .pb-6 { padding-bottom: 1.5rem; }
          .border-b-2 { border-bottom: 2px solid black; }
          .border-t-2 { border-top: 2px solid black; }
          .border-slate-900 { border-color: black; }
          .border-double { border-style: double; }
          .border-dashed { border-style: dashed; }
          .space-y-3 > * + * { margin-top: 0.75rem; }
          .space-y-2 > * + * { margin-top: 0.5rem; }
          .bg-slate-950 { background-color: black; color: white; padding: 5pt; border-radius: 4pt; }
          .rounded-lg { border-radius: 4pt; }
          .divide-y > * + * { border-top: 1px solid #ccc; }
          .font-mono { font-family: monospace; }
          
          /* Ensure print colors are black */
          .text-emerald-500, .text-orange-500, .text-slate-400 { color: black !important; }
        </style>
      </head>
      <body>
        <div id="print-content" style="width: 72mm; padding: 2mm;">
          ${content.innerHTML}
        </div>
        <script>
          window.onload = () => {
             // Wait for all images
             const imgs = document.getElementsByTagName('img');
             let loaded = 0;
             if(imgs.length === 0) {
               window.print();
               setTimeout(() => window.close(), 100);
             } else {
               for(let i=0; i<imgs.length; i++) {
                 imgs[i].onload = () => {
                   loaded++;
                   if(loaded === imgs.length) {
                     window.print();
                     setTimeout(() => window.close(), 100);
                   }
                 };
               }
               // Safety timeout for images
               setTimeout(() => { window.print(); window.close(); }, 2000);
             }
          };
        </script>
      </body>
    </html>
  `;

  // Create a blob and an object URL
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  // Use a popup window for print (more compatible with some drivers)
  const printWindow = window.open(url, '_blank', 'width=300,height=600');
  
  if (!printWindow) {
    alert("Por favor, permite los pop-ups para imprimir el ticket.");
    return;
  }

  // Clean up the URL after printing
  const checkClosed = setInterval(() => {
    if (printWindow.closed) {
      clearInterval(checkClosed);
      URL.revokeObjectURL(url);
    }
  }, 1000);
};
