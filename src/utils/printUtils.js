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
  if (!el) {
    isPrinting = false;
    return;
  }

  try {
    await connectQZ();

    const config = qz.configs.create('80mm Series Printer', {
      size: { width: 80, height: null },
      units: 'mm',
      orientation: 'portrait',
      margins: 0,
      scaleContent: false,
    });

    const data = [{
      type: 'pixel',
      format: 'html',
      flavor: 'plain',
      data: `<!DOCTYPE html><html><head><style>
        html, body { margin: 0; padding: 0; width: 80mm; font-family: "Courier New", Courier, monospace; }
        pre { margin: 0; padding: 2mm; font-size: 10px; line-height: 1.4; font-weight: bold; white-space: pre !important; }
        img { display: block; max-width: 100%; margin: 0 auto; }
      </style></head><body>${el.outerHTML}</body></html>`
    }];

    await qz.print(config, data);

  } catch (err) {
    console.error('QZ Tray error:', err);
  } finally {
    isPrinting = false;
  }
};
