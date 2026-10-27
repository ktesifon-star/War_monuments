'use strict';

// Add confirmed records here. Keep photo null until a permitted photo is available.
const monuments = [{
  id: 'almaty-memorial-slavy',
  name: 'Мемориал Славы',
  region: 'г. Алматы',
  location: 'г. Алматы, парк им. 28 гвардейцев-панфиловцев',
  coords: [43.259, 76.957],
  photo: null,
  description: 'Вечный огонь и мемориальный комплекс в честь героев-панфиловцев.'
}];

const search = document.querySelector('#search');
const region = document.querySelector('#region');
const results = document.querySelector('#results');
const status = document.querySelector('#map-status');
const reset = document.querySelector('#reset-view');
const kazakhstanBounds = [[40.56, 46.49], [55.45, 87.32]];
reset.textContent = 'Начальный масштаб';
reset.title = 'Вернуть карту к обзору Казахстана';
let map;
let markers;
const markerById = new Map();

function node(tag, text, className) {
  const el = document.createElement(tag);
  if (text) el.textContent = text;
  if (className) el.className = className;
  return el;
}
function normalize(value) { return value.toLocaleLowerCase('ru').replace(/ё/g, 'е').trim(); }
function photoPlaceholder() { return node('div', 'Фотография пока не добавлена', 'photo-placeholder'); }
function content(item) {
  const box = node('div', '', 'monument-popup');
  box.append(node('h3', item.name), node('p', item.location));
  if (item.photo) {
    const img = node('img');
    img.alt = item.name;
    img.addEventListener('error', () => img.replaceWith(photoPlaceholder()), {once:true});
    img.src = item.photo;
    box.append(img);
  } else box.append(photoPlaceholder());
  box.append(node('p', item.description));
  const link = node('a', 'Открыть точку в OpenStreetMap ↗');
  link.href = `https://www.openstreetmap.org/?mlat=${item.coords[0]}&mlon=${item.coords[1]}#map=17/${item.coords[0]}/${item.coords[1]}`;
  link.target = '_blank';
  link.rel = 'noopener';
  box.append(link);
  return box;
}
function initialZoom() {
  map.setMinZoom(2); // Recalculate freely when the viewport becomes narrower.
  return map.getBoundsZoom(kazakhstanBounds, false, [28, 28]);
}
function overview() {
  if (!map) return;
  map.closePopup();
  map.setMinZoom(initialZoom());
  map.fitBounds(kazakhstanBounds, {padding:[14,14], animate:false});
}
function showMonument(item, updateHash = true) {
  if (updateHash) history.replaceState(null, '', `#${item.id}`);
  if (!map) return;
  map.setView(item.coords, 14, {animate:false});
  markerById.get(item.id)?.openPopup();
  document.querySelector('#map').scrollIntoView({block:'center',behavior:'auto'});
}

if (typeof L !== 'undefined') {
  map = L.map('map', {center:[48.0196,66.9237],zoom:4,minZoom:2,maxZoom:19,scrollWheelZoom:true,maxBounds:kazakhstanBounds,maxBoundsViscosity:1.0});
  const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom:19,
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  });
  let tileErrors = 0;
  tiles.on('loading', () => { tileErrors = 0; });
  tiles.on('tileerror', () => {
    tileErrors++;
    status.hidden = false;
    status.textContent = 'Часть карты не загрузилась. Проверьте соединение или откройте точку в OpenStreetMap из карточки. Каталог остаётся доступен.';
  });
  tiles.on('load', () => { if (!tileErrors) status.hidden = true; });
  tiles.addTo(map);
  markers = L.layerGroup().addTo(map);
  overview();
  map.on('resize', () => {
    map.setMinZoom(initialZoom());
    map.panInsideBounds(kazakhstanBounds, {animate:false});
  });
} else {
  status.hidden = false;
  status.textContent = 'Не удалось загрузить интерактивную карту. Информация о памятниках доступна в каталоге ниже.';
  document.querySelector('#map').hidden = true;
  reset.disabled = true;
}

for (const value of [...new Set(monuments.map(item => item.region))].sort()) {
  const option = node('option', value);
  option.value = value;
  region.append(option);
}
function render() {
  const query = normalize(search.value);
  const filtered = monuments.filter(item => (!region.value || item.region === region.value) && normalize(`${item.name} ${item.location}`).includes(query));
  results.replaceChildren();
  if (markers) markers.clearLayers();
  markerById.clear();
  document.querySelector('#result-count').textContent = `Найдено: ${filtered.length} · Всего в коллекции: ${monuments.length}`;
  if (!filtered.length) results.append(node('p','Ничего не найдено. Измените запрос или выберите другой регион.','muted'));
  filtered.forEach(item => {
    const article = node('article', '', 'result-card');
    article.append(node('h3',item.name),node('p',item.location));
    if (map) {
      const icon = L.divIcon({className:'star-icon-container',iconSize:[24,24],iconAnchor:[12,12],popupAnchor:[0,-9],html:'<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#b32d35" stroke="#fff" stroke-width="1.5"/></svg>'});
      const marker = L.marker(item.coords,{icon,title:item.name,alt:item.name}).bindPopup(content(item),{maxWidth:260}).addTo(markers);
      marker.on('click', () => history.replaceState(null,'',`#${item.id}`));
      markerById.set(item.id,marker);
      const button = node('button','Показать на карте →');
      button.type = 'button';
      button.addEventListener('click', () => showMonument(item));
      article.append(button);
    } else article.append(content(item));
    results.append(article);
  });
}
search.addEventListener('input',render);
region.addEventListener('change',render);
reset.addEventListener('click',() => { overview();history.replaceState(null,'','#atlas'); });
render();
function openHash() {
  const selected = monuments.find(item => `#${item.id}` === location.hash);
  if (selected) { search.value='';region.value='';render();showMonument(selected,false); }
}
window.addEventListener('hashchange',openHash);
openHash();
