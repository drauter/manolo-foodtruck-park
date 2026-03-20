import React, { createContext, useContext, useState, useEffect } from 'react';

const OrderContext = createContext();

export const useOrder = () => useContext(OrderContext);

export const OrderProvider = ({ children }) => {
  const [products, setProducts] = useState(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('foodtruck_products') : null;
      return saved ? JSON.parse(saved) : [
        { id: 1, name: 'Burger Clásica', description: 'Carne, queso, lechuga y tomate.', price: 1200, cost: 450, stock: 50, category: 'Burgers', station: 'COMIDA RÁPIDA', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=300&h=200&auto=format&fit=crop' },
        { id: 2, name: 'Burger Doble Queso', description: 'Doble carne, doble cheddar.', price: 1500, cost: 600, stock: 30, category: 'Burgers', station: 'COMIDA RÁPIDA', image: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?q=80&w=300&h=200&auto=format&fit=crop' },
        { id: 3, name: 'Papas Fritas', description: 'Porción grande crujiente.', price: 600, cost: 150, stock: 100, category: 'Complementos', station: 'COMIDA RÁPIDA', image: 'https://images.unsplash.com/photo-1630384066252-42a11f893f3c?q=80&w=300&h=200&auto=format&fit=crop' },
        { id: 4, name: 'Coca Cola 500ml', description: 'Bebida gaseosa.', price: 400, cost: 200, stock: 48, category: 'Bebidas', station: 'BAR', image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=300&h=200&auto=format&fit=crop' },
        { id: 5, name: 'Mini Donas (6 uds)', description: 'Glaseadas y con chispas.', price: 800, cost: 250, stock: 20, category: 'Postres', station: 'DULCES/POSTRES', image: 'https://images.unsplash.com/photo-1551024601-bec78acc704b?q=80&w=300&h=200&auto=format&fit=crop' },
      ];
    } catch (e) {
      console.error("Error loading products", e);
      return [];
    }
  });

  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('foodtruck_orders') : null;
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Error loading orders", e);
      return [];
    }
  });
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = typeof window !== 'undefined' ? localStorage.getItem('foodtruck_user') : null;
    if (savedUser && savedUser !== 'null') {
      try {
        const user = JSON.parse(savedUser);
        if (user) {
          // Normalize station for consistency
          if (user.station === 'Comida Rápida') user.station = 'COMIDA RÁPIDA';
          else if (user.station === 'Bar') user.station = 'BAR';
          else if (user.station === 'Dulces / Postres' || user.station === 'Dulces/Postres') user.station = 'DULCES/POSTRES';
          else if (user.station === 'Caja') user.station = 'CAJA';
          return user;
        }
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [shifts, setShifts] = useState(() => {
    try {
      const saved = localStorage.getItem('foodtruck_shifts');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Error loading shifts from local storage", e);
      return [];
    }
  });

  const [printerConfig, setPrinterConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('foodtruck_printer_config');
      return saved ? JSON.parse(saved) : {
        'BAR': { name: 'Páramo Bar', autoPrint: true },
        'COMIDA RÁPIDA': { name: 'Páramo Cocina', autoPrint: true },
        'DULCES/POSTRES': { name: 'Páramo Postres', autoPrint: true },
        'CAJA': { name: 'Páramo Caja', autoPrint: true },
      };
    } catch (e) {
      return {};
    }
  });
  const [users, setUsers] = useState([
    { id: '1', name: 'Manolo Admin', role: 'admin', pin: '1234' },
    { id: 'cat1', name: 'Gestor Catálogo', role: 'catalogo', pin: '5555' },
    { id: 'v1', name: 'Vendedor 1', role: 'vendedor', station: 'COMIDA RÁPIDA', pin: '0000' },
    { id: '4', name: 'Vendedor Sweet', role: 'vendedor', station: 'DULCES/POSTRES', pin: '3333' },
    { id: '5', name: 'Cajero Central', role: 'vendedor', station: 'CAJA', pin: '0000' },
  ]);

  // Load and Sync from local storage
  useEffect(() => {
    const savedOrders = localStorage.getItem('foodtruck_orders');
    const savedProducts = localStorage.getItem('foodtruck_products');
    const savedShifts = localStorage.getItem('foodtruck_shifts');
    const savedUser = localStorage.getItem('foodtruck_user');
    const savedUsers = localStorage.getItem('foodtruck_system_users');
    
    try {
      if (savedOrders) setOrders(JSON.parse(savedOrders));
      if (savedProducts) {
        const parsed = JSON.parse(savedProducts);
        if (Array.isArray(parsed)) {
          const normalized = parsed.map(p => {
            if (p.station === 'Comida Rápida') return { ...p, station: 'COMIDA RÁPIDA' };
            if (p.station === 'Bar') return { ...p, station: 'BAR' };
            if (p.station === 'Dulces / Postres' || p.station === 'Dulces/Postres') return { ...p, station: 'DULCES/POSTRES' };
            if (p.station === 'Caja') return { ...p, station: 'CAJA' };
            return p;
          });
          setProducts(normalized);
        }
      }
      if (savedShifts) setShifts(JSON.parse(savedShifts));
      if (savedUsers) {
        const parsed = JSON.parse(savedUsers);
        if (Array.isArray(parsed)) {
          const normalized = parsed.map(u => {
            if (u.station === 'Comida Rápida') return { ...u, station: 'COMIDA RÁPIDA' };
            if (u.station === 'Bar') return { ...u, station: 'BAR' };
            if (u.station === 'Dulces / Postres') return { ...u, station: 'DULCES/POSTRES' };
            if (u.station === 'Caja') return { ...u, station: 'CAJA' };
            return u;
          });
          setUsers(normalized);
        }
      }
    } catch (e) {
      console.error("Migration error:", e);
    }

    const handleStorageChange = (e) => {
      if (e.key === 'foodtruck_orders' && e.newValue) setOrders(JSON.parse(e.newValue));
      if (e.key === 'foodtruck_products' && e.newValue) setProducts(JSON.parse(e.newValue));
      if (e.key === 'foodtruck_system_users' && e.newValue) setUsers(JSON.parse(e.newValue));
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    localStorage.setItem('foodtruck_orders', JSON.stringify(orders));
    localStorage.setItem('foodtruck_products', JSON.stringify(products));
    localStorage.setItem('foodtruck_shifts', JSON.stringify(shifts));
    localStorage.setItem('foodtruck_printer_config', JSON.stringify(printerConfig));
  }, [orders, products, shifts, users, printerConfig]);
  useEffect(() => localStorage.setItem('foodtruck_user', JSON.stringify(currentUser)), [currentUser]);
  useEffect(() => localStorage.setItem('foodtruck_system_users', JSON.stringify(users)), [users]);

  const addToCart = (product, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item);
      }
      return [...prev, { ...product, quantity }];
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const clearCart = () => setCart([]);

  const placeOrder = (customerName = 'Visitante') => {
    if (cart.length === 0) return;
    
    // Check stock before placing
    const hasEnoughStock = cart.every(item => {
      const product = products.find(p => p.id === item.id);
      return product && product.stock >= item.quantity;
    });

    if (!hasEnoughStock) {
      alert("Lo sentimos, algunos productos no tienen suficiente stock.");
      return;
    }

    const stationsNeeded = [...new Set(cart.map(item => {
      const p = products.find(prod => prod.id === item.id);
      return p ? p.station : 'Comida Rápida';
    }))];

    const newOrder = {
      id: Date.now().toString(),
      ticketNumber: orders.length + 1,
      customerName,
      source: currentUser ? 'seller' : 'client',
      originStation: currentUser ? currentUser.station : null,
      items: cart.map(item => ({
        ...item,
        costAtTime: products.find(p => p.id === item.id)?.cost || 0,
        station: products.find(p => p.id === item.id)?.station || 'Comida Rápida'
      })),
      total: cart.reduce((acc, item) => acc + (item.price * item.quantity), 0),
      totalCost: cart.reduce((acc, item) => acc + ((products.find(p => p.id === item.id)?.cost || 0) * item.quantity), 0),
      status: 'received',
      isPaid: false, // Global payment status
      stationStatuses: stationsNeeded.reduce((acc, s) => ({ ...acc, [s]: 'received' }), {}),
      timestamp: new Date().toISOString(),
    };

    // Deduct stock
    setProducts(prev => prev.map(p => {
      const cartItem = cart.find(item => item.id === p.id);
      if (cartItem) {
        return { ...p, stock: p.stock - cartItem.quantity };
      }
      return p;
    }));

    setOrders(prev => [newOrder, ...prev]);
    setCart([]);
    return newOrder;
  };

  const updateOrderStatus = (orderId, newStatus) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ));
  };

  const updateStationStatus = (orderId, station, newStatus, paymentData = null) => {
    setOrders(prev => prev.map(order => {
      if (order.id !== orderId) return order;
      
      let newStat = newStatus;
      // If paying/registering an order that isn't ready yet, ensure it stays in production/preparing
      if (paymentData) {
        const currentStat = order.stationStatuses[station];
        if (currentStat === 'received' || currentStat === 'preparing') {
          newStat = 'preparing';
        } else if (currentStat === 'ready') {
          newStat = 'delivered';
        }
      }

      const newStationStatuses = { ...order.stationStatuses, [station]: newStat };
      const newPaymentDetails = paymentData 
        ? { ...(order.paymentDetails || {}), [station]: paymentData }
        : (order.paymentDetails || {});
      
      const statuses = Object.values(newStationStatuses);
      const allDelivered = statuses.every(s => s === 'delivered');
      const allReadyOrDone = statuses.every(s => s === 'ready' || s === 'delivered');
      
      let overallStatus = order.status;
      if (allDelivered) overallStatus = 'delivered';
      else if (allReadyOrDone) overallStatus = 'ready';
      else overallStatus = 'preparing';

      // An order is considered paid only if all station items are paid
      const allStationsPaid = Object.keys(newStationStatuses).every(st => newPaymentDetails[st]);
      const isPaid = allStationsPaid;

      return { 
        ...order, 
        stationStatuses: newStationStatuses,
        paymentDetails: newPaymentDetails,
        status: overallStatus,
        isPaid: isPaid
      };
    }));
  };

  const updateOrder = (orderId, updatedOrder) => {
    setOrders(prev => prev.map(order => {
      if (order.id !== orderId) return order;
      
      // Handle stock adjustments if items changed
      // (This is a simplified version, in a real app we'd diff items)
      return { ...order, ...updatedOrder };
    }));
  };

  const cancelOrder = (orderId) => {
    setOrders(prev => prev.map(order => {
      if (order.id === orderId) {
        // Return items to stock
        setProducts(prodPrev => prodPrev.map(p => {
          const item = order.items.find(i => i.id === p.id);
          if (item) return { ...p, stock: p.stock + item.quantity };
          return p;
        }));
        return { ...order, status: 'cancelled', stationStatuses: Object.keys(order.stationStatuses).reduce((acc, k) => ({ ...acc, [k]: 'cancelled' }), {}) };
      }
      return order;
    }));
  };

  const markStationReady = (orderId, station) => {
    updateStationStatus(orderId, station, 'ready');
  };

  const deleteOrder = (orderId) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
  };

  const updateProduct = (productId, updatedData) => {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...updatedData } : p));
  };

  const addStock = (productId, quantity) => {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: (Number(p.stock) || 0) + Number(quantity) } : p));
  };

  const deleteShift = (shiftId) => {
    setShifts(prev => prev.filter(s => s.id !== shiftId));
  };

  const deletePayment = (orderId, station) => {
    setOrders(prev => prev.map(order => {
      if (order.id !== orderId) return order;
      
      const newPaymentDetails = { ...(order.paymentDetails || {}) };
      delete newPaymentDetails[station];
      
      const newStationStatuses = { ...order.stationStatuses };
      if (newStationStatuses[station] === 'delivered') {
        newStationStatuses[station] = 'ready'; // Revert to ready if payment is deleted
      }

      // Re-evaluate global status and isPaid
      const statuses = Object.values(newStationStatuses);
      const anyPaid = Object.keys(newPaymentDetails).length > 0;
      
      return {
        ...order,
        paymentDetails: newPaymentDetails,
        stationStatuses: newStationStatuses,
        isPaid: anyPaid,
        status: statuses.every(s => s === 'delivered') ? 'delivered' : (statuses.every(s => s === 'ready' || s === 'delivered') ? 'ready' : 'preparing')
      };
    }));
  };

  const addProduct = (newProduct) => {
    setProducts(prev => [...prev, { ...newProduct, id: Date.now() }]);
  };

  const login = (role, station = null) => {
    let normalizedStation = station ? station.toUpperCase() : null;
    if (normalizedStation === 'COMIDA RAPIDA') normalizedStation = 'COMIDA RÁPIDA';
    
    console.log("Logging in with role:", role, "Original station:", station, "Normalized:", normalizedStation);
    const user = { role, station: normalizedStation };
    setCurrentUser(user);
    localStorage.setItem('foodtruck_user', JSON.stringify(user));
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const closeShift = (stationName, actualCash) => {
    const stationOrders = orders.filter(o => 
      o.stationStatuses && o.stationStatuses[stationName] === 'delivered'
    );
    
    const paymentMethods = stationOrders.reduce((acc, o) => {
      const detail = o.paymentDetails ? o.paymentDetails[stationName] : null;
      const method = detail ? detail.method : 'desconocido';
      const itemsTotal = o.items
        .filter(i => i.station === stationName)
        .reduce((sum, i) => sum + (i.price * i.quantity), 0);
      
      acc[method] = (acc[method] || 0) + itemsTotal;
      return acc;
    }, {});

    const totalSales = Object.values(paymentMethods).reduce((a, b) => a + b, 0);

    const newShift = {
      id: Date.now(),
      station: stationName,
      timestamp: new Date().toISOString(),
      expectedSales: totalSales,
      paymentBreakdown: paymentMethods,
      actualCash: Number(actualCash),
      difference: Number(actualCash) - (paymentMethods['cash'] || 0)
    };

    setShifts(prev => [newShift, ...prev]);
    return newShift;
  };

  const addUser = (userData) => {
    setUsers(prev => [...prev, { ...userData, id: Date.now().toString() }]);
  };

  const deleteUser = (userId) => {
    setUsers(users.filter(u => u.id !== userId));
  };

  const updatePrinterConfig = (station, config) => {
    setPrinterConfig(prev => ({
      ...prev,
      [station]: { ...prev[station], ...config }
    }));
  };

  return (
    <OrderContext.Provider value={{ 
      products, setProducts, addProduct, updateProduct, addStock,
      cart, addToCart, removeFromCart, clearCart, placeOrder, 
      orders, updateOrderStatus, updateStationStatus, updateOrder, cancelOrder, deleteOrder, deletePayment,
      markStationReady,
      currentUser, setCurrentUser, login, logout,
      shifts, setShifts, closeShift, deleteShift,
      users, setUsers, addUser, deleteUser,
      printerConfig, updatePrinterConfig
    }}>
      {children}
    </OrderContext.Provider>
  );
};
