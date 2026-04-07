export const STATIONS = {
  BAR: 'BAR',
  COMIDA_RAPIDA: 'COMIDA RAPIDA',
  DULCES_POSTRES: 'DULCES/POSTRES',
  CAJA: 'CAJA'
};

export const STATION_LABELS = {
  [STATIONS.BAR]: 'BAR / BEBIDAS',
  [STATIONS.COMIDA_RAPIDA]: 'COMIDA RAPIDA',
  [STATIONS.DULCES_POSTRES]: 'POSTRES / DULCES',
  [STATIONS.CAJA]: 'CAJA GENERAL'
};

export const STATION_COLORS = {
  [STATIONS.BAR]: 'blue',
  [STATIONS.COMIDA_RAPIDA]: 'amber',
  [STATIONS.DULCES_POSTRES]: 'pink',
  [STATIONS.CAJA]: 'emerald'
};

export const getStationDisplay = (st, order = null) => {
  if (!st || st === 'TODAS') return st;
  
  const isCaja = st.toUpperCase() === 'CAJA';

  if (isCaja && order) {
    const items = order.items || order.order_items || [];
    const stations = [...new Set(items.map(i => i.station).filter(Boolean))];
    
    if (stations.length === 0) return order.origin_station || 'CAJA';
    if (stations.length === 1) return stations[0];
    
    const last = stations.pop();
    return `${stations.join(', ')} y ${last}`;
  }
  
  return st;
};
