// 1. НАСТРОЙКА ГРАНИЦ КАЗАХСТАНА (чтобы карта не "улетала")
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

// 2. ПОДКЛЮЧЕНИЕ ЧИСТОЙ ПОДЛОЖКИ
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// 3. СОЗДАНИЕ ИКОНКИ "КРАСНАЯ ЗВЕЗДА"
var starIcon = L.divIcon({
    className: 'star-icon-container',
    html: `
        <svg width="30" height="30" viewBox="0 0 24 24" fill="#cc0000" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" 
                  stroke="#c5a059" stroke-width="1.5" stroke-linejoin="round"/>
        </svg>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
});

// 4. ВАША БАЗА ДАННЫХ (Список памятников)
// Просто копируйте блоки { ... }, чтобы добавить новые
var monuments = [
    {
        name: "МЕМОРИАЛ СЛАВЫ",
        location: "г. Алматы, Парк им. 28 гвардейцев-панфиловцев",
        coords: [43.259, 76.957],
        photo: "images/park_28.jpg",
        description: "Вечный огонь и мемориальный комплекс в честь героев-панфиловцев."
    },
    {
        name: "ПАМЯТНИК АЛИЕ МОЛДАГУЛОВОЙ",
        location: "г. Актобе, пр. Алии Молдагуловой",
        coords: [50.283, 57.167],
        photo: "images/aliya.jpg",
        description: "Памятник Герою Советского Союза, легендарному снайперу."
    }
];

// 5. ЛОГИКА ОТОБРАЖЕНИЯ ЗВЕЗД НА КАРТЕ
monuments.forEach(function(item) {
    // Создаем маркер со звездой
    var marker = L.marker(item.coords, { icon: starIcon }).addTo(map);
    
    // Формируем красивое окно (Popup)
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
