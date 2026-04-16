/**
 * printUtils.js
 * Utility to print content using a hidden iframe.
 * This ensures the print job only contains the specified element and its styling,
 * avoiding extra pages and layout issues from the main application.
 */

let isPrinting = false;

export const printReceipt = (contentId) => {
  if (isPrinting) return;
  
  isPrinting = true;
  window.print();
  
  // Allow printing again after 3 seconds
  setTimeout(() => {
    isPrinting = false;
  }, 3000);
};
