import React, { useState } from 'react';
import { useOrder } from '../context/OrderContext';
import { useNavigate } from 'react-router-dom';
import { Shield, Coffee, Utensils, IceCream, Wallet, Lock, Delete, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LoginPage = () => {
  const { login, connectionError, refreshData, loadingOrders, verifyPin } = useOrder();
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [identifiedUser, setIdentifiedUser] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const stationIcons = {
    'Bar': Coffee,
    'Comida Rápida': Utensils,
    'Dulces / Postres': IceCream,
    'Caja': Wallet,
    'BAR': Coffee,
    'COMIDA RAPIDA': Utensils,
    'DULCES/POSTRES': IceCream,
    'CAJA': Wallet,
    'default': Shield
  };

  const stationColors = {
    'Bar': 'from-blue-600 to-cyan-500',
    'Comida Rápida': 'from-amber-600 to-orange-500',
    'Dulces / Postres': 'from-pink-600 to-rose-500',
    'Caja': 'from-emerald-600 to-teal-500',
    'BAR': 'from-blue-600 to-cyan-500',
    'COMIDA RAPIDA': 'from-amber-600 to-orange-500',
    'DULCES/POSTRES': 'from-pink-600 to-rose-500',
    'CAJA': 'from-emerald-600 to-teal-500',
    'default': 'from-slate-600 to-slate-400'
  };

  const handleNumberClick = (num) => {
    if (pin.length < 4 && !isVerifying) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) verifyGlobalPin(newPin);
    }
  };

  const verifyGlobalPin = async (inputPin) => {
    setIsVerifying(true);
    // Secure verification via Supabase RPC/Select
    const user = await verifyPin(inputPin);
    
    if (user) {
      setIdentifiedUser(user);
      // Brief delay to show who was identified
      setTimeout(() => {
        login(user.role, user.station);
        if (user.role === 'admin' || user.role === 'catalogo' || user.role === 'contador') {
          navigate('/admin');
        } else {
          if (user.role === 'vendedor') {
            navigate('/pos');
          } else {
            navigate('/menu');
          }
        }
      }, 800);
    } else {
      setError('PIN Incorrecto');
      setTimeout(() => { 
        setPin(''); 
        setError(''); 
        setIsVerifying(false);
      }, 1000);
    }
  };

  const clearLast = () => setPin(prev => prev.slice(0, -1));

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-900 to-slate-950">
      
      <div className="text-center mb-8 sm:mb-12">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }}
          className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-500/10 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6 border border-emerald-500/20"
        >
           <Lock className="text-emerald-500" size={28} />
        </motion.div>
        <h1 className="text-2xl sm:text-5xl lg:text-6xl font-black italic tracking-tighter mb-1 leading-none uppercase">MANOLO <span className="text-emerald-500">FOODTRUCK</span></h1>
        <h2 className="text-base sm:text-xl lg:text-2xl font-black text-slate-500 uppercase tracking-widest mb-4 italic">PARK</h2>
        
        {/* Connection Status Indicator */}
        <div className="flex justify-center mt-4">
           {connectionError ? (
             <motion.button 
               onClick={refreshData}
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }}
               className="flex items-center gap-3 px-6 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 hover:bg-red-500/20 transition-all group"
             >
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest">Sin Conexión - Reintentar</span>
             </motion.button>
           ) : loadingOrders ? (
             <div className="flex items-center gap-3 px-6 py-3 bg-slate-900 border border-white/5 rounded-2xl text-slate-400">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/60">Actualizando Datos...</span>
             </div>
           ) : null}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {identifiedUser ? (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center"
          >
             <div className={`p-8 bg-gradient-to-br ${stationColors[identifiedUser.station] || stationColors.default} rounded-[3rem] shadow-2xl mb-6`}>
                {React.createElement(stationIcons[identifiedUser.station] || stationIcons.default, { size: 64, className: "text-white" })}
             </div>
             <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white mb-2">{identifiedUser.name}</h2>
             <p className="text-emerald-500 font-black uppercase tracking-widest text-sm">Bienvenido, Accediendo...</p>
          </motion.div>
        ) : (
          <motion.div 
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-sm flex flex-col items-center"
          >
            <div className="flex gap-4 mb-12">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-all duration-300 ${pin.length >= i ? 'bg-white border-white' : 'border-slate-800 bg-slate-950'}`}>
                  {pin.length >= i && <div className="w-3 h-3 bg-slate-950 rounded-full" />}
                </div>
              ))}
            </div>

            {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 font-black uppercase tracking-widest text-xs mb-8">{error}</motion.p>}

            <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full mb-4 sm:mb-8 scale-95 sm:scale-100 max-w-[320px] sm:max-w-none">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button key={num} onClick={() => handleNumberClick(num.toString())} className="h-14 sm:h-20 bg-slate-900 rounded-2xl sm:rounded-3xl font-black text-2xl sm:text-3xl hover:bg-slate-800 active:scale-90 transition-all border border-slate-800/50 shadow-lg">{num}</button>
              ))}
              <div />
              <button onClick={() => handleNumberClick('0')} className="h-14 sm:h-20 bg-slate-900 rounded-2xl sm:rounded-3xl font-black text-2xl sm:text-3xl hover:bg-slate-800 active:scale-90 transition-all border border-slate-800/50 shadow-lg">0</button>
              <button onClick={clearLast} className="h-14 sm:h-20 bg-slate-900 rounded-2xl sm:rounded-3xl flex items-center justify-center hover:bg-red-500/20 text-slate-500 hover:text-red-500 transition-all border border-slate-800/50"><Delete size={28} /></button>
            </div>
            
            <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest mb-10">Ingresa tu PIN Personal</p>

            <button 
              onClick={() => navigate('/menu')}
              className="w-full py-5 bg-slate-900/50 border border-slate-800 rounded-3xl flex items-center justify-center gap-3 text-emerald-500 font-black uppercase text-[10px] tracking-[0.2em] hover:bg-emerald-500/10 transition-all active:scale-95"
            >
               <ShoppingCart size={18} /> Ver Menú Digital (Clientes)
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative mt-auto pt-8 flex flex-col items-center gap-2">
         <div className="text-[10px] text-slate-700 font-black uppercase tracking-[0.5em] opacity-30 text-center">System Version 4.1.0 • Unified Auth</div>
         <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="text-[8px] text-red-500/40 font-black uppercase tracking-widest hover:text-red-500 transition-all">Limpiar Sistema / Reset</button>
      </div>
    </div>
  );
};

export default LoginPage;
