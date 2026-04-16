import React from 'react';
import { useOrder } from '../context/OrderContext';
import { STATIONS, getStationDisplay } from '../utils/constants';

const Receipt = ({ order, station = STATIONS.CAJA, isForPrint = false }) => {
  const { printerConfig } = useOrder();
  if (!order) return null;
  
  const is_paid = order.is_paid;
  const totalPaid = order.is_paid ? order.total_price : 0;
  const pending = order.is_paid ? 0 : order.total_price;

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

  return (
    <div id="printable-receipt-wrapper" className="receipt-wrapper">
      <div 
        className={isForPrint ? "receipt-print" : "receipt-preview"}
        style={{ 
          backgroundColor: 'white', 
          width: '72mm', 
          margin: '0 auto',
          boxSizing: 'border-box',
          paddingLeft: '5mm',
          paddingRight: '5mm',
          paddingTop: '12mm',
          paddingBottom: '30mm',
          fontFamily: 'monospace', 
          fontSize: '11px',
          color: 'black',
          border: isForPrint ? 'none' : '1px solid #ccc',
          lineHeight: '1.5',
          letterSpacing: '0.1px',
          overflow: 'hidden'
        }} 
        id="printable-invoice"
      >
        {/* MINIMALIST HEADER */}
        <div style={{ textAlign: 'center', marginBottom: '15px' }}>
            <div style={{ fontSize: '12px', fontWeight: '900', textDecoration: 'underline' }}>
               TICKET {order.ticket_number}
            </div>
            <div style={{ fontSize: '26px', fontWeight: '900', marginTop: '8px' }}>MANOLO</div>
            <div style={{ fontSize: '13px', fontWeight: '700', letterSpacing: '2px' }}>FOODTRUCK PARK</div>
        </div>

        <div style={{ borderTop: '1px solid black', margin: '10px 0' }}></div>

        {/* METADATA */}
        <div style={{ fontSize: '12px', marginBottom: '15px', lineHeight: '1.7' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', gap: '4px' }}>
              <span>ESTADO:</span>
              <span style={{ fontWeight: '900' }}>{sanitize(order.status === 'cancelled' ? 'ANULADO' : (is_paid ? 'PAGADO' : 'PENDIENTE'))}</span>
           </div>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', gap: '4px' }}>
              <span>FACTURA:</span>
              <span>FAC-{order.ticket_number}</span>
           </div>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', gap: '4px' }}>
              <span>FECHA:</span>
              <span>{sanitize(new Date(order.timestamp).toLocaleString())}</span>
           </div>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', gap: '4px' }}>
              <span>CLIENTE:</span>
              <span style={{ fontWeight: '900' }}>{sanitize(order.customer_name)}</span>
           </div>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', gap: '4px' }}>
              <span>ESTACION:</span>
              <span>{sanitize(getStationDisplay(station, order))}</span>
           </div>
        </div>

        <div style={{ borderTop: '1px solid black', margin: '10px 0' }}></div>

        {/* ITEMS TABLE */}
        <div style={{ margin: '15px 0' }}>
           <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '11px' }}>
              <thead>
                 <tr style={{ borderBottom: '1px solid black' }}>
                    <th style={{ textAlign: 'left', width: '60%', padding: '4px 0' }}>DESC</th>
                    <th style={{ textAlign: 'center', width: '15%', padding: '4px 0' }}>CANT</th>
                    <th style={{ textAlign: 'right', width: '25%', padding: '4px 0' }}>TOTAL</th>
                 </tr>
              </thead>
              <tbody>
                 {order.items?.filter(item => station === 'CAJA' || item.station === station).map((item, i) => (
                    <tr key={i}>
                       <td style={{ textAlign: 'left', padding: '6px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {sanitize(item.products?.name || item.product?.name || 'PRODUCTO')}
                       </td>
                       <td style={{ textAlign: 'center', padding: '6px 0' }}>{item.quantity}</td>
                       <td style={{ textAlign: 'right', padding: '6px 0' }}>${((item.price_at_time || 0) * (item.quantity || 1)).toFixed(2)}</td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>

        <div style={{ borderTop: '1px solid black', margin: '10px 0' }}></div>

        {/* TOTALS SECTION */}
        <div style={{ fontSize: '12px', lineHeight: '1.7' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>TOTAL PEDIDO:</span>
              <span>${order.total_price.toFixed(2)}</span>
           </div>
           
           {order.payment_details?.[station] && (
             <div style={{ marginTop: '5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                   <span>METODO:</span>
                   <span>{sanitize(order.payment_details[station].method === 'cash' ? 'EFECTIVO' : 'TARJETA')}</span>
                </div>
                {order.payment_details[station].method === 'cash' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                       <span>RECIBIDO:</span>
                       <span>${Number(order.payment_details[station].received || 0).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                       <span>CAMBIO:</span>
                       <span>${Number(order.payment_details[station].change || 0).toFixed(2)}</span>
                    </div>
                  </>
                )}
             </div>
           )}

           <div style={{ borderTop: '1px solid black', margin: '10px 0' }}></div>

           <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '900' }}>
              <span>TOTAL PAGADO:</span>
               <span>${totalPaid.toFixed(2)}</span>
           </div>
           
           {pending > 0 && (
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', marginTop: '8px', border: '2px solid black', padding: '4px 6px' }}>
                <span>PENDIENTE:</span>
                <span>${pending.toFixed(2)}</span>
             </div>
           )}
        </div>

        <div style={{ borderTop: '1px dashed black', margin: '20px 0' }}></div>

        {/* QR SECTION */}
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
           <div style={{ display: 'inline-block', padding: '8px', border: '1px solid black' }}>
               <img 
                 src={`https://quickchart.io/qr?text=${encodeURIComponent(`https://manolofoodtruckpark.pages.dev/tracking/${order.id}`)}&size=200&margin=0`} 
                 alt="QR"
                 style={{ width: '110px', height: '110px', display: 'block' }}
               />
           </div>
           <div style={{ marginTop: '10px', fontSize: '10px', fontWeight: '700' }}>
              ESCANÉAME PARA VER EL<br/>ESTADO DE TU PEDIDO
           </div>
        </div>

        <div style={{ borderTop: '1px solid black', margin: '15px 0' }}></div>

        {/* MINIMALIST FOOTER */}
        <div style={{ textAlign: 'center' }}>
           <div style={{ display: 'inline-block', border: '1px solid black', padding: '6px 12px', fontWeight: '900', fontSize: '12px', marginBottom: '10px' }}>
              GRACIAS POR TU COMPRA
           </div>
           <div style={{ fontSize: '10px', fontWeight: '700' }}>VISITANOS PRONTO EN MANOLO</div>
           <div style={{ fontSize: '10px', fontWeight: '700' }}>
              FOODTRUCK PARK
           </div>
        </div>
      </div>
    </div>
  );
};

export default Receipt;
