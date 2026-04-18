import qz from 'qz-tray';

let isPrinting = false;

// Configurar certificado para evitar el popup de permisos
qz.security.setCertificatePromise((resolve) => {
  fetch('/certificates/digital-certificate')
    .then(r => r.text())
    .then(resolve);
});

qz.security.setSignatureAlgorithm('SHA512');
qz.security.setSignaturePromise((toSign) => {
  return (resolve, reject) => {
    fetch('/certificates/private-key.pem')
      .then(r => r.text())
      .then(key => {
        const pk = qz.api.getRSAKey(key);
        resolve(qz.api.signData(pk, toSign));
      })
      .catch(reject);
  };
});

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
    ]);

    // Imprimir QR como imagen
    const qrImg = el.querySelector('img');
    if (qrImg) {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = qrImg.src;
      
      await new Promise((resolve) => {
        img.onload = () => {
          ctx.drawImage(img, 0, 0, 200, 200);
          resolve();
        };
      });

      const imageData = canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
      
      await qz.print(config, [{
        type: 'pixel',
        format: 'image',
        flavor: 'base64',
        data: imageData,
        options: { language: 'ESCPOS', dotDensity: 'double' }
      }]);
    }

    await qz.print(config, [
      '\x1DVA\x03',
    ]);

  } catch (err) {
    console.error('QZ Tray error:', err);
  } finally {
    isPrinting = false;
  }
};
