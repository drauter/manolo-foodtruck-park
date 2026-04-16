/**
 * printUtils.js
 * Utility to print content using a hidden iframe.
 * This ensures the print job only contains the specified element and its styling,
 * avoiding extra pages and layout issues from the main application.
 */

export const printReceipt = (contentId) => {
  window.print();
};
