import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { OrderProvider } from './context/OrderContext';
import ClientMenu from './pages/ClientMenu';
import EmployeePanel from './pages/EmployeePanel';
import PublicDisplay from './pages/PublicDisplay';
import AdminPanel from './pages/AdminPanel';
import LoginPage from './pages/LoginPage';

import OrderTracking from './pages/OrderTracking';

import SellerPOS from './pages/SellerPOS';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-20 bg-slate-950 text-red-500 font-mono overflow-auto h-screen">
          <h1 className="text-4xl mb-4 text-white">¡UPS! ERROR DETECTADO</h1>
          <p className="mb-8 text-slate-400">Por favor, toma una captura de este mensaje para que pueda arreglarlo:</p>
          <div className="p-8 bg-black/40 rounded-3xl border border-red-500/20">
            <pre className="text-xl font-bold">{this.state.error?.toString()}</pre>
            <pre className="mt-6 text-[10px] opacity-40 leading-relaxed whitespace-pre-wrap">{this.state.error?.stack}</pre>
          </div>
          <button onClick={() => { localStorage.clear(); window.location.href='/'; }} className="mt-12 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest px-10 py-5 rounded-full shadow-2xl transition-all">LIMPIAR CACHÉ Y REINICIAR</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  React.useEffect(() => {
    document.title = "MANOLO FOODTRUCK PARK";
  }, []);

  return (
    <OrderProvider>
      <Router>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin/*" element={<AdminPanel />} />
            <Route path="/menu" element={<ClientMenu />} />
            <Route path="/pos" element={<SellerPOS />} />
            <Route path="/display" element={<PublicDisplay />} />
            <Route path="/tracking/:orderId" element={<OrderTracking />} />
            <Route path="/empleado/:station" element={<EmployeePanel />} />
          </Routes>
        </ErrorBoundary>
      </Router>
    </OrderProvider>
  );
}

export default App;
