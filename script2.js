// Standard nutrient ranges (kg/ha) based on agricultural research
const NUTRIENT_RANGES = {
    N: { min: 0, max: 200, optimalMin: 50, optimalMax: 100, unit: 'kg/ha' },
    P: { min: 0, max: 100, optimalMin: 15, optimalMax: 30, unit: 'kg/ha' },
    K: { min: 0, max: 300, optimalMin: 150, optimalMax: 250, unit: 'kg/ha' },
    pH: { min: 0, max: 14, optimalMin: 6.5, optimalMax: 7.5 }
};

document.getElementById('soil-health-form').addEventListener('submit', function(event) {
    event.preventDefault();

    // Get input values
    const cropType = document.getElementById('crop-type').value.trim();
    const soilType = document.getElementById('soil-type').value.trim();
    const phValue = parseFloat(document.getElementById('ph-value').value);
    const nitrogen = parseFloat(document.getElementById('nitrogen').value);
    const phosphorus = parseFloat(document.getElementById('phosphorus').value);
    const potassium = parseFloat(document.getElementById('potassium').value);

    // Validation messages
    const errors = [];

    // Validate pH (0-14)
    if (isNaN(phValue) || phValue < NUTRIENT_RANGES.pH.min || phValue > NUTRIENT_RANGES.pH.max) {
        errors.push(`❌ pH must be between ${NUTRIENT_RANGES.pH.min} and ${NUTRIENT_RANGES.pH.max}`);
    }

    // Validate nutrients (prevent unrealistic values)
    if (isNaN(nitrogen) || nitrogen < 0 || nitrogen > NUTRIENT_RANGES.N.max) {
        errors.push(`❌ Nitrogen must be between ${NUTRIENT_RANGES.N.min} and ${NUTRIENT_RANGES.N.max} ${NUTRIENT_RANGES.N.unit}`);
    }
    if (isNaN(phosphorus) || phosphorus < 0 || phosphorus > NUTRIENT_RANGES.P.max) {
        errors.push(`❌ Phosphorus must be between ${NUTRIENT_RANGES.P.min} and ${NUTRIENT_RANGES.P.max} ${NUTRIENT_RANGES.P.unit}`);
    }
    if (isNaN(potassium) || potassium < 0 || potassium > NUTRIENT_RANGES.K.max) {
        errors.push(`❌ Potassium must be between ${NUTRIENT_RANGES.K.min} and ${NUTRIENT_RANGES.K.max} ${NUTRIENT_RANGES.K.unit}`);
    }

    // Show errors if any
    if (errors.length > 0) {
        document.getElementById('result').innerHTML = `
            <div class="agro-error">
                <h4 style="margin: 0 0 10px 0;">⚠️ Invalid Input Values</h4>
                <ul style="margin: 0; padding-left: 20px;">
                    ${errors.map(e => `<li>${e}</li>`).join('')}
                </ul>
                <p style="margin: 10px 0 0 0; font-size: 14px;">Please correct the values and try again.</p>
            </div>
        `;
        return;
    }

    // Clamp values to maximum for calculation (handle edge cases)
    const clampedN = Math.min(nitrogen, NUTRIENT_RANGES.N.optimalMax * 1.5);
    const clampedP = Math.min(phosphorus, NUTRIENT_RANGES.P.optimalMax * 1.5);
    const clampedK = Math.min(potassium, NUTRIENT_RANGES.K.optimalMax * 1.5);

    // Calculate pH score (optimal 6.5-7.5 = 10 points)
    let phScore;
    const pHDiff = Math.abs(phValue - 7.0); // Distance from neutral
    if (pHDiff <= 0.5) {
        phScore = 10; // Optimal (6.5-7.5)
    } else if (pHDiff <= 1.0) {
        phScore = 8; // Good (6.0-6.5 or 7.5-8.0)
    } else if (pHDiff <= 1.5) {
        phScore = 6; // Fair (5.5-6.0 or 8.0-8.5)
    } else if (pHDiff <= 2.0) {
        phScore = 4; // Poor (5.0-5.5 or 8.5-9.0)
    } else {
        phScore = 2; // Very poor (<5.0 or >9.0)
    }

    // Calculate nutrient scores based on proximity to optimal range
    const nScore = calculateNutrientScore(clampedN, NUTRIENT_RANGES.N);
    const pScore = calculateNutrientScore(clampedP, NUTRIENT_RANGES.P);
    const kScore = calculateNutrientScore(clampedK, NUTRIENT_RANGES.K);

    // Calculate weighted soil health score
    // pH: 25%, N: 25%, P: 25%, K: 25%
    const score = (phScore * 0.25) + (nScore * 0.25) + (pScore * 0.25) + (kScore * 0.25);

    // Determine health level
    let healthLevel, healthColor, healthIcon;
    if (score >= 8.5) {
        healthLevel = "Excellent";
        healthColor = "#28a745";
        healthIcon = "✅";
    } else if (score >= 7) {
        healthLevel = "Good";
        healthColor = "#5cb85c";
        healthIcon = "👍";
    } else if (score >= 5) {
        healthLevel = "Fair";
        healthColor = "#ffc107";
        healthIcon = "⚠️";
    } else if (score >= 3) {
        healthLevel = "Poor";
        healthColor = "#fd7e14";
        healthIcon = "🔶";
    } else {
        healthLevel = "Critical";
        healthColor = "#dc3545";
        healthIcon = "🚨";
    }

    // Get status for each parameter
    const phStatus = getParameterStatus(phValue, NUTRIENT_RANGES.pH, '');
    const nStatus = getParameterStatus(nitrogen, NUTRIENT_RANGES.N, 'N');
    const pStatus = getParameterStatus(phosphorus, NUTRIENT_RANGES.P, 'P');
    const kStatus = getParameterStatus(potassium, NUTRIENT_RANGES.K, 'K');

    // Generate recommendations
    const recommendations = generateRecommendations(phValue, nitrogen, phosphorus, potassium, healthLevel);

    // Display comprehensive result
    document.getElementById('result').innerHTML = `
        <div style="background: linear-gradient(135deg, ${healthColor} 0%, ${adjustColor(healthColor, -20)} 100%); color: white; padding: 25px; border-radius: 12px; text-align: center; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="font-size: 48px; margin-bottom: 10px;">${healthIcon}</div>
            <h3 style="margin: 0; font-size: 28px; font-weight: bold;">${healthLevel}</h3>
            <p style="margin: 10px 0 0 0; font-size: 20px;">Soil Health Score: <strong>${score.toFixed(1)}</strong> / 10</p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
            <div style="background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center;">
                <div style="font-size: 24px; margin-bottom: 5px;">🌾</div>
                <p style="margin: 0; color: #666; font-size: 12px;">Crop</p>
                <p style="margin: 5px 0 0 0; font-weight: bold; color: #333;">${cropType || 'Not specified'}</p>
            </div>
            <div style="background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center;">
                <div style="font-size: 24px; margin-bottom: 5px;">🌍</div>
                <p style="margin: 0; color: #666; font-size: 12px;">Soil</p>
                <p style="margin: 5px 0 0 0; font-weight: bold; color: #333;">${soilType || 'Not specified'}</p>
            </div>
        </div>

        <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <h4 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">📊 Parameter Analysis</h4>
            
            <div style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <span style="font-weight: bold; color: #555;">pH Level</span>
                    <span style="color: ${phStatus.color}; font-weight: bold;">${phValue} - ${phStatus.label}</span>
                </div>
                <div style="background: #e9ecef; height: 8px; border-radius: 4px; overflow: hidden;">
                    <div style="width: ${Math.min((phValue / 14) * 100, 100)}%; height: 100%; background: ${phStatus.color}; transition: width 0.3s;"></div>
                </div>
                <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Optimal: 6.5 - 7.5</p>
            </div>

            <div style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <span style="font-weight: bold; color: #555;">Nitrogen (N)</span>
                    <span style="color: ${nStatus.color}; font-weight: bold;">${nitrogen} ${NUTRIENT_RANGES.N.unit} - ${nStatus.label}</span>
                </div>
                <div style="background: #e9ecef; height: 8px; border-radius: 4px; overflow: hidden;">
                    <div style="width: ${Math.min((nitrogen / NUTRIENT_RANGES.N.max) * 100, 100)}%; height: 100%; background: ${nStatus.color}; transition: width 0.3s;"></div>
                </div>
                <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Optimal: ${NUTRIENT_RANGES.N.optimalMin}-${NUTRIENT_RANGES.N.optimalMax} ${NUTRIENT_RANGES.N.unit}</p>
            </div>

            <div style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <span style="font-weight: bold; color: #555;">Phosphorus (P)</span>
                    <span style="color: ${pStatus.color}; font-weight: bold;">${phosphorus} ${NUTRIENT_RANGES.P.unit} - ${pStatus.label}</span>
                </div>
                <div style="background: #e9ecef; height: 8px; border-radius: 4px; overflow: hidden;">
                    <div style="width: ${Math.min((phosphorus / NUTRIENT_RANGES.P.max) * 100, 100)}%; height: 100%; background: ${pStatus.color}; transition: width 0.3s;"></div>
                </div>
                <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Optimal: ${NUTRIENT_RANGES.P.optimalMin}-${NUTRIENT_RANGES.P.optimalMax} ${NUTRIENT_RANGES.P.unit}</p>
            </div>

            <div style="margin-bottom: 0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <span style="font-weight: bold; color: #555;">Potassium (K)</span>
                    <span style="color: ${kStatus.color}; font-weight: bold;">${potassium} ${NUTRIENT_RANGES.K.unit} - ${kStatus.label}</span>
                </div>
                <div style="background: #e9ecef; height: 8px; border-radius: 4px; overflow: hidden;">
                    <div style="width: ${Math.min((potassium / NUTRIENT_RANGES.K.max) * 100, 100)}%; height: 100%; background: ${kStatus.color}; transition: width 0.3s;"></div>
                </div>
                <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Optimal: ${NUTRIENT_RANGES.K.optimalMin}-${NUTRIENT_RANGES.K.optimalMax} ${NUTRIENT_RANGES.K.unit}</p>
            </div>
        </div>

        ${recommendations ? `
        <div style="background: #e3f2fd; padding: 20px; border-radius: 12px; margin-top: 20px; border-left: 5px solid #2196f3;">
            <h4 style="margin: 0 0 15px 0; color: #1565c0; font-size: 18px;">💡 Recommendations</h4>
            <ul style="margin: 0; padding-left: 20px; color: #333;">
                ${recommendations.map(r => `<li style="margin-bottom: 8px;">${r}</li>`).join('')}
            </ul>
        </div>
        ` : ''}
    `;
});

// Calculate nutrient score based on optimal range
function calculateNutrientScore(value, range) {
    if (value >= range.optimalMin && value <= range.optimalMax) {
        return 10; // Optimal
    } else if (value < range.optimalMin) {
        // Deficient - linear scale from 0 to optimalMin
        return Math.max(2, (value / range.optimalMin) * 8);
    } else {
        // Excessive - penalize slightly but not too much
        const excess = value - range.optimalMax;
        const maxExcess = range.max - range.optimalMax;
        return Math.max(6, 10 - (excess / maxExcess) * 4);
    }
}

// Get parameter status with color coding
function getParameterStatus(value, range, type) {
    let label, color;
    
    if (type === '') { // pH
        if (value >= range.optimalMin && value <= range.optimalMax) {
            label = 'Optimal'; color = '#28a745';
        } else if (value < 6.0) {
            label = 'Too Acidic'; color = '#dc3545';
        } else if (value > 8.0) {
            label = 'Too Alkaline'; color = '#dc3545';
        } else if (value < range.optimalMin) {
            label = 'Slightly Acidic'; color = '#ffc107';
        } else {
            label = 'Slightly Alkaline'; color = '#ffc107';
        }
    } else { // Nutrients
        if (value >= range.optimalMin && value <= range.optimalMax) {
            label = 'Optimal'; color = '#28a745';
        } else if (value < range.optimalMin * 0.5) {
            label = 'Severely Low'; color = '#dc3545';
        } else if (value < range.optimalMin) {
            label = 'Low'; color = '#ffc107';
        } else if (value > range.max * 0.9) {
            label = 'Excessive'; color = '#fd7e14';
        } else {
            label = 'High'; color = '#ffc107';
        }
    }
    
    return { label, color };
}

// Generate recommendations based on soil health
function generateRecommendations(ph, n, p, k, health) {
    const recs = [];
    
    if (ph < 6.0) {
        recs.push('<strong>Correct Acidity:</strong> Add agricultural lime (dolomite) to raise pH. Aim for 6.5-7.0.');
    } else if (ph > 8.0) {
        recs.push('<strong>Correct Alkalinity:</strong> Add elemental sulfur or organic matter to lower pH.');
    }
    
    if (n < NUTRIENT_RANGES.N.optimalMin) {
        recs.push(`<strong>Increase Nitrogen:</strong> Apply urea (46% N) or ammonium nitrate. Target: ${NUTRIENT_RANGES.N.optimalMin}-${NUTRIENT_RANGES.N.optimalMax} kg/ha.`);
    } else if (n > NUTRIENT_RANGES.N.max * 0.8) {
        recs.push('<strong>Reduce Nitrogen:</strong> High N can cause lodging and delay maturity. Reduce application.');
    }
    
    if (p < NUTRIENT_RANGES.P.optimalMin) {
        recs.push(`<strong>Increase Phosphorus:</strong> Apply SSP (Single Super Phosphate) or DAP. Target: ${NUTRIENT_RANGES.P.optimalMin}-${NUTRIENT_RANGES.P.optimalMax} kg/ha.`);
    }
    
    if (k < NUTRIENT_RANGES.K.optimalMin) {
        recs.push(`<strong>Increase Potassium:</strong> Apply MOP (Muriate of Potash) or SOP. Target: ${NUTRIENT_RANGES.K.optimalMin}-${NUTRIENT_RANGES.K.optimalMax} kg/ha.`);
    }
    
    if (health === 'Excellent' || health === 'Good') {
        recs.push('<strong>Maintain:</strong> Current soil health is good. Continue regular soil testing annually.');
    }
    
    return recs;
}

// Helper to darken/lighten color
function adjustColor(color, amount) {
    const num = parseInt(color.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

// Firebase Configuration
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

// Function to save data to Firebase (called after successful validation)
function saveToFirebase(cropType, soilType, phValue, nitrogen, phosphorus, potassium) {
    database.ref('soilHealthData').push({
        crop_type: cropType,
        soil_type: soilType,
        ph_value: phValue,
        nitrogen: nitrogen,
        phosphorus: phosphorus,
        potassium: potassium,
        timestamp: new Date().toISOString()
    })
    .then(() => {
        console.log("Soil health data saved to Firebase");
    })
    .catch(error => {
        console.error("Error saving data:", error);
    });
}


