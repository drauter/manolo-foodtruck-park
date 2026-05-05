import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useOrder } from '../context/OrderContext';
import { 
  Clock, CheckCircle2, Package, ChevronLeft, Coffee, Utensils, 
  IceCream, Wallet, Loader2, CreditCard, XCircle, PackageCheck, Receipt
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { STATIONS } from '../utils/constants';

const OrderTracking = () => {
  const { orderId: currentOrderId } = useParams();
  const { orders, loadingOrders } = useOrder();
  const navigate = useNavigate();
  
  const [trackedOrderIds, setTrackedOrderIds] = useState(() => {
    const saved = localStorage.getItem('manolo_tracked_orders');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeTabId, setActiveTabId] = useState(currentOrderId);

  // Use activeTabId to find the order to display
  const order = orders.find(o => o.id === activeTabId) || orders.find(o => o.id === (currentOrderId || ''));

  // Filter tracked orders to only show those that still exist in Supabase and ARE NOT CANCELLED
  const activeOrders = orders.filter(o => trackedOrderIds.includes(o.id) && o.status !== 'cancelled');

  // Sync current URL ID with tracked list and state
  useEffect(() => {
    if (currentOrderId && activeTabId !== currentOrderId) {
      const saved = localStorage.getItem('manolo_tracked_orders');
      const prev = saved ? JSON.parse(saved) : [];
      if (!prev.includes(currentOrderId)) {
        const newList = [...prev, currentOrderId];
        localStorage.setItem('manolo_tracked_orders', JSON.stringify(newList));
        setTimeout(() => setTrackedOrderIds(newList), 0);
      }
      setTimeout(() => setActiveTabId(currentOrderId), 0);
    }
  }, [currentOrderId, activeTabId]);

  // Check if current order was cancelled and remove it from tracking
  useEffect(() => {
    if (order && order.status === 'cancelled') {
        const newList = trackedOrderIds.filter(id => id !== order.id);
        if (newList.length !== trackedOrderIds.length) {
          localStorage.setItem('manolo_tracked_orders', JSON.stringify(newList));
          setTimeout(() => setTrackedOrderIds(newList), 0);
        }
        
        // Switch to another active tab if possible
        if (activeOrders.length > 0) {
            const nextOrder = activeOrders.find(o => o.id !== order.id) || activeOrders[0];
            if (nextOrder && activeTabId !== nextOrder.id) {
               setTimeout(() => {
                 setActiveTabId(nextOrder.id);
                 navigate(`/tracking/${nextOrder.id}`, { replace: true });
               }, 0);
            }
        }
    }
  }, [order?.status, activeOrders, trackedOrderIds, navigate, order?.id, activeTabId, order]);

  if (loadingOrders) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
        <h2 className="text-xl font-black uppercase italic tracking-tighter">Cargando tu pedido...</h2>
      </div>
    );
  }

  if (!order && !activeOrders.length) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center mb-8 border border-white/5 shadow-2xl">
           <Package size={48} className="text-slate-700" />
        </div>
        <h2 className="text-3xl font-black uppercase italic tracking-tighter">No hay pedidos activos</h2>
        <p className="text-slate-500 mt-4 font-bold uppercase text-[10px] tracking-[0.3em] max-w-[250px] leading-relaxed">Escanea el QR para ver el estado de tu orden</p>
        <Link to="/menu" className="mt-10 bg-white text-slate-950 px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-xl">Ir al Menú</Link>
      </div>
    );
  }

  // If we have active orders but the current one isn't found, pick the first active one
  const displayOrder = order || activeOrders[0];

  if (!displayOrder) {
     return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
           <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
           <p>Buscando orden...</p>
        </div>
     );
  }

  const stationIcons = {
    [STATIONS.BAR]: Coffee,
    [STATIONS.COMIDA_RAPIDA]: Utensils,
    [STATIONS.POSTRES]: IceCream
  };

  const isReadyGlobal = displayOrder.status === 'ready' || displayOrder.status === 'delivered';
  const is_paid = displayOrder.is_paid;

  const getStatusText = () => {
    if (displayOrder.status === 'cancelled') return 'Pedido Anulado';
    if (displayOrder.status === 'delivered') return '¡Entregado!';
    if (isReadyGlobal) return is_paid ? '¡Todo Listo!' : '¡Pedido Listo!';
    return is_paid ? 'Preparando Pago' : 'En Producción';
  };

  const getStatusIcon = () => {
    if (displayOrder.status === 'cancelled') return <XCircle className="text-red-500" size={48} />;
    if (displayOrder.status === 'delivered') return <PackageCheck className="text-emerald-500" size={48} />;
    if (isReadyGlobal) {
      return is_paid 
        ? <CheckCircle2 className="text-emerald-500 shadow-emerald-500/50 shadow-lg" size={48} /> 
        : <Clock className="text-orange-500 animate-pulse" size={48} />;
    }
    return is_paid 
      ? <CreditCard className="text-blue-500 animate-bounce" size={48} /> 
      : <Utensils className="text-emerald-500 animate-spin-slow" size={48} />;
  };

  const getInstructions = () => {
    if (displayOrder.status === 'cancelled') return 'Este pedido ha sido anulado por la administración.';
    if (displayOrder.status === 'delivered') return '¡Gracias por tu compra! Esperamos verte pronto.';
    if (isReadyGlobal) {
      return is_paid 
        ? 'Tu pedido te espera en la ventana de entrega.' 
        : 'Pasa por caja para realizar el pago y retirar tu pedido.';
    }
    return is_paid 
      ? 'Tu pago fue confirmado. Estamos terminando tu pedido.' 
      : 'Puedes pasar por caja para realizar tu pago';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 overflow-x-hidden selection:bg-emerald-500/30">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent opacity-50 pointer-events-none" />
      
      <header className="max-w-md mx-auto flex items-center justify-between mb-10 relative z-10">
         <div className="flex items-center gap-4">
            <button onClick={() => navigate('/menu')} className="p-4 bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-2xl text-slate-400 hover:text-white transition-all shadow-lg active:scale-95"><ChevronLeft size={24} /></button>
            <img src="/logo.png" alt="Logo" className="w-12 h-12 object-cover rounded-full border border-white/5" />
         </div>
         <div className="text-right">
            <div className="text-[10px] font-black uppercase text-emerald-500 tracking-[0.4em] mb-1">MANOLO FOOD AND DRINKS TRUCK PARK • LIVE TRACKING</div>
            <div className="text-4xl font-black italic text-white tracking-tighter leading-none">#{order?.ticket_number || '---'}</div>
         </div>
      </header>

      {/* Multi-Order Tabs */}
      {activeOrders.length > 1 && (
        <div className="max-w-md mx-auto mb-10 relative z-10">
           <div className="flex items-center gap-3 overflow-x-auto pb-4 custom-scrollbar-hide no-scrollbar">
              {activeOrders.map(o => (
                 <button 
                    key={o.id}
                    onClick={() => {
                        setActiveTabId(o.id);
                        navigate(`/tracking/${o.id}`, { replace: true });
                    }}
                    className={`shrink-0 px-6 py-4 rounded-2xl border transition-all flex flex-col items-center gap-1 ${activeTabId === o.id ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg scale-105' : 'bg-slate-900 border-white/5 text-slate-500 hover:text-slate-300'}`}
                 >
                    <span className="text-[8px] font-black uppercase tracking-widest opacity-60">Ticket</span>
                    <span className="text-xl font-black italic tracking-tighter leading-none">#{o.ticket_number}</span>
                 </button>
              ))}
           </div>
        </div>
      )}

      <div className="max-w-md mx-auto space-y-8 relative z-10">
         {/* Overall Status Banner */}
         <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={`p-10 rounded-[3.5rem] text-center relative overflow-hidden shadow-2xl border ${isReadyGlobal ? 'bg-emerald-600 border-emerald-400 shadow-emerald-900/40' : (displayOrder.status === 'delivered' ? 'bg-blue-600 border-blue-400 shadow-blue-900/40' : 'bg-slate-900 border-white/10 shadow-black')}`}
         >
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl animate-pulse" />
            <div className="relative z-10 flex flex-col items-center">
               <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mb-6 border border-white/20 shadow-inner">
                  {getStatusIcon()}
               </div>
               <h2 className="text-5xl font-black uppercase italic tracking-tighter mb-3 leading-none text-white whitespace-pre-wrap">
                  {getStatusText()}
               </h2>
               <p className="text-[11px] font-black uppercase tracking-widest text-white/80 max-w-[200px] leading-relaxed">
                  {getInstructions()}
               </p>
            </div>
         </motion.div>

         {/* Payment Status Badge */}
         <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={`flex items-center justify-between p-6 rounded-[2rem] border-2 transition-all ${is_paid ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-500'}`}
         >
            <div className="flex items-center gap-4">
               <div className={`p-3 rounded-xl ${is_paid ? 'bg-blue-500 text-white' : 'bg-amber-500 text-white'} shadow-lg`}>
                  {is_paid ? <CreditCard size={20} /> : <Wallet size={20} />}
               </div>
               <div>
                  <div className="text-[10px] font-black uppercase tracking-widest opacity-60 leading-none mb-1">Estado de Pago</div>
                  <div className="text-lg font-black italic tracking-tight uppercase">{is_paid ? 'Confirmado' : 'Pendiente'}</div>
               </div>
            </div>
            {is_paid ? <CheckCircle2 className="text-blue-400 shadow-blue-500/50 shadow-lg" /> : <div className="w-2 h-2 bg-amber-500 rounded-full animate-ping" />}
         </motion.div>

         {/* Station Progress */}
         <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500 ml-4 mb-2">Detalle por Estación</h3>
            {Object.entries(displayOrder.station_statuses || {}).map(([station, status], idx) => {
               const Icon = stationIcons[station] || Package;
               const isDone = status === 'ready' || status === 'delivered';
               
               return (
                  <motion.div 
                    key={station}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 + (idx * 0.1) }}
                    className={`p-6 rounded-[2.25rem] border flex items-center justify-between gap-4 transition-all ${isDone ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-900 border-white/5'}`}
                  >
                     <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-2xl ${isDone ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-600'} shadow-lg transition-colors`}>
                           <Icon size={24} />
                        </div>
                        <div>
                           <div className={`text-lg font-black italic tracking-tight ${isDone ? 'text-white' : 'text-slate-400'}`}>
                             {station === 'COMIDA RAPIDA' ? 'COMIDA RAPIDA' : station}
                           </div>
                           <div className={`text-[9px] font-black uppercase tracking-[0.2em] ${isDone ? 'text-emerald-500' : 'text-slate-600'}`}>
                              {status === 'delivered' ? 'ENTREGADO' : (status === 'ready' ? 'LISTO EN VENTANA' : 'EN PRODUCCIÓN...')}
                           </div>
                        </div>
                     </div>
                     {isDone ? <CheckCircle2 className="text-emerald-500" /> : <Loader2 className="text-slate-800 animate-spin" />}
                  </motion.div>
               );
            })}
         </div>

         {/* Visual Ticket Summary */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-b from-white/10 to-transparent rounded-[3rem] blur-xl opacity-25 group-hover:opacity-100 transition duration-1000"></div>
            <div className="bg-white text-slate-950 rounded-[3rem] p-10 relative overflow-hidden shadow-2xl">
                {/* Perforation effect */}
                <div className="absolute top-0 inset-x-0 h-4 bg-slate-950 flex justify-between px-6 -mt-2">
                    {[...Array(12)].map((_, i) => <div key={i} className="w-2 h-4 bg-slate-950 rounded-full" />)}
                </div>

                 <div className="text-center mb-8 border-b-2 border-slate-100 border-dashed pb-8">
                    <Receipt size={32} className="mx-auto mb-4 text-slate-300" />
                    <h4 className="text-[10px] font-black uppercase tracking-[1em] text-slate-400 mb-2">Resumen</h4>
                    <p className="text-2xl font-black italic uppercase tracking-tighter text-slate-950">{displayOrder.customer_name}</p>
                </div>

                <div className="space-y-4 mb-10">
                    {displayOrder.items?.map((item, i) => (
                      <div key={i} className="flex justify-between items-center text-xs font-black uppercase tracking-tight">
                          <div className="flex items-center gap-3 basis-2/3">
                              <span className="text-slate-400 font-mono italic">x{item.quantity}</span>
                              <span className="truncate">{item.products?.name || item.product?.name || 'Producto'}</span>
                          </div>
                          <span className="font-mono text-slate-950">${item.price_at_time * item.quantity}</span>
                      </div>
                    ))}
                </div>
                {displayOrder.notes && (
                  <div className="mb-8 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Notas:</div>
                    <div className="text-sm font-bold italic text-slate-900 leading-tight">"{displayOrder.notes}"</div>
                  </div>
                )}

                <div className="flex justify-between items-end border-t-4 border-slate-950 pt-8 mt-auto">
                    <div>
                        <div className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Total</div>
                        <div className="text-4xl font-black font-mono italic tracking-tighter leading-none text-slate-900">${displayOrder.total_price}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-[8px] font-black uppercase tracking-tight text-slate-400">{new Date(displayOrder.timestamp).toLocaleDateString()}</div>
                        <div className="text-[10px] font-black font-mono text-slate-200 mt-1">S82-921-X</div>
                    </div>
                </div>
            </div>
         </div>

         <div className="text-center pb-20 mt-12 opacity-30">
            <div className="flex justify-center gap-3 mb-4">
                <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.5em]">MANOLO FOOD AND DRINKS TRUCK PARK SYSTEM</p>
         </div>
      </div>
    </div>
  );
};

export default OrderTracking;
