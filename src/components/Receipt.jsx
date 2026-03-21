import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { useOrder } from '../context/OrderContext';

const Receipt = ({ order, station = 'CAJA' }) => {
  if (!order) return null;
  const { printerConfig } = useOrder();
  const config = printerConfig[station] || printerConfig['CAJA'];
  const is58mm = config.paperWidth === '58mm';

  const is_paid = order.is_paid;
  const totalPaid = order.is_paid ? order.total_price : 0;
  const pending = order.is_paid ? 0 : order.total_price;

  return (
    <div className={`bg-white ${is58mm ? 'p-6 max-w-[300px]' : 'p-10 max-w-[440px]'} mx-auto rounded-[3.5rem] shadow-xl font-sans text-slate-600 relative overflow-hidden ring-1 ring-slate-100`} id="printable-invoice">
       <style>{`
          @media print {
            body * { visibility: hidden; }
            #printable-invoice, #printable-invoice * { visibility: visible; }
            #printable-invoice { 
              position: absolute; 
              left: 0; 
              top: 0; 
              width: 100%; 
              margin: 0;
              padding: ${is58mm ? '15px' : '40px'}; 
              box-shadow: none !important;
              font-size: ${is58mm ? '12px' : '16px'};
            }
          }
       `}</style>
       
        {/* Branded Header */}
        <div className="flex flex-col items-center mb-10 pb-10 border-b-2 border-slate-900 border-double">
           <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center mb-4 shadow-xl rotate-3">
              <ShoppingCart className="text-white" size={40} />
           </div>
           <h1 className="text-3xl font-black italic tracking-tighter text-slate-900 leading-none uppercase">MANOLO</h1>
           <h2 className="text-xl font-black uppercase tracking-[0.2em] text-slate-400 mt-1">FOODTRUCK PARK</h2>
        </div>

        {/* Metadata Header */}
       <div className="space-y-4 mb-8">
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
             <span className="text-slate-400">ESTADO:</span>
             <span className={`font-black tracking-tighter italic ${is_paid ? "text-emerald-500" : "text-orange-500"}`}>{order.status === 'cancelled' ? 'ANULADO' : (is_paid ? 'PAGADO' : 'PENDIENTE')}</span>
          </div>
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
             <span>NO. FACTURA:</span>
             <span className="text-slate-900 font-mono">#FAC-{order.ticket_number}-{order.id?.toString().slice(-3) || '000'}</span>
          </div>
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
             <span>FECHA:</span>
             <span className="text-slate-900">{new Date(order.timestamp).toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
             <span>CLIENTE:</span>
             <span className="text-slate-900 font-black italic">{order.customer_name}</span>
          </div>
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
             <span>ESTACIÓN:</span>
             <span className="text-slate-900 font-black italic">{station}</span>
          </div>
       </div>

       {/* Items Table */}
       <div className="mb-10">
          <table className="w-full text-left">
             <thead>
                <tr className="border-b-2 border-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-400">
                   <th className="py-4">DESCRIPCIÓN</th>
                   <th className="py-4 text-center">CANT</th>
                   <th className="py-4 text-right">TOTAL</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                {order.items?.filter(item => station === 'CAJA' || item.station === station).map((item, i) => (
                   <tr key={i} className="text-xs font-bold text-slate-900">
                      <td className="py-4 uppercase tracking-tighter italic">{item.name}</td>
                      <td className="py-4 text-center font-mono">x{item.quantity}</td>
                      <td className="py-4 text-right font-mono">${item.price_at_time * item.quantity}</td>
                   </tr>
                ))}
             </tbody>
          </table>
       </div>

       {/* Totals Section */}
       <div className="space-y-3 pt-6 border-t-2 border-slate-900 border-dashed">
          <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest">
             <span>SUBTOTAL:</span>
             <span className="font-mono text-slate-900">${order.total_price}</span>
          </div>
          <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-emerald-500">
             <span>PAGADO:</span>
             <span className="font-mono">${totalPaid}</span>
          </div>
          <div className="flex justify-between items-center text-lg font-black uppercase tracking-tighter text-slate-950 pt-2">
             <span>PENDIENTE:</span>
             <span className="font-mono decoration-slate-950 underline decoration-2">${pending}</span>
          </div>
       </div>

       {/* Footer */}
       <div className="mt-12 text-center">
          <div className="inline-block px-6 py-2 bg-slate-900 text-white rounded-full text-[8px] font-black uppercase tracking-[0.4em] mb-4 shadow-lg rotate-1">
             ¡GRACIAS POR TU COMPRA!
          </div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">VISÍTANOS PRONTO EN MANOLO FOODTRUCK PARK</p>
       </div>
    </div>
  );
};

export default Receipt;
