// globe.js — interactive 3D globe with city search
(function(){
  const canvas = document.getElementById('globeCanvas');
  const ctx = canvas.getContext('2d');
  const weatherInfo = document.getElementById('weatherInfo');
  const coordsText = document.getElementById('coordsText');

  let currentLatitude = null;
  let currentLongitude = 20; // for drawing meridian only - initialized to 20 to show immediately
  let calculatorMode = 'lat'; // 'lat' or 'lon'
  let foundPlace = null;
  let lookupTimer = null;
  
  // Globe rotation state
  let globeRotationX = 0; // Horizontal rotation (spin left/right)
  let globeRotationY = 0; // Vertical tilt (look up/down), limited range
  let isDragging = false;
  let lastMouseX = 0;
  let lastMouseY = 0;
  
  // Target city for game mode
  let targetCity = null;
  
  const modeToggle = document.getElementById('modeToggle');

  function setCanvasSize(){
    const size = Math.max(800, Math.floor(window.innerHeight * 1.19)); // 40% larger: 0.85 * 1.4 = 1.19
    canvas.width = size;
    canvas.height = size;
  }
  setCanvasSize();
  window.addEventListener('resize', () => { setCanvasSize(); redrawPlaceholder(); });

  function hideGlobe(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(weatherInfo) weatherInfo.textContent = 'Enter latitude/longitude to find nearest city.';
    foundPlace = null;
  }

  function redrawPlaceholder(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    drawWhole(currentLatitude);
  }

  // Draw the entire scene: parallel back, sphere, parallel front, markers
  function updateRotationFeedback() {
    const rotXEl = document.getElementById('rotationX');
    const rotYEl = document.getElementById('rotationY');
    
    if(rotXEl) rotXEl.textContent = globeRotationX.toFixed(1) + '°';
    if(rotYEl) rotYEl.textContent = globeRotationY.toFixed(1) + '°';
  }

  function drawWhole(latValue){
    const cx = canvas.width/2;
    const cy = canvas.height/2;
    const r = Math.max(10, canvas.width/2 - 4);

    ctx.clearRect(0,0,canvas.width,canvas.height);
    
    // Update rotation feedback display
    updateRotationFeedback();
    
    // Set up circular clipping path to prevent square edges
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r + 5, 0, Math.PI*2); // Slightly larger to prevent edge artifacts
    ctx.clip();

    const grad = ctx.createRadialGradient(cx - r*0.3, cy, r*0.1, cx, cy, r);
    grad.addColorStop(0, '#5db3ff');
    grad.addColorStop(1, '#1e6fe0');

    // draw back meridian if in lon mode
    if(calculatorMode === 'lon' && currentLongitude !== null){
      drawMeridian(currentLongitude, {strokeStyle: 'rgba(0,0,0,0.06)', lineWidth:3, backOnly:true, radius:r});
    }

    // draw back parallel (if any)
    if(latValue === null){
      // faint central horizontal line as placeholder
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx - r*0.95, cy); ctx.lineTo(cx + r*0.95, cy); ctx.stroke();
    } else {
      drawParallel(latValue, {backOnly:true, radius:r});
    }

    // draw sphere
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fillStyle = grad; ctx.fill();

    // draw map grid overlay (meridians and parallels)
    drawMapGrid(r);

    // draw front parallel
    if(latValue !== null) drawParallel(latValue, {frontOnly:true, radius:r});
    
    // draw front meridian if in lon mode
    if(calculatorMode === 'lon' && currentLongitude !== null){
      drawMeridian(currentLongitude, {strokeStyle:'rgba(255,255,255,0.25)', lineWidth:2, frontOnly:true, radius:r});
    }

    // Restore context after clipping
    ctx.restore();
    
    // Draw target city marker (game mode) - RED DOT
    if(targetCity){
      const p = projectLatLon(targetCity.lat, targetCity.lon, false, r);
      if(p.z >= 0){
        const markerSize = Math.max(7, r*0.09);
        const labelOffsetX = Math.max(10, r*0.10);
        const labelOffsetY = Math.max(8, r*0.08);
        
        // Red marker for target city
        ctx.beginPath();
        ctx.fillStyle = '#ff3333';
        ctx.strokeStyle = '#cc0000';
        ctx.lineWidth = 3;
        ctx.arc(p.x, p.y, markerSize, 0, Math.PI*2);
        ctx.fill();
        ctx.stroke();
        
        // City name
        ctx.textAlign = 'left';
        ctx.fillStyle = '#000';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('🎯 ' + targetCity.name, p.x + labelOffsetX, p.y - labelOffsetY - 8);
        
        // Coordinates - BIGGER
        ctx.font = 'bold 13px sans-serif';
        ctx.fillStyle = '#ff3333';
        ctx.fillText(`(${targetCity.lat.toFixed(2)}°, ${targetCity.lon.toFixed(2)}°)`, 
                     p.x + labelOffsetX, p.y + Math.max(6, r*0.05));
      }
    }

    // Note: City search removed - game uses only lat/lon lines to aim at target

    // Show fixed longitude (prime meridian) used for searches
    ctx.fillStyle = '#333';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Lon: 0°`, cx, cy + r + 20);
  }

  function projectLatLon(latDeg, lonDeg, addLatOffset = false, radiusOverride = null){
    const cx = canvas.width/2, cy = canvas.height/2;
    const r = radiusOverride !== null ? radiusOverride : Math.max(10, canvas.width/2 - 4);
    
    // Apply globe rotation
    const phi = latDeg * Math.PI/180;
    // Add 12.9° offset to longitude for latitude lines to center them better
    const latOffsetDeg = addLatOffset ? 12.9 : 0;
    const lambda = (lonDeg + globeRotationX + latOffsetDeg) * Math.PI/180;
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
    const r = opts.radius || Math.max(10, canvas.width/2 - 4);
    
    // Sample all points around the latitude circle with z-depth
    const points = [];
    for(let i = 0; i <= numPoints; i++){
      const lonDeg = (i / numPoints) * 360 - 180;
      const p = projectLatLon(latDeg, lonDeg, true, r); // Add latitude offset for centering
      points.push({...p, lon: lonDeg});
    }
    
    // Separate into segments based on visibility
    const frontSegments = [];
    const backSegments = [];
    let currentFrontSegment = [];
    let currentBackSegment = [];
    
    for(let i = 0; i < points.length; i++){
      const p = points[i];
      
      // Use normalized longitude to determine if point should be visible
      // Account for rotation: visible range is roughly where z >= 0
      if(p.z >= 0){
        // Front side
        if(currentBackSegment.length > 0) {
          backSegments.push(currentBackSegment);
          currentBackSegment = [];
        }
        currentFrontSegment.push(p);
      } else {
        // Back side
        if(currentFrontSegment.length > 0) {
          frontSegments.push(currentFrontSegment);
          currentFrontSegment = [];
        }
        currentBackSegment.push(p);
      }
    }
    
    // Push remaining segments
    if(currentFrontSegment.length > 0) frontSegments.push(currentFrontSegment);
    if(currentBackSegment.length > 0) backSegments.push(currentBackSegment);

    // Draw back segments (only if truly behind and not in frontOnly mode)
    if(!opts.frontOnly){
      backSegments.forEach(segment => {
        if(segment.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(segment[0].x, segment[0].y);
        for(let i = 1; i < segment.length; i++){
          ctx.lineTo(segment[i].x, segment[i].y);
        }
        ctx.strokeStyle = opts.backOnly ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.15)';
        ctx.lineWidth = opts.backOnly ? 2 : 3;
        ctx.stroke();
      });
    }

    // Draw front segments (only if not in backOnly mode)
    if(!opts.backOnly){
      frontSegments.forEach(segment => {
        if(segment.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(segment[0].x, segment[0].y);
        for(let i = 1; i < segment.length; i++){
          ctx.lineTo(segment[i].x, segment[i].y);
        }
        ctx.strokeStyle = 'rgba(74,222,128,0.95)'; // Green tint for latitude (#4ade80)
        ctx.lineWidth = 3;
        ctx.stroke();
      });
    }
  }

  function drawMeridian(lonDeg, opts={}){
    const numPoints = 180;
    const backPoints = [];
    const frontPoints = [];
    const r = opts.radius || Math.max(10, canvas.width/2 - 4);
    
    // Sample points along the meridian from south to north pole
    for(let i = 0; i <= numPoints; i++){
      const latDeg = (i / numPoints) * 180 - 90;
      const p = projectLatLon(latDeg, lonDeg, false, r); // No latitude offset for longitude lines
      // Use small negative threshold
      if(p.z >= -0.5){
        frontPoints.push(p);
      } else {
        backPoints.push(p);
      }
    }

    // Draw back half (behind the globe)
    if(opts.backOnly){
      const trulyHidden = backPoints.filter(p => p.z < -1);
      if(trulyHidden.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(trulyHidden[0].x, trulyHidden[0].y);
      for(let i=1; i<trulyHidden.length; i++) ctx.lineTo(trulyHidden[i].x, trulyHidden[i].y);
      ctx.strokeStyle = opts.strokeStyle || 'rgba(0,0,0,0.06)';
      ctx.lineWidth = opts.lineWidth || 2;
      ctx.stroke();
      return;
    }

    // Draw back half
    if(backPoints.length > 1){
      const trulyHidden = backPoints.filter(p => p.z < -1);
      if(trulyHidden.length > 1) {
        ctx.beginPath();
        ctx.moveTo(trulyHidden[0].x, trulyHidden[0].y);
        for(let i=1; i<trulyHidden.length; i++) ctx.lineTo(trulyHidden[i].x, trulyHidden[i].y);
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
    
    // Draw front half (visible on the globe)
    if(frontPoints.length > 1){
      ctx.beginPath();
      ctx.moveTo(frontPoints[0].x, frontPoints[0].y);
      for(let i=1; i<frontPoints.length; i++) ctx.lineTo(frontPoints[i].x, frontPoints[i].y);
      ctx.strokeStyle = 'rgba(96,165,250,0.95)'; // Blue tint for longitude (#60a5fa)
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
            const p = projectLatLon(lat, lon, false, r);
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
    // Get current mode from toggle
    const currentMode = modeToggle && modeToggle.checked ? 'lon' : 'lat';
    console.log('📍 updateCoordinate called with:', value, 'current mode:', currentMode);
    if(typeof value !== 'number' || !isFinite(value)) { hideGlobe(); return; }
    
    if(currentMode === 'lat'){
      if(value < -90 || value > 90){ 
        ctx.clearRect(0,0,canvas.width,canvas.height); 
        if(weatherInfo) weatherInfo.textContent = 'Latitude out of range (-90..90).'; 
        return; 
      }
      currentLatitude = value;
      calculatorMode = 'lat';
    } else {
      if(value < -180 || value > 180){ 
        ctx.clearRect(0,0,canvas.width,canvas.height); 
        if(weatherInfo) weatherInfo.textContent = 'Longitude out of range (-180..180).'; 
        return; 
      }
      currentLongitude = value;
      calculatorMode = 'lon';
    }
    drawWhole(currentLatitude);
    
    if(calculatorMode === 'lat'){
      if(weatherInfo) weatherInfo.textContent = `Latitude: ${value.toFixed(4)}° — finding nearest city...`;
      if(lookupTimer) clearTimeout(lookupTimer);
      lookupTimer = setTimeout(async ()=>{
        if(coordsText) coordsText.textContent = `Lat: ${currentLatitude.toFixed(4)}°, Lon: 0.0000°`;
        try{
          const place = await findNearestPlaceAroundPoint(currentLatitude, 0);
          foundPlace = place;
          if(place){
            if(weatherInfo) weatherInfo.textContent = `Nearest: ${place.name}${place.admin1?(', '+place.admin1):''}${place.country?(', '+place.country):''}`;
          } else {
            foundPlace = null;
            if(weatherInfo) weatherInfo.textContent = `No city found nearby`;
          }
          drawWhole(currentLatitude);
        }catch(err){ 
          if(weatherInfo) weatherInfo.textContent = 'City lookup failed: ' + (err.message || 'unknown'); 
          console.error('Lookup error:', err); 
          drawWhole(currentLatitude);
        }
      }, 300);
    } else {
      const searchLat = currentLatitude !== null ? currentLatitude : 0;
      const isVisible = isLongitudeVisible(value);
      
      const visibilityWarning = !isVisible ? ' ⚠️ (on back of globe)' : '';
      if(weatherInfo) weatherInfo.textContent = `Longitude: ${value.toFixed(4)}°${visibilityWarning} — finding nearest city...`;
      
      if(lookupTimer) clearTimeout(lookupTimer);
      lookupTimer = setTimeout(async ()=>{
        if(coordsText) coordsText.textContent = `Lat: ${searchLat.toFixed(4)}°, Lon: ${value.toFixed(4)}°`;
        try{
          const place = await findNearestPlaceAroundPoint(searchLat, currentLongitude);
          foundPlace = place;
          if(place){
            const placeVisible = isLongitudeVisible(place.longitude);
            const visibilityNote = placeVisible ? '' : ' ⚠️ (behind globe)';
            if(weatherInfo) weatherInfo.textContent = `Nearest: ${place.name}${place.admin1?(', '+place.admin1):''}${place.country?(', '+place.country):''}${visibilityNote}`;
          } else {
            foundPlace = null;
            if(weatherInfo) weatherInfo.textContent = `No city found nearby`;
          }
          drawWhole(currentLatitude);
        }catch(err){ 
          if(weatherInfo) weatherInfo.textContent = 'City lookup failed: ' + (err.message || 'unknown'); 
          console.error('Lookup error:', err); 
          drawWhole(currentLatitude);
        }
      }, 300);
    }
  };

  // Backward compatibility
  window.updateLatitude = window.updateCoordinate;
  
  window.rotateGlobeTo = function(lat, lon) {
    console.log('\n🔄 ====== GLOBE ROTATION APPLIED ======');
    console.log('🎯 CENTERING VIEW ON:');
    console.log('  LAT:', lat.toFixed(1), '°');
    console.log('  LON:', lon.toFixed(1), '°');
    console.log('');
    console.log('⚙️ ROTATION STATE BEFORE:');
    console.log('  globeRotationX:', globeRotationX.toFixed(1), '° (horizontal)');
    console.log('  globeRotationY:', globeRotationY.toFixed(1), '° (vertical)');
    console.log('');
    
    // Store old values for comparison
    const oldX = globeRotationX;
    const oldY = globeRotationY;
    
    // Rotate globe to show the specified coordinates
    // globeRotationX controls horizontal rotation (negative LON to center it)
    globeRotationX = -lon;
    
    // Limit vertical rotation (negative LAT for proper viewing angle)
    const targetY = -lat;
    globeRotationY = Math.max(-12, Math.min(12, targetY));
    
    console.log('⚙️ ROTATION STATE AFTER:');
    console.log('  globeRotationX:', globeRotationX.toFixed(1), '° (Δ', (globeRotationX - oldX).toFixed(1), '°)');
    console.log('  globeRotationY:', globeRotationY.toFixed(1), '° (Δ', (globeRotationY - oldY).toFixed(1), '°)');
    console.log('');
    console.log('💡 INTERPRETATION:');
    console.log('  • globeRotationX = -LON centers longitude horizontally');
    console.log('  • globeRotationY = -LAT (clamped ±12°) tilts view vertically');
    console.log('  • The point (', lat.toFixed(1), '°,', lon.toFixed(1), '°) should now be front-center');
    console.log('');
    console.log('🔍 USE THIS INFO TO GUIDE ROTATION BEHAVIOR:');
    console.log('  ► If you want different start rotation, tell me desired');
    console.log('    globeRotationX and globeRotationY values for game start');
    console.log('  ► If you want different intersection view, describe what');
    console.log('    you see vs. what you want to see');
    console.log('=========================================\n');
    
    drawWhole(currentLatitude);
  };

  const modeLabel = document.getElementById('modeLabel');
  
  if(modeToggle){
    modeToggle.addEventListener('change', () => {
      console.log('🌍 Globe.js: Toggle changed to:', modeToggle.checked ? 'LON' : 'LAT');
      
      calculatorMode = modeToggle.checked ? 'lon' : 'lat';
      if(modeLabel){
        modeLabel.textContent = calculatorMode.toUpperCase();
        modeLabel.style.color = calculatorMode === 'lat' ? '#0a5f38' : '#0a3d5f';
      }
      
      // If game is active, trigger game display update
      const gameActive = window.isGameActive && window.isGameActive();
      console.log('🎮 Game active?', gameActive);
      
      if(gameActive) {
        console.log('🎮 Calling window.updateGameDisplay...');
        if(window.updateGameDisplay) {
          window.updateGameDisplay();
        } else {
          console.log('❌ window.updateGameDisplay not found!');
        }
      } else {
        console.log('🌍 Drawing globe (game not active)');
        drawWhole(currentLatitude);
      }
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

  // Keyboard shortcut - G key to toggle LAT/LON mode
  document.addEventListener('keydown', (e) => {
    if(e.key === 'g' || e.key === 'G'){
      if(modeToggle){
        modeToggle.checked = !modeToggle.checked;
        // Trigger the change event programmatically
        const event = new Event('change', { bubbles: true });
        modeToggle.dispatchEvent(event);
      }
    }
  });

  // Expose function for game to control globe rotation
  window.setGlobeRotation = function(rotX, rotY) {
    globeRotationX = rotX;
    globeRotationY = rotY;
    drawWhole(currentLatitude);
  };

  // Expose function for game to set target city marker
  window.setTargetCity = function(lat, lon, name) {
    targetCity = { lat, lon, name };
    drawWhole(currentLatitude);
  };

  // Expose function to clear target city
  window.clearTargetCity = function() {
    targetCity = null;
    drawWhole(currentLatitude);
  };

  drawWhole(currentLatitude);
})();
