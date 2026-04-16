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

  // Helper for Table Rows with explicit height for thermal motor stepping
  const DataRow = ({ label, value, isBold = false, height = '28px' }) => (
    <tr style={{ height }}>
      <td style={{ textAlign: 'left', verticalAlign: 'middle', fontSize: '12px' }}>{sanitize(label)}</td>
      <td style={{ textAlign: 'right', verticalAlign: 'middle', fontSize: '12px', fontWeight: isBold ? '900' : 'normal' }}>{sanitize(value)}</td>
    </tr>
  );

  return (
    <div id="printable-receipt-wrapper" className="receipt-wrapper" style={{ marginTop: 0, paddingTop: 0 }}>
      <div 
        className={isForPrint ? "receipt-print" : "receipt-preview"}
        style={{ 
          backgroundColor: 'white', 
          width: '72mm', 
          margin: '0 auto',
          boxSizing: 'border-box',
          paddingLeft: '5mm',
          paddingRight: '5mm',
          paddingTop: '15mm', // Balanced top advance
          paddingBottom: '0',
          fontFamily: 'monospace', 
          fontSize: '12px',
          color: 'black',
          border: isForPrint ? 'none' : '1px solid #ccc',
          lineHeight: '1.2', // Tight for table control
          letterSpacing: '0.1px',
          overflow: 'hidden'
        }} 
        id={isForPrint ? "printable-invoice" : undefined}
      >
        {/* HEADER */}
        <div style={{ textAlign: 'center', marginBottom: '15px' }}>
            <div style={{ fontSize: '12px', fontWeight: '900', textDecoration: 'underline' }}>
               TICKET {order.ticket_number}
            </div>
            <div style={{ fontSize: '26px', fontWeight: '900', marginTop: '8px' }}>MANOLO</div>
            <div style={{ fontSize: '13px', fontWeight: '700', letterSpacing: '2px' }}>FOODTRUCK PARK</div>
        </div>

        <div style={{ borderTop: '1px solid black', margin: '10px 0' }}></div>

        {/* METADATA - USING TABLES TO PREVENT OVERLAPPING */}
        <div style={{ marginBottom: '15px' }}>
           <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
              <tbody>
                 <DataRow label="ESTADO:" value={order.status === 'cancelled' ? 'ANULADO' : (is_paid ? 'PAGADO' : 'PENDIENTE')} isBold={true} />
                 <DataRow label="FACTURA:" value={`FAC-${order.ticket_number}`} />
                 <DataRow label="FECHA:" value={new Date(order.timestamp).toLocaleString()} />
                 <DataRow label="CLIENTE:" value={order.customer_name} />
                 <DataRow label="ESTACION:" value={getStationDisplay(station, order)} />
              </tbody>
           </table>
        </div>

        <div style={{ borderTop: '1px solid black', margin: '10px 0' }}></div>

        {/* ITEMS TABLE */}
        <div style={{ margin: '15px 0' }}>
           <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '11px' }}>
              <thead>
                 <tr style={{ borderBottom: '1px solid black', height: '25px' }}>
                    <th style={{ textAlign: 'left', width: '60%', verticalAlign: 'middle' }}>DESC</th>
                    <th style={{ textAlign: 'center', width: '15%', verticalAlign: 'middle' }}>CANT</th>
                    <th style={{ textAlign: 'right', width: '25%', verticalAlign: 'middle' }}>TOTAL</th>
                 </tr>
              </thead>
              <tbody>
                 {order.items?.filter(item => station === 'CAJA' || item.station === station).map((item, i) => (
                    <tr key={i} style={{ height: '28px' }}>
                       <td style={{ textAlign: 'left', verticalAlign: 'middle', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {sanitize(item.products?.name || item.product?.name || 'PRODUCTO')}
                       </td>
                       <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{item.quantity}</td>
                       <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>${((item.price_at_time || 0) * (item.quantity || 1)).toFixed(2)}</td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>

        <div style={{ borderTop: '1px solid black', margin: '10px 0' }}></div>

        {/* TOTALS SECTION - USING TABLES TO PREVENT OVERLAPPING */}
        <div style={{ marginBottom: '15px' }}>
           <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
              <tbody>
                 <DataRow label="TOTAL PEDIDO:" value={`$${order.total_price.toFixed(2)}`} />
                 
                 {order.payment_details?.[station] && (
                   <>
                     <DataRow label="METODO:" value={order.payment_details[station].method === 'cash' ? 'EFECTIVO' : 'TARJETA'} />
                     {order.payment_details[station].method === 'cash' && (
                       <>
                         <DataRow label="RECIBIDO:" value={`$${Number(order.payment_details[station].received || 0).toFixed(2)}`} />
                         <DataRow label="CAMBIO:" value={`$${Number(order.payment_details[station].change || 0).toFixed(2)}`} />
                       </>
                     )}
                   </>
                 )}

                 <tr style={{ height: '40px', borderTop: '1px solid black' }}>
                    <td style={{ textAlign: 'left', verticalAlign: 'middle', fontSize: '16px', fontWeight: '900' }}>TOTAL PAGADO:</td>
                    <td style={{ textAlign: 'right', verticalAlign: 'middle', fontSize: '16px', fontWeight: '900' }}>${totalPaid.toFixed(2)}</td>
                 </tr>

                 {pending > 0 && (
                   <tr style={{ height: '40px' }}>
                      <td colSpan="2" style={{ border: '2px solid black' }}>
                         <table style={{ width: '100%' }}>
                            <tbody>
                               <tr>
                                  <td style={{ textAlign: 'left', fontSize: '16px', fontWeight: '900' }}>PENDIENTE:</td>
                                  <td style={{ textAlign: 'right', fontSize: '16px', fontWeight: '900' }}>${pending.toFixed(2)}</td>
                               </tr>
                            </tbody>
                         </table>
                      </td>
                   </tr>
                 )}
              </tbody>
           </table>
        </div>

        <div style={{ borderTop: '1px dashed black', margin: '15px 0' }}></div>

        {/* QR SECTION */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
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

        {/* FOOTER */}
        <div style={{ textAlign: 'center' }}>
           <div style={{ display: 'inline-block', border: '1px solid black', padding: '6px 12px', fontWeight: '900', fontSize: '12px', marginBottom: '10px' }}>
              GRACIAS POR TU COMPRA
           </div>
           <div style={{ fontSize: '10px', fontWeight: '700' }}>VISITANOS PRONTO EN MANOLO</div>
           <div style={{ fontSize: '10px', fontWeight: '700' }}>
              FOODTRUCK PARK
           </div>
        </div>
        <div style={{ height: '30mm' }}></div>
      </div>
    </div>
  );
};

export default Receipt;
