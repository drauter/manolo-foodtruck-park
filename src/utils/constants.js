export const STATIONS = {
  BAR: 'BAR',
  COMIDA_RAPIDA: 'COMIDA RAPIDA',
  POSTRES: 'POSTRES',
  CAJA: 'CAJA'
};

export const STATION_LABELS = {
  [STATIONS.BAR]: 'BAR',
  [STATIONS.COMIDA_RAPIDA]: 'COMIDA RAPIDA',
  [STATIONS.POSTRES]: 'POSTRES',
  [STATIONS.CAJA]: 'CAJA GENERAL'
};

export const STATION_COLORS = {
  [STATIONS.BAR]: 'blue',
  [STATIONS.COMIDA_RAPIDA]: 'amber',
  [STATIONS.POSTRES]: 'pink',
  [STATIONS.CAJA]: 'emerald'
};

export const getStationDisplay = (st, order = null) => {
  if (!st || st === 'TODAS') return st;
  
  const isCaja = st.toUpperCase() === 'CAJA';

  const mapLabel = (s) => STATION_LABELS[s] || s;

  if (isCaja && order) {
    const items = order.items || order.order_items || [];
    const stations = [...new Set(items.map(i => i.station).filter(Boolean))];
    
    if (stations.length === 0) return mapLabel(order.origin_station) || 'CAJA GENERAL';
    if (stations.length === 1) return mapLabel(stations[0]);
    
    const mappedStations = stations.map(s => mapLabel(s));
    const last = mappedStations.pop();
    return `${mappedStations.join(', ')} y ${last}`;
  }
  
  return mapLabel(st);
};
