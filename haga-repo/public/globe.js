// globe.js — interactive 3D globe with city search
(function(){
  const canvas = document.getElementById('globeCanvas');
  const ctx = canvas.getContext('2d');
  const weatherInfo = document.getElementById('weatherInfo');
  const coordsText = document.getElementById('coordsText');

  let currentLatitude = null;
  let currentLongitude = 0; // for drawing meridian only
  let calculatorMode = 'lat'; // 'lat' or 'lon'
  let foundPlace = null;
  let lookupTimer = null;
  
  // Globe rotation state
  let globeRotationX = 0; // Horizontal rotation (spin left/right)
  let globeRotationY = 0; // Vertical tilt (look up/down), limited range
  let isDragging = false;
  let lastMouseX = 0;
  let lastMouseY = 0;
  
  const modeToggle = document.getElementById('modeToggle');

  function setCanvasSize(){
    const size = Math.max(168, Math.floor(window.innerHeight / 3 * 1.4));
    canvas.width = size;
    canvas.height = size;
  }
  setCanvasSize();
  window.addEventListener('resize', () => { setCanvasSize(); redrawPlaceholder(); });

  function hideGlobe(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    weatherInfo.textContent = 'Enter latitude/longitude to find nearest city.';
    foundPlace = null;
  }

  function redrawPlaceholder(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    drawWhole(currentLatitude);
  }

  // Draw the entire scene: parallel back, sphere, parallel front, markers
  function drawWhole(latValue){
    const cx = canvas.width/2;
    const cy = canvas.height/2;
    const r = Math.max(10, canvas.width/2 - 4);

    ctx.clearRect(0,0,canvas.width,canvas.height);

    const grad = ctx.createRadialGradient(cx - r*0.3, cy, r*0.1, cx, cy, r);
    grad.addColorStop(0, '#5db3ff');
    grad.addColorStop(1, '#1e6fe0');

    // draw back meridian if in lon mode
    if(calculatorMode === 'lon' && currentLongitude !== null){
      drawMeridian(currentLongitude, {strokeStyle: 'rgba(0,0,0,0.06)', lineWidth:3, backOnly:true});
    }

    // draw back parallel (if any)
    if(latValue === null){
      // faint central horizontal line as placeholder
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx - r*0.95, cy); ctx.lineTo(cx + r*0.95, cy); ctx.stroke();
    } else {
      drawParallel(latValue, {backOnly:true});
    }

    // draw sphere
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fillStyle = grad; ctx.fill();

    // draw map grid overlay (meridians and parallels)
    drawMapGrid(r);

    // draw front parallel
    if(latValue !== null) drawParallel(latValue, {frontOnly:true});
    
    // draw front meridian if in lon mode
    if(calculatorMode === 'lon' && currentLongitude !== null){
      drawMeridian(currentLongitude, {strokeStyle:'rgba(255,255,255,0.25)', lineWidth:2, frontOnly:true});
    }

    if(foundPlace){
      const p = projectLatLon(foundPlace.latitude, foundPlace.longitude);
      if(p.z >= 0){
        const markerSize = Math.max(5, r*0.06);
        const labelOffsetX = Math.max(7, r*0.08);
        const labelOffsetY = Math.max(5, r*0.05);
        
        ctx.beginPath();
        ctx.fillStyle = '#ff3333';
        ctx.arc(p.x, p.y, markerSize, 0, Math.PI*2);
        ctx.fill();
        
        ctx.textAlign = 'left';
        ctx.fillStyle = '#000';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(foundPlace.name, p.x + labelOffsetX, p.y - labelOffsetY);
        
        ctx.font = '9px sans-serif';
        ctx.fillStyle = '#555';
        ctx.fillText(`(${foundPlace.latitude.toFixed(1)}°, ${foundPlace.longitude.toFixed(1)}°)`, 
                     p.x + labelOffsetX, p.y + Math.max(3, r*0.03));
      }
    }

    // Show fixed longitude (prime meridian) used for searches
    ctx.fillStyle = '#333';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Lon: 0°`, cx, cy + r + 20);
  }

  function projectLatLon(latDeg, lonDeg){
    const cx = canvas.width/2, cy = canvas.height/2, r = Math.max(10, canvas.width/2 - 4);
    
    // Apply globe rotation
    const phi = latDeg * Math.PI/180;
    const lambda = (lonDeg + globeRotationX) * Math.PI/180;
    const tilt = globeRotationY * Math.PI/180;
    
    // 3D coordinates on sphere with rotation
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);
    const cosLambda = Math.cos(lambda);
    const sinLambda = Math.sin(lambda);
    const cosTilt = Math.cos(tilt);
    const sinTilt = Math.sin(tilt);
    
    // Base 3D position
    let x3d = cosPhi * sinLambda;
    let y3d = sinPhi;
    let z3d = cosPhi * cosLambda;
    
    // Apply vertical tilt (rotation around X-axis)
    const y3d_rotated = y3d * cosTilt - z3d * sinTilt;
    const z3d_rotated = y3d * sinTilt + z3d * cosTilt;
    
    return { 
      x: cx + r * x3d, 
      y: cy - r * y3d_rotated, 
      z: r * z3d_rotated 
    };
  }

  function isLongitudeVisible(lonDeg){
    // Meridian is visible when it's on the front hemisphere
    // Center is at lon=0, visible range is approximately -90 to +90
    const normalized = ((lonDeg + 180) % 360) - 180;
    return Math.abs(normalized) <= 90;
  }

  function drawParallel(latDeg, opts={}){
    const numPoints = 180;
    const backPoints = [];
    const frontPoints = [];
    
    // Sample points around the entire latitude circle
    for(let i = 0; i <= numPoints; i++){
      const lonDeg = (i / numPoints) * 360 - 180;
      const p = projectLatLon(latDeg, lonDeg);
      if(p.z >= 0){
        frontPoints.push(p);
      } else {
        backPoints.push(p);
      }
    }

    // Draw back half (behind the globe)
    if(backPoints.length > 1 && !opts.frontOnly){
      ctx.beginPath();
      ctx.moveTo(backPoints[0].x, backPoints[0].y);
      for(let i = 1; i < backPoints.length; i++){
        ctx.lineTo(backPoints[i].x, backPoints[i].y);
      }
      ctx.strokeStyle = opts.backOnly ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.25)';
      ctx.lineWidth = opts.backOnly ? 3 : 4;
      ctx.stroke();
    }

    // Draw front half (visible on the globe)
    if(frontPoints.length > 1 && !opts.backOnly){
      ctx.beginPath();
      ctx.moveTo(frontPoints[0].x, frontPoints[0].y);
      for(let i = 1; i < frontPoints.length; i++){
        ctx.lineTo(frontPoints[i].x, frontPoints[i].y);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  function drawMeridian(lonDeg, opts={}){
    const numPoints = 180;
    const backPoints = [];
    const frontPoints = [];
    
    // Sample points along the meridian from south to north pole
    for(let i = 0; i <= numPoints; i++){
      const latDeg = (i / numPoints) * 180 - 90;
      const p = projectLatLon(latDeg, lonDeg);
      if(p.z >= 0){
        frontPoints.push(p);
      } else {
        backPoints.push(p);
      }
    }

    // Draw back half (behind the globe)
    if(opts.backOnly){
      if(backPoints.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(backPoints[0].x, backPoints[0].y);
      for(let i=1; i<backPoints.length; i++) ctx.lineTo(backPoints[i].x, backPoints[i].y);
      ctx.strokeStyle = opts.strokeStyle || 'rgba(0,0,0,0.06)';
      ctx.lineWidth = opts.lineWidth || 3;
      ctx.stroke();
      return;
    }

    // Draw back half
    if(backPoints.length > 1){
      ctx.beginPath();
      ctx.moveTo(backPoints[0].x, backPoints[0].y);
      for(let i=1; i<backPoints.length; i++) ctx.lineTo(backPoints[i].x, backPoints[i].y);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    
    // Draw front half (visible on the globe)
    if(frontPoints.length > 1){
      ctx.beginPath();
      ctx.moveTo(frontPoints[0].x, frontPoints[0].y);
      for(let i=1; i<frontPoints.length; i++) ctx.lineTo(frontPoints[i].x, frontPoints[i].y);
      ctx.strokeStyle = 'rgba(96,165,250,0.95)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  let worldMapData = null;

  async function loadWorldMap(){
    if(worldMapData) return worldMapData;
    try {
      // Load simplified world map from Natural Earth (low resolution)
      const response = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
      const data = await response.json();
      worldMapData = data;
      console.log('✓ World map loaded');
      return data;
    } catch(e) {
      console.warn('Failed to load world map:', e);
      return null;
    }
  }

  function drawMapGrid(r){
    const cx = canvas.width/2, cy = canvas.height/2;
    
    if(!worldMapData){
      loadWorldMap().then(() => drawWhole(currentLatitude));
      return;
    }

    // Draw country boundaries from TopoJSON
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 0.8;

    try {
      const countries = topojson.feature(worldMapData, worldMapData.objects.countries);
      
      countries.features.forEach(country => {
        const geometry = country.geometry;
        if(!geometry) return;

        const drawGeometry = (coords, isPolygon) => {
          if(!coords || coords.length === 0) return;
          
          const points = coords.map(coord => {
            const [lon, lat] = coord;
            const p = projectLatLon(lat, lon);
            return {...p, visible: p.z >= 0};
          });

          // Only draw if at least some points are visible
          if(!points.some(p => p.visible)) return;

          ctx.beginPath();
          let started = false;
          for(let i=0; i<points.length; i++){
            if(points[i].visible){
              if(!started){
                ctx.moveTo(points[i].x, points[i].y);
                started = true;
              } else {
                ctx.lineTo(points[i].x, points[i].y);
              }
            } else if(started){
              // Break on invisible points
              if(isPolygon) ctx.closePath();
              ctx.stroke();
              started = false;
            }
          }
          if(started){
            if(isPolygon) ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
        };

        if(geometry.type === 'Polygon'){
          geometry.coordinates.forEach(ring => drawGeometry(ring, true));
        } else if(geometry.type === 'MultiPolygon'){
          geometry.coordinates.forEach(polygon => {
            polygon.forEach(ring => drawGeometry(ring, true));
          });
        }
      });
    } catch(e) {
      console.warn('Error drawing map:', e);
    }
  }

  // Find nearest place: prefer Overpass bbox search for population >=50k, then fallback to Nominatim+Open-Meteo
  async function findNearestPlaceAroundPoint(lat, lon){
    lat = Math.max(-90, Math.min(90, lat));
    lon = ((lon + 180) % 360) - 180;
    console.log('🌍 Geocoding search for:', {lat, lon});

    // First: Overpass bbox search (fast, returns population tags) - find closest, not just largest
    try{
      const delta = 5; // degrees - expanded search area
      const south = lat - delta; const north = lat + delta;
      const west = lon - delta; const east = lon + delta;
      const bboxQuery = `
[out:json][timeout:25];
(node["place"="city"]["population"](${south},${west},${north},${east});
 way["place"="city"]["population"](${south},${west},${north},${east});
 relation["place"="city"]["population"](${south},${west},${north},${east});
);
out center;`;
      console.log('🔎 Overpass query bbox:', {south,west,north,east});
      const overRes = await fetch('https://overpass-api.de/api/interpreter', {method:'POST', body: bboxQuery, headers:{'Content-Type':'text/plain;charset=UTF-8'}, signal: AbortSignal.timeout(10000)});
      if(overRes && overRes.ok){
        const overJson = await overRes.json();
        if(overJson && overJson.elements && overJson.elements.length>0){
          // Find closest city with pop >= 50000, weighted by distance and population
          let best = null; let bestScore = -Infinity;
          for(const el of overJson.elements){
            const tags = el.tags || {};
            let pop = tags.population || tags['population:urban'] || tags['population:metro'] || null;
            if(!pop) continue;
            // normalize
            pop = String(pop).replace(/,/g,'').replace(/\s/g,'');
            const pi = parseInt(pop,10);
            if(isNaN(pi)) continue;
            if(pi < 50000) continue;
            let latc = el.lat; let lonc = el.lon;
            if(!latc && el.center){ latc = el.center.lat; lonc = el.center.lon; }
            if(!latc || !lonc) continue;
            // Calculate distance and score (prefer closer cities, but weight by population)
            const dLat = latc - lat;
            const dLon = lonc - lon;
            const dist = Math.sqrt(dLat*dLat + dLon*dLon);
            const score = Math.log(pi) / (dist + 0.1); // log population / distance
            if(score > bestScore){ 
              bestScore = score; 
              best = { name: tags.name || tags['name:en'] || 'Unknown', latitude: latc, longitude: lonc, population: pi, source: 'overpass' }; 
            }
          }
          if(best){ console.log('✅ Overpass best:', best); return best; }
        }
      } else {
        console.warn('⚠️ Overpass request failed', overRes && overRes.status);
      }
    }catch(e){ console.warn('Overpass error:', e); }

    // Fallback: Search multiple common words to get a broad city list, then find nearest
    console.log('⚠️ Overpass failed or no results, searching for nearest major city...');
    try {
      // Search for cities using common search terms to get a large result set
      const searchTerms = ['London', 'Paris', 'New York', 'Tokyo', 'Berlin', 'Madrid', 'Rome'];
      let allCities = [];
      
      for(const term of searchTerms) {
        try {
          const searchUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(term)}&count=50&language=en`;
          const searchRes = await fetch(searchUrl, {signal: AbortSignal.timeout(3000)});
          if(searchRes.ok) {
            const searchData = await searchRes.json();
            if(searchData.results) {
              allCities = allCities.concat(searchData.results);
            }
          }
        } catch(e) { console.warn(`Search for ${term} failed:`, e); }
      }
      
      console.log(`✓ Collected ${allCities.length} cities from searches`);
      
      if(allCities.length === 0) {
        console.warn('❌ No cities found in any search');
        return null;
      }

      // Find the closest city with pop >= 50000, weighted by distance and population
      let best = null; let bestScore = -Infinity;
      for(const res of allCities){
        const pop = res.population || 0;
        if(pop >= 50000){
          const dLat = res.latitude - lat;
          const dLon = res.longitude - lon;
          const dist = Math.sqrt(dLat*dLat + dLon*dLon);
          if(dist <= 10) { // within 10 degrees
            const score = Math.log(pop) / (dist + 0.1); // log population / distance
            if(score > bestScore){ 
              bestScore = score; 
              best = res; 
            }
          }
        }
      }
      if(best) { console.log('✅ Found best city by coordinates:', best); return best; }
      
      console.log('⚠️ No suitable city found within 10 degrees');
      return null;
    } catch(e){ console.error('❌ Coordinate search error:', e); return null; }
  }



  window.updateCoordinate = async function(value){
    console.log('📍 updateCoordinate called with:', value, 'mode:', calculatorMode);
    if(typeof value !== 'number' || !isFinite(value)) { hideGlobe(); return; }
    
    if(calculatorMode === 'lat'){
      if(value < -90 || value > 90){ ctx.clearRect(0,0,canvas.width,canvas.height); weatherInfo.textContent = 'Latitude out of range (-90..90).'; return; }
      currentLatitude = value;
    } else {
      if(value < -180 || value > 180){ ctx.clearRect(0,0,canvas.width,canvas.height); weatherInfo.textContent = 'Longitude out of range (-180..180).'; return; }
      currentLongitude = value;
    }
    drawWhole(currentLatitude);
    
    if(calculatorMode === 'lat'){
      weatherInfo.textContent = `Latitude: ${value.toFixed(4)}° — finding nearest city...`;
      if(lookupTimer) clearTimeout(lookupTimer);
      lookupTimer = setTimeout(async ()=>{
        if(coordsText) coordsText.textContent = `Lat: ${currentLatitude.toFixed(4)}°, Lon: 0.0000°`;
        try{
          const place = await findNearestPlaceAroundPoint(currentLatitude, 0);
          foundPlace = place;
          if(place){
            weatherInfo.textContent = `Nearest: ${place.name}${place.admin1?(', '+place.admin1):''}${place.country?(', '+place.country):''}`;
          } else {
            foundPlace = null;
            weatherInfo.textContent = `No city found nearby`;
          }
          drawWhole(currentLatitude);
        }catch(err){ 
          weatherInfo.textContent = 'City lookup failed: ' + (err.message || 'unknown'); 
          console.error('Lookup error:', err); 
          drawWhole(currentLatitude);
        }
      }, 300);
    } else {
      const searchLat = currentLatitude !== null ? currentLatitude : 0;
      const isVisible = isLongitudeVisible(value);
      
      const visibilityWarning = !isVisible ? ' ⚠️ (on back of globe)' : '';
      weatherInfo.textContent = `Longitude: ${value.toFixed(4)}°${visibilityWarning} — finding nearest city...`;
      
      if(lookupTimer) clearTimeout(lookupTimer);
      lookupTimer = setTimeout(async ()=>{
        if(coordsText) coordsText.textContent = `Lat: ${searchLat.toFixed(4)}°, Lon: ${value.toFixed(4)}°`;
        try{
          const place = await findNearestPlaceAroundPoint(searchLat, currentLongitude);
          foundPlace = place;
          if(place){
            const placeVisible = isLongitudeVisible(place.longitude);
            const visibilityNote = placeVisible ? '' : ' ⚠️ (behind globe)';
            weatherInfo.textContent = `Nearest: ${place.name}${place.admin1?(', '+place.admin1):''}${place.country?(', '+place.country):''}${visibilityNote}`;
          } else {
            foundPlace = null;
            weatherInfo.textContent = `No city found nearby`;
          }
          drawWhole(currentLatitude);
        }catch(err){ 
          weatherInfo.textContent = 'City lookup failed: ' + (err.message || 'unknown'); 
          console.error('Lookup error:', err); 
          drawWhole(currentLatitude);
        }
      }, 300);
    }
  };

  // Backward compatibility
  window.updateLatitude = window.updateCoordinate;

  const modeLabel = document.getElementById('modeLabel');
  
  if(modeToggle){
    modeToggle.addEventListener('change', () => {
      calculatorMode = modeToggle.checked ? 'lon' : 'lat';
      if(modeLabel){
        modeLabel.textContent = calculatorMode.toUpperCase();
        modeLabel.style.color = calculatorMode === 'lat' ? '#0a5f38' : '#0a3d5f';
      }
      drawWhole(currentLatitude);
    });
  }

  // Mouse drag controls for rotating the globe
  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    canvas.style.cursor = 'grabbing';
  });

  canvas.addEventListener('mousemove', (e) => {
    if(!isDragging) return;
    
    const deltaX = e.clientX - lastMouseX;
    const deltaY = e.clientY - lastMouseY;
    
    // Horizontal drag rotates the globe (spin left/right)
    globeRotationX += deltaX * 0.5;
    
    // Vertical drag tilts the view (look up/down), limit to ±60°
    globeRotationY = Math.max(-60, Math.min(60, globeRotationY + deltaY * 0.3));
    
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    
    drawWhole(currentLatitude);
  });

  canvas.addEventListener('mouseup', () => {
    isDragging = false;
    canvas.style.cursor = 'grab';
  });

  canvas.addEventListener('mouseleave', () => {
    isDragging = false;
    canvas.style.cursor = 'grab';
  });

  canvas.style.cursor = 'grab';

  drawWhole(currentLatitude);
})();
