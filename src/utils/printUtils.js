let isPrinting = false;

export const printReceipt = () => {
  if (isPrinting) return;
  isPrinting = true;
  window.print();
  window.addEventListener('afterprint', () => { isPrinting = false; }, { once: true });
  setTimeout(() => { isPrinting = false; }, 5000);
};
