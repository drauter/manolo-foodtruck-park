/**
 * printUtils.js
 * Utility to print content using a hidden iframe.
 * This ensures the print job only contains the specified element and its styling,
 * avoiding extra pages and layout issues from the main application.
 */

export const printReceipt = (contentId) => {
  const content = document.getElementById(contentId);
  const portal = document.getElementById('print-portal');
  
  if (!content || !portal) {
    console.error('Print content or portal not found');
    window.print(); // Fallback to standard
    return;
  }

  // Clear previous content
  portal.innerHTML = '';
  
  // Clone the node to avoid moving it from its original place
  const clone = content.cloneNode(true);
  portal.appendChild(clone);

  // Small delay to ensure browser acknowledges the new DOM in the portal
  setTimeout(() => {
    // Wait for images in the clone to load
    const images = portal.getElementsByTagName('img');
    let loaded = 0;
    
    const triggerPrint = () => {
      window.print();
      // Optional: clear portal after print to save memory
      // portal.innerHTML = '';
    };

    if (images.length === 0) {
      triggerPrint();
    } else {
      for (let i = 0; i < images.length; i++) {
        images[i].onload = () => {
          loaded++;
          if (loaded === images.length) triggerPrint();
        };
        if (images[i].complete) images[i].onload();
      }
      // Fail-safe
      setTimeout(triggerPrint, 1500);
    }
  }, 100);
};
