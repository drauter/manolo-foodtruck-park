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
        'COMIDA RAPIDA': { name: 'Páramo Cocina', autoPrint: true, paperWidth: '58mm', connection: 'web', autoDownload: false },
        'DULCES/POSTRES': { name: 'Páramo Postres', autoPrint: true, paperWidth: '58mm', connection: 'web', autoDownload: false },
        'CAJA': { name: 'Páramo Caja', autoPrint: true, paperWidth: '80mm', connection: 'web', autoDownload: false },
      };
    } catch { return {}; }
  });

  // Voice State
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(localStorage.getItem('preferredVoice') || '');
  const announcementQueue = React.useRef([]);
  const isSpeaking = React.useRef(false);
  const announcedOrdersRef = React.useRef(new Set());

  // 1. Initial Data Fetching from Supabase
  useEffect(() => {
    const fetchData = async () => {
      // Fetch Products
      const { data: productsData } = await supabase.from('products').select('*');
      if (productsData) {
        setProducts(productsData);
      }

      // Fetch Users
      const { data: usersData } = await supabase.from('users').select('*');
      if (usersData) {
        setUsers(usersData);
      }

      // Fetch Orders
      const { data: ordersData } = await supabase.from('orders').select('*, order_items(*, products(name, description))').order('timestamp', { ascending: false });
      if (ordersData) {
        setOrders(ordersData.map(o => ({ ...o, items: o.order_items })));
      }
    };

    fetchData();

    // Load Voices
    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) {
        console.log('Voices loaded:', v.length);
        setVoices(v.filter(voice => voice.lang.startsWith('es')));
      }
    };
    
    // Some browsers need this to fire
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Aggressive engine priming: Resume on any interaction
    const primeEngine = () => {
      window.speechSynthesis.resume();
      console.log('Speech engine primed (resume)');
      // After first interaction, we can stop listening
      window.removeEventListener('click', primeEngine);
      window.removeEventListener('keydown', primeEngine);
    };
    window.addEventListener('click', primeEngine);
    window.addEventListener('keydown', primeEngine);

    // 2. Real-time Subscription for Orders
    const ordersSubscription = supabase
      .channel('public:orders')
      .on('postgres_changes', { event: '*', table: 'orders' }, async () => {
        const { data } = await supabase.from('orders').select('*, order_items(*, products(name, description))').order('timestamp', { ascending: false });
        if (data) setOrders(data.map(o => ({ ...o, items: o.order_items })));
      })
      .subscribe();

    // 3. Real-time Subscription for Products
    const productsSubscription = supabase
      .channel('public:products')
      .on('postgres_changes', { event: '*', table: 'products' }, async () => {
        const { data } = await supabase.from('products').select('*');
        if (data) setProducts(data);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersSubscription);
      supabase.removeChannel(productsSubscription);
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

    // Calculate daily ticket number
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data: todayOrders } = await supabase
      .from('orders')
      .select('ticket_number')
      .gte('timestamp', today.toISOString())
      .order('ticket_number', { ascending: false })
      .limit(1);
    
    const nextTicket = (todayOrders?.[0]?.ticket_number || 0) + 1;

    const newOrder = {
      customer_name: customerName,
      source,
      total_price: totalPrice,
      status: 'received',
      station_statuses: stationStatuses,
      is_paid: false,
      notes: notes || '',
      timestamp: new Date().toISOString(),
      ticket_number: nextTicket
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

    setOrders(prev => prev.map(o => 
      o.id === orderId ? { ...o, station_statuses: newStationStatuses, payment_details: newPaymentDetails, status: overallStatus, is_paid: allStationsPaid } : o
    ));
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

    if (error) {
      console.error('ERROR DELETING PRODUCT:', error);
      if (error.code === '23503') {
        alert("No se puede eliminar el producto porque existen pedidos antiguos asociados a él. Prueba a cambiar el stock a 0 o desactivarlo.");
      } else {
        alert("Error al eliminar producto: " + error.message);
      }
      return false;
    }

    setProducts(prev => prev.filter(p => p.id !== id));
    return true;
  };

  const addStock = async (productId, quantity) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    await supabase.from('products').update({ stock: (Number(product.stock) || 0) + Number(quantity) }).eq('id', productId);
  };

  const deleteShift = (shiftId) => {
    setShifts(prev => prev.filter(s => s.id !== shiftId));
  };

  const deletePayment = async (orderId, station) => {
    setOrders(prev => prev.map(order => {
      if (order.id !== orderId) return order;
      
      const newPaymentDetails = { ...(order.payment_details || {}) };
      delete newPaymentDetails[station];
      
      const newStationStatuses = { ...order.station_statuses };
      if (newStationStatuses[station] === 'delivered') {
        newStationStatuses[station] = 'ready'; 
      }

      const statuses = Object.values(newStationStatuses);
      const allStationsPaid = Object.keys(newStationStatuses).every(st => newPaymentDetails[st]);
      
      let overallStatus = 'received';
      const allReadyOrDone = statuses.every(s => s === 'ready' || s === 'delivered');
      const allDelivered = statuses.every(s => s === 'delivered');
      
      if (allDelivered) overallStatus = 'delivered';
      else if (allReadyOrDone) overallStatus = 'ready';
      else if (statuses.some(s => s === 'preparing' || s === 'ready' || s === 'delivered')) overallStatus = 'preparing';

      // Persist to Supabase
      supabase.from('orders').update({
        payment_details: newPaymentDetails,
        station_statuses: newStationStatuses,
        is_paid: allStationsPaid,
        status: overallStatus
      }).eq('id', orderId).then(({ error }) => {
        if (error) console.error("Error persisting payment deletion:", error);
      });
      
      return {
        ...order,
        payment_details: newPaymentDetails,
        station_statuses: newStationStatuses,
        is_paid: allStationsPaid,
        status: overallStatus
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
      alert("Error al aÃ±adir producto: " + error.message);
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
      if (err.message) alert("Error tÃ©cnico: " + err.message);
      return null;
    }
  };

  const login = (role, station = null) => {
    let normalizedStation = station ? station.toUpperCase() : null;
    if (normalizedStation === 'COMIDA RAPIDA') normalizedStation = 'COMIDA RAPIDA';
    if (normalizedStation === 'COMIDA RAPIDA') normalizedStation = 'COMIDA RAPIDA';
    
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
    const { data, error } = await supabase.from('users').insert(userData).select();
    if (error) {
      console.error('ERROR ADDING USER:', error);
      alert("Error al añadir usuario: " + error.message);
      return null;
    }
    if (data) {
      setUsers(prev => [...prev, data[0]]);
      return data[0];
    }
  };

  const updateUser = async (id, updates) => {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      console.error('ERROR UPDATING USER:', error);
      alert("Error al actualizar usuario: " + error.message);
      return null;
    }

    if (data) {
      setUsers(prev => prev.map(u => u.id === id ? data[0] : u));
      return data[0];
    }
  };

  const deleteUser = async (userId) => {
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) {
       console.error('ERROR DELETING USER:', error);
       alert("Error al eliminar usuario: " + error.message);
       return;
    }
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const updatePrinterConfig = (station, config) => {
    setPrinterConfig(prev => ({
      ...prev,
      [station]: { ...prev[station], ...config }
    }));
  };

  // Voice Announcement Queue Logic
  const processQueue = React.useCallback(() => {
    if (announcementQueue.current.length === 0 || isSpeaking.current) return;
    
    isSpeaking.current = true;
    const { message, key, manual } = announcementQueue.current.shift();
    
    // Cross-tab lock check (Only for automatic announcements)
    if (!manual) {
      const now = Date.now();
      const lastAnnounceKey = `last_announce_${key}`;
      const lastAnnounceTime = localStorage.getItem(lastAnnounceKey);
      
      if (lastAnnounceTime && (now - parseInt(lastAnnounceTime)) < 60000) {
        isSpeaking.current = false;
        setTimeout(processQueue, 100);
        return;
      }
      localStorage.setItem(lastAnnounceKey, now.toString());
    }

    // Failsafe timeout: if speech gets stuck, reset isSpeaking after 20s
    const failsafe = setTimeout(() => {
      isSpeaking.current = false;
      processQueue();
    }, 20000);

    const speak = (text, isRepeat = false) => {
      const finalMessage = isRepeat ? `Repito. ${text}` : text;
      const utterance = new SpeechSynthesisUtterance(finalMessage);
      
      // Better voice selection: try selected, then any Spanish
      const allVoices = window.speechSynthesis.getVoices();
      let v = allVoices.find(voice => voice.voiceURI === selectedVoice);
      if (!v) v = allVoices.find(voice => voice.lang.startsWith('es'));
      
      if (v) {
        utterance.voice = v;
        utterance.lang = v.lang;
      } else {
        utterance.lang = 'es-ES';
      }
      
      utterance.rate = 0.85;
      
      utterance.onend = () => {
        if (!isRepeat) {
          setTimeout(() => speak(text, true), 1500);
        } else {
          clearTimeout(failsafe);
          isSpeaking.current = false;
          setTimeout(processQueue, 1000);
        }
      };

      utterance.onerror = (e) => {
        console.error('Speech Synthesis Error:', e);
        clearTimeout(failsafe);
        isSpeaking.current = false;
        setTimeout(processQueue, 500);
      };
      
      // Aggressive: Always resume before speaking
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(utterance);
      console.log('Speaking message:', finalMessage);
    };
    
    speak(message);
  }, [selectedVoice, voices]);

  const announceOrder = React.useCallback((order, stationKey, manual = false) => {
    const announcementKey = `${order.id}-${stationKey}-ready`;
    
    if (!manual && announcedOrdersRef.current.has(announcementKey)) return;
    
    const ticket = order.ticket_number || '';
    const name = order.customer_name || 'Cliente';
    
    let message = '';
    if (order.is_paid) {
      message = `Orden número ${ticket}, cliente ${name}, su pedido en la estación de ${stationKey} está listo. Por favor pasar a retirar.`;
    } else {
      message = `Orden número ${ticket}, cliente ${name}, su pedido en la estación de ${stationKey} está listo. Por favor pasar por caja para pagar y retirar su pedido.`;
    }

    if (!manual) announcedOrdersRef.current.add(announcementKey);
    
    announcementQueue.current.push({ message, key: announcementKey, manual });
    processQueue();
  }, [processQueue]);

  // Effect to handle automatic announcements when orders are ready
  useEffect(() => {
    if (!orders || orders.length === 0) return;
    
    orders.forEach(order => {
      if (order.station_statuses) {
        Object.entries(order.station_statuses).forEach(([station, status]) => {
          if (status === 'ready') {
            announceOrder(order, station, false);
          }
        });
      }
    });
  }, [orders, announceOrder]);

  return (
    <OrderContext.Provider value={{ 
      products, setProducts, addProduct, updateProduct, deleteProduct, addStock, uploadProductImage,
      cart, addToCart, removeFromCart, clearCart, placeOrder, 
      orders, updateOrderStatus, updateStationStatus, updateOrder, cancelOrder, deleteOrder, deletePayment,
      markStationReady,
      currentUser, setCurrentUser, login, logout,
      shifts, setShifts, closeShift, deleteShift,
      users, setUsers, addUser, deleteUser, updateUser,
      printerConfig, updatePrinterConfig,
      voices, selectedVoice, setSelectedVoice, announceOrder
    }}>
      {children}
    </OrderContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export { OrderContext, useOrder };
