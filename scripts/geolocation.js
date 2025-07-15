/**
 * Enhanced Geolocation Script for Network Topology Mapper
 * This script provides robust IP geolocation functionality with multiple API fallbacks
 * and enhanced user interface elements.
 */

// Global variables for geolocation
const locationCache = new Map();
const GEOLOCATION_APIS = [
  {
    name: 'ipapi.co',
    url: (ip) => `https://ipapi.co/${ip}/json/`,
    parser: (data) => ({
      country: data.country_name,
      city: data.city,
      countryCode: data.country_code,
      region: data.region,
      latitude: data.latitude,
      longitude: data.longitude,
      isp: data.org,
      timezone: data.timezone,
      success: true
    })
  },
  {
    name: 'ip-api.com',
    url: (ip) => `https://ip-api.com/json/${ip}`,
    parser: (data) => ({
      country: data.country,
      city: data.city,
      countryCode: data.countryCode,
      region: data.regionName,
      latitude: data.lat,
      longitude: data.lon,
      isp: data.isp,
      timezone: data.timezone,
      success: data.status === 'success'
    })
  },
  {
    name: 'ipinfo.io',
    url: (ip) => `https://ipinfo.io/${ip}/json`,
    parser: (data) => ({
      country: data.country,
      city: data.city,
      countryCode: data.country,
      region: data.region,
      latitude: data.loc ? data.loc.split(',')[0] : null,
      longitude: data.loc ? data.loc.split(',')[1] : null,
      isp: data.org,
      timezone: data.timezone,
      success: !data.bogon
    })
  }
];

/**
 * Enhanced CSS styles for geolocation tooltips and elements
 */
// const GEOLOCATION_CSS = `
//   .geo-tooltip {
//     position: absolute;
//     background: linear-gradient(145deg, #ffffff, #f8f9fa);
//     border: 1px solid #e1e5e9;
//     border-radius: 12px;
//     padding: 12px 16px;
//     box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
//     font-size: 0.85em;
//     z-index: 10000;
//     pointer-events: none;
//     white-space: nowrap;
//     display: none;
//     max-width: 280px;
//     font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
//   }

//   .geo-tooltip img {
//     vertical-align: middle;
//     width: 24px;
//     height: 16px;
//     margin-right: 8px;
//     border-radius: 3px;
//     display: inline-block;
//     box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
//   }

//   .geo-tooltip div {
//     margin: 3px 0;
//     line-height: 1.4;
//   }

//   .geo-tooltip div:first-child {
//     font-weight: 600;
//     color: #333;
//     font-size: 1.1em;
//   }

//   .geo-tooltip .location-detail {
//     color: #666;
//     font-size: 0.9em;
//   }

//   .geo-tooltip .coordinates {
//     color: #888;
//     font-size: 0.8em;
//     font-family: monospace;
//   }

//   .geo-loading {
//     display: inline-flex;
//     align-items: center;
//     gap: 8px;
//   }

//   .geo-loading::before {
//     content: '';
//     width: 12px;
//     height: 12px;
//     border: 2px solid #f3f3f3;
//     border-top: 2px solid #4caf50;
//     border-radius: 50%;
//     animation: spin 1s linear infinite;
//   }

//   @keyframes spin {
//     0% { transform: rotate(0deg); }
//     100% { transform: rotate(360deg); }
//   }

//   .device-location-badge {
//     position: absolute;
//     top: -8px;
//     right: -8px;
//     background: #4caf50;
//     color: white;
//     border-radius: 50%;
//     width: 20px;
//     height: 20px;
//     display: flex;
//     align-items: center;
//     justify-content: center;
//     font-size: 0.7em;
//     box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
//   }

//   .device-location-badge.private {
//     background: #ff9800;
//   }

//   .device-location-badge.error {
//     background: #f44336;
//   }

//   .location-detail-row {
//     display: flex;
//     justify-content: space-between;
//     align-items: center;
//     padding: 8px 0;
//     border-bottom: 1px solid #eee;
//   }

//   .location-detail-row:last-child {
//     border-bottom: none;
//   }

//   .location-detail-label {
//     font-weight: 600;
//     color: #555;
//     display: flex;
//     align-items: center;
//     gap: 8px;
//   }

//   .location-detail-value {
//     color: #333;
//     font-family: monospace;
//     font-size: 0.9em;
//   }

//   .location-map-link {
//     color: #2196f3;
//     text-decoration: none;
//     cursor: pointer;
//     font-size: 0.8em;
//   }

//   .location-map-link:hover {
//     text-decoration: underline;
//   }
// `;

/**
 * Check if an IP address is private/local
 * @param {string} ip - IP address to check
 * @returns {boolean} - True if IP is private
 */
function isPrivateIP(ip) {
  if (!ip || typeof ip !== 'string') return true;
  
  const parts = ip.split('.').map(Number);
  
  // Check for invalid IP format
  if (parts.length !== 4 || parts.some(part => isNaN(part) || part < 0 || part > 255)) {
    return true;
  }
  
  // Check for private IP ranges
  return (
    (parts[0] === 10) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    (parts[0] === 127) || // localhost
    (parts[0] === 169 && parts[1] === 254) || // link-local
    (parts[0] === 0) || // invalid
    (parts[0] === 255) // broadcast
  );
}

/**
 * Get device location using multiple API fallbacks
 * @param {string} ip - IP address to locate
 * @returns {Promise<Object|null>} - Location data or null
 */
async function getDeviceLocation(ip) {
  // Check cache first
  if (locationCache.has(ip)) {
    return locationCache.get(ip);
  }

  // Skip private IPs
  if (isPrivateIP(ip)) {
    const privateData = {
      country: 'Private Network',
      city: 'Local',
      countryCode: null,
      region: 'LAN',
      latitude: null,
      longitude: null,
      isp: 'Private',
      timezone: null,
      isPrivate: true
    };
    locationCache.set(ip, privateData);
    return privateData;
  }

  // Try each API in sequence
  for (const api of GEOLOCATION_APIS) {
    try {
      console.log(`Trying ${api.name} for IP: ${ip}`);
      
      const response = await fetch(api.url(ip), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        timeout: 5000
      });

      if (response.ok) {
        const data = await response.json();
        const parsed = api.parser(data);
        
        if (parsed.success !== false && parsed.country) {
          parsed.api = api.name;
          locationCache.set(ip, parsed);
          console.log(`Successfully got location from ${api.name}:`, parsed);
          return parsed;
        }
      }
    } catch (error) {
      console.warn(`API ${api.name} failed for IP ${ip}:`, error.message);
      continue;
    }
  }
  
  // If all APIs fail, cache null result to avoid repeated calls
  locationCache.set(ip, null);
  return null;
}

/**
 * Create device element with enhanced geolocation features
 * @param {Object} device - Device data
 * @returns {Promise<HTMLElement>} - Device element
 */
async function createDeviceElementWithGeo(device) {
  const deviceEl = document.createElement("div");
  deviceEl.className = `device ${device.type}`;
  deviceEl.dataset.deviceId = device.id;
  deviceEl.style.left = device.x + "px";
  deviceEl.style.top = device.y + "px";

  const statusIcon = device.status === "online" ? "🟢" : "🔴";
  const typeIcon = getTypeIcon(device.type);

  deviceEl.innerHTML = `
    <div>${typeIcon} ${device.hostname}</div>
    <div class="device-info">${device.ip} ${statusIcon}</div>
  `;

  // Add location badge
  const locationBadge = document.createElement("div");
  locationBadge.className = "device-location-badge";
  locationBadge.innerHTML = "📍";
  deviceEl.appendChild(locationBadge);

  // Enhanced hover with location
  let locationData = null;
  
  deviceEl.addEventListener("mouseenter", async (e) => {
    const tooltip = document.getElementById("geoTooltip");
    
    if (!locationData) {
      tooltip.innerHTML = '<div class="geo-loading">Fetching location...</div>';
      tooltip.style.display = "block";

      try {
        locationData = await getDeviceLocation(device.ip);
        
        if (locationData) {
          if (locationData.isPrivate) {
            locationBadge.className = "device-location-badge private";
            tooltip.innerHTML = `
              <div>🏠 Private Network</div>
              <div class="location-detail">Local Area Network</div>
            `;
          } else {
            locationBadge.className = "device-location-badge";
            const flagUrl = `https://flagsapi.com/${locationData.countryCode}/flat/32.png`;
            const mapLink = locationData.latitude && locationData.longitude 
              ? `https://www.google.com/maps?q=${locationData.latitude},${locationData.longitude}`
              : '#';
            
            tooltip.innerHTML = `
              <div>
                <img src="${flagUrl}" alt="${locationData.country} flag" onerror="this.style.display='none'">
                <strong>${locationData.country}</strong>
              </div>
              <div class="location-detail">${locationData.city}, ${locationData.region}</div>
              <div class="location-detail">ISP: ${locationData.isp || 'Unknown'}</div>
              <div class="coordinates">📍 ${locationData.latitude || 'N/A'}, ${locationData.longitude || 'N/A'}</div>
              <div class="location-detail">
                <a href="${mapLink}" target="_blank" class="location-map-link">View on Map</a>
                <span style="margin-left: 10px; font-size: 0.7em; color: #888;">via ${locationData.api}</span>
              </div>
            `;
          }
        } else {
          locationBadge.className = "device-location-badge error";
          tooltip.innerHTML = `
            <div>❓ Location Unknown</div>
            <div class="location-detail">Unable to determine location</div>
          `;
        }
      } catch (error) {
        locationBadge.className = "device-location-badge error";
        console.error("Geolocation error:", error);
        tooltip.innerHTML = `
          <div>⚠️ Location Error</div>
          <div class="location-detail">Failed to fetch location data</div>
        `;
      }
    } else {
      tooltip.style.display = "block";
    }
  });

  deviceEl.addEventListener("mousemove", (e) => {
    const tooltip = document.getElementById("geoTooltip");
    tooltip.style.left = e.pageX + 15 + "px";
    tooltip.style.top = e.pageY + 15 + "px";
  });

  deviceEl.addEventListener("mouseleave", () => {
    const tooltip = document.getElementById("geoTooltip");
    tooltip.style.display = "none";
  });

  deviceEl.addEventListener("click", (e) => {
    if (!draggedDevice) {
      showDeviceDetailsWithGeo(device);
    }
  });

  return deviceEl;
}

/**
 * Show device details with enhanced geolocation information
 * @param {Object} device - Device data
 */
async function showDeviceDetailsWithGeo(device) {
  const modal = document.getElementById("deviceModal");
  const detailContainer = document.getElementById("deviceDetails");
  modal.style.display = "block";

  // Add location loading indicator
  detailContainer.innerHTML = `
    <div class="detail-row"><span class="detail-label">IP Address:</span><span class="detail-value">${device.ip}</span></div>
    <div class="detail-row"><span class="detail-label">Geographic Location:</span><span class="detail-value geo-loading">Loading...</span></div>
    <div class="detail-row"><span class="detail-label">MAC:</span><span class="detail-value">${device.mac}</span></div>
    <div class="detail-row"><span class="detail-label">Vendor:</span><span class="detail-value">${device.vendor}</span></div>
    <div class="detail-row"><span class="detail-label">Hostname:</span><span class="detail-value">${device.hostname}</span></div>
    <div class="detail-row"><span class="detail-label">Device Type:</span><span class="detail-value">${device.type}</span></div>
    <div class="detail-row"><span class="detail-label">Status:</span><span class="detail-value">${device.status}</span></div>
    <div class="detail-row"><span class="detail-label">Open Ports:</span><span class="detail-value">${device.ports.join(", ") || "None"}</span></div>
    <div class="detail-row"><span class="detail-label">SNMP Name:</span><span class="detail-value">${device.snmpInfo.sysName}</span></div>
    <div class="detail-row"><span class="detail-label">SNMP Description:</span><span class="detail-value">${device.snmpInfo.sysDescr}</span></div>
    <div class="detail-row"><span class="detail-label">Uptime (s):</span><span class="detail-value">${device.snmpInfo.sysUptime}</span></div>
    <div class="detail-row"><span class="detail-label">Contact:</span><span class="detail-value">${device.snmpInfo.sysContact}</span></div>
    <div class="detail-row"><span class="detail-label">Location:</span><span class="detail-value">${device.snmpInfo.sysLocation}</span></div>
  `;

  // Fetch and update location data
  try {
    const locationData = await getDeviceLocation(device.ip);
    let locationInfo = "";
    
    if (locationData) {
      if (locationData.isPrivate) {
        locationInfo = `
          <div class="location-detail-row">
            <span class="location-detail-label">Unknown</span>
          </div>
        `;
      } else {
        const mapLink = locationData.latitude && locationData.longitude 
          ? `https://www.google.com/maps?q=${locationData.latitude},${locationData.longitude}`
          : '#';
        
        locationInfo = `
          <div class="location-detail-row">
            <span class="location-detail-label">🌍 Country:</span>
            <span class="location-detail-value">${locationData.country}</span>
          </div>
          <div class="location-detail-row">
            <span class="location-detail-label">🏙️ City:</span>
            <span class="location-detail-value">${locationData.city}, ${locationData.region}</span>
          </div>
          <div class="location-detail-row">
            <span class="location-detail-label">🏢 ISP:</span>
            <span class="location-detail-value">${locationData.isp || 'Unknown'}</span>
          </div>
          <div class="location-detail-row">
            <span class="location-detail-label">📍 Coords:</span>
            <span class="location-detail-value">
              ${locationData.latitude || 'N/A'}, ${locationData.longitude || 'N/A'}
              ${locationData.latitude && locationData.longitude ? 
                `<a href="${mapLink}" target="_blank" class="location-map-link">View Map</a>` : ''
              }
            </span>
          </div>
          <div class="location-detail-row">
            <span class="location-detail-label">🕒 Timezone:</span>
            <span class="location-detail-value">${locationData.timezone || 'Unknown'}</span>
          </div>
        `;
      }
    } else {
      locationInfo = `
        <div class="location-detail-row">
          <span class="location-detail-label">❓ Status:</span>
          <span class="location-detail-value">Location not available</span>
        </div>
      `;
    }

    // Update the modal with location data
    detailContainer.innerHTML = `
      <div class="detail-row"><span class="detail-label">IP Address:</span><span class="detail-value">${device.ip}</span></div>
      <div class="detail-row">
        <span class="detail-label">Geographic Location:</span>
        <div class="detail-value" style="margin-top: 8px;">${locationInfo}</div>
      </div>
      <div class="detail-row"><span class="detail-label">MAC:</span><span class="detail-value">${device.mac}</span></div>
      <div class="detail-row"><span class="detail-label">Hostname:</span><span class="detail-value">${device.hostname}</span></div>
      <div class="detail-row"><span class="detail-label">Device Type:</span><span class="detail-value">${device.type}</span></div>
      <div class="detail-row"><span class="detail-label">Status:</span><span class="detail-value">${device.status}</span></div>
      <div class="detail-row"><span class="detail-label">Open Ports:</span><span class="detail-value">${device.ports.join(", ") || "None"}</span></div>
      <div class="detail-row"><span class="detail-label">SNMP Name:</span><span class="detail-value">${device.snmpInfo.sysName}</span></div>
      <div class="detail-row"><span class="detail-label">SNMP Description:</span><span class="detail-value">${device.snmpInfo.sysDescr}</span></div>
    `;
  } catch (error) {
    console.error("Error updating device details with location:", error);
  }
}

/**
 * Add enhanced CSS styles to the document
 */
function addGeolocationCSS() {
  const style = document.createElement('style');
  // style.textContent = GEOLOCATION_CSS;
  document.head.appendChild(style);
}

/**
 * Enhanced render function with geolocation support
 */
async function renderTopologyWithGeo() {
  const canvas = document.getElementById("topologyCanvas");
  canvas.innerHTML = "";

  // Add enhanced CSS
  addGeolocationCSS();

  // Render devices with geolocation
  const devicePromises = devices.map(device => createDeviceElementWithGeo(device));
  const deviceElements = await Promise.all(devicePromises);
  
  deviceElements.forEach(element => {
    canvas.appendChild(element);
  });

  // Render connections
  connections.forEach((connection) => {
    const connectionElement = createConnectionElement(connection);
    if (connectionElement) {
      canvas.appendChild(connectionElement);
    }
  });
}

/**
 * Utility function to clear location cache
 */
function clearLocationCache() {
  locationCache.clear();
  console.log("Location cache cleared");
}

/**
 * Utility function to get cache statistics
 */
function getLocationCacheStats() {
  return {
    size: locationCache.size,
    entries: Array.from(locationCache.entries())
  };
}

/**
 * Batch preload locations for multiple devices
 * @param {Array} deviceList - List of devices to preload locations for
 */
async function preloadDeviceLocations(deviceList) {
  const promises = deviceList.map(device => 
    getDeviceLocation(device.ip).catch(err => {
      console.warn(`Failed to preload location for ${device.ip}:`, err);
      return null;
    })
  );
  
  const results = await Promise.allSettled(promises);
  const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
  console.log(`Preloaded locations for ${successful}/${deviceList.length} devices`);
}

// Export functions for use in main application
window.GeolocationEnhancer = {
  renderTopologyWithGeo,
  showDeviceDetailsWithGeo,
  createDeviceElementWithGeo,
  getDeviceLocation,
  isPrivateIP,
  clearLocationCache,
  getLocationCacheStats,
  preloadDeviceLocations,
  addGeolocationCSS
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  addGeolocationCSS();
  console.log('Geolocation enhancements loaded');
});