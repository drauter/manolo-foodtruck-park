import React from 'react';
import { useParams } from 'react-router-dom';
import { useOrder } from '../context/OrderContext';
import { Clock, CheckCircle, Package, Printer, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Receipt from '../components/Receipt';

const EmployeePanel = () => {
  const { station } = useParams();
  const { orders, updateStationStatus } = useOrder();
  const [printingOrder, setPrintingOrder] = React.useState(null);

  // Map URL parameter to display name and icon
  const stationConfig = {
    'bar': { label: 'BAR', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    'comida-rapida': { label: 'COMIDA RÁPIDA', color: 'text-amber-500', bg: 'bg-amber-500/10' },
    'dulces-postres': { label: 'DULCES/POSTRES', color: 'text-pink-500', bg: 'bg-pink-500/10' },
    'food': { label: 'COMIDA RÁPIDA', color: 'text-amber-500', bg: 'bg-amber-500/10' },
    'sweets': { label: 'DULCES/POSTRES', color: 'text-pink-500', bg: 'bg-pink-500/10' },
  };

  const currentStation = stationConfig[station.toLowerCase()] || stationConfig['comida-rapida'];
  const stationKey = currentStation.label;

  const stationOrders = orders.filter(order => 
    order.items?.some(item => item.station === stationKey) && 
    order.station_statuses && order.station_statuses[stationKey] !== 'delivered' &&
    order.station_statuses[stationKey] !== 'ready'
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl">
        <div className="flex items-center gap-6">
          <div className={`p-5 rounded-3xl ${currentStation.bg} ${currentStation.color} shadow-lg border border-current/20`}>
            <Printer size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none">ESTACIÓN: <span className={currentStation.color}>{currentStation.label}</span></h1>
            <p className="text-slate-400 mt-1 font-bold uppercase tracking-widest text-xs opacity-60">Panel de Producción Independiente</p>
          </div>
        </div>
        
        <div className="bg-slate-950 px-6 py-4 rounded-3xl border border-slate-800 flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full animate-pulse ${currentStation.color.replace('text', 'bg')}`} />
          <span className="font-black text-xl">{stationOrders.length} Pendientes</span>
        </div>
      </header>

      {stationOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 bg-slate-900/30 rounded-[3rem] border border-dashed border-slate-800">
           <Package size={64} className="text-slate-800 mb-6" />
           <h2 className="text-2xl font-bold text-slate-600 uppercase tracking-widest">Sin pedidos pendientes</h2>
           <p className="text-slate-700 mt-2 italic text-lg">Buen trabajo, todo está al día.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {stationOrders.map((order, idx) => (
            <motion.div 
              key={order.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden flex flex-col shadow-2xl relative group hover:border-emerald-500/30 transition-all"
            >
              <div className="p-6 bg-slate-800/50 flex justify-between items-center border-b border-slate-800">
                 <div className="flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-3">
                        <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">#{order.ticket_number}</div>
                        {order.is_paid && <span className="bg-emerald-500 text-white text-[8px] px-2 py-0.5 rounded-full font-black uppercase">PAGADO</span>}
                      </div>
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Clock size={12} /> {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="text-3xl font-black italic text-white leading-none mt-1 truncate max-w-[150px] uppercase tracking-tighter">{order.customer_name}</div>
                 </div>
              </div>

              <div className="p-8 flex-grow space-y-4">
                {order.items.filter(item => item.station === stationKey).map((item, i) => (
                  <div key={i} className="flex justify-between items-center gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <div className="flex gap-4 items-center">
                      <span className="bg-emerald-500 text-emerald-950 font-black w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-lg">
                        {item.quantity}
                      </span>
                      <span className="text-xl font-bold text-slate-100">{item.name}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4 p-6 bg-slate-800/20 mt-auto">
                <button 
                  onClick={() => setPrintingOrder(order)}
                  className="flex-grow py-5 bg-slate-800 text-white font-black rounded-2xl hover:bg-slate-700 transition-all flex items-center justify-center gap-3 text-lg border border-white/5 shadow-xl"
                >
                  <Printer size={24} /> IMPRIMIR
                </button>
                <button 
                  onClick={() => updateStationStatus(order.id, stationKey, 'ready')}
                  className="flex-[2] py-5 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-500 active:scale-95 transition-all flex items-center justify-center gap-3 text-lg shadow-xl"
                >
                  <CheckCircle size={24} /> MARCAR LISTO
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Print Modal */}
      <AnimatePresence>
        {printingOrder && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPrintingOrder(null)} className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[100]" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="fixed inset-4 sm:inset-10 z-[101] flex flex-col items-center">
              <div className="w-full max-w-2xl flex flex-col h-full overflow-hidden">
                <div className="flex justify-end p-4">
                   <button onClick={() => setPrintingOrder(null)} className="p-4 bg-white/10 text-white rounded-2xl hover:bg-white/20 transition-all"><X size={24} /></button>
                </div>
                <div className="flex-grow w-full overflow-y-auto flex justify-center pb-32 custom-scrollbar">
                   <Receipt order={printingOrder} station={stationKey} />
                </div>
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[110]">
                  <button 
                    onClick={() => window.print()}
                    className="px-12 py-6 bg-white text-slate-950 font-black rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-4 hover:scale-105 active:scale-95 transition-all text-xl uppercase tracking-widest border-4 border-emerald-500/20"
                  >
                    <Printer size={28} /> Confirmar Impresión
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmployeePanel;
