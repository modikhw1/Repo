// game.js - City Coordinate Game
(function(){
  const gameSection = document.getElementById('gameSection');
  const startGameBtn = document.getElementById('startGameBtn');
  const endGameBtn = document.getElementById('endGameBtn');
  const gameTimer = document.getElementById('gameTimer');
  const cityCounter = document.getElementById('cityCounter');
  const targetCity = document.getElementById('targetCity');
  const cityTimer = document.getElementById('cityTimer');
  const inlineRoller = document.getElementById('inlineRoller');
  const inlineNumberDisplay = document.getElementById('inlineNumberDisplay');
  const inlineRollerTimer = document.getElementById('inlineRollerTimer');

  let gameActive = false;
  let gameTimeRemaining = 300; // 5 minutes in seconds
  let cityTimeRemaining = 30; // 30 seconds per city
  let currentCityIndex = 0;
  let totalCities = 10;
  let gameInterval = null;
  let cityInterval = null;
  let numberCountdown = 5.5; // 5.5 seconds per number
  let countdownInterval = null;
  let graceTimeRemaining = 0; // 0.5s grace period after countdown ends
  
  // Power-up effects - tags on numbers
  let currentNumberEffect = null; // 'break', 'magnify', 'break2', or null
  let nextNumberEffect = null; // 'break', 'magnify', 'break2', or null
  let breakCooldown = false;
  let magnifyCooldown = false;
  
  // Usage tracking for power-ups
  let breakUsageCounter = 0; // Tracks consecutive uses (0, 1, or 2)
  let magnifyUsageCounter = 0; // Tracks consecutive uses (0, 1, or 2)
  let breakBlockCounter = 0; // Blocks break for 3 numbers after double use
  let magnifyBlockCounter = 0; // Blocks magnify for 3 numbers after double use
  
  // Separate memory for LAT and LON
  let latitudeValue = 20;
  let longitudeValue = 20;
  
  // Platform number system - current and next
  let currentNumber = null;
  let nextNumber = null;
  let pendingOperator = null; // '+', '-', '*', '/'

  // List of major world cities with approximate coordinates and country codes
  const cityList = [
    { name: "Tokyo, Japan", lat: 35.6762, lon: 139.6503, country: "Japan", code: "JP" },
    { name: "London, UK", lat: 51.5074, lon: -0.1278, country: "United Kingdom", code: "GB" },
    { name: "New York, USA", lat: 40.7128, lon: -74.0060, country: "United States", code: "US" },
    { name: "Paris, France", lat: 48.8566, lon: 2.3522, country: "France", code: "FR" },
    { name: "Sydney, Australia", lat: -33.8688, lon: 151.2093, country: "Australia", code: "AU" },
    { name: "Rio de Janeiro, Brazil", lat: -22.9068, lon: -43.1729, country: "Brazil", code: "BR" },
    { name: "Moscow, Russia", lat: 55.7558, lon: 37.6173, country: "Russia", code: "RU" },
    { name: "Cairo, Egypt", lat: 30.0444, lon: 31.2357, country: "Egypt", code: "EG" },
    { name: "Mumbai, India", lat: 19.0760, lon: 72.8777, country: "India", code: "IN" },
    { name: "Beijing, China", lat: 39.9042, lon: 116.4074, country: "China", code: "CN" },
    { name: "Los Angeles, USA", lat: 34.0522, lon: -118.2437, country: "United States", code: "US" },
    { name: "Singapore", lat: 1.3521, lon: 103.8198, country: "Singapore", code: "SG" },
    { name: "Dubai, UAE", lat: 25.2048, lon: 55.2708, country: "United Arab Emirates", code: "AE" },
    { name: "Toronto, Canada", lat: 43.6532, lon: -79.3832, country: "Canada", code: "CA" },
    { name: "Mexico City, Mexico", lat: 19.4326, lon: -99.1332, country: "Mexico", code: "MX" },
    { name: "Cape Town, South Africa", lat: -33.9249, lon: 18.4241, country: "South Africa", code: "ZA" },
    { name: "Bangkok, Thailand", lat: 13.7563, lon: 100.5018, country: "Thailand", code: "TH" },
    { name: "Istanbul, Turkey", lat: 41.0082, lon: 28.9784, country: "Turkey", code: "TR" },
    { name: "Buenos Aires, Argentina", lat: -34.6037, lon: -58.3816, country: "Argentina", code: "AR" },
    { name: "Seoul, South Korea", lat: 37.5665, lon: 126.9780, country: "South Korea", code: "KR" },
    // 25 additional cities
    { name: "Berlin, Germany", lat: 52.5200, lon: 13.4050, country: "Germany", code: "DE" },
    { name: "Rome, Italy", lat: 41.9028, lon: 12.4964, country: "Italy", code: "IT" },
    { name: "Madrid, Spain", lat: 40.4168, lon: -3.7038, country: "Spain", code: "ES" },
    { name: "Amsterdam, Netherlands", lat: 52.3676, lon: 4.9041, country: "Netherlands", code: "NL" },
    { name: "Vienna, Austria", lat: 48.2082, lon: 16.3738, country: "Austria", code: "AT" },
    { name: "Stockholm, Sweden", lat: 59.3293, lon: 18.0686, country: "Sweden", code: "SE" },
    { name: "Oslo, Norway", lat: 59.9139, lon: 10.7522, country: "Norway", code: "NO" },
    { name: "Copenhagen, Denmark", lat: 55.6761, lon: 12.5683, country: "Denmark", code: "DK" },
    { name: "Warsaw, Poland", lat: 52.2297, lon: 21.0122, country: "Poland", code: "PL" },
    { name: "Prague, Czech Republic", lat: 50.0755, lon: 14.4378, country: "Czech Republic", code: "CZ" },
    { name: "Athens, Greece", lat: 37.9838, lon: 23.7275, country: "Greece", code: "GR" },
    { name: "Lisbon, Portugal", lat: 38.7223, lon: -9.1393, country: "Portugal", code: "PT" },
    { name: "Brussels, Belgium", lat: 50.8503, lon: 4.3517, country: "Belgium", code: "BE" },
    { name: "Zurich, Switzerland", lat: 47.3769, lon: 8.5417, country: "Switzerland", code: "CH" },
    { name: "Dublin, Ireland", lat: 53.3498, lon: -6.2603, country: "Ireland", code: "IE" },
    { name: "Helsinki, Finland", lat: 60.1699, lon: 24.9384, country: "Finland", code: "FI" },
    { name: "Budapest, Hungary", lat: 47.4979, lon: 19.0402, country: "Hungary", code: "HU" },
    { name: "Bucharest, Romania", lat: 44.4268, lon: 26.1025, country: "Romania", code: "RO" },
    { name: "Lagos, Nigeria", lat: 6.5244, lon: 3.3792, country: "Nigeria", code: "NG" },
    { name: "Nairobi, Kenya", lat: -1.2864, lon: 36.8172, country: "Kenya", code: "KE" },
    { name: "Lima, Peru", lat: -12.0464, lon: -77.0428, country: "Peru", code: "PE" },
    { name: "Bogota, Colombia", lat: 4.7110, lon: -74.0721, country: "Colombia", code: "CO" },
    { name: "Santiago, Chile", lat: -33.4489, lon: -70.6693, country: "Chile", code: "CL" },
    { name: "Kuala Lumpur, Malaysia", lat: 3.1390, lon: 101.6869, country: "Malaysia", code: "MY" },
    { name: "Manila, Philippines", lat: 14.5995, lon: 120.9842, country: "Philippines", code: "PH" }
  ];

  let gameCities = [];
  let currentCity = null;
  
  // Score tracking
  let cityScores = []; // Array of {city: string, points: number}
  let totalScore = 0;
  
  // Bonus flag quiz
  let bonusQuizActive = false;
  let bonusQuizAnswered = false;
  let currentRoundScore = 0;

  // Show game section
  gameSection.style.display = 'block';

  // Expose game active state to other modules
  window.isGameActive = function() {
    return gameActive;
  };

  // Expose function to get current mode value
  window.getCurrentModeValue = function() {
    const modeToggle = document.getElementById('modeToggle');
    const isLatMode = !modeToggle.checked;
    return isLatMode ? latitudeValue : longitudeValue;
  };
  
  // Expose current platform number for debugging
  window.getCurrentPlatformNumber = function() {
    return currentNumber;
  };

  // Expose function to update game display (called by toggle)
  window.updateGameDisplay = function() {
    if(!gameActive) {
      console.log('❌ updateGameDisplay called but game not active');
      return;
    }
    console.log('🔄 updateGameDisplay called - updating display now');
    
    const modeToggle = document.getElementById('modeToggle');
    if(!modeToggle) {
      console.log('❌ modeToggle not found');
      return;
    }
    
    const isLatMode = !modeToggle.checked;
    const currentValue = isLatMode ? latitudeValue : longitudeValue;
    
    console.log('📊 Mode:', isLatMode ? 'LAT' : 'LON', '| Value:', currentValue, '| LAT:', latitudeValue, '| LON:', longitudeValue);
    
    // Update display immediately
    const calcDisplay = document.getElementById('calcDisplay');
    if(calcDisplay) {
      calcDisplay.value = currentValue.toFixed(4);
      console.log('✅ Display updated to:', calcDisplay.value);
    } else {
      console.log('❌ calcDisplay not found');
    }
    
    // Update mode indicator
    const modeIndicator = document.getElementById('modeIndicator');
    if(modeIndicator) {
      modeIndicator.textContent = isLatMode ? 'LAT' : 'LON';
      modeIndicator.style.color = isLatMode ? '#4ade80' : '#60a5fa';
    }
    
    // Change entire calculator background color
    const calculatorSection = document.querySelector('.calculator');
    if(calculatorSection) {
      calculatorSection.style.backgroundColor = isLatMode ? 'rgba(74, 222, 128, 0.15)' : 'rgba(96, 165, 250, 0.15)';
      calculatorSection.style.transition = 'background-color 0.3s';
      console.log('🎨 Calculator background:', isLatMode ? 'green' : 'blue');
    }
  };

  // Expose function to apply operations from calculator
  window.applyGameOperation = function(operator, numberUsed) {
    console.log('📥 applyGameOperation called | gameActive:', gameActive, '| operator:', operator, '| numberUsed:', numberUsed, '| currentNumber:', currentNumber);
    
    if(!gameActive) {
      console.log('❌ Game not active, returning');
      return;
    }
    
    // New simplified API: just use the operator with current platform number
    // numberUsed is ignored (we always use currentNumber from platform)
    const result = handleOperatorInput(operator);
    console.log('✅ handleOperatorInput returned:', result);
  };
  
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function initializePlatform() {
    currentNumber = generateRandomNumber();
    nextNumber = generateRandomNumber();
    currentNumberEffect = null;
    nextNumberEffect = null;
    console.log('🎲 Platform initialized | Current:', currentNumber, '| Next:', nextNumber);
    updatePlatformDisplay();
    startNumberCountdown();
  }

  function generateRandomNumber() {
    // Range: -5 to 15, excluding 0 and 1
    let num;
    do {
      num = Math.floor(Math.random() * 21) - 5;
    } while (num === 0 || num === 1);
    
    return num;
  }
  
  function applyBreakEffect(num, isSecondBreak = false) {
    const power = 0.4 + Math.random() * 0.4; // Random between 0.4 and 0.8 (more pronounced)
    const sign = num < 0 ? -1 : 1;
    const result = Math.round(sign * Math.pow(Math.abs(num), power));
    console.log('🔨 Break effect applied | Original:', num, '| Power:', power.toFixed(2), '| Result:', result, '| Second break:', isSecondBreak);
    return result;
  }
  
  function applyMagnifyEffect(num) {
    const power = 1.3 + Math.random() * 0.5; // Random between 1.3 and 1.8 (more pronounced)
    const sign = num < 0 ? -1 : 1;
    const result = Math.round(sign * Math.pow(Math.abs(num), power));
    console.log('🔍 Magnify effect applied | Original:', num, '| Power:', power.toFixed(2), '| Result:', result);
    return result;
  }

  function updatePlatformDisplay() {
    const currentNumEl = document.getElementById('currentNumber');
    const nextNumEl = document.getElementById('nextNumber');
    
    // Update text
    if(currentNumEl) currentNumEl.textContent = currentNumber;
    if(nextNumEl) nextNumEl.textContent = nextNumber;
    
    // Apply visual effects based on tags
    if(currentNumEl) {
      if(currentNumberEffect && currentNumberEffect.startsWith('break')) {
        currentNumEl.style.border = '3px dashed rgba(239, 68, 68, 0.7)';
        currentNumEl.style.boxShadow = 'inset 0 0 10px rgba(239, 68, 68, 0.3), 0 0 15px rgba(239, 68, 68, 0.2)';
        currentNumEl.style.animation = '';
      } else if(currentNumberEffect === 'magnify') {
        currentNumEl.style.border = '3px solid rgba(59, 130, 246, 0.7)';
        currentNumEl.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.6), inset 0 0 10px rgba(59, 130, 246, 0.3)';
        currentNumEl.style.animation = 'growPulse 1s infinite';
      } else {
        currentNumEl.style.border = '';
        currentNumEl.style.boxShadow = '';
        currentNumEl.style.animation = '';
      }
    }
    
    if(nextNumEl) {
      if(nextNumberEffect && nextNumberEffect.startsWith('break')) {
        nextNumEl.style.border = '3px dashed rgba(239, 68, 68, 0.5)';
        nextNumEl.style.boxShadow = 'inset 0 0 10px rgba(239, 68, 68, 0.2)';
        nextNumEl.style.animation = '';
      } else if(nextNumberEffect === 'magnify') {
        nextNumEl.style.border = '3px solid rgba(59, 130, 246, 0.5)';
        nextNumEl.style.boxShadow = '0 0 15px rgba(59, 130, 246, 0.4)';
        nextNumEl.style.animation = 'growPulse 1s infinite';
      } else {
        nextNumEl.style.border = '';
        nextNumEl.style.boxShadow = '';
        nextNumEl.style.animation = '';
      }
    }
    
    console.log('🎰 Platform display updated | Current:', currentNumber, '(', currentNumberEffect, ') | Next:', nextNumber, '(', nextNumberEffect, ')');
  }

  function useCurrentNumber() {
    console.log('⏭️ Using current number:', currentNumber);
    
    // Reset usage counters when number is actively used
    if(currentNumberEffect !== 'break' && currentNumberEffect !== 'break2') {
      breakUsageCounter = 0;
    }
    if(currentNumberEffect !== 'magnify') {
      magnifyUsageCounter = 0;
    }
    
    // Stop countdown
    if(countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
    
    // Add visual feedback when number is used
    const currentNumEl = document.getElementById('currentNumber');
    if(currentNumEl) {
      currentNumEl.style.animation = 'none';
      currentNumEl.style.transform = 'scale(0.8)';
      currentNumEl.style.opacity = '0.3';
      currentNumEl.style.transition = 'all 0.3s';
    }
    
    // After brief delay, move next to current and generate new next
    setTimeout(() => {
      advanceToNextNumber();
    }, 300);
  }
  
  function advanceToNextNumber() {
    currentNumber = nextNumber;
    currentNumberEffect = nextNumberEffect;
    nextNumber = generateRandomNumber();
    nextNumberEffect = null;
    
    // Decrement block counters
    if(breakBlockCounter > 0) {
      breakBlockCounter--;
      console.log('🚫 Break block counter:', breakBlockCounter);
    }
    if(magnifyBlockCounter > 0) {
      magnifyBlockCounter--;
      console.log('🚫 Magnify block counter:', magnifyBlockCounter);
    }
    
    console.log('⏭️ Advanced to next number | Current:', currentNumber, '(', currentNumberEffect, ') | Next:', nextNumber, '(', nextNumberEffect, ')');
    
    // Restore animation and update display
    const currentNumEl = document.getElementById('currentNumber');
    if(currentNumEl) {
      currentNumEl.style.animation = 'pulse 2s infinite';
      currentNumEl.style.transform = 'scale(1)';
      currentNumEl.style.opacity = '1';
    }
    
    updatePlatformDisplay();
    startNumberCountdown();
    updateBreakMagnifyButtons();
  }
  
  function startNumberCountdown() {
    numberCountdown = 5.5;
    graceTimeRemaining = 0;
    updateCountdownBar();
    
    if(countdownInterval) clearInterval(countdownInterval);
    
    countdownInterval = setInterval(() => {
      if(numberCountdown > 0) {
        numberCountdown -= 0.1;
        updateCountdownBar();
      } else if(graceTimeRemaining < 0.5) {
        // Grace period: bar is empty but still accepting input
        graceTimeRemaining += 0.1;
        updateCountdownBar();
      } else {
        // Grace period over, advance to next number
        clearInterval(countdownInterval);
        countdownInterval = null;
        advanceToNextNumber();
      }
    }, 100);
  }
  
  function updateCountdownBar() {
    const bar = document.getElementById('countdownBar');
    if(bar) {
      let percentage;
      
      if(numberCountdown > 0) {
        percentage = Math.max(0, (numberCountdown / 5.5) * 100);
      } else {
        // During grace period, show pulsing at 0%
        percentage = 0;
      }
      
      bar.style.width = percentage + '%';
      
      // Change color as it gets lower
      if(numberCountdown <= 0) {
        // Grace period: pulsing red
        bar.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
        bar.style.opacity = 0.3 + (Math.sin(graceTimeRemaining * 20) * 0.3);
      } else if(percentage < 25) {
        bar.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
        bar.style.opacity = 1;
      } else if(percentage < 50) {
        bar.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)';
        bar.style.opacity = 1;
      } else {
        bar.style.background = 'linear-gradient(90deg, #4ade80, #22c55e)';
        bar.style.opacity = 1;
      }
    }
  }

  // Helper function to update calculator display with current mode value
  function updateTargetCityDisplay() {
    const display = document.getElementById('cityCoordinateDisplay');
    if(display && currentCity) {
      display.textContent = `${currentCity.name} - LAT: ${currentCity.lat.toFixed(1)}°, LON: ${currentCity.lon.toFixed(1)}°`;
    }
  }
  
  function updateBreakMagnifyButtons() {
    const breakBtn = document.getElementById('breakBtn');
    const magnifyBtn = document.getElementById('magnifyBtn');
    
    if(breakBtn) {
      if(breakBlockCounter > 0) {
        breakBtn.disabled = true;
        breakBtn.style.opacity = '0.3';
        breakBtn.title = `Break blocked for ${breakBlockCounter} more numbers`;
      } else if(!breakCooldown) {
        breakBtn.disabled = false;
        breakBtn.style.opacity = '1';
        breakBtn.title = breakUsageCounter === 0 ? 'Break (can use twice)' : 'Break (can use once more)';
      }
    }
    
    if(magnifyBtn) {
      if(magnifyBlockCounter > 0) {
        magnifyBtn.disabled = true;
        magnifyBtn.style.opacity = '0.3';
        magnifyBtn.title = `Magnify blocked for ${magnifyBlockCounter} more numbers`;
      } else if(!magnifyCooldown) {
        magnifyBtn.disabled = false;
        magnifyBtn.style.opacity = '1';
        magnifyBtn.title = magnifyUsageCounter === 0 ? 'Magnify (can use twice)' : 'Magnify (can use once more)';
      }
    }
  }
  
  function updateBreakMagnifyButtons() {
    const breakBtn = document.getElementById('breakBtn');
    const magnifyBtn = document.getElementById('magnifyBtn');
    
    if(breakBtn) {
      if(breakBlockCounter > 0) {
        breakBtn.disabled = true;
        breakBtn.style.opacity = '0.3';
        breakBtn.title = `Break blocked for ${breakBlockCounter} more numbers`;
      } else if(!breakCooldown) {
        breakBtn.disabled = false;
        breakBtn.style.opacity = '1';
        breakBtn.title = breakUsageCounter === 0 ? 'Break (can use twice)' : 'Break (can use once more)';
      }
    }
    
    if(magnifyBtn) {
      if(magnifyBlockCounter > 0) {
        magnifyBtn.disabled = true;
        magnifyBtn.style.opacity = '0.3';
        magnifyBtn.title = `Magnify blocked for ${magnifyBlockCounter} more numbers`;
      } else if(!magnifyCooldown) {
        magnifyBtn.disabled = false;
        magnifyBtn.style.opacity = '1';
        magnifyBtn.title = magnifyUsageCounter === 0 ? 'Magnify (can use twice)' : 'Magnify (can use once more)';
      }
    }
  }
  
  function getDistanceToTarget() {
    if(!currentCity) return Infinity;
    
    const latDiff = Math.abs(latitudeValue - currentCity.lat);
    const lonDiff = Math.abs(longitudeValue - currentCity.lon);
    
    // Simple Euclidean distance in degrees
    const distance = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff);
    return distance;
  }
  
  function calculateVerticalRotation(lat) {
    // Maps latitude to Y-axis rotation between 0-13 degrees
    // Northern hemisphere (0° to 90°): 6.5° to 13°
    // Equator (0°): 6.5°
    // Southern hemisphere (-90° to 0°): 0° to 6.5°
    
    if (lat >= 0) {
      // Northern hemisphere: linear interpolation from 6.5° at equator to 13° at north pole
      return 6.5 + (lat / 90) * 6.5;
    } else {
      // Southern hemisphere: linear interpolation from 0° at south pole to 6.5° at equator
      return 6.5 + (lat / 90) * 6.5;  // lat is negative, so this goes down to 0
    }
  }
  
  function calculateScore(distance) {
    // Scoring system: closer = more points
    // 0-1 degree: 5000 points (very generous)
    // 1-5 degrees: 4000-2000 points (generous)
    // 5-15 degrees: 2000-500 points (moderate)
    // 15-30 degrees: 500-100 points (low)
    // 30+ degrees: 100-0 points (minimal)
    
    if(distance <= 1) {
      // Very close: 5000 points
      return 5000;
    } else if(distance <= 5) {
      // Close: interpolate from 5000 to 2000
      const t = (distance - 1) / (5 - 1);
      return Math.round(5000 - (t * 3000));
    } else if(distance <= 15) {
      // Medium: interpolate from 2000 to 500
      const t = (distance - 5) / (15 - 5);
      return Math.round(2000 - (t * 1500));
    } else if(distance <= 30) {
      // Far: interpolate from 500 to 100
      const t = (distance - 15) / (30 - 15);
      return Math.round(500 - (t * 400));
    } else if(distance <= 60) {
      // Very far: interpolate from 100 to 0
      const t = (distance - 30) / (60 - 30);
      return Math.round(100 - (t * 100));
    } else {
      // Extremely far: 0 points
      return 0;
    }
  }
  
  function rotateGlobeToIntersection() {
    if(!currentCity) return;
    
    // Get intersection point (player's current LAT/LON)
    const intersectionLat = latitudeValue;
    const intersectionLon = longitudeValue;
    
    // Get target city coordinates
    const cityLat = currentCity.lat;
    const cityLon = currentCity.lon;
    
    console.log('\n🌍 ====== ROTATION DIAGNOSTIC ======');
    console.log('📌 TARGET CITY:', currentCity.name);
    console.log('  City LAT:', cityLat.toFixed(1), '°');
    console.log('  City LON:', cityLon.toFixed(1), '°');
    console.log('');
    console.log('📍 PLAYER POSITION (LAT/LON lines intersection):');
    console.log('  Player LAT:', intersectionLat.toFixed(1), '°');
    console.log('  Player LON:', intersectionLon.toFixed(1), '°');
    console.log('');
    console.log('📏 DISTANCE TO TARGET:');
    console.log('  Δ LAT:', (intersectionLat - cityLat).toFixed(1), '° (', intersectionLat > cityLat ? 'north' : 'south', 'of target)');
    console.log('  Δ LON:', (intersectionLon - cityLon).toFixed(1), '° (', intersectionLon > cityLon ? 'east' : 'west', 'of target)');
    console.log('');
    console.log('🎮 ABOUT TO ROTATE GLOBE TO SHOW PLAYER POSITION');
    console.log('  (The view will center on LAT:', intersectionLat.toFixed(1), '°, LON:', intersectionLon.toFixed(1), '°)');
    console.log('  (City marker should be visible if within viewing angle)');
    
    // Calculate dynamic Y-axis rotation based on latitude
    const yRotation = calculateVerticalRotation(intersectionLat);
    console.log('📐 Calculated Y-axis rotation:', yRotation.toFixed(1), '° (based on LAT:', intersectionLat.toFixed(1), '°)');
    
    // Rotate globe to show the intersection point with dynamic Y-axis
    if(window.setGlobeRotation) {
      window.setGlobeRotation(-intersectionLon, yRotation);
    }
    
    console.log('===================================\n');
  }
  
  function updateCalculatorDisplay() {
    const modeToggle = document.getElementById('modeToggle');
    const isLatMode = !modeToggle.checked;
    const currentValue = isLatMode ? latitudeValue : longitudeValue;
    
    const calcDisplay = document.getElementById('calcDisplay');
    if(calcDisplay) {
      calcDisplay.value = currentValue.toFixed(4);
    }
    
    const modeIndicator = document.getElementById('modeIndicator');
    if(modeIndicator) {
      modeIndicator.textContent = isLatMode ? 'LAT' : 'LON';
      modeIndicator.style.color = isLatMode ? '#4ade80' : '#60a5fa';
    }
    
    // Change entire calculator background color based on mode
    const calculatorSection = document.querySelector('.calculator');
    if(calculatorSection) {
      calculatorSection.style.backgroundColor = isLatMode ? 'rgba(74, 222, 128, 0.15)' : 'rgba(96, 165, 250, 0.15)';
      calculatorSection.style.transition = 'background-color 0.3s';
    }
    
    console.log('📺 Calculator display updated | Mode:', isLatMode ? 'LAT' : 'LON', '| Value:', currentValue.toFixed(1));
  }



  // Manual operator input - user types operator to use current number
  function handleOperatorInput(op) {
    if(!gameActive) {
      console.log('❌ Game not active');
      return false;
    }
    if(currentNumber === null || currentNumber === undefined) {
      console.log('❌ No current number available');
      return false;
    }
    
    // Always use the current platform number
    const numberToUse = currentNumber;
    
    console.log('🔍 Using platform number:', numberToUse, '| Operator:', op);
    
    // Get current mode value
    const isLatMode = !document.getElementById('modeToggle').checked;
    let currentValue = isLatMode ? latitudeValue : longitudeValue;
    
    console.log('🎯 Operation:', op, '| Platform number:', numberToUse, '| Current value:', currentValue, '| Mode:', isLatMode ? 'LAT' : 'LON');
    
    let result;
    switch(op) {
      case '+': result = currentValue + numberToUse; break;
      case '-': result = currentValue - numberToUse; break;
      case '*': result = currentValue * numberToUse; break;
      case '/': result = numberToUse !== 0 ? currentValue / numberToUse : currentValue; break;
      default: return false;
    }
    
    console.log('✅ Result:', result);
    
    // Update memory for current mode
    if(isLatMode) {
      latitudeValue = result;
      console.log('📝 Updated latitudeValue to:', latitudeValue);
    } else {
      longitudeValue = result;
      console.log('📝 Updated longitudeValue to:', longitudeValue);
    }
    
    // Update calculator display
    updateCalculatorDisplay();
    
    // Move current number and bring next
    useCurrentNumber();
    
    // Update globe coordinates - this moves the lat/lon lines
    if(window.updateCoordinate) {
      console.log('🌍 Updating globe with:', result, 'mode:', isLatMode ? 'LAT' : 'LON');
      window.updateCoordinate(result);
    }
    
    // Rotate globe to intersection point
    rotateGlobeToIntersection();
    
    // Check if bonus quiz should be triggered (score > 3500 and not yet shown)
    const distance = getDistanceToTarget();
    currentRoundScore = calculateScore(distance);
    if(currentRoundScore >= 3500 && !bonusQuizActive && !bonusQuizAnswered) {
      showBonusQuiz();
    }
    
    return true;
  }
  
  // Legacy version with number validation (kept for compatibility)
  // Listen for mode toggle changes to update display
  const modeToggle = document.getElementById('modeToggle');
  if(modeToggle) {
    modeToggle.addEventListener('change', () => {
      if(!gameActive) return;
      
      const isLatMode = !modeToggle.checked;
      console.log('🔄 Mode toggle to:', isLatMode ? 'LAT' : 'LON', '| LAT value:', latitudeValue, '| LON value:', longitudeValue);
      
      // Update calculator display to show current mode's value
      updateCalculatorDisplay();
      
      // Force display value update (defensive coding)
      const calcDisplay = document.getElementById('calcDisplay');
      if(calcDisplay) {
        const displayValue = isLatMode ? latitudeValue : longitudeValue;
        calcDisplay.value = displayValue.toFixed(1);
        console.log('✅ Display forced to:', calcDisplay.value);
      }
    });
  }

  async function selectRandomCity() {
    currentCity = gameCities[currentCityIndex];
    currentCityIndex++;
    
    // Reset bonus quiz for new city
    bonusQuizActive = false;
    bonusQuizAnswered = false;
    currentRoundScore = 0;
    const quizUI = document.getElementById('bonusQuiz');
    if(quizUI) quizUI.style.display = 'none';
    
    targetCity.textContent = `Find: ${currentCity.name}`;
    cityCounter.textContent = `City ${currentCityIndex}/${totalCities}`;
    
    // Pre-fetch city coordinates and show on globe
    await showCityOnGlobe(currentCity);
    
    // Reset city timer
    cityTimeRemaining = 30;
    
    // Reset city timer fuse bar
    const cityTimerBar = document.getElementById('cityTimerBar');
    if(cityTimerBar) {
      cityTimerBar.style.width = '100%';
      cityTimerBar.style.background = 'linear-gradient(90deg, #4ade80, #22c55e)';
    }
    
    // Reset player LAT and LON to starting position (20, 20)
    latitudeValue = 20;
    longitudeValue = 20;
    console.log('🔄 New city! Reset player LAT and LON to 20 | Target:', currentCity.name, 'at', currentCity.lat.toFixed(1), ',', currentCity.lon.toFixed(1));
    
    // Ensure we're in LAT mode (unchecked)
    const modeToggle = document.getElementById('modeToggle');
    if(modeToggle) {
      modeToggle.checked = false; // LAT mode
    }
    
    // Update calculator display to starting value
    document.getElementById('calcDisplay').value = '20.0';
    
    // Update mode indicator to LAT
    const modeIndicator = document.getElementById('modeIndicator');
    if(modeIndicator) {
      modeIndicator.textContent = 'LAT';
      modeIndicator.style.color = '#4ade80';
    }
    
    // Reset calculator background to green (LAT mode)
    const calculatorSection = document.querySelector('.calculator');
    if(calculatorSection) {
      calculatorSection.style.backgroundColor = 'rgba(74, 222, 128, 0.15)';
    }
    
    // Update current coordinates display to show TARGET city
    updateTargetCityDisplay();
    
    // Reset globe rotation to starting position with dynamic Y-axis
    const resetYRotation = calculateVerticalRotation(20); // Based on starting LAT of 20
    if(window.setGlobeRotation) {
      window.setGlobeRotation(-20.0, resetYRotation); // X based on LON, Y based on LAT
      console.log('🔄 Reset globe rotation to X=-20.0°, Y=' + resetYRotation.toFixed(1) + '° for new city');
    }
    
    // Update globe to show initial latitude line at starting position
    if(window.updateCoordinate) {
      window.updateCoordinate(20);
    }
    
    // Note: Not calling rotateGlobeToIntersection() here to preserve the fixed starting rotation
    
    // Start city timer
    startCityTimer();
    
    // Pre-fetch next city in background if available
    if(currentCityIndex < totalCities) {
      const nextCity = gameCities[currentCityIndex];
      prefetchCityData(nextCity);
    }
  }

  async function showCityOnGlobe(city) {
    // Show the target city on the globe with a marker
    if(window.setTargetCity) {
      window.setTargetCity(city.lat, city.lon, city.name);
    }
  }

  async function prefetchCityData(city) {
    // Pre-fetch city coordinates (simulate API delay)
    return new Promise(resolve => {
      setTimeout(() => {
        console.log(`Pre-fetched: ${city.name} (${city.lat}, ${city.lon})`);
        resolve();
      }, 1000);
    });
  }

  function rotateGlobeToCity(city) {
    // Access globe rotation from globe.js
    if(window.setGlobeRotation) {
      // Horizontal: rotate to center the city's longitude
      const targetRotationX = -city.lon;
      
      // Vertical: limit to ±20% of max (±60° max, so ±12°)
      const maxVerticalTilt = 12;
      let targetRotationY = 0;
      
      // Tilt slightly based on latitude to bring it more into view
      if(city.lat > 45) {
        targetRotationY = -maxVerticalTilt; // Tilt up for northern cities
      } else if(city.lat < -45) {
        targetRotationY = maxVerticalTilt; // Tilt down for southern cities
      } else {
        targetRotationY = -(city.lat / 45) * maxVerticalTilt * 0.5;
      }
      
      window.setGlobeRotation(targetRotationX, targetRotationY);
    }
  }

  function showBonusQuiz() {
    if(!currentCity || bonusQuizActive) return;
    
    bonusQuizActive = true;
    
    // Get correct country and create 2 random wrong countries
    const correctCountry = currentCity.country;
    const correctCode = currentCity.code;
    
    // Get list of all other countries
    const otherCountries = cityList
      .filter(city => city.code !== correctCode)
      .map(city => ({country: city.country, code: city.code}));
    
    // Remove duplicates
    const uniqueCountries = [];
    const seenCodes = new Set();
    for(const c of otherCountries) {
      if(!seenCodes.has(c.code)) {
        uniqueCountries.push(c);
        seenCodes.add(c.code);
      }
    }
    
    // Shuffle and pick 2 wrong answers
    const shuffled = uniqueCountries.sort(() => Math.random() - 0.5);
    const wrongAnswers = shuffled.slice(0, 2);
    
    // Create options array and shuffle
    const options = [
      {country: correctCountry, code: correctCode, correct: true},
      {country: wrongAnswers[0].country, code: wrongAnswers[0].code, correct: false},
      {country: wrongAnswers[1].country, code: wrongAnswers[1].code, correct: false}
    ].sort(() => Math.random() - 0.5);
    
    // Show quiz UI
    const quizUI = document.getElementById('bonusQuiz');
    const optionsContainer = document.getElementById('bonusQuizOptions');
    
    if(quizUI && optionsContainer) {
      optionsContainer.innerHTML = '';
      
      options.forEach(option => {
        const btn = document.createElement('button');
        btn.style.padding = '15px';
        btn.style.background = 'white';
        btn.style.border = '2px solid #e5e7eb';
        btn.style.borderRadius = '8px';
        btn.style.cursor = 'pointer';
        btn.style.transition = 'all 0.2s';
        btn.style.display = 'flex';
        btn.style.flexDirection = 'column';
        btn.style.alignItems = 'center';
        btn.style.gap = '8px';
        
        // Flag emoji using country code
        const flag = document.createElement('div');
        flag.style.fontSize = '48px';
        flag.textContent = getFlagEmoji(option.code);
        
        // Country name
        const name = document.createElement('div');
        name.style.fontSize = '14px';
        name.style.fontWeight = 'bold';
        name.textContent = option.country;
        
        btn.appendChild(flag);
        btn.appendChild(name);
        
        btn.addEventListener('mouseenter', () => {
          btn.style.transform = 'scale(1.05)';
          btn.style.borderColor = '#3b82f6';
        });
        
        btn.addEventListener('mouseleave', () => {
          btn.style.transform = 'scale(1)';
          btn.style.borderColor = '#e5e7eb';
        });
        
        btn.addEventListener('click', () => {
          handleBonusQuizAnswer(option.correct);
        });
        
        optionsContainer.appendChild(btn);
      });
      
      quizUI.style.display = 'block';
    }
  }
  
  function getFlagEmoji(countryCode) {
    // Convert country code to flag emoji
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
  }
  
  function handleBonusQuizAnswer(correct) {
    bonusQuizActive = false;
    bonusQuizAnswered = true;
    
    const quizUI = document.getElementById('bonusQuiz');
    
    if(correct) {
      // Add 1000 bonus points
      totalScore += 1000;
      console.log('✅ Correct! +1000 bonus points');
      
      // Show success message
      if(quizUI) {
        quizUI.innerHTML = '<div style="text-align: center; padding: 20px; color: #22c55e; font-size: 24px; font-weight: bold;">✅ Correct! +1000 bonus points!</div>';
        setTimeout(() => {
          quizUI.style.display = 'none';
        }, 2000);
      }
      
      updateScoreDisplay();
    } else {
      console.log('❌ Wrong answer, no bonus');
      
      // Show failure message
      if(quizUI) {
        quizUI.innerHTML = '<div style="text-align: center; padding: 20px; color: #ef4444; font-size: 24px; font-weight: bold;">❌ Wrong answer, no bonus</div>';
        setTimeout(() => {
          quizUI.style.display = 'none';
        }, 2000);
      }
    }
  }
  
  function updateScoreDisplay() {
    const scoreList = document.getElementById('scoreList');
    const totalScoreEl = document.getElementById('totalScore');
    
    if(scoreList) {
      scoreList.innerHTML = '';
      cityScores.forEach(item => {
        const entry = document.createElement('div');
        entry.style.padding = '4px 8px';
        entry.style.borderBottom = '1px solid rgba(0,0,0,0.1)';
        entry.style.display = 'flex';
        entry.style.justifyContent = 'space-between';
        
        const cityName = document.createElement('span');
        cityName.textContent = item.city;
        cityName.style.flex = '1';
        cityName.style.textAlign = 'left';
        
        const points = document.createElement('span');
        points.textContent = item.points + ' pts';
        points.style.fontWeight = 'bold';
        points.style.color = item.points >= 3000 ? '#22c55e' : item.points >= 1000 ? '#f59e0b' : '#ef4444';
        
        entry.appendChild(cityName);
        entry.appendChild(points);
        scoreList.appendChild(entry);
      });
    }
    
    if(totalScoreEl) {
      totalScoreEl.textContent = 'Total: ' + totalScore + ' points';
    }
  }
  
  function startCityTimer() {
    cityTimeRemaining = 30;
    cityTimer.textContent = `Next city in: ${cityTimeRemaining}s`;
    
    if(cityInterval) clearInterval(cityInterval);
    cityInterval = setInterval(() => {
      cityTimeRemaining--;
      cityTimer.textContent = `Next city in: ${cityTimeRemaining}s`;
      
      // Update city timer fuse bar
      const cityTimerBar = document.getElementById('cityTimerBar');
      if(cityTimerBar) {
        const percentage = (cityTimeRemaining / 30) * 100;
        cityTimerBar.style.width = percentage + '%';
        
        // Change color as time runs out
        if(percentage < 25) {
          cityTimerBar.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
        } else if(percentage < 50) {
          cityTimerBar.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)';
        } else {
          cityTimerBar.style.background = 'linear-gradient(90deg, #4ade80, #22c55e)';
        }
      }
      
      if(cityTimeRemaining <= 0) {
        clearInterval(cityInterval);
        
        // Calculate score for this city based on final position
        if(currentCity) {
          const distance = getDistanceToTarget();
          const points = calculateScore(distance);
          cityScores.push({city: currentCity.name, points: points});
          totalScore += points;
          
          // Hide bonus quiz if still showing
          const quizUI = document.getElementById('bonusQuiz');
          if(quizUI) quizUI.style.display = 'none';
          
          updateScoreDisplay();
          console.log('🎯 City complete:', currentCity.name, '| Distance:', distance.toFixed(1), '| Points:', points);
        }
        
        if(currentCityIndex < totalCities) {
          selectRandomCity();
        } else {
          endGame();
        }
      }
    }, 1000);
  }

  function startGame() {
    gameActive = true;
    currentCityIndex = 0;
    gameTimeRemaining = 300;
    latitudeValue = 20;
    longitudeValue = 20;
    
    // Reset scores
    cityScores = [];
    totalScore = 0;
    updateScoreDisplay();
    
    // Show score display
    const scoreDisplay = document.getElementById('scoreDisplay');
    if(scoreDisplay) scoreDisplay.style.display = 'block';
    
    // Reset cooldowns and usage tracking
    breakCooldown = false;
    magnifyCooldown = false;
    breakUsageCounter = 0;
    magnifyUsageCounter = 0;
    breakBlockCounter = 0;
    magnifyBlockCounter = 0;
    const breakBtn = document.getElementById('breakBtn');
    const magnifyBtn = document.getElementById('magnifyBtn');
    if(breakBtn) {
      breakBtn.disabled = false;
      breakBtn.style.opacity = '1';
    }
    if(magnifyBtn) {
      magnifyBtn.disabled = false;
      magnifyBtn.style.opacity = '1';
    }
    
    // Show inline roller
    inlineRoller.style.display = 'block';
    
    // Initialize platform with 2 numbers
    initializePlatform();
    
    // Initialize calculator display
    document.getElementById('calcDisplay').value = '20.0';
    
    // Show city timer fuse and coordinate display
    const cityTimerFuse = document.getElementById('cityTimerFuse');
    if(cityTimerFuse) cityTimerFuse.style.display = 'block';
    
    const currentCoordinates = document.getElementById('currentCoordinates');
    if(currentCoordinates) currentCoordinates.style.display = 'block';
    
    const rotationFeedback = document.getElementById('rotationFeedback');
    if(rotationFeedback) rotationFeedback.style.display = 'block';
    
    // Set initial globe rotation with dynamic Y-axis
    const initialYRotation = calculateVerticalRotation(20); // Based on starting LAT of 20
    if(window.setGlobeRotation) {
      window.setGlobeRotation(-20.0, initialYRotation); // X based on LON, Y based on LAT
      console.log('🌍 Set initial globe rotation to X=-20.0°, Y=' + initialYRotation.toFixed(1) + '°');
    }
    
    // Reset zoom
    if(window.setGlobeZoom) {
      window.setGlobeZoom(1.0);
    }
    
    // Update mode indicator
    const modeIndicator = document.getElementById('modeIndicator');
    if(modeIndicator) {
      modeIndicator.textContent = 'LAT';
      modeIndicator.style.color = '#4ade80';
    }
    
    // Set initial calculator background color (LAT = green)
    const calculatorSection = document.querySelector('.calculator');
    if(calculatorSection) {
      calculatorSection.style.backgroundColor = 'rgba(74, 222, 128, 0.15)';
      calculatorSection.style.transition = 'background-color 0.3s';
    }
    
    // Shuffle and select 10 cities
    gameCities = [...cityList].sort(() => Math.random() - 0.5).slice(0, totalCities);
    
    startGameBtn.style.display = 'none';
    endGameBtn.style.display = 'inline-block';
    
    // Start game timer
    gameInterval = setInterval(() => {
      gameTimeRemaining--;
      gameTimer.textContent = formatTime(gameTimeRemaining);
      
      if(gameTimeRemaining <= 0) {
        endGame();
      }
    }, 1000);
    
    // Select first city
    selectRandomCity();
  }

  function endGame() {
    gameActive = false;
    clearInterval(gameInterval);
    clearInterval(cityInterval);
    clearInterval(countdownInterval);
    
    // Reset cooldowns and usage tracking
    breakCooldown = false;
    magnifyCooldown = false;
    breakUsageCounter = 0;
    magnifyUsageCounter = 0;
    breakBlockCounter = 0;
    magnifyBlockCounter = 0;
    const breakBtn = document.getElementById('breakBtn');
    const magnifyBtn = document.getElementById('magnifyBtn');
    if(breakBtn) {
      breakBtn.disabled = false;
      breakBtn.style.opacity = '1';
    }
    if(magnifyBtn) {
      magnifyBtn.disabled = false;
      magnifyBtn.style.opacity = '1';
    }
    
    targetCity.textContent = 'Game Over!';
    cityTimer.textContent = '';
    
    // Hide inline roller, city timer fuse, and coordinate display
    inlineRoller.style.display = 'none';
    const cityTimerFuse = document.getElementById('cityTimerFuse');
    if(cityTimerFuse) cityTimerFuse.style.display = 'none';
    
    const currentCoordinates = document.getElementById('currentCoordinates');
    if(currentCoordinates) currentCoordinates.style.display = 'none';
    
    const rotationFeedback = document.getElementById('rotationFeedback');
    if(rotationFeedback) rotationFeedback.style.display = 'none';
    
    // Keep score display visible after game ends
    // (Don't hide it so players can see their final scores)
    
    // Reset calculator background
    const calculatorSection = document.querySelector('.calculator');
    if(calculatorSection) {
      calculatorSection.style.backgroundColor = '';
    }
    
    // Clear target city from globe
    if(window.clearTargetCity) {
      window.clearTargetCity();
    }
    
    startGameBtn.style.display = 'inline-block';
    endGameBtn.style.display = 'none';
    
    gameTimer.textContent = '5:00';
    cityCounter.textContent = 'City 0/10';
  }

  startGameBtn.addEventListener('click', startGame);
  endGameBtn.addEventListener('click', endGame);
  
  // Break button - makes next 3 numbers smaller
  const breakBtn = document.getElementById('breakBtn');
  if(breakBtn) {
    breakBtn.addEventListener('click', () => {
      if(!gameActive) {
        alert('Start the game first!');
        return;
      }
      
      if(breakCooldown) {
        alert('Break is on cooldown!');
        return;
      }
      
      if(breakBlockCounter > 0) {
        alert(`Break is blocked for ${breakBlockCounter} more numbers!`);
        return;
      }
      
      // Check if current number has magnify effect
      if(currentNumberEffect === 'magnify') {
        alert('Cannot break a magnified number!');
        return;
      }
      
      // Increment usage counter
      breakUsageCounter++;
      console.log('📊 Break usage counter:', breakUsageCounter);
      
      // Check if we can apply second break
      const isSecondBreak = currentNumberEffect === 'break';
      
      // Apply break instantly to current and next numbers
      currentNumber = applyBreakEffect(currentNumber, isSecondBreak);
      currentNumberEffect = isSecondBreak ? 'break2' : 'break';
      
      // Only apply to next if it's not magnified
      if(nextNumberEffect !== 'magnify') {
        nextNumber = applyBreakEffect(nextNumber, false);
        nextNumberEffect = 'break';
      }
      
      // Set cooldown (10 seconds)
      breakCooldown = true;
      breakBtn.disabled = true;
      breakBtn.style.opacity = '0.5';
      setTimeout(() => {
        breakCooldown = false;
        if(breakBlockCounter === 0) {
          breakBtn.disabled = false;
          breakBtn.style.opacity = '1';
        }
        updateBreakMagnifyButtons();
      }, 10000);
      
      // If used twice, block for next 3 numbers and reset counter
      if(breakUsageCounter >= 2) {
        breakBlockCounter = 3;
        breakUsageCounter = 0;
        console.log('🚫 Break used twice! Blocked for 3 numbers');
      }
      // If used once, it can be used again on next number (counter stays at 1)
      
      console.log('🔨 BREAK activated instantly! | Current:', currentNumber, '| Next:', nextNumber, '| Second break:', isSecondBreak);
      
      // Trigger dramatic break animation
      const calculatorSection = document.querySelector('.calculator');
      if(calculatorSection) {
        // Flash effect
        const flashOverlay = document.createElement('div');
        flashOverlay.style.position = 'absolute';
        flashOverlay.style.top = '0';
        flashOverlay.style.left = '0';
        flashOverlay.style.width = '100%';
        flashOverlay.style.height = '100%';
        flashOverlay.style.background = 'rgba(239, 68, 68, 0.4)';
        flashOverlay.style.pointerEvents = 'none';
        flashOverlay.style.animation = 'breakFlash 0.6s ease-out';
        flashOverlay.style.zIndex = '1000';
        
        calculatorSection.style.position = 'relative';
        calculatorSection.appendChild(flashOverlay);
        
        // Shake effect
        calculatorSection.style.animation = 'breakShake 0.6s ease-in-out';
        
        // Create crack lines
        for(let i = 0; i < 5; i++) {
          const crack = document.createElement('div');
          crack.style.position = 'absolute';
          crack.style.top = Math.random() * 100 + '%';
          crack.style.left = '0';
          crack.style.width = '100%';
          crack.style.height = '2px';
          crack.style.background = `linear-gradient(90deg, transparent, rgba(239, 68, 68, ${0.3 + Math.random() * 0.4}), transparent)`;
          crack.style.transform = `rotate(${Math.random() * 20 - 10}deg)`;
          crack.style.pointerEvents = 'none';
          crack.style.animation = 'crackAppear 0.3s ease-out forwards';
          crack.style.zIndex = '999';
          flashOverlay.appendChild(crack);
        }
        
        setTimeout(() => {
          flashOverlay.remove();
          calculatorSection.style.animation = '';
        }, 600);
      }
      
      updatePlatformDisplay();
      
      const resultInfo = document.getElementById('calcResult');
      if(resultInfo) resultInfo.textContent = isSecondBreak ? 'DOUBLE BREAK! Numbers broken again!' : 'BREAK! Current & next numbers broken!';
    });
  }
  
  // Magnify button - makes next 2 numbers larger
  const magnifyBtn = document.getElementById('magnifyBtn');
  if(magnifyBtn) {
    magnifyBtn.addEventListener('click', () => {
      if(!gameActive) {
        alert('Start the game first!');
        return;
      }
      
      if(magnifyCooldown) {
        alert('Magnify is on cooldown!');
        return;
      }
      
      if(magnifyBlockCounter > 0) {
        alert(`Magnify is blocked for ${magnifyBlockCounter} more numbers!`);
        return;
      }
      
      // Cannot magnify a broken number
      if(currentNumberEffect && currentNumberEffect.startsWith('break')) {
        alert('Cannot magnify a broken number!');
        return;
      }
      
      // Increment usage counter
      magnifyUsageCounter++;
      console.log('📊 Magnify usage counter:', magnifyUsageCounter);
      
      // Apply magnify instantly to current and next numbers
      currentNumber = applyMagnifyEffect(currentNumber);
      currentNumberEffect = 'magnify';
      
      // Only apply to next if it's not broken
      if(!nextNumberEffect || !nextNumberEffect.startsWith('break')) {
        nextNumber = applyMagnifyEffect(nextNumber);
        nextNumberEffect = 'magnify';
      }
      
      // Set cooldown (10 seconds)
      magnifyCooldown = true;
      magnifyBtn.disabled = true;
      magnifyBtn.style.opacity = '0.5';
      setTimeout(() => {
        magnifyCooldown = false;
        if(magnifyBlockCounter === 0) {
          magnifyBtn.disabled = false;
          magnifyBtn.style.opacity = '1';
        }
        updateBreakMagnifyButtons();
      }, 10000);
      
      // If used twice, block for next 3 numbers and reset counter
      if(magnifyUsageCounter >= 2) {
        magnifyBlockCounter = 3;
        magnifyUsageCounter = 0;
        console.log('🚫 Magnify used twice! Blocked for 3 numbers');
      }
      // If used once, it can be used again on next number (counter stays at 1)
      
      console.log('🔍 MAGNIFY activated instantly! | Current:', currentNumber, '| Next:', nextNumber);
      
      // Trigger dramatic magnify animation
      const calculatorSection = document.querySelector('.calculator');
      if(calculatorSection) {
        // Growing glow effect
        const glowOverlay = document.createElement('div');
        glowOverlay.style.position = 'absolute';
        glowOverlay.style.top = '50%';
        glowOverlay.style.left = '50%';
        glowOverlay.style.width = '50%';
        glowOverlay.style.height = '50%';
        glowOverlay.style.transform = 'translate(-50%, -50%)';
        glowOverlay.style.background = 'radial-gradient(circle, rgba(59, 130, 246, 0.6) 0%, transparent 70%)';
        glowOverlay.style.pointerEvents = 'none';
        glowOverlay.style.animation = 'magnifyGrow 1s ease-out';
        glowOverlay.style.zIndex = '1000';
        glowOverlay.style.borderRadius = '50%';
        
        calculatorSection.style.position = 'relative';
        calculatorSection.appendChild(glowOverlay);
        
        // Pulse effect on calculator
        calculatorSection.style.animation = 'magnifyBounce 0.8s ease-in-out';
        
        // Create expanding rings
        for(let i = 0; i < 3; i++) {
          setTimeout(() => {
            const ring = document.createElement('div');
            ring.style.position = 'absolute';
            ring.style.top = '50%';
            ring.style.left = '50%';
            ring.style.width = '20px';
            ring.style.height = '20px';
            ring.style.transform = 'translate(-50%, -50%)';
            ring.style.border = '2px solid rgba(59, 130, 246, 0.8)';
            ring.style.borderRadius = '50%';
            ring.style.pointerEvents = 'none';
            ring.style.animation = 'expandRing 1s ease-out forwards';
            ring.style.zIndex = '999';
            glowOverlay.appendChild(ring);
          }, i * 150);
        }
        
        setTimeout(() => {
          glowOverlay.remove();
          calculatorSection.style.animation = '';
        }, 1000);
      }
      
      updatePlatformDisplay();
      
      const resultInfo = document.getElementById('calcResult');
      if(resultInfo) resultInfo.textContent = 'MAGNIFY! Current & next numbers magnified!';
    });
  }
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if(!gameActive) return;
    
    if(e.key.toLowerCase() === 'b' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      if(breakBtn) breakBtn.click();
    } else if(e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      if(magnifyBtn) magnifyBtn.click();
    }
  });
  
  startGameBtn.addEventListener('click', startGame);
  endGameBtn.addEventListener('click', endGame);
})();
