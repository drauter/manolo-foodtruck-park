import React from 'react';

const Receipt = ({ order, station = 'CAJA', isForPrint = false, printId = 'printable-invoice' }) => {
  if (!order) return null;

  const WIDTH = 32; // caracteres por línea en 80mm con Courier New 10px

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
    const d = sanitize(String(desc)).substring(0, 14).padEnd(14);
    const c = sanitize(String(cant)).padStart(4);
    const t = sanitize(String(total)).padStart(8);
    return d + c + t;
  };

  const line = (char = '-') => char.repeat(WIDTH);
  const blank = () => '';

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
    line('='),
    blank(),
    center('ESCANÉAME PARA VER EL'),
    center('ESTADO DE TU PEDIDO'),
    blank(),
  ];

  const text = lines.join('\n');

  return (
    <div
      id={isForPrint ? printId : undefined}
      className={isForPrint ? "receipt-print" : "receipt-preview"}
      style={{
        backgroundColor: 'white',
        width: '72mm',
        margin: '0 auto',
        border: isForPrint ? 'none' : '1px solid #ccc',
        padding: '2mm 3mm',
        boxSizing: 'border-box',
      }}
    >
      <pre style={{
        fontFamily: '"Courier New", Courier, monospace',
        fontSize: '10px',
        lineHeight: '1.4',
        margin: 0,
        padding: 0,
        whiteSpace: 'pre',
        color: 'black',
        backgroundColor: 'white',
      }}>
        {text}
      </pre>

      <div style={{ textAlign: 'center', margin: '8px 0' }}>
        <img 
          src={`https://quickchart.io/qr?text=${encodeURIComponent(`https://manolofoodtruckpark.pages.dev/tracking/${order.id}`)}&size=140&margin=0`} 
          style={{ width: '80px', height: '80px', display: 'inline-block' }} 
          alt="QR"
        />
      </div>

      <pre style={{
        fontFamily: '"Courier New", Courier, monospace',
        fontSize: '10px',
        lineHeight: '1.4',
        margin: 0,
        padding: 0,
        whiteSpace: 'pre',
        color: 'black',
        backgroundColor: 'white',
      }}>
{line('-')}
{center('GRACIAS POR TU COMPRA')}
{center('VISITANOS PRONTO EN MANOLO')}
{center('FOODTRUCK PARK')}
{blank()}
{blank()}
{blank()}
{blank()}
{blank()}
      </pre>
    </div>
  );
};

export default Receipt;
