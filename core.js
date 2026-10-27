// Pure functions shared by the browser, data validator and tests.
export const KAZAKHSTAN_BOUNDS = [[40.56, 46.49], [55.45, 87.32]];
export function normalize(value) {
  return String(value ?? '').toLocaleLowerCase('ru').replace(/ё/g, 'е').trim();
}

export function safePhotoPath(value) {
  return typeof value === 'string' && /^images\/[a-zA-Z0-9_/-]+\.(?:jpe?g|png|webp)$/i.test(value)
    && !value.includes('..');
}

function httpsUrl(value) {
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}

export function validateMonuments(input) {
  if (!Array.isArray(input)) return {valid: [], errors: ['Каталог должен быть массивом записей.']};
  const valid = [];
  const errors = [];
  const ids = new Set();
  input.forEach((record, index) => {
    const problems = [];
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      errors.push(`Запись ${index + 1}: ожидается объект.`);
      return;
    }
    for (const field of ['id', 'name', 'region', 'location', 'description']) {
      if (typeof record[field] !== 'string' || !record[field].trim()) problems.push(`не заполнено ${field}`);
    }
    if (typeof record.id === 'string' && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.id)) problems.push('некорректный id');
    if (ids.has(record.id)) problems.push('повторяющийся id');
    const coords = record.coords;
    if (!Array.isArray(coords) || coords.length !== 2 || !coords.every(Number.isFinite)
      || Math.abs(coords[0]) > 90 || Math.abs(coords[1]) > 180) problems.push('некорректные координаты [широта, долгота]');
    // This catalog is currently restricted to Kazakhstan's bounding rectangle.
    else if (coords[0] < KAZAKHSTAN_BOUNDS[0][0] || coords[0] > KAZAKHSTAN_BOUNDS[1][0]
      || coords[1] < KAZAKHSTAN_BOUNDS[0][1] || coords[1] > KAZAKHSTAN_BOUNDS[1][1]) problems.push('координаты вне рамки Казахстана');
    if (record.photo != null) {
      if (!safePhotoPath(record.photo)) problems.push('фото должно быть локальным файлом images/*.jpg, png или webp');
      for (const field of ['photoAuthor', 'photoSource', 'photoPermission']) {
        if (typeof record[field] !== 'string' || !record[field].trim()) problems.push(`для фото не заполнено ${field}`);
      }
    }
    if (record.sources != null && (!Array.isArray(record.sources) || !record.sources.every(httpsUrl))) problems.push('sources должен содержать HTTPS-ссылки');
    if (problems.length) {
      errors.push(`Запись ${index + 1} (${record.id ?? 'без id'}): ${problems.join('; ')}.`);
      return;
    }
    ids.add(record.id);
    valid.push({...record, searchText: normalize(`${record.name} ${record.location} ${record.region}`)});
  });
  return {valid, errors};
}

export function filterMonuments(records, query, region) {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  return records.filter(item => (!region || item.region === region)
    && terms.every(term => item.searchText.includes(term)));
}

export function debounce(callback, delay) {
  let timer;
  function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), delay);
  }
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}

// Cache marker instances; only add/remove the layers affected by a filter.
export function createMarkerIndex(layer, factory) {
  const cache = new Map();
  const visible = new Set();
  return {
    sync(records) {
      const wanted = new Set(records.map(item => item.id));
      for (const id of visible) {
        if (!wanted.has(id)) { layer.removeLayer(cache.get(id)); visible.delete(id); }
      }
      for (const item of records) {
        if (!cache.has(item.id)) cache.set(item.id, factory(item));
        if (!visible.has(item.id)) { layer.addLayer(cache.get(item.id)); visible.add(item.id); }
      }
    },
    get(id) { return cache.get(id); },
  };
}
