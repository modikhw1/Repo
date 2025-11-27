(function () {
  // Calculator logic
  const display = document.getElementById('calcDisplay');
  const resultInfo = document.getElementById('calcResult');
  let expr = '';

  document.querySelectorAll('.keys button').forEach(btn => {
    btn.addEventListener('click', () => {
      // Check if game is active - buttons work differently during game
      const gameActive = window.isGameActive && window.isGameActive();
      
      console.log('🖱️ Button clicked:', btn.textContent, '| id:', btn.id, '| gameActive:', gameActive);
      
      if(gameActive) {
        // During game, allow typing with buttons and equals
        if (btn.id === 'clear') { 
          expr = ''; 
          display.value = window.getCurrentModeValue ? window.getCurrentModeValue().toFixed(1) : '20.0';
          resultInfo.textContent = 'Type operator first, then press =';
          return; 
        }
        if (btn.id === 'eq') { 
          console.log('= button in game mode, expr:', expr);
          evaluateExpression(); // This will call applyGameExpression during game
          return; 
        }
        
        const v = btn.getAttribute('data-val');
        const op = btn.getAttribute('data-op');
        
        if (v !== null) { expr += v; display.value = expr; }
        if (op !== null) { expr += op; display.value = expr; }
        console.log('Updated expr in game mode:', expr);
        return;
      }
      
      // Normal mode (not during game)
      const v = btn.getAttribute('data-val');
      const op = btn.getAttribute('data-op');

      if (btn.id === 'clear') { expr = ''; display.value = ''; resultInfo.textContent = 'Enter expression and press ='; hideGlobe(); return; }
      if (btn.id === 'eq') { 
        console.log('= button in normal mode, expr:', expr);
        evaluateExpression(); 
        return; 
      }

      if (v !== null) { expr += v; display.value = expr; console.log('Added value:', v, '| expr now:', expr); }
      if (op !== null) { expr += op; display.value = expr; console.log('Added operator:', op, '| expr now:', expr); }
    });
  });

  // keyboard support
  document.addEventListener('keydown', (e) => {
    // Check if game is active
    const gameActive = window.isGameActive && window.isGameActive();
    
    console.log('⌨️ Key pressed:', e.key, '| gameActive:', gameActive, '| current expr:', expr);
    
    if ((/^[\d.+\-*/()]$/).test(e.key)) {
      e.preventDefault(); // Prevent default to control insertion manually
      
      // Get current cursor position
      const cursorPos = display.selectionStart || expr.length;
      
      // Insert character at cursor position
      expr = expr.slice(0, cursorPos) + e.key + expr.slice(cursorPos);
      display.value = expr;
      
      // Auto-replace -- with -() for easier negative number input
      if(gameActive && expr.endsWith('--')) {
        expr = expr.slice(0, -2) + '-()';
        display.value = expr;
        resultInfo.textContent = 'Type negative number inside parentheses';
        
        // Position cursor before the closing paren
        const newCursorPos = expr.length - 1;
        if(display.setSelectionRange) {
          display.setSelectionRange(newCursorPos, newCursorPos);
        }
        console.log('✏️ Auto-converted to:', expr, '| cursor at:', newCursorPos);
        return;
      }
      // Also handle other operators followed by minus: +-, *-, /-
      else if(gameActive && /[+*/]-$/.test(expr)) {
        expr = expr.slice(0, -1) + '()';
        display.value = expr;
        resultInfo.textContent = 'Type negative number inside parentheses';
        
        // Position cursor before the closing paren
        const newCursorPos = expr.length - 1;
        if(display.setSelectionRange) {
          display.setSelectionRange(newCursorPos, newCursorPos);
        }
        console.log('✏️ Auto-converted to:', expr, '| cursor at:', newCursorPos);
        return;
      }
      
      // Set cursor position after inserted character
      const newCursorPos = cursorPos + 1;
      if(display.setSelectionRange) {
        display.setSelectionRange(newCursorPos, newCursorPos);
      }
      
      console.log('✏️ Updated expr to:', expr, '| cursor at:', newCursorPos);
    }
    if (e.key === 'Enter') { 
      e.preventDefault();
      console.log('⏎ Enter pressed, calling evaluateExpression');
      evaluateExpression();
    }
    if (e.key === 'Backspace') { expr = expr.slice(0, -1); display.value = expr; }
    if (e.key.toLowerCase() === 'c') { 
      expr = ''; 
      display.value = gameActive ? (window.getCurrentModeValue ? window.getCurrentModeValue().toFixed(1) : '') : ''; 
      if(!gameActive) {
        hideGlobe(); 
        resultInfo.textContent = 'Enter expression and press =';
      }
    }
  });

  function applyGameExpression() {
    console.log('📝 Raw expression:', expr);
    
    // Try pattern 0: Just a negative number (no operator) - interpret as addition of that negative
    // This ONLY applies when the platform number itself is negative
    const justNegativeNumber = expr.match(/^-([0-9.]+)$/);
    const platformNumber = window.getCurrentPlatformNumber ? window.getCurrentPlatformNumber() : null;
    
    if(justNegativeNumber && platformNumber !== null && platformNumber < 0) {
      // Platform has a negative number, user typed a negative number
      const typedNumber = -parseFloat(justNegativeNumber[1]);
      
      console.log('📝 Just negative number (platform is negative) | Typed:', typedNumber, '| Platform:', platformNumber);
      
      // Check if it matches platform number
      if(Math.abs(typedNumber - platformNumber) < 0.0001) {
        console.log('✅ Negative number matches platform, applying as addition');
        
        if(window.applyGameOperation) {
          const operator = '+';
          let displayText = `+(${platformNumber})`;
          
          console.log('📤 Calling applyGameOperation with:', operator, platformNumber);
          window.applyGameOperation(operator, platformNumber);
          resultInfo.textContent = `Applied: ${displayText}`;
        }
        
        expr = '';
        setTimeout(() => {
          if(window.getCurrentModeValue) {
            display.value = window.getCurrentModeValue().toFixed(1);
          }
        }, 10);
        return;
      }
    }
    
    // Try pattern 1: Just an operator (recommended way)
    const operatorOnly = expr.match(/^([+\-*/])$/);
    
    if(operatorOnly) {
      // User typed just the operator - use current platform number
      const operator = operatorOnly[1];
      const platformNumber = window.getCurrentPlatformNumber ? window.getCurrentPlatformNumber() : null;
      
      if(platformNumber === null || platformNumber === undefined) {
        resultInfo.textContent = 'No platform number available';
        expr = '';
        return;
      }
      
      console.log('📝 Using platform number automatically | Operator:', operator, '| Platform number:', platformNumber);
      
      // Call game's apply operation function
      if(window.applyGameOperation) {
        let displayText = `${operator}${platformNumber}`;
        if((operator === '-' || operator === '*' || operator === '/') && platformNumber < 0) {
          displayText = `${operator}(${platformNumber})`;
        }
        
        console.log('📤 Calling applyGameOperation with:', operator, platformNumber);
        window.applyGameOperation(operator, platformNumber);
        resultInfo.textContent = `Applied: ${displayText}`;
      }
      
      expr = '';
      setTimeout(() => {
        if(window.getCurrentModeValue) {
          display.value = window.getCurrentModeValue().toFixed(1);
        }
      }, 10);
      return;
    }
    
    // Try pattern 2: Operator followed by number (for validation)
    // Supports: +5, -5, -(5), -(-5), +(7), *(−3), etc.
    const operatorWithNumber = expr.match(/^([+\-*/])\(?([+\-]?[0-9.]+)\)?$/);
    
    if(operatorWithNumber) {
      const operator = operatorWithNumber[1];
      const typedNumber = parseFloat(operatorWithNumber[2]);
      const platformNumber = window.getCurrentPlatformNumber ? window.getCurrentPlatformNumber() : null;
      
      console.log('📝 Operator with number | Operator:', operator, '| Typed:', typedNumber, '| Platform:', platformNumber);
      
      // Check if typed number matches platform number
      if(platformNumber !== null && Math.abs(typedNumber - platformNumber) < 0.0001) {
        console.log('✅ Numbers match, applying operation');
        
        if(window.applyGameOperation) {
          let displayText = `${operator}${platformNumber}`;
          if((operator === '-' || operator === '*' || operator === '/') && platformNumber < 0) {
            displayText = `${operator}(${platformNumber})`;
          }
          
          console.log('📤 Calling applyGameOperation with:', operator, platformNumber);
          window.applyGameOperation(operator, platformNumber);
          resultInfo.textContent = `Applied: ${displayText}`;
        }
        
        expr = '';
        setTimeout(() => {
          if(window.getCurrentModeValue) {
            display.value = window.getCurrentModeValue().toFixed(1);
          }
        }, 10);
        return;
      } else {
        console.log('❌ Numbers do not match');
        resultInfo.textContent = `Must use platform number ${platformNumber}, not ${typedNumber}`;
        
        // Trigger shake animation
        const calculatorSection = document.querySelector('.calculator');
        if(calculatorSection) {
          calculatorSection.style.animation = 'shake 0.3s';
          setTimeout(() => { calculatorSection.style.animation = ''; }, 300);
        }
        
        expr = '';
        display.value = window.getCurrentModeValue ? window.getCurrentModeValue().toFixed(1) : '';
        return;
      }
    }
    
    // If no pattern matched, show error
    resultInfo.textContent = 'Type operator (+, -, *, /) or operator+number';
    expr = '';
    display.value = window.getCurrentModeValue ? window.getCurrentModeValue().toFixed(1) : '';
  }

  async function evaluateExpression() {
    console.log('🔢 evaluateExpression called | expr:', expr, '| gameActive:', window.isGameActive ? window.isGameActive() : 'unknown');
    
    // Check if game is active
    if(window.isGameActive && window.isGameActive()) {
      applyGameExpression();
      return;
    }
    
    // Normal calculator evaluation
    if(!expr || expr.trim() === '') {
      resultInfo.textContent = 'Enter expression and press =';
      return;
    }
    
    let value;
    try {
      if (!/^[0-9+\-*/().\s]+$/.test(expr)) throw new Error('Invalid characters');
      value = Function('"use strict";return (' + expr + ')')();
      if (typeof value !== 'number' || !isFinite(value)) throw new Error('Bad result');
    } catch (err) {
      resultInfo.textContent = 'Invalid expression';
      hideGlobe();
      return;
    }

    display.value = String(value);
    resultInfo.textContent = `Result: ${value}`;
    expr = '';
  }

  // Globe visualization + weather logic
  const canvas = document.getElementById('globeCanvas');
  const ctx = canvas.getContext('2d');
  const weatherInfo = document.getElementById('weatherInfo');

  function setCanvasSize() {
    const size = Math.max(120, Math.floor(window.innerHeight / 3));
    canvas.width = size;
    canvas.height = size;
  }
  setCanvasSize();
  window.addEventListener('resize', () => { setCanvasSize(); redrawPlaceholder(); });

  function hideGlobe() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    weatherInfo.textContent = 'Result between -90 and 90 will fetch nearest city & temperature (°C).';
  }

  function redrawPlaceholder() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const r = canvas.width / 2;
    drawSphere(r, null);
  }

  function drawSphere(radius, latitudeDeg) {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = radius - 4;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.4, r * 0.1, cx, cy, r);
    grad.addColorStop(0, '#5db3ff');
    grad.addColorStop(1, '#1e6fe0');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx - r * 0.25, cy - r * 0.35, r * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fill();

    if (latitudeDeg === null) {
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 2;
      drawEllipse(ctx, cx, cy, r * 0.95, r * 0.42, -Math.PI / 6);
      ctx.stroke();
    } else {
      const lat = Math.max(-90, Math.min(90, latitudeDeg));
      const frac = lat / 90;
      const offset = -frac * r * 0.45;
      const ellipseCX = cx;
      const ellipseCY = cy + offset;
      const rotation = -Math.PI / 6;

      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      drawEllipse(ctx, ellipseCX, ellipseCY, r * 0.95, r * 0.42, rotation);
      ctx.stroke();

      ctx.lineWidth = 3;
      ctx.strokeStyle = '#fffb';
      drawEllipse(ctx, ellipseCX, ellipseCY, r * 0.95, r * 0.42, rotation);
      ctx.stroke();

      const t = 0;
      const ex = ellipseCX + (r * 0.95) * Math.cos(t) * Math.cos(rotation) - (r * 0.42) * Math.sin(t) * Math.sin(rotation);
      const ey = ellipseCY + (r * 0.95) * Math.cos(t) * Math.sin(rotation) + (r * 0.42) * Math.sin(t) * Math.cos(rotation);
      ctx.beginPath();
      ctx.fillStyle = '#ffec61';
      ctx.arc(ex, ey, Math.max(3, r * 0.04), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawEllipse(ctx, cx, cy, rx, ry, rotation) {
    if (ctx.ellipse) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, rotation, 0, Math.PI * 2);
    } else {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation);
      ctx.beginPath();
      ctx.scale(rx, ry);
      ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.restore();
    }
  }

  async function handleLatitudeResult(value) {
    if (typeof value !== 'number' || !isFinite(value)) { hideGlobe(); return; }
    if (value < -90 || value > 90) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      weatherInfo.textContent = 'Value out of range (-90..90). Sphere discarded.';
      return;
    }

    setCanvasSize();
    drawSphere(canvas.width / 2, value);
    weatherInfo.textContent = `Latitude: ${value.toFixed(4)}° — finding nearest city...`;

    try {
      const lat = value;
      const lon = 0;
      const revUrl = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&count=1&language=en`;
      const revResp = await fetch(revUrl);
      if (!revResp.ok) throw new Error('Geocoding failed');
      const revJson = await revResp.json();
      const place = (revJson && revJson.results && revJson.results[0]) || null;

      let name = 'Unknown location';
      let placeLat = lat, placeLon = lon;
      if (place) {
        name = place.name + (place.admin1 ? (', ' + place.admin1) : '') + (place.country ? (', ' + place.country) : '');
        placeLat = place.latitude;
        placeLon = place.longitude;
      } else {
        name = `Lat ${lat.toFixed(4)}, Lon ${lon.toFixed(4)}`;
      }

      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(placeLat)}&longitude=${encodeURIComponent(placeLon)}&current_weather=true&temperature_unit=celsius`;
      const wresp = await fetch(weatherUrl);
      if (!wresp.ok) throw new Error('Weather fetch failed');
      const wjson = await wresp.json();
      const cw = wjson.current_weather || null;
      if (!cw) throw new Error('No current weather data');

      weatherInfo.textContent = `Nearest: ${name} — Temp: ${cw.temperature}°C — Wind: ${cw.windspeed} m/s (as of ${cw.time})`;
    } catch (err) {
      weatherInfo.textContent = 'Weather lookup failed: ' + (err.message || 'unknown error');
    }
  }

  redrawPlaceholder();
})();
