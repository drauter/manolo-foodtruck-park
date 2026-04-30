import React, { useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

const WIDTH = 42;

const sanitize = (text) => {
  if (!text) return '';
  return text.toString().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¡!¿?#]/g, "") // Volvemos a limpiar signos para evitar el error de letras faltantes
    .toUpperCase();
};

const center = (text) => {
  const t = sanitize(text);
  const pad = Math.max(0, Math.floor((WIDTH - t.length) / 2));
  return ' '.repeat(pad) + t;
};

const dual = (label, value) => {
  const l = sanitize(label);
  const v = sanitize(String(value));
  const spaces = Math.max(1, WIDTH - l.length - v.length);
  return l + ' '.repeat(spaces) + v;
};

const col3 = (desc, cant, total) => {
  const d = sanitize(String(desc)).substring(0, 20).padEnd(21);
  const c = sanitize(String(cant)).padStart(5);
  const t = sanitize(String(total)).padStart(16);
  return d + c + t;
};

const line = (char = '-') => char.repeat(WIDTH);

// Función que construye el contenido en texto plano (ahora separada para estilos)
export const buildReceiptText = (order, station = 'CAJA') => {
  if (!order) return { header: '', brand: '', body: '', thanks: '' };
  
  const norm = (t) => (t || '').toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
  const targetStation = norm(station);
  
  const is_paid = !!order.is_paid;
  const paymentDetails = order.payment_details || {};
  const hasAnyPayment = Object.keys(paymentDetails).length > 0;
  
  // Si es CAJA, el total pagado es el total de la orden si ya se registró algún pago o está marcada como paga
  // Si es una estación específica, buscamos su pago puntual o el global
  const totalPaid = (is_paid || hasAnyPayment) ? order.total_price : 0;
  
  // Buscar el pago específico de esta estación (o CAJA si es el general)
  // Normalizamos las llaves de payment_details para la búsqueda
  const paymentKey = Object.keys(paymentDetails).find(k => norm(k) === targetStation) || (targetStation === 'CAJA' ? 'CAJA' : null);
  const payment = paymentDetails[paymentKey];

  // Texto puro para centrado por hardware
  const header = sanitize(`TICKET ${order.ticket_number}`);
  const brand = sanitize('MANOLO');
  const park = sanitize('FOODTRUCK PARK');

  const ts = new Date(order.timestamp);
  const ampm = ts.getHours() >= 12 ? 'PM' : 'AM';
  const hours = ts.getHours() % 12 || 12;
  const minutes = ts.getMinutes().toString().padStart(2, '0');
  const cleanTime = `${hours}:${minutes} ${ampm}`;

  const bodyLines = [
    park,
    line('='),
    dual('ESTADO:', is_paid ? 'PAGADO' : 'PENDIENTE'),
    dual('FACTURA:', `FAC-${order.ticket_number}`),
    dual('FECHA:', ts.toLocaleDateString()),
    dual('HORA:', cleanTime),
    dual('CLIENTE:', order.customer_name || ''),
    dual('ESTACION:', station),
    line('-'),
    col3('DESC', 'CANT', 'TOTAL'),
    line('-'),
    ...(order.items || [])
      .filter(i => station === 'CAJA' || i.station === station)
      .map(i => col3(
        i.products?.name || i.product?.name || 'PRODUCTO',
        i.quantity,
        `$${((i.price_at_time || 0) * (i.quantity || 1)).toFixed(2)}`
      )),
    line('-'),
    dual('TOTAL PEDIDO:', `$${order.total_price.toFixed(2)}`),
    ...(payment ? [
      dual('METODO:', payment.method === 'cash' ? 'EFECTIVO' : 'TARJETA'),
      ...(payment.method === 'cash' ? [
        dual('RECIBIDO:', `$${Number(payment.received || 0).toFixed(2)}`),
        dual('CAMBIO:', `$${Number(payment.change || 0).toFixed(2)}`),
      ] : []),
    ] : []),
    line('='),
    dual('TOTAL PAGADO:', `$${totalPaid.toFixed(2)}`),
    line('='),
    '',
  ];

  const thanksLines = [
    sanitize('GRACIAS POR TU COMPRA'),
    sanitize('VISITANOS PRONTO EN MANOLO'),
    sanitize('FOODTRUCK PARK'),
    '',
    '',
    '',
  ];

  return {
    header,
    brand,
    body: bodyLines.join('\n'),
    thanks: thanksLines.join('\n')
  };
};

const Receipt = ({ order, station = 'CAJA', printId = 'printable-invoice' }) => {
  if (!order) return null;
  const [qrBase64, setQrBase64] = useState('');
  const { header, brand, body, thanks } = buildReceiptText(order, station);
  const trackingUrl = `${window.location.origin}/tracking/${order.id}`;

  useEffect(() => {
    const canvas = document.getElementById(`qr-gen-${order.id}`);
    if (canvas) {
      setQrBase64(canvas.toDataURL('image/png'));
    }
  }, [order.id, header, brand, body]);

  const preStyle = {
    fontFamily: '"Courier New", Courier, monospace',
    fontSize: '12px',
    fontWeight: 'bold',
    lineHeight: '1.4',
    margin: 0,
    whiteSpace: 'pre',
    color: 'black',
    textAlign: 'center',
    width: '100%'
  };

  return (
    <div id={printId} style={{
      backgroundColor: 'white',
      padding: '20px 0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      {/* TICKET ID - Modo Inverso (Blanco sobre Negro) */}
      <pre 
        data-style="inverse"
        style={{
          ...preStyle,
          backgroundColor: 'black',
          color: 'white',
          padding: '6px 12px',
          marginBottom: '10px',
          width: 'auto',
          display: 'inline-block'
        }}
      >
        {header}
      </pre>

      {/* MARCA - Tamaño un poco más pequeño */}
      <pre 
        data-style="large"
        style={{
          ...preStyle,
          fontSize: '20px',
          padding: '4px 0'
        }}
      >
        {brand}
      </pre>

      {/* Cuerpo del pedido */}
      <pre style={preStyle}>{body}</pre>

      {/* Eslogan de Seguimiento */}
      <pre 
        data-style="center"
        style={{
          ...preStyle,
          fontSize: '11px',
          fontWeight: '900',
          margin: '20px 0 10px 0',
          whiteSpace: 'pre-wrap'
        }}
      >
        {"ESCANEAME PARA SEGUIR" + "\n" + "EL ESTADO DE TU PEDIDO"}
      </pre>

      <div style={{ display: 'none' }}>
        <QRCodeCanvas
          id={`qr-gen-${order.id}`}
          value={trackingUrl}
          size={200}
          level="H"
        />
      </div>

      {qrBase64 && (
        <img
          src={qrBase64}
          alt="QR Tracking"
          style={{
            width: '100px',
            height: '100px',
            display: 'block',
            margin: '0 auto 20px auto'
          }}
        />
      )}

      {/* Agradecimiento Final */}
      <pre style={preStyle}>{thanks.trim()}</pre>
    </div>
  );
};

export default Receipt;
