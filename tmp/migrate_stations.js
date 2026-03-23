import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function migrate() {
  console.log('Starting migration...');

  // Update products
  const { data: products, error: prodError } = await supabase
    .from('products')
    .update({ station: 'COMIDA RAPIDA' })
    .match({ station: 'COMIDA RÁPIDA' });
  
  if (prodError) console.error('Error updating products:', prodError);
  else console.log('Products updated.');

  // Update orders (station_statuses keys and payment_details keys)
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*');

  if (ordersError) {
    console.error('Error fetching orders:', ordersError);
    return;
  }

  for (const order of orders) {
    let updated = false;
    const newStatuses = {};
    const newDetails = {};

    if (order.station_statuses) {
      Object.entries(order.station_statuses).forEach(([k, v]) => {
        const newKey = k === 'COMIDA RÁPIDA' ? 'COMIDA RAPIDA' : k;
        if (newKey !== k) updated = true;
        newStatuses[newKey] = v;
      });
    }

    if (order.payment_details) {
      Object.entries(order.payment_details).forEach(([k, v]) => {
        const newKey = k === 'COMIDA RÁPIDA' ? 'COMIDA RAPIDA' : k;
        if (newKey !== k) updated = true;
        newDetails[newKey] = v;
      });
    }

    if (updated) {
      await supabase.from('orders')
        .update({ 
          station_statuses: newStatuses,
          payment_details: newDetails
        })
        .eq('id', order.id);
    }
  }
  console.log('Orders updated.');

  // Update order_items
  const { error: itemError } = await supabase
    .from('order_items')
    .update({ station: 'COMIDA RAPIDA' })
    .match({ station: 'COMIDA RÁPIDA' });

  if (itemError) console.error('Error updating order_items:', itemError);
  else console.log('Order items updated.');

  console.log('Migration finished.');
}

migrate();
