import React from 'react';
import { useParams } from 'react-router-dom';
import { useOrder } from '../context/OrderContext';
import { Clock, CheckCircle, Package, Send, ChevronRight, Coffee, Utensils, IceCream } from 'lucide-react';
import { motion } from 'framer-motion';

const EmployeePanel = () => {
  const { station } = useParams();
  const { orders, updateStationStatus } = useOrder();

  // Map URL parameter to display name and icon
  const stationConfig = {
    bar: { label: 'BAR', icon: Coffee, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    food: { label: 'COMIDA RÁPIDA', icon: Utensils, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    sweets: { label: 'DULCES/POSTRES', icon: IceCream, color: 'text-pink-500', bg: 'bg-pink-500/10' },
  };

  const currentStation = stationConfig[station] || stationConfig.food;
  const stationKey = currentStation.label;

  // Filter orders that HAVE items for this station AND are not yet ready for this station
  const stationOrders = orders.filter(order => 
    order.items.some(item => item.station === stationKey) && 
    order.stationStatuses && order.stationStatuses[stationKey] !== 'delivered' &&
    order.stationStatuses[stationKey] !== 'ready'
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      <header className="mb-6 sm:mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-800 shadow-2xl">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className={`p-3 sm:p-5 rounded-2xl sm:rounded-3xl ${currentStation.bg} ${currentStation.color} shadow-lg shadow-current/10 border border-current/20`}>
            <currentStation.icon size={32} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tighter uppercase italic leading-none">ESTACIÓN: <span className={currentStation.color}>{currentStation.label}</span></h1>
            <p className="text-slate-400 mt-1 font-bold uppercase tracking-widest text-[8px] sm:text-xs opacity-60">Panel de Producción</p>
          </div>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-slate-950 px-4 sm:px-6 py-3 sm:py-4 rounded-2xl sm:rounded-3xl border border-slate-800 flex items-center gap-4 w-full sm:w-auto justify-center">
            <div className={`w-3 h-3 rounded-full animate-pulse ${currentStation.color.replace('text', 'bg')}`} />
            <span className="font-black text-lg sm:text-xl">{stationOrders.length} Pendientes</span>
          </div>
        </div>
      </header>

      {stationOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 bg-slate-900/30 rounded-[3rem] border border-dashed border-slate-800">
           <Package size={64} className="text-slate-800 mb-6" />
           <h2 className="text-2xl font-bold text-slate-600 uppercase tracking-widest">Sin pedidos pendientes</h2>
           <p className="text-slate-700 mt-2 italic text-lg">Buen trabajo equipo, la cocina está al día.</p>
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
              {/* Order Header */}
              <div className="p-6 bg-slate-800/50 flex justify-between items-center border-b border-slate-800">
                 <div className="flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-3">
                        <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">#{order.ticketNumber}</div>
                        {order.isPaid && (
                          <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 flex items-center gap-1">
                            <CheckCircle size={10} /> PAGADO
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Clock size={12} /> {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="text-3xl font-black italic text-white leading-none mt-1 truncate max-w-[150px] uppercase tracking-tighter">{order.customerName}</div>
                    <div className="text-[8px] font-black uppercase text-emerald-500 tracking-widest mt-1 opacity-70">
                       {order.source === 'seller' ? `Venta Directa: ${order.originStation}` : 'Pedido QR Cliente'}
                    </div>
                 </div>
                 <div className="text-right">
                    <div className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-1">Status</div>
                    <div className="px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full text-[10px] font-black uppercase tracking-widest">
                       {order.status}
                    </div>
                 </div>
              </div>

              {/* Order Items for THIS station */}
              <div className="p-8 flex-grow space-y-4">
                {order.items.filter(item => item.station === stationKey).map((item, i) => (
                  <div key={i} className="flex justify-between items-center gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <div className="flex gap-4 items-center">
                      <span className="bg-emerald-500 text-emerald-950 font-black w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-emerald-500/20">
                        {item.quantity}
                      </span>
                      <span className="text-xl font-bold text-slate-100">{item.name}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <div className="p-6 bg-slate-800/20 mt-auto">
                <button 
                  onClick={() => updateStationStatus(order.id, stationKey, 'ready')}
                  className="w-full py-5 bg-white text-slate-950 font-black rounded-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 text-lg shadow-xl"
                >
                  <CheckCircle size={24} /> MARCAR LISTO EN {station.toUpperCase()}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmployeePanel;
