import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { STATIONS } from '../utils/constants';

const OrderContext = createContext();

const useOrder = () => useContext(OrderContext);

export const OrderProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [users, setUsers] = useState(() => {
    const savedUsers = typeof window !== 'undefined' ? localStorage.getItem('foodtruck_system_users') : null;
    return savedUsers ? JSON.parse(savedUsers) : [];
  });
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = typeof window !== 'undefined' ? localStorage.getItem('foodtruck_user') : null;
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [connectionError, setConnectionError] = useState(false);
  const [shifts, setShifts] = useState([]);
  const [printerConfig, setPrinterConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('foodtruck_printer_config');
      return saved ? JSON.parse(saved) : {
        [STATIONS.BAR]: { name: 'Páramo Bar', autoPrint: true, paperWidth: '58mm', connection: 'web', autoDownload: false },
        [STATIONS.COMIDA_RAPIDA]: { name: 'Páramo Cocina', autoPrint: true, paperWidth: '58mm', connection: 'web', autoDownload: false },
        [STATIONS.POSTRES]: { name: 'Páramo Postres', autoPrint: true, paperWidth: '58mm', connection: 'web', autoDownload: false },
        [STATIONS.CAJA]: { name: 'Páramo Caja', autoPrint: true, paperWidth: '80mm', connection: 'web', autoDownload: false },
      };
    } catch { return {}; }
  });

  // Voice State
  const announcedOrdersRef = React.useRef(new Set());
  const [selectedVoice, setSelectedVoice] = useState(() => localStorage.getItem('manolo_voice') || '');
  const [voices, setVoices] = useState([]);
  const [isVoicesLoaded, setIsVoicesLoaded] = useState(false);

  // Monitor voice changes (important for some browsers)
  useEffect(() => {
    const loadVoices = () => {
      const vList = window.speechSynthesis.getVoices();
      if (vList.length > 0) {
        setVoices(vList);
        setIsVoicesLoaded(true);
      }
    };
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
  }, []);
  const announcementQueue = React.useRef([]);
  const isSpeaking = React.useRef(false);

  // 1. Initial Data Fetching from Supabase
  const refreshData = async () => {
    setLoadingOrders(true);
    try {
      // Fetch Products
      const { data: productsData, error: prodError } = await supabase.from('products').select('*');
      if (productsData) setProducts(productsData);
      if (prodError) throw prodError;

      // Fetch Users (Safe columns only)
      const { data: usersData, error: userError } = await supabase.from('users').select('id, name, role, station');
      if (usersData) {
        setUsers(usersData);
        localStorage.setItem('foodtruck_system_users', JSON.stringify(usersData));
      }
      if (userError) throw userError;

      // Fetch Orders
      const { data: ordersData, error: orderError } = await supabase.from('orders').select('*, order_items(*, products(name, description))').order('timestamp', { ascending: false });
      if (ordersData) setOrders(ordersData.map(o => ({ ...o, items: o.order_items })));
      if (orderError) throw orderError;

      // Fetch Shifts
      const { data: shiftsData, error: shiftsError } = await supabase.from('shifts').select('*').order('timestamp', { ascending: false });
      if (shiftsData) setShifts(shiftsData);
      if (shiftsError) throw shiftsError;

      setConnectionError(false);
    } catch (err) {
      console.error('REFRESH DATA ERROR:', err);
      setConnectionError(true);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    refreshData();

    // Load Voices
    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) {
        setVoices(v.filter(voice => voice.lang.startsWith('es')));
      }
    };
    
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Aggressive engine priming: Resume on any interaction
    const primeEngine = () => {
      window.speechSynthesis.resume();
      window.removeEventListener('click', primeEngine);
      window.removeEventListener('keydown', primeEngine);
    };
    window.addEventListener('click', primeEngine);
    window.addEventListener('keydown', primeEngine);

    // 2. Real-time Subscription for Orders
    const ordersSubscription = supabase
      .channel('public:orders')
      .on('postgres_changes', { event: '*', table: 'orders' }, async (payload) => {
        // Immediate Voice Trigger: If an UPDATE shows a station became 'ready'
        if (payload.eventType === 'UPDATE' && payload.new.station_statuses) {
          const oldStatuses = payload.old?.station_statuses || {};
          const newStatuses = payload.new.station_statuses;
          
          Object.entries(newStatuses).forEach(([st, status]) => {
            if (status === 'ready' && oldStatuses[st] !== 'ready') {
              console.log('IMMEDIATE VOICE TRIGGER:', payload.new.ticket_number, st);
              announceOrder(payload.new, st, false);
            }
          });
        }

        const { data } = await supabase.from('orders').select('*, order_items(*, products(name, description))').order('timestamp', { ascending: false });
        if (data) setOrders(data.map(o => ({ ...o, items: o.order_items })));
      })
      .subscribe();

    // 3. Real-time Subscription for Order Items
    const orderItemsSubscription = supabase
      .channel('public:order_items')
      .on('postgres_changes', { event: '*', table: 'order_items' }, async () => {
        const { data, error } = await supabase.from('orders').select('*, order_items(*, products(name, description))').order('timestamp', { ascending: false });
        if (data) setOrders(data.map(o => ({ ...o, items: o.order_items })));
      })
      .subscribe();

    // 4. Real-time Subscription for Products
    const productsSubscription = supabase
      .channel('public:products')
      .on('postgres_changes', { event: '*', table: 'products' }, async () => {
        const { data } = await supabase.from('products').select('*');
        if (data) setProducts(data);
      })
      .subscribe();

    // 5. Real-time Subscription for Shifts
    const shiftsSubscription = supabase
      .channel('public:shifts')
      .on('postgres_changes', { event: '*', table: 'shifts' }, async () => {
        const { data } = await supabase.from('shifts').select('*').order('timestamp', { ascending: false });
        if (data) setShifts(data);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersSubscription);
      supabase.removeChannel(orderItemsSubscription);
      supabase.removeChannel(productsSubscription);
      supabase.removeChannel(shiftsSubscription);
    };
  }, []);

  // Save Config and User locally
  useEffect(() => {
    localStorage.setItem('foodtruck_printer_config', JSON.stringify(printerConfig));
  }, [printerConfig]);

  useEffect(() => {
    localStorage.setItem('foodtruck_user', JSON.stringify(currentUser));
  }, [currentUser]);


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

  const placeOrder = async (customerName, source = 'POS', totalPrice = 0, notes = '') => {
    if (!cart || cart.length === 0) {
      alert("No se puede procesar un pedido vacío.");
      return null;
    }

    // AUTO-CALC TOTAL PRICE if it's 0 or missing
    let calculatedTotal = totalPrice > 0 
      ? Number(totalPrice) 
      : cart.reduce((acc, item) => acc + (Number(item.price) * (Number(item.quantity) || 1)), 0);

    // Final safety check to avoid null/NaN in DB
    if (isNaN(calculatedTotal) || calculatedTotal === null) {
      calculatedTotal = 0;
    }

    const stationStatuses = {};
    const stations = [...new Set(cart.map(item => item.station))];
    stations.forEach(s => stationStatuses[s] = 'received');

    let createdOrderId = null;

    try {
      // 1. Calculate daily ticket number
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
        origin_station: currentUser?.station || source,
        total_price: calculatedTotal,
        status: 'received',
        station_statuses: stationStatuses,
        is_paid: false,
        notes: notes || '',
        timestamp: new Date().toISOString(),
        ticket_number: nextTicket
      };

      // 2. Insert Order Header
      const { data: order, error: orderError } = await supabase.from('orders').insert(newOrder).select().single();
      if (orderError) throw orderError;
      createdOrderId = order.id;

      // 3. Insert Order Items
      const itemsToInsert = cart.map(item => ({
        order_id: createdOrderId,
        product_id: item.id,
        quantity: item.quantity,
        price_at_time: item.price,
        station: item.station
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert);
      if (itemsError) {
        // Explicitly handle items error to trigger rollback in catch
        throw itemsError;
      }
      
      // 4. Fetch the full order with its items to return it
      const { data: fullOrder, error: fetchError } = await supabase
        .from('orders')
        .select('*, order_items(*, products(name, description))')
        .eq('id', createdOrderId)
        .single();

      if (fetchError) throw fetchError;

      clearCart();
      return { ...fullOrder, items: fullOrder.order_items };

    } catch (err) {
      console.error("FATAL ORDER ERROR:", err.message);
      
      // MANUAL ROLLBACK: Delete order header if it was created but items/fetch failed
      if (createdOrderId) {
        console.warn("INTEGRITY: Rolling back orphan order header", createdOrderId);
        await supabase.from('orders').delete().eq('id', createdOrderId);
      }

      alert("ERROR DE INTEGRIDAD: El pedido no se pudo completar. " + err.message);
      return null;
    }
  };

  const updateOrderStatus = (orderId, newStatus) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ));
  };

  const updateStationStatus = async (orderId, station, newStatus, paymentData = null) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // Use original station statuses. Only add 'CAJA' to statuses if it was already there (production station)
    const newStationStatuses = { ...order.station_statuses };
    if (order.station_statuses[station] !== undefined) {
      newStationStatuses[station] = newStatus;
    }

    // Update payment details
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

    // PAYMENT LOGIC: If 'CAJA' has paid, or if all individual stations have paid
    const isCajaPaid = newPaymentDetails['CAJA'];
    const allIndividualPaid = Object.keys(newStationStatuses).every(st => newPaymentDetails[st]);
    const allStationsPaid = isCajaPaid || allIndividualPaid;

    await supabase.from('orders').update({
      station_statuses: newStationStatuses,
      payment_details: newPaymentDetails,
      status: overallStatus,
      is_paid: !!allStationsPaid
    }).eq('id', orderId);

    setOrders(prev => prev.map(o => 
      o.id === orderId ? { ...o, station_statuses: newStationStatuses, payment_details: newPaymentDetails, status: overallStatus, is_paid: !!allStationsPaid } : o
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
  
  const resetSystem = async () => {
    const { error } = await supabase.from('orders').delete().filter('id', 'neq', '00000000-0000-0000-0000-000000000000'); // Delete all
    if (error) {
      console.error('ERROR RESETTING SYSTEM:', error);
      alert("Error al reiniciar sistema: " + error.message);
      return false;
    }
    setOrders([]);
    return true;
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
    try {
      const product = products.find(p => p.id === productId);
      if (!product) return;
      
      const { error } = await supabase.from('products').update({ 
        stock: (Number(product.stock) || 0) + Number(quantity) 
      }).eq('id', productId);
      
      if (error) throw error;
    } catch (err) {
      console.error('ERROR ADDING STOCK:', err);
      alert("Error al actualizar inventario: " + err.message);
    }
  };


  const deletePayment = async (orderId, station) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

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

    try {
      // 1. Persist to Supabase
      const { error } = await supabase.from('orders').update({
        payment_details: newPaymentDetails,
        station_statuses: newStationStatuses,
        is_paid: !!allStationsPaid,
        status: overallStatus
      }).eq('id', orderId);

      if (error) throw error;

      // 2. Update local state
      setOrders(prev => prev.map(o => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          payment_details: newPaymentDetails,
          station_statuses: newStationStatuses,
          is_paid: !!allStationsPaid,
          status: overallStatus
        };
      }));
    } catch (err) {
      console.error("Error deleting payment:", err.message);
      alert("Hubo un error al eliminar el pago en el servidor.");
    }
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
    const user = { role, station: station ? station.toUpperCase() : null };
    setCurrentUser(user);
    // Persisted via useEffect at line 167
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const getShiftTotals = (stationName) => {
    const isCaja = stationName === 'CAJA';
    
    const stationOrders = orders.filter(o => 
      o.status !== 'cancelled' && 
      o.payment_details && 
      o.payment_details[stationName]
    );
    
    return stationOrders.reduce((acc, o) => {
      const detail = o.payment_details[stationName];
      const method = detail.method || 'desconocido';
      
      let amount = 0;
      if (isCaja) {
        // For CAJA, we sum everything because it's a general collector
        amount = o.items?.reduce((sum, i) => sum + ((Number(i.price_at_time) || 0) * (Number(i.quantity) || 0)), 0) || 0;
        if (amount === 0) amount = Number(o.total_price) || 0;
      } else {
        // For individual stations, we only sum their items
        amount = o.items
          ?.filter(i => i.station === stationName)
          .reduce((sum, i) => sum + ((Number(i.price_at_time) || 0) * (Number(i.quantity) || 0)), 0) || 0;
      }
      
      acc[method] = (acc[method] || 0) + amount;
      acc.total = (acc.total || 0) + amount;
      return acc;
    }, { cash: 0, card: 0, transfer: 0, total: 0 });
  };

  const closeShift = async (stationName, actualCash, note = '', authorizedBy = null) => {
    const totals = getShiftTotals(stationName);

    const newShift = {
      station: stationName,
      timestamp: new Date().toISOString(),
      expected_sales: totals.total,
      expected_cash: totals.cash,
      payment_breakdown: totals,
      actual_cash: Number(actualCash),
      difference: Number(actualCash) - totals.cash,
      note: authorizedBy ? `[AUT: ${authorizedBy}] ${note}` : note
      // authorized_by column removed as it's missing from schema
    };

    const { data, error } = await supabase.from('shifts').insert(newShift).select();
    
    if (error) {
      console.error('ERROR CLOSING SHIFT:', error);
      alert("Error al cerrar turno: " + error.message);
      return null;
    }

    if (data) {
      setShifts(prev => [data[0], ...prev]);
      return data[0];
    }
  };

  const deleteShift = async (shiftId) => {
    const { error } = await supabase.from('shifts').delete().eq('id', shiftId);
    if (error) {
      console.error('ERROR DELETING SHIFT:', error);
      alert("Error al eliminar turno: " + error.message);
      return false;
    }
    setShifts(prev => prev.filter(s => s.id !== shiftId));
    return true;
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
    
    // RESTRICTION: Only the display route or manual triggers should play voice
    const isDisplayRoute = window.location.pathname.toLowerCase().includes('display');
    
    if (!manual && !isDisplayRoute) {
      isSpeaking.current = false;
      setTimeout(processQueue, 100);
      return;
    }
    
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
      
      // If no voices yet, wait a bit or use defaults
      if (allVoices.length === 0 && !isVoicesLoaded) {
          console.warn("Voices not loaded yet, rescheduling...");
          setTimeout(() => {
            isSpeaking.current = false;
            announcementQueue.current.unshift({ message, key, manual });
            processQueue();
          }, 1000);
          return;
      }

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
  }, [selectedVoice]);

  const announceOrder = React.useCallback((order, stationKey, manual = false) => {
    const announcementKey = `${order.id}-${stationKey}-ready`;
    
    if (!manual && announcedOrdersRef.current.has(announcementKey)) return;
    
    const ticket = order.ticket_number || '';
    const name = order.customer_name || 'Cliente';
    
    // Get unique ready stations if stationKey is not fixed
    const stations = [...new Set(Object.entries(order.station_statuses || {})
      .filter(([, s]) => s === 'ready')
      .map(([st]) => st))];
      
    let stationText = stationKey;
    if (stations.length > 0) {
      if (stations.length === 1) {
        stationText = stations[0];
      } else {
        const lastStation = stations.pop();
        stationText = `${stations.join(', ')} y ${lastStation}`;
      }
    }

    let message = '';
    if (order.is_paid) {
      message = `Orden número ${ticket}, cliente ${name}, su pedido de ${stationText} está listo. Por favor pasar a retirar.`;
    } else {
      message = `Orden número ${ticket}, cliente ${name}, su pedido de ${stationText} está listo. Por favor pasar por caja para pagar y retirar su pedido.`;
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

  const verifyPin = async (pin) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, role, station')
        .eq('pin', pin)
        .single();
      
      if (error || !data) return null;
      return data;
    } catch (err) {
      console.error('PIN Verification error:', err);
      return null;
    }
  };

  const verifyAdminPin = async (pin) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, role')
        .eq('pin', pin)
        .eq('role', 'admin')
        .single();
      
      if (error || !data) return false;
      return true;
    } catch {
      return false;
    }
  };

  return (
    <OrderContext.Provider value={{ 
      products, setProducts, addProduct, updateProduct, deleteProduct, addStock, uploadProductImage,
      cart, addToCart, removeFromCart, clearCart, placeOrder, 
      orders, loadingOrders, updateOrderStatus, updateStationStatus, updateOrder, cancelOrder, deleteOrder, deletePayment,
      resetSystem,
      markStationReady,
      currentUser, setCurrentUser, login, logout,
      shifts, setShifts, closeShift, deleteShift, getShiftTotals,
      users, setUsers, addUser, deleteUser, updateUser,
      printerConfig, updatePrinterConfig,
      voices, selectedVoice, setSelectedVoice, announceOrder,
      connectionError, setConnectionError, 
      verifyPin, verifyAdminPin,
      refreshData,
    }}>
      {children}
    </OrderContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export { OrderContext, useOrder };
