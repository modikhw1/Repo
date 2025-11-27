(function () {
  // Calculator logic
  const display = document.getElementById('calcDisplay');
  const resultInfo = document.getElementById('calcResult');
  let expr = '';

  document.querySelectorAll('.keys button').forEach(btn => {
    btn.addEventListener('click', () => {
      const v = btn.getAttribute('data-val');
      const op = btn.getAttribute('data-op');

      if (btn.id === 'clear') { expr = ''; display.value = ''; resultInfo.textContent = 'Enter expression and press ='; hideGlobe(); return; }
      if (btn.id === 'eq') { evaluateExpression(); return; }

      if (v !== null) { expr += v; display.value = expr; }
      if (op !== null) { expr += op; display.value = expr; }
    });
  });

  // keyboard support
  document.addEventListener('keydown', (e) => {
    if ((/^[\d.+\-*/]$/).test(e.key)) { expr += e.key; display.value = expr; }
    if (e.key === 'Enter') { evaluateExpression(); }
    if (e.key === 'Backspace') { expr = expr.slice(0, -1); display.value = expr; }
    if (e.key.toLowerCase() === 'c') { expr = ''; display.value = ''; hideGlobe(); resultInfo.textContent = 'Enter expression and press ='; }
  });

  async function evaluateExpression() {
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
    // delegate to globe module
    if(window.updateLatitude) {
      await window.updateLatitude(value);
    } else {
      resultInfo.textContent += ' (globe module not loaded)';
    }
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
