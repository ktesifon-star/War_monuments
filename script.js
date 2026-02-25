// 1. Координаты и границы
var southWest = L.latLng(40.0, 45.0);
var northEast = L.latLng(56.0, 88.0);
var bounds = L.latLngBounds(southWest, northEast);

var map = L.map('map', {
    center: [48.0196, 66.9237],
    zoom: 5,
    minZoom: 4,
    maxBounds: bounds,
    maxBoundsViscosity: 1.0
});

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// 2. ОПРЕДЕЛЯЕМ ЗВЕЗДУ (Важно: этот блок должен быть ВЫШЕ списка памятников)
var starIcon = L.divIcon({
    className: 'star-icon-container',
    html: `
        <svg width="30" height="30" viewBox="0 0 24 24" style="display: block;">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" 
                  fill="#cc0000" stroke="#c5a059" stroke-width="1.5"/>
        </svg>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
});

// 3. Список памятников
var monuments = [
    {
        name: "МЕМОРИАЛ СЛАВЫ",
        location: "г. Алматы, Парк им. 28 гвардейцев-панфиловцев",
        coords: [43.259, 76.957],
        photo: "images/park_28.jpg",
        description: "Вечный огонь и мемориальный комплекс в честь героев-панфиловцев."
    }
];

// 4. Отрисовка (Здесь мы явно указываем использовать starIcon)
monuments.forEach(function(item) {
    // ВНИМАНИЕ на { icon: starIcon } — это команда заменить каплю на звезду
    var marker = L.marker(item.coords, { icon: starIcon }).addTo(map);
    
    var popupContent = `
        <div style="font-family: 'Times New Roman', serif; text-align: center; width: 220px;">
            <h3 style="color: #002366; margin: 0; text-transform: uppercase; font-size: 1rem; border-bottom: 1px solid #c5a059;">${item.name}</h3>
            <p style="margin: 8px 0; font-size: 0.9rem;"><b>${item.location}</b></p>
            <img src="${item.photo}" alt="${item.name}" style="width: 100%; border-radius: 8px; margin-bottom: 8px; border: 1px solid #c5a059;">
            <p style="font-size: 0.85rem; color: #333; line-height: 1.3;">${item.description}</p>
        </div>
    `;
    marker.bindPopup(popupContent);
});
