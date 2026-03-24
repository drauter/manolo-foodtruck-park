import React from 'react';
import { useOrder } from '../context/OrderContext';

const Receipt = ({ order, station = 'CAJA' }) => {
  const { printerConfig } = useOrder();
  if (!order) return null;
  const config = printerConfig[station] || printerConfig['CAJA'];
  const is58mm = config.paperWidth === '58mm';

  const is_paid = order.is_paid;

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
       
        {/* QR Code Placeholder */}
        <div className="flex justify-center mb-4">
           <div className="w-12 h-12 border-2 border-slate-900 p-1 flex items-center justify-center overflow-hidden">
              <div className="grid grid-cols-4 gap-0.5 w-full h-full opacity-80">
                 {[...Array(16)].map((_, i) => (
                    <div key={i} className={`bg-slate-900 ${[0,3,4,6,9,11,12,15].includes(i) ? '' : 'opacity-0'}`} />
                 ))}
              </div>
           </div>
        </div>

        {/* Branded Header */}
        <div className="text-center mb-6 space-y-1">
           <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase leading-tight">MANOLO FOODTRUCK PARK</h1>
           <p className="text-[9px] font-bold text-slate-500 uppercase italic">Sabor urbano a tu alcance</p>
           <p className="text-[9px] font-bold text-slate-500">(809) 000-0000</p>
           <p className="text-[10px] font-bold text-slate-900 mt-2 uppercase tracking-wide">Comprobante de Pago</p>
           <p className="text-[9px] font-bold text-slate-500 uppercase">{new Date(order.timestamp).toLocaleDateString()}</p>
        </div>

        <div className="border-t border-slate-300 my-4" />

        {/* Info Section */}
        <div className="space-y-1.5 mb-6 text-[11px] font-medium text-slate-900">
           <div className="flex justify-between items-start">
              <span className="w-24 shrink-0">Cliente ID</span>
              <span className="flex-grow">: {order.ticket_number}</span>
           </div>
           <div className="flex justify-between items-start">
              <span className="w-24 shrink-0">Cliente</span>
              <span className="flex-grow uppercase italic">: {order.customer_name}</span>
           </div>
           <div className="flex justify-between items-start">
              <span className="w-24 shrink-0">Ticket No.</span>
              <span className="flex-grow">: {order.ticket_number}</span>
           </div>
           <div className="flex justify-between items-start">
              <span className="w-24 shrink-0">Estación</span>
              <span className="flex-grow uppercase">: {station}</span>
           </div>
        </div>

        <div className="border-t border-slate-300 my-4" />

        {/* Items Section */}
        <div className="space-y-2 mb-6 text-[11px] font-medium uppercase text-slate-900">
           {order.items?.filter(item => station === 'CAJA' || item.station === station).map((item, i) => (
              <div key={i} className="flex justify-between items-start gap-2">
                 <span className="flex-grow italic">{item.products?.name || item.product?.name || 'Producto'}</span>
                 <span className="font-mono whitespace-nowrap text-right lowercase shrink-0">: {item.quantity} x ${(item.price_at_time || 0).toFixed(2)}</span>
              </div>
           ))}
        </div>

        <div className="border-t border-slate-300 my-4" />

        {/* Totals Section */}
        <div className="space-y-1.5 mb-6 text-[11px] font-bold text-slate-900">
           <div className="flex justify-between items-center">
              <span className="w-24 shrink-0 leading-none">Pago Total</span>
              <span className="font-mono">: ${order.total_price.toFixed(2)}</span>
           </div>
           
           {order.payment_details?.[station] && (
             <>
                <div className="flex justify-between items-center text-slate-500 font-medium">
                   <span className="w-24 shrink-0 leading-none lowercase italic text-[9px]">recibido</span>
                   <span className="font-mono">: ${Number(order.payment_details[station].received || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                   <span className="w-24 shrink-0 leading-none lowercase italic text-[10px]">cambio</span>
                   <span className="font-mono">: ${Number(order.payment_details[station].change || 0).toFixed(2)}</span>
                </div>
             </>
           )}
        </div>

        <div className="border-t border-slate-300 my-4" />

        {/* Footer text matching screenshot */}
        <div className="mt-8">
           <p className="text-[9px] leading-tight text-slate-500 text-center italic">
              Exija su comprobante de pago, no se aceptan reclamaciones sin él.
           </p>
           <p className="text-[8px] font-bold text-slate-400 text-center mt-6 tracking-[0.2em] uppercase">
              ¡Gracias por preferirnos!
           </p>
        </div>
      </div>
    </div>
  );
};

export default Receipt;
