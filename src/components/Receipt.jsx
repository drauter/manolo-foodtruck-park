import React, { useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

const WIDTH = 42;

const sanitize = (text) => {
  if (!text) return '';
  return text.toString().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¡!¿?#]/g, "")
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

export const buildReceiptText = (order, station = 'CAJA') => {
  if (!order) {
    return [
      center('TICKET DE PRUEBA'),
      center('MANOLO FOODTRUCK'),
      line('='),
      center('IMPRESORA CONFIGURADA'),
      center('EXITOSAMENTE'),
      line('='),
      '',
      '',
      '',
    ].join('\n');
  }
  const is_paid = order.is_paid;
  const totalPaid = is_paid ? order.total_price : 0;
  const payment = order.payment_details?.[station];

  const lines = [
    center(`TICKET ${order.ticket_number}`),
    center('MANOLO'),
    center('FOODTRUCK PARK'),
    line('='),
    dual('ESTADO:', is_paid ? 'PAGADO' : 'PENDIENTE'),
    dual('FACTURA:', `FAC-${order.ticket_number}`),
    dual('FECHA:', new Date(order.timestamp).toLocaleDateString()),
    dual('HORA:', new Date(order.timestamp).toLocaleTimeString()),
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
    '',
    center('GRACIAS POR TU COMPRA'),
    center('VISITANOS PRONTO EN MANOLO'),
    center('FOODTRUCK PARK'),
    '',
    '',
    '',
  ];

  return lines.join('\n');
};

const Receipt = ({ order, station = 'CAJA', printId = 'printable-invoice' }) => {
  if (!order) return null;
  const [qrBase64, setQrBase64] = useState('');
  const text = buildReceiptText(order, station);
  const trackingUrl = `${window.location.origin}/tracking/${order.id}`;

  useEffect(() => {
    const canvas = document.getElementById(`qr-gen-${order.id}`);
    if (canvas) {
      setQrBase64(canvas.toDataURL('image/png'));
    }
  }, [order.id]);

  return (
    <div id={printId} style={{ backgroundColor: 'white', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <pre style={{
        fontFamily: '"Courier New", Courier, monospace',
        fontSize: '12px',
        fontWeight: 'bold',
        lineHeight: '1.4',
        margin: 0,
        whiteSpace: 'pre',
        color: 'black',
        alignSelf: 'flex-start'
      }}>{text.split('GRACIAS POR TU COMPRA')[0]}</pre>
      
      <div style={{ textAlign: 'center', margin: '20px 0' }}>
        <div style={{ fontSize: '12px', fontWeight: '900', marginBottom: '10px', fontFamily: '"Courier New", Courier, monospace' }}>
          ¡ESCANEAME PARA VER EL ESTADO DE TU PEDIDO!
        </div>
        <div style={{ display: 'none' }}>
          <QRCodeCanvas 
            id={`qr-gen-${order.id}`}
            value={trackingUrl}
            size={200}
            level="H"
          />
        </div>
        {qrBase64 && (
          <img src={qrBase64} alt="QR Tracking" style={{ width: '150px', height: '150px' }} />
        )}
      </div>

      <pre style={{
        fontFamily: '"Courier New", Courier, monospace',
        fontSize: '12px',
        fontWeight: 'bold',
        lineHeight: '1.4',
        margin: 0,
        whiteSpace: 'pre',
        color: 'black',
        alignSelf: 'flex-start'
      }}>{'GRACIAS POR TU COMPRA' + text.split('GRACIAS POR TU COMPRA')[1]}</pre>
    </div>
  );
};

export default Receipt;
