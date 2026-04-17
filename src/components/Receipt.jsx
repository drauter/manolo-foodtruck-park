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

  // FLEX-BASED DataRow (More reliable on some thermal drivers)
  const DataRow = ({ label, value, isBold = false, fontSize = '11px', padding = '6px' }) => (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      padding: `${padding} 0`,
      fontSize: fontSize,
      fontWeight: isBold ? '900' : 'normal',
      width: '100%',
      minHeight: '1.2em'
    }}>
      <div style={{ textAlign: 'left', flexShrink: 0, paddingRight: '4px' }}>{label}</div>
      <div style={{ textAlign: 'right', flexGrow: 1 }}>{value}</div>
    </div>
  );

  return (
    <div 
      id={isForPrint ? "printable-receipt-wrapper" : undefined} 
      className="receipt-wrapper" 
      style={{ overflow: 'visible' }}
    >
      <div 
        className={isForPrint ? "receipt-print" : "receipt-preview"}
        style={{ 
          backgroundColor: 'white', 
          width: '72mm', 
          margin: '0 auto',
          boxSizing: 'border-box',
          paddingLeft: '3mm',
          paddingRight: '3mm',
          paddingTop: isForPrint ? '5mm' : '5mm', 
          paddingBottom: '0',
          fontFamily: 'monospace', 
          fontSize: '9px',
          color: 'black',
          border: isForPrint ? 'none' : '1px solid #ccc',
          lineHeight: '1.2', 
          letterSpacing: '0.1px',
          overflow: 'hidden' 
        }} 
        id={isForPrint ? "printable-invoice" : undefined}
      >
        {/* HEADER */}
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <div style={{ fontSize: '9px', fontWeight: '900', textDecoration: 'underline' }}>
               TICKET {order.ticket_number}
            </div>
            <div style={{ fontSize: '24px', fontWeight: '900', marginTop: '6px' }}>MANOLO</div>
            <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '2px' }}>FOODTRUCK PARK</div>
        </div>

        <div style={{ borderTop: '2px solid black', margin: '8px 0' }}></div>

        {/* METADATA - REFACTORED TO FLEXBOX */}
        <div style={{ marginBottom: '8px' }}>
            <DataRow label="ESTADO:" value={order.status === 'cancelled' ? 'ANULADO' : (is_paid ? 'PAGADO' : 'PENDIENTE')} isBold={true} fontSize="9px" />
            <DataRow label="FACTURA:" value={`FAC-${order.ticket_number}`} fontSize="9px" />
            <DataRow label="FECHA:" value={new Date(order.timestamp).toLocaleString()} fontSize="9px" />
            <DataRow label="CLIENTE:" value={order.customer_name} fontSize="9px" />
            <DataRow label="ESTACION:" value={getStationDisplay(station, order)} fontSize="9px" />
        </div>

        <div style={{ borderTop: '1px solid black', margin: '8px 0' }}></div>

        {/* ITEMS SECTION - REFACTORED TO FLEXBOX FOR RELIABILITY */}
        <div style={{ margin: '8px 0' }}>
           {/* HEADER */}
           <div style={{ display: 'flex', borderBottom: '1px solid black', paddingBottom: '4px', fontWeight: '900', fontSize: '9px' }}>
              <div style={{ width: '55%', textAlign: 'left' }}>DESC</div>
              <div style={{ width: '15%', textAlign: 'center' }}>CANT</div>
              <div style={{ width: '30%', textAlign: 'right' }}>TOTAL</div>
           </div>
           
           {/* ROWS */}
           {order.items?.filter(item => station === 'CAJA' || item.station === station).map((item, i) => (
             <div key={i} style={{ display: 'flex', padding: '6px 0', borderBottom: '1px solid #f0f0f0', fontSize: '9px', alignItems: 'center' }}>
                <div style={{ width: '55%', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                   {sanitize(item.products?.name || item.product?.name || 'PRODUCTO')}
                </div>
                <div style={{ width: '15%', textAlign: 'center' }}>{item.quantity}</div>
                <div style={{ width: '30%', textAlign: 'right' }}>${((item.price_at_time || 0) * (item.quantity || 1)).toFixed(2)}</div>
             </div>
           ))}
        </div>

        <div style={{ borderTop: '1px solid black', margin: '8px 0' }}></div>

        {/* TOTALS SECTION - REFACTORED TO FLEXBOX */}
        <div style={{ marginBottom: '8px' }}>
            <DataRow label="TOTAL PEDIDO:" value={`$${order.total_price.toFixed(2)}`} fontSize="9px" />
            {order.payment_details?.[station] && (
              <>
                <DataRow label="METODO:" value={order.payment_details[station].method === 'cash' ? 'EFECTIVO' : 'TARJETA'} fontSize="9px" />
                {order.payment_details[station].method === 'cash' && (
                  <>
                    <DataRow label="RECIBIDO:" value={`$${Number(order.payment_details[station].received || 0).toFixed(2)}`} fontSize="9px" />
                    <DataRow label="CAMBIO:" value={`$${Number(order.payment_details[station].change || 0).toFixed(2)}`} fontSize="9px" />
                  </>
                )}
              </>
            )}

            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '10px 0',
              borderTop: '2px solid black',
              marginTop: '4px'
            }}>
               <div style={{ fontSize: '13px', fontWeight: '900' }}>TOTAL PAGADO:</div>
               <div style={{ fontSize: '13px', fontWeight: '900' }}>${totalPaid.toFixed(2)}</div>
            </div>

            {pending > 0 && (
              <div style={{ border: '2px solid black', padding: '8px', marginTop: '10px' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '13px', fontWeight: '900' }}>PENDIENTE:</div>
                    <div style={{ fontSize: '13px', fontWeight: '900' }}>${pending.toFixed(2)}</div>
                 </div>
              </div>
            )}
        </div>

        <div style={{ borderTop: '1px dashed black', margin: '15px 0' }}></div>

        {/* QR SECTION */}
        <div style={{ textAlign: 'center', marginBottom: '15px' }}>
           <div style={{ display: 'inline-block', padding: '8px', border: '1px solid black', marginBottom: '8px' }}>
               <img 
                 src={`https://quickchart.io/qr?text=${encodeURIComponent(`https://manolofoodtruckpark.pages.dev/tracking/${order.id}`)}&size=200&margin=0`} 
                 alt="QR"
                 style={{ width: '100px', height: '100px', display: 'block' }}
               />
           </div>
           <div style={{ marginTop: '5px', fontSize: '10px', fontWeight: '700' }}>
              ESCANÉAME PARA VER EL<br/>ESTADO DE TU PEDIDO
           </div>
        </div>

        <div style={{ borderTop: '1px solid black', margin: '15px 0' }}></div>

        {/* FOOTER */}
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
           <div style={{ display: 'inline-block', border: '1px solid black', padding: '6px 12px', fontWeight: '900', fontSize: '12px', marginBottom: '4px' }}>
              GRACIAS POR TU COMPRA
           </div>
           <div style={{ fontSize: '10px', fontWeight: '700', marginBottom: '2px' }}>VISITANOS PRONTO EN MANOLO</div>
           <div style={{ fontSize: '10px', fontWeight: '900' }}>
              FOODTRUCK PARK
           </div>
        </div>

        {/* MINIMAL HARDWARE ADVANCE */}
        <div style={{ borderTop: '2px solid black', marginTop: '8px' }}></div>
        <div style={{ height: '20mm' }}></div>
      </div>
    </div>
  );
};

export default Receipt;
