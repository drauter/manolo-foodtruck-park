import React from 'react';
import { useOrder } from '../context/OrderContext';
import { STATIONS, getStationDisplay } from '../utils/constants';

const Receipt = ({ order, station = STATIONS.CAJA, isForPrint = false, printId }) => {
  const { printerConfig } = useOrder();
  if (!order) return null;
  
  const is_paid = order.is_paid;
  const lineWidth = 42; // Estándar para impresoras térmicas de 80mm

  // Helper to sanitize text for thermal printers (No accents, no special chars)
  const sanitize = (text) => {
    if (!text) return '';
    return text
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[¡!¿?#]/g, "")         // Remove common special chars
      .toUpperCase();
  };

  // MONOSPACE HELPERS
  const center = (text) => {
    const s = sanitize(text);
    if (s.length >= lineWidth) return s.substring(0, lineWidth);
    const leftPad = Math.floor((lineWidth - s.length) / 2);
    return ' '.repeat(leftPad) + s;
  };

  const dual = (label, value) => {
    const l = sanitize(label);
    const v = sanitize(value);
    const spaces = lineWidth - l.length - v.length;
    if (spaces <= 0) return (l + ' ' + v).substring(0, lineWidth);
    return l + ' '.repeat(spaces) + v;
  };

  const col3 = (c1, c2, c3) => {
    // Layout: DESC(22) | CANT(6) | TOTAL(14) = 42
    const s1 = sanitize(c1).substring(0, 21).padEnd(22);
    const s2 = sanitize(c2).substring(0, 5).padStart(6);
    const s3 = sanitize(c3).substring(0, 13).padStart(14);
    return s1 + s2 + s3;
  };

  const line = (char = '-') => char.repeat(lineWidth);

  return (
    <div 
      id={isForPrint ? printId : undefined} 
      className="receipt-wrapper" 
      style={{ overflow: 'hidden' }}
    >
      <div 
        className={isForPrint ? "receipt-print" : "receipt-preview"}
        style={{ 
          backgroundColor: 'white', 
          width: '76mm', 
          maxWidth: '76mm',
          margin: '0 auto',
          boxSizing: 'border-box',
          paddingLeft: '2mm',
          paddingRight: '2mm',
          paddingTop: '5mm', 
          paddingBottom: '5mm',
          fontFamily: '"Courier New", Courier, monospace', 
          fontSize: '11px', // Mono font needs to be slightly larger for legibility
          color: 'black',
          border: isForPrint ? 'none' : '1px solid #ccc',
          lineHeight: '1.2', 
          letterSpacing: '0',
          overflow: 'hidden'
        }} 
        id={isForPrint ? "printable-invoice" : undefined}
      >
        <pre style={{ 
          margin: 0, 
          whiteSpace: 'pre-wrap', 
          wordBreak: 'break-all', 
          fontFamily: 'inherit',
          fontSize: 'inherit'
        }}>
{center(`TICKET ${order.ticket_number}`)}
{center("MANOLO")}
{center("FOODTRUCK PARK")}
{line('=')}
{dual("ESTADO:", order.status === 'cancelled' ? 'ANULADO' : (is_paid ? 'PAGADO' : 'PENDIENTE'))}
{dual("FACTURA:", `FAC-${order.ticket_number}`)}
{dual("FECHA:", new Date(order.timestamp).toLocaleString())}
{dual("CLIENTE:", order.customer_name)}
{dual("ESTACION:", getStationDisplay(station, order))}
{line('-')}
{col3("DESC", "CANT", "TOTAL")}
{line('-')}
{order.items?.filter(item => station === 'CAJA' || item.station === station).map((item, i) => (
  col3(item.products?.name || item.product?.name || 'PRODUCTO', item.quantity.toString(), `$${((item.price_at_time || 0) * (item.quantity || 1)).toFixed(2)}`)
)).join('\n')}
{line('-')}
{dual("TOTAL PEDIDO:", `$${order.total_price.toFixed(2)}`)}
{order.payment_details?.[station] && (
  <>
{dual("METODO:", order.payment_details[station].method === 'cash' ? 'EFECTIVO' : 'TARJETA')}
{order.payment_details[station].method === 'cash' && (
  <>
{dual("RECIBIDO:", `$${Number(order.payment_details[station].received || 0).toFixed(2)}`)}
{dual("CAMBIO:", `$${Number(order.payment_details[station].change || 0).toFixed(2)}`)}
  </>
)}
  </>
)}
{line('=')}
{dual("TOTAL PAGADO:", `$${(order.is_paid ? order.total_price : 0).toFixed(2)}`)}
        </pre>

        {/* QR SECTION (HÍBRIDA) */}
        <div style={{ textAlign: 'center', margin: '15px 0' }}>
          <div style={{ display: 'inline-block', padding: '6px', border: '1px solid black' }}>
            <img 
              src={`https://quickchart.io/qr?text=${encodeURIComponent(`https://manolofoodtruckpark.pages.dev/tracking/${order.id}`)}&size=160&margin=0`} 
              alt="QR" 
              style={{ width: '90px', height: '90px', display: 'block' }} 
            />
          </div>
          <pre style={{ margin: '6px 0 0 0', whiteSpace: 'pre', fontFamily: 'inherit', fontSize: '9px', fontWeight: 'bold' }}>
{center("ESCANÉAME PARA VER EL")}
{center("ESTADO DE TU PEDIDO")}
          </pre>
        </div>

        {/* FOOTER */}
        <pre style={{ margin: 0, whiteSpace: 'pre', fontFamily: 'inherit', fontSize: '10px' }}>
{line('-')}
{center("GRACIAS POR TU COMPRA")}
{center("VISITANOS PRONTO EN MANOLO")}
{center("FOODTRUCK PARK")}
        </pre>
      </div>
    </div>
  );
};

export default Receipt;
