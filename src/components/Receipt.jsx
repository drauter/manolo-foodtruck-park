import React from 'react';
import { useOrder } from '../context/OrderContext';
import { STATIONS, getStationDisplay } from '../utils/constants';

const Receipt = ({ order, station = STATIONS.CAJA }) => {
  const { printerConfig } = useOrder();
  if (!order) return null;
  const config = printerConfig[station] || printerConfig[STATIONS.CAJA];
  const is58mm = config.paperWidth === '58mm';

  const is_paid = order.is_paid;
  const totalPaid = order.is_paid ? order.total_price : 0;
  const pending = order.is_paid ? 0 : order.total_price;

  return (
    <div id="printable-receipt-wrapper" style={{ padding: '20px', backgroundColor: '#eee', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
      <div 
        className="receipt-print"
        style={{ 
          backgroundColor: 'white', 
          width: '72mm', 
          padding: '10px', 
          fontFamily: 'monospace', 
          color: 'black',
          border: '1px solid #ccc'
        }} 
        id="printable-invoice"
      >
        <div style={{ textAlign: 'center', marginBottom: '15px', borderBottom: '2px solid black', paddingBottom: '10px' }}>
           <div style={{ display: 'inline-block', padding: '5px', backgroundColor: 'black', color: 'white', fontWeight: 'bold' }}>
              #{order.ticket_number}
           </div>
           <div style={{ fontSize: '20px', fontWeight: 'bold' }}>MANOLO</div>
           <div style={{ fontSize: '14px', fontWeight: 'bold' }}>FOODTRUCK PARK</div>
        </div>

        <div style={{ fontSize: '12px', marginBottom: '15px' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>ESTADO:</span>
              <span>{order.status === 'cancelled' ? 'ANULADO' : (is_paid ? 'PAGADO' : 'PENDIENTE')}</span>
           </div>
           <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>NO. FACTURA:</span>
              <span>#FAC-{order.ticket_number}</span>
           </div>
           <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>FECHA:</span>
              <span>{new Date(order.timestamp).toLocaleString()}</span>
           </div>
           <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>CLIENTE:</span>
              <span>{order.customer_name}</span>
           </div>
           <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>ESTACION:</span>
              <span>{getStationDisplay(station, order).toUpperCase()}</span>
           </div>
        </div>

        <div style={{ borderTop: '1px solid black', borderBottom: '1px solid black', margin: '10px 0', padding: '5px 0', fontSize: '12px' }}>
           <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                 <tr style={{ borderBottom: '1px solid black' }}>
                    <th style={{ textAlign: 'left' }}>DESC</th>
                    <th style={{ textAlign: 'center' }}>CANT</th>
                    <th style={{ textAlign: 'right' }}>TOTAL</th>
                 </tr>
              </thead>
              <tbody>
                 {order.items?.filter(item => station === 'CAJA' || item.station === station).map((item, i) => (
                    <tr key={i}>
                       <td style={{ textAlign: 'left' }}>{item.products?.name || item.product?.name || 'PRODUCTO'}</td>
                       <td style={{ textAlign: 'center' }}>x{item.quantity}</td>
                       <td style={{ textAlign: 'right' }}>${((item.price_at_time || 0) * (item.quantity || 1)).toFixed(2)}</td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>

        <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>TOTAL PEDIDO:</span>
              <span>${order.total_price.toFixed(2)}</span>
           </div>
           
           {order.payment_details?.[station] && (
             <>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                   <span>METODO:</span>
                   <span>{order.payment_details[station].method === 'cash' ? 'EFECTIVO' : 'TARJETA'}</span>
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
             </>
           )}

           <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid black', marginTop: '5px', paddingTop: '5px' }}>
              <span>TOTAL PAGADO:</span>
               <span>${totalPaid.toFixed(2)}</span>
           </div>
           {pending > 0 && (
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', marginTop: '5px' }}>
                <span>PENDIENTE:</span>
                <span>${pending.toFixed(2)}</span>
             </div>
           )}
        </div>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '10px' }}>
           <div style={{ border: '1px solid black', padding: '10px', display: 'inline-block' }}>
              GRACIAS POR TU COMPRA
           </div>
           <p style={{ marginTop: '10px' }}>VISITANOS PRONTO EN MANOLO FOODTRUCK PARK</p>
        </div>
      </div>
    </div>
  );
};

export default Receipt;
