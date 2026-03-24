import React from 'react';
import { useOrder } from '../context/OrderContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, Utensils, IceCream, Clock, CheckCircle, LogOut } from 'lucide-react';

const StationColumn = ({ label, icon: Icon, color, orders, stationKey }) => {
  // Filter orders that have items for this specific station
  const stationOrders = orders.filter(o => o.status !== 'cancelled' && o.items.some(i => i.station === stationKey));
  
  const preparing = stationOrders.filter(o => o.station_statuses && (o.station_statuses[stationKey] === 'preparing' || o.station_statuses[stationKey] === 'received'));
  const ready = stationOrders.filter(o => o.station_statuses && o.station_statuses[stationKey] === 'ready');

  return (
    <div className="flex-1 flex flex-col gap-3 h-full min-w-0">
      <div className={`p-3 sm:p-4 rounded-[1.5rem] bg-slate-900 border-2 border-slate-800 flex items-center justify-between shadow-xl`}>
         <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl bg-${color}-500/10 text-${color}-500 border border-${color}-500/20`}>
               <Icon size={20} />
            </div>
            <h2 className="text-lg font-black uppercase tracking-tighter italic">{label}</h2>
         </div>
         <div className="bg-slate-950 px-3 py-0.5 rounded-full text-[9px] font-black text-slate-500 uppercase tracking-widest border border-slate-800">
            {stationOrders.length}
         </div>
      </div>

      {/* Ready Section */}
      <div className={`flex-grow flex flex-col gap-3 p-3 rounded-[2rem] bg-${color}-500/5 border border-${color}-500/10 min-h-0`}>
         <div className="flex items-center gap-2 mb-1 px-1">
            <CheckCircle size={12} className={`text-${color}-500`} />
            <span className={`text-[9px] font-black uppercase tracking-widest text-${color}-500/70`}>LISTOS</span>
         </div>
         <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 overflow-y-auto pr-1 custom-scrollbar">
            <AnimatePresence>
              {ready.map(order => (
                <motion.div 
                  key={order.id}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.1, opacity: 0 }}
                  className={`bg-${color}-500 p-3 rounded-2xl shadow-lg flex flex-col gap-0.5 ring-2 ring-white/10 relative overflow-hidden`}
                >
                  <div className="flex justify-between items-start">
                     <span className="text-2xl font-black text-white italic leading-none">#{order.ticket_number}</span>
                     <CheckCircle size={14} className="text-white/40" />
                  </div>
                  <span className="text-sm font-black uppercase text-white truncate w-full">{order.customer_name}</span>
                </motion.div>
              ))}
            </AnimatePresence>
            {ready.length === 0 && (
              <div className="col-span-full h-16 flex items-center justify-center opacity-10 border-2 border-dashed border-white rounded-2xl">
                 <span className="text-[10px] font-black uppercase">Vacio</span>
              </div>
            )}
         </div>

         <div className="h-px bg-white/5 my-2" />

         <div className="h-px bg-white/5 my-1" />

         {/* Preparing Section */}
         <div className="flex items-center gap-2 mb-1 px-1">
            <Clock size={12} className="text-slate-500" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">PREPARANDO</span>
         </div>
         <div className="flex flex-wrap gap-1.5 overflow-y-auto pr-1 custom-scrollbar">
            <AnimatePresence>
              {preparing.map(order => (
                <motion.div 
                  key={order.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-slate-800/50 px-3 py-1.5 rounded-xl border border-slate-700/50 flex items-center gap-2"
                >
                  <span className="text-[11px] font-black text-slate-400">#{order.ticket_number}</span>
                  <span className="text-[9px] font-bold text-slate-500 uppercase truncate max-w-[60px]">{order.customer_name}</span>
                </motion.div>
              ))}
            </AnimatePresence>
         </div>
      </div>
    </div>
  );
};

const PublicDisplay = () => {
  const { orders } = useOrder();

  const stations = [
    { label: 'BAR / BEBIDAS', icon: Coffee, color: 'blue', key: 'BAR' },
    { label: 'COMIDA RAPIDA', icon: Utensils, color: 'amber', key: 'COMIDA RAPIDA' },
    { label: 'POSTRES / DULCES', icon: IceCream, color: 'pink', key: 'DULCES/POSTRES' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans overflow-hidden flex flex-col p-2 sm:p-4 lg:p-6 gap-3 sm:gap-4">
      {/* Dynamic Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-2 border-b border-slate-900 gap-2">
        <div>
          <div className="flex items-center gap-3 mb-1">
             <div className="w-8 h-1 bg-emerald-500 rounded-full" />
             <span className="text-[9px] font-black tracking-[0.3em] text-emerald-500 uppercase">Estado de Pedidos</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black italic tracking-tighter leading-none opacity-90 uppercase italic underline decoration-emerald-500 decoration-4 underline-offset-4">MANOLO <span className="text-emerald-500">FOODTRUCK</span></h1>
        </div>
        <div className="w-full sm:w-auto text-left sm:text-right flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-end gap-2">
           <div className="flex items-center gap-4">
             <div className="text-2xl sm:text-4xl font-black font-mono leading-none tracking-tighter tabular-nums text-emerald-500">
               {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
             </div>
             <button 
               onClick={() => window.location.href = '/login'}
               className="p-3 bg-slate-900 text-slate-500 hover:text-white rounded-2xl border border-slate-800 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 group"
               title="Salir"
             >
               <LogOut size={18} className="group-hover:text-red-500" />
               <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Cerrar</span>
             </button>
           </div>
           <div className="flex items-center gap-2 bg-slate-900 px-3 py-0.5 rounded-full border border-slate-800">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[7px] font-black uppercase tracking-widest text-slate-400">Live Sync</span>
           </div>
        </div>
      </header>

      {/* Main Grid: 3 Sections */}
      <div className="flex-grow flex flex-col lg:flex-row gap-3 sm:gap-4 lg:gap-6 overflow-hidden">
        {stations.map(st => (
          <StationColumn 
            key={st.key}
            label={st.label}
            icon={st.icon}
            color={st.color}
            orders={orders}
            stationKey={st.key}
          />
        ))}
      </div>

      {/* Footer Ticker */}
      <footer className="bg-emerald-600 -mx-6 -mb-6 p-4 overflow-hidden relative">
        <div className="flex items-center gap-20 whitespace-nowrap animate-marquee">
          {[1,2,3].map(i => (
            <span key={i} className="text-lg font-black text-emerald-950 uppercase italic flex items-center gap-8">
              <span>🍔 ¡Bienvenidos a MANOLO FOODTRUCK PARK!</span>
              <div className="w-2 h-2 bg-white rounded-full" />
              <span>🥤 Escanea el QR para pedir</span>
              <div className="w-2 h-2 bg-white rounded-full" />
              <span>🍟 Retira tu pedido en ventana</span>
              <div className="w-2 h-2 bg-white rounded-full" />
            </span>
          ))}
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
          display: flex;
          width: fit-content;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 0px;
        }
      `}} />

      {/* Tailwind dynamic class hints for compiler */}
      <div className="hidden text-blue-500 bg-blue-500/10 border-blue-500/20 text-amber-500 bg-amber-500/10 border-amber-500/20 text-pink-500 bg-pink-500/10 border-pink-500/20 bg-blue-500 bg-amber-500 bg-pink-500 text-blue-500/70 text-amber-500/70 text-pink-500/70"></div>
    </div>
  );
};

export default PublicDisplay;
