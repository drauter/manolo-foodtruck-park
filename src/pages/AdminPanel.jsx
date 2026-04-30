import React, { useState, useEffect, useMemo } from 'react';
import { useOrder } from '../context/OrderContext';
import {
   Plus, Edit2, Trash2, DollarSign, Package, TrendingUp,
   AlertCircle, ArrowUpRight, ArrowDownRight,
   Layers, X, Save, LogOut, Users, FileText, Filter, CheckCircle2, CheckCircle,
   ShoppingCart, Wallet, Banknote, CreditCard, Landmark, Search, ChevronRight, Printer, RotateCcw, Settings, Volume2, Coffee,
   BarChart3, PieChart as PieIcon, LineChart as LineIcon, Calendar, Clock, Info, Shield
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { STATIONS, STATION_LABELS, STATION_COLORS, getStationDisplay } from '../utils/constants';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import Receipt from '../components/Receipt';
import { printReceipt } from '../utils/printUtils';

// Main Admin Panel Component for Foodtruck Management
const AdminPanel = () => {
   const { products, addProduct, updateProduct, deleteProduct, uploadProductImage, orders, updateStationStatus, updateOrder, cancelOrder, deleteOrder, deletePayment, resetSystem, currentUser, logout, shifts, deleteShift, users, addUser, deleteUser, updateUser, addToCart, cart, removeFromCart, clearCart, placeOrder, printerConfig, updatePrinterConfig, voices, selectedVoice, setSelectedVoice, verifyAdminPin } = useOrder();
   const [activeTab, setActiveTab] = useState('dashboard');
   const [isModalOpen, setIsModalOpen] = useState(false);

   // Local pending voice for settings UI
   const [pendingVoice, setPendingVoice] = useState(selectedVoice);
   const [saveSuccess, setSaveSuccess] = useState(false);

   // Sync pending voice when selectedVoice changes (e.g. on load)
   useEffect(() => {
      setPendingVoice(selectedVoice);
   }, [selectedVoice]);

   const handleTestVoice = () => {
      const msg = new SpeechSynthesisUtterance("Esta es una prueba de voz para Manolo Food and Drinks Truck Park.");
      msg.lang = 'es-ES';
      const voice = voices.find(v => v.voiceURI === pendingVoice);
      if (voice) msg.voice = voice;
      window.speechSynthesis.speak(msg);
   };

   const handleSaveVoice = () => {
      setSelectedVoice(pendingVoice);
      localStorage.setItem('preferredVoice', pendingVoice);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
   };

   const [isUserModalOpen, setIsUserModalOpen] = useState(false);
   const [isEditingUser, setIsEditingUser] = useState(false);
   const [editingUser, setEditingUser] = useState(null);
   const [reportPeriod, setReportPeriod] = useState('Hoy'); // 'Hoy', 'Semana', 'Mes', 'Todo'
   const [searchQuery, setSearchQuery] = useState('');


   // Local state for Admin POS
   const [customerName, setCustomerName] = useState('');
   const [orderNotes, setOrderNotes] = useState('');
   const [isUploading, setIsUploading] = useState(false);
   const [isEditingProduct, setIsEditingProduct] = useState(false);
   const [editingProduct, setEditingProduct] = useState(null);

   // Payment Modal States
   const [paymentOrder, setPaymentOrder] = useState(null);
   const [paymentStation, setPaymentStation] = useState(null);
   const [paymentMethod, setPaymentMethod] = useState('cash');
   const [amountReceived, setAmountReceived] = useState('');

   // Invoice/Receipt States
   const [selectedInvoice, setSelectedInvoice] = useState(null);
   const [selectedCheckoutStation, setSelectedCheckoutStation] = useState('TODAS');
   const [selectedCollectionsStation, setSelectedCollectionsStation] = useState('TODAS');
   const [salesFilter, setSalesFilter] = useState('Todos');
   const [analyticsPeriod, setAnalyticsPeriod] = useState('7days'); // 'day', '7days', 'month'

   const [isEditingOrder, setIsEditingOrder] = useState(null);

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
      if (currentUser?.role === 'admin') {
         action();
         return;
      }
      setAuthAction(() => action);
      setIsAuthModalOpen(true);
   };

   const navigate = useNavigate();

   // Auto-print effect removed to prevent multiple prints. Printing must be manual.



   const [newProduct, setNewProduct] = useState({
      name: '', description: '', price: '', cost: '', stock: '', category: 'Burgers',
      station: 'COMIDA RAPIDA', image_url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=300'
   });

   const handleImageUpload = async (e) => {
      const file = e.target.files[0];
      if (file) {
         setIsUploading(true);
         const publicUrl = await uploadProductImage(file);
         setIsUploading(false);

         if (publicUrl) {
            if (isEditingProduct) {
               setEditingProduct(prev => ({ ...prev, image_url: publicUrl }));
            } else {
               setNewProduct(prev => ({ ...prev, image_url: publicUrl }));
            }
         } else {
            alert("Error al subir la imagen. Por favor, intente de nuevo o verifique su conexión.");
         }
      }
   };

   const [userData, setUserData] = useState({ name: '', role: 'vendedor', station: 'BAR', pin: '' });

   // Stats calculation
   const deliveredOrders = orders.filter(o => o.status !== 'cancelled' && (o.status === 'delivered' || (o.station_statuses && Object.values(o.station_statuses).some(s => s === 'delivered'))));
   const filteredSalesOrders = deliveredOrders.filter(o => salesFilter === 'Todas' || o.items?.some(i => i.station === salesFilter));

   const totalSales = filteredSalesOrders.reduce((acc, o) => {
      if (salesFilter === 'Todas') {
         return acc + (o.items?.reduce((sum, i) => o.station_statuses?.[i.station] === 'delivered' ? sum + ((Number(i.price_at_time) || 0) * (Number(i.quantity) || 0)) : sum, 0) || 0);
      }
      return acc + (o.items?.filter(i => i.station === salesFilter && o.station_statuses?.[i.station] === 'delivered').reduce((sum, i) => sum + ((Number(i.price_at_time) || 0) * (Number(i.quantity) || 0)), 0) || 0);
   }, 0);

   const totalCost = filteredSalesOrders.reduce((acc, o) => {
      if (salesFilter === 'Todas') {
         return acc + (o.items?.reduce((sum, i) => o.station_statuses?.[i.station] === 'delivered' ? sum + ((Number(i.cost_at_time) || 0) * (Number(i.quantity) || 0)) : sum, 0) || 0);
      }
      return acc + (o.items?.filter(i => i.station === salesFilter && o.station_statuses?.[i.station] === 'delivered').reduce((sum, i) => sum + ((Number(i.cost_at_time) || 0) * (Number(i.quantity) || 0)), 0) || 0);
   }, 0);
   const totalProfit = totalSales - totalCost;

    // Advanced Analytics Calculations
    const analyticsData = useMemo(() => {
      const now = new Date();
      const periods = {
        day: 1,
        '7days': 7,
        month: 30
      };
      const days = periods[analyticsPeriod] || 7;

      // 1. Sales Trend
      const trendDays = [...Array(days)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1 - i));
        return d.toLocaleDateString();
      });

      const trend = trendDays.map(date => {
        const dayOrders = orders.filter(o => o.status !== 'cancelled' && new Date(o.timestamp).toLocaleDateString() === date);
        const total = dayOrders.reduce((s, o) => s + (Number(o.total_price) || 0), 0);
        return { name: date.split('/')[0] + '/' + date.split('/')[1], ventas: total };
      });

      // 2. Inventory Distribution (By Station)
      const stationDist = Object.values(STATIONS).map(st => ({
        name: STATION_LABELS[st] || st,
        value: products.filter(p => p.station === st).reduce((acc, p) => acc + (Number(p.stock) * Number(p.price)), 0)
      })).filter(s => s.value > 0);

      // 3. Projections
      // Average sales per day (based on selected period)
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - days);
      const recentOrders = orders.filter(o => o.status !== 'cancelled' && new Date(o.timestamp) > periodStart);
      
      const productPerformance = products.map(p => {
        const unitsSold = recentOrders.reduce((sum, o) => {
          const item = o.items?.find(i => i.id === p.id);
          return sum + (Number(item?.quantity) || 0);
        }, 0);
        
        const avgDailySales = unitsSold / days;
        const daysRemaining = avgDailySales > 0 ? Math.floor(Number(p.stock) / avgDailySales) : Infinity;
        
        return {
          ...p,
          avgDailySales,
          daysRemaining,
          potentialProfit: (Number(p.price) - Number(p.cost)) * Number(p.stock)
        };
      });

      return { trend, stationDist, productPerformance };
    }, [orders, products, analyticsPeriod]);


   const lowStockProducts = products.filter(p => p.stock < 10);

   const handleSaveProduct = async (e) => {
      if (e) e.preventDefault();
      const productData = isEditingProduct ? editingProduct : newProduct;
      const formattedData = {
         ...productData,
         price: Number(productData.price) || 0,
         cost: Number(productData.cost) || 0,
         stock: Number(productData.stock) || 0
      };

      if (isEditingProduct) {
         await updateProduct(editingProduct.id, formattedData);
      } else {
         await addProduct(formattedData);
      }

      setIsModalOpen(false);
      setIsEditingProduct(false);
      setEditingProduct(null);
      setNewProduct({
         name: '', description: '', price: '', cost: '', stock: '', category: 'Burgers',
         station: 'COMIDA RAPIDA', image_url: '/burger.png'
      });
   };

   const handleAddUser = async (e) => {
      e.preventDefault();
      if (isEditingUser && editingUser) {
         await updateUser(editingUser.id, userData);
      } else {
         await addUser(userData);
      }
      setIsUserModalOpen(false);
      setIsEditingUser(false);
      setEditingUser(null);
      setUserData({ name: '', role: 'vendedor', station: 'BAR', pin: '' });
   };

   const handleAdminPlaceOrder = async (directPay = false) => {
      if (!customerName.trim()) return alert("Ingresa nombre de cliente");
      const order = await placeOrder(customerName.trim(), 'pos', orderNotes);
      if (order) {
         if (directPay) {
            setPaymentOrder(order);
            setPaymentStation(Object.keys(order.station_statuses)[0]);
         } else {
            setSelectedInvoice(order);
         }
         setCustomerName('');
         setOrderNotes('');
         clearCart();
      }
   };

   const exportToExcel = () => {
      const wb = XLSX.utils.book_new();
      const now = new Date();
      let startDate = new Date(0);
      if (reportPeriod === 'Hoy') startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      else if (reportPeriod === 'Semana') startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      else if (reportPeriod === 'Mes') startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

      const filteredOrders = reportPeriod === 'Todo' ? orders : orders.filter(o => new Date(o.timestamp) >= startDate);
       // 1. Analytics & Projections
       const analyticsSummary = analyticsData.productPerformance.map(p => ({
          Producto: p.name,
          Estacion: p.station,
          Stock: p.stock,
          Ventas_Dia_Prom: p.avgDailySales.toFixed(2),
          Dias_Restantes: p.daysRemaining === Infinity ? 'N/A' : p.daysRemaining,
          Ganancia_Potencial: p.potentialProfit,
          Inversion: Number(p.cost) * Number(p.stock)
       }));
       XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(analyticsSummary), "Analítica");

       // 2. Detailed Sales
       const salesData = filteredOrders.map(o => ({
          Ticket: o.ticket_number,
          Cliente: o.customer_name,
          Fecha: new Date(o.timestamp).toLocaleString(),
          Total: o.total_price,
          Estado: o.status,
          Pagado: o.is_paid ? 'SI' : 'NO'
       }));
       XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(salesData), "Ventas");

       // 3. Inventory by Station
       Object.values(STATIONS).filter(s => s !== 'CAJA').forEach(station => {
          const stationProducts = products.filter(p => p.station === station);
          const invData = stationProducts.map(p => {
             const price = Number(p.price) || 0;
             const cost = Number(p.cost) || 0;
             const stock = Number(p.stock) || 0;
             const performance = analyticsData.productPerformance.find(pp => pp.id === p.id);
             return {
                Nombre: p.name,
                Precio: price,
                Costo: cost,
                Stock: stock,
                Valor_Venta: price * stock,
                Ganancia_Proyectada: (price - cost) * stock,
                Proyeccion_Agotamiento: performance?.daysRemaining === Infinity ? 'Sin ventas' : `${performance?.daysRemaining} días`,
                Estado: stock < 10 ? 'STOCK BAJO' : 'OK'
             };
          });

          const totalValue = invData.reduce((sum, item) => sum + item.Valor_Venta, 0);
          const totalProfit = invData.reduce((sum, item) => sum + item.Ganancia_Proyectada, 0);
          invData.push({ Nombre: 'TOTAL ESTACION', Precio: '', Costo: '', Stock: '', Valor_Venta: totalValue, Ganancia_Proyectada: totalProfit, Estado: '' });

          const wsInv = XLSX.utils.json_to_sheet(invData);
          const sanitizedName = (STATION_LABELS[station] || station).replace(/[:\\/?*[\]]/g, '_').substring(0, 31);
          XLSX.utils.book_append_sheet(wb, wsInv, sanitizedName);
       });

       // 4. Shifts
       const shiftData = shifts.map(s => ({ 
          Estación: s.station, 
          Fecha: new Date(s.timestamp).toLocaleString(), 
          Esperado: s.expected_cash || s.expected_sales, 
          Real: s.actual_cash, 
          Diferencia: s.difference,
          Justificacion: s.note || '-',
          Autorizado_Por: s.authorized_by || '-'
       }));
       XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(shiftData), "Turnos");

       XLSX.writeFile(wb, `Reporte_Avanzado_Manolo_${new Date().toISOString().split('T')[0]}.xlsx`);

   };

   const handleFinalizePayment = () => {
      if (paymentMethod === 'cash' && (!amountReceived || Number(amountReceived) <= 0)) {
         return alert("El campo de dinero está vacío o es inválido.");
      }

      const amountToPay = paymentOrder.items?.filter(i => i.station === paymentStation).reduce((sum, i) => sum + ((Number(i.price_at_time) || 0) * (Number(i.quantity) || 0)), 0) || 0;
      const received = Number(amountReceived) || amountToPay;
      const paymentData = {
         method: paymentMethod,
         received: received,
         change: received - amountToPay,
         timestamp: new Date().toISOString()
      };

      const currentStatus = paymentOrder.station_statuses?.[paymentStation] || 'received';
      updateStationStatus(paymentOrder.id, paymentStation, currentStatus, paymentData);

      // Auto-show invoice after payment
      const updatedOrder = { ...paymentOrder, is_paid: true }; // Simplified for the preview

      setSelectedInvoice(updatedOrder);

      setPaymentOrder(null);
      setPaymentStation(null);
      setAmountReceived('');
   };

   const handleWhatsAppShare = (order) => {
      if (!order) return;
      const itemsText = (order.items || []).map(i => `${i.quantity} x ${i.products?.name || i.product?.name || 'Producto'}`).join('\n');
      const text = `🍔 *MANOLO FOOD AND DRINKS TRUCK PARK* 🍔\n---------------------------\n*Ticket:* #${order.ticket_number}\n*Cliente:* ${order.customer_name?.toUpperCase()}\n---------------------------\n${itemsText}\n---------------------------\n*TOTAL: RD$ ${order.total_price}.00*\n\n¡Gracias por preferirnos!`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
   };

    const handlePrint = (id = 'printable-invoice') => {
       printReceipt(id);
    };

   const menuItems = [
      { id: 'dashboard', label: 'Ventas', icon: TrendingUp, roles: ['admin', 'contador'] },
      { id: 'pos', label: 'Ventas (POS)', icon: ShoppingCart, roles: ['admin'] },
      { id: 'analytics', label: 'Analítica', icon: BarChart3, roles: ['admin', 'contador'] },
      { id: 'checkout', label: 'Entrega / Caja', icon: Package, roles: ['admin'] },
      { id: 'history', label: 'Historial / Fact.', icon: FileText, roles: ['admin', 'contador'] },
      { id: 'products', label: 'Catalogo', icon: Package, roles: ['admin', 'catalogo'] },
      { id: 'inventory', label: 'Inventario', icon: Layers, roles: ['admin', 'catalogo', 'contador'] },
      { id: 'shifts', label: 'Turnos', icon: Filter, roles: ['admin'] },
      { id: 'users', label: 'Usuarios', icon: Users, roles: ['admin'] },
      { id: 'settings', label: 'Configuración', icon: Settings, roles: ['admin'] },
   ].filter(item => !item.roles || item.roles.includes(currentUser?.role));
   // Local Receipt component removed - using shared one from components/Receipt

   if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'catalogo' && currentUser.role !== 'contador')) {
      return (
         <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle size={64} className="text-red-500 mb-6" />
            <h1 className="text-4xl font-black text-white mb-2">ACCESO RESTRINGIDO</h1>
            <button onClick={() => navigate('/login')} className="bg-emerald-600 px-8 py-4 rounded-2xl font-black uppercase mt-8 text-white">Ir al Login</button>
         </div>
      );
   }

   return (
      <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans overflow-x-hidden no-print">
         {/* Sidebar - Desktop */}
         <aside className="hidden lg:flex w-72 bg-slate-900 text-white p-6 flex-col gap-8 sticky top-0 h-screen overflow-y-auto z-50">
            <div className="flex flex-col items-center gap-4">
               <img src="/logo.jpg" alt="Logo" className="w-24 h-24 object-contain rounded-2xl shadow-2xl border border-white/5" />
               <div className="text-xl font-black italic text-emerald-500 tracking-tighter uppercase leading-none text-center">Manolo <br/><span className="text-white text-xs">FOOD AND DRINKS Truck Park</span></div>
            </div>
            <nav className="space-y-1 flex-grow">
               {menuItems.map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                     className={`w-full text-left p-4 rounded-2xl flex items-center gap-3 transition-all ${activeTab === tab.id ? 'bg-emerald-600 shadow-lg text-white' : 'hover:bg-slate-800 text-slate-400'}`}
                  >
                     <tab.icon size={18} /> <span className="font-bold text-sm tracking-tight">{tab.label}</span>
                  </button>
               ))}
            </nav>
            <div className="border-t border-white/10 pt-6 space-y-2 mt-auto">
               <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-4 mb-2">Vistas Externas</p>
               <button onClick={() => window.open('/display', '_blank')} className="w-full text-left p-4 rounded-2xl flex items-center gap-3 hover:bg-slate-800 text-slate-400 transition-all">
                  <TrendingUp size={18} /> <span className="font-bold text-sm tracking-tight text-white/50">Pantalla Pública</span>
               </button>
               <button onClick={() => window.open('/menu', '_blank')} className="w-full text-left p-4 rounded-2xl flex items-center gap-3 hover:bg-slate-800 text-slate-400 transition-all">
                  <Coffee size={18} /> <span className="font-bold text-sm tracking-tight text-white/50">Menú Digital</span>
               </button>
               <button onClick={() => window.open('/pos', '_blank')} className="w-full text-left p-4 rounded-2xl flex items-center gap-3 hover:bg-slate-800 text-slate-400 transition-all">
                  <ShoppingCart size={18} /> <span className="font-bold text-sm tracking-tight text-white/50">Caja / POS</span>
               </button>
            </div>
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

         <main className="flex-grow p-4 sm:p-8 overflow-y-auto bg-slate-50">
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
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
                        {products.map(product => (
                           <div key={product.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col gap-4 group">
                              <div className="flex gap-4 items-start">
                                 <img src={product.image_url} className="w-20 h-20 rounded-2xl object-cover shadow-md" />
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
                                 <button onClick={() => {
                                    requireAdminAuth(() => {
                                       if (confirm("¿Eliminar producto?")) deleteProduct(product.id);
                                    });
                                 }} className="bg-red-50 text-red-500 p-3 rounded-xl font-black uppercase text-[9px] hover:bg-red-500 hover:text-white transition-all border border-red-100">Eliminar</button>
                              </div>
                           </div>
                        ))}
                     </div>
                  </motion.div>
               )}

               {activeTab === 'dashboard' && (
                  <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                        {[
                           { label: 'Ventas Totales', value: `$${totalSales}`, icon: DollarSign, color: 'text-emerald-500' },
                           { label: 'Costo Insumos', value: `$${totalCost}`, icon: Package, color: 'text-slate-400' },
                           { label: 'Ganancia Neta', value: `$${totalProfit}`, icon: TrendingUp, color: 'text-blue-500' },
                           { label: 'Stock Bajo', value: lowStockProducts.length, icon: AlertCircle, color: 'text-amber-500' },
                        ].map((stat, i) => (
                           <div key={i} className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                              <div className={`p-2 rounded-xl bg-slate-50 ${stat.color} w-fit`}><stat.icon size={18} /></div>
                              <div className="mt-3">
                                 <div className="text-slate-400 text-[8px] sm:text-[10px] font-black uppercase tracking-widest leading-none">{stat.label}</div>
                                 <div className="text-xl sm:text-2xl font-black mt-1 text-slate-900 tracking-tighter">{stat.value}</div>
                              </div>
                           </div>
                        ))}
                     </div>

                     {/* Station Pending Summary */}
                     <div className="bg-slate-950 p-8 rounded-[3rem] border border-slate-800 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-32 -mt-32" />
                        <div className="flex items-center gap-4 mb-8 relative z-10">
                           <div className="w-10 h-1bg-emerald-500 rounded-full" />
                           <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">Pendientes por Estación</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative z-10">
                           {['BAR', 'COMIDA RAPIDA', 'DULCES/POSTRES'].map(st => {
                              const pendingAmt = orders.filter(o => !o.is_paid && o.station_statuses?.[st] && o.station_statuses[st] !== 'delivered')
                                 .reduce((sum, o) => sum + (o.items?.filter(i => i.station === st).reduce((s, i) => s + ((Number(i.price_at_time) || 0) * (Number(i.quantity) || 0)), 0) || 0), 0);

                              return (
                                 <div key={st} className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 group hover:bg-white/10 transition-all">
                                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">{getStationDisplay(st)}</div>
                                    <div className={`text-2xl font-black font-mono tracking-tighter ${pendingAmt > 0 ? 'text-amber-400' : 'text-slate-600'}`}>${pendingAmt}</div>
                                    <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                       <motion.div initial={{ width: 0 }} animate={{ width: pendingAmt > 0 ? '60%' : '0%' }} className="h-full bg-amber-500/50" />
                                    </div>
                                 </div>
                              );
                           })}
                        </div>
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
                              orders.filter(o => o.status !== 'cancelled' && o.station_statuses && Object.values(o.station_statuses).some(s => s !== 'delivered')).slice(0, 3).map(order => (
                                 <div key={order.id} className="bg-slate-50 p-4 sm:p-6 rounded-3xl border border-slate-100">
                                    <div className="text-[9px] font-black text-slate-400 mb-1 flex justify-between uppercase">
                                       <span>TKT #{order.ticket_number}</span>
                                       {order.is_paid && <span className="text-emerald-500">PAGADO</span>}
                                    </div>
                                    <h3 className="font-black text-lg sm:text-xl italic uppercase mb-4 text-slate-900 leading-none truncate">{order.customer_name}</h3>
                                    <div className="space-y-2">
                                       {Object.entries(order.station_statuses || {}).map(([station, status]) => (
                                          <div key={station} className="flex justify-between items-center bg-white/50 p-3 rounded-2xl border border-slate-100/50">
                                             <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{getStationDisplay(station)}</span>
                                             <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${status === 'ready' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>{status}</span>
                                          </div>
                                       ))}
                                    </div>
                                    <button onClick={() => { setPaymentOrder(order); setPaymentStation('CAJA'); }} className="w-full mt-4 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg">COBRAR AHORA</button>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <div className="flex-grow overflow-y-auto space-y-3 mb-6 scrollbar-hide pr-2">
                           {cart.map(item => (
                              <div key={item.id} className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-2xl border border-white/5 group">
                                 <div className="w-10 h-10 bg-white text-slate-900 rounded-xl flex items-center justify-center font-black">{item.quantity}</div>
                                 <div className="flex-grow truncate font-bold text-sm">{item.name}</div>
                                 <div className="font-black text-emerald-400">$ {item.price * item.quantity}</div>
                                 <button onClick={() => removeFromCart(item.id)} className="text-white/20 hover:text-red-500 transition-colors"><X size={16} /></button>
                              </div>
                           ))}
                        </div>

                        <div className="space-y-2 mb-8">
                           <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">Notas del Pedido</label>
                           <textarea
                              value={orderNotes}
                              onChange={e => setOrderNotes(e.target.value)}
                              placeholder="Ej: Sin cebolla..."
                              className="w-full bg-slate-800 p-4 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500 border border-white/5 resize-none h-20 placeholder:text-slate-600"
                           />
                        </div>
                        <div className="space-y-4 pt-6 border-t border-white/10">
                           <div className="flex justify-between items-end">
                              <span className="text-[10px] uppercase font-black opacity-40">Total Venta</span>
                              <div className="text-5xl font-black font-mono tracking-tighter decoration-emerald-500 underline decoration-4">$ {cart.reduce((a, b) => a + (b.price * b.quantity), 0)}</div>
                           </div>
                           <div className="grid grid-cols-2 gap-3">
                              <button onClick={() => handleAdminPlaceOrder(false)} className="bg-slate-800 p-5 rounded-3xl font-black uppercase text-[10px] hover:bg-slate-700 transition-all border border-white/5">Registrar</button>
                              <button onClick={() => handleAdminPlaceOrder(true)} className="bg-emerald-600 p-5 rounded-3xl font-black uppercase text-[10px] hover:bg-emerald-500 shadow-xl shadow-emerald-900/40">Cobrar Ahora</button>
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
                           {orders.filter(o => (salesFilter === 'Todas' || o.items?.some(i => i.station === salesFilter))).map(order => (
                              <div key={order.id} className={`bg-slate-50 border border-slate-100 p-6 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 hover:border-emerald-500/20 transition-all group ${order.status === 'cancelled' ? 'opacity-50 bg-slate-100' : ''}`}>
                                 <div className="flex items-center gap-6 w-full md:w-auto">
                                    <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center font-black text-slate-400 border border-slate-100 shadow-sm">
                                       #{order.ticket_number}
                                    </div>
                                    <div>
                                       <h4 className="text-xl font-black uppercase italic tracking-tighter leading-none">{order.customer_name}</h4>
                                       <div className="flex items-center gap-2 mt-1">
                                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(order.timestamp).toLocaleString()}</p>
                                          {order.status === 'cancelled' && <span className="text-[8px] font-black bg-red-500 text-white px-2 py-0.5 rounded-full uppercase">ANULADO</span>}
                                       </div>
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
                                 <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full md:w-auto justify-between md:justify-end border-t sm:border-t-0 border-slate-100 pt-4 sm:pt-0">
                                    <div className="text-left sm:text-right w-full sm:w-auto">
                                       <span className="text-[10px] font-black text-slate-400 uppercase">Subtotal</span>
                                       <div className={`text-2xl font-black font-mono tracking-tighter ${order.status === 'cancelled' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>${order.status === 'cancelled' ? '0' : order.total_price}</div>
                                    </div>
                                    <div className="grid grid-cols-4 sm:flex gap-2 w-full sm:w-auto">
                                       <button onClick={() => setSelectedInvoice(order)} title="Imprimir" className="p-4 sm:p-3 bg-white text-slate-500 rounded-2xl hover:bg-slate-900 hover:text-white transition-all shadow-sm border border-slate-100 flex items-center justify-center min-h-[50px]"><Printer size={20} /></button>
                                       <button onClick={() => setIsEditingOrder(order)} title="Editar" className="p-4 sm:p-3 bg-white text-slate-500 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-slate-100 flex items-center justify-center min-h-[50px]"><Edit2 size={20} /></button>
                                       <button onClick={() => {
                                          requireAdminAuth(() => {
                                             if (confirm("¿Anular venta? Se devolverá el stock.")) cancelOrder(order.id);
                                          });
                                       }} title="Anular" className="p-4 sm:p-3 bg-white text-slate-500 rounded-2xl hover:bg-amber-500 hover:text-white transition-all shadow-sm border border-slate-100 flex items-center justify-center min-h-[50px]"><RotateCcw size={20} /></button>
                                       <button onClick={() => {
                                          requireAdminAuth(() => {
                                             if (confirm("¿ELIMINAR DEFINITIVAMENTE? No se puede deshacer.")) deleteOrder(order.id);
                                          });
                                       }} title="Eliminar" className="p-4 sm:p-3 bg-white text-slate-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm border border-slate-100 flex items-center justify-center min-h-[50px]"><Trash2 size={20} /></button>
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
                     {/* SECCIÓN 1: LISTOS PARA ENTREGA (PRIORIDAD ALTA) */}
                     <div>
                        <div className="flex items-center gap-4 mb-8">
                           <div className="w-3 h-12 bg-emerald-500 rounded-full" />
                           <h2 className="text-3xl font-black uppercase italic tracking-tighter">Listos para Entregar</h2>
                           <div className="bg-emerald-100 text-emerald-600 px-4 py-1 rounded-full text-[10px] font-black">{orders.filter(o => o.status === 'ready').length}</div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                           {orders.filter(o => o.status === 'ready').length === 0 ? (
                              <div className="col-span-full py-16 text-center bg-white rounded-[3rem] border border-dashed border-slate-200 opacity-40 italic font-bold">No hay pedidos listos esperando entrega</div>
                           ) : (
                              orders.filter(o => o.status === 'ready').map(order => (
                                 <div key={order.id} className="bg-white p-10 rounded-[3.5rem] border-2 border-emerald-500 shadow-2xl relative overflow-hidden group scale-105">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full animate-pulse" />
                                    <div className="flex justify-between items-start mb-2 pr-12">
                                       <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">TICKET #{order.ticket_number}</div>
                                       <CheckCircle size={20} className="text-emerald-500" />
                                    </div>
                                    <h3 className="text-4xl font-black italic tracking-tighter uppercase mb-6 truncate">{order.customer_name}</h3>

                                    <div className="flex gap-3">
                                       <button onClick={() => setSelectedInvoice(order)} className="flex-grow bg-slate-100 text-slate-900 p-5 rounded-3xl font-black uppercase text-[10px] hover:bg-slate-900 hover:text-white transition-all">Factura</button>
                                       <button
                                          onClick={() => {
                                             Object.keys(order.station_statuses || {}).forEach(st => updateStationStatus(order.id, st, 'delivered'));
                                          }}
                                          className="flex-grow bg-emerald-600 text-white p-5 rounded-3xl font-black uppercase text-[10px] hover:bg-emerald-500 shadow-xl shadow-emerald-500/30 transition-all font-black text-xs uppercase italic tracking-tighter"
                                       >
                                          Entregar Ahora
                                       </button>
                                    </div>

                                    <div className="mt-6 flex flex-wrap gap-2">
                                       {Object.entries(order.station_statuses || {}).map(([st, s]) => (
                                          <div key={st} className="px-3 py-1 bg-slate-50 rounded-full text-[8px] font-bold text-slate-400 uppercase border border-slate-100">
                                             {st}: {s}
                                          </div>
                                       ))}
                                    </div>
                                 </div>
                              ))
                           )}
                        </div>
                     </div>

                     {/* SECCIÓN 2: PENDIENTES DE PAGO */}
                     <div className="pt-12 border-t border-slate-200/60">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                           <div className="flex items-center gap-4">
                              <div className="w-3 h-12 bg-amber-500 rounded-full" />
                              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-400">Pendientes de Cobro</h2>
                              <div className="bg-amber-100 text-amber-600 px-4 py-1 rounded-full text-[10px] font-black">{orders.filter(o => !o.is_paid && o.status !== 'delivered' && o.status !== 'cancelled').length}</div>
                           </div>

                           <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
                              {['TODAS', 'BAR', 'COMIDA RAPIDA', 'DULCES/POSTRES'].map(st => (
                                 <button
                                    key={st}
                                    onClick={() => setSelectedCheckoutStation(st)}
                                    className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedCheckoutStation === st ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                                 >
                                    {getStationDisplay(st)}
                                 </button>
                              ))}
                           </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                           {orders.filter(o => !o.is_paid && o.status !== 'delivered' && o.status !== 'cancelled' && (selectedCheckoutStation === 'TODAS' || (o.station_statuses && o.station_statuses[selectedCheckoutStation]))).map(order => (
                              <div key={order.id} className="bg-white p-8 rounded-[3.5rem] border border-slate-100 shadow-xl relative opacity-90 hover:opacity-100 transition-opacity">
                                 <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ticket #{order.ticket_number}</div>
                                 <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-6 truncate">{order.customer_name}</h3>

                                 <div className="space-y-3">
                                    {Object.entries(order.station_statuses || {})
                                       .filter(([st, s]) => (selectedCheckoutStation === 'TODAS' || st === selectedCheckoutStation) && s !== 'delivered')
                                       .map(([st, s]) => {
                                          const stAmt = order.items?.filter(i => i.station === st).reduce((sum, i) => sum + (i.price_at_time * i.quantity), 0) || 0;
                                          return (
                                             <div key={st} className="flex items-center gap-3">
                                                <button onClick={() => { setPaymentOrder(order); setPaymentStation(st); }} className={`flex-grow ${s === 'ready' ? 'bg-emerald-600' : 'bg-slate-900'} text-white p-5 rounded-[1.5rem] flex items-center justify-between hover:scale-105 active:scale-95 transition-all font-black text-xs uppercase shadow-lg`}>
                                                   <div className="flex items-center gap-2">
                                                      <span>{st === 'COMIDA RAPIDA' ? 'C. RÁPIDA' : st}</span>
                                                      {s === 'ready' && <div className="w-2 h-2 bg-white rounded-full animate-ping" />}
                                                   </div>
                                                   <div className="text-xl font-mono tracking-tighter">${stAmt}</div>
                                                </button>
                                             </div>
                                          );
                                       })}
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>

                     {/* SECCIÓN 3: ENTREGADOS RECIENTEMENTE */}
                     <div className="pt-12 border-t border-slate-200/60">
                        <div className="flex items-center gap-4 mb-8">
                           <div className="w-3 h-12 bg-slate-300 rounded-full" />
                           <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-300">Entregados Recientemente</h2>
                        </div>

                        <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden">
                           <div className="divide-y divide-slate-50">
                              {orders.filter(o => o.status === 'delivered').slice(0, 5).map(order => (
                                 <div key={order.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                                    <div className="flex items-center gap-6">
                                       <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-400 text-xs">#{order.ticket_number}</div>
                                       <div>
                                          <h4 className="font-black uppercase italic tracking-tighter text-slate-400 group-hover:text-slate-900 transition-colors uppercase italic tracking-tighter leading-none">{order.customer_name}</h4>
                                          <p className="text-[9px] font-bold text-slate-300 mt-1 uppercase tracking-widest leading-none">Entregado a las {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                       </div>
                                    </div>
                                    <button onClick={() => setSelectedInvoice(order)} className="p-3 text-slate-300 hover:text-emerald-500 transition-all"><FileText size={20} /></button>
                                 </div>
                              ))}
                           </div>
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
                           <div className="flex flex-wrap gap-4 bg-slate-100 p-2 rounded-3xl">
                              <div className="flex gap-2 border-r border-slate-200 pr-4 mr-2">
                                 {['TODAS', 'BAR', 'COMIDA RAPIDA', 'DULCES/POSTRES'].map(st => (
                                    <button
                                       key={st}
                                       onClick={() => setSelectedCollectionsStation(st)}
                                       className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${selectedCollectionsStation === st ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                       {st === 'COMIDA RAPIDA' ? 'C. RÁPIDA' : st}
                                    </button>
                                 ))}
                              </div>
                              <div className="flex gap-2">
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
                        </div>

                        <div className="overflow-x-auto bg-slate-50 rounded-[3rem] border border-slate-100 scrollbar-hide">
                           <table className="w-full text-left border-collapse min-w-[800px]">
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
                                    .filter(t => (selectedCollectionsStation === 'TODAS' || t.station === selectedCollectionsStation) && (salesFilter === 'Todos' || t.method === salesFilter))
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
                                             <div className="text-2xl font-black font-mono tracking-tighter text-slate-900 underline decoration-slate-200 decoration-2">${tx.order.items?.filter(i => tx.station === 'CAJA' || i.station === tx.station).reduce((s, i) => s + ((Number(i.price_at_time) || Number(i.price) || 0) * (Number(i.quantity) || 0)), 0) || 0}</div>
                                          </td>
                                          <td className="p-8 text-right">
                                             <button onClick={() => {
                                                requireAdminAuth(() => {
                                                   if (currentUser?.role === 'admin' || confirm("¿Eliminar registro de cobro?")) deletePayment(tx.order.id, tx.station);
                                                });
                                             }} className="p-3 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={20} /></button>
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
                                    .reduce((sum, t) => sum + (t.order.items?.filter(i => t.station === 'CAJA' || i.station === t.station).reduce((s, i) => s + ((Number(i.price_at_time) || Number(i.price) || 0) * (Number(i.quantity) || 0)), 0) || 0), 0)
                                 }.00
                              </p>
                           </div>
                        </div>
                     </div>
                  </motion.div>
               )}

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
                                 <th className="pb-6 px-4">Justificación / Autorización</th>
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
                                       <span className={`px-3 py-1 rounded-full font-black font-mono text-xs ${Math.abs(shift.difference) < 0.01 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                          ${shift.difference.toFixed(2)}
                                       </span>
                                    </td>
                                    <td className="py-6 px-4">
                                       {shift.note && <p className="text-[10px] text-slate-500 italic max-w-xs">{shift.note}</p>}
                                       {shift.authorized_by && <p className="text-[10px] font-black text-emerald-600 uppercase mt-1">✓ Aut: {shift.authorized_by}</p>}
                                    </td>
                                    <td className="py-6 px-4 text-right">
                                       <button onClick={() => {
                                          requireAdminAuth(() => {
                                             if (currentUser?.role === 'admin' || confirm("¿Eliminar registro de cuadre?")) deleteShift(shift.id);
                                          });
                                       }} className="p-3 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={20} /></button>
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
                           <div className="absolute top-6 right-6 flex gap-2 z-10">
                              <button onClick={() => {
                                 setUserData({ name: user.name, role: user.role, station: user.station || 'BAR', pin: user.pin });
                                 setEditingUser(user);
                                 setIsEditingUser(true);
                                 setIsUserModalOpen(true);
                              }} className="text-slate-300 hover:text-blue-500 transition-colors"><Edit2 size={24} /></button>
                              <button onClick={() => {
                                 requireAdminAuth(() => deleteUser(user.id));
                              }} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={24} /></button>
                           </div>
                           <div className="flex items-center gap-5 mb-6">
                              <div className="w-16 h-16 bg-slate-900 text-white rounded-3xl flex items-center justify-center"><Users size={32} /></div>
                              <div>
                                 <h3 className="text-xl font-black uppercase italic tracking-tighter">{user.name}</h3>
                                 <p className="text-[10px] font-black text-slate-400 uppercase">{user.role} {user.station && `· ${user.station}`}</p>
                              </div>
                           </div>
                           <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex justify-between items-center">
                              <span className="text-[10px] font-black text-slate-400 uppercase">PIN</span>
                              <span className="font-mono text-2xl font-black text-emerald-600 tracking-[0.3em]">****</span>
                           </div>
                        </div>
                     ))}
                  </motion.div>
               )}

               {activeTab === 'analytics' && (
                 <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                    {/* Period Selector */}
                    <div className="flex justify-between items-center">
                       <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm gap-2">
                          {[
                             { id: 'day', label: 'Día' },
                             { id: '7days', label: '7 Días' },
                             { id: 'month', label: 'Mes' }
                          ].map(p => (
                             <button key={p.id} onClick={() => setAnalyticsPeriod(p.id)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${analyticsPeriod === p.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>{p.label}</button>
                          ))}
                       </div>
                       <div className="hidden sm:flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <Clock size={14} /> Fecha reporte: {new Date().toLocaleDateString()}
                       </div>
                    </div>
                    {/* Header Summary for Analytics */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                       <div className="bg-slate-900 p-6 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden text-white group">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-[4rem]" />
                          <TrendingUp className="text-emerald-400 mb-4" size={24} />
                          <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Ganancia Potencial</div>
                          <div className="text-3xl font-black mt-1">$ {analyticsData.productPerformance.reduce((s, p) => s + p.potentialProfit, 0).toLocaleString()}</div>
                       </div>
                       <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm group">
                          <Package className="text-slate-900 mb-4" size={24} />
                          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Inversión Total</div>
                          <div className="text-3xl font-black mt-1 text-slate-900">$ {products.reduce((s, p) => s + (Number(p.cost) * Number(p.stock)), 0).toLocaleString()}</div>
                       </div>
                       <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm group">
                          <PieIcon className="text-blue-500 mb-4" size={24} />
                          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Margen Promedio</div>
                          <div className="text-3xl font-black mt-1 text-slate-900">
                             {Math.round((analyticsData.productPerformance.reduce((s, p) => s + (p.potentialProfit || 0), 0) / products.reduce((s, p) => s + (Number(p.cost) * Number(p.stock) || 1), 0)) * 100)}%
                          </div>
                       </div>
                       <div className="bg-amber-50 p-6 rounded-[2.5rem] border border-amber-100 shadow-sm group">
                          <AlertCircle className="text-amber-600 mb-4" size={24} />
                          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600/60">Agotamiento Próximo</div>
                          <div className="text-3xl font-black mt-1 text-amber-900">{analyticsData.productPerformance.filter(p => p.daysRemaining <= 3).length} Items</div>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                       {/* Sales Trend Chart */}
                       <div className="bg-white p-8 rounded-[3.5rem] border border-slate-100 shadow-sm">
                          <div className="flex justify-between items-center mb-8">
                             <div>
                                <h3 className="text-xl font-black uppercase italic tracking-tighter">Tendencia de Ventas</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                   {analyticsPeriod === 'day' ? 'Hoy' : analyticsPeriod === '7days' ? 'Últimos 7 Días' : 'Últimos 30 Días'}
                                </p>
                             </div>
                             <LineIcon className="text-slate-300" size={20} />
                          </div>
                          <div className="h-[300px] w-full">
                             <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={analyticsData.trend}>
                                   <defs>
                                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                         <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                         <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                      </linearGradient>
                                   </defs>
                                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900}} />
                                   <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900}} />
                                   <Tooltip 
                                      contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '16px' }}
                                      itemStyle={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '10px' }}
                                   />
                                   <Area type="monotone" dataKey="ventas" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" />
                                </AreaChart>
                             </ResponsiveContainer>
                          </div>
                       </div>

                       {/* Station Values Chart */}
                       <div className="bg-white p-8 rounded-[3.5rem] border border-slate-100 shadow-sm">
                          <div className="flex justify-between items-center mb-8">
                             <div>
                                <h3 className="text-xl font-black uppercase italic tracking-tighter">Valor por Almacén</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Potencial de Venta</p>
                             </div>
                             <PieIcon className="text-slate-300" size={20} />
                          </div>
                          <div className="h-[300px] w-full">
                             <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                   <Pie
                                      data={analyticsData.stationDist}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={60}
                                      outerRadius={100}
                                      paddingAngle={5}
                                      dataKey="value"
                                   >
                                      {analyticsData.stationDist.map((entry, index) => (
                                         <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'][index % 4]} rounded-2xl />
                                      ))}
                                   </Pie>
                                   <Tooltip />
                                   <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontWeight: 900, fontSize: '10px', textTransform: 'uppercase' }} />
                                </PieChart>
                             </ResponsiveContainer>
                          </div>
                       </div>
                    </div>

                    {/* Projections Table */}
                    <div className="bg-slate-900 rounded-[3.5rem] p-10 overflow-hidden shadow-2xl">
                       <div className="flex justify-between items-center mb-10">
                          <div>
                             <h3 className="text-2xl font-black italic uppercase text-white tracking-tighter">Proyecciones de Inventario</h3>
                             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Basado en consumo de los últimos 7 días</p>
                          </div>
                          <Calendar className="text-white opacity-20" size={32} />
                       </div>
                       <div className="overflow-x-auto scrollbar-hide">
                          <table className="w-full text-left border-separate border-spacing-y-4">
                             <thead>
                                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">
                                   <th className="px-6 pb-2">Producto</th>
                                   <th className="px-6 pb-2">Stock Actual</th>
                                   <th className="px-6 pb-2">Ventas/Día</th>
                                   <th className="px-6 pb-2">Proyección</th>
                                   <th className="px-6 pb-2 text-right">Potencial RD$</th>
                                </tr>
                             </thead>
                             <tbody>
                                {analyticsData.productPerformance.sort((a,b) => a.daysRemaining - b.daysRemaining).slice(0, 8).map(p => (
                                   <tr key={p.id} className="bg-white/5 rounded-3xl group hover:bg-white/10 transition-all">
                                      <td className="px-6 py-5 rounded-l-3xl">
                                         <div className="flex items-center gap-3">
                                            <img src={p.image_url} className="w-10 h-10 rounded-xl object-cover" />
                                            <div>
                                               <div className="text-sm font-black text-white uppercase truncate max-w-[150px]">{p.name}</div>
                                               <div className="text-[8px] font-black text-slate-500 uppercase italic">{p.station}</div>
                                            </div>
                                         </div>
                                      </td>
                                      <td className="px-6 py-5">
                                         <div className={`text-sm font-black ${Number(p.stock) < 10 ? 'text-amber-400' : 'text-slate-300'}`}>{p.stock} <span className="text-[8px] opacity-30">UNDS</span></div>
                                      </td>
                                      <td className="px-6 py-5">
                                         <div className="text-xs font-black text-slate-400">{p.avgDailySales.toFixed(1)} <span className="text-[8px] opacity-30">P/D</span></div>
                                      </td>
                                      <td className="px-6 py-5">
                                         <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase inline-block ${p.daysRemaining === Infinity ? 'bg-slate-800 text-slate-500' : p.daysRemaining <= 3 ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                            {p.daysRemaining === Infinity ? 'Sin Ventas' : `Agt. en ${p.daysRemaining} días`}
                                         </div>
                                      </td>
                                      <td className="px-6 py-5 text-right rounded-r-3xl">
                                         <div className="text-lg font-black font-mono text-white tracking-tighter">$ {p.potentialProfit.toLocaleString()}</div>
                                      </td>
                                   </tr>
                                ))}
                             </tbody>
                          </table>
                       </div>
                    </div>
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
                           <button onClick={() => { setIsEditingProduct(false); setEditingProduct(null); setIsModalOpen(true); }} className="p-6 rounded-[2.5rem] border-2 border-dashed border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all flex flex-col items-center justify-center gap-4 text-slate-400 hover:text-emerald-600 group">
                              <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-white transition-colors"><Plus size={32} /></div>
                              <span className="font-black uppercase italic tracking-tighter">Añadir Producto</span>
                           </button>
                           {products.map(product => (
                              <div key={product.id} className={`p-6 rounded-[2.5rem] border transition-all relative group-inventory ${product.stock < 10 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                                 <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-inventory-hover:opacity-100 transition-opacity z-10">
                                    <button onClick={() => {
                                       requireAdminAuth(() => {
                                          setEditingProduct(product);
                                          setIsEditingProduct(true);
                                          setIsModalOpen(true);
                                       });
                                    }} className="p-2 bg-white rounded-xl shadow-sm text-slate-400 hover:text-blue-500 transition-colors"><Edit2 size={16} /></button>
                                    <button onClick={() => {
                                       requireAdminAuth(() => {
                                          if (currentUser?.role === 'admin' || confirm("¿Eliminar producto?")) deleteProduct(product.id);
                                       });
                                    }} className="p-2 bg-white rounded-xl shadow-sm text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                 </div>
                                 <div className="flex gap-4 mb-6">
                                    <img src={product.image_url} className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-sm" />
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
                                       <button onClick={() => {
                                          requireAdminAuth(() => updateProduct(product.id, { stock: Math.max(0, (Number(product.stock) || 0) - 1) }));
                                       }} className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black">-</button>
                                       <button onClick={() => {
                                          requireAdminAuth(() => updateProduct(product.id, { stock: (Number(product.stock) || 0) + 1 }));
                                       }} className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-black">+</button>
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
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
                           <div>
                              <h2 className="text-3xl font-black uppercase italic tracking-tighter">Configuración de Impresoras</h2>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Vínculo independiente para estaciones de trabajo</p>
                           </div>
                           <div className="flex gap-4">
                              <button onClick={() => alert("Función: Buscar impresoras Bluetooth/Red...")} className="flex items-center gap-3 px-8 py-5 bg-[#C29F5C] text-white rounded-[2rem] font-black uppercase text-[10px] shadow-lg hover:opacity-90 transition-all tracking-widest">
                                 <Printer size={20} />
                                 <span>VER IMPRESORAS</span>
                              </button>
                              <button onClick={() => handlePrint()} className="flex items-center gap-3 px-8 py-5 bg-[#007BFF] text-white rounded-[2rem] font-black uppercase text-[10px] shadow-lg hover:opacity-90 transition-all tracking-widest">
                                 <FileText size={20} />
                                 <span>IMPRIMIR</span>
                              </button>
                              <button onClick={() => alert("Proximamente: Subir logo para tickets...")} className="flex items-center gap-3 px-8 py-5 bg-[#6C757D] text-white rounded-[2rem] font-black uppercase text-[10px] shadow-lg hover:opacity-90 transition-all tracking-widest">
                                 <Settings size={20} />
                                 <span>LOGO</span>
                              </button>
                           </div>
                        </div>

                        <div className="bg-slate-50 p-6 sm:p-12 rounded-[2rem] sm:rounded-[4rem] mb-12 border border-slate-100 flex flex-col items-center">
                           <div className="max-w-md w-full space-y-5 text-center sm:text-left">
                              {[
                                 { paso: 1, text: "Conecte su impresora vía bluetooth" },
                                 { paso: 2, text: "Dele a ver impresoras" },
                                 { paso: 3, text: "Busque el nombre de su impresora" },
                                 { paso: 4, text: "Toque nombre de su impresora" },
                                 { paso: 5, text: "Imprima un recibo de prueba en el botón azul" }
                              ].map(step => (
                                 <div key={step.paso} className="flex items-center gap-6 group">
                                    <span className="text-[#C29F5C] font-black uppercase text-[11px] w-20 text-right whitespace-nowrap">Paso {step.paso} -</span>
                                    <span className="text-slate-900 font-bold text-[13px] tracking-tight">{step.text}</span>
                                 </div>
                              ))}
                           </div>
                        </div>

                        <div className="border-t border-dashed border-slate-200 my-12" />

                        {/* Voz de Anuncios Section */}
                        <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm space-y-8 mb-12">
                           <div className="flex items-center gap-6">
                              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-[1.5rem] flex items-center justify-center shadow-inner">
                                 <Volume2 size={32} />
                              </div>
                              <div>
                                 <div className="flex items-center gap-3">
                                    <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">Voz de Anuncios</h3>
                                    {saveSuccess && (
                                       <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="px-3 py-1 bg-emerald-500 text-white text-[8px] font-black uppercase rounded-full tracking-widest border border-emerald-600">
                                          ¡Cambios Guardados!
                                       </motion.span>
                                    )}
                                 </div>
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Personaliza el llamado a clientes (Según tu navegador)</p>
                              </div>
                           </div>

                           <div className="flex flex-col md:flex-row gap-6">
                              <div className="flex-grow space-y-2">
                                 <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Seleccionar Voz</label>
                                 <div className="relative">
                                    <select
                                       value={pendingVoice}
                                       onChange={(e) => setPendingVoice(e.target.value)}
                                       className="w-full bg-slate-50 p-6 rounded-[2rem] font-bold border border-slate-100 text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none cursor-pointer"
                                    >
                                       <option value="">Sistema (Predeterminada)</option>
                                       {voices.map(v => (
                                          <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
                                       ))}
                                    </select>
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                       <ChevronRight className="rotate-90" size={20} />
                                    </div>
                                 </div>
                              </div>
                              <div className="flex items-end gap-4">
                                 <button
                                    onClick={handleTestVoice}
                                    className="px-10 py-6 bg-slate-100 text-slate-600 rounded-[2rem] font-black uppercase text-xs hover:bg-slate-200 transition-all flex items-center justify-center gap-3"
                                 >
                                    <Volume2 size={18} />
                                    <span>Probar</span>
                                 </button>
                                 <button
                                    onClick={handleSaveVoice}
                                    className={`px-10 py-6 text-white rounded-[2rem] font-black uppercase text-xs shadow-xl shadow-emerald-900/10 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 ${pendingVoice !== selectedVoice ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-slate-300 cursor-not-allowed'}`}
                                    disabled={pendingVoice === selectedVoice}
                                 >
                                    <Save size={18} />
                                    <span>Guardar Cambios</span>
                                 </button>
                              </div>
                           </div>
                        </div>

                        <div className="border-t border-dashed border-slate-200 my-12" />

                        {/* Reportes Section */}
                        <div className="bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[3.5rem] border border-slate-100 shadow-sm space-y-8 mb-12">
                           <div className="flex items-center gap-6">
                              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-[1.5rem] flex items-center justify-center shadow-inner">
                                 <FileText size={32} />
                              </div>
                              <div>
                                 <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">Reportes de Ventas</h3>
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Genera informes detallados de ventas</p>
                              </div>
                           </div>

                           <div className="flex flex-col md:flex-row gap-6">
                              <div className="flex-grow space-y-2">
                                 <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Periodo de Reporte</label>
                                 <div className="flex gap-2">
                                    {['Hoy', 'Semana', 'Mes', 'Todo'].map(p => (
                                       <button
                                          key={p}
                                          onClick={() => setReportPeriod(p)}
                                          className={`flex-grow py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border ${reportPeriod === p ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400'}`}
                                       >
                                          {p}
                                       </button>
                                    ))}
                                 </div>
                              </div>
                              <div className="flex items-end">
                                 <button
                                    onClick={exportToExcel}
                                    className="w-full md:w-auto px-10 py-4 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3"
                                 >
                                    <FileText size={18} />
                                    <span>Descargar Reporte Excel</span>
                                 </button>
                              </div>
                           </div>
                        </div>

                        <div className="border-t border-dashed border-slate-200 my-10" />

                        <div className="flex items-center gap-6 mb-10">
                           <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-[1.5rem] flex items-center justify-center shadow-inner">
                              <Printer size={32} />
                           </div>
                           <div>
                              <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">Configuración de Impresoras</h3>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Gestión de dispositivos por estación de trabajo</p>
                           </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                           {Object.entries(printerConfig).map(([station, config]) => (
                              <div key={station} className="space-y-8">
                                 <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 ml-6">{station}</h4>
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                       <label className="text-[10px] font-black text-slate-400 uppercase ml-6">ANCHO DE PAPEL</label>
                                       <div className="flex gap-4">
                                          {['80mm', '58mm'].map(w => (
                                             <button
                                                key={w}
                                                onClick={() => updatePrinterConfig(station, { paperWidth: w })}
                                                className={`flex-grow py-7 rounded-[2.5rem] font-black text-xl transition-all border-2 ${config.paperWidth === w ? 'bg-white border-[#C29F5C] text-slate-900 shadow-xl scale-105' : 'bg-white border-slate-100 text-slate-300'}`}
                                             >
                                                {w}
                                             </button>
                                          ))}
                                       </div>
                                    </div>

                                    <div className="space-y-4">
                                       <label className="text-[10px] font-black text-slate-400 uppercase ml-6">AUTO-DESCARGA</label>
                                       <div onClick={() => updatePrinterConfig(station, { autoDownload: !config.autoDownload })} className="flex items-center gap-6 bg-slate-50 p-7 rounded-[2.5rem] border border-slate-100 cursor-pointer group hover:bg-white transition-all h-[80px]">
                                          <div className={`w-8 h-8 shrink-0 rounded-xl border-2 flex items-center justify-center transition-all ${config.autoDownload ? 'bg-[#C29F5C]/10 border-[#C29F5C]' : 'bg-white border-slate-200'}`}>
                                             {config.autoDownload && <div className="w-3 h-3 bg-[#C29F5C] rounded-sm" />}
                                          </div>
                                          <span className="text-[10px] font-black uppercase italic tracking-tighter text-slate-900 leading-none">ACTIVAR AUTO-DESCARGA PDF</span>
                                       </div>
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

                        {/* DANGER ZONE - SYSTEM RESET */}
                        <div className="mt-20 pt-12 border-t-4 border-red-500/10">
                           <div className="flex items-center gap-4 mb-8">
                              <div className="w-3 h-12 bg-red-500 rounded-full" />
                              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-red-600">Zona de Peligro</h2>
                           </div>

                           <div className="bg-red-50 p-10 rounded-[3.5rem] border-2 border-red-100 flex flex-col md:flex-row items-center justify-between gap-8">
                              <div className="flex items-start gap-6">
                                 <div className="w-16 h-16 bg-white text-red-600 rounded-[1.5rem] flex items-center justify-center shadow-lg shrink-0">
                                    <AlertCircle size={32} />
                                 </div>
                                 <div>
                                    <h3 className="text-xl font-black uppercase text-red-900 leading-none mb-2">Reiniciar Todo el Sistema</h3>
                                    <p className="text-[10px] font-bold text-red-700/60 uppercase tracking-widest max-w-sm">
                                       Esta acción eliminará de forma permanente todos los pedidos e historial de ventas de la base de datos. No se puede deshacer.
                                    </p>
                                 </div>
                              </div>

                              <button
                                 onClick={() => {
                                    if (confirm("⚠️ ATENCIÓN: Esta acción borrará TODO el historial de ventas y pedidos. ¿Estás absolutamente seguro?")) {
                                       requireAdminAuth(async () => {
                                          const success = await resetSystem();
                                          if (success) {
                                             alert("Sistema reiniciado con éxito. Todos los datos han sido borrados.");
                                             window.location.reload();
                                          }
                                       });
                                    }
                                 }}
                                 className="w-full md:w-auto px-12 py-6 bg-red-600 text-white rounded-[2rem] font-black uppercase text-xs shadow-2xl shadow-red-500/40 hover:bg-red-700 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 tracking-widest"
                              >
                                 <RotateCcw size={20} />
                                 <span>REINICIAR A CERO</span>
                              </button>
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
                        <p className="text-[10px] uppercase font-black opacity-40 mb-1">Monto a Cobrar ({getStationDisplay(paymentStation)})</p>
                        <div className="text-5xl font-black font-mono tracking-tighter text-emerald-400 shadow-emerald-500/20 underline underline-offset-8 decoration-4">
                           ${paymentOrder.items?.filter(i => {
                              if (paymentStation === 'CAJA') return true;
                              const s1 = i.station?.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                              const s2 = paymentStation?.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                              return s1 === s2;
                           }).reduce((sum, i) => sum + ((Number(i.price_at_time) || 0) * (Number(i.quantity) || 0)), 0) || 0}
                        </div>
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
                        <div className="mb-8 space-y-6">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 ml-4 uppercase">Ingreso Efectivo</label>
                              <input type="number" value={amountReceived} onChange={e => setAmountReceived(e.target.value)} className="w-full bg-slate-50 p-6 rounded-3xl text-center text-5xl font-black font-mono shadow-inner outline-none focus:ring-4 focus:ring-emerald-500/10 placeholder:text-slate-200" placeholder="0" />
                           </div>

                           {(Number(amountReceived) > 0) && (
                              <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 flex justify-between items-center">
                                 <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Cambio a Devolver:</span>
                                 <span className="text-3xl font-black font-mono text-emerald-600">
                                    ${Math.max(0, Number(amountReceived) - (paymentOrder.items?.filter(i => {
                                       if (paymentStation === 'CAJA') return true;
                                       const s1 = i.station?.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                       const s2 = paymentStation?.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                       return s1 === s2;
                                    }).reduce((sum, i) => sum + ((Number(i.price_at_time) || 0) * (Number(i.quantity) || 0)), 0) || 0))}
                                 </span>
                              </div>
                           )}
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
                           onClick={() => handlePrint('printable-invoice')}
                           className="flex flex-col items-center justify-center gap-2 p-6 bg-white border border-slate-100 text-slate-900 rounded-[2rem] font-black uppercase text-[10px] shadow-lg hover:shadow-xl transition-all"
                        >
                           <Printer size={20} />
                           <span>TICKET</span>
                        </button>
                        <button
                           onClick={() => handlePrint('printable-invoice')}
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

                     <div className="flex-grow w-full overflow-y-auto flex justify-center pb-20 custom-scrollbar rounded-[3rem]">
                        <div className="max-w-[210mm] mx-auto">
                           <Receipt order={selectedInvoice} station="CAJA" isForPrint={true} />
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
                           <input type="text" value={isEditingOrder.customer_name} onChange={e => setIsEditingOrder({ ...isEditingOrder, customer_name: e.target.value })} className="w-full bg-slate-50 p-5 rounded-2xl font-black text-xl border border-slate-100" />
                        </div>
                        <div className="flex gap-4">
                           <button onClick={() => setIsEditingOrder(null)} className="flex-grow py-5 bg-slate-100 rounded-2xl font-black text-slate-400">CANCELAR</button>
                           <button onClick={() => {
                              requireAdminAuth(() => {
                                 updateOrder(isEditingOrder.id, isEditingOrder);
                                 setIsEditingOrder(null);
                              });
                           }} className="flex-grow py-5 bg-emerald-600 text-white rounded-2xl font-black shadow-xl">GUARDAR CAMBIOS</button>
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
                     <h2 className="text-3xl font-black italic mb-10 uppercase tracking-tighter">
                        {isEditingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                     </h2>
                     <form onSubmit={(e) => {
                        e.preventDefault();
                        if (isEditingProduct) {
                           requireAdminAuth(() => handleSaveProduct(e));
                        } else {
                           handleSaveProduct(e);
                        }
                     }} className="space-y-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nombre</label>
                           <input required placeholder="Nombre..." value={isEditingProduct ? editingProduct.name : newProduct.name} onChange={e => isEditingProduct ? setEditingProduct({ ...editingProduct, name: e.target.value }) : setNewProduct({ ...newProduct, name: e.target.value })} className="w-full bg-slate-50 p-5 rounded-2xl font-bold border border-slate-100" />
                        </div>

                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Descripción</label>
                           <textarea placeholder="Descripción..." value={isEditingProduct ? editingProduct.description : newProduct.description} onChange={e => isEditingProduct ? setEditingProduct({ ...editingProduct, description: e.target.value }) : setNewProduct({ ...newProduct, description: e.target.value })} className="w-full bg-slate-50 p-5 rounded-2xl font-bold h-24 border border-slate-100" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Precio Venta</label>
                              <input type="number" required placeholder="Precio" value={isEditingProduct ? editingProduct.price : newProduct.price} onChange={e => isEditingProduct ? setEditingProduct({ ...editingProduct, price: e.target.value }) : setNewProduct({ ...newProduct, price: e.target.value })} className="w-full bg-slate-50 p-5 rounded-2xl font-black font-mono border border-slate-100" />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Costo Unitario</label>
                              <input type="number" required placeholder="Costo" value={isEditingProduct ? editingProduct.cost : newProduct.cost} onChange={e => isEditingProduct ? setEditingProduct({ ...editingProduct, cost: e.target.value }) : setNewProduct({ ...newProduct, cost: e.target.value })} className="w-full bg-slate-50 p-5 rounded-2xl font-black font-mono opacity-60 border border-slate-100" />
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Categoría</label>
                              <select 
                                value={isEditingProduct ? editingProduct.category : newProduct.category} 
                                onChange={e => {
                                   const val = e.target.value;
                                   if (isEditingProduct) setEditingProduct({ ...editingProduct, category: val });
                                   else setNewProduct({ ...newProduct, category: val });
                                }} 
                                className="w-full bg-slate-50 p-5 rounded-2xl font-bold border border-slate-100"
                              >
                                 <option value="">Sin Categoría</option>
                                 {(isEditingProduct ? editingProduct.station : newProduct.station) === 'BAR' ? (
                                   <>
                                     <option value="Botellas">Botellas</option>
                                     <option value="Tragos">Tragos</option>
                                   </>
                                 ) : (
                                   <>
                                     <option value="Burgers">Burgers</option>
                                     <option value="Complementos">Complementos</option>
                                     <option value="Bebidas">Bebidas</option>
                                     <option value="Postres">Postres</option>
                                   </>
                                 )}
                              </select>
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Estación</label>
                              <select value={isEditingProduct ? editingProduct.station : newProduct.station} onChange={e => isEditingProduct ? setEditingProduct({ ...editingProduct, station: e.target.value }) : setNewProduct({ ...newProduct, station: e.target.value })} className="w-full bg-slate-50 p-5 rounded-2xl font-black uppercase text-[10px] border border-slate-100">
                                 <option value="COMIDA RAPIDA">Comida Rápida</option>
                                 <option value="BAR">Bar / Bebidas</option>
                                 <option value="DULCES/POSTRES">Postres / Dulces</option>
                              </select>
                           </div>
                        </div>

                        <div className="space-y-4">
                           <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Foto del Producto</label>
                           <div className="flex items-center gap-4">
                              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-slate-100 bg-slate-50 flex items-center justify-center relative">
                                 {isUploading ? (
                                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><div className="w-6 h-6 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
                                 ) : (
                                    <img src={isEditingProduct ? editingProduct?.image_url : newProduct.image_url} className="w-full h-full object-cover" />
                                 )}
                              </div>
                              <label className="flex-grow bg-slate-100 p-5 rounded-2xl border-2 border-dashed border-slate-200 cursor-pointer hover:bg-slate-200 transition-all flex items-center justify-center gap-2 group">
                                 <Plus size={20} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
                                 <span className="text-[10px] font-black uppercase text-slate-500">{isUploading ? 'Subiendo...' : 'Subir Imagen'}</span>
                                 <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={isUploading} />
                              </label>
                           </div>
                        </div>

                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Stock Actual</label>
                           <input type="number" required placeholder="Stock" value={isEditingProduct ? editingProduct.stock : newProduct.stock} onChange={e => isEditingProduct ? setEditingProduct({ ...editingProduct, stock: e.target.value }) : setNewProduct({ ...newProduct, stock: e.target.value })} className="w-full bg-slate-50 p-5 rounded-2xl font-bold border border-slate-100" />
                        </div>

                        <div className="flex gap-4 pt-4">
                           <button type="button" onClick={() => setIsModalOpen(false)} className="flex-grow bg-slate-100 py-6 rounded-3xl font-black text-slate-400 uppercase tracking-widest">Cancelar</button>
                           <button type="submit" disabled={isUploading} className="flex-[2] bg-emerald-600 text-white py-6 rounded-3xl font-black text-xl shadow-xl hover:bg-emerald-500 transition-all uppercase tracking-widest disabled:opacity-50">
                              {isEditingProduct ? 'Guardar Cambios' : 'Crear Producto'}
                           </button>
                        </div>
                     </form>
                  </motion.div>
               </>
            )}

            {isUserModalOpen && (
               <>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsUserModalOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200]" />
                  <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-[4rem] p-12 z-[201] shadow-2xl scrollbar-hide">
                     <h2 className="text-3xl font-black italic mb-8 uppercase italic underline decoration-wavy">
                        {isEditingUser ? 'Editar Usuario' : 'Nuevo Acceso'}
                     </h2>
                     <form onSubmit={handleAddUser} className="space-y-6">
                        <div className="space-y-2">
                           <label className="text-xs font-black uppercase text-slate-400 ml-2 tracking-widest leading-none">Nombre Colaborador</label>
                           <input required value={userData.name} onChange={e => setUserData({ ...userData, name: e.target.value })} className="w-full bg-slate-50 p-5 rounded-2xl font-bold border border-slate-100" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <label className="text-xs font-black uppercase text-slate-400 ml-2">Rol</label>
                              <select value={userData.role} onChange={e => setUserData({ ...userData, role: e.target.value })} className="w-full bg-slate-50 p-5 rounded-2xl font-bold">
                                 <option value="admin">Admin</option>
                                 <option value="catalogo">Catalogo</option>
                                 <option value="contador">Contador</option>
                                 <option value="vendedor">Vendedor</option>
                              </select>
                           </div>
                           <div className="space-y-2">
                              <label className="text-xs font-black uppercase text-slate-400 ml-2">PIN</label>
                              <input required maxLength="4" value={userData.pin} onChange={e => setUserData({ ...userData, pin: e.target.value })} className="w-full bg-slate-50 p-5 rounded-2xl font-black font-mono tracking-[0.4em] text-emerald-600" />
                           </div>
                        </div>
                        {userData.role === 'vendedor' && (
                           <div className="space-y-2">
                              <label className="text-xs font-black uppercase text-slate-400 ml-2 italic">Estación</label>
                              <select value={userData.station} onChange={e => setUserData({ ...userData, station: e.target.value })} className="w-full bg-slate-50 p-5 rounded-2xl font-black uppercase text-[10px]">
                                 <option value="BAR">Bar</option>
                                 <option value="COMIDA RAPIDA">Comida Rápida</option>
                                 <option value="DULCES/POSTRES">Postres / Dulces</option>
                                 <option value="CAJA">Caja</option>
                              </select>
                           </div>
                        )}
                        <button type="submit" className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black text-xl hover:bg-emerald-600 transition-all shadow-xl uppercase">
                           {isEditingUser ? 'Guardar Cambios' : 'Generar Credencial'}
                        </button>
                     </form>
                  </motion.div>
               </>
            )}

            {isAuthModalOpen && (
               <>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAuthModalOpen(false)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[5000]" />
                  <motion.div initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white p-12 rounded-[4rem] shadow-2xl z-[5001] border border-slate-100 text-center">
                     <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-400">
                        <Shield size={32} />
                     </div>
                     <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-2">Autorización Admin</h2>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Esta acción requiere la clave del administrador</p>

                     <form onSubmit={handleAuthSubmit} className="space-y-6">
                        <input
                           type="password"
                           maxLength="4"
                           autoFocus
                           value={authPin}
                           onChange={e => setAuthPin(e.target.value)}
                           placeholder="PIN"
                           className="w-full bg-slate-50 p-6 rounded-3xl text-center text-4xl font-black font-mono tracking-[0.5em] shadow-inner border border-slate-100 focus:ring-4 focus:ring-emerald-500/10"
                        />
                        {authError && <p className="text-[10px] font-black text-red-500 uppercase tracking-widest animate-shake">{authError}</p>}
                        <div className="flex gap-4">
                           <button type="button" onClick={() => setIsAuthModalOpen(false)} className="flex-grow py-5 bg-slate-100 rounded-2xl font-black text-slate-400 uppercase text-[10px]">Cancelar</button>
                           <button type="submit" className="flex-[2] py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] hover:bg-emerald-600 transition-all">Autorizar</button>
                        </div>
                     </form>
                  </motion.div>
               </>
            )}
         </AnimatePresence>
         <style dangerouslySetInnerHTML={{
            __html: `
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

export default AdminPanel;
