import {KAZAKHSTAN_BOUNDS} from './core.js';

export const config = {
  dataUrl: './data/monuments.json',
  bounds: KAZAKHSTAN_BOUNDS,
  tileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
  detailZoom: 14,
  pageSize: 30,
  searchDelay: 180,
};
