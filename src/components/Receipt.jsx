import React from 'react';
import { useOrder } from '../context/OrderContext';

const Receipt = ({ order, station = 'CAJA' }) => {
  const { printerConfig } = useOrder();
  if (!order) return null;
  const config = printerConfig[station] || printerConfig['CAJA'];
  const is58mm = config.paperWidth === '58mm';

  const is_paid = order.is_paid;
  const totalPaid = order.is_paid ? order.total_price : 0;
  const pending = order.is_paid ? 0 : order.total_price;

  return (
    <div id="printable-receipt-wrapper" className="bg-slate-200 p-4 sm:p-10 min-h-full w-full flex justify-center items-start print:bg-white print:p-0">
      <div 
        className={`bg-white ${is58mm ? 'p-4 w-[58mm]' : 'p-8 w-[80mm]'} shadow-2xl font-sans text-slate-600 relative overflow-hidden print:shadow-none print:w-full print:p-0`} 
        id="printable-invoice"
      >
        <style>{`
          @page {
            margin: 0;
            size: auto;
          }
          @media print {
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              height: auto !important;
            }
            /* Collapse the main app to prevents Page 1 being blank */
            #root {
              height: 0 !important;
              overflow: hidden !important;
            }
            #printable-receipt-wrapper {
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              width: 100% !important;
              height: auto !important;
              background: white !important;
              z-index: 99999 !important;
              display: flex !important;
              justify-content: center !important;
              visibility: visible !important;
            }
            #printable-receipt-wrapper * {
              visibility: visible !important;
            }
            #printable-invoice {
              width: ${is58mm ? '58mm' : '80mm'} !important;
              margin: 0 !important;
              padding: ${is58mm ? '1mm' : '3mm'} !important;
              box-shadow: none !important;
              border: none !important;
              background: white !important;
            }
            .no-print { display: none !important; }
          }
        `}</style>
       
        {/* Branded Header */}
        <div className="flex flex-col items-center mb-6 pb-6 border-b-2 border-slate-900 border-double print:mb-4 print:pb-4">
           <div className="w-16 h-8 bg-slate-950 text-white rounded-lg flex items-center justify-center text-sm font-black mb-2 shadow-lg tracking-widest border-2 border-white/20 print:shadow-none print:border-none">
              #{order.ticket_number}
           </div>
           <h1 className="text-2xl font-black italic tracking-tighter text-slate-900 leading-none uppercase text-center">MANOLO</h1>
           <h2 className="text-lg font-black uppercase tracking-[0.2em] text-slate-400 mt-1 text-center">FOODTRUCK PARK</h2>
        </div>

        {/* Metadata Header */}
       <div className="space-y-3 mb-6 print:mb-4">
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
             <span className="text-slate-400">ESTADO:</span>
             <span className={`font-black tracking-tighter italic ${is_paid ? "text-emerald-500" : "text-orange-500"} print:text-black`}>{order.status === 'cancelled' ? 'ANULADO' : (is_paid ? 'PAGADO' : 'PENDIENTE')}</span>
          </div>
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400 print:text-black/60">
             <span>NO. FACTURA:</span>
             <span className="text-slate-900 font-mono font-black border-b border-slate-900/10">#FAC-{order.ticket_number}-{order.id?.toString().slice(-3) || '000'}</span>
          </div>
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400 print:text-black/60">
             <span>FECHA:</span>
             <span className="text-slate-900">{new Date(order.timestamp).toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400 print:text-black/60">
             <span>CLIENTE:</span>
             <span className="text-slate-900 font-black italic">{order.customer_name}</span>
          </div>
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400 print:text-black/60">
             <span>ESTACIÓN:</span>
             <span className="text-slate-900 font-black italic">{station}</span>
          </div>
       </div>

       {/* Items Table */}
       <div className="mb-6 print:mb-4 text-slate-900">
          <table className="w-full text-left">
             <thead>
                <tr className="border-b-2 border-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-400 print:text-black/60">
                   <th className="py-2">DESCRIPCIÓN</th>
                   <th className="py-2 text-center">CANT</th>
                   <th className="py-2 text-right">TOTAL</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                {order.items?.filter(item => station === 'CAJA' || item.station === station).map((item, i) => (
                   <tr key={i} className="text-xs font-bold text-slate-900">
                      <td className="py-2 uppercase tracking-tighter italic">{item.products?.name || item.product?.name || 'Producto'}</td>
                      <td className="py-2 text-center font-mono">x{item.quantity}</td>
                      <td className="py-2 text-right font-mono">${((item.price_at_time || 0) * (item.quantity || 1)).toFixed(2)}</td>
                   </tr>
                ))}
             </tbody>
          </table>
       </div>

        {/* Totals Section */}
        <div className="space-y-2 pt-4 border-t-2 border-slate-900 border-dashed print:pt-2">
           <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-slate-900">
              <span>TOTAL PEDIDO:</span>
              <span className="font-mono">${order.total_price.toFixed(2)}</span>
           </div>
           
           {order.payment_details?.[station] && (
             <>
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400 print:text-black/60">
                   <span>MÉTODO:</span>
                   <span className="text-slate-900">{order.payment_details[station].method === 'cash' ? 'EFECTIVO' : 'TARJETA'}</span>
                </div>
                {order.payment_details[station].method === 'cash' && (
                  <>
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400 print:text-black/60">
                       <span>RECIBIDO:</span>
                       <span className="text-slate-900 font-mono">${Number(order.payment_details[station].received || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-emerald-600 print:text-black">
                       <span>CAMBIO:</span>
                       <span className="font-mono">${Number(order.payment_details[station].change || 0).toFixed(2)}</span>
                    </div>
                  </>
                )}
             </>
           )}

           <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-emerald-500 border-t border-slate-100 pt-2 mt-2 print:text-black print:border-black/10">
              <span>TOTAL PAGADO:</span>
               <span className="font-mono">${totalPaid.toFixed(2)}</span>
           </div>
           {pending > 0 && (
             <div className="flex justify-between items-center text-lg font-black uppercase tracking-tighter text-slate-950 pt-2">
                <span>PENDIENTE:</span>
                <span className="font-mono decoration-slate-950 underline decoration-2">${pending.toFixed(2)}</span>
             </div>
           )}
        </div>

       {/* Footer */}
       <div className="mt-8 text-center print:mt-4">
          <div className="inline-block px-4 py-1 bg-slate-900 text-white rounded-full text-[8px] font-black uppercase tracking-[0.4em] mb-2 shadow-lg rotate-1 print:shadow-none print:rotate-0 print:border print:border-black print:text-black print:bg-white">
             ¡GRACIAS POR TU COMPRA!
          </div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest print:text-black/60">VISÍTANOS PRONTO EN MANOLO FOODTRUCK PARK</p>
       </div>
      </div>
    </div>
  );
};

export default Receipt;
