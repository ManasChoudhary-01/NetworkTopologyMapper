// Global variables
let devices = [];
let connections = [];
let draggedDevice = null;
let dragOffset = { x: 0, y: 0 };
let isScanning = false;

// Network device types and their characteristics
const deviceTypes = {
    router: { color: "#FF6B6B", ports: [22, 80, 443, 23, 161] },
    switch: { color: "#4ECDC4", ports: [22, 80, 443, 23, 161] },
    server: { color: "#96CEB4", ports: [22, 80, 443, 3389, 21, 25, 53] },
    host: { color: "#45B7D1", ports: [22, 80, 443, 3389] },
    unknown: { color: "#FFEAA7", ports: [] },
};

// Initialize the application
document.addEventListener("DOMContentLoaded", function () {
    setupEventListeners();
    generateSampleTopology();
});

function setupEventListeners() {
    const canvas = document.getElementById("topologyCanvas");

    // Mouse events for drag and drop
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mouseleave", handleMouseUp);

    // Touch events for mobile
    canvas.addEventListener("touchstart", handleTouchStart);
    canvas.addEventListener("touchmove", handleTouchMove);
    canvas.addEventListener("touchend", handleTouchEnd);

    // Prevent context menu
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
}

function handleMouseDown(e) {
    const device = e.target.closest(".device");
    if (device) {
        draggedDevice = device;
        const rect = device.getBoundingClientRect();
        const canvasRect = document
            .getElementById("topologyCanvas")
            .getBoundingClientRect();

        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;

        device.classList.add("dragging");
        e.preventDefault();
    }
}

function handleMouseMove(e) {
    if (draggedDevice) {
        const canvasRect = document
            .getElementById("topologyCanvas")
            .getBoundingClientRect();
        const x = e.clientX - canvasRect.left - dragOffset.x;
        const y = e.clientY - canvasRect.top - dragOffset.y;

        updateDevicePosition(draggedDevice, x, y);
        updateConnections();
    }
}

function handleMouseUp(e) {
    if (draggedDevice) {
        draggedDevice.classList.remove("dragging");
        draggedDevice = null;
    }
}

function handleTouchStart(e) {
    const touch = e.touches[0];
    const device = e.target.closest(".device");
    if (device) {
        draggedDevice = device;
        const rect = device.getBoundingClientRect();

        dragOffset.x = touch.clientX - rect.left;
        dragOffset.y = touch.clientY - rect.top;

        device.classList.add("dragging");
        e.preventDefault();
    }
}

function handleTouchMove(e) {
    if (draggedDevice) {
        const touch = e.touches[0];
        const canvasRect = document
            .getElementById("topologyCanvas")
            .getBoundingClientRect();
        const x = touch.clientX - canvasRect.left - dragOffset.x;
        const y = touch.clientY - canvasRect.top - dragOffset.y;

        updateDevicePosition(draggedDevice, x, y);
        updateConnections();
        e.preventDefault();
    }
}

function handleTouchEnd(e) {
    if (draggedDevice) {
        draggedDevice.classList.remove("dragging");
        draggedDevice = null;
    }
}

function updateDevicePosition(deviceElement, x, y) {
    const canvas = document.getElementById("topologyCanvas");
    const canvasRect = canvas.getBoundingClientRect();
    const deviceRect = deviceElement.getBoundingClientRect();

    // Constrain to canvas bounds
    const maxX = canvas.clientWidth - deviceElement.offsetWidth;
    const maxY = canvas.clientHeight - deviceElement.offsetHeight;

    x = Math.max(0, Math.min(x, maxX));
    y = Math.max(0, Math.min(y, maxY));

    deviceElement.style.left = x + "px";
    deviceElement.style.top = y + "px";

    // Update device data
    const deviceId = deviceElement.dataset.deviceId;
    const device = devices.find((d) => d.id === deviceId);
    if (device) {
        device.x = x;
        device.y = y;
    }
}

function startDiscovery() {
    if (isScanning) return;

    isScanning = true;
    const loadingIndicator = document.getElementById("loadingIndicator");
    loadingIndicator.classList.add("active");

    const networkRange = document.getElementById("networkRange").value;
    const scanMethod = document.getElementById("scanMethod").value;
    const timeout = parseInt(document.getElementById("scanTimeout").value);

    // Clear existing topology
    clearTopology();

    // Update status
    document.getElementById("currentRange").textContent = networkRange;
    document.getElementById("lastScan").textContent =
        new Date().toLocaleString();

    // Simulate network discovery
    setTimeout(() => {
        simulateNetworkDiscovery(networkRange, scanMethod);
        loadingIndicator.classList.remove("active");
        isScanning = false;
    }, 2000 + Math.random() * 3000);
}

function simulateNetworkDiscovery(networkRange, scanMethod) {
    const baseIP = networkRange
        .split("/")[0]
        .split(".")
        .slice(0, 3)
        .join(".");
    const discoveredDevices = [];

    // Generate random devices based on scan method
    const deviceCount = Math.floor(Math.random() * 15) + 5;

    for (let i = 0; i < deviceCount; i++) {
        const hostNum = Math.floor(Math.random() * 254) + 1;
        const ip = `${baseIP}.${hostNum}`;

        const device = {
            id: `device_${i}`,
            ip: ip,
            hostname: `device-${hostNum}`,
            type: getRandomDeviceType(),
            status: Math.random() > 0.1 ? "online" : "offline",
            mac: generateMacAddress(),
            vendor: getRandomVendor(),
            ports: getOpenPorts(),
            snmpInfo: generateSNMPInfo(),
            x: Math.random() * 800,
            y: Math.random() * 400,
        };

        discoveredDevices.push(device);
    }

    // Create connections between devices
    const discoveredConnections = generateConnections(discoveredDevices);

    // Add devices to the topology
    devices = discoveredDevices;
    connections = discoveredConnections;

    GeolocationEnhancer.renderTopologyWithGeo();
    updateStats();
}

function getRandomDeviceType() {
    const types = ["router", "switch", "host", "server", "unknown"];
    const weights = [0.1, 0.2, 0.4, 0.2, 0.1];

    const random = Math.random();
    let cumulative = 0;

    for (let i = 0; i < types.length; i++) {
        cumulative += weights[i];
        if (random < cumulative) {
            return types[i];
        }
    }

    return "unknown";
}

function generateMacAddress() {
    const hexChars = "0123456789ABCDEF";
    let mac = "";
    for (let i = 0; i < 6; i++) {
        if (i > 0) mac += ":";
        mac += hexChars.charAt(Math.floor(Math.random() * 16));
        mac += hexChars.charAt(Math.floor(Math.random() * 16));
    }
    return mac;
}

function getRandomVendor() {
    const vendors = [
        "Cisco",
        "Netgear",
        "TP-Link",
        "D-Link",
        "Linksys",
        "Ubiquiti",
        "Dell",
        "HP",
        "Lenovo",
        "ASUS",
    ];
    return vendors[Math.floor(Math.random() * vendors.length)];
}

function getOpenPorts() {
    const commonPorts = [22, 23, 53, 80, 443, 993, 995, 3389, 5432, 3306];
    const openPorts = [];

    for (let port of commonPorts) {
        if (Math.random() > 0.7) {
            openPorts.push(port);
        }
    }

    return openPorts;
}

function generateSNMPInfo() {
    return {
        sysName: `Device-${Math.floor(Math.random() * 1000)}`,
        sysDescr: "Network Device",
        sysUptime: Math.floor(Math.random() * 86400),
        sysContact: "admin@network.local",
        sysLocation: "Server Room",
    };
}

function generateConnections(deviceList) {
    const connectionList = [];

    // Create a more realistic network topology
    const routers = deviceList.filter((d) => d.type === "router");
    const switches = deviceList.filter((d) => d.type === "switch");
    const hosts = deviceList.filter((d) => d.type === "host");
    const servers = deviceList.filter((d) => d.type === "server");

    // Connect routers to switches
    routers.forEach((router) => {
        switches.forEach((sw) => {
            if (Math.random() > 0.6) {
                connectionList.push({
                    id: `conn_${router.id}_${sw.id}`,
                    from: router.id,
                    to: sw.id,
                    type: "ethernet",
                    status: "active",
                });
            }
        });
    });

    // Connect switches to hosts and servers
    switches.forEach((sw) => {
        [...hosts, ...servers].forEach((device) => {
            if (Math.random() > 0.7) {
                connectionList.push({
                    id: `conn_${sw.id}_${device.id}`,
                    from: sw.id,
                    to: device.id,
                    type: "ethernet",
                    status: "active",
                });
            }
        });
    });

    // If no routers/switches, create some random connections
    if (routers.length === 0 && switches.length === 0) {
        for (let i = 0; i < deviceList.length - 1; i++) {
            if (Math.random() > 0.5) {
                connectionList.push({
                    id: `conn_${deviceList[i].id}_${deviceList[i + 1].id}`,
                    from: deviceList[i].id,
                    to: deviceList[i + 1].id,
                    type: "ethernet",
                    status: "active",
                });
            }
        }
    }

    return connectionList;
}

function renderTopology() {
    const canvas = document.getElementById("topologyCanvas");

    // Clear existing content
    canvas.innerHTML = "";

    // Render devices
    devices.forEach((device) => {
        const deviceElement = createDeviceElement(device);
        canvas.appendChild(deviceElement);
    });

    // Render connections
    connections.forEach((connection) => {
        const connectionElement = createConnectionElement(connection);
        canvas.appendChild(connectionElement);
    });
}

// function createDeviceElement(device) {
//   const deviceEl = document.createElement("div");
//   deviceEl.className = `device ${device.type}`;
//   deviceEl.dataset.deviceId = device.id;
//   deviceEl.style.left = device.x + "px";
//   deviceEl.style.top = device.y + "px";

//   const statusIcon = device.status === "online" ? "🟢" : "🔴";
//   const typeIcon = getTypeIcon(device.type);

//   deviceEl.innerHTML = `
//           <div>${typeIcon} ${device.hostname}</div>
//           <div class="device-info">${device.ip} ${statusIcon}</div>
//       `;

//   // Add click event for device details
//   deviceEl.addEventListener("click", (e) => {
//     if (!draggedDevice) {
//       GeolocationEnhancer.showDeviceDetailsWithGeo(device);
//     }
//   });

//   return deviceEl;
// }

function createDeviceElement(device) {
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

    // On hover: show geolocation
    deviceEl.addEventListener("mouseenter", async (e) => {
        const tooltip = document.getElementById("geoTooltip");
        tooltip.innerHTML = "Fetching location...";
        tooltip.style.display = "block";

        try {
            const res = await fetch(`https://ip-api.com/json/${device.ip}`);
            const data = await res.json();
            if (data.status === "success") {
                const flagUrl = `https://flagsapi.com/${data.countryCode}/flat/32.png`;
                tooltip.innerHTML = `
          <img src="${flagUrl}" alt="${data.country} flag">
          ${data.country} (${data.city})
        `;
            } else {
                tooltip.innerHTML = "Location not found.";
            }
        } catch (err) {
            tooltip.innerHTML = "Error fetching location.";
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
            GeolocationEnhancer.showDeviceDetailsWithGeo(device);
        }
    });

    return deviceEl;
}

function getTypeIcon(type) {
    const icons = {
        router: "🔀",
        switch: "🔗",
        host: "💻",
        server: "🖥️",
        unknown: "❓",
    };
    return icons[type] || "❓";
}

function createConnectionElement(connection) {
    const fromDevice = devices.find((d) => d.id === connection.from);
    const toDevice = devices.find((d) => d.id === connection.to);

    if (!fromDevice || !toDevice) return null;

    const connectionEl = document.createElement("div");
    connectionEl.className = "connection";
    connectionEl.dataset.connectionId = connection.id;

    updateConnectionElement(connectionEl, fromDevice, toDevice);

    return connectionEl;
}

function updateConnectionElement(connectionEl, fromDevice, toDevice) {
    const fromX = fromDevice.x + 60; // Center of device
    const fromY = fromDevice.y + 25;
    const toX = toDevice.x + 60;
    const toY = toDevice.y + 25;

    const distance = Math.sqrt(
        Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2)
    );
    const angle = (Math.atan2(toY - fromY, toX - fromX) * 180) / Math.PI;

    connectionEl.style.left = fromX + "px";
    connectionEl.style.top = fromY + "px";
    connectionEl.style.width = distance + "px";
    connectionEl.style.transform = `rotate(${angle}deg)`;
}

function updateConnections() {
    document.querySelectorAll(".connection").forEach((connEl) => {
        const connId = connEl.dataset.connectionId;
        const conn = connections.find((c) => c.id === connId);
        if (conn) {
            const fromDevice = devices.find((d) => d.id === conn.from);
            const toDevice = devices.find((d) => d.id === conn.to);
            updateConnectionElement(connEl, fromDevice, toDevice);
        }
    });
}

function showDeviceDetails(device) {
    const modal = document.getElementById("deviceModal");
    const detailContainer = document.getElementById("deviceDetails");
    modal.style.display = "block";

    detailContainer.innerHTML = `
                <div class="detail-row"><span class="detail-label">IP Address:</span><span class="detail-value">${device.ip
        }</span></div>
                <div class="detail-row"><span class="detail-label">MAC:</span><span class="detail-value">${device.mac
        }</span></div>
                <div class="detail-row"><span class="detail-label">Vendor:</span><span class="detail-value">${device.vendor
        }</span></div>
                <div class="detail-row"><span class="detail-label">Hostname:</span><span class="detail-value">${device.hostname
        }</span></div>
                <div class="detail-row"><span class="detail-label">Device Type:</span><span class="detail-value">${device.type
        }</span></div>
                <div class="detail-row"><span class="detail-label">Status:</span><span class="detail-value">${device.status
        }</span></div>
                <div class="detail-row"><span class="detail-label">Open Ports:</span><span class="detail-value">${device.ports.join(", ") || "None"
        }</span></div>
                <div class="detail-row"><span class="detail-label">SNMP Name:</span><span class="detail-value">${device.snmpInfo.sysName
        }</span></div>
                <div class="detail-row"><span class="detail-label">SNMP Description:</span><span class="detail-value">${device.snmpInfo.sysDescr
        }</span></div>
                <div class="detail-row"><span class="detail-label">Uptime (s):</span><span class="detail-value">${device.snmpInfo.sysUptime
        }</span></div>
                <div class="detail-row"><span class="detail-label">Contact:</span><span class="detail-value">${device.snmpInfo.sysContact
        }</span></div>
                <div class="detail-row"><span class="detail-label">Location:</span><span class="detail-value">${device.snmpInfo.sysLocation
        }</span></div>
            `;
}

function closeModal() {
    document.getElementById("deviceModal").style.display = "none";
}

function updateStats() {
    document.getElementById("deviceCount").textContent = devices.length;
    document.getElementById("connectionCount").textContent =
        connections.length;
}

function clearTopology() {
    devices = [];
    connections = [];
    GeolocationEnhancer.renderTopologyWithGeo();
    updateStats();
}

function saveTopology() {
    const data = {
        devices: devices,
        connections: connections,
    };
    const blob = new Blob([JSON.stringify(data)], {
        type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "topology.json";
    a.click();
    URL.revokeObjectURL(url);
}

function loadTopology() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = () => {
            const data = JSON.parse(reader.result);
            devices = data.devices || [];
            connections = data.connections || [];
            GeolocationEnhancer.renderTopologyWithGeo();
            updateStats();
        };
        reader.readAsText(file);
    };
    input.click();
}

// function generateSampleTopology() {
//   // Auto-generate sample topology when page loads
//   simulateNetworkDiscovery("192.168.1.0/24", "hybrid");
// }

function generateSampleTopology() {
    // Auto-generate sample topology when page loads
    simulateNetworkDiscovery("192.168.1.0/24", "hybrid");

    // Preload locations for better performance
    setTimeout(() => {
        GeolocationEnhancer.preloadDeviceLocations(devices);
    }, 1000);
}