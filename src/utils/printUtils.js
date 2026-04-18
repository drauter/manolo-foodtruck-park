import qz from 'qz-tray';

let isPrinting = false;

const connectQZ = async () => {
  if (!qz.websocket.isActive()) {
    await qz.websocket.connect();
  }
};

export const printReceipt = async (contentId) => {
  if (isPrinting) return;
  isPrinting = true;

  const el = document.getElementById(contentId);
  if (!el) { isPrinting = false; return; }

  try {
    await connectQZ();
    const config = qz.configs.create('80mm Series Printer');

    const preElements = el.querySelectorAll('pre');
    const text = Array.from(preElements).map(p => p.textContent).join('\n');

    await qz.print(config, [
      '\x1B@',
      '\x1B!\x08',
      text,
      '\n\n\n\n',
      '\x1DVA\x03',
    ]);

  } catch (err) {
    console.error('QZ Tray error:', err);
  } finally {
    isPrinting = false;
  }
};
