import React, { useState } from 'react';
import { useOrder } from '../context/OrderContext';
import { ShoppingCart, Plus, Minus, X, CheckCircle, Trash2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const ProductItem = ({ product, addToCart }) => {
  const [qty, setQty] = useState(1);

  return (
    <div className="bg-slate-900 rounded-[2.5rem] overflow-hidden border border-slate-800 flex shadow-xl hover:border-emerald-500/50 transition-all group p-4 gap-6">
      <div className="w-24 h-24 flex-shrink-0 bg-slate-800 rounded-3xl overflow-hidden relative">
        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
      </div>
      <div className="flex-grow flex flex-col justify-between py-1">
        <div>
          <h3 className="font-black text-lg leading-tight text-white mb-1 group-hover:text-emerald-400 transition-colors uppercase italic">{product.name}</h3>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest opacity-60">{product.description}</p>
        </div>
        
        <div className="flex justify-between items-center mt-2">
          <span className="text-2xl font-black text-white font-mono tracking-tighter decoration-emerald-500 underline decoration-2">${product.price * qty}</span>
          
          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-3 px-2">
               <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-1 text-slate-600 hover:text-white transition-colors"><Minus size={16} /></button>
               <span className="font-black text-sm w-4 text-center">{qty}</span>
               <button onClick={() => setQty(qty + 1)} className="p-1 text-slate-600 hover:text-white transition-colors"><Plus size={16} /></button>
            </div>
            <button 
              onClick={() => { addToCart(product, qty); setQty(1); }}
              className="bg-emerald-600 text-white p-3 rounded-xl hover:bg-emerald-500 active:scale-95 transition-all shadow-lg shadow-emerald-900/40"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ClientMenu = () => {
  const { products, addToCart, cart, removeFromCart, placeOrder, orders } = useOrder();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  
  const navigate = useNavigate();

  // Active order detection
  const activeOrderId = localStorage.getItem('manolo_active_order');
  const activeOrder = orders.find(o => o.id === activeOrderId && o.status !== 'delivered');

  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const menuStations = ['COMIDA RAPIDA', 'BAR', 'DULCES/POSTRES'];
  const [activeStation, setActiveStation] = useState('COMIDA RAPIDA');

  const handlePlaceOrder = async () => {
    if (!customerName.trim()) return alert("Ingresa tu nombre para el ticket");
    const order = await placeOrder(customerName.trim(), 'client', orderNotes);
    if (order) {
      localStorage.setItem('manolo_active_order', order.id);
      
      // Update multi-tracking list
      try {
        const saved = localStorage.getItem('manolo_tracked_orders');
        const list = saved ? JSON.parse(saved) : [];
        if (!list.includes(order.id)) {
          localStorage.setItem('manolo_tracked_orders', JSON.stringify([...list, order.id]));
        }
      } catch {
        localStorage.setItem('manolo_tracked_orders', JSON.stringify([order.id]));
      }
      setOrderConfirmed(order);
      setIsCartOpen(false);
      setCustomerName('');
      setOrderNotes('');
      // Redirect to tracking for customers
      setTimeout(() => navigate(`/tracking/${order.id}`), 1000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 font-sans selection:bg-emerald-500/30 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-900 to-slate-950">
      
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 p-6 shadow-2xl">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4 w-full md:w-auto">
             <div className="w-12 h-12 bg-emerald-600 rounded-[1.25rem] flex items-center justify-center shadow-lg shadow-emerald-900/40 border border-emerald-400/20 rotate-3">
                <ShoppingCart className="text-white" />
             </div>
             <div>
                <h2 className="text-2xl font-black text-white tracking-tighter italic uppercase leading-none text-emerald-500">Manolo Foodtruck Park</h2>
                <div className="flex items-center gap-2 mt-1.5">
                   <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                   <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Foodtruck Park & Chill</span>
                </div>
             </div>
          </div>
          
          <div className="flex gap-3">
              <button onClick={() => setIsCartOpen(true)} className="relative p-4 bg-slate-900 rounded-2xl border border-white/5 hover:bg-slate-800 transition-all shadow-lg">
                <ShoppingCart size={20} className="text-slate-300" />
                {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full border-4 border-slate-950 shadow-lg">{cart.length}</span>}
              </button>
          </div>
        </div>

        {/* Tab Navigation - Separate Sheets */}
        <div className="max-w-5xl mx-auto mt-8 flex bg-slate-900/50 p-1.5 rounded-[2rem] border border-white/5 overflow-x-auto no-scrollbar">
          {menuStations.map(station => (
            <button
              key={station}
              onClick={() => setActiveStation(station)}
              className={`flex-grow px-6 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all relative overflow-hidden whitespace-nowrap ${activeStation === station ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <span className="relative z-10">{station === 'COMIDA RAPIDA' ? 'COMIDA RAPIDA' : station}</span>
              {activeStation === station && (
                <motion.div 
                  layoutId="activeSheet" 
                  className="absolute inset-0 bg-emerald-600 shadow-lg shadow-emerald-900/20"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          ))}
        </div>
      </header>

      <main className="p-6 max-w-5xl mx-auto pt-10">
        <AnimatePresence mode="wait">
          <motion.div 
            key={activeStation}
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {products.filter(p => p.station === activeStation).length === 0 ? (
              <div className="py-20 text-center opacity-20 flex flex-col items-center border border-dashed border-white/10 rounded-[4rem]">
                 <ShoppingCart size={64} className="mb-4 text-slate-400" />
                 <p className="font-black uppercase tracking-widest text-sm">Próximamente</p>
              </div>
            ) : (
              <section className="mb-12">
                <div className="flex items-center gap-6 mb-10">
                    <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                    <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white">{activeStation === 'COMIDA RAPIDA' ? 'COMIDA RAPIDA' : activeStation}</h2>
                    <div className="flex-grow h-px bg-gradient-to-r from-slate-800 to-transparent" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {products.filter(p => p.station === activeStation).map(product => (
                    <ProductItem key={product.id} product={product} addToCart={addToCart} />
                  ))}
                </div>
              </section>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating Active Order Button */}
      {activeOrder && (
        <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="fixed bottom-24 right-6 z-50">
           <button 
             onClick={() => navigate(`/tracking/${activeOrder.id}`)}
             className="bg-blue-600 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-blue-400/30 active:scale-95 transition-all animate-bounce"
           >
              <div className="p-2 bg-white/20 rounded-xl"><Clock size={16} /></div>
              <div className="text-left">
                 <div className="text-[8px] font-black uppercase opacity-60">Seguir Pedido</div>
                 <div className="text-xs font-black italic">#{activeOrder.ticket_number}</div>
              </div>
           </button>
        </motion.div>
      )}

      {/* Cart Bottom Bar */}
      {cart.length > 0 && !isCartOpen && !orderConfirmed && (
        <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="fixed bottom-10 left-6 right-6 z-50 max-w-lg mx-auto">
           <button onClick={() => setIsCartOpen(true)} className="w-full bg-emerald-600 p-6 rounded-[2rem] shadow-2xl flex justify-between items-center group active:scale-95 transition-all">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center border border-white/20 shadow-lg"><ShoppingCart size={24} /></div>
                 <div className="text-left leading-none">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Ver Carrito</span>
                    <h4 className="text-lg font-black italic tracking-tighter mt-1">{cart.length} Productos</h4>
                 </div>
              </div>
              <div className="text-3xl font-black font-mono tracking-tighter italic decoration-white/30 underline decoration-2">$ {total}</div>
           </button>
        </motion.div>
      )}

      {/* Cart Side/Modal */}
      <AnimatePresence>
         {isCartOpen && (
           <>
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCartOpen(false)} className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-50" />
             <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed bottom-0 left-0 right-0 h-[92vh] bg-slate-900 rounded-t-[4rem] z-[60] p-10 flex flex-col border-t border-white/5 shadow-2xl max-w-2xl mx-auto overflow-hidden">
                <div className="w-16 h-1.5 bg-slate-800 rounded-full mx-auto mb-10" />
                <div className="flex justify-between items-center mb-10">
                   <h2 className="text-4xl font-black italic tracking-tighter uppercase text-white leading-none underline decoration-emerald-500 decoration-4">Tu Pedido</h2>
                   <button onClick={() => setIsCartOpen(false)} className="p-4 bg-slate-800 rounded-2xl text-slate-400 hover:text-white"><X size={24} /></button>
                </div>

                <div className="flex-grow overflow-y-auto space-y-4 pr-2 custom-scrollbar pb-8">
                   {cart.map(item => (
                     <div key={item.id} className="bg-slate-950/50 p-6 rounded-[2.5rem] border border-white/5 flex gap-6 items-center group">
                        <img src={item.image} className="w-20 h-20 rounded-3xl object-cover shadow-xl" />
                        <div className="flex-grow">
                           <h4 className="font-black text-xl italic uppercase tracking-tighter group-hover:text-emerald-400 transition-colors">{item.name}</h4>
                           <div className="flex justify-between items-end mt-4">
                              <div className="px-3 py-1 bg-slate-900 border border-white/5 rounded-xl font-mono text-emerald-500 text-xs">Cant: {item.quantity}</div>
                              <span className="text-2xl font-black text-white font-mono tracking-tighter">${item.price * item.quantity}</span>
                           </div>
                        </div>
                        <button onClick={() => removeFromCart(item.id)} className="p-3 text-slate-800 hover:text-red-500 transition-colors"><Trash2 size={24} /></button>
                     </div>
                   ))}
                </div>

                <div className="bg-slate-950 p-8 rounded-[3rem] border border-white/5 shadow-inner space-y-6 mt-auto">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600 ml-4">Tu Nombre</label>
                         <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="..." className="w-full bg-slate-900 p-6 rounded-3xl font-black text-2xl italic text-center text-white border border-white/5 outline-none focus:ring-4 focus:ring-emerald-500/20" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600 ml-4">Instrucciones Especiales</label>
                         <textarea 
                           value={orderNotes} 
                           onChange={e => setOrderNotes(e.target.value)} 
                           placeholder="Ej: Sin cebolla, extra salsa..." 
                           className="w-full bg-slate-900 p-6 rounded-3xl font-bold text-sm italic text-white border border-white/5 outline-none focus:ring-4 focus:ring-emerald-500/20 resize-none h-[88px] placeholder:text-slate-700" 
                         />
                      </div>
                   </div>
                   <div className="flex justify-between items-center pt-4">
                      <span className="text-4xl font-black font-mono tracking-tighter text-white">${total}</span>
                      <button onClick={handlePlaceOrder} className="px-10 py-5 bg-emerald-600 text-white font-black rounded-3xl uppercase tracking-widest text-sm shadow-xl shadow-emerald-900/40 hover:bg-emerald-500 transition-all flex items-center gap-3 active:scale-95">
                          Ordenar Ahora <CheckCircle size={20} />
                      </button>
                   </div>
                </div>
             </motion.div>
           </>
         )}

         {orderConfirmed && (
           <>
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOrderConfirmed(null)} className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-[100]" />
             <motion.div initial={{ scale: 0.8, opacity: 0, y: 100 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white text-slate-950 rounded-[4rem] shadow-2xl z-[101] overflow-hidden">
                <div className="bg-emerald-600 p-12 text-center text-white relative">
                   <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/30"><CheckCircle size={48} /></div>
                   <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-80 mb-2">Orden Enviada</p>
                   <h2 className="text-7xl font-black italic tracking-tighter leading-none">#{orderConfirmed.ticket_number}</h2>
                </div>
                <div className="p-10 text-center space-y-6">
                   <h3 className="text-2xl font-black uppercase italic tracking-tighter">{orderConfirmed.customer_name}</h3>
                   <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex flex-col items-center gap-4">
                      <Clock className="text-emerald-600" />
                      <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">Redirigiendo al RASTREADOR en vivo...</p>
                      <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 1 }} className="h-full bg-emerald-500" />
                      </div>
                   </div>
                   <button onClick={() => setOrderConfirmed(null)} className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-xl">Entendido</button>
                </div>
             </motion.div>
           </>
         )}
      </AnimatePresence>

      <div className="fixed bottom-6 left-0 right-0 text-center pointer-events-none opacity-20 hidden md:block">
         <div className="text-[8px] text-slate-400 font-black uppercase tracking-[0.8em]">Foodtruck Menu v5.0.0</div>
      </div>
    </div>
  );
};

export default ClientMenu;
