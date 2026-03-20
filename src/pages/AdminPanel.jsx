import React, { useState, useMemo, useRef } from 'react';
import { useOrder } from '../context/OrderContext';
import { 
  Plus, Edit2, Trash2, DollarSign, Package, TrendingUp, 
  AlertCircle, ArrowUpRight, ArrowDownRight, 
  Layers, X, Save, LogOut, Users, FileText, Filter, CheckCircle2, CheckCircle,
  ShoppingCart, Wallet, Banknote, CreditCard, Landmark, Search, ChevronRight, Printer, RotateCcw, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

const AdminPanel = () => {
  const { products, setProducts, addProduct, orders, updateOrderStatus, updateStationStatus, updateOrder, cancelOrder, deleteOrder, deletePayment, currentUser, logout, shifts, deleteShift, users, addUser, deleteUser, addToCart, cart, removeFromCart, clearCart, placeOrder, printerConfig, updatePrinterConfig } = useOrder();
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [salesFilter, setSalesFilter] = useState('Todas');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Local state for Admin POS
  const [customerName, setCustomerName] = useState('');
  
  // Payment Modal States
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [paymentStation, setPaymentStation] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountReceived, setAmountReceived] = useState('');

  // Invoice/Receipt States
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isEditingOrder, setIsEditingOrder] = useState(null);

  const navigate = useNavigate();
  const printRef = useRef();

  // Auto-print effect when invoice is selected from checkout
  React.useEffect(() => {
    if (selectedInvoice && activeTab === 'checkout') {
      const timer = setTimeout(() => {
        window.print();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [selectedInvoice, activeTab]);
  
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'catalogo')) {
     return (
       <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
          <AlertCircle size={64} className="text-red-500 mb-6" />
          <h1 className="text-4xl font-black text-white mb-2">ACCESO RESTRINGIDO</h1>
          <button onClick={() => navigate('/login')} className="bg-emerald-600 px-8 py-4 rounded-2xl font-black uppercase mt-8 text-white">Ir al Login</button>
       </div>
     );
  }

  const [newProduct, setNewProduct] = useState({
    name: '', description: '', price: '', cost: '', stock: '', category: 'Burgers',
    station: 'COMIDA RÁPIDA', image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=300'
  });

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProduct(prev => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const [userData, setUserData] = useState({ name: '', role: 'vendedor', station: 'BAR', pin: '' });

  // Stats calculation
  const deliveredOrders = orders.filter(o => o.status === 'delivered' || (o.station_statuses && Object.values(o.station_statuses).some(s => s === 'delivered')));
  const filteredSalesOrders = deliveredOrders.filter(o => salesFilter === 'Todas' || o.items?.some(i => i.station === salesFilter));
  
  const totalSales = filteredSalesOrders.reduce((acc, o) => {
    if (salesFilter === 'Todas') {
      return acc + (o.items?.reduce((sum, i) => o.station_statuses?.[i.station] === 'delivered' ? sum + (i.price_at_time * i.quantity) : sum, 0) || 0);
    }
    return acc + (o.items?.filter(i => i.station === salesFilter && o.station_statuses?.[i.station] === 'delivered').reduce((sum, i) => sum + (i.price_at_time * i.quantity), 0) || 0);
  }, 0);

  const totalCost = filteredSalesOrders.reduce((acc, o) => {
    if (salesFilter === 'Todas') {
      return acc + (o.items?.reduce((sum, i) => o.station_statuses?.[i.station] === 'delivered' ? sum + (i.cost_at_time * i.quantity) : sum, 0) || 0);
    }
    return acc + (o.items?.filter(i => i.station === salesFilter && o.station_statuses?.[i.station] === 'delivered').reduce((sum, i) => sum + (i.cost_at_time * i.quantity), 0) || 0);
  }, 0);
  const totalProfit = totalSales - totalCost;

  const lowStockProducts = products.filter(p => p.stock < 10);

  const handleAddProduct = (e) => {
    e.preventDefault();
    addProduct({ ...newProduct, price: Number(newProduct.price), cost: Number(newProduct.cost), stock: Number(newProduct.stock) });
    setIsModalOpen(false);
  };

  const handleAddUser = (e) => {
    e.preventDefault();
    addUser(userData);
    setIsUserModalOpen(false);
    setUserData({ name: '', role: 'vendedor', station: 'Bar', pin: '' });
  };

  const handleAdminPlaceOrder = (directPay = false) => {
    if (!customerName.trim()) return alert("Ingresa nombre de cliente");
    const order = placeOrder(customerName.trim());
    if (order) {
      if (directPay) {
        setPaymentOrder(order);
        setPaymentStation(Object.keys(order.station_statuses)[0]);
      } else {
        setSelectedInvoice(order);
      }
      setCustomerName('');
      clearCart();
    }
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Sheet 1: Sales
    const salesData = orders.map(o => ({
      TKT: o.ticket_number,
      Cliente: o.customer_name,
      Fecha: new Date(o.timestamp).toLocaleString(),
      Total: o.total_price,
      Estado: o.status,
      Pagado: o.is_paid ? 'SI' : 'NO'
    }));
    const wsSales = XLSX.utils.json_to_sheet(salesData);
    XLSX.utils.book_append_sheet(wb, wsSales, "Ventas");

    // Sheet 2: Inventory
    const invData = products.map(p => ({
      Nombre: p.name,
      Estacion: p.station,
      Precio: p.price,
      Costo: p.cost,
      Stock: p.stock,
      Alerta: p.stock < 10 ? 'STOCK BAJO' : 'OK'
    }));
    const wsInv = XLSX.utils.json_to_sheet(invData);
    XLSX.utils.book_append_sheet(wb, wsInv, "Inventario");

    // Sheet 3: Shifts (Cuadre)
    const shiftData = shifts.map(s => ({
      Estacion: s.station,
      Fecha: new Date(s.timestamp).toLocaleString(),
      Esperado: s.expected_sales,
      Efectivo: s.actual_cash,
      Diferencia: s.difference
    }));
    const wsShifts = XLSX.utils.json_to_sheet(shiftData);
    XLSX.utils.book_append_sheet(wb, wsShifts, "Turnos");

    XLSX.writeFile(wb, `Reporte_Manolo_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleFinalizePayment = () => {
    if (paymentMethod === 'cash' && (!amountReceived || Number(amountReceived) <= 0)) {
      return alert("El campo de dinero está vacío o es inválido.");
    }

    const amountToPay = paymentOrder.items?.filter(i => i.station === paymentStation).reduce((sum, i) => sum + (i.price_at_time * i.quantity), 0) || 0;
    const received = Number(amountReceived) || amountToPay;
    const paymentData = {
      method: paymentMethod,
      received: received,
      change: received - amountToPay,
      timestamp: new Date().toISOString()
    };
    
    updateStationStatus(paymentOrder.id, paymentStation, 'delivered', paymentData);
    
    // Auto-show invoice after payment
    const updatedOrder = { ...paymentOrder, is_paid: true }; // Simplified for the preview
    setSelectedInvoice(updatedOrder);
    
    setPaymentOrder(null);
    setPaymentStation(null);
    setAmountReceived('');
  };

  const handlePrint = () => {
    window.print();
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp, roles: ['admin'] },
    { id: 'pos', label: 'Ventas (POS)', icon: ShoppingCart, roles: ['admin'] },
    { id: 'checkout', label: 'Caja Central', icon: Wallet, roles: ['admin'] },
    { id: 'history', label: 'Historial / Fact.', icon: FileText, roles: ['admin'] },
    { id: 'products', label: 'Catalogo', icon: Package, roles: ['admin', 'catalogo'] },
    { id: 'inventory', label: 'Inventario', icon: Layers, roles: ['admin', 'catalogo'] },
    { id: 'shifts', label: 'Turnos', icon: Filter, roles: ['admin'] },
    { id: 'users', label: 'Usuarios', icon: Users, roles: ['admin'] },
    { id: 'settings', label: 'Configuración', icon: Settings, roles: ['admin'] },
  ].filter(item => !item.roles || item.roles.includes(currentUser?.role));
  const Receipt = ({ order }) => {
    if (!order) return null;
    const is_paid = order.is_paid;
    const totalPaid = order.is_paid ? order.total_price : 0;
    const pending = order.is_paid ? 0 : order.total_price;

    return (
      <div className="bg-white p-10 max-w-[440px] mx-auto rounded-[3.5rem] shadow-xl font-sans text-slate-600 relative overflow-hidden ring-1 ring-slate-100" id="printable-invoice">
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
                padding: 40px; 
                box-shadow: none !important;
              }
            }
         `}</style>
         
          {/* Branded Header */}
          <div className="flex flex-col items-center mb-10 pb-10 border-b-2 border-slate-900 border-double">
             <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center mb-4 shadow-xl rotate-3">
                <ShoppingCart className="text-white" size={40} />
             </div>
             <h1 className="text-3xl font-black italic tracking-tighter text-slate-900 leading-none">MANOLO</h1>
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
               <span className="text-slate-900 font-black italic">{order.customer_name?.toUpperCase()}</span>
            </div>
         </div>

         <div className="border-t border-dashed border-slate-200 my-8" />

         {/* Items Table */}
         <div className="space-y-6 mb-10">
            <div className="grid grid-cols-6 text-[9px] font-black uppercase tracking-widest text-slate-300">
               <div className="col-span-1">CANT</div>
               <div className="col-span-3">DESCRIPCIÓN</div>
               <div className="col-span-2 text-right">TOTAL</div>
            </div>
            {order.items?.map((item, i) => (
               <div key={i} className="grid grid-cols-6 items-center">
                  <div className="col-span-1 font-black text-slate-900">{item.quantity}</div>
                  <div className="col-span-3">
                     <p className="font-black text-[12px] text-slate-900 uppercase italic tracking-tighter leading-none">{item.name}</p>
                     <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{item.station}</p>
                  </div>
                  <div className="col-span-2 text-right font-black text-slate-900 font-mono italic">RD$ {item.price_at_time * item.quantity}</div>
               </div>
            ))}
         </div>

         <div className="border-t border-dashed border-slate-200 my-8" />

         {/* Total Banner */}
         <div className="bg-slate-50/80 p-8 rounded-[2.5rem] flex flex-col items-center justify-center gap-2 mb-10 border border-slate-100 shadow-inner">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">TOTAL VENTA</span>
            <span className="text-4xl font-black italic tracking-tighter text-slate-900 font-mono">RD$ {order.total_price}.00</span>
         </div>

         {/* Payment Summary */}
         <div className="space-y-5 mb-12">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
               <span className="text-slate-400">ABONADO / PAGADO</span>
               <span className="text-emerald-500">RD$ {totalPaid}.00</span>
            </div>
            <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest">
               <span className="text-red-500 underline decoration-2 underline-offset-8 italic">RESTA / PENDIENTE</span>
               <span className="text-red-500 font-mono text-lg tracking-tighter">RD$ {pending}.00</span>
            </div>
         </div>

         <div className="text-center pt-10 border-t border-slate-100">
            <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.4em] italic leading-none">¡GRACIAS POR PREFERIRNOS!</p>
            <p className="text-[8px] font-black text-slate-200 mt-4 uppercase tracking-[0.6em]">MANOLO FOODTRUCK PARK</p>
         </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans overflow-x-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-72 bg-slate-900 text-white p-6 flex-col gap-8 sticky top-0 h-screen overflow-y-auto z-50">
        <div className="text-2xl font-black italic text-emerald-500 tracking-tighter uppercase leading-none">Manolo <span className="text-white">FOODTRUCK Park</span></div>
        <nav className="space-y-1 flex-grow">
          {menuItems.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left p-4 rounded-2xl flex items-center gap-3 transition-all ${activeTab === tab.id ? 'bg-emerald-600 shadow-lg text-white' : 'hover:bg-slate-800 text-slate-400'}`}
            >
              <tab.icon size={18} /> <span className="font-bold text-sm tracking-tight">{tab.label}</span>
            </button>
          ))}
        </nav>
        <button onClick={() => { logout(); navigate('/login'); }} className="p-4 bg-slate-800 rounded-2xl flex items-center gap-3 text-red-400 font-bold hover:bg-red-500/10 transition-all text-sm">
          <LogOut size={18} /> Salir
        </button>
      </aside>

      {/* Sidebar - Mobile Navigation */}
      <div className="flex lg:hidden bg-slate-900 p-4 border-b border-white/10 sticky top-0 z-50 overflow-x-auto no-scrollbar">
         <div className="flex gap-2 min-w-max">
            {menuItems.map(tab => (
               <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-3 rounded-2xl flex items-center gap-2 transition-all ${activeTab === tab.id ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500'}`}>
                  <tab.icon size={16} />
                  <span className="text-[9px] font-black uppercase tracking-widest">{tab.label}</span>
               </button>
            ))}
            <button onClick={() => { logout(); navigate('/login'); }} className="px-4 py-3 bg-red-500/10 text-red-500 rounded-2xl"><LogOut size={16} /></button>
         </div>
      </div>

      <main className="flex-grow p-8 overflow-y-auto bg-slate-50">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tighter capitalize leading-none">{menuItems.find(m => m.id === activeTab)?.label}</h1>
            <p className="text-slate-400 font-bold text-xs mt-2 uppercase tracking-widest italic">Gestión Administrativa</p>
          </div>
          <div className="flex flex-wrap gap-4 w-full sm:w-auto">
            {currentUser?.role === 'admin' && (
              <button onClick={exportToExcel} className="flex-grow sm:flex-grow-0 bg-emerald-50 text-emerald-600 px-6 py-3 rounded-2xl flex items-center justify-center gap-2 font-black uppercase text-[10px] tracking-widest border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all">
                 Descargar Reporte EXCEL
              </button>
            )}
            {activeTab === 'products' && (
              <button onClick={() => setIsModalOpen(true)} className="flex-grow sm:flex-grow-0 bg-slate-900 text-white px-6 py-3 rounded-2xl flex items-center justify-center gap-2 font-bold shadow-xl"><Plus size={20} /> Nuevo Producto</button>
            )}
            {activeTab === 'users' && (
              <button onClick={() => setIsUserModalOpen(true)} className="flex-grow sm:flex-grow-0 bg-slate-900 text-white px-6 py-3 rounded-2xl flex items-center justify-center gap-2 font-bold shadow-xl"><Plus size={20} /> Nuevo Usuario</button>
            )}
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'products' && (
            <motion.div key="products" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map(product => (
                  <div key={product.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col gap-4 group">
                    <div className="flex gap-4 items-start">
                      <img src={product.image} className="w-20 h-20 rounded-2xl object-cover shadow-md" />
                      <div className="flex-grow min-w-0">
                        <h4 className="font-black text-slate-900 uppercase truncate text-sm">{product.name}</h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{product.station}</p>
                        <div className="mt-2 text-xl font-black text-emerald-600 font-mono italic">${product.price}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                       <button onClick={() => {
                         setNewProduct({ ...product });
                         setIsModalOpen(true);
                       }} className="bg-slate-50 text-slate-900 p-3 rounded-xl font-black uppercase text-[9px] hover:bg-slate-900 hover:text-white transition-all border border-slate-100">Editar</button>
                       <button onClick={() => { if(confirm("¿Eliminar producto?")) setProducts(products.filter(p => p.id !== product.id)); }} className="bg-red-50 text-red-500 p-3 rounded-xl font-black uppercase text-[9px] hover:bg-red-500 hover:text-white transition-all border border-red-100">Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 {[
                   { label: 'Ventas Totales', value: `$${totalSales}`, icon: DollarSign, color: 'text-emerald-500' },
                   { label: 'Costo Insumos', value: `$${totalCost}`, icon: Package, color: 'text-slate-400' },
                   { label: 'Ganancia Neta', value: `$${totalProfit}`, icon: TrendingUp, color: 'text-blue-500' },
                   { label: 'Stock Bajo', value: lowStockProducts.length, icon: AlertCircle, color: 'text-amber-500' },
                 ].map((stat, i) => (
                   <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                      <div className={`p-3 rounded-xl bg-slate-50 ${stat.color} w-fit`}><stat.icon size={20} /></div>
                      <div className="mt-4">
                         <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{stat.label}</div>
                         <div className="text-3xl font-black mt-1 text-slate-900">{stat.value}</div>
                      </div>
                   </div>
                 ))}
              </div>

              <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-black italic uppercase tracking-tighter text-emerald-600">Procesar Cobros</h2>
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-2 w-full md:w-auto overflow-x-auto">
                      <button onClick={() => setActiveTab('checkout')} className={`px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'checkout' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-100'}`}>Cobros</button>
                      <button onClick={() => setActiveTab('collections')} className={`px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'collections' ? 'bg-emerald-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-100'}`}>Historial Cobros</button>
                      <button onClick={() => setActiveTab('inventory')} className={`px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'inventory' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-100'}`}>Inventario</button>
                    </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {orders.filter(o => o.station_statuses && Object.values(o.station_statuses).some(s => s !== 'delivered')).length === 0 ? (
                      <div className="col-span-full py-10 text-center opacity-20 italic">No hay pedidos por cobrar</div>
                    ) : (
                      orders.filter(o => o.station_statuses && Object.values(o.station_statuses).some(s => s !== 'delivered')).slice(0, 3).map(order => (
                         <div key={order.id} className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                            <div className="text-[10px] font-black text-slate-400 mb-1 flex justify-between">
                               <span>TKT #{order.ticket_number}</span>
                               {order.is_paid && <span className="text-emerald-500">PAGADO</span>}
                            </div>
                            <div className="font-black text-xl italic uppercase mb-4">{order.customer_name}</div>
                            <div className="space-y-2">
                               {Object.entries(order.station_statuses).filter(([_, s]) => s !== 'delivered').map(([st, s]) => (
                                 <button key={st} onClick={() => { setPaymentOrder(order); setPaymentStation(st); }} className={`w-full p-4 ${s === 'ready' ? 'bg-emerald-600' : 'bg-slate-900'} text-white rounded-2xl text-[10px] font-black uppercase hover:opacity-80 transition-all flex items-center justify-between`}>
                                    <div className="flex items-center gap-2">
                                       <span>Pagar {st}</span>
                                       {s === 'ready' && <div className="w-2 h-1 bg-white rounded-full animate-ping" />}
                                    </div>
                                    <div className="flex items-center gap-2">
                                       <span className="opacity-40">{s === 'ready' ? 'LISTO' : 'COLA'}</span>
                                       <Banknote size={16} />
                                    </div>
                                 </button>
                               ))}
                            </div>
                         </div>
                       ))
                    )}
                 </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'pos' && (
            <motion.div key="pos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col lg:grid lg:grid-cols-3 gap-8 h-auto lg:h-[calc(100vh-200px)]">
               <div className="lg:col-span-2 space-y-6 lg:overflow-y-auto pr-0 lg:pr-4">
                  <div className="sticky top-0 bg-slate-50 z-10 py-2">
                     <div className="relative flex-grow">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" placeholder="Buscar producto..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-white p-5 pl-12 rounded-[2.5rem] border border-slate-100 shadow-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none" />
                     </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     {products.filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(p => (
                        <button key={p.id} onClick={() => addToCart(p)} className="bg-white p-5 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-emerald-500 flex items-center gap-4 text-left transition-all active:scale-95 group">
                           <img src={p.image} className="w-20 h-20 rounded-2xl object-cover shrink-0" />
                           <div className="flex-grow">
                              <h4 className="font-black text-slate-900 leading-tight group-hover:text-emerald-600 uppercase text-sm">{p.name}</h4>
                              <p className="text-[10px] font-black text-slate-400 mt-1 uppercase italic">{p.station}</p>
                           </div>
                           <div className="text-2xl font-black text-slate-900 font-mono tracking-tighter">${p.price}</div>
                        </button>
                     ))}
                  </div>
               </div>
               <div className="bg-slate-900 text-white rounded-[3rem] lg:rounded-[3.5rem] shadow-2xl flex flex-col p-8 lg:p-10 h-auto lg:h-full relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-[8rem]" />
                  <h3 className="text-2xl font-black italic uppercase underline decoration-emerald-500 decoration-4 mb-8">Punto de Venta</h3>
                  <div className="space-y-3 mb-8">
                     <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">Cliente</label>
                     <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="..." className="w-full bg-slate-800 p-5 rounded-2xl font-black text-xl outline-none focus:ring-2 focus:ring-emerald-500 border border-white/5" />
                  </div>
                  <div className="flex-grow overflow-y-auto space-y-3 mb-8 scrollbar-hide pr-2">
                    {cart.map(item => (
                       <div key={item.id} className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-2xl border border-white/5 group">
                          <div className="w-10 h-10 bg-white text-slate-900 rounded-xl flex items-center justify-center font-black">{item.quantity}</div>
                          <div className="flex-grow truncate font-bold text-sm">{item.name}</div>
                          <div className="font-black text-emerald-400">$ {item.price * item.quantity}</div>
                          <button onClick={() => removeFromCart(item.id)} className="text-white/20 hover:text-red-500 transition-colors"><X size={16} /></button>
                       </div>
                    ))}
                  </div>
                  <div className="space-y-4 pt-6 border-t border-white/10">
                     <div className="flex justify-between items-end">
                        <span className="text-[10px] uppercase font-black opacity-40">Total Venta</span>
                        <div className="text-5xl font-black font-mono tracking-tighter decoration-emerald-500 underline decoration-4">$ {cart.reduce((a, b) => a + (b.price * b.quantity), 0)}</div>
                     </div>
                     <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => handleAdminPlaceOrder(false)} className="bg-slate-800 p-5 rounded-3xl font-black uppercase text-[10px] hover:bg-slate-700 transition-all border border-white/5">Registrar</button>
                        <button onClick={() => handleAdminPlaceOrder(true)} className="bg-emerald-600 p-5 rounded-3xl font-black uppercase text-[10px] hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-900/40">Cobrar Ahora</button>
                     </div>
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
               <div className="bg-white p-10 rounded-[4rem] border border-slate-100 shadow-sm relative">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                     <h2 className="text-2xl font-black uppercase italic tracking-tighter">Historial de Transacciones</h2>
                     <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-2 w-full md:w-auto overflow-x-auto">
                        {['Todas', 'BAR', 'COMIDA RÁPIDA', 'DULCES/POSTRES'].map(f => (
                          <button key={f} onClick={() => setSalesFilter(f)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black whitespace-nowrap transition-all ${salesFilter === f ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400'}`}>{f}</button>
                        ))}
                     </div>
                  </div>

                  <div className="space-y-4">
                     {orders.filter(o => o.status !== 'cancelled' && (salesFilter === 'Todas' || o.items?.some(i => i.station === salesFilter))).map(order => (
                       <div key={order.id} className="bg-slate-50 border border-slate-100 p-6 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 hover:border-emerald-500/20 transition-all group">
                          <div className="flex items-center gap-6 w-full md:w-auto">
                             <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center font-black text-slate-400 border border-slate-100 shadow-sm">
                                #{order.ticket_number}
                             </div>
                             <div>
                                <h4 className="text-xl font-black uppercase italic tracking-tighter leading-none">{order.customer_name}</h4>
                                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{new Date(order.timestamp).toLocaleString()}</p>
                             </div>
                          </div>

                          <div className="flex flex-wrap gap-2 w-full md:w-auto overflow-x-auto">
                             {Object.entries(order.station_statuses || {}).map(([st, s]) => (
                                <div key={st} className={`px-3 py-1.5 rounded-xl border text-[8px] font-black uppercase flex items-center gap-2 ${s === 'delivered' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-amber-50 border-amber-100 text-amber-600'}`}>
                                   <span>{st}</span>
                                   <div className={`w-1 h-1 rounded-full ${s === 'delivered' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                                   <span>{s === 'delivered' ? 'PAGADO' : 'PENDIENTE'}</span>
                                </div>
                             ))}
                          </div>

                          <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                             <div className="text-right">
                                <span className="text-[10px] font-black text-slate-400 uppercase">Subtotal</span>
                                <div className="text-2xl font-black font-mono tracking-tighter text-slate-900">${order.total_price}</div>
                             </div>
                             <div className="flex gap-2">
                                <button onClick={() => setSelectedInvoice(order)} title="Imprimir" className="p-3 bg-white text-slate-500 rounded-2xl hover:bg-slate-900 hover:text-white transition-all shadow-sm"><Printer size={20} /></button>
                                <button onClick={() => setIsEditingOrder(order)} title="Editar" className="p-3 bg-white text-slate-500 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"><Edit2 size={20} /></button>
                                <button onClick={() => { if(confirm("¿Anular venta? Se devolverá el stock.")) cancelOrder(order.id); }} title="Anular" className="p-3 bg-white text-slate-500 rounded-2xl hover:bg-amber-500 hover:text-white transition-all shadow-sm"><RotateCcw size={20} /></button>
                                <button onClick={() => { if(confirm("¿ELIMINAR DEFINITIVAMENTE? No se puede deshacer.")) deleteOrder(order.id); }} title="Eliminar" className="p-3 bg-white text-slate-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm"><Trash2 size={20} /></button>
                             </div>
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'checkout' && (
            <motion.div key="checkout" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12 pb-20">
               {/* SECCIÓN: PENDIENTES DE COBRO */}
               <div>
                  <div className="flex items-center gap-4 mb-8">
                     <div className="w-3 h-12 bg-amber-500 rounded-full" />
                     <h2 className="text-3xl font-black uppercase italic tracking-tighter">Control Global de Cobros</h2>
                     <div className="bg-amber-100 text-amber-600 px-4 py-1 rounded-full text-[10px] font-black">{orders.filter(o => !o.is_paid && o.status !== 'delivered' && o.status !== 'cancelled').length}</div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                     {orders.filter(o => !o.is_paid && o.status !== 'delivered' && o.status !== 'cancelled').length === 0 ? (
                        <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border border-dashed border-slate-200 opacity-40 italic font-bold text-slate-400">Todo cobrado. ¡Excelente!</div>
                     ) : (
                        orders.filter(o => !o.is_paid && o.status !== 'delivered' && o.status !== 'cancelled').map(order => (
                           <div key={order.id} className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-xl relative overflow-hidden group">
                              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full group-hover:bg-amber-500/10 transition-colors" />
                              <div className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] mb-2 pr-12">Ticket #{order.ticket_number}</div>
                              <h3 className="text-4xl font-black italic tracking-tighter uppercase mb-6 truncate">{order.customer_name}</h3>
                              
                              <div className="space-y-3">
                                 {Object.entries(order.station_statuses || {}).map(([st, s]) => {
                                    const stAmt = order.items?.filter(i => i.station === st).reduce((sum, i) => sum + (i.price_at_time * i.quantity), 0) || 0;
                                    return (
                                      <button key={st} onClick={() => { setPaymentOrder(order); setPaymentStation(st); }} className={`w-full ${s === 'ready' ? 'bg-emerald-600' : 'bg-slate-900'} text-white p-6 rounded-[2rem] flex items-center justify-between hover:scale-105 active:scale-95 transition-all font-black text-sm uppercase shadow-lg`}>
                                         <div className="flex items-center gap-3">
                                            <span>Cobrar {st}</span>
                                            {s === 'ready' && <div className="w-2 h-2 bg-white rounded-full animate-ping" />}
                                         </div>
                                         <div className="text-2xl font-mono tracking-tighter">${stAmt}</div>
                                      </button>
                                    );
                                 })}
                              </div>
                           </div>
                        ))
                     )}
                  </div>
               </div>

               {/* SECCIÓN: PEDIDOS YA PAGADOS */}
               <div className="pt-12 border-t border-slate-200">
                  <div className="flex items-center gap-4 mb-8">
                     <div className="w-3 h-12 bg-emerald-500 rounded-full" />
                     <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-400">Pedidos Pagados</h2>
                     <div className="bg-emerald-100 text-emerald-600 px-4 py-1 rounded-full text-[10px] font-black">{orders.filter(o => o.is_paid && o.status !== 'delivered' && o.status !== 'cancelled').length}</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                     {orders.filter(o => o.is_paid && o.status !== 'delivered' && o.status !== 'cancelled').length === 0 ? (
                        <div className="col-span-full py-20 text-center opacity-20 italic font-bold">Sin órdenes pagadas pendientes de entrega</div>
                     ) : (
                        orders.filter(o => o.is_paid && o.status !== 'delivered' && o.status !== 'cancelled').map(order => (
                           <div key={order.id} className="bg-slate-50 p-8 rounded-[3.5rem] border border-slate-200 shadow-sm relative overflow-hidden group opacity-80 hover:opacity-100 transition-opacity">
                              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-100 rounded-bl-[4rem]" />
                              <div className="flex justify-between items-start mb-2">
                                 <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">TICKET #{order.ticket_number}</div>
                                 <CheckCircle size={16} className="text-emerald-500 mr-4" />
                              </div>
                              <h3 className="text-3xl font-black italic tracking-tighter uppercase mb-6 truncate text-slate-900">{order.customer_name}</h3>
                              
                              <div className="flex gap-3">
                                 <button onClick={() => setSelectedInvoice(order)} className="flex-grow bg-white text-slate-900 p-5 rounded-3xl font-black uppercase text-[10px] border border-slate-200 hover:bg-slate-900 hover:text-white transition-all shadow-sm">Factura</button>
                                 <button 
                                    onClick={() => {
                                       Object.keys(order.station_statuses || {}).forEach(st => updateStationStatus(order.id, st, 'delivered'));
                                    }} 
                                    className="flex-grow bg-emerald-600 text-white p-5 rounded-3xl font-black uppercase text-[10px] hover:bg-emerald-500 transition-all shadow-lg"
                                 >
                                    Entregar
                                 </button>
                              </div>
                              <div className="mt-6 flex justify-between items-center px-2">
                                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Status Cocina</span>
                                 <span className={`text-[10px] font-black uppercase italic ${order.status === 'ready' ? 'text-emerald-500' : 'text-amber-500'}`}>{order.status}</span>
                              </div>
                           </div>
                        ))
                     )}
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'collections' && (
            <motion.div key="collections" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
               <div className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
                     <div>
                        <h2 className="text-4xl font-black uppercase italic tracking-tighter">Historial de Cobros</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Registro de recaudación por cajero y estación</p>
                     </div>
                     <div className="flex gap-4 bg-slate-100 p-2 rounded-3xl">
                        {['Todos', 'cash', 'card', 'transfer'].map(m => (
                           <button 
                             key={m} 
                             onClick={() => setSalesFilter(m)} 
                             className={`px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${salesFilter === m ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400'}`}
                           >
                              {m === 'Todos' ? 'Métodos' : m === 'cash' ? 'Efectivo' : m === 'card' ? 'Tarjeta' : 'Transf.'}
                           </button>
                        ))}
                     </div>
                  </div>

                  <div className="overflow-hidden bg-slate-50 rounded-[3rem] border border-slate-100">
                     <table className="w-full text-left border-collapse">
                        <thead>
                           <tr className="bg-slate-950 text-white text-[10px] uppercase font-black tracking-widest">
                              <th className="p-8 border-r border-white/5">Ticket</th>
                              <th className="p-8 border-r border-white/5">Cliente</th>
                              <th className="p-8 border-r border-white/5">Estación</th>
                              <th className="p-8 border-r border-white/5">Método</th>
                              <th className="p-8 border-r border-white/5">Fecha/Hora</th>
                              <th className="p-8 border-r border-white/5 text-right">Monto</th>
                              <th className="p-8 text-right">Acción</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                           {orders
                             .filter(o => o.payment_details)
                             .flatMap(o => Object.entries(o.payment_details).map(([station, details]) => ({ ...details, order: o, station })))
                             .filter(t => salesFilter === 'Todos' || t.method === salesFilter)
                             .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                             .map((tx, idx) => (
                               <tr key={idx} className="hover:bg-white transition-colors group">
                                  <td className="p-8">
                                     <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-slate-400 border border-slate-100 group-hover:border-emerald-500 transition-all">#{tx.order.ticket_number}</div>
                                  </td>
                                  <td className="p-8">
                                     <div className="font-black text-slate-900 uppercase italic tracking-tighter text-lg leading-none">{tx.order.customer_name}</div>
                                  </td>
                                  <td className="p-8">
                                     <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        {tx.station}
                                     </div>
                                  </td>
                                  <td className="p-8">
                                     <div className={`px-4 py-1 rounded-full text-[8px] font-black uppercase inline-flex items-center gap-2 ${tx.method === 'cash' ? 'bg-emerald-50 text-emerald-600' : tx.method === 'card' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                                        {tx.method === 'cash' ? <Banknote size={10} /> : tx.method === 'card' ? <CreditCard size={10} /> : <Landmark size={10} />}
                                        {tx.method}
                                     </div>
                                  </td>
                                  <td className="p-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(tx.timestamp).toLocaleString()}</td>
                                  <td className="p-8 text-right border-r border-slate-100">
                                     <div className="text-2xl font-black font-mono tracking-tighter text-slate-900 underline decoration-slate-200 decoration-2">${tx.order.items?.filter(i => i.station === tx.station).reduce((s, i) => s + (i.price_at_time * i.quantity), 0) || 0}</div>
                                  </td>
                                  <td className="p-8 text-right">
                                     <button onClick={() => { if(confirm("¿Eliminar registro de cobro?")) deletePayment(tx.order.id, tx.station); }} className="p-3 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={20} /></button>
                                  </td>
                               </tr>
                             ))}
                        </tbody>
                     </table>
                     {orders.filter(o => o.paymentDetails).length === 0 && (
                        <div className="p-20 text-center opacity-20 italic font-black uppercase tracking-widest">No hay registros de cobros aún</div>
                     )}
                  </div>
                  
                  <div className="mt-12 flex justify-end gap-12 items-center bg-slate-900 p-8 rounded-[3rem] text-white">
                     <div className="text-right">
                        <p className="text-[10px] font-black uppercase opacity-40">Recaudación Total</p>
                        <p className="text-4xl font-black font-mono tracking-tighter text-emerald-400 shadow-emerald-500/20 shadow-lg">
                           ${orders
                             .filter(o => o.payment_details)
                             .flatMap(o => Object.entries(o.payment_details).map(([station, details]) => ({ ...details, order: o, station })))
                             .filter(t => salesFilter === 'Todos' || t.method === salesFilter)
                             .reduce((sum, t) => sum + (t.order.items?.filter(i => i.station === t.station).reduce((s, i) => s + (i.price_at_time * i.quantity), 0) || 0), 0)
                           }.00
                        </p>
                     </div>
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'inventory' && (
            <motion.div key="inventory" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-[4rem] p-10 border border-slate-100 shadow-sm">
               <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {products.map(p => (
                    <div key={p.id} className="p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex flex-col items-center text-center">
                       <img src={p.image} className="w-24 h-24 rounded-3xl object-cover mb-4 shadow-lg" />
                       <h4 className="font-black text-sm italic uppercase tracking-tighter">{p.name}</h4>
                       <span className="text-[10px] font-bold text-slate-400 uppercase mt-1 px-3 py-1 bg-white rounded-full">{p.station}</span>
                       <div className={`mt-6 text-4xl font-black font-mono tracking-tighter ${p.stock < 10 ? 'text-red-500' : 'text-slate-900'}`}>{p.stock}</div>
                       <div className="text-[10px] font-black uppercase text-slate-400 mt-1">Existencias</div>
                    </div>
                  ))}
               </div>
            </motion.div>
          )}

          {/* ... Other tabs can be similarly styled or kept simple ... */}
          {activeTab === 'shifts' && (
            <motion.div key="shifts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
               <div className="flex justify-between items-center mb-10">
                  <h2 className="text-2xl font-black uppercase italic tracking-tighter">Historial de Cuadres</h2>
                  <div className="bg-slate-100 px-4 py-2 rounded-2xl text-[10px] font-black text-slate-400">{shifts.length} REGISTROS</div>
               </div>
               
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                     <thead>
                        <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                           <th className="pb-6 px-4">Estación</th>
                           <th className="pb-6 px-4">Fecha/Hora Cerrado</th>
                           <th className="pb-6 px-4">Esperado (Cash)</th>
                           <th className="pb-6 px-4">Reportado</th>
                           <th className="pb-6 px-4 text-center">Diferencia</th>
                           <th className="pb-6 px-4 text-right">Acción</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50 font-bold text-sm">
                        {shifts.map(shift => (
                           <tr key={shift.id} className="group hover:bg-slate-50/50 transition-colors">
                              <td className="py-6 px-4 font-black italic uppercase text-emerald-600">{shift.station}</td>
                              <td className="py-6 px-4 text-slate-400">{new Date(shift.timestamp).toLocaleString()}</td>
                              <td className="py-6 px-4 font-mono font-black text-slate-900">${shift.payment_breakdown?.cash || 0}</td>
                              <td className="py-6 px-4 font-mono font-black text-slate-900">${shift.actual_cash}</td>
                              <td className="py-6 px-4 text-center">
                                 <span className={`px-3 py-1 rounded-full font-black font-mono text-xs ${shift.difference === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                    ${shift.difference}
                                 </span>
                              </td>
                              <td className="py-6 px-4 text-right">
                                 <button onClick={() => { if(confirm("¿Eliminar registro de cuadre?")) deleteShift(shift.id); }} className="p-3 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={20} /></button>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </motion.div>
          )}
          
          {activeTab === 'users' && (
            <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {users.map(user => (
                  <div key={user.id} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm relative group overflow-hidden">
                     <button onClick={() => deleteUser(user.id)} className="absolute top-6 right-6 text-slate-300 hover:text-red-500 transition-colors z-10"><Trash2 size={24} /></button>
                     <div className="flex items-center gap-5 mb-6">
                        <div className="w-16 h-16 bg-slate-900 text-white rounded-3xl flex items-center justify-center"><Users size={32} /></div>
                        <div>
                           <h3 className="text-xl font-black uppercase italic tracking-tighter">{user.name}</h3>
                           <p className="text-[10px] font-black text-slate-400 uppercase">{user.role} {user.station && `• ${user.station}`}</p>
                        </div>
                     </div>
                     <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase">PIN</span>
                        <span className="font-mono text-2xl font-black text-emerald-600 tracking-[0.3em]">{user.pin}</span>
                     </div>
                  </div>
               ))}
            </motion.div>
          )}

          {activeTab === 'inventory' && (
            <motion.div key="inventory" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
               <div className="bg-white p-6 sm:p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
                     <div>
                        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-emerald-600">Control de Inventario</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Gestión de existencias y costos</p>
                     </div>
                     <div className="bg-amber-50 text-amber-600 px-6 py-3 rounded-2xl text-[10px] font-black uppercase border border-amber-100 italic">
                        {lowStockProducts.length} Alertas de Stock Bajo
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                     {products.map(product => (
                        <div key={product.id} className={`p-6 rounded-[2.5rem] border transition-all ${product.stock < 10 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                           <div className="flex gap-4 mb-6">
                              <img src={product.image} className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-sm" />
                              <div className="flex-grow min-w-0">
                                 <h4 className="font-black text-slate-900 uppercase truncate leading-none mb-1">{product.name}</h4>
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{product.station}</p>
                              </div>
                           </div>
                           
                           <div className="grid grid-cols-2 gap-4 mb-6">
                              <div className="bg-white/50 p-4 rounded-2xl">
                                 <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Precio Venta</label>
                                 <span className="text-lg font-black font-mono">${product.price}</span>
                              </div>
                              <div className="bg-white/50 p-4 rounded-2xl">
                                 <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Costo Unit.</label>
                                 <span className="text-lg font-black font-mono text-slate-400">${product.cost}</span>
                              </div>
                           </div>

                           <div className="bg-white p-4 rounded-3xl border border-slate-100 flex items-center justify-between">
                              <div>
                                 <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Stock Actual</label>
                                 <span className={`text-2xl font-black font-mono ${product.stock < 10 ? 'text-red-500' : 'text-slate-900'}`}>{product.stock}</span>
                              </div>
                              <div className="flex gap-2">
                                 <button onClick={() => updateProduct(product.id, { stock: Math.max(0, (Number(product.stock)||0) - 1) })} className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black">-</button>
                                 <button onClick={() => updateProduct(product.id, { stock: (Number(product.stock)||0) + 1 })} className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-black">+</button>
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
               <div className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-4 mb-10">
                     <div className="w-3 h-12 bg-emerald-500 rounded-full" />
                     <div>
                        <h2 className="text-3xl font-black uppercase italic tracking-tighter">Configuración de Impresoras</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Vínculo independiente para estaciones de trabajo</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     {Object.entries(printerConfig).map(([station, config]) => (
                        <div key={station} className="bg-slate-50 p-8 rounded-[3rem] border border-slate-100 group hover:border-emerald-500/30 transition-all">
                           <div className="flex justify-between items-start mb-6">
                              <div>
                                 <h4 className="font-black text-xl italic uppercase tracking-tighter text-slate-900">{station}</h4>
                                 <div className="flex items-center gap-2 mt-1">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Estado: Activo</span>
                                 </div>
                              </div>
                              <Printer className="text-slate-200 group-hover:text-emerald-500 transition-colors" size={32} />
                           </div>

                           <div className="space-y-6">
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black text-slate-400 ml-4 uppercase">Nombre / Alias de Impresora</label>
                                 <input 
                                    type="text" 
                                    value={config.name} 
                                    onChange={e => updatePrinterConfig(station, { name: e.target.value })}
                                    placeholder="Ej: Epson TM-T20II..."
                                    className="w-full bg-white p-5 rounded-2xl font-bold border border-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none" 
                                 />
                              </div>

                              <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-100">
                                 <div>
                                    <p className="font-black text-xs uppercase tracking-tight text-slate-700">Auto-Imprimir</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Imprimir ticket al marcar listo</p>
                                 </div>
                                 <button 
                                    onClick={() => updatePrinterConfig(station, { autoPrint: !config.autoPrint })}
                                    className={`w-14 h-8 rounded-full transition-all relative ${config.autoPrint ? 'bg-emerald-500' : 'bg-slate-200'}`}
                                 >
                                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${config.autoPrint ? 'right-1' : 'left-1'}`} />
                                 </button>
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>

                  <div className="mt-12 p-8 bg-amber-50 rounded-[3rem] border border-amber-100 flex items-start gap-6">
                     <AlertCircle className="text-amber-500 shrink-0" size={24} />
                     <div>
                        <p className="font-black text-sm uppercase text-amber-900 tracking-tight">Nota sobre Impresión Web</p>
                        <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mt-1 leading-relaxed">
                           Debido a restricciones de seguridad del navegador, la impresión física requiere confirmar el diálogo de impresión. 
                           Asegúrate de configurar cada impresora como la predeterminada en su estación de trabajo correspondiente.
                        </p>
                     </div>
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Payment Confirmation Modal */}
      <AnimatePresence>
         {paymentOrder && (
            <>
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPaymentOrder(null)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[500]" />
               <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white p-12 rounded-[4.5rem] shadow-2xl z-[501] border border-slate-100">
                  <div className="flex justify-between items-center mb-8">
                     <h2 className="text-3xl font-black uppercase italic tracking-tighter">Cobrar Pedido</h2>
                     <button onClick={() => setPaymentOrder(null)} className="p-3 bg-slate-100 rounded-2xl text-slate-400"><X size={24} /></button>
                  </div>
                  <div className="bg-slate-950 text-white p-8 rounded-[3rem] mb-8 relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-bl-full" />
                     <p className="text-[10px] uppercase font-black opacity-40 mb-1">Monto a Recaudar ({paymentStation})</p>
                     <div className="text-5xl font-black font-mono tracking-tighter text-emerald-400 shadow-emerald-500/20 underline underline-offset-8 decoration-4">${paymentOrder.items?.filter(i => i.station === paymentStation).reduce((sum, i) => sum + (i.price_at_time * i.quantity), 0) || 0}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-8">
                     {[
                        { id: 'cash', label: 'Efectivo', icon: Banknote },
                        { id: 'card', label: 'Tarjeta', icon: CreditCard },
                        { id: 'transfer', label: 'Transf.', icon: Landmark }
                     ].map(m => (
                        <button key={m.id} onClick={() => setPaymentMethod(m.id)} className={`p-5 rounded-3xl border-2 transition-all flex flex-col items-center gap-2 ${paymentMethod === m.id ? 'bg-emerald-600 border-emerald-500 text-white shadow-xl scale-105' : 'bg-white border-slate-100 text-slate-400'}`}>
                           <div className="flex items-center gap-3 mb-2">
                             <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">#{paymentOrder.ticket_number}</span>
                             {paymentOrder.is_paid && (
                               <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">PAGADO</span>
                             )}
                           </div>
                           <m.icon size={28} />
                           <span className="text-[8px] font-black uppercase tracking-widest">{m.label}</span>
                        </button>
                     ))}
                  </div>
                  {paymentMethod === 'cash' && (
                     <div className="mb-8 space-y-4">
                        <label className="text-[10px] font-black text-slate-400 ml-4">RECIBO EN EFECTIVO</label>
                        <input type="number" value={amountReceived} onChange={e => setAmountReceived(e.target.value)} className="w-full bg-slate-50 p-6 rounded-3xl text-center text-5xl font-black font-mono shadow-inner outline-none focus:ring-4 focus:ring-emerald-500/10" placeholder="0" />
                     </div>
                  )}
                  <button onClick={handleFinalizePayment} className="w-full bg-slate-900 text-white py-6 rounded-[2.5rem] font-black text-xl hover:bg-emerald-600 transition-all uppercase tracking-widest shadow-2xl">Confirmar Registro</button>
               </motion.div>
            </>
         )}
      </AnimatePresence>

      {/* Invoice Preview Modal */}
      <AnimatePresence>
         {selectedInvoice && (
            <>
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedInvoice(null)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[600]" />
               <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed bottom-0 left-0 right-0 h-[92vh] bg-slate-50/50 rounded-t-[5rem] z-[601] p-12 flex flex-col items-center shadow-2xl max-w-5xl mx-auto overflow-hidden">
                  <div className="w-20 h-1.5 bg-slate-300 rounded-full mb-10 flex-shrink-0" />
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 w-full max-w-[440px]">
                     <button 
                        onClick={handlePrint}
                        className="flex flex-col items-center justify-center gap-2 p-6 bg-white border border-slate-100 text-slate-900 rounded-[2rem] font-black uppercase text-[10px] shadow-lg hover:shadow-xl transition-all"
                     >
                        <Printer size={20} />
                        <span>TICKET</span>
                     </button>
                     <button 
                        onClick={handlePrint}
                        className="flex flex-col items-center justify-center gap-2 p-6 bg-[#C29F5C] text-white rounded-[2rem] font-black uppercase text-[10px] shadow-lg hover:opacity-90 transition-all"
                     >
                        <FileText size={20} />
                        <span>PDF</span>
                     </button>
                     <button 
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

                  <div className="flex-grow w-full overflow-y-auto flex justify-center pb-20 custom-scrollbar rounded-[3rem]">
                     <div className="max-w-[210mm] mx-auto">
                        <Receipt order={selectedInvoice} />
                     </div>
                  </div>
               </motion.div>
            </>
         )}
      </AnimatePresence>

      {/* Edit Order Modal */}
      <AnimatePresence>
         {isEditingOrder && (
            <>
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditingOrder(null)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[700]" />
                <motion.div initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto bg-white p-12 rounded-[4rem] shadow-2xl z-[701] border border-slate-100 scrollbar-hide">
                   <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-8">Editar Pedido #{isEditingOrder.ticket_number}</h2>
                   <div className="space-y-6">
                      <div className="space-y-2">
                         <label className="text-xs font-black text-slate-400 ml-2 uppercase">Nombre del Cliente</label>
                         <input type="text" value={isEditingOrder.customer_name} onChange={e => setIsEditingOrder({...isEditingOrder, customer_name: e.target.value})} className="w-full bg-slate-50 p-5 rounded-2xl font-black text-xl border border-slate-100" />
                      </div>
                     <div className="flex gap-4">
                        <button onClick={() => setIsEditingOrder(null)} className="flex-grow py-5 bg-slate-100 rounded-2xl font-black text-slate-400">CANCELAR</button>
                        <button onClick={() => { updateOrder(isEditingOrder.id, isEditingOrder); setIsEditingOrder(null); }} className="flex-grow py-5 bg-emerald-600 text-white rounded-2xl font-black shadow-xl">GUARDAR CAMBIOS</button>
                     </div>
                  </div>
               </motion.div>
            </>
         )}
      </AnimatePresence>

      {/* Base Management Modals */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200]" />
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-[4rem] p-12 z-[201] shadow-2xl ring-1 ring-slate-200 scrollbar-hide">
               <h2 className="text-3xl font-black italic mb-10 uppercase tracking-tighter">Gestionar Producto</h2>
               <form onSubmit={handleAddProduct} className="space-y-6">
                  <input required placeholder="Nombre..." value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full bg-slate-50 p-5 rounded-2xl font-bold" />
                  <textarea placeholder="Descripción..." value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className="w-full bg-slate-50 p-5 rounded-2xl font-bold h-32" />
                  <div className="grid grid-cols-2 gap-4">
                     <input type="number" required placeholder="Precio" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="w-full bg-slate-50 p-5 rounded-2xl font-black font-mono" />
                     <input type="number" required placeholder="Costo" value={newProduct.cost} onChange={e => setNewProduct({...newProduct, cost: e.target.value})} className="w-full bg-slate-50 p-5 rounded-2xl font-black font-mono opacity-60" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <select value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="bg-slate-50 p-5 rounded-2xl font-bold">
                       <option>Burgers</option><option>Complementos</option><option>Bebidas</option><option>Postres</option>
                    </select>
                    <select value={newProduct.station} onChange={e => setNewProduct({...newProduct, station: e.target.value})} className="bg-slate-50 p-5 rounded-2xl font-black uppercase text-[10px]">
                       <option value="COMIDA RÁPIDA">Comida Rápida</option>
                       <option value="BAR">Bar / Bebidas</option>
                       <option value="DULCES/POSTRES">Postres / Dulces</option>
                    </select>
                  </div>
                  <div className="space-y-4">
                     <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Foto del Producto</label>
                     <div className="flex items-center gap-4">
                        <img src={newProduct.image} className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-100" />
                        <label className="flex-grow bg-slate-100 p-5 rounded-2xl border-2 border-dashed border-slate-200 cursor-pointer hover:bg-slate-200 transition-all flex items-center justify-center gap-2">
                           <Plus size={20} className="text-slate-400" />
                           <span className="text-[10px] font-black uppercase text-slate-500">Subir Imagen</span>
                           <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        </label>
                     </div>
                  </div>
                  <input type="number" required placeholder="Stock Inicial" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: e.target.value})} className="w-full bg-slate-50 p-5 rounded-2xl font-bold" />
                  <button type="submit" className="w-full bg-emerald-600 text-white py-6 rounded-3xl font-black text-xl shadow-xl hover:bg-emerald-500 transition-all uppercase tracking-widest">Guardar Producto</button>
               </form>
            </motion.div>
          </>
        )}
        
        {isUserModalOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsUserModalOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200]" />
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-[4rem] p-12 z-[201] shadow-2xl scrollbar-hide">
               <h2 className="text-3xl font-black italic mb-8 uppercase italic underline decoration-wavy">Nuevo Acceso</h2>
               <form onSubmit={handleAddUser} className="space-y-6">
                  <div className="space-y-2">
                     <label className="text-xs font-black uppercase text-slate-400 ml-2 tracking-widest leading-none">Nombre Colaborador</label>
                     <input required value={userData.name} onChange={e => setUserData({...userData, name: e.target.value})} className="w-full bg-slate-50 p-5 rounded-2xl font-bold border border-slate-100" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-slate-400 ml-2">Rol</label>
                        <select value={userData.role} onChange={e => setUserData({...userData, role: e.target.value})} className="w-full bg-slate-50 p-5 rounded-2xl font-bold">
                           <option value="admin">Admin</option>
                           <option value="catalogo">Catalogo</option>
                           <option value="vendedor">Vendedor</option>
                        </select>
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-slate-400 ml-2">PIN</label>
                        <input required maxLength="4" value={userData.pin} onChange={e => setUserData({...userData, pin: e.target.value})} className="w-full bg-slate-50 p-5 rounded-2xl font-black font-mono tracking-[0.4em] text-emerald-600" />
                     </div>
                  </div>
                  {userData.role === 'vendedor' && (
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase text-slate-400 ml-2 italic">Estación</label>
                      <select value={userData.station} onChange={e => setUserData({...userData, station: e.target.value})} className="w-full bg-slate-50 p-5 rounded-2xl font-black uppercase text-[10px]">
                         <option value="BAR">Bar</option>
                         <option value="COMIDA RÁPIDA">Comida Rápida</option>
                         <option value="DULCES/POSTRES">Postres / Dulces</option>
                         <option value="CAJA">Caja</option>
                      </select>
                    </div>
                  )}
                  <button type="submit" className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black text-xl hover:bg-emerald-600 transition-all shadow-xl uppercase">Generar Credencial</button>
               </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPanel;
