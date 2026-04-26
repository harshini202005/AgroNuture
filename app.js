let soilData = null;
let weatherData = null;

var map = L.map('map').setView([51.505, -0.09], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);


if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
        var userLat = position.coords.latitude;
        var userLng = position.coords.longitude;

        // Set view and add user marker
        map.setView([userLat, userLng], 13);
        L.marker([userLat, userLng]).addTo(map)
            .bindPopup("<b>Your Current Location</b><br />Use this location for analysis.")
            .openPopup();

        // Fetch and store weather data
        fetchWeatherData(userLat, userLng);
    }, function() {
        alert('Geolocation failed or permission denied.');
    });
} else {
    alert('Geolocation is not supported by this browser.');
}

// Fetch weather data from OpenWeatherMap
function fetchWeatherData(lat, lon) {
    const apiKey = '19c395fc79e7b17aa21d5d2cafa63c23'; // Replace with your API key
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            const temperature = data.main.temp;
            const humidity = data.main.humidity;
            const clouds = data.clouds.all;
            const rainfall = data.rain ? (data.rain['1h'] || 0) : 0;

            weatherData = {
                temp: temperature,
                humidity: humidity,
                clouds: clouds,
                rainfall: rainfall
            };

            document.getElementById('temp').innerHTML = "Temperature: " + temperature + "°C";
            document.getElementById('hum').innerHTML = "Humidity: " + humidity + "%";
            document.getElementById('cloud').innerHTML = "Clouds: " + clouds + "%";
            document.getElementById('rain').innerHTML = "Rainfall: " + rainfall + " mm last hour";
        })
        .catch(error => {
            console.error('Error fetching weather data:', error);
        });
}

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyBMargidiUiWaW8lWsV9BgQ6Uo3CmlTqpE",
    authDomain: "farmer-8151a.firebaseapp.com",
    databaseURL: "https://farmer-8151a-default-rtdb.firebaseio.com",
    projectId: "farmer-8151a",
    storageBucket: "farmer-8151a.appspot.com",
    messagingSenderId: "632585424979",
    appId: "1:632585424979:web:777b3fd9481fb10a69b6a6",
    measurementId: "G-6CX0DCMDBJ"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Fetch latest soil health data
function fetchLatestSoilHealthData() {
    database.ref('soilHealthData').limitToLast(1).once('value')
        .then(snapshot => {
            snapshot.forEach(childSnapshot => {
                const data = childSnapshot.val();
                const soilTypeVal = data.soil_type || 'Red';
                
                soilData = {
                    ph: parseFloat(data.ph_value || 0),
                    nitrogen: parseFloat(data.nitrogen || 0),
                    phosphorus: parseFloat(data.phosphorus || 0),
                    potassium: parseFloat(data.potassium || 0),
                    soil_type: soilTypeVal
                };

                // Fill form fields if needed
                document.getElementById('soil-type').value = soilTypeVal;
                document.getElementById('ph-value').value = soilData.ph;
                document.getElementById('nitrogen').value = soilData.nitrogen;
                document.getElementById('phosphorus').value = soilData.phosphorus;
                document.getElementById('potassium').value = soilData.potassium;
            });
        })
        .catch(error => {
            console.error('Error fetching soil data:', error);
        });
}
fetchLatestSoilHealthData();

// Drawing tools
var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

var drawControl = new L.Control.Draw({
    edit: { featureGroup: drawnItems },
    draw: {
        polygon: true,
        polyline: false,
        circle: false,
        marker: false,
        rectangle: true
    }
});
map.addControl(drawControl);

// Calculate and display area
map.on(L.Draw.Event.CREATED, function (event) {
    var layer = event.layer;
    drawnItems.addLayer(layer);

    var area = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]);
    var areaHectares = (area / 10000).toFixed(2);
    document.getElementById('farm-size').innerHTML = "Farm size: " + areaHectares + " hectares";
});

// Validate pH input
function validatePH(ph) {
    if (isNaN(ph) || ph < 0 || ph > 14) {
        return false;
    }
    return true;
}

// Analyze Button Event - Single consolidated handler
document.getElementById('analyze-btn').addEventListener('click', function () {
    if (!soilData || !weatherData) {
        alert("❗ Please wait until soil and weather data is loaded.");
        return;
    }

    // Get values from form inputs (allow manual override)
    const phInput = parseFloat(document.getElementById('ph-value').value);
    const nInput = parseFloat(document.getElementById('nitrogen').value);
    const pInput = parseFloat(document.getElementById('phosphorus').value);
    const kInput = parseFloat(document.getElementById('potassium').value);
    const soilTypeInput = document.getElementById('soil-type').value || 'Red';

    // Validate pH
    if (!validatePH(phInput)) {
        alert("⚠️ Please enter a valid pH value between 0 and 14");
        return;
    }

    // Update soilData with current form values
    soilData = {
        ph: phInput,
        nitrogen: nInput,
        phosphorus: pInput,
        potassium: kInput,
        soil_type: soilTypeInput
    };

    const result = recommendFertilizer(soilData, weatherData);
    
    // Display recommendation on page with proper styling
    let recDiv = document.getElementById('fertilizer-recommendation');
    if (!recDiv) {
        recDiv = document.createElement("div");
        recDiv.id = "fertilizer-recommendation";
        document.body.insertBefore(recDiv, document.querySelector('.container'));
    }
    
    recDiv.style.margin = "20px";
    recDiv.style.padding = "20px";
    recDiv.style.backgroundColor = "#e8f5e9";
    recDiv.style.border = "2px solid #4CAF50";
    recDiv.style.borderRadius = "10px";
    recDiv.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
    
    recDiv.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 15px;">
            <span style="font-size: 32px; margin-right: 10px;">🧪</span>
            <h3 style="margin: 0; color: #2e7d32; font-size: 22px;">Fertilizer Recommendation</h3>
        </div>
        <div style="background-color: white; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
            <p style="margin: 0; font-size: 16px;"><strong>Recommended Fertilizer:</strong></p>
            <p style="margin: 5px 0 0 0; font-size: 18px; color: #1b5e20;">${result.fertilizer}</p>
        </div>
        <div style="background-color: white; padding: 15px; border-radius: 8px;">
            <p style="margin: 0; font-size: 16px;"><strong>Expert Advice:</strong></p>
            <p style="margin: 5px 0 0 0; font-size: 16px; color: #424242; line-height: 1.5;">${result.advice}</p>
        </div>
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #c8e6c9;">
            <p style="margin: 0; font-size: 14px; color: #666;"><strong>Current Conditions:</strong> pH: ${phInput}, N: ${nInput}, P: ${pInput}, K: ${kInput}, Rainfall: ${weatherData.rainfall}mm</p>
        </div>
    `;
    
    // Smooth scroll to result
    recDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

function recommendFertilizer(soilData, weatherData) {
    const { nitrogen, phosphorus, potassium, ph, soil_type } = soilData;
    const { temp, rainfall } = weatherData;

    let fertilizer = "";
    let advice = "";

    // pH-based recommendations first
    if (ph < 6.0) {
        fertilizer = "Lime + Balanced NPK fertilizer";
        advice = "Soil is acidic (pH < 6), lime will help raise pH and balanced NPK will improve nutrients.";
    } else if (ph > 7.8) {
        fertilizer = "Sulfur + Balanced NPK fertilizer";
        advice = "Soil is alkaline (pH > 7.8), sulfur lowers pH and balanced NPK supports nutrient needs.";
    } else {
        // Optimal pH range - check soil type and nutrients
        if (soil_type === 'Red' || soil_type === 'red') {
            if (nitrogen < 10) {
                fertilizer = "NPK 20-20-20 + Organic Matter";
                advice = "Red soil is typically low in nitrogen. Apply balanced NPK with organic matter to improve soil structure.";
            } else {
                fertilizer = "Balanced NPK fertilizer";
                advice = "Red soil with adequate nitrogen; balanced NPK recommended for maintaining soil health.";
            }
        } else if (soil_type === 'Black' || soil_type === 'black') {
            if (phosphorus < 10 || potassium < 15) {
                fertilizer = "Urea + SSP + MOP";
                advice = "Black soil is rich in nutrients but may need phosphorus/potassium boost. Apply Urea for nitrogen, SSP for phosphorus, and MOP for potassium.";
            } else {
                fertilizer = "Balanced NPK fertilizer";
                advice = "Black soil nutrients are adequate; balanced NPK recommended for sustained productivity.";
            }
        } else {
            // Default for other soil types
            if (nitrogen < 20) {
                fertilizer = "NPK 15-15-15 + Urea";
                advice = "General purpose fertilizer with additional nitrogen for better growth.";
            } else if (phosphorus < 10) {
                fertilizer = "NPK 10-26-26";
                advice = "Phosphorus and potassium rich fertilizer for root development.";
            } else {
                fertilizer = "NPK 19-19-19";
                advice = "Balanced fertilizer suitable for all-purpose use.";
            }
        }
    }

    // Weather-based adjustments
    if (rainfall < 10) {
        advice += " 💧 Apply fertilizer in split doses due to dry conditions to prevent nutrient loss.";
    } else if (rainfall > 20 && temp > 30) {
        advice += " 🌧️ Use slow-release fertilizer to reduce nutrient leaching in heavy rain and heat.";
    } else if (temp < 15) {
        advice += " ❄️ Reduce fertilizer amount as cold weather slows nutrient uptake.";
    }

    return { fertilizer, advice };
}
