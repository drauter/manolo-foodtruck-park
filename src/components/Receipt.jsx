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
          padding: isForPrint ? '0' : '2mm', 
          paddingTop: isForPrint ? '20mm' : '5mm', // Buffer to clear previous cut
          fontFamily: 'monospace', 
          color: 'black',
          border: isForPrint ? 'none' : '1px solid #ccc',
          lineHeight: '1.4',
          letterSpacing: '0.2px',
          paddingBottom: isForPrint ? '50mm' : '10mm' // Safety for cut
        }} 
        id="printable-invoice"
      >
        {/* ORIGINAL PREMIUM HEADER */}
        <div style={{ textAlign: 'center', marginBottom: '25px', borderBottom: '3px solid black', paddingBottom: '15px' }}>
            <div style={{ display: 'inline-block', padding: '8px 15px', backgroundColor: 'black', color: 'white', fontStyle: 'italic', fontWeight: '900', fontSize: '16px', marginBottom: '10px' }}>
               TICKET {order.ticket_number}
            </div>
            <div style={{ fontSize: '28px', fontWeight: '900', marginTop: '5px', letterSpacing: '1px' }}>MANOLO</div>
            <div style={{ fontSize: '14px', fontWeight: '900', letterSpacing: '2px' }}>FOODTRUCK PARK</div>
        </div>

        {/* ORIGINAL METADATA LAYOUT (with better spacing) */}
        <div style={{ fontSize: '13px', marginBottom: '20px', lineHeight: '1.6' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span>ESTADO:</span>
              <span style={{ fontWeight: '900' }}>{sanitize(order.status === 'cancelled' ? 'ANULADO' : (is_paid ? 'PAGADO' : 'PENDIENTE'))}</span>
           </div>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span>FACTURA:</span>
              <span style={{ fontWeight: '700' }}>FAC-{order.ticket_number}</span>
           </div>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span>FECHA:</span>
              <span>{sanitize(new Date(order.timestamp).toLocaleString())}</span>
           </div>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span>CLIENTE:</span>
              <span style={{ fontWeight: '900' }}>{sanitize(order.customer_name)}</span>
           </div>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span>ESTACION:</span>
              <span>{sanitize(getStationDisplay(station, order))}</span>
           </div>
        </div>

        {/* ORIGINAL ITEMS TABLE */}
        <div style={{ borderTop: '2px solid black', borderBottom: '2px solid black', margin: '20px 0', padding: '10px 0' }}>
           <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '12px' }}>
              <thead>
                 <tr style={{ borderBottom: '1px solid black' }}>
                    <th style={{ textAlign: 'left', width: '60%', padding: '6px 0' }}>DESC</th>
                    <th style={{ textAlign: 'center', width: '15%', padding: '6px 0' }}>CANT</th>
                    <th style={{ textAlign: 'right', width: '25%', padding: '6px 0' }}>TOTAL</th>
                 </tr>
              </thead>
              <tbody>
                 {order.items?.filter(item => station === 'CAJA' || item.station === station).map((item, i) => (
                    <tr key={i}>
                       <td style={{ textAlign: 'left', padding: '8px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {sanitize(item.products?.name || item.product?.name || 'PRODUCTO')}
                       </td>
                       <td style={{ textAlign: 'center', padding: '8px 0' }}>{item.quantity}</td>
                       <td style={{ textAlign: 'right', padding: '8px 0' }}>${((item.price_at_time || 0) * (item.quantity || 1)).toFixed(2)}</td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>

        {/* ORIGINAL TOTALS SECTION */}
        <div style={{ fontSize: '13px', fontWeight: '900' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>TOTAL PEDIDO:</span>
              <span>${order.total_price.toFixed(2)}</span>
           </div>
           
           {order.payment_details?.[station] && (
             <div style={{ borderTop: '1px dashed #000', paddingTop: '10px', marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '400' }}>
                   <span>METODO:</span>
                   <span>{sanitize(order.payment_details[station].method === 'cash' ? 'EFECTIVO' : 'TARJETA')}</span>
                </div>
                {order.payment_details[station].method === 'cash' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '400' }}>
                       <span>RECIBIDO:</span>
                       <span>${Number(order.payment_details[station].received || 0).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900' }}>
                       <span>CAMBIO:</span>
                       <span>${Number(order.payment_details[station].change || 0).toFixed(2)}</span>
                    </div>
                  </>
                )}
             </div>
           )}

           <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '3px solid black', marginTop: '15px', paddingTop: '12px', fontSize: '18px' }}>
              <span>TOTAL PAGADO:</span>
               <span>${totalPaid.toFixed(2)}</span>
           </div>
           
           {pending > 0 && (
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', marginTop: '10px', backgroundColor: 'black', color: 'white', padding: '8px' }}>
                <span>PENDIENTE:</span>
                <span>${pending.toFixed(2)}</span>
             </div>
           )}
        </div>

        {/* ORIGINAL QR SECTION */}
        <div style={{ marginTop: '40px', textAlign: 'center', borderTop: '2px dashed black', paddingTop: '20px' }}>
           <div style={{ display: 'flex', justifyContent: 'center' }}>
               <div style={{ display: 'inline-block', padding: '10px', backgroundColor: 'white', border: '2px solid black' }}>
                   <img 
                     src={`https://quickchart.io/qr?text=${encodeURIComponent(`https://manolofoodtruckpark.pages.dev/tracking/${order.id}`)}&size=200&margin=0`} 
                     alt="QR"
                     style={{ width: '120px', height: '120px', display: 'block' }}
                   />
               </div>
           </div>
           <div style={{ marginTop: '12px', fontSize: '11px', fontWeight: '900' }}>
              ESCANEAME PARA VER EL<br/>ESTADO DE TU PEDIDO
           </div>
        </div>

        {/* ORIGINAL PREMIUM FOOTER */}
        <div style={{ marginTop: '50px', textAlign: 'center', fontSize: '13px', borderTop: '2px solid black', paddingTop: '25px' }}>
           <div style={{ display: 'inline-block', border: '3px solid black', padding: '8px 15px', fontWeight: '900', marginBottom: '15px' }}>
              GRACIAS POR TU COMPRA
           </div>
           <div style={{ fontWeight: '900', marginBottom: '6px' }}>VISITANOS PRONTO EN MANOLO</div>
           <div style={{ fontWeight: '900' }}>FOODTRUCK PARK</div>
        </div>
      </div>
    </div>
  );
};

export default Receipt;
