// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyD3t1XScGrfq7zZJm2j3mqTe9tsPIrPEPw",
    authDomain: "hydrsense.firebaseapp.com",
    databaseURL: "https://hydrsense-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "hydrsense",
    storageBucket: "hydrsense.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef1234567890"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Global variables
let map, fullscreenMap, historyMap, heatmap;
let currentMarker, historyMarkers = [], pathLine;
let messageHistory = [];
let locationHistory = [];
let autoRefreshInterval;
let currentPage = 1;
let itemsPerPage = 10;
let isDarkMode = false;
let charts = {};

// Document Ready
document.addEventListener('DOMContentLoaded', () => {
    // Setup sidebar toggle
    setupSidebar();
    
    // Setup navigation
    setupNavigation();
    
    // Setup global event listeners
    setupEventListeners();
    
    // Update current time
    updateTime();
    setInterval(updateTime, 1000);
    
    // Setup settings
    setupSettings();
    
    // Initialize local storage
    initializeLocalStorage();
    
    // Load user preferences
    loadUserPreferences();
});

// Initialize All Maps
function initializeAllMaps() {
    // Initial coordinates (Chennai region)
    const initialPosition = { lat: 12.925227, lng: 80.293928 };
    
    // Initialize main dashboard map
    initializeMap('map', initialPosition);
    
    // Initialize fullscreen map
    initializeFullscreenMap('fullscreenMap', initialPosition);
    
    // Initialize history map
    initializeHistoryMap('historyMap', initialPosition);
    
    // Initialize heatmap
    initializeHeatmap('heatmap', initialPosition);
    
    // Set up Firebase listener
    setupFirebaseListener();
}

// Initialize Main Map
function initializeMap(elementId, initialPosition) {
    map = new google.maps.Map(document.getElementById(elementId), {
        zoom: 15,
        center: initialPosition,
        mapTypeId: 'roadmap',
        styles: getMapStyles(),
        zoomControl: false,
        mapTypeControl: false,
        scaleControl: true,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: false
    });
    
    // Create initial marker
    currentMarker = new google.maps.Marker({
        position: initialPosition,
        map: map,
        title: 'Current Location',
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#00acc1',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2
        }
    });
}

// Initialize Fullscreen Map
function initializeFullscreenMap(elementId, initialPosition) {
    fullscreenMap = new google.maps.Map(document.getElementById(elementId), {
        zoom: 14,
        center: initialPosition,
        mapTypeId: 'roadmap',
        styles: getMapStyles(),
        zoomControl: true,
        mapTypeControl: true,
        scaleControl: true,
        streetViewControl: true,
        rotateControl: true,
        fullscreenControl: true
    });
    
    // Create path polyline
    pathLine = new google.maps.Polyline({
        path: [initialPosition],
        geodesic: true,
        strokeColor: '#00acc1',
        strokeOpacity: 1.0,
        strokeWeight: 3,
        map: fullscreenMap
    });
    
    // Create marker
    const fullscreenMarker = new google.maps.Marker({
        position: initialPosition,
        map: fullscreenMap,
        title: 'Current Location',
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: '#00acc1',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2
        }
    });
    
    // Set up map type change listener
    document.getElementById('mapType').addEventListener('change', function() {
        fullscreenMap.setMapTypeId(this.value);
    });
    
    // Set up path visibility toggle
    document.getElementById('showPath').addEventListener('change', function() {
        pathLine.setVisible(this.checked);
    });
    
    // Link marker to current location
    setInterval(() => {
        if (currentMarker && fullscreenMarker) {
            fullscreenMarker.setPosition(currentMarker.getPosition());
        }
    }, 1000);
}

// Initialize History Map
function initializeHistoryMap(elementId, initialPosition) {
    historyMap = new google.maps.Map(document.getElementById(elementId), {
        zoom: 13,
        center: initialPosition,
        mapTypeId: 'roadmap',
        styles: getMapStyles(),
        zoomControl: true,
        mapTypeControl: false,
        scaleControl: true,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: false
    });
}

// Initialize Heatmap
function initializeHeatmap(elementId, initialPosition) {
    heatmap = new google.maps.Map(document.getElementById(elementId), {
        zoom: 12,
        center: initialPosition,
        mapTypeId: 'roadmap',
        styles: getMapStyles(),
        zoomControl: true,
        mapTypeControl: false,
        scaleControl: true,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: false
    });
    
    // Will be populated with location data later
}

// Set up Firebase real-time listener
function setupFirebaseListener() {
    const loraDataRef = database.ref('loraData');
    
    loraDataRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data && data.message) {
            processMessage(data.message);
        }
    });
    
    // Mock data for testing
    setupMockData();
}

// Store last known coordinates
let lastLat = 'NA';
let lastLon = 'NA';

// Process incoming message
function processMessage(message) {
    try {
        // Parse coordinates and message
        const parts = message.split('|');
        const coordPart = parts[0].trim();
        const msgPart = parts[1] ? parts[1].trim() : 'No message content';

        // Extract coordinates
        const latMatch = coordPart.match(/Lat: ([-\d.]+)/);
        const lonMatch = coordPart.match(/Lon: ([-\d.]+)/);

        // Initialize variables for use
        let lat = 'NA';
        let lon = 'NA';
        const msgText = msgPart.replace('Msg: ', '');
        const timestamp = new Date().toISOString();

        if (latMatch && lonMatch) {
            // Valid coordinates found
            lat = parseFloat(latMatch[1]);
            lon = parseFloat(lonMatch[1]);

            // Update last known coordinates
            lastLat = lat;
            lastLon = lon;
        } else {
            // Fallback to last known coordinates
            lat = lastLat;
            lon = lastLon;
        }

        // Update location
        updateLocation(lat, lon, timestamp);

        // Add to location history
        addLocationToHistory(lat, lon, msgText, timestamp);

        // Update message log
        updateMessageLog(msgText, lat, lon, timestamp);

        // Update dashboard UI
        updateDashboardCards(lat, lon, msgText);

        // Update timeline
        updateTimeline(lat, lon, msgText, timestamp);

        // Show alert for emergency messages
        if (msgText.toLowerCase().includes('emergency') || 
            msgText.toLowerCase().includes('help') || 
            msgText.toLowerCase().includes('sos')) {
            showAlert(`EMERGENCY ALERT: ${msgText}`, 'danger');
        }

    } catch (error) {
        console.error('Error processing message:', error);
    }
}

// Update location on maps
function updateLocation(lat, lon, timestamp) {
    const position = { lat: lat, lng: lon };
    
    // Update main marker position
    currentMarker.setPosition(position);
    
    // Center map on new position if auto-center is enabled
    if (document.getElementById('autoCenter').checked) {
        map.panTo(position);
        fullscreenMap.panTo(position);
    }
    
    // Update path line
    const path = pathLine.getPath();
    path.push(new google.maps.LatLng(lat, lon));
    
    // Update location details
    document.getElementById('currentLat').textContent = lat.toFixed(6) + '°N';
    document.getElementById('currentLon').textContent = lon.toFixed(6) + '°E';
    document.getElementById('locationTimestamp').textContent = new Date(timestamp).toLocaleString();
    
    // Get nearby address (simulated)
    getNearbyAddress(lat, lon);
}

// Add location to history
function addLocationToHistory(lat, lon, message, timestamp) {
    const locationEntry = {
        lat: lat,
        lon: lon,
        message: message,
        timestamp: timestamp
    };
    
    locationHistory.unshift(locationEntry);
    
    // Keep only last 100 locations
    if (locationHistory.length > 100) {
        locationHistory = locationHistory.slice(0, 100);
    }
    
    // Save to local storage
    saveToLocalStorage('locationHistory', locationHistory);
    
    // Update history table
    updateHistoryTable();
    
    // Update history map
    updateHistoryMap();
    
    // Update analytics
    updateAnalytics();
}

// Update message log
function updateMessageLog(message, lat, lon, timestamp) {
    const logEntry = {
        message: message,
        lat: lat,
        lon: lon,
        timestamp: timestamp,
        type: detectMessageType(message)
    };
    
    // Add to history
    messageHistory.unshift(logEntry);
    
    // Keep only last 50 messages
    if (messageHistory.length > 50) {
        messageHistory = messageHistory.slice(0, 50);
    }
    
    // Save to local storage
    saveToLocalStorage('messageHistory', messageHistory);
    
    // Update UI for both message logs
    updateMessageLogUI(document.getElementById('messageLog'), messageHistory.slice(0, 5));
    updateMessageLogUI(document.getElementById('fullMessageLog'), messageHistory);
}

// Update message log UI
function updateMessageLogUI(containerElement, messages) {
    containerElement.innerHTML = messages.map(entry => {
        const date = new Date(entry.timestamp);
        const formattedTime = date.toLocaleString();
        
        let messageClass = '';
        if (entry.type === 'alert') messageClass = 'message-alert';
        else if (entry.type === 'status') messageClass = 'message-status';
        
        return `
            <div class="log-entry ${messageClass}">
                <div><strong>${entry.message}</strong></div>
                <div>Location: ${entry.lat.toFixed(6)}°N, ${entry.lon.toFixed(6)}°E</div>
                <div class="timeline-time">${formattedTime}</div>
            </div>
        `;
    }).join('');
}

// Update dashboard cards
function updateDashboardCards(lat, lon, message) {
    document.getElementById('coordinates').innerHTML = `
        <div>Latitude: ${lat.toFixed(6)}°N</div>
        <div>Longitude: ${lon.toFixed(6)}°E</div>
        <div class="coordinates-link">
            <a href="https://www.google.com/maps?q=${lat},${lon}" target="_blank">
                <small>View in Google Maps</small>
            </a>
        </div>
    `;
    
    document.getElementById('lastMessage').textContent = message;
    document.getElementById('lastUpdate').textContent = new Date().toLocaleString();
}

// Update timeline
function updateTimeline(lat, lon, message, timestamp) {
    const timelineContainer = document.getElementById('locationTimeline');
    const date = new Date(timestamp);
    const formattedTime = date.toLocaleString();
    
    const newPoint = document.createElement('div');
    newPoint.className = 'timeline-item';
    newPoint.innerHTML = `
        <div class="timeline-point"></div>
        <div class="timeline-content">
            <div><strong>${message}</strong></div>
            <div>Location: ${lat.toFixed(6)}°N, ${lon.toFixed(6)}°E</div>
            <div class="timeline-time">${formattedTime}</div>
        </div>
    `;
    
    timelineContainer.insertBefore(newPoint, timelineContainer.firstChild);
    
    // Keep only last 20 items in the DOM
    if (timelineContainer.children.length > 20) {
        timelineContainer.removeChild(timelineContainer.lastChild);
    }
}

// Update history table
function updateHistoryTable() {
    const tableBody = document.getElementById('historyTableBody');
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    const pageData = locationHistory.slice(startIdx, endIdx);
    
    tableBody.innerHTML = pageData.map(entry => {
        const date = new Date(entry.timestamp);
        const formattedTime = date.toLocaleString();
        
        return `
            <tr>
                <td>${formattedTime}</td>
                <td>${entry.lat.toFixed(6)}</td>
                <td>${entry.lon.toFixed(6)}</td>
                <td>${entry.message}</td>
                <td>
                    <button class="btn btn-small view-location" data-lat="${entry.lat}" data-lon="${entry.lon}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-small delete-location" data-timestamp="${entry.timestamp}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    // Update pagination
    const totalPages = Math.ceil(locationHistory.length / itemsPerPage);
    document.getElementById('pageIndicator').textContent = `Page ${currentPage} of ${totalPages || 1}`;
    
    // Add event listeners to new buttons
    addHistoryTableEventListeners();
}

// Update history map
function updateHistoryMap() {
    // Clear previous markers
    historyMarkers.forEach(marker => marker.setMap(null));
    historyMarkers = [];
    
    // Exit if no history
    if (locationHistory.length === 0) return;
    
    // Create path
    const pathCoordinates = locationHistory.map(loc => ({ lat: loc.lat, lng: loc.lon })).reverse();
    
    // Create new path
    const historyPath = new google.maps.Polyline({
        path: pathCoordinates,
        geodesic: true,
        strokeColor: '#00acc1',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        map: historyMap
    });
    
    // Create markers for each point
    locationHistory.forEach((loc, index) => {
        // Only create a marker every few points to avoid cluttering the map
        if (index % 3 === 0 || index === 0 || index === locationHistory.length - 1) {
            const marker = new google.maps.Marker({
                position: { lat: loc.lat, lng: loc.lon },
                map: historyMap,
                title: new Date(loc.timestamp).toLocaleString(),
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 6,
                    fillColor: index === 0 ? '#ef5350' : '#00acc1',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 1
                }
            });
            
            // Create info window
            const infoContent = `
                <div class="info-window">
                    <div><strong>${loc.message}</strong></div>
                    <div>Location: ${loc.lat.toFixed(6)}°N, ${loc.lon.toFixed(6)}°E</div>
                    <div>${new Date(loc.timestamp).toLocaleString()}</div>
                </div>
            `;
            
            const infoWindow = new google.maps.InfoWindow({
                content: infoContent
            });
            
            // Add click event
            marker.addListener('click', () => {
                infoWindow.open(historyMap, marker);
            });
            
            historyMarkers.push(marker);
        }
    });
    
    // Center on latest location
    if (locationHistory.length > 0) {
        const latestLoc = locationHistory[0];
        historyMap.setCenter({ lat: latestLoc.lat, lng: latestLoc.lon });
    }
    
    // Update heatmap
    updateHeatmap();
}

// Update heatmap
function updateHeatmap() {
    if (!google.maps.visualization) return; // Skip if visualization library isn't loaded
    
    // Create heatmap data
    const heatmapData = locationHistory.map(loc => {
        return new google.maps.LatLng(loc.lat, loc.lon);
    });
    
    // Create heatmap layer
    const heatmapLayer = new google.maps.visualization.HeatmapLayer({
        data: heatmapData,
        map: heatmap,
        radius: 20,
        opacity: 0.7
    });
}

// Get nearby address (simulated)
function getNearbyAddress(lat, lon) {
    // In a real application, you would use a geocoding service
    // This is a simple simulation
    const addresses = [
        'Chennai Main Road, Tambaram',
        '123 Anna Salai, Chennai',
        'Gandhi Street, Velachery',
        'Marina Beach Road',
        'T Nagar, Chennai',
        'Porur Junction',
        'OMR Road, Sholinganallur'
    ];
    
    const randomAddress = addresses[Math.floor(Math.random() * addresses.length)];
    document.getElementById('addressInfo').textContent = randomAddress;
    
    // Simulate a delay as if we're fetching from an API
    setTimeout(() => {
        document.getElementById('addressInfo').innerHTML = `
            <div>${randomAddress}</div>
            <div><small>Chennai, Tamil Nadu, India</small></div>
        `;
    }, 1000);
}

// Detect message type based on content
function detectMessageType(message) {
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('emergency') || lowerMsg.includes('help') || lowerMsg.includes('sos')) {
        return 'alert';
    } else if (lowerMsg.includes('status') || lowerMsg.includes('update') || lowerMsg.includes('report')) {
        return 'status';
    } else {
        return 'location';
    }
}

// Show alert banner
function showAlert(message, type = 'warning') {
    const banner = document.getElementById('alertBanner');
    const alertMsg = document.getElementById('alertMessage');
    
    alertMsg.textContent = message;
    
    // Remove existing classes
    banner.classList.remove('warning', 'danger', 'success');
    
    // Add appropriate class
    banner.classList.add(type);
    
    // Show the banner
    banner.style.display = 'flex';
    
    // Auto-hide after 10 seconds unless it's a danger alert
    if (type !== 'danger') {
        setTimeout(() => {
            banner.style.display = 'none';
        }, 10000);
    }
}

// Setup sidebar toggle
function setupSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggleSidebar = document.getElementById('toggleSidebar');
    const mainContent = document.querySelector('.main-content');
    
    toggleSidebar.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('expanded');
    });
}

// Setup navigation
function setupNavigation() {
    const menuItems = document.querySelectorAll('.menu-item');
    const sections = document.querySelectorAll('.content-section');
    
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all menu items
            menuItems.forEach(mi => mi.classList.remove('active'));
            
            // Add active class to clicked menu item
            this.classList.add('active');
            
            // Hide all sections
            sections.forEach(section => section.classList.remove('active'));
            
            // Show selected section
            const targetSection = document.getElementById(this.dataset.section);
            if (targetSection) {
                targetSection.classList.add('active');
                
                // Special handling for maps
                if (this.dataset.section === 'map-section' && fullscreenMap) {
                    setTimeout(() => {
                        google.maps.event.trigger(fullscreenMap, 'resize');
                        if (currentMarker) {
                            fullscreenMap.setCenter(currentMarker.getPosition());
                        }
                    }, 100);
                } else if (this.dataset.section === 'history-section' && historyMap) {
                    setTimeout(() => {
                        google.maps.event.trigger(historyMap, 'resize');
                    }, 100);
                } else if (this.dataset.section === 'analytics-section' && heatmap) {
                    setTimeout(() => {
                        google.maps.event.trigger(heatmap, 'resize');
                        initializeCharts();
                    }, 100);
                }
            }
            
            // Close sidebar on mobile
            if (window.innerWidth < 768) {
                document.getElementById('sidebar').classList.add('collapsed');
                document.querySelector('.main-content').classList.add('expanded');
            }
        });
    });
}

// Setup global event listeners
function setupEventListeners() {
    // Close alert banner
    document.getElementById('closeAlert').addEventListener('click', () => {
        document.getElementById('alertBanner').style.display = 'none';
    });
    
    // Refresh data button
    document.getElementById('refreshData').addEventListener('click', () => {
        showAlert('Refreshing data...', 'success');
        setupMockData(); // In production, you would refresh from your real data source
    });
    
    // Map controls
    document.getElementById('zoomIn').addEventListener('click', () => {
        map.setZoom(map.getZoom() + 1);
    });
    
    document.getElementById('zoomOut').addEventListener('click', () => {
        map.setZoom(map.getZoom() - 1);
    });
    
    document.getElementById('recenterMap').addEventListener('click', () => {
        if (currentMarker) {
            map.setCenter(currentMarker.getPosition());
        }
    });
    
    // View all messages button
    document.getElementById('viewAllMessages').addEventListener('click', () => {
        // Switch to messages tab
        document.querySelectorAll('.menu-item').forEach(mi => mi.classList.remove('active'));
        document.querySelector('[data-section="message-section"]').classList.add('active');
        
        document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
        document.getElementById('message-section').classList.add('active');
    });
    
    // History pagination
    document.getElementById('prevPage').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            updateHistoryTable();
        }
    });
    
    document.getElementById('nextPage').addEventListener('click', () => {
        const totalPages = Math.ceil(locationHistory.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            updateHistoryTable();
        }
    });
    
    // Filter history button
    document.getElementById('filterHistory').addEventListener('click', () => {
        filterHistoryByDate();
    });
    
    // Search messages button
    document.getElementById('searchMessages').addEventListener('click', () => {
        searchMessages();
    });
    
    // Message filter dropdown
    document.getElementById('messageFilter').addEventListener('change', () => {
        filterMessages();
    });
    
    // Message search input (search on enter key)
    document.getElementById('messageSearch').addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            searchMessages();
        }
    });
    
    // Send message button
    document.getElementById('sendMessage').addEventListener('click', () => {
        sendMessage();
    });
    
    // Time range change for analytics
    document.getElementById('timeRange').addEventListener('change', () => {
        updateAnalytics();
    });
    
    // Export data button
    document.getElementById('exportData').addEventListener('click', () => {
        exportData();
    });
    
    // Clear messages button
    document.getElementById('clearMessages').addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all messages?')) {
            messageHistory = [];
            saveToLocalStorage('messageHistory', messageHistory);
            updateMessageLogUI(document.getElementById('messageLog'), []);
            updateMessageLogUI(document.getElementById('fullMessageLog'), []);
            showAlert('All messages cleared', 'success');
        }
    });
}

// Setup settings
function setupSettings() {
    // Settings navigation
    document.querySelectorAll('.settings-nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all nav items
            document.querySelectorAll('.settings-nav-item').forEach(ni => ni.classList.remove('active'));
            
            // Add active class to clicked nav item
            this.classList.add('active');
            
            // Hide all panels
            document.querySelectorAll('.settings-panel').forEach(panel => panel.classList.remove('active'));
            
            // Show selected panel
            const targetPanel = document.getElementById(this.getAttribute('href').substring(1));
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    });
    
    // Dark mode toggle
    document.getElementById('darkModeToggle').addEventListener('change', function() {
        isDarkMode = this.checked;
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        
        // Save to local storage
        saveToLocalStorage('darkMode', isDarkMode);
    });
    
    // Save general settings
    document.getElementById('saveGeneralSettings').addEventListener('click', () => {
        const refreshInterval = document.getElementById('refreshInterval').value;
        const dataRetention = document.getElementById('dataRetention').value;
        const timeFormat = document.getElementById('timeFormat').value;
        const timezone = document.getElementById('timezone').value;
        
        // Save settings to local storage
        saveToLocalStorage('settings', {
            refreshInterval,
            dataRetention,
            timeFormat,
            timezone
        });
        
        // Apply settings
        applySettings();
        
        showAlert('Settings saved successfully', 'success');
    });
}

// Initialize local storage
function initializeLocalStorage() {
    if (!localStorage.getItem('messageHistory')) {
        localStorage.setItem('messageHistory', JSON.stringify([]));
    }
    
    if (!localStorage.getItem('locationHistory')) {
        localStorage.setItem('locationHistory', JSON.stringify([]));
    }
    
    if (!localStorage.getItem('settings')) {
        localStorage.setItem('settings', JSON.stringify({
            refreshInterval: '30',
            dataRetention: '30',
            timeFormat: '12',
            timezone: 'local'
        }));
    }
    
    if (localStorage.getItem('darkMode') === null) {
        localStorage.setItem('darkMode', JSON.stringify(false));
    }
    
    // Load data from local storage
    messageHistory = JSON.parse(localStorage.getItem('messageHistory'));
    locationHistory = JSON.parse(localStorage.getItem('locationHistory'));
    
    // Update UI
    updateMessageLogUI(document.getElementById('messageLog'), messageHistory.slice(0, 5));
    updateMessageLogUI(document.getElementById('fullMessageLog'), messageHistory);
    updateHistoryTable();
    
    // If we have locations, update timeline
    if (locationHistory.length > 0) {
        const timelineContainer = document.getElementById('locationTimeline');
        timelineContainer.innerHTML = '';
        
        // Display last 20 locations in reverse chronological order
        locationHistory.slice(0, 20).forEach(loc => {
            const date = new Date(loc.timestamp);
            const formattedTime = date.toLocaleString();
            
            const newPoint = document.createElement('div');
            newPoint.className = 'timeline-item';
            newPoint.innerHTML = `
                <div class="timeline-point"></div>
                <div class="timeline-content">
                    <div><strong>${loc.message}</strong></div>
                    <div>Location: ${loc.lat.toFixed(6)}°N, ${loc.lon.toFixed(6)}°E</div>
                    <div class="timeline-time">${formattedTime}</div>
                </div>
            `;
            
            timelineContainer.appendChild(newPoint);
        });
    }
}

// Save to local storage
function saveToLocalStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// Load user preferences
function loadUserPreferences() {
    // Load dark mode preference
    isDarkMode = JSON.parse(localStorage.getItem('darkMode')) || false;
    document.getElementById('darkModeToggle').checked = isDarkMode;
    
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
    }
    
    // Load settings
    const settings = JSON.parse(localStorage.getItem('settings'));
    if (settings) {
        document.getElementById('refreshInterval').value = settings.refreshInterval;
        document.getElementById('dataRetention').value = settings.dataRetention;
        document.getElementById('timeFormat').value = settings.timeFormat;
        document.getElementById('timezone').value = settings.timezone;
        
        // Apply settings
        applySettings();
    }
}

// Apply settings
function applySettings() {
    const settings = JSON.parse(localStorage.getItem('settings'));
    
    // Set up auto refresh
    clearInterval(autoRefreshInterval);
    if (settings.refreshInterval !== '0') {
        const intervalMs = parseInt(settings.refreshInterval) * 1000;
        autoRefreshInterval = setInterval(() => {
            setupMockData();
        }, intervalMs);
    }
}

// Update current time
function updateTime() {
    const settings = JSON.parse(localStorage.getItem('settings')) || { timeFormat: '12', timezone: 'local' };
    const now = new Date();
    let timeStr;
    
    if (settings.timeFormat === '24') {
        timeStr = now.toLocaleString('en-US', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    } else {
        timeStr = now.toLocaleString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
    
    document.getElementById('currentTime').textContent = `${now.toLocaleDateString()} ${timeStr}`;
}

// Add event listeners to history table buttons
function addHistoryTableEventListeners() {
    // View location buttons
    document.querySelectorAll('.view-location').forEach(button => {
        button.addEventListener('click', function() {
            const lat = parseFloat(this.dataset.lat);
            const lon = parseFloat(this.dataset.lon);
            
            // Center history map on this location
            historyMap.setCenter({ lat: lat, lng: lon });
            historyMap.setZoom(16);
            
            // Scroll to map
            document.getElementById('historyMap').scrollIntoView({ behavior: 'smooth' });
        });
    });
    
    // Delete location buttons
    document.querySelectorAll('.delete-location').forEach(button => {
        button.addEventListener('click', function() {
            const timestamp = this.dataset.timestamp;
            
            if (confirm('Are you sure you want to delete this location record?')) {
                // Find and remove location
                locationHistory = locationHistory.filter(loc => loc.timestamp !== timestamp);
                
                // Save to local storage
                saveToLocalStorage('locationHistory', locationHistory);
                
                // Update UI
                updateHistoryTable();
                updateHistoryMap();
                showAlert('Location record deleted', 'success');
            }
        });
    });
}

// Filter history by date
function filterHistoryByDate() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!startDate || !endDate) {
        showAlert('Please select both start and end dates', 'warning');
        return;
    }
    
    // Create Date objects (end of the day for end date)
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    // Filter history
    const allHistory = JSON.parse(localStorage.getItem('locationHistory'));
    locationHistory = allHistory.filter(loc => {
        const timestamp = new Date(loc.timestamp);
        return timestamp >= start && timestamp <= end;
    });
    
    // Reset pagination
    currentPage = 1;
    
    // Update UI
    updateHistoryTable();
    updateHistoryMap();
    
    showAlert(`Showing ${locationHistory.length} location records between selected dates`, 'success');
}

// Search messages
function searchMessages() {
    const searchTerm = document.getElementById('messageSearch').value.toLowerCase();
    
    if (!searchTerm) {
        // Reset to show all messages
        updateMessageLogUI(document.getElementById('fullMessageLog'), messageHistory);
        return;
    }
    
    // Filter messages
    const filteredMessages = messageHistory.filter(msg => 
        msg.message.toLowerCase().includes(searchTerm)
    );
    
    // Update UI
    updateMessageLogUI(document.getElementById('fullMessageLog'), filteredMessages);
    
    showAlert(`Found ${filteredMessages.length} matching messages`, 'success');
}

// Filter messages by type
function filterMessages() {
    const filterType = document.getElementById('messageFilter').value;
    
    if (filterType === 'all') {
        // Show all messages
        updateMessageLogUI(document.getElementById('fullMessageLog'), messageHistory);
        return;
    }
    
    // Filter messages
    const filteredMessages = messageHistory.filter(msg => msg.type === filterType);
    
    // Update UI
    updateMessageLogUI(document.getElementById('fullMessageLog'), filteredMessages);
    
    showAlert(`Showing ${filteredMessages.length} ${filterType} messages`, 'success');
}

// Send message
function sendMessage() {
    const messageType = document.getElementById('messageType').value;
    const messageContent = document.getElementById('messageContent').value;
    
    if (!messageContent) {
        showAlert('Please enter a message', 'warning');
        return;
    }
    
    // Clear input
    document.getElementById('messageContent').value = '';
    
    // Get current location (use last known if available)
    let lat = 12.925227;
    let lon = 80.293928;
    
    if (locationHistory.length > 0) {
        lat = locationHistory[0].lat;
        lon = locationHistory[0].lon;
    }
    
    // Add prefix based on message type
    let formattedMessage = messageContent;
    if (messageType === 'command') {
        formattedMessage = `CMD: ${messageContent}`;
    } else if (messageType === 'query') {
        formattedMessage = `QUERY: ${messageContent}`;
    } else if (messageType === 'alert') {
        formattedMessage = `ALERT: ${messageContent}`;
    }
    
    // Update message log with sent message
    updateMessageLog(formattedMessage, lat, lon, new Date().toISOString());
    
    showAlert('Message sent successfully', 'success');
}

// Initialize analytics charts
function initializeCharts() {
    // If Chart.js is not available, skip
    if (!window.Chart) return;
    
    // Clean up any existing charts
    Object.values(charts).forEach(chart => chart.destroy && chart.destroy());
    charts = {};
    
    // Create distance chart
    const distanceCtx = document.getElementById('distanceChart').getContext('2d');
    charts.distance = new Chart(distanceCtx, {
        type: 'line',
        data: {
            labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
            datasets: [{
                label: 'Distance (km)',
                data: [3.2, 4.5, 2.1, 5.7, 3.9, 6.2, 4.8],
                borderColor: '#00acc1',
                backgroundColor: 'rgba(0, 172, 193, 0.1)',
                borderWidth: 2,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    // Create message chart
    const messageCtx = document.getElementById('messageChart').getContext('2d');
    charts.message = new Chart(messageCtx, {
        type: 'bar',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Received',
                data: [12, 19, 8, 15, 12, 9, 12],
                backgroundColor: '#00acc1'
            }, {
                label: 'Sent',
                data: [7, 11, 5, 8, 9, 3, 5],
                backgroundColor: '#26c6da'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    // Create battery chart
    const batteryCtx = document.getElementById('batteryChart').getContext('2d');
    charts.battery = new Chart(batteryCtx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Battery Level (%)',
                data: [100, 92, 84, 76, 68, 60, 80],
                borderColor: '#ffa726',
                backgroundColor: 'rgba(255, 167, 38, 0.1)',
                borderWidth: 2,
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
    
    // Create uptime chart
    const uptimeCtx = document.getElementById('uptimeChart').getContext('2d');
    charts.uptime = new Chart(uptimeCtx, {
        type: 'doughnut',
        data: {
            labels: ['Online', 'Offline'],
            datasets: [{
                data: [95, 5],
                backgroundColor: ['#26a69a', '#ef5350']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            },
            cutout: '70%'
        }
    });
}

// Update analytics
function updateAnalytics() {
    // Calculate total distance traveled
    let totalDistance = 0;
    if (locationHistory.length > 1) {
        for (let i = 1; i < locationHistory.length; i++) {
            const prevLoc = locationHistory[i];
            const currLoc = locationHistory[i-1];
            
            // Calculate distance between points
            const distance = calculateDistance(
                prevLoc.lat, prevLoc.lon,
                currLoc.lat, currLoc.lon
            );
            
            totalDistance += distance;
        }
    }
    
    // Update distance display
    document.getElementById('distanceTraveled').textContent = totalDistance.toFixed(2) + ' km';
    
    // Update message count
    document.getElementById('messageCount').textContent = messageHistory.length;
    
    // Update battery status (mock data)
    const batteryLevel = Math.floor(Math.random() * 30) + 70; // Random between 70-100%
    document.getElementById('batteryStatus').textContent = batteryLevel + '%';
    
    // Update system uptime (mock data)
    const uptimeDays = Math.floor(Math.random() * 30) + 1;
    document.getElementById('systemUptime').textContent = uptimeDays + ' days';
    
    // Update charts if they exist
    if (charts.battery && charts.battery.data) {
        charts.battery.data.datasets[0].data[6] = batteryLevel;
        charts.battery.update();
    }
}

// Calculate distance between two points in km using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distance in km
    return distance;
}

// Convert degrees to radians
function deg2rad(deg) {
    return deg * (Math.PI/180);
}

// Get map styles
function getMapStyles() {
    return [
        {
            "featureType": "water",
            "elementType": "geometry",
            "stylers": [
                { "color": "#e9e9e9" },
                { "lightness": 17 }
            ]
        },
        {
            "featureType": "landscape",
            "elementType": "geometry",
            "stylers": [
                { "color": "#f5f5f5" },
                { "lightness": 20 }
            ]
        },
        {
            "featureType": "road.highway",
            "elementType": "geometry.fill",
            "stylers": [
                { "color": "#ffffff" },
                { "lightness": 17 }
            ]
        },
        {
            "featureType": "poi",
            "stylers": [
                { "visibility": "off" }
            ]
        },
        {
            "featureType": "transit",
            "stylers": [
                { "visibility": "off" }
            ]
        }
    ];
}

// Export data as CSV
function exportData() {
    // Create location history CSV
    let locationCsv = 'Timestamp,Latitude,Longitude,Message\n';
    locationHistory.forEach(loc => {
        locationCsv += `"${loc.timestamp}",${loc.lat},${loc.lon},"${loc.message}"\n`;
    });
    
    // Create and trigger download
    const blob = new Blob([locationCsv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `resqlink_location_history_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showAlert('Data exported successfully', 'success');
}

// Setup mock data for testing
function setupMockData() {
    // Get current center point
    let baseLat = 12.925227;
    let baseLon = 80.293928;
    
    if (currentMarker) {
        const position = currentMarker.getPosition();
        if (position) {
            baseLat = position.lat();
            baseLon = position.lng();
        }
    }
    
    // Generate a random movement
    const latOffset = (Math.random() - 0.5) * 0.005;
    const lonOffset = (Math.random() - 0.5) * 0.005;
    
    const newLat = baseLat + latOffset;
    const newLon = baseLon + lonOffset;
    
    // Generate a random message
    const messages = [
        'Regular status check',
        'All systems normal',
        'Position updated',
        'Battery status: Good',
        'Signal strength: Excellent',
        'Route progressing as planned',
        'Weather conditions: Clear'
    ];
    
    // Occasionally generate an emergency message
    if (Math.random() < 0.1) {
        messages.push('HELP: Emergency assistance required!');
        messages.push('SOS: Immediate evacuation needed');
        messages.push('EMERGENCY: Medical attention required');
    }
    
    const randMessage = messages[Math.floor(Math.random() * messages.length)];
    
    // Format in the expected format
    const mockData = `Lat: ${newLat} Lon: ${newLon} | Msg: ${randMessage}`;
    
    // Process this mock message
    processMessage(mockData);
}