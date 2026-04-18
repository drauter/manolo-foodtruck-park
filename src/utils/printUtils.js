import qz from 'qz-tray';
import { KEYUTIL, KJUR, hextob64 } from 'jsrsasign';

let isPrinting = false;

// Configurar certificado para evitar el popup de permisos
qz.security.setCertificatePromise((resolve) => {
  console.log("QZ Tray: Cargando certificado...");
  fetch('/certificates/digital-certificate')
    .then(r => {
      if (!r.ok) throw new Error("Fallo al cargar digital-certificate");
      return r.text();
    })
    .then(cert => {
      console.log("QZ Tray: Certificado cargado con éxito.");
      resolve(cert);
    })
    .catch(err => console.error("QZ Tray Certificate Error:", err));
});

qz.security.setSignatureAlgorithm('SHA512');
qz.security.setSignaturePromise((toSign) => {
  return (resolve, reject) => {
    console.log("QZ Tray: Firmando datos...");
    fetch('/certificates/private-key.pem')
      .then(r => {
        if (!r.ok) throw new Error("Fallo al cargar private-key.pem");
        return r.text();
      })
      .then(key => {
        try {
          const pk = KEYUTIL.getKey(key);
          const sig = new KJUR.crypto.Signature({ alg: 'SHA512withRSA' });
          sig.init(pk);
          sig.updateString(toSign);
          const signature = hextob64(sig.sign());
          console.log("QZ Tray: Firma generada con éxito.");
          resolve(signature);
        } catch (e) {
          console.error("QZ Tray Signing Logic Error:", e);
          reject(e);
        }
      })
      .catch(err => {
        console.error("QZ Tray Signature Fetch Error:", err);
        reject(err);
      });
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
    const commands = ['\x1B@', '\x1B!\x08'];
    const nodes = Array.from(el.children);

    for (const node of nodes) {
      // Si es un pre, añadir el texto
      if (node.tagName === 'PRE') {
        commands.push(node.textContent + '\n');
      } 
      // Si contiene una imagen (QR)
      else if (node.querySelector('img') || node.tagName === 'IMG') {
        const qrImg = node.tagName === 'IMG' ? node : node.querySelector('img');
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
        commands.push({
          type: 'pixel',
          format: 'image',
          flavor: 'base64',
          data: imageData,
          options: { language: 'ESCPOS', dotDensity: 'double' }
        });
        commands.push('\n'); // Salto de línea después de la imagen
      }
    }

    commands.push('\n\n\n\n', '\x1DVA\x03');
    await qz.print(config, commands);

  } catch (err) {
    console.error('QZ Tray error:', err);
  } finally {
    isPrinting = false;
  }
};
