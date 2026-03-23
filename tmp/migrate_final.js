import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root
dotenv.config({ path: path.join(__dirname, '../.env') });

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Supabase credentials not found in .env');
  process.exit(1);
}

const supabase = createClient(url, key);

async function migrate() {
  console.log('Starting migration...');

  // 1. Update Products
  console.log('Updating products...');
  const { data: pData, error: pErr } = await supabase.from('products').select('id, station');
  if (pErr) console.error(pErr);
  else {
    for (const p of pData) {
      if (p.station === 'COMIDA RÁPIDA') {
        const { error } = await supabase.from('products').update({ station: 'COMIDA RAPIDA' }).eq('id', p.id);
        if (error) console.error(`Error updating product ${p.id}:`, error);
      }
    }
  }
  console.log('Products check finished.');

  // 2. Update Orders
  console.log('Updating orders...');
  const { data: oData, error: oErr } = await supabase.from('orders').select('*');
  if (oErr) console.error(oErr);
  else {
    for (const order of oData) {
      let updated = false;
      const newStatuses = {};
      const newDetails = {};

      if (order.station_statuses) {
        Object.entries(order.station_statuses).forEach(([k, v]) => {
          const newKey = (k === 'COMIDA RÁPIDA' || k === 'COMIDA RÃPIDA') ? 'COMIDA RAPIDA' : k;
          if (newKey !== k) updated = true;
          newStatuses[newKey] = v;
        });
      }

      if (order.payment_details) {
        Object.entries(order.payment_details).forEach(([k, v]) => {
          const newKey = (k === 'COMIDA RÁPIDA' || k === 'COMIDA RÃPIDA') ? 'COMIDA RAPIDA' : k;
          if (newKey !== k) updated = true;
          newDetails[newKey] = v;
        });
      }

      if (updated) {
        const { error } = await supabase.from('orders')
          .update({ station_statuses: newStatuses, payment_details: newDetails })
          .eq('id', order.id);
        if (error) console.error(`Error updating order ${order.id}:`, error);
      }
    }
  }
  console.log('Orders check finished.');

  // 3. Update Order Items
  console.log('Updating order items...');
  const { data: iData, error: iErr } = await supabase.from('order_items').select('id, station');
  if (iErr) console.error(iErr);
  else {
    for (const item of iData) {
       if (item.station === 'COMIDA RÁPIDA' || item.station === 'COMIDA RÃPIDA') {
         const { error } = await supabase.from('order_items').update({ station: 'COMIDA RAPIDA' }).eq('id', item.id);
         if (error) console.error(`Error updating item ${item.id}:`, error);
       }
    }
  }
  console.log('Order items check finished.');

  console.log('Migration COMPLETED.');
}

migrate();
