// 1. Настройка границ и инициализация (оставляем как было)
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

// --- ВАША БАЗА ДАННЫХ (СПИСОК ПАМЯТНИКОВ) ---
var monuments = [
    {
        name: "МЕМОРИАЛ СЛАВЫ",
        location: "г. Алматы, Парк им. 28 гвардейцев-панфиловцев",
        coords: [43.259, 76.957],
        photo: "images/park_28.jpg", // Путь к фото в вашей папке
        description: "Вечный огонь и мемориальный комплекс в честь героев-панфиловцев."
    },
    {
        name: "ПАМЯТНИК АЛИЕ МОЛДАГУЛОВОЙ",
        location: "г. Актобе, пр. Алии Молдагуловой",
        coords: [50.283, 57.167],
        photo: "images/aliya.jpg",
        description: "Памятник Герою Советского Союза, легендарному снайперу."
    },
    // СЮДА ВЫ БУДЕТЕ ДОБАВЛЯТЬ НОВЫЕ ОБЪЕКТЫ (копируйте блок выше)
];

// --- ЛОГИКА ОТОБРАЖЕНИЯ (НЕ МЕНЯЙТЕ) ---
monuments.forEach(function(item) {
    var marker = L.marker(item.coords).addTo(map);
    
    var popupContent = `
        <div style="font-family: 'Times New Roman', serif; text-align: center; width: 200px;">
            <h3 style="color: #002366; margin: 0; text-transform: uppercase; font-size: 1rem;">${item.name}</h3>
            <p style="margin: 5px 0; font-size: 0.9rem;"><b>${item.location}</b></p>
            <img src="${item.photo}" alt="${item.name}" style="width: 100%; border-radius: 8px; margin: 10px 0; border: 1px solid #c5a059;">
            <p style="font-size: 0.85rem; color: #333;">${item.description}</p>
        </div>
    `;
    
    marker.bindPopup(popupContent);
});