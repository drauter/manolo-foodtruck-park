import React, { useState, useEffect, useMemo } from 'react';
import { useOrder } from '../context/OrderContext';
import { 
  ShoppingCart, X, CheckCircle, Wallet, LogOut, 
  Banknote, CreditCard, Landmark, Search, Clock, Trash2, Edit2, Printer, FileText, RotateCcw, Utensils, Shield, AlertCircle, Package, Volume2
} from 'lucide-react';
import { STATIONS, STATION_LABELS, STATION_COLORS, getStationDisplay } from '../utils/constants';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Receipt from '../components/Receipt';
import { printReceipt } from '../utils/printUtils';
import { Plus, Minus } from 'lucide-react';

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
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest opacity-60">{product.station}</p>
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
              className="bg-emerald-600 text-white p-3 rounded-xl hover:bg-emerald-500 active:scale-95 transition-all shadow-lg"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SellerPOS = () => {
  const { products, addToCart, cart, removeFromCart, clearCart, placeOrder, currentUser, logout, closeShift, orders, updateStationStatus, cancelOrder, deleteOrder, deletePayment, announceOrder, verifyAdminPin, getShiftTotals, users } = useOrder();
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [activeTab, setActiveTab] = useState('ventas'); // 'ventas', 'cobros', 'despacho', 'historial'
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const [customerName, setCustomerName] = useState('');
  const [isClosingShift, setIsClosingShift] = useState(false);
  const [actualCash, setActualCash] = useState('');
  const [shiftNote, setShiftNote] = useState('');
  const [authorizedBy, setAuthorizedBy] = useState(null);
  const [authError_shift, setAuthError_shift] = useState('');
  
  // Payment Modal States
  const [paymentOrderId, setPaymentOrderId] = useState(null);
  const [paymentStation, setPaymentStation] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [parkedCarts, setParkedCarts] = useState([]);
  const [historyTab, setHistoryTab] = useState('ventas'); // 'ventas' or 'cobros'

  // Auth Modal States
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authPin, setAuthPin] = useState('');
  const [authAction, setAuthAction] = useState(null);
  const [authError, setAuthError] = useState('');

  const handleAuthSubmit = async (e) => {
    if (e) e.preventDefault();
    const isValid = await verifyAdminPin(authPin);
    if (isValid) {
      if (authAction) authAction();
      setIsAuthModalOpen(false);
      setAuthPin('');
      setAuthError('');
    } else {
      setAuthError('PIN de Administrador Incorrecto');
      setAuthPin('');
    }
  };

  const requireAdminAuth = (action) => {
    setAuthAction(() => action);
    setIsAuthModalOpen(true);
  };

  const navigate = useNavigate();
  const printRef = React.useRef();

  useEffect(() => {
    if (!currentUser || currentUser.role === 'client') {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  const isCajeroGeneral = currentUser && currentUser.station === 'CAJA';
  const total = (cart || []).reduce((acc, item) => acc + (item.price * item.quantity), 0);
  
  if (!Array.isArray(products)) {
    console.error("Products is not an array:", products);
  }

  const filteredProducts = (isCajeroGeneral || (currentUser && !currentUser.station))
    ? (Array.isArray(products) ? products : [])
    : (Array.isArray(products) ? products.filter(p => p.station === currentUser.station) : []);
    
  const categories = [...new Set(filteredProducts.map(p => p.category || 'Varios'))];

  const handlePlaceOrder = async (directPayment = false) => {
    if (!customerName.trim()) return alert("Ingresa nombre del cliente");
    const order = await placeOrder(customerName.trim());
    if (order) {
      if (directPayment) {
        setPaymentOrderId(order.id);
        setPaymentStation(currentUser.station || Object.keys(order.station_statuses || {})[0]);
        setPaymentSuccess(false);
      } else {
        setSelectedInvoice(order);
      }
      setIsCartOpen(false);
      setCustomerName('');
    }
  };

  const parkCart = () => {
    if (cart.length === 0) return;
    const name = customerName.trim() || `Mesa/Cliente ${parkedCarts.length + 1}`;
    setParkedCarts(prev => [...prev, { id: Date.now(), name, items: [...cart] }]);
    clearCart();
    setCustomerName('');
  };

  const resumeCart = (parked) => {
    if (cart.length > 0 && !confirm("¿Deseas posponer el pedido actual para reanudar este?")) return;
    clearCart();
    parked.items.forEach(item => {
      addToCart(item, item.quantity);
    });
    setCustomerName(parked.name);
    setParkedCarts(prev => prev.filter(c => c.id !== parked.id));
  };

  // Memoized current payment order from the active orders list
  const paymentOrder = useMemo(() => {
    if (!paymentOrderId) return null;
    return orders.find(o => o.id === paymentOrderId);
  }, [orders, paymentOrderId]);

  const amountToPay = useMemo(() => {
    if (!paymentOrder || !paymentStation) return 0;
    
    const isCaja = paymentStation.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase() === 'CAJA';
    const items = paymentOrder.items || paymentOrder.order_items || [];

    if (isCaja) {
      // Prioritize calculating from items to ensure accuracy, then fallback to total_price
      const itemsSum = items.reduce((sum, i) => sum + ((Number(i.price_at_time) || Number(i.price) || 0) * (Number(i.quantity) || 0)), 0);
      return itemsSum > 0 ? itemsSum : (Number(paymentOrder.total_price) || 0);
    }
    
    // For specific stations, filter items
    const normalizedStation = paymentStation.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    return items
      .filter(i => {
        const itemStation = i.station?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
        return itemStation === normalizedStation;
      })
      .reduce((sum, i) => sum + ((Number(i.price_at_time) || Number(i.price) || 0) * (Number(i.quantity) || 0)), 0);
  }, [paymentOrder, paymentStation]);

  const handleFinalizePayment = () => {
    const received = Number(amountReceived) || 0;
    const isInsufficient = paymentMethod === 'cash' && received < amountToPay;

    if (isInsufficient) {
      alert(`¡Casi listo! El monto es insuficiente. Faltan $${(amountToPay - received).toFixed(2)}.`);
      return;
    }

    const currentStatus = paymentOrder.station_statuses?.[paymentStation] || 'received';
    updateStationStatus(paymentOrder.id, paymentStation, currentStatus, {
      method: paymentMethod,
      received: received || amountToPay,
      change: (received || amountToPay) - amountToPay,
      timestamp: new Date().toISOString()
    });
    setPaymentSuccess(true);
    setAmountReceived('');
  };

  const handleCloseShift = async (e) => {
    if (e) e.preventDefault();
    const totals = getShiftTotals(currentUser.station);
    const difference = Number(actualCash) - totals.cash;

    // Logic: If there's a discrepancy, we need a note and admin auth (unless already authorized)
    if (Math.abs(difference) > 0.01 && !authorizedBy) {
      setAuthError_shift("Se requiere autorización de administrador para cerrar con descuadre.");
      return;
    }

    await closeShift(currentUser.station, actualCash, shiftNote, authorizedBy);
    logout();
    navigate('/');
  };

  const handleAdminAuthForShift = async (pin) => {
    const admin = await verifyAdminPin(pin);
    if (admin) {
      // Find the admin user name
      const adminUser = users.find(u => u.pin === pin && u.role === 'admin');
      setAuthorizedBy(adminUser?.name || 'Administrador');
      setAuthError_shift('');
      // We don't call handleCloseShift yet, the user clicks CERRAR again
    } else {
      setAuthError_shift("PIN de Administrador Incorrecto");
    }
  };

  const handlePrint = () => {
    printReceipt('printable-receipt-wrapper');
  };

  const handleWhatsAppShare = (order) => {
    if (!order) return;
    const itemsText = (order.items || []).map(i => `${i.quantity} x ${i.products?.name || i.product?.name || 'Producto'}`).join('\n');
    const text = `🍕 *MANOLO FOODTRUCK PARK* 🍕\n---------------------------\n*Ticket:* #${order.ticket_number}\n*Cliente:* ${order.customer_name?.toUpperCase()}\n---------------------------\n${itemsText}\n---------------------------\n*TOTAL: RD$ ${order.total_price}.00*\n\n¡Gracias por preferirnos!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (!currentUser) return null;
  
  return (
    <div className="min-h-screen lg:h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row overflow-x-hidden lg:overflow-hidden font-sans no-print">
      
      <div className="flex-grow flex flex-col h-full bg-slate-50 relative overflow-hidden">
        <header className="bg-white border-b border-slate-200 p-4 sm:p-6 flex justify-between items-center shadow-sm z-30 sticky top-0">
          <div className="flex items-center gap-3 sm:gap-4">
             <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-900 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                <ShoppingCart className="text-white" size={20} />
             </div>
             <div>
                <h1 className="text-lg sm:text-xl font-black italic tracking-tighter uppercase leading-none">MANOLO FOODTRUCK PARK</h1>
                <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Terminal: {currentUser.station === 'COMIDA RAPIDA' ? 'COMIDA RAPIDA' : (currentUser.station === 'COMIDA RAPIDA' ? 'COMIDA RAPIDA' : currentUser.station)}</p>
             </div>
          </div>

          <div className="hidden md:flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
             <button onClick={() => setActiveTab('ventas')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ventas' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500'}`}>Ventas</button>
             <button onClick={() => setActiveTab('cobros')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'cobros' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500'}`}>Cobros</button>
             <button onClick={() => setActiveTab('despacho')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'despacho' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500'}`}>Despacho</button>
             <button onClick={() => setActiveTab('historial')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'historial' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500'}`}>Historial</button>
          </div>
          
          <div className="flex md:hidden bg-slate-100 p-1 rounded-xl border border-slate-200">
             <button onClick={() => setActiveTab('ventas')} className={`p-2 rounded-lg transition-all ${activeTab === 'ventas' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}><Utensils size={18} /></button>
             <button onClick={() => setActiveTab('cobros')} className={`p-2 rounded-lg transition-all ${activeTab === 'cobros' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}><Wallet size={18} /></button>
             <button onClick={() => setActiveTab('despacho')} className={`p-2 rounded-lg transition-all ${activeTab === 'despacho' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}><Package size={18} /></button>
             <button onClick={() => setActiveTab('historial')} className={`p-2 rounded-lg transition-all ${activeTab === 'historial' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}><Clock size={18} /></button>
          </div>

          <div className="flex gap-2">
             <button onClick={() => setIsClosingShift(true)} className="p-2.5 sm:p-3 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-600 hover:text-white transition-all border border-amber-100"><LogOut size={16} /></button>
          </div>
        </header>

        <main className="flex-grow overflow-y-auto p-4 sm:p-8 lg:p-10 custom-scrollbar">
           {activeTab === 'ventas' ? (
             <div className="space-y-12">
                {parkedCarts.length > 0 && (
                  <div className="flex gap-4 overflow-x-auto pb-6 no-scrollbar">
                     {parkedCarts.map(p => (
                       <button key={p.id} onClick={() => resumeCart(p)} className="px-6 py-4 bg-amber-500 text-white rounded-3xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-3 animate-pulse hover:animate-none group">
                          <Clock size={14} />
                          <span>Mesa: {p.name} ({p.items.length} ítems)</span>
                          <X size={14} className="opacity-40 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); setParkedCarts(prev => prev.filter(c => c.id !== p.id)); }} />
                       </button>
                     ))}
                  </div>
                )}
                
                <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
                   {['Todos', ...categories].map(c => (
                     <button key={c} className="px-8 py-4 bg-white rounded-3xl text-[10px] font-black uppercase tracking-widest shadow-sm border border-slate-100 hover:border-emerald-500 transition-all whitespace-nowrap">
                        {c}
                     </button>
                   ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-8">
                   {filteredProducts.map(product => (
                     <div key={product.id} onClick={() => addToCart(product, 1)} className="bg-white p-5 rounded-[2.5rem] border border-slate-100 shadow-md hover:shadow-2xl hover:border-emerald-500 transition-all group flex flex-col items-center cursor-pointer active:scale-95 text-center relative overflow-hidden">
                        <div className="absolute top-4 right-4 bg-slate-900 text-white w-10 h-10 rounded-full flex items-center justify-center scale-0 group-hover:scale-100 transition-transform shadow-lg z-10">
                           <Plus size={20} />
                        </div>
                        <div className="w-full aspect-square bg-slate-50 rounded-[2rem] overflow-hidden mb-6 relative">
                           <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        </div>
                        <h3 className="font-black text-xs uppercase italic tracking-tighter text-slate-400 mb-1">{product.station}</h3>
                        <h4 className="font-black text-lg uppercase tracking-tight text-slate-900 mb-3">{product.name}</h4>
                        <div className="mt-auto px-6 py-2 bg-slate-50 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-all font-black font-mono text-xl">${product.price}</div>
                     </div>
                   ))}
                </div>
             </div>
            ) : (activeTab === 'historial' && historyTab === 'ventas') ? (
              <motion.div key="historial-ventas" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                 <div className="flex justify-between items-center border-b border-white/10 pb-6 mb-8">
                    <div className="flex gap-8 items-center">
                       <h2 className="text-2xl font-black uppercase italic tracking-tighter">Historial</h2>
                       <div className="flex bg-slate-100 p-1 rounded-xl">
                          <button onClick={() => setHistoryTab('ventas')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${historyTab === 'ventas' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Ventas</button>
                          <button onClick={() => setHistoryTab('cobros')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${historyTab === 'cobros' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Cobros</button>
                       </div>
                    </div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none bg-white/5 px-4 py-2 rounded-full">Estación: {currentUser.station}</div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {orders.filter(o => (isCajeroGeneral || o.origin_station === currentUser.station || (o.items || []).some(i => i.station === currentUser.station))).length === 0 ? (
                      <div className="col-span-full py-40 text-center opacity-20 flex flex-col items-center border border-dashed border-white/10 rounded-[4rem]">
                         <FileText size={64} className="mb-4 text-slate-400" />
                         <p className="font-black uppercase tracking-widest text-sm">No has realizado ventas aún</p>
                      </div>
                    ) : (
                      orders.filter(o => (isCajeroGeneral || o.origin_station === currentUser.station || (o.items || []).some(i => i.station === currentUser.station))).map(order => (
                        <div key={order.id} className={`bg-slate-900/50 p-8 rounded-[3rem] border border-white/5 hover:border-emerald-500/30 transition-all group relative shadow-2xl overflow-hidden ${order.status === 'cancelled' ? 'opacity-50 grayscale' : ''}`}>
                           <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-bl-[3rem]" />
                           <div className="flex justify-between items-start mb-2 leading-none">
                              <div className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">#{order.ticket_number}</div>
                              {order.is_paid && <span className="text-[8px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-full uppercase">PAGADO</span>}
                           </div>
                           <h3 className="text-3xl font-black italic tracking-tighter uppercase mb-6 leading-none truncate">{order.customer_name}</h3>
                           
                           <div className="flex items-center gap-2 mb-8">
                              <Clock size={12} className="text-slate-500" />
                              <span className="text-[10px] font-bold text-slate-500 uppercase">{new Date(order.timestamp).toLocaleString()}</span>
                              {order.status === 'cancelled' && <span className="text-[8px] font-black bg-red-500 text-white px-2 py-0.5 rounded-full uppercase">ANULADO</span>}
                           </div>

                           <div className="grid grid-cols-2 gap-3 pt-6 border-t border-white/5">
                              <button onClick={() => setSelectedInvoice(order)} title="Imprimir" className="p-4 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 hover:text-white transition-all"><Printer size={20} /></button>
                               <button onClick={() => { 
                                 requireAdminAuth(() => {
                                   if(confirm("¿Seguro que desea anular su venta? Las existencias regresarán al inventario.")) cancelOrder(order.id); 
                                 });
                               }} title="Anular" className="p-4 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 hover:text-amber-500 transition-all"><RotateCcw size={20} /></button>
                               <button onClick={() => { 
                                 requireAdminAuth(() => {
                                   if(confirm("¿BORRAR DEFINITIVAMENTE? Esta acción no se puede deshacer y no devolverá stock.")) deleteOrder(order.id); 
                                 });
                               }} title="Eliminar" className="p-4 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 hover:text-red-500 transition-all"><Trash2 size={20} /></button>
                           </div>
                        </div>
                      ))
                    )}
                 </div>
              </motion.div>
            ) : (activeTab === 'historial' && historyTab === 'cobros') ? (
               <motion.div key="historial-cobros" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                  <div className="flex justify-between items-center border-b border-white/10 pb-6 mb-8">
                     <div className="flex gap-8 items-center">
                        <h2 className="text-2xl font-black uppercase italic tracking-tighter">Resumen de Cobros</h2>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                           <button onClick={() => setHistoryTab('ventas')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${historyTab === 'ventas' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Ventas</button>
                           <button onClick={() => setHistoryTab('cobros')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${historyTab === 'cobros' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Cobros</button>
                        </div>
                     </div>
                     <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none bg-white/5 px-4 py-2 rounded-full">Recaudador: {currentUser.station}</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {orders.filter(o => o.payment_details && currentUser?.station && o.payment_details[currentUser.station]).length === 0 ? (
                       <div className="col-span-full py-40 text-center opacity-20 flex flex-col items-center border border-dashed border-white/10 rounded-[4rem]">
                          <Banknote size={64} className="mb-4 text-slate-400" />
                           <p className="font-black uppercase tracking-widest text-sm">No has realizado cobros aún</p>
                       </div>
                     ) : (
                       orders.filter(o => o.payment_details && currentUser.station && o.payment_details[currentUser.station]).map((order, idx) => {
                         const tx = order.payment_details[currentUser.station];
                         if (!tx) return null;
                         const stationAmt = (order.items || [])
                           .filter(i => currentUser.station === 'CAJA' || i.station === currentUser.station)
                           .reduce((s, i) => s + ((Number(i.price_at_time) || 0) * (Number(i.quantity) || 0)), 0) || 0;
                         return (
                           <div key={`${order.id}-${idx}`} className="bg-slate-900/50 p-8 rounded-[3rem] border border-white/5 hover:border-emerald-500/30 transition-all group relative shadow-2xl overflow-hidden">
                              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-bl-[3rem]" />
                              <div className="flex justify-between items-start mb-2 leading-none">
                                 <div className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">#{order.ticket_number}</div>
                                 <div className="text-[8px] font-black bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full uppercase">{tx.method}</div>
                              </div>
                              <h3 className="text-3xl font-black italic tracking-tighter uppercase mb-2 leading-none truncate">{order.customer_name}</h3>
                              <div className="text-4xl font-black font-mono text-white tracking-tighter mb-6">${stationAmt}</div>
                              
                              <div className="flex gap-2 pt-6 border-t border-white/5">
                                 <div className="flex items-center gap-2 flex-grow">
                                    <Clock size={12} className="text-slate-500" />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">{new Date(tx.timestamp).toLocaleString()}</span>
                                 </div>
                                  <button onClick={() => { 
                                    requireAdminAuth(() => {
                                      if(confirm("¿Eliminar este registro de cobro?")) deletePayment(order.id, currentUser.station); 
                                    });
                                  }} className="p-3 bg-slate-800 rounded-xl text-slate-500 hover:text-red-500 transition-all"><Trash2 size={16} /></button>
                              </div>
                           </div>
                         );
                       })
                     )}
                  </div>
               </motion.div>
            ) : activeTab === 'cobros' ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <div className="flex justify-between items-center border-b border-slate-200 pb-8 mb-8">
                    <div>
                       <h2 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900">Control de Cobros</h2>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{currentUser.station}</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {orders.filter(o => o.status !== 'cancelled').reverse().map(order => (
                      <div key={order.id} className={`bg-white p-8 rounded-[3.5rem] border ${order.is_paid ? 'border-emerald-500/20 bg-emerald-50/10' : 'border-slate-100'} shadow-lg flex flex-col gap-6 group hover:border-emerald-500 transition-all relative overflow-hidden`}>
                         {order.is_paid && (
                           <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full flex items-center justify-center pointer-events-none">
                              <CheckCircle className="text-emerald-500 mt-2 ml-2" size={32} />
                           </div>
                         )}
                         <div className="flex justify-between items-start">
                            <div className="flex items-center gap-4">
                               <div className={`w-16 h-16 ${order.is_paid ? 'bg-emerald-600' : 'bg-slate-950'} text-white rounded-3xl flex items-center justify-center text-xl font-black shadow-xl`}>#{order.ticket_number}</div>
                               <div>
                                  <h3 className="font-black text-2xl uppercase italic tracking-tighter text-slate-900 leading-tight">{order.customer_name}</h3>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">{new Date(order.timestamp).toLocaleTimeString()}</p>
                               </div>
                            </div>
                            <div className={`text-3xl font-black font-mono tracking-tighter decoration-emerald-500 underline decoration-4 ${order.is_paid ? 'text-emerald-600' : 'text-slate-900'}`}>${Number(order.total_price) || 0}</div>
                         </div>
                         <div className="flex gap-3 mt-2">
                            {order.is_paid ? (
                              <div className="flex-grow py-5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-[2rem] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3">
                                 <CheckCircle size={18} /> PAGO COMPLETADO
                              </div>
                            ) : (
                              <button 
                                 onClick={() => { 
                                    setPaymentOrderId(order.id); 
                                    const initialStation = currentUser.station || Object.keys(order.station_statuses || {})[0] || 'CAJA';
                                    setPaymentStation(initialStation.toUpperCase()); 
                                    setPaymentSuccess(false);
                                 }}
                                 className="flex-grow py-5 bg-emerald-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-500 transition-all flex items-center justify-center gap-3"
                              >
                                 <Wallet size={20} /> Cobrar Orden
                              </button>
                            )}
                            <div className="flex gap-3">
                               <button onClick={() => setSelectedInvoice(order)} className="p-5 bg-slate-50 text-slate-400 rounded-[2rem] border border-slate-100 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all"><FileText size={20} /></button>
                               <button 
                                  onClick={() => {
                                     if (confirm(`¿ELIMINAR TICKET #${order.ticket_number} DE ${order.customer_name}?`)) {
                                        requireAdminAuth(() => cancelOrder(order.id));
                                     }
                                  }} 
                                  className="p-5 bg-red-50 text-red-400 rounded-[2rem] border border-red-100 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                               >
                                  <Trash2 size={20} />
                               </button>
                            </div>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
            ) : activeTab === 'despacho' ? (
               <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-8 mb-8">
                     <div>
                        <h2 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900">Despacho de Pedidos</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Terminal: {currentUser.station}</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 text-slate-900">
                     {orders.filter(o => {
                        if (o.status === 'cancelled') return false;
                        const statuses = Object.values(o.station_statuses || {});
                        return statuses.some(s => s === 'ready');
                     }).reverse().map(order => (
                       <div key={order.id} className="bg-white p-8 rounded-[3.5rem] border border-slate-100 shadow-lg flex flex-col gap-6 group hover:border-blue-500 transition-all relative overflow-hidden">
                          <div className="flex justify-between items-start">
                             <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-blue-600 text-white rounded-3xl flex items-center justify-center text-xl font-black shadow-xl">#{order.ticket_number}</div>
                                <div>
                                   <h3 className="font-black text-2xl uppercase italic tracking-tighter text-slate-900 leading-tight">{order.customer_name}</h3>
                                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">SITUACIÓN: <span className="text-emerald-500 font-black">LISTO PARA ENTREGA</span></p>
                                </div>
                             </div>
                             {!order.is_paid && <div className="bg-amber-100 text-amber-600 px-3 py-1 rounded-full text-[8px] font-black uppercase">FALTA PAGO</div>}
                          </div>

                          <div className="bg-slate-50 p-6 rounded-3xl space-y-3">
                             {Object.entries(order.station_statuses || {}).filter(([, s]) => s === 'ready').map(([station]) => (
                               <div key={station} className="flex justify-between items-center">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{station}</span>
                                  <span className="text-[10px] font-black text-emerald-500 uppercase italic">¡LISTO!</span>
                               </div>
                             ))}
                          </div>

                          <div className="flex flex-col gap-3 mt-auto">
                             <button 
                                onClick={() => {
                                   Object.entries(order.station_statuses || {}).forEach(([station, status]) => {
                                      if (status === 'ready') {
                                         updateStationStatus(order.id, station, 'delivered');
                                      }
                                   });
                                }}
                                className="w-full py-4 sm:py-6 bg-blue-600 text-white rounded-[2rem] sm:rounded-[2.5rem] font-black text-xs sm:text-sm uppercase tracking-[0.1em] shadow-xl shadow-blue-500/20 hover:bg-blue-500 active:scale-95 transition-all flex items-center justify-center gap-2 sm:gap-3"
                             >
                                <CheckCircle size={20} className="sm:w-6 sm:h-6" /> Marcar Entregado
                             </button>
                             <div className="grid grid-cols-2 gap-3">
                                <button 
                                   onClick={() => {
                                      Object.entries(order.station_statuses || {}).forEach(([station, status]) => {
                                         if (status === 'ready') {
                                            announceOrder(order, station, true);
                                         }
                                      });
                                   }}
                                   className="py-5 bg-slate-900 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all flex flex-col items-center justify-center gap-1"
                                >
                                   <Volume2 size={18} />
                                   <span>LLAMAR CLIENTE</span>
                                </button>
                                <button 
                                   onClick={() => setSelectedInvoice(order)}
                                   className="py-5 bg-white text-slate-400 rounded-[2rem] border border-slate-200 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex flex-col items-center justify-center gap-1"
                                >
                                   <FileText size={18} />
                                   <span>VER TICKET</span>
                                </button>
                             </div>
                          </div>
                       </div>
                     ))}
                     {orders.filter(o => {
                        if (o.status === 'cancelled') return false;
                        const statuses = Object.values(o.station_statuses || {});
                        return statuses.some(s => s === 'ready');
                     }).length === 0 && (
                        <div className="col-span-full py-40 text-center opacity-20 flex flex-col items-center border-4 border-dashed border-slate-200 rounded-[5rem]">
                           <Package size={80} className="mb-6 text-slate-300" />
                           <h2 className="text-2xl font-black text-slate-400 uppercase tracking-widest">Sin entregas pendientes</h2>
                        </div>
                     )}
                  </div>
               </div>
            ) : null}
        </main>
      </div>

      <aside className="w-full lg:w-[480px] bg-white flex-shrink-0 flex flex-col border-t lg:border-l border-slate-100 shadow-2xl z-20">
        <div className="p-6 sm:p-8 border-b border-slate-100 flex justify-between items-center">
           <h2 className="text-2xl sm:text-4xl font-black italic tracking-tighter uppercase leading-none">Orden Actual</h2>
           <button onClick={() => setIsCartOpen(true)} className="p-4 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-all relative">
              <ShoppingCart size={24} />
              {cart.length > 0 && (
                 <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full">{cart.length}</span>
              )}
           </button>
        </div>

        <div className="lg:hidden flex justify-between p-4 bg-white border-b border-slate-100">
           <button onClick={() => setIsCartOpen(true)} className="flex-grow flex items-center justify-center gap-3 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">
              <ShoppingCart size={18} />
              Ver Carrito ({cart.length})
              <span className="ml-2 px-2 py-0.5 bg-emerald-500 rounded-full text-[8px]">${total}</span>
           </button>
        </div>

        <div className={`flex-grow overflow-y-auto ${cart.length === 0 ? 'p-4' : 'p-6 sm:p-8'} space-y-6 custom-scrollbar`}>
           {cart.length === 0 ? (
             <div className="py-20 text-center opacity-20 flex flex-col items-center">
                <ShoppingCart size={64} className="mb-4 text-slate-400" />
                <p className="font-black uppercase tracking-widest text-sm">Carrito Vacío</p>
             </div>
           ) : (
             cart.map(item => (
               <div key={item.id} className="group animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex justify-between items-start mb-3">
                     <div className="flex-grow">
                        <h4 className="font-black text-sm uppercase italic tracking-tight text-slate-900 leading-none">{item.name}</h4>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5">${item.price} c/u</p>
                     </div>
                     <div className="font-black font-mono text-lg text-slate-900">${item.price * item.quantity}</div>
                  </div>
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg text-slate-400 hover:text-red-500 shadow-sm transition-all"><Minus size={14} /></button>
                        <span className="font-black text-xs w-6 text-center">{item.quantity}</span>
                        <button onClick={() => addToCart(item, 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg text-slate-400 hover:text-emerald-500 shadow-sm transition-all"><Plus size={14} /></button>
                     </div>
                     <button onClick={() => removeFromCart(item.id, true)} className="text-slate-300 hover:text-red-500 transition-all px-4"><Trash2 size={16} /></button>
                  </div>
                  <div className="h-px bg-slate-50 mt-6 group-last:hidden" />
               </div>
             ))
           )}
        </div>

        <div className="p-8 bg-slate-50/50 border-t border-slate-200 space-y-6 pb-12">
           <div className="space-y-4">
              <div className="flex justify-between items-center text-slate-400 text-[10px] font-black uppercase tracking-widest">
                 <span>Subtotal</span>
                 <span className="font-mono text-xs">${total}</span>
              </div>
              <div className="flex justify-between items-center text-slate-900">
                 <span className="text-sm font-black uppercase italic tracking-widest">Total a Pagar</span>
                 <span className="text-4xl font-black font-mono tracking-tighter decoration-emerald-500 underline decoration-4">${total}</span>
              </div>
           </div>

           <div className="space-y-4">
              <div className="relative group">
                 <input 
                   type="text" 
                   placeholder="Nombre del Cliente..." 
                   value={customerName}
                   onChange={(e) => setCustomerName(e.target.value)}
                   className="w-full bg-white p-6 rounded-[2rem] text-xs font-black uppercase tracking-widest border border-slate-200 focus:border-emerald-500 outline-none transition-all shadow-inner pl-12" 
                 />
                 <Search size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-all" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                 <button 
                   onClick={() => handlePlaceOrder(false)}
                   disabled={cart.length === 0}
                   className="py-6 bg-slate-900 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.1em] shadow-2xl hover:bg-slate-800 disabled:opacity-20 transition-all flex flex-col items-center justify-center gap-1"
                 >
                    <FileText size={16} />
                    <span>REGISTRAR</span>
                 </button>
                 <button 
                   onClick={() => handlePlaceOrder(true)}
                   disabled={cart.length === 0}
                   className="py-6 bg-emerald-600 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.1em] shadow-2xl hover:bg-emerald-500 shadow-emerald-500/20 disabled:opacity-20 transition-all flex flex-col items-center justify-center gap-1"
                 >
                    <Wallet size={16} />
                    <span>COBRAR</span>
                 </button>
                 <button 
                   onClick={parkCart}
                   disabled={cart.length === 0}
                   className="py-6 bg-amber-500 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.1em] shadow-2xl hover:bg-amber-400 shadow-amber-500/20 disabled:opacity-20 transition-all flex flex-col items-center justify-center gap-1"
                 >
                    <Clock size={16} />
                    <span>ESPERA</span>
                 </button>
              </div>
           </div>
        </div>
      </aside>

      <AnimatePresence>
         {isCartOpen && (
           <>
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCartOpen(false)} className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-50" />
             <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed bottom-0 left-0 right-0 h-[92vh] bg-slate-900 rounded-t-[4rem] z-[60] p-10 flex flex-col border-t border-white/5 shadow-2xl max-w-2xl mx-auto overflow-hidden">
                <div className="w-16 h-1.5 bg-slate-800 rounded-full mx-auto mb-10" />
                <div className="flex justify-between items-center mb-10">
                   <h2 className="text-4xl font-black italic tracking-tighter uppercase text-white leading-none underline decoration-emerald-500 decoration-4">Resumen POS</h2>
                   <button onClick={() => setIsCartOpen(false)} className="p-4 bg-slate-800 rounded-2xl text-slate-400 hover:text-white"><X size={24} /></button>
                </div>

                <div className="flex-grow overflow-y-auto space-y-4 pr-2 pb-8">
                   {cart.map(item => (
                     <div key={item.id} className="bg-slate-950/50 p-6 rounded-[2.5rem] border border-white/5 flex gap-6 items-center">
                        <img src={item.image} className="w-20 h-20 rounded-3xl object-cover shadow-xl" />
                        <div className="flex-grow">
                           <h4 className="font-black text-xl italic uppercase tracking-tighter text-white">{item.name}</h4>
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
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600 ml-4">Cliente</label>
                      <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="..." className="w-full bg-slate-900 p-4 rounded-3xl font-black text-xl sm:text-4xl italic text-center text-white border border-white/5 outline-none focus:ring-4 focus:ring-emerald-500/20" />
                      <div className="flex flex-col sm:flex-row justify-between items-center gap-6 sm:gap-4 pt-4">
                         <span className="text-4xl font-black font-mono tracking-tighter text-white">${total}</span>
                         <div className="flex gap-3 sm:gap-4 w-full sm:w-auto">
                            <button onClick={() => handlePlaceOrder(false)} className="flex-1 px-8 py-5 bg-slate-900 text-slate-400 font-black rounded-3xl uppercase tracking-widest text-[10px] border border-white/5 h-[60px] flex items-center justify-center">Registrar</button>
                            <button onClick={() => handlePlaceOrder(true)} className="flex-1 px-8 py-5 bg-emerald-600 text-white font-black rounded-3xl uppercase tracking-widest text-[10px] sm:text-sm shadow-xl shadow-emerald-900/40 hover:bg-emerald-500 transition-all flex items-center justify-center gap-3 h-[60px]">
                               <Banknote size={20} /> Pagado
                            </button>
                         </div>
                      </div>
                   </div>
                </div>
             </motion.div>
           </>
         )}

         {selectedInvoice && (
           <>
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedInvoice(null)} className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[600]" />
             <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed bottom-0 left-0 right-0 h-[92vh] bg-slate-50/50 rounded-t-[5rem] z-[601] p-12 flex flex-col items-center shadow-2xl max-w-5xl mx-auto overflow-hidden">
                <div className="w-20 h-1.5 bg-slate-300 rounded-full mb-10 flex-shrink-0" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 w-full max-w-[440px]">
                   <button 
                      onClick={() => handlePrint()}
                      className="flex flex-col items-center justify-center gap-2 p-6 bg-white border border-slate-100 text-slate-900 rounded-[2rem] font-black uppercase text-[10px] shadow-lg hover:shadow-xl transition-all"
                   >
                      <Printer size={20} />
                      <span>TICKET</span>
                   </button>
                   <button 
                      onClick={() => handlePrint()}
                      className="flex flex-col items-center justify-center gap-2 p-6 bg-[#C29F5C] text-white rounded-[2rem] font-black uppercase text-[10px] shadow-lg hover:opacity-90 transition-all"
                   >
                      <FileText size={20} />
                      <span>PDF</span>
                   </button>
                   <button 
                      onClick={() => handleWhatsAppShare(selectedInvoice)}
                      className="flex flex-col items-center justify-center gap-2 p-6 bg-[#00D95A] text-white rounded-[2rem] font-black uppercase text-[10px] shadow-lg hover:opacity-90 transition-all"
                   >
                      <div className="w-6 h-6 border-2 border-white rounded flex items-center justify-center text-[10px]">W</div>
                      <span>WHATSAPP</span>
                   </button>
                   <button 
                      onClick={() => setSelectedInvoice(null)}
                      className="p-6 bg-slate-100 text-slate-400 rounded-[2rem] hover:bg-slate-200 transition-all font-black uppercase text-[10px]"
                   >
                      CERRAR
                   </button>
                </div>

                <div className="flex-grow overflow-y-auto w-full flex justify-center pb-20 custom-scrollbar">
                   <div ref={printRef} className="origin-top transition-transform duration-500">
                      <Receipt order={selectedInvoice} station={currentUser.station || 'CAJA'} isForPrint={true} />
                   </div>
                </div>
             </motion.div>
           </>
         )}

         {paymentOrderId && (
           <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setPaymentOrderId(null); setPaymentSuccess(false); }} className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[200]" />
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-slate-900 p-10 rounded-[4rem] shadow-2xl z-[201] border border-white/5">
                  <div className="flex justify-between items-center mb-10 leading-none">
                     <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white">
                        {paymentSuccess ? 'Cobro Exitoso' : 'Procesar Cobro'}
                     </h2>
                     <button onClick={() => { setPaymentOrderId(null); setPaymentStation(null); setPaymentSuccess(false); }} className="p-4 bg-slate-800 rounded-[2rem] text-slate-400 hover:text-white transition-all"><X size={24} /></button>
                  </div>

                  {paymentSuccess ? (
                    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                       <div className="max-h-[60vh] overflow-y-auto rounded-[3rem] no-scrollbar">
                          <Receipt order={orders.find(o => o.id === paymentOrderId)} station={paymentStation} isForPrint={true} />
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <button 
                            onClick={() => handlePrint()} 
                            className="flex-grow bg-emerald-600 text-white py-6 rounded-[2.5rem] font-black text-xl hover:bg-emerald-500 transition-all shadow-2xl uppercase tracking-[0.2em] flex items-center justify-center gap-3"
                          >
                            <Printer size={24} /> Imprimir
                          </button>
                          <button 
                            onClick={() => { setPaymentOrderId(null); setPaymentStation(null); setPaymentSuccess(false); }}
                            className="flex-grow bg-slate-800 text-slate-400 py-6 rounded-[2.5rem] font-black text-xl hover:bg-slate-700 transition-all uppercase tracking-[0.2em]"
                          >
                            Cerrar
                          </button>
                       </div>
                    </div>
                  ) : (
                    <>
                      <div className="bg-emerald-600 p-8 rounded-[3rem] mb-10 relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full pointer-events-none" />
                        <div className="text-[10px] uppercase font-black text-slate-600 mb-2 tracking-widest">Monto a Cobrar ({getStationDisplay(paymentStation, paymentOrder)})</div>
                        <div className="text-5xl font-black font-mono text-white tracking-tighter italic shadow-emerald-500/20 shadow-lg">${amountToPay}</div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 mb-10">
                        {[{ id: 'cash', icon: Banknote, l: 'Efectivo' }, { id: 'card', icon: CreditCard, l: 'Tarjeta' }, { id: 'transfer', icon: Landmark, l: 'Transf.' }].map(m => (
                            <button key={m.id} onClick={() => setPaymentMethod(m.id)} className={`p-5 rounded-[2rem] border-2 flex flex-col items-center gap-3 transition-all ${paymentMethod === m.id ? 'bg-emerald-600 border-emerald-500 text-white shadow-xl scale-105' : 'bg-slate-800 border-transparent text-slate-600'}`}>
                              <m.icon size={24} />
                              <span className="text-[10px] font-black uppercase tracking-widest">{m.l}</span>
                            </button>
                        ))}
                      </div>
                      {paymentMethod === 'cash' && (
                          <div className="mb-10 space-y-6">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-4 pb-2 block">Ingreso Efectivo</label>
                                <input type="number" value={amountReceived} onChange={e => setAmountReceived(e.target.value)} className="w-full bg-slate-950 p-6 rounded-3xl text-center text-4xl font-black font-mono text-white shadow-inner outline-none border border-white/5 focus:border-emerald-500/50 transition-all" placeholder="0.00" autoFocus />
                            </div>
                            
                             {amountReceived && Number(amountReceived) < amountToPay && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-500/10 p-6 rounded-3xl border border-red-500/20 text-center">
                                  <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Monto Insuficiente</p>
                                  <p className="text-xl font-bold text-red-600 tracking-tighter">Faltan RD$ {(amountToPay - Number(amountReceived)).toFixed(2)}</p>
                                </motion.div>
                             )}

                             {amountReceived && Number(amountReceived) >= amountToPay && paymentMethod === 'cash' && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-emerald-500/10 p-6 rounded-3xl border border-emerald-500/20 text-center">
                                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Cambio a Devolver</p>
                                  <p className="text-3xl font-black text-emerald-400 font-mono tracking-tighter">RD$ {(Number(amountReceived) - amountToPay).toFixed(2)}</p>
                                </motion.div>
                             )}
                           </div>
                       )}
                       <button 
                         onClick={handleFinalizePayment} 
                         className={`w-full py-6 rounded-[2.5rem] font-black text-xl transition-all shadow-2xl uppercase tracking-[0.2em] ${amountReceived && Number(amountReceived) < amountToPay && paymentMethod === 'cash' ? 'bg-slate-400 cursor-not-allowed opacity-50' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
                       >
                         {amountReceived && Number(amountReceived) < amountToPay && paymentMethod === 'cash' ? 'Monto Insuficiente' : 'Registrar Pago'}
                       </button>
                    </>
                  )}
               </motion.div>
            </>
          )}

          {isClosingShift && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-[500]" />
              <motion.div initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-slate-900 p-8 sm:p-12 rounded-[4.5rem] shadow-2xl z-[501] border border-amber-500/20 overflow-y-auto max-h-[90vh] custom-scrollbar">
                 <div className="flex flex-col items-center text-center gap-6">
                    <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center border border-amber-500/30"><Wallet size={40} /></div>
                    <div>
                       <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white leading-none">Cierre de Caja</h2>
                       <p className="text-[10px] font-black text-amber-500/60 uppercase tracking-widest mt-2">Turno: {currentUser.station}</p>
                    </div>

                    {/* Stats Panel */}
                    <div className="w-full grid grid-cols-2 gap-4">
                       <div className="bg-slate-950 p-6 rounded-[2.5rem] border border-white/5">
                          <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1">Ventas Totales</p>
                          <p className="text-2xl font-black text-white font-mono">${getShiftTotals(currentUser.station).total.toFixed(2)}</p>
                       </div>
                       <div className="bg-slate-950 p-6 rounded-[2.5rem] border border-white/5">
                          <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1">Efectivo Esperado</p>
                          <p className="text-2xl font-black text-emerald-500 font-mono">${getShiftTotals(currentUser.station).cash.toFixed(2)}</p>
                       </div>
                    </div>

                    <form onSubmit={handleCloseShift} className="w-full space-y-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Efectivo Real en Caja</label>
                          <input 
                            required 
                            type="number" 
                            step="0.01"
                            value={actualCash} 
                            onChange={e => setActualCash(e.target.value)} 
                            className="w-full bg-slate-950 p-6 rounded-3xl font-mono text-4xl font-black text-white text-center border border-white/5 focus:ring-4 focus:ring-amber-500/20 transition-all" 
                            placeholder="0.00" 
                            autoFocus
                          />
                       </div>

                       {/* Discrepancy Display */}
                       {actualCash && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`p-6 rounded-3xl border flex flex-col items-center gap-1 ${Math.abs(Number(actualCash) - getShiftTotals(currentUser.station).cash) < 0.01 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Diferencia (Descuadre)</p>
                             <p className={`text-3xl font-black font-mono ${Math.abs(Number(actualCash) - getShiftTotals(currentUser.station).cash) < 0.01 ? 'text-emerald-500' : 'text-red-500'}`}>
                                RD$ {(Number(actualCash) - getShiftTotals(currentUser.station).cash).toFixed(2)}
                             </p>
                          </motion.div>
                       )}

                       {/* Discrepancy Handling */}
                       {actualCash && Math.abs(Number(actualCash) - getShiftTotals(currentUser.station).cash) > 0.01 && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
                             <div>
                                <label className="text-[10px] font-black uppercase text-red-500 tracking-widest block mb-2">Justificación Obligatoria</label>
                                <textarea 
                                  required
                                  value={shiftNote}
                                  onChange={e => setShiftNote(e.target.value)}
                                  placeholder="Explica el motivo del descuadre..."
                                  className="w-full bg-slate-950 p-4 rounded-2xl text-xs font-bold text-white border border-red-500/20 h-24 italic"
                                />
                             </div>
                             
                             {!authorizedBy ? (
                                <div className="bg-slate-950 p-6 rounded-3xl border border-red-500/20 space-y-4">
                                   <div className="flex items-center gap-3 text-red-500 mb-2">
                                      <Shield size={16} />
                                      <p className="text-[10px] font-black uppercase tracking-widest">Pin de Admin Requerido</p>
                                   </div>
                                   <input 
                                     type="password"
                                     maxLength="4"
                                     placeholder="PIN"
                                     onChange={(e) => {
                                       if (e.target.value.length === 4) handleAdminAuthForShift(e.target.value);
                                     }}
                                     className="w-full bg-slate-900 p-4 rounded-xl text-center text-2xl font-black font-mono tracking-[0.5em] text-white border border-white/5"
                                   />
                                   {authError_shift && <p className="text-[8px] font-black text-red-500 uppercase tracking-widest text-center">{authError_shift}</p>}
                                </div>
                             ) : (
                                <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20 flex items-center justify-center gap-3">
                                   <CheckCircle size={16} className="text-emerald-500" />
                                   <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Autorizado por {authorizedBy}</p>
                                </div>
                             )}
                          </motion.div>
                       )}

                       <div className="flex gap-4 pt-4">
                          <button type="button" onClick={() => setIsClosingShift(false)} className="flex-grow py-5 bg-slate-800 rounded-3xl font-black text-slate-500 uppercase text-xs">Atrás</button>
                          <button 
                            type="submit" 
                            disabled={actualCash && Math.abs(Number(actualCash) - getShiftTotals(currentUser.station).cash) > 0.01 && (!authorizedBy || !shiftNote)}
                            className={`flex-[2] py-5 rounded-3xl font-black shadow-xl uppercase text-xs transition-all ${actualCash && Math.abs(Number(actualCash) - getShiftTotals(currentUser.station).cash) > 0.01 ? 'bg-red-600 text-white hover:bg-red-500' : 'bg-amber-600 text-white hover:bg-amber-500'}`}
                          >
                            Finalizar Turno
                          </button>
                       </div>
                    </form>
                 </div>
              </motion.div>
            </>
           )}

          {isAuthModalOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAuthModalOpen(false)} className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[5000]" />
              <motion.div initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-slate-900 p-12 rounded-[4rem] shadow-2xl z-[5001] border border-white/5 text-center">
                <div className="w-16 h-16 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-400">
                  <Shield size={32} />
                </div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-2 text-white">Autorización Admin</h2>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-8">Esta acción requiere la clave del administrador</p>
                
                <form onSubmit={handleAuthSubmit} className="space-y-6">
                  <input 
                    type="password" 
                    maxLength="4" 
                    autoFocus
                    value={authPin} 
                    onChange={e => setAuthPin(e.target.value)}
                    placeholder="PIN"
                    className="w-full bg-slate-950 p-6 rounded-3xl text-center text-4xl font-black font-mono tracking-[0.5em] shadow-inner border border-white/5 text-white focus:ring-4 focus:ring-emerald-500/10"
                  />
                  {authError && <p className="text-[10px] font-black text-red-500 uppercase tracking-widest animate-shake">{authError}</p>}
                  <div className="flex gap-4">
                    <button type="button" onClick={() => setIsAuthModalOpen(false)} className="flex-grow py-5 bg-slate-800 rounded-2xl font-black text-slate-500 uppercase text-[10px]">Cancelar</button>
                    <button type="submit" className="flex-[2] py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] hover:bg-emerald-500 transition-all">Autorizar</button>
                  </div>
                </form>
              </motion.div>
            </>
          )}
       </AnimatePresence>
       <style dangerouslySetInnerHTML={{ __html: `
        .animate-shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
      `}} />
    </div>
  );
};

export default SellerPOS;
