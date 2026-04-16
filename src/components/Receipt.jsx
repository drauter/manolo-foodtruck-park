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

  // Helper for Metadata lines with spacing to prevent overlapping
  const InfoLine = ({ label, value, isBold = false }) => (
    <div style={{ 
      display: 'block', 
      width: '100%', 
      marginBottom: '10px', // Explicit space between lines
      clear: 'both',
      fontSize: '12px',
      height: '16px' // Explicit height for the row
    }}>
      <span style={{ float: 'left', fontWeight: 'normal' }}>{label}</span>
      <span style={{ float: 'right', fontWeight: isBold ? '900' : 'normal' }}>{value}</span>
      <div style={{ clear: 'both' }}></div>
    </div>
  );

  return (
    <div id="printable-receipt-wrapper" className="receipt-wrapper">
      <div 
        className={isForPrint ? "receipt-print" : "receipt-preview"}
        style={{ 
          backgroundColor: 'white', 
          width: '72mm', 
          padding: isForPrint ? '0' : '5mm', 
          paddingTop: isForPrint ? '20mm' : '5mm', // Buffer at the top to clear previous ticket
          fontFamily: 'monospace', 
          color: 'black',
          border: isForPrint ? 'none' : '1px solid #ccc',
          lineHeight: '1.2', // Reset line height and use margins instead
          paddingBottom: isForPrint ? '60mm' : '10mm' // LARGE Buffer at the bottom for cut
        }} 
        id="printable-invoice"
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '35px', borderBottom: '3px solid black', paddingBottom: '20px' }}>
            <div style={{ display: 'inline-block', padding: '10px 15px', backgroundColor: 'black', color: 'white', fontStyle: 'italic', fontWeight: '900', fontSize: '18px', marginBottom: '12px' }}>
               TICKET {order.ticket_number}
            </div>
            <div style={{ fontSize: '32px', fontWeight: '900', marginTop: '10px', letterSpacing: '2px' }}>MANOLO</div>
            <div style={{ fontSize: '16px', fontWeight: '900', letterSpacing: '4px' }}>FOODTRUCK PARK</div>
        </div>

        {/* metadata - Using brute force block separation */}
        <div style={{ marginBottom: '25px' }}>
           <InfoLine label="ESTADO:" value={sanitize(order.status === 'cancelled' ? 'ANULADO' : (is_paid ? 'PAGADO' : 'PENDIENTE'))} isBold={true} />
           <InfoLine label="FACTURA:" value={`FAC-${order.ticket_number}`} />
           <InfoLine label="FECHA:" value={sanitize(new Date(order.timestamp).toLocaleString())} />
           <InfoLine label="CLIENTE:" value={sanitize(order.customer_name)} />
           <InfoLine label="ESTACION:" value={sanitize(getStationDisplay(station, order))} />
        </div>

        {/* Table - Tables are okay as long as they are simple and have high padding */}
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
                       <td style={{ textAlign: 'left', padding: '10px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {sanitize(item.products?.name || item.product?.name || 'PRODUCTO')}
                       </td>
                       <td style={{ textAlign: 'center', padding: '10px 0' }}>{item.quantity}</td>
                       <td style={{ textAlign: 'right', padding: '10px 0' }}>${((item.price_at_time || 0) * (item.quantity || 1)).toFixed(2)}</td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>

        {/* Totals */}
        <div style={{ fontSize: '13px', fontWeight: '900' }}>
           <InfoLine label="TOTAL PEDIDO:" value={`$${order.total_price.toFixed(2)}`} isBold={true} />
           
           {order.payment_details?.[station] && (
             <div style={{ borderTop: '1px dashed black', paddingTop: '10px', marginTop: '10px' }}>
                <InfoLine label="METODO:" value={sanitize(order.payment_details[station].method === 'cash' ? 'EFECTIVO' : 'TARJETA')} />
                {order.payment_details[station].method === 'cash' && (
                  <>
                    <InfoLine label="RECIBIDO:" value={`$${Number(order.payment_details[station].received || 0).toFixed(2)}`} />
                    <InfoLine label="CAMBIO:" value={`$${Number(order.payment_details[station].change || 0).toFixed(2)}`} isBold={true} />
                  </>
                )}
             </div>
           )}

           <div style={{ borderTop: '3px solid black', marginTop: '15px', paddingTop: '15px' }}>
              <div style={{ display: 'block', width: '100%', fontSize: '18px', fontWeight: '900', height: '24px' }}>
                 <span style={{ float: 'left' }}>TOTAL PAGADO:</span>
                 <span style={{ float: 'right' }}>${totalPaid.toFixed(2)}</span>
                 <div style={{ clear: 'both' }}></div>
              </div>
           </div>
           
           {pending > 0 && (
             <div style={{ display: 'block', width: '100%', fontSize: '18px', fontWeight: '900', height: '24px', backgroundColor: 'black', color: 'white', padding: '10px', marginTop: '10px', marginBottom: '10px' }}>
                <span style={{ float: 'left' }}>PENDIENTE:</span>
                <span style={{ float: 'right' }}>${pending.toFixed(2)}</span>
                <div style={{ clear: 'both' }}></div>
             </div>
           )}
        </div>

        {/* QR Section - MANTAINED AS PER USER REQUEST */}
        <div style={{ marginTop: '50px', textAlign: 'center', borderTop: '2px dashed black', paddingTop: '30px' }}>
           <div style={{ display: 'flex', justifyContent: 'center' }}>
               <div style={{ display: 'inline-block', padding: '10px', backgroundColor: 'white', border: '2px solid black' }}>
                   <img 
                     src={`https://quickchart.io/qr?text=${encodeURIComponent(`https://manolofoodtruckpark.pages.dev/tracking/${order.id}`)}&size=200&margin=0`} 
                     alt="QR"
                     style={{ width: '120px', height: '120px', display: 'block' }}
                   />
               </div>
           </div>
           <div style={{ marginTop: '15px', fontSize: '11px', fontWeight: '900' }}>
              ESCANEAME PARA VER EL<br/>ESTADO DE TU PEDIDO
           </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '50px', textAlign: 'center', fontSize: '13px', borderTop: '2px solid black', paddingTop: '30px' }}>
           <div style={{ display: 'inline-block', border: '3px solid black', padding: '8px 15px', fontWeight: '900', marginBottom: '12px' }}>
              GRACIAS POR TU COMPRA
           </div>
           <div style={{ fontWeight: '900', marginBottom: '4px' }}>VISITANOS PRONTO EN MANOLO</div>
           <div style={{ fontWeight: '900' }}>FOODTRUCK PARK</div>
        </div>
      </div>
    </div>
  );
};

export default Receipt;
