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
          padding: isForPrint ? '0' : '5mm', 
          paddingTop: isForPrint ? '10mm' : '5mm', // Buffer at the top
          fontFamily: 'monospace', 
          color: 'black',
          border: isForPrint ? 'none' : '1px solid #ccc',
          lineHeight: '1.4',
          letterSpacing: '0.2px',
          paddingBottom: isForPrint ? '30mm' : '10mm' // Buffer at the bottom for cut
        }} 
        id="printable-invoice"
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '35px', borderBottom: '3px solid black', paddingBottom: '20px' }}>
            <div style={{ display: 'inline-block', padding: '8px 15px', backgroundColor: 'black', color: 'white', fontStyle: 'italic', fontWeight: '900', fontSize: '18px', marginBottom: '12px' }}>
               TICKET {order.ticket_number}
            </div>
            <div style={{ fontSize: '32px', fontWeight: '900', marginTop: '10px', letterSpacing: '2px' }}>MANOLO</div>
            <div style={{ fontSize: '16px', fontWeight: '900', letterSpacing: '4px' }}>FOODTRUCK PARK</div>
        </div>

        {/* STABLE METADATA TABLE - Replaces Flexbox to prevent vertical overlapping */}
        <div style={{ marginBottom: '30px' }}>
           <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', lineHeight: '2.0', letterSpacing: '0.5px' }}>
              <tbody>
                 <tr>
                    <td style={{ textAlign: 'left', fontWeight: 'normal', width: '40%' }}>ESTADO:</td>
                    <td style={{ textAlign: 'right', fontWeight: '900' }}>{sanitize(order.status === 'cancelled' ? 'ANULADO' : (is_paid ? 'PAGADO' : 'PENDIENTE'))}</td>
                 </tr>
                 <tr>
                    <td style={{ textAlign: 'left', fontWeight: 'normal' }}>FACTURA:</td>
                    <td style={{ textAlign: 'right' }}>FAC-{order.ticket_number}</td>
                 </tr>
                 <tr>
                    <td style={{ textAlign: 'left', fontWeight: 'normal' }}>FECHA:</td>
                    <td style={{ textAlign: 'right' }}>{sanitize(new Date(order.timestamp).toLocaleString())}</td>
                 </tr>
                 <tr>
                    <td style={{ textAlign: 'left', fontWeight: 'normal' }}>CLIENTE:</td>
                    <td style={{ textAlign: 'right' }}>{sanitize(order.customer_name)}</td>
                 </tr>
                 <tr>
                    <td style={{ textAlign: 'left', fontWeight: 'normal' }}>ESTACION:</td>
                    <td style={{ textAlign: 'right' }}>{sanitize(getStationDisplay(station, order))}</td>
                 </tr>
              </tbody>
           </table>
        </div>

        {/* Table - FIXED LAYOUT TO PREVENT MASHING */}
        <div style={{ borderTop: '3px solid black', borderBottom: '3px solid black', margin: '25px 0', padding: '12px 0' }}>
           <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '13px', letterSpacing: '0.8px' }}>
              <thead>
                 <tr style={{ borderBottom: '2px solid black' }}>
                    <th style={{ textAlign: 'left', width: '60%', padding: '8px 0' }}>DESC</th>
                    <th style={{ textAlign: 'center', width: '15%', padding: '8px 0' }}>CANT</th>
                    <th style={{ textAlign: 'right', width: '25%', padding: '8px 0' }}>TOTAL</th>
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

        {/* Totals - Stable Table Layout */}
        <div style={{ fontSize: '14px', fontWeight: '900', letterSpacing: '0.8px', marginTop: '15px' }}>
           <table style={{ width: '100%', borderCollapse: 'collapse', lineHeight: '1.8' }}>
              <tbody>
                 <tr>
                    <td style={{ textAlign: 'left' }}>TOTAL PEDIDO:</td>
                    <td style={{ textAlign: 'right' }}>${order.total_price.toFixed(2)}</td>
                 </tr>
              </tbody>
           </table>
           
           {order.payment_details?.[station] && (
             <div style={{ borderTop: '1px dashed #000', paddingTop: '10px', marginTop: '10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', lineHeight: '1.8', fontWeight: 'normal' }}>
                   <tbody>
                      <tr>
                         <td style={{ textAlign: 'left' }}>METODO:</td>
                         <td style={{ textAlign: 'right' }}>{sanitize(order.payment_details[station].method === 'cash' ? 'EFECTIVO' : 'TARJETA')}</td>
                      </tr>
                      {order.payment_details[station].method === 'cash' && (
                        <>
                           <tr>
                              <td style={{ textAlign: 'left' }}>RECIBIDO:</td>
                              <td style={{ textAlign: 'right' }}>${Number(order.payment_details[station].received || 0).toFixed(2)}</td>
                           </tr>
                           <tr style={{ fontWeight: '900' }}>
                              <td style={{ textAlign: 'left' }}>CAMBIO:</td>
                              <td style={{ textAlign: 'right' }}>${Number(order.payment_details[station].change || 0).toFixed(2)}</td>
                           </tr>
                        </>
                      )}
                   </tbody>
                </table>
             </div>
           )}

           <div style={{ borderTop: '4px solid black', marginTop: '20px', paddingTop: '15px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '20px', fontWeight: '900' }}>
                 <tbody>
                    <tr>
                       <td style={{ textAlign: 'left' }}>TOTAL PAGADO:</td>
                       <td style={{ textAlign: 'right' }}>${totalPaid.toFixed(2)}</td>
                    </tr>
                 </tbody>
              </table>
           </div>
           
           {pending > 0 && (
              <div style={{ marginTop: '12px', backgroundColor: 'black', color: 'white', padding: '10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '20px', fontWeight: '900', color: 'white' }}>
                   <tbody>
                      <tr>
                         <td style={{ textAlign: 'left' }}>PENDIENTE:</td>
                         <td style={{ textAlign: 'right' }}>${pending.toFixed(2)}</td>
                      </tr>
                   </tbody>
                </table>
              </div>
           )}
        </div>

        {/* QR Section */}
        <div style={{ marginTop: '50px', textAlign: 'center', borderTop: '2px dashed black', paddingTop: '30px' }}>
           <div style={{ display: 'flex', justifyContent: 'center' }}>
               <div style={{ display: 'inline-block', padding: '12px', backgroundColor: 'white', border: '3px solid black' }}>
                   <img 
                     src={`https://quickchart.io/qr?text=${encodeURIComponent(`https://manolofoodtruckpark.pages.dev/tracking/${order.id}`)}&size=240&margin=0`} 
                     alt="QR"
                     style={{ width: '150px', height: '150px', display: 'block' }}
                   />
               </div>
           </div>
           <div style={{ marginTop: '18px', fontSize: '13px', fontWeight: '900', letterSpacing: '1px' }}>
              ESCANEAME PARA VER EL<br/>ESTADO DE TU PEDIDO
           </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '60px', textAlign: 'center', fontSize: '15px', borderTop: '3px solid black', paddingTop: '30px' }}>
           <div style={{ display: 'inline-block', border: '4px solid black', padding: '12px 20px', fontWeight: '900', marginBottom: '20px' }}>
              GRACIAS POR TU COMPRA
           </div>
           <div style={{ fontWeight: '900', marginBottom: '8px' }}>VISITANOS PRONTO EN MANOLO</div>
           <div style={{ fontWeight: '900' }}>FOODTRUCK PARK</div>
        </div>
      </div>
    </div>
  );
};

export default Receipt;
