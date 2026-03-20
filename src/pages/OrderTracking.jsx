import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useOrder } from '../context/OrderContext';
import { 
  Clock, CheckCircle2, Package, ChevronLeft, Coffee, Utensils, 
  IceCream, Wallet, Loader2, Sparkles, CreditCard, Receipt 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const OrderTracking = () => {
  const { orderId } = useParams();
  const { orders } = useOrder();
  const navigate = useNavigate();
  
  const order = orders.find(o => o.id === orderId);

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center mb-8 border border-white/5 shadow-2xl">
           <Package size={48} className="text-slate-700" />
        </div>
        <h2 className="text-3xl font-black uppercase italic tracking-tighter">Pedido no encontrado</h2>
        <p className="text-slate-500 mt-4 font-bold uppercase text-[10px] tracking-[0.3em] max-w-[250px] leading-relaxed">Verifica tu número de ticket o escanea el QR nuevamente</p>
        <Link to="/menu" className="mt-10 bg-white text-slate-950 px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-xl">Ir al Menú</Link>
      </div>
    );
  }

  const stationIcons = {
    'Bar': Coffee,
    'Comida Rápida': Utensils,
    'Dulces / Postres': IceCream
  };

  const isReadyGlobal = order.status === 'ready';
  const isPaid = order.isPaid;

  const getStatusMessage = () => {
    if (order.status === 'delivered') return '¡Pedido Entregado!';
    if (isReadyGlobal) return isPaid ? '¡Todo Listo!' : '¡Pedido Listo!';
    return isPaid ? 'Preparando Pago' : 'En Producción';
  };

  const getInstructions = () => {
    if (order.status === 'delivered') return '¡Gracias por tu compra! Esperamos verte pronto.';
    if (isReadyGlobal) {
      return isPaid 
        ? 'Tu pedido te espera en la ventana de entrega.' 
        : 'Pasa por caja para realizar el pago y retirar tu pedido.';
    }
    return isPaid 
      ? 'Tu pago fue confirmado. Estamos terminando tu pedido.' 
      : 'Puedes ir adelantando el pago en caja si lo deseas.';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 overflow-x-hidden selection:bg-emerald-500/30">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent opacity-50 pointer-events-none" />
      
      <header className="max-w-md mx-auto flex items-center justify-between mb-10 relative z-10">
         <button onClick={() => navigate('/menu')} className="p-4 bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-2xl text-slate-400 hover:text-white transition-all shadow-lg active:scale-95"><ChevronLeft size={24} /></button>
         <div className="text-right">
            <div className="text-[10px] font-black uppercase text-emerald-500 tracking-[0.4em] mb-1">MANOLO FOODTRUCK PARK • LIVE TRACKING</div>
            <div className="text-4xl font-black italic text-white tracking-tighter leading-none">#{order.ticketNumber}</div>
         </div>
      </header>

      <div className="max-w-md mx-auto space-y-8 relative z-10">
         {/* Overall Status Banner */}
         <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={`p-10 rounded-[3.5rem] text-center relative overflow-hidden shadow-2xl border ${isReadyGlobal ? 'bg-emerald-600 border-emerald-400 shadow-emerald-900/40' : (order.status === 'delivered' ? 'bg-blue-600 border-blue-400 shadow-blue-900/40' : 'bg-slate-900 border-white/10 shadow-black')}`}
         >
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl animate-pulse" />
            <div className="relative z-10 flex flex-col items-center">
               <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mb-6 border border-white/20 shadow-inner">
                  {order.status === 'ready' ? <Sparkles size={48} className="text-white animate-bounce" /> : (order.status === 'delivered' ? <CheckCircle2 size={48} className="text-white" /> : <Loader2 size={48} className="text-emerald-500 animate-spin" />)}
               </div>
               <h2 className="text-5xl font-black uppercase italic tracking-tighter mb-3 leading-none text-white">
                  {getStatusMessage()}
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
            className={`flex items-center justify-between p-6 rounded-[2rem] border-2 transition-all ${isPaid ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-500'}`}
         >
            <div className="flex items-center gap-4">
               <div className={`p-3 rounded-xl ${isPaid ? 'bg-blue-500 text-white' : 'bg-amber-500 text-white'} shadow-lg`}>
                  {isPaid ? <CreditCard size={20} /> : <Wallet size={20} />}
               </div>
               <div>
                  <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Pago</div>
                  <div className="text-lg font-black italic tracking-tight uppercase">{isPaid ? 'Confirmado' : 'Pendiente'}</div>
               </div>
            </div>
            {isPaid ? <CheckCircle2 className="text-blue-400 shadow-blue-500/50 shadow-lg" /> : <div className="w-2 h-2 bg-amber-500 rounded-full animate-ping" />}
         </motion.div>

         {/* Station Progress */}
         <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-600 ml-4 mb-2">Estaciones de Trabajo</h3>
            {Object.entries(order.stationStatuses).map(([station, status], idx) => {
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
                           <div className={`text-lg font-black italic tracking-tight ${isDone ? 'text-white' : 'text-slate-400'}`}>{station}</div>
                           <div className={`text-[9px] font-black uppercase tracking-[0.2em] ${isDone ? 'text-emerald-500' : 'text-slate-600'}`}>
                              {status === 'delivered' ? 'PAGADO & ENTREGADO' : (status === 'ready' ? 'LISTO EN VENTANA' : 'EN PRODUCCIÓN...')}
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
                    <p className="text-2xl font-black italic uppercase tracking-tighter text-slate-950">{order.customerName}</p>
                </div>

                <div className="space-y-4 mb-10">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between items-center text-xs font-black uppercase tracking-tight">
                          <div className="flex items-center gap-3 basis-2/3">
                              <span className="text-slate-400 font-mono italic">x{item.quantity}</span>
                              <span className="truncate">{item.name}</span>
                          </div>
                          <span className="font-mono text-slate-950">${item.price * item.quantity}</span>
                      </div>
                    ))}
                </div>

                <div className="flex justify-between items-end border-t-4 border-slate-950 pt-8 mt-auto">
                    <div>
                        <div className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Total</div>
                        <div className="text-4xl font-black font-mono italic tracking-tighter leading-none text-slate-900">${order.total}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-[8px] font-black uppercase tracking-tight text-slate-400">{new Date(order.timestamp).toLocaleDateString()}</div>
                        <div className="text-[10px] font-black font-mono text-slate-300 mt-1">S82-921-X</div>
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
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.5em]">MANOLO FOODTRUCK PARK SYSTEM</p>
         </div>
      </div>
    </div>
  );
};

export default OrderTracking;
