import {config} from './config.js';
import {validateMonuments, filterMonuments, debounce, createMarkerIndex} from './core.js';

const search = document.querySelector('#search');
const region = document.querySelector('#region');
const results = document.querySelector('#results');
const mapStatus = document.querySelector('#map-status');
const dataStatus = document.querySelector('#data-status');
const count = document.querySelector('#result-count');
const reset = document.querySelector('#reset-view');
const more = document.querySelector('#show-more');
const retry = document.querySelector('#retry-data');
const detailOverlay = document.querySelector('#monument-overlay');
const detailPanel = document.querySelector('#monument-panel');
const detailBody = document.querySelector('#monument-detail');
const closeDetail = document.querySelector('#close-monument');
let detailTrigger;
let map;
let markerIndex;
let monuments = [];
let filtered = [];
let displayed = 0;
const L = window.L;

function node(tag, text = '', className = '') {
  const el = document.createElement(tag);
  el.textContent = text;
  if (className) el.className = className;
  return el;
}

function message(el, text) {
  el.textContent = text;
  el.hidden = !text;
}

function externalLink(label, href) {
  const a = node('a', label);
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener';
  return a;
}

function photoPlaceholder() {
  return node('div', 'Фотография пока не добавлена', 'photo-placeholder');
}

// The same complete archive card works in the full-page dialog and map-free fallback.
function metaEntry(label, value) {
  const row = node('div', '', 'monument-meta-row');
  row.append(node('dt', label), node('dd', value));
  return row;
}

function content(item, isDialog = false) {
  const box = node('article', '', 'monument-popup');
  const heading = node('div', '', 'monument-heading');
  const title = node('h3', item.name);
  if (isDialog) title.id = 'monument-title';
  heading.append(title, node('p', item.location, 'monument-place'), node('p', item.region, 'monument-region'));

  const media = node('figure', '', 'monument-media');
  if (item.photo) {
    const img = node('img');
    img.alt = `Фотография памятника: ${item.name}`;
    img.decoding = 'async';
    img.addEventListener('load', () => {
      if (!isDialog || !detailBody.contains(img)) return;
      const ratio = img.naturalWidth / img.naturalHeight;
      detailPanel.dataset.orientation = ratio < 0.9 ? 'portrait' : ratio > 1.1 ? 'landscape' : 'square';
    });
    img.addEventListener('error', () => {
      img.replaceWith(node('div', 'Не удалось загрузить фотографию', 'photo-placeholder'));
      if (isDialog && !detailOverlay.hidden) detailPanel.dataset.orientation = 'none';
    }, {once: true});
    img.src = item.photo;
    media.append(img);
  } else {
    media.append(photoPlaceholder());
  }

  const info = node('div', '', 'monument-info');
  info.append(node('h4', 'История памятника'), node('p', item.description, 'monument-description'));
  const metadata = node('dl', '', 'monument-meta');
  if (item.photo) {
    metadata.append(
      metaEntry('Автор фотографии', item.photoAuthor),
      metaEntry('Источник фотографии', item.photoSource),
      metaEntry('Разрешение на публикацию', item.photoPermission),
    );
  }
  const [lat, lon] = item.coords;
  metadata.append(
    metaEntry('Координаты', `${lat.toFixed(6)}, ${lon.toFixed(6)}`),
    metaEntry('Код записи', item.id),
  );
  info.append(metadata);
  const links = node('div', '', 'monument-links');
  (item.sources ?? []).forEach((url, index) => links.append(externalLink(`Исторический источник ${index + 1} ↗`, url)));
  links.append(externalLink('Место на OpenStreetMap ↗', `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`));
  info.append(links);
  box.append(heading, media, info);
  return box;
}

function hideDetails(restoreFocus = false) {
  if (detailOverlay.hidden) return;
  detailOverlay.hidden = true;
  document.body.classList.remove('dialog-open');
  for (const element of [document.querySelector('header'), document.querySelector('main'), document.querySelector('footer')]) {
    if (element) element.inert = false;
  }
  if (restoreFocus) detailTrigger?.focus?.({preventScroll: true});
}

function trackMonument(item) {
  window.gtag?.('event', 'view_monument', {
    monument_id: item.id,
    monument_name: item.name,
    settlement: item.location.split(',')[0].trim(),
  });
}

function showDetails(item) {
  detailTrigger = document.activeElement;
  detailPanel.dataset.orientation = 'none';
  detailBody.replaceChildren(content(item, true));
  detailOverlay.hidden = false;
  document.body.classList.add('dialog-open');
  for (const element of [document.querySelector('header'), document.querySelector('main'), document.querySelector('footer')]) {
    if (element) element.inert = true;
  }
  closeDetail.focus({preventScroll: true});
  trackMonument(item);
}

function initialZoom() {
  map.setMinZoom(2);
  return map.getBoundsZoom(config.bounds, false, [28, 28]);
}

function overview() {
  if (!map) return;
  hideDetails();
  map.setMinZoom(initialZoom());
  map.fitBounds(config.bounds, {padding: [14, 14], animate: false});
}

function showMonument(item, updateHash = true) {
  if (updateHash) history.replaceState(null, '', `#${item.id}`);
  if (map) map.setView(item.coords, config.detailZoom, {animate: false});
  showDetails(item);
}

function setupMap() {
  if (!L) {
    message(mapStatus, 'Не удалось загрузить карту. Откройте описание памятника в каталоге.');
    document.querySelector('#map').hidden = true;
    reset.disabled = true;
    return;
  }
  map = L.map('map', {
    center: [48.0196, 66.9237], zoom: 4, minZoom: 2, maxZoom: config.maxZoom,
    scrollWheelZoom: true, maxBounds: config.bounds, maxBoundsViscosity: 1,
  });
  const tiles = L.tileLayer(config.tileUrl, {maxZoom: config.maxZoom, attribution: config.attribution});
  let tileErrors = 0;
  tiles.on('loading', () => { tileErrors = 0; });
  tiles.on('tileerror', () => {
    tileErrors++;
    message(mapStatus, 'Часть карты не загрузилась. Каталог доступен; точку можно открыть в OpenStreetMap из карточки.');
  });
  tiles.on('load', () => { if (!tileErrors) message(mapStatus, ''); });
  tiles.addTo(map);
  const layer = L.layerGroup().addTo(map);
  const icon = L.divIcon({
    className: 'star-icon-container', iconSize: [24, 24], iconAnchor: [12, 12], popupAnchor: [0, -9],
    html: '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#b32d35" stroke="#d7b474" stroke-width="1.5" stroke-linejoin="round"/></svg>',
  });
  const updateSettlementLabels = () => {
    document.querySelector('#map').classList.toggle('show-settlement-labels', map.getZoom() >= 10);
  };
  map.on('zoomend', updateSettlementLabels);
  markerIndex = createMarkerIndex(layer, item => {
    const marker = L.marker(item.coords, {icon, title: item.name, alt: item.name});
    marker.bindTooltip(node('span', item.location.split(',')[0].trim()), {
      permanent: true, direction: 'right', offset: [10, 0],
      className: 'settlement-label', interactive: false,
    });
    marker.on('click', () => {
      history.replaceState(null, '', `#${item.id}`);
      showDetails(item);
    });
    return marker;
  });
  overview();
  updateSettlementLabels();
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => map.invalidateSize({pan: false, debounceMoveend: true}))
      .observe(document.querySelector('#map-stage'));
  }
  map.on('resize', () => {
    map.setMinZoom(initialZoom());
    map.panInsideBounds(config.bounds, {animate: false});
  });
}

function appendPage() {
  // The catalog is only a fallback when the map cannot load.
  if (map) { more.hidden = true; return; }
  const next = filtered.slice(displayed, displayed + config.pageSize);
  next.forEach(item => {
    const article = node('article', '', 'result-card');
    article.append(node('h3', item.name), node('p', item.location));
    if (map) {
      const button = node('button', 'Показать на карте →');
      button.type = 'button';
      button.addEventListener('click', () => showMonument(item));
      article.append(button);
    } else {
      const details = node('details');
      details.append(node('summary', 'Открыть описание'));
      details.addEventListener('toggle', () => {
        if (details.open) trackMonument(item);
        if (details.open && !details.dataset.loaded) {
          details.append(content(item));
          details.dataset.loaded = 'true';
        }
      });
      article.append(details);
    }
    results.append(article);
  });
  displayed += next.length;
  more.hidden = displayed >= filtered.length;
  more.textContent = `Показать ещё (${Math.min(config.pageSize, filtered.length - displayed)})`;
}

function render() {
  filtered = filterMonuments(monuments, search.value, region.value);
  if (map) {
    hideDetails();
    markerIndex.sync(filtered);
  }
  const selectedId = location.hash.slice(1);
  if (monuments.some(item => item.id === selectedId) && !filtered.some(item => item.id === selectedId)) {
    history.replaceState(null, '', '#atlas');
  }
  results.hidden = Boolean(map);
  results.replaceChildren();
  results.scrollTop = 0;
  displayed = 0;
  count.textContent = `Найдено: ${filtered.length} · Всего в коллекции: ${monuments.length}`;
  if (!filtered.length) results.append(node('p', monuments.length ? 'Ничего не найдено. Измените запрос или выберите другой регион.' : 'В каталоге пока нет доступных записей.', 'muted'));
  appendPage();
}

function openHash() {
  const item = monuments.find(record => `#${record.id}` === location.hash);
  if (!item) return;
  delayedRender.cancel();
  search.value = '';
  region.value = '';
  render();
  showMonument(item, false);
}

async function loadCatalog() {
  retry.hidden = true;
  search.disabled = region.disabled = true;
  count.textContent = 'Загрузка каталога…';
  try {
    const response = await fetch(config.dataUrl, {signal: AbortSignal.timeout(15000)});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const {valid, errors} = validateMonuments(await response.json());
    monuments = valid;
    message(dataStatus, errors.length ? `Не удалось показать некоторые записи (${errors.length}). Остальной каталог доступен.` : '');
    if (errors.length) console.warn('Ошибки каталога:', errors);
    if (errors.length && !valid.length) retry.hidden = false;
    region.replaceChildren(new Option('Все регионы', ''));
    [...new Set(valid.map(item => item.region))].sort((a, b) => a.localeCompare(b, 'ru'))
      .forEach(value => region.append(new Option(value, value)));
    render();
    openHash();
  } catch (error) {
    console.error('Не удалось загрузить каталог:', error);
    count.textContent = 'Каталог недоступен';
    message(dataStatus, 'Не удалось загрузить список памятников. Проверьте соединение и повторите попытку.');
    retry.hidden = false;
  } finally {
    search.disabled = region.disabled = false;
  }
}

closeDetail.addEventListener('click', () => hideDetails(true));
detailOverlay.addEventListener('click', event => {
  if (event.target === detailOverlay) hideDetails(true);
});
document.addEventListener('keydown', event => {
  if (detailOverlay.hidden) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    hideDetails(true);
  }
  if (event.key === 'Tab') {
    const focusable = [...detailPanel.querySelectorAll('a[href], button:not([disabled])')];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});
const delayedRender = debounce(render, config.searchDelay);
search.addEventListener('input', delayedRender);
search.addEventListener('keydown', event => {
  if (event.key === 'Enter' && map) {
    event.preventDefault();
    delayedRender.cancel();
    render();
    if (filtered.length) showMonument(filtered[0]);
  }
});
region.addEventListener('change', () => { delayedRender.cancel(); render(); });
more.addEventListener('click', appendPage);
retry.addEventListener('click', loadCatalog);
reset.addEventListener('click', () => { overview(); history.replaceState(null, '', '#atlas'); });
window.addEventListener('hashchange', openHash);
document.querySelector('a[href="https://wa.me/77053211545"]')?.addEventListener('click', () => {
  window.gtag?.('event', 'contact_whatsapp', {contact_method: 'WhatsApp'});
});
setupMap();
loadCatalog();
