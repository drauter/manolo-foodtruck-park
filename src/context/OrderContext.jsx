import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const OrderContext = createContext();

const useOrder = () => useContext(OrderContext);

export const OrderProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = typeof window !== 'undefined' ? localStorage.getItem('foodtruck_user') : null;
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [shifts, setShifts] = useState([]);
  const [printerConfig, setPrinterConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('foodtruck_printer_config');
      return saved ? JSON.parse(saved) : {
        'BAR': { name: 'Páramo Bar', autoPrint: true, paperWidth: '58mm', connection: 'web', autoDownload: false },
        'COMIDA RÁPIDA': { name: 'Páramo Cocina', autoPrint: true, paperWidth: '58mm', connection: 'web', autoDownload: false },
        'DULCES/POSTRES': { name: 'Páramo Postres', autoPrint: true, paperWidth: '58mm', connection: 'web', autoDownload: false },
        'CAJA': { name: 'Páramo Caja', autoPrint: true, paperWidth: '80mm', connection: 'web', autoDownload: false },
      };
    } catch (e) { return {}; }
  });

  // 1. Initial Data Fetching from Supabase
  useEffect(() => {
    const fetchData = async () => {
      // Fetch Products
      const { data: productsData } = await supabase.from('products').select('*');
      if (productsData && productsData.length > 0) {
        setProducts(productsData);
      } else {
        // Seed if empty
        const initialProducts = [
          { name: 'Burger Clásica', description: 'Carne, queso, lechuga y tomate.', price: 1200, category: 'Burgers', station: 'COMIDA RÁPIDA', image_url: '/burger.png' },
          { name: 'Coca Cola 500ml', description: 'Bebida gaseosa.', price: 400, category: 'Bebidas', station: 'BAR', image_url: '/soda.png' },
          { name: 'Mini Donas (6 uds)', description: 'Glaseadas y con chispas.', price: 800, category: 'Postres', station: 'DULCES/POSTRES', image_url: '/donas.png' },
        ];
        const { data: seeded } = await supabase.from('products').insert(initialProducts).select();
        if (seeded) setProducts(seeded);
      }

      // Fetch Users
      const { data: usersData } = await supabase.from('users').select('*');
      if (usersData && usersData.length > 0) {
        setUsers(usersData);
      } else {
        const initialUsers = [
          { name: 'Manolo Admin', role: 'admin', pin: '1234' },
          { name: 'Vendedor 1', role: 'vendedor', station: 'COMIDA RÁPIDA', pin: '0000' }
        ];
        const { data: seededUsers } = await supabase.from('users').insert(initialUsers).select();
        if (seededUsers) setUsers(seededUsers);
      }

      // Fetch Orders
      const { data: ordersData } = await supabase.from('orders').select('*, order_items(*, products(name, description))').order('timestamp', { ascending: false });
      if (ordersData) {
        setOrders(ordersData.map(o => ({ ...o, items: o.order_items })));
      }
    };

    fetchData();

    // 2. Real-time Subscription for Orders
    const ordersSubscription = supabase
      .channel('public:orders')
      .on('postgres_changes', { event: '*', table: 'orders' }, async () => {
        const { data } = await supabase.from('orders').select('*, order_items(*, products(name, description))').order('timestamp', { ascending: false });
        if (data) setOrders(data.map(o => ({ ...o, items: o.order_items })));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersSubscription);
    };
  }, []);

  // Save Config and User locally
  useEffect(() => {
    localStorage.setItem('foodtruck_printer_config', JSON.stringify(printerConfig));
  }, [printerConfig]);

  useEffect(() => {
    localStorage.setItem('foodtruck_user', JSON.stringify(currentUser));
  }, [currentUser]);

  // Old local storage effects removed as data is now from Supabase
  // useEffect(() => {
  //   localStorage.setItem('foodtruck_orders', JSON.stringify(orders));
  //   localStorage.setItem('foodtruck_products', JSON.stringify(products));
  //   localStorage.setItem('foodtruck_shifts', JSON.stringify(shifts));
  //   localStorage.setItem('foodtruck_printer_config', JSON.stringify(printerConfig));
  // }, [orders, products, shifts, users, printerConfig]);
  // useEffect(() => localStorage.setItem('foodtruck_user', JSON.stringify(currentUser)), [currentUser]);
  // useEffect(() => localStorage.setItem('foodtruck_system_users', JSON.stringify(users)), [users]);

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

  const placeOrder = async (customerName, source = 'client', notes = '') => {
    if (cart.length === 0) return;

    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const stationStatuses = {};
    const stations = [...new Set(cart.map(item => item.station))];
    stations.forEach(s => stationStatuses[s] = 'received');

    const newOrder = {
      customer_name: customerName,
      source,
      total_price: totalPrice,
      status: 'received',
      station_statuses: stationStatuses,
      is_paid: false,
      notes: notes || '',
      timestamp: new Date().toISOString()
    };

    const { data: order, error } = await supabase.from('orders').insert(newOrder).select().single();
    if (error) return console.error(error);

    const itemsToInsert = cart.map(item => ({
      order_id: order.id,
      product_id: item.id,
      quantity: item.quantity,
      price_at_time: item.price,
      station: item.station
    }));

    await supabase.from('order_items').insert(itemsToInsert);
    
    // Fetch the full order with its items to return it
    const { data: fullOrder } = await supabase
      .from('orders')
      .select('*, order_items(*, products(name, description))')
      .eq('id', order.id)
      .single();

    clearCart();
    return { ...fullOrder, items: fullOrder.order_items };
  };

  const updateOrderStatus = (orderId, newStatus) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ));
  };

  const updateStationStatus = async (orderId, station, newStatus, paymentData = null) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const newStationStatuses = { ...order.station_statuses, [station]: newStatus };
    const newPaymentDetails = paymentData 
      ? { ...order.payment_details, [station]: paymentData }
      : order.payment_details;

    // Determine overall status
    const statuses = Object.values(newStationStatuses);
    let overallStatus = 'received';
    const allReadyOrDone = statuses.every(s => s === 'ready' || s === 'delivered');
    const allDelivered = statuses.every(s => s === 'delivered');
    
    if (allDelivered) overallStatus = 'delivered';
    else if (allReadyOrDone) overallStatus = 'ready';
    else if (statuses.some(s => s === 'preparing' || s === 'ready' || s === 'delivered')) overallStatus = 'preparing';

    const allStationsPaid = Object.keys(newStationStatuses).every(st => newPaymentDetails[st]);

    await supabase.from('orders').update({
      station_statuses: newStationStatuses,
      payment_details: newPaymentDetails,
      status: overallStatus,
      is_paid: allStationsPaid
    }).eq('id', orderId);
  };

  const updateOrder = (orderId, updatedOrder) => {
    setOrders(prev => prev.map(order => {
      if (order.id !== orderId) return order;
      
      // Handle stock adjustments if items changed
      // (This is a simplified version, in a real app we'd diff items)
      return { ...order, ...updatedOrder };
    }));
  };

  const cancelOrder = async (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    // Return items to stock logic
    for (const item of order.items || []) {
      const product = products.find(p => p.id === item.product_id);
      if (product) {
        await supabase.from('products').update({ stock: (product.stock || 0) + item.quantity }).eq('id', product.id);
      }
    }

    const newStationStatuses = {};
    Object.keys(order.station_statuses || {}).forEach(k => newStationStatuses[k] = 'cancelled');

    await supabase.from('orders').update({ 
      status: 'cancelled', 
      station_statuses: newStationStatuses 
    }).eq('id', orderId);
  };

  const markStationReady = (orderId, station) => {
    updateStationStatus(orderId, station, 'ready');
  };

  const deleteOrder = async (orderId) => {
    await supabase.from('orders').delete().eq('id', orderId);
  };

  const updateProduct = async (id, updates) => {
    const { data: updatedProd, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      console.error('ERROR UPDATING PRODUCT:', error);
      alert("Error al actualizar producto: " + error.message);
      return null;
    }

    if (updatedProd) {
      setProducts(prev => prev.map(p => p.id === id ? updatedProd[0] : p));
      return updatedProd[0];
    }
  };

  const deleteProduct = async (id) => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (!error) {
      setProducts(prev => prev.filter(p => p.id !== id));
      return true;
    }
  };

  const addStock = async (productId, quantity) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    await supabase.from('products').update({ stock: (Number(product.stock) || 0) + Number(quantity) }).eq('id', productId);
  };

  const deleteShift = (shiftId) => {
    setShifts(prev => prev.filter(s => s.id !== shiftId));
  };

  const deletePayment = (orderId, station) => {
    setOrders(prev => prev.map(order => {
      if (order.id !== orderId) return order;
      
      const newPaymentDetails = { ...(order.payment_details || {}) };
      delete newPaymentDetails[station];
      
      const newStationStatuses = { ...order.station_statuses };
      if (newStationStatuses[station] === 'delivered') {
        newStationStatuses[station] = 'ready'; // Revert to ready if payment is deleted
      }

      // Re-evaluate global status and isPaid
      const statuses = Object.values(newStationStatuses);
      const anyPaid = Object.keys(newPaymentDetails).length > 0;
      
      return {
        ...order,
        payment_details: newPaymentDetails,
        station_statuses: newStationStatuses,
        is_paid: anyPaid,
        status: statuses.every(s => s === 'delivered') ? 'delivered' : (statuses.every(s => s === 'ready' || s === 'delivered') ? 'ready' : 'preparing')
      };
    }));
  };

  const addProduct = async (newProductData) => {
    const { data: newProd, error } = await supabase
      .from('products')
      .insert([newProductData])
      .select();

    if (error) {
      console.error('ERROR ADDING PRODUCT:', error);
      alert("Error al añadir producto: " + error.message);
      return null;
    }

    if (newProd) {
      setProducts(prev => [...prev, newProd[0]]);
      return newProd[0];
    }
  };

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 800;

          if (width > height && width > maxDim) {
            height *= maxDim / width;
            width = maxDim;
          } else if (height > maxDim) {
            width *= maxDim / height;
            height = maxDim;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
              type: 'image/webp',
              lastModified: Date.now()
            }));
          }, 'image/webp', 0.8);
        };
      };
    });
  };

  const uploadProductImage = async (file) => {
    try {
      const compressedFile = await compressImage(file);
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.webp`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, compressedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      console.error('DETAILED UPLOAD ERROR:', err);
      // We can't easily show the console to the user, but we can alert the message
      if (err.message) alert("Error técnico: " + err.message);
      return null;
    }
  };

  const login = (role, station = null) => {
    let normalizedStation = station ? station.toUpperCase() : null;
    if (normalizedStation === 'COMIDA RAPIDA') normalizedStation = 'COMIDA RÁPIDA';
    
    const user = { role, station: normalizedStation };
    setCurrentUser(user);
    localStorage.setItem('foodtruck_user', JSON.stringify(user));
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const closeShift = (stationName, actualCash) => {
    const stationOrders = orders.filter(o => 
      o.station_statuses && o.station_statuses[stationName] === 'delivered'
    );
    
    const paymentMethods = stationOrders.reduce((acc, o) => {
      const detail = o.payment_details ? o.payment_details[stationName] : null;
      const method = detail ? detail.method : 'desconocido';
      const itemsTotal = o.items
        .filter(i => i.station === stationName)
        .reduce((sum, i) => sum + ((Number(i.price_at_time) || 0) * (Number(i.quantity) || 0)), 0);
      
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

  const addUser = async (userData) => {
    await supabase.from('users').insert(userData);
  };

  const deleteUser = async (userId) => {
    await supabase.from('users').delete().eq('id', userId);
  };

  const updatePrinterConfig = (station, config) => {
    setPrinterConfig(prev => ({
      ...prev,
      [station]: { ...prev[station], ...config }
    }));
  };

  return (
    <OrderContext.Provider value={{ 
      products, setProducts, addProduct, updateProduct, deleteProduct, addStock, uploadProductImage,
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

export { OrderContext, useOrder };