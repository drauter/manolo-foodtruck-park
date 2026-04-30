import React from 'react';
import { useParams } from 'react-router-dom';
import { useOrder } from '../context/OrderContext';
import { Clock, CheckCircle, Package, Printer, X, Settings, AlertCircle, LogOut, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Receipt from '../components/Receipt';
import { printReceipt } from '../utils/printUtils';
import { STATIONS, getStationDisplay } from '../utils/constants';
import SellerPOS from './SellerPOS';

const EmployeePanel = () => {
  const { station } = useParams();
  const { orders, updateStationStatus, printerConfig, updatePrinterConfig, announceOrder } = useOrder();
  const [printingOrder, setPrintingOrder] = React.useState(null);
  const [showSettings, setShowSettings] = React.useState(false);

  const handlePrint = () => {
    printReceipt('printable-invoice');
  };

  // Map URL parameter to display name and icon
  const stationConfig = {
    'bar': { label: STATIONS.BAR, display: getStationDisplay(STATIONS.BAR), color: 'text-blue-500', bg: 'bg-blue-500/10' },
    'comida-rapida': { label: STATIONS.COMIDA_RAPIDA, display: getStationDisplay(STATIONS.COMIDA_RAPIDA), color: 'text-amber-500', bg: 'bg-amber-500/10' },
    'dulces-postres': { label: STATIONS.POSTRES, display: getStationDisplay(STATIONS.POSTRES), color: 'text-pink-500', bg: 'bg-pink-500/10' },
    'food': { label: STATIONS.COMIDA_RAPIDA, display: getStationDisplay(STATIONS.COMIDA_RAPIDA), color: 'text-amber-500', bg: 'bg-amber-500/10' },
    'sweets': { label: STATIONS.POSTRES, display: getStationDisplay(STATIONS.POSTRES), color: 'text-pink-500', bg: 'bg-pink-500/10' },
  };

  const currentStation = stationConfig[station?.toLowerCase()] || stationConfig['comida-rapida'];
  const stationKey = currentStation.label;
  const [activeTab, setActiveTab] = React.useState('prep'); // 'prep', 'dispatch', or 'history'

  const stationOrders = orders.filter(order => {
    if (order.status === 'cancelled') return false;
    const isOurOrder = order.items?.some(item => item.station === stationKey);
    const stationStatus = order.station_statuses?.[stationKey];
    
    if (activeTab === 'prep') {
      return isOurOrder && stationStatus !== 'delivered' && stationStatus !== 'ready';
    } else if (activeTab === 'dispatch') {
      return isOurOrder && stationStatus === 'ready';
    } else {
      return isOurOrder && stationStatus === 'delivered';
    }
  }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (activeTab === 'history') {
    stationOrders.splice(20); // Limit history to last 20
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 font-sans no-print">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl">
        <div className="flex items-center gap-6">
          <div className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl ${currentStation.bg} ${currentStation.color} shadow-lg border border-current/20`}>
            <Package size={24} className="sm:w-8 sm:h-8" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tighter uppercase italic leading-none">ESTACIÓN: <span className={currentStation.color}>{currentStation.display}</span></h1>
            <p className="text-slate-400 mt-1 font-bold uppercase tracking-widest text-[9px] sm:text-xs opacity-60">Gestión de Producción y Despacho</p>
          </div>
        </div>
        
        <div className="flex gap-4 items-center w-full md:w-auto">
          <div className="flex gap-1 sm:gap-2 bg-slate-950 p-1.5 sm:p-2 rounded-2xl sm:rounded-[2rem] border border-slate-800 flex-grow sm:flex-grow-0 overflow-x-auto no-scrollbar">
            <button 
              onClick={() => setActiveTab('caja')}
              className={`flex-grow sm:flex-grow-0 px-4 sm:px-8 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all ${activeTab === 'caja' ? currentStation.bg + ' ' + currentStation.color : 'text-slate-500 hover:text-slate-300'} whitespace-nowrap`}
            >
              Nuevo Pedido
            </button>
            <button 
              onClick={() => setActiveTab('prep')}
              className={`flex-grow sm:flex-grow-0 px-4 sm:px-8 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all ${activeTab === 'prep' ? currentStation.bg + ' ' + currentStation.color : 'text-slate-500 hover:text-slate-300'}`}
            >
              Prod.
            </button>
            <button 
              onClick={() => setActiveTab('dispatch')}
              className={`flex-grow sm:flex-grow-0 px-4 sm:px-8 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all ${activeTab === 'dispatch' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Desp.
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`flex-grow sm:flex-grow-0 px-4 sm:px-8 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-slate-800 text-white border border-white/10' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Listos
            </button>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => window.location.href = '/login'}
              className="p-3 sm:p-4 bg-slate-950 text-slate-500 hover:text-white rounded-2xl border border-slate-800 transition-all active:scale-95"
              title="Cerrar Panel"
            >
              <LogOut size={20} className="sm:w-6 sm:h-6" />
            </button>
            <button 
              onClick={() => setShowSettings(true)}
              className="p-3 sm:p-4 bg-slate-950 text-slate-500 hover:text-white rounded-2xl border border-slate-800 transition-all active:scale-95"
            >
              <Settings size={20} className="sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>
      </header>

      {activeTab === 'caja' ? (
        <div className="bg-white rounded-[3rem] overflow-hidden shadow-2xl h-[calc(100vh-200px)] border border-slate-800/50 relative">
           <SellerPOS isEmbedded={true} />
        </div>
      ) : stationOrders.length === 0 ? (
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
                      <div className="flex flex-col">
                        <span className="text-xl font-bold text-slate-100 uppercase tracking-tight leading-none">
                          {item.products?.name || item.product?.name || 'Producto'}
                        </span>
                        {(item.products?.description || item.product?.description) && (
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1.5 opacity-60 italic leading-tight">
                            {item.products?.description || item.product?.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {order.notes && (
                <div className="mx-8 mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl shadow-inner">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle size={14} className="text-amber-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Notas/Instrucciones</span>
                  </div>
                  <p className="text-sm font-bold text-amber-100 italic">"{order.notes}"</p>
                </div>
              )}

              <div className="flex gap-4 p-6 bg-slate-800/20 mt-auto">
                <button 
                  onClick={() => setPrintingOrder(order)}
                  className="flex-grow py-5 bg-slate-800 text-white font-black rounded-2xl hover:bg-slate-700 transition-all flex items-center justify-center gap-3 text-lg border border-white/5 shadow-xl"
                >
                  <Printer size={24} /> IMPRIMIR
                </button>
                {activeTab === 'prep' && (
                  <button 
                    onClick={() => updateStationStatus(order.id, stationKey, 'ready')}
                    className="flex-[2] py-5 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-500 active:scale-95 transition-all flex items-center justify-center gap-3 text-lg shadow-xl"
                  >
                    <CheckCircle size={24} /> MARCAR LISTO
                  </button>
                )}
                {activeTab === 'dispatch' && (
                  <div className="flex flex-col gap-3 flex-[2]">
                    <button 
                      onClick={() => announceOrder(order, stationKey, true)}
                      className="py-4 bg-amber-500 text-white font-black rounded-2xl hover:bg-amber-400 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm shadow-lg uppercase"
                    >
                      <Volume2 size={20} /> Repetir Llamado
                    </button>
                    <button 
                      onClick={() => updateStationStatus(order.id, stationKey, 'delivered')}
                      className="py-5 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-500 active:scale-95 transition-all flex items-center justify-center gap-3 text-lg shadow-xl uppercase italic tracking-tighter"
                    >
                      <Package size={24} /> Entregar Pedido
                    </button>
                  </div>
                )}
                {activeTab === 'history' && (
                  <div className="flex-[2] py-5 bg-slate-950 text-emerald-500 font-black rounded-2xl flex items-center justify-center gap-3 text-sm uppercase italic border border-emerald-500/20">
                    <CheckCircle size={18} /> Entregado
                  </div>
                )}
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
                   <Receipt order={printingOrder} station={stationKey} isForPrint={true} />
                </div>
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[110]">
                  <button 
                    onClick={() => handlePrint()}
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
      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettings(false)} className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[200]" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white p-12 rounded-[4rem] shadow-2xl z-[201] border border-slate-100 text-slate-950">
               <div className="flex justify-between items-center mb-10">
                  <h2 className="text-3xl font-black uppercase italic tracking-tighter">Configuración Station</h2>
                  <button onClick={() => setShowSettings(false)} className="p-3 bg-slate-100 rounded-2xl text-slate-400 hover:text-red-500 transition-colors"><X size={24} /></button>
               </div>

               <div className="space-y-8">
                  <div className="space-y-4">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-6">ANCHO DE PAPEL (STATION)</label>
                     <div className="grid grid-cols-2 gap-4">
                        {['80mm', '58mm'].map(w => (
                           <button 
                              key={w} 
                              onClick={() => updatePrinterConfig(stationKey, { paperWidth: w })}
                              className={`py-8 rounded-[2.5rem] font-black text-2xl transition-all border-2 ${printerConfig[stationKey]?.paperWidth === w ? 'bg-emerald-600 border-emerald-500 text-white shadow-xl scale-105' : 'bg-slate-50 border-slate-100 text-slate-300 hover:border-slate-200'}`}
                           >
                              {w}
                           </button>
                        ))}
                     </div>
                  </div>

                  <div className="space-y-4">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-6">AUTO-DESCARGA PDF</label>
                     <div 
                        onClick={() => updatePrinterConfig(stationKey, { autoDownload: !printerConfig[stationKey]?.autoDownload })} 
                        className={`flex items-center gap-6 p-8 rounded-[2.5rem] border cursor-pointer group transition-all ${printerConfig[stationKey]?.autoDownload ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}
                     >
                        <div className={`w-8 h-8 shrink-0 rounded-xl border-2 flex items-center justify-center transition-all ${printerConfig[stationKey]?.autoDownload ? 'bg-emerald-600 border-emerald-500' : 'bg-white border-slate-200'}`}>
                           {printerConfig[stationKey]?.autoDownload && <div className="w-3 h-3 bg-white rounded-sm" />}
                        </div>
                        <span className="text-[10px] font-black uppercase italic tracking-tighter text-slate-900 leading-none">Activar descarga automática de tickets</span>
                     </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex flex-col gap-4">
                     <button 
                        onClick={() => handlePrint()}
                        className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-lg hover:bg-blue-500 transition-all flex items-center justify-center gap-3"
                     >
                        <Printer size={20} />
                        BUSCAR / PROBAR IMPRESORA
                     </button>
                     <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex items-start gap-4">
                        <AlertCircle className="text-amber-500 shrink-0" size={20} />
                        <p className="text-[9px] font-bold text-amber-700 uppercase tracking-wide leading-relaxed">
                           Al tocar el botón azul, se abrirá el buscador de impresoras de tu dispositivo. Selecciona tu impresora térmica y guárdala como predeterminada.
                        </p>
                     </div>
                  </div>

                  <button 
                    onClick={() => setShowSettings(false)}
                    className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all mt-4"
                  >
                    Guardar y Cerrar
                  </button>
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmployeePanel;
