import React from 'react';
import { useOrder } from '../context/OrderContext';
import { STATIONS, getStationDisplay } from '../utils/constants';

const Receipt = ({ order, station = STATIONS.CAJA }) => {
  const { printerConfig } = useOrder();
  if (!order) return null;
  const config = printerConfig[station] || printerConfig[STATIONS.CAJA];

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
    <div id="printable-receipt-wrapper" style={{ padding: '20px', backgroundColor: '#eee', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
      <div 
        className="receipt-print"
        style={{ 
          backgroundColor: 'white', 
          width: '72mm', 
          padding: '5mm', 
          fontFamily: 'monospace', 
          color: 'black',
          border: '1px solid #ccc',
          lineHeight: '1.2'
        }} 
        id="printable-invoice"
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '15px', borderBottom: '2px solid black', paddingBottom: '10px' }}>
           <div style={{ display: 'inline-block', padding: '5px 10px', backgroundColor: 'black', color: 'white', fontWeight: 'bold', fontSize: '14px' }}>
              TICKET {order.ticket_number}
           </div>
           <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '10px' }}>MANOLO</div>
           <div style={{ fontSize: '12px', fontWeight: 'bold' }}>FOODTRUCK PARK</div>
        </div>

        {/* metadata */}
        <div style={{ fontSize: '11px', marginBottom: '15px' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>ESTADO:</span>
              <span style={{ fontWeight: 'bold' }}>{sanitize(order.status === 'cancelled' ? 'ANULADO' : (is_paid ? 'PAGADO' : 'PENDIENTE'))}</span>
           </div>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>FACTURA:</span>
              <span>FAC-{order.ticket_number}</span>
           </div>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>FECHA:</span>
              <span>{sanitize(new Date(order.timestamp).toLocaleString())}</span>
           </div>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>CLIENTE:</span>
              <span>{sanitize(order.customer_name)}</span>
           </div>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>ESTACION:</span>
              <span>{sanitize(getStationDisplay(station, order))}</span>
           </div>
        </div>

        {/* Table - FIXED LAYOUT TO PREVENT MASHING */}
        <div style={{ borderTop: '1px solid black', borderBottom: '1px solid black', margin: '10px 0', padding: '5px 0' }}>
           <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '11px' }}>
              <thead>
                 <tr style={{ borderBottom: '1px solid black' }}>
                    <th style={{ textAlign: 'left', width: '60%', padding: '2px 0' }}>DESC</th>
                    <th style={{ textAlign: 'center', width: '15%', padding: '2px 0' }}>CANT</th>
                    <th style={{ textAlign: 'right', width: '25%', padding: '2px 0' }}>TOTAL</th>
                 </tr>
              </thead>
              <tbody>
                 {order.items?.filter(item => station === 'CAJA' || item.station === station).map((item, i) => (
                    <tr key={i}>
                       <td style={{ textAlign: 'left', padding: '4px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {sanitize(item.products?.name || item.product?.name || 'PRODUCTO')}
                       </td>
                       <td style={{ textAlign: 'center', padding: '4px 0' }}>{item.quantity}</td>
                       <td style={{ textAlign: 'right', padding: '4px 0' }}>${((item.price_at_time || 0) * (item.quantity || 1)).toFixed(2)}</td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>

        {/* Totals */}
        <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>TOTAL PEDIDO:</span>
              <span>${order.total_price.toFixed(2)}</span>
           </div>
           
           {order.payment_details?.[station] && (
             <div style={{ fontSize: '11px', fontWeight: 'normal', borderTop: '1px dashed #ccc', paddingTop: '4px', marginTop: '4px' }}>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                       <span>CAMBIO:</span>
                       <span>${Number(order.payment_details[station].change || 0).toFixed(2)}</span>
                    </div>
                  </>
                )}
             </div>
           )}

           <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid black', marginTop: '8px', paddingTop: '8px', fontSize: '15px' }}>
              <span>TOTAL PAGADO:</span>
               <span>${totalPaid.toFixed(2)}</span>
           </div>
           
           {pending > 0 && (
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', marginTop: '5px', backgroundColor: 'black', color: 'white', padding: '4px' }}>
                <span>PENDIENTE:</span>
                <span>${pending.toFixed(2)}</span>
             </div>
           )}
        </div>

        {/* QR Section */}
        <div style={{ marginTop: '25px', textAlign: 'center', borderTop: '1px dashed black', paddingTop: '15px' }}>
            <div style={{ display: 'inline-block', padding: '8px', backgroundColor: 'white', border: '1px solid black' }}>
                <img 
                  src={`https://quickchart.io/qr?text=${encodeURIComponent(`https://manolofoodtruckpark.pages.dev/tracking/${order.id}`)}&size=150&margin=0`} 
                  alt="QR"
                  style={{ width: '100px', height: '100px', display: 'block' }}
                />
            </div>
            <div style={{ marginTop: '8px', fontSize: '9px', fontWeight: 'bold' }}>
               ESCANEAME PARA VER EL<br/>ESTADO DE TU PEDIDO
            </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '25px', textAlign: 'center', fontSize: '11px', borderTop: '1px solid black', paddingTop: '15px' }}>
           <div style={{ display: 'inline-block', border: '2px solid black', padding: '5px 10px', fontWeight: 'bold', marginBottom: '8px' }}>
              GRACIAS POR TU COMPRA
           </div>
           <div style={{ fontWeight: 'bold' }}>VISITANOS PRONTO EN MANOLO</div>
           <div style={{ fontWeight: 'bold' }}>FOODTRUCK PARK</div>
        </div>
      </div>
    </div>
  );
};

export default Receipt;
