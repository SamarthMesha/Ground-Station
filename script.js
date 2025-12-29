// ===== MISSION CONTROL DASHBOARD - SPACE CLUB RIT =====
// Enhanced with ignition control system and live GPS tracking

// Main application state
const AppState = {
    missionActive: false,
    missionStartTime: null,
    currentTime: null,
    telemetryData: [],
    systemStatus: 'STANDBY',
    dataRate: 0,
    packetCount: 0,
    lastUpdateTime: null,
    launchSitePosition: { lat: 18.7291, lng: 73.4642 }, // RIT coordinates
    
    // Sensor initialization status - all false initially
    sensors: {
        bmp280: { initialized: false, name: 'BMP280' },
        mpu6050: { initialized: false, name: 'MPU6050' },
        gpsNeo6M: { initialized: false, name: 'GPS NEO-6M' },
        loraSX1262: { initialized: false, name: 'LoRa SX1262' }
    },
    
    // Communication status
    communicationEstablished: false,
    isSystemConnected: false,
    
    isIgnited: false,
    ignitionTime: null,
    currentVelocity: 0,
    currentAltitude: 0,
    activePanel: null,
    
    // 3D Scene
    scene: null,
    camera: null,
    renderer: null,
    rocket: null,
    
    // Google Maps
    googleMap: null,
    flightMarker: null,
    flightPath: null,
    launchSiteMarker: null,
    
    // Chart data (will only populate when sensors are initialized)
    chartData: {
        altitude: [],
        pressure: [],
        temperature: [],
        time: [],
        accelX: [],
        accelY: [],
        accelZ: [],
        totalAccel: []
    }
};

// Ignition system state
const IgnitionState = {
    isActive: false,
    countdownActive: false,
    countdownPaused: false,
    countdownSeconds: 0,
    remainingSeconds: 0,
    countdownInterval: null,
    userAuthenticated: false,
    sequenceSteps: {
        preIgnition: false,
        armCommand: false,
        fireEnable: false
    }
};

// GPS Tracking state
const GpsTrackingState = {
    isTracking: false,
    updateInterval: null,
    lastPosition: null,
    updateRate: 1000, // Update every 1 second
    positionHistory: [],
    maxHistorySize: 100,
    lastUpdateTime: null
};

// Firebase Telemetry State
const FirebaseTelemetryState = {
    isConnected: false,
    lastSavedTime: null,
    saveInterval: null,
    saveRate: 5000, // Save to Firebase every 5 seconds
    liveDataListener: null
};

// Chart instances
let altitudeChart, trajectoryChart, accelerationChart, temperatureChart, pressureChart;

// DOM Elements
const domElements = {
    // Menu elements
    menuToggle: document.getElementById('menu-toggle'),
    menuOverlay: document.getElementById('menu-overlay'),
    menuClose: document.getElementById('menu-close'),
    menuCards: document.querySelectorAll('.menu-card'),
    panelBackBtns: document.querySelectorAll('.panel-back-btn'),
    
    // Download button
    downloadTelemetryBtn: document.getElementById('download-telemetry-btn'),
    
    // Primary telemetry (now in performance panel)
    // REMOVED: latitude and longitude references
    altitude: document.getElementById('altitude'),
    downrange: document.getElementById('downrange'),
    verticalSpeed: document.getElementById('vertical-speed'),
    horizontalSpeed: document.getElementById('horizontal-speed'),
    
    // Acceleration vectors
    accelX: document.getElementById('accel-x'),
    accelY: document.getElementById('accel-y'),
    accelZ: document.getElementById('accel-z'),
    totalAccel: document.getElementById('total-accel'),
    
    // Attitude
    roll: document.getElementById('roll'),
    pitch: document.getElementById('pitch'),
    yaw: document.getElementById('yaw'),
    angularRate: document.getElementById('angular-rate'),
    
    // System status
    ignitionStatus: document.getElementById('ignition-status'),
    commStatus: document.getElementById('comm-status'),
    gpsSats: document.getElementById('gps-sats'),
    temperature: document.getElementById('temperature'),
    
    // 3D Rocket stats (now in main dashboard)
    rocketOrientation: document.getElementById('rocket-orientation'),
    rocketRotationX: document.getElementById('rocket-rotation-x'),
    rocketRotationY: document.getElementById('rocket-rotation-y'),
    rocketRotationZ: document.getElementById('rocket-rotation-z'),
    
    // GPS elements (now in main dashboard)
    mapLat: document.getElementById('map-lat'),
    mapLon: document.getElementById('map-lon'),
    mapAlt: document.getElementById('map-alt'),
    gpsLatitude: document.getElementById('gps-latitude'),
    gpsLongitude: document.getElementById('gps-longitude'),
    gpsAltitude: document.getElementById('gps-altitude'),
    gpsSatellites: document.getElementById('gps-satellites'),
    
    // Trajectory elements
    maxAltitude: document.getElementById('max-altitude'),
    downrangeDistance: document.getElementById('downrange-distance'),
    currentAltitude: document.getElementById('current-altitude'),
    trajCurrentAltitude: document.getElementById('traj-current-altitude'),
    descentAltitude: document.getElementById('descent-altitude'),
    maxqAlt: document.getElementById('maxq-alt'),
    ignitionTime: document.getElementById('ignition-time'),
    
    // Panels
    performancePanel: document.getElementById('performance-panel'),
    trajectoryPanel: document.getElementById('trajectory-panel'),
    dataLogPanel: document.getElementById('data-log-panel'),
    
    // Buttons
    resetButton: document.getElementById('reset-button'),
    downloadDataCSV: document.getElementById('download-data-csv'),
    downloadGraphsCSV: document.getElementById('download-graphs-csv'),
    downloadTrajectoryCSV: document.getElementById('download-trajectory-csv'),
    toggleSatellite: document.getElementById('toggle-satellite'),
    
    // Log elements
    telemetryLog: document.getElementById('telemetry-log'),
    dataBuffer: document.getElementById('data-buffer'),
    
    // Ignition elements
    ignitionControlBtn: document.getElementById('ignition-control-btn'),
    ignitionOverlay: document.getElementById('ignition-overlay'),
    ignitionContainer: document.getElementById('ignition-container'),
    closeIgnitionBtn: document.getElementById('close-ignition-btn'),
    
    // Refresh warning
    refreshWarning: document.getElementById('refreshWarning'),
    continueBtn: document.getElementById('continueBtn'),
    
    // Thermocouple and Strain Gauge
    thermocouple1: document.getElementById('thermocouple-1'),
    strainGauge1: document.getElementById('strain-gauge-1')
};

// ===== INITIALIZATION =====
function initializeApp() {
    console.log('Initializing Mission Control Dashboard...');
    
    // Initialize state
    AppState.currentTime = new Date();
    AppState.lastUpdateTime = Date.now();
    
    // Initialize charts with empty data
    initializeCharts();
    
    // Initialize 3D rocket
    initialize3DRocket();
    
    // Initialize ignition system
    initializeIgnitionSystem();
    
    // Initialize GPS tracking
    initializeGpsTracking();
    
    // Initialize Firebase Telemetry
    initializeFirebaseTelemetry();
    
    // Initialize event listeners
    initializeEventListeners();
    
    console.log('Mission Control Dashboard initialized');
    addLogEntry('SYSTEM', 'Mission Control initialized. Waiting for system connection...');
}

// ===== FIREBASE TELEMETRY SYSTEM =====
function initializeFirebaseTelemetry() {
    console.log('Initializing Firebase Telemetry System...');
    
    // Check if Firebase Telemetry is available
    if (!window.firebaseTelemetryDatabase) {
        console.warn('Firebase Telemetry Database not available');
        addLogEntry('SYSTEM', 'Firebase Telemetry System: Database connection not available', 'warning');
        return;
    }
    
    FirebaseTelemetryState.isConnected = true;
    FirebaseTelemetryState.lastSavedTime = Date.now();
    
    // Start saving telemetry to Firebase
    startFirebaseTelemetrySaving();
    
    // Start listening for live telemetry from Firebase
    startFirebaseTelemetryListening();
    
    console.log('Firebase Telemetry System initialized');
    addLogEntry('SYSTEM', 'Firebase Telemetry System initialized - Live data streaming enabled');
}

function startFirebaseTelemetrySaving() {
    if (!FirebaseTelemetryState.isConnected) return;
    
    // Clear any existing interval
    if (FirebaseTelemetryState.saveInterval) {
        clearInterval(FirebaseTelemetryState.saveInterval);
        FirebaseTelemetryState.saveInterval = null;
    }
    
    // Start saving interval
    FirebaseTelemetryState.saveInterval = setInterval(() => {
        saveTelemetryToFirebase();
    }, FirebaseTelemetryState.saveRate);
    
    console.log('Started Firebase telemetry saving interval');
}

function startFirebaseTelemetryListening() {
    if (!FirebaseTelemetryState.isConnected || !window.getLiveTelemetryFromFirebase) return;
    
    // Start listening for live telemetry from Firebase
    const success = window.getLiveTelemetryFromFirebase((telemetryData) => {
        console.log('Received live telemetry from Firebase:', telemetryData);
        
        // Process the telemetry data
        if (telemetryData && AppState.isSystemConnected) {
            processTelemetryData(telemetryData);
        }
    });
    
    if (success) {
        console.log('Firebase telemetry listening started');
        addLogEntry('FIREBASE', 'Live telemetry listening enabled');
    } else {
        console.error('Failed to start Firebase telemetry listening');
        addLogEntry('FIREBASE', 'Failed to start live telemetry listening', 'error');
    }
}

async function saveTelemetryToFirebase() {
    if (!FirebaseTelemetryState.isConnected || !window.saveTelemetryToFirebase) {
        console.warn('Firebase telemetry saving not available');
        return;
    }
    
    // Check if we have telemetry data to save
    if (AppState.telemetryData.length === 0) {
        console.log('No telemetry data to save to Firebase');
        return;
    }
    
    try {
        // Get the latest telemetry data
        const latestData = AppState.telemetryData[AppState.telemetryData.length - 1];
        
        // Add metadata
        const telemetryToSave = {
            ...latestData,
            missionActive: AppState.missionActive,
            missionTime: AppState.missionStartTime ? 
                (Date.now() - AppState.missionStartTime) / 1000 : 0,
            packetCount: AppState.packetCount,
            systemConnected: AppState.isSystemConnected,
            communicationEstablished: AppState.communicationEstablished,
            timestamp: Date.now(),
            source: 'mission_control_dashboard'
        };
        
        // Save to Firebase
        const success = await window.saveTelemetryToFirebase(telemetryToSave);
        
        if (success) {
            FirebaseTelemetryState.lastSavedTime = Date.now();
            console.log('Telemetry saved to Firebase:', telemetryToSave);
        } else {
            console.error('Failed to save telemetry to Firebase');
        }
    } catch (error) {
        console.error('Error saving telemetry to Firebase:', error);
    }
}

async function getTelemetryHistoryFromFirebase(limit = 100) {
    if (!FirebaseTelemetryState.isConnected || !window.getTelemetryHistoryFromFirebase) {
        console.warn('Firebase telemetry history not available');
        return [];
    }
    
    try {
        const history = await window.getTelemetryHistoryFromFirebase(limit);
        console.log(`Retrieved ${history.length} telemetry records from Firebase`);
        return history;
    } catch (error) {
        console.error('Error getting telemetry history from Firebase:', error);
        return [];
    }
}

function stopFirebaseTelemetry() {
    if (FirebaseTelemetryState.saveInterval) {
        clearInterval(FirebaseTelemetryState.saveInterval);
        FirebaseTelemetryState.saveInterval = null;
    }
    
    FirebaseTelemetryState.isConnected = false;
    console.log('Firebase Telemetry System stopped');
    addLogEntry('SYSTEM', 'Firebase Telemetry System stopped');
}

// ===== GPS LIVE TRACKING SYSTEM =====
function initializeGpsTracking() {
    console.log('Initializing GPS tracking system...');
    
    // Initialize GPS tracking state
    GpsTrackingState.isTracking = false;
    GpsTrackingState.updateInterval = null;
    GpsTrackingState.lastPosition = null;
    GpsTrackingState.updateRate = 1000; // 1 second updates
    GpsTrackingState.positionHistory = [];
    GpsTrackingState.maxHistorySize = 100;
    GpsTrackingState.lastUpdateTime = null;
    
    console.log('GPS tracking system initialized');
    addLogEntry('SYSTEM', 'GPS live tracking system initialized (1-second updates)');
}

// Start GPS tracking
function startGpsTracking() {
    if (GpsTrackingState.isTracking) {
        console.log('GPS tracking already active');
        return;
    }
    
    console.log('Starting GPS live tracking...');
    GpsTrackingState.isTracking = true;
    GpsTrackingState.lastUpdateTime = Date.now();
    
    // Clear any existing interval
    if (GpsTrackingState.updateInterval) {
        clearInterval(GpsTrackingState.updateInterval);
        GpsTrackingState.updateInterval = null;
    }
    
    // Start the update interval for live tracking
    GpsTrackingState.updateInterval = setInterval(() => {
        updateLiveGpsData();
    }, GpsTrackingState.updateRate);
    
    addLogEntry('GPS', 'GPS live tracking started (1-second updates)', 'success');
}

// Stop GPS tracking
function stopGpsTracking() {
    if (!GpsTrackingState.isTracking) return;
    
    console.log('Stopping GPS tracking...');
    GpsTrackingState.isTracking = false;
    
    if (GpsTrackingState.updateInterval) {
        clearInterval(GpsTrackingState.updateInterval);
        GpsTrackingState.updateInterval = null;
    }
    
    addLogEntry('GPS', 'GPS live tracking stopped');
}

// Update live GPS data every second
function updateLiveGpsData() {
    if (!AppState.communicationEstablished || !AppState.isSystemConnected) {
        console.log('Cannot update GPS: System not connected');
        return;
    }
    
    // Check if we have telemetry data
    if (AppState.telemetryData.length === 0) {
        console.log('No telemetry data available for GPS update');
        return;
    }
    
    // Get the latest telemetry data
    const latestData = AppState.telemetryData[AppState.telemetryData.length - 1];
    
    // Check if we have GPS coordinates
    if (latestData.latitude !== undefined && latestData.longitude !== undefined) {
        // Update the GPS position
        updateGPSPosition(latestData);
        
        // Update GPS coordinates display
        updateGpsCoordinatesDisplay(latestData);
        
        // Update last update time
        updateGpsLastUpdateTime();
        
        // Add to position history
        addToPositionHistory(latestData);
    } else {
        console.log('No valid GPS coordinates in latest data');
    }
}

// Update GPS position on map
function updateGPSPosition(data) {
    if (data.latitude !== undefined && data.longitude !== undefined && AppState.googleMap) {
        const position = { lat: data.latitude, lng: data.longitude };
        
        // Store last position
        GpsTrackingState.lastPosition = position;
        
        // Update flight marker
        if (!AppState.flightMarker) {
            AppState.flightMarker = new google.maps.Marker({
                position: position,
                map: AppState.googleMap,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: '#ef4444',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 2
                },
                title: 'Rocket Position'
            });
        } else {
            AppState.flightMarker.setPosition(position);
        }
        
        // Update flight path
        if (!AppState.flightPath) {
            AppState.flightPath = new google.maps.Polyline({
                path: [AppState.launchSitePosition, position],
                geodesic: true,
                strokeColor: '#3b82f6',
                strokeOpacity: 1.0,
                strokeWeight: 3
            });
            AppState.flightPath.setMap(AppState.googleMap);
        } else {
            const path = AppState.flightPath.getPath();
            path.push(position);
            
            // Keep path length reasonable
            if (path.getLength() > GpsTrackingState.maxHistorySize) {
                path.removeAt(0);
            }
        }
        
        // Center map on rocket if tracking panel is active
        if (AppState.activePanel === 'tracking') {
            AppState.googleMap.panTo(position);
        }
        
        // Update map coordinates overlay
        if (domElements.mapLat) domElements.mapLat.textContent = `${data.latitude.toFixed(6)}°`;
        if (domElements.mapLon) domElements.mapLon.textContent = `${data.longitude.toFixed(6)}°`;
        if (domElements.mapAlt) domElements.mapAlt.textContent = `${data.altitude?.toFixed(0) || '--'} m`;
    }
}

// Update GPS coordinates display
function updateGpsCoordinatesDisplay(data) {
    if (data.latitude !== undefined && data.longitude !== undefined) {
        // Update GPS display in main dashboard
        if (domElements.gpsLatitude) {
            domElements.gpsLatitude.textContent = formatCoordinate(data.latitude, true);
        }
        if (domElements.gpsLongitude) {
            domElements.gpsLongitude.textContent = formatCoordinate(data.longitude, false);
        }
        if (domElements.gpsAltitude) {
            domElements.gpsAltitude.textContent = `${data.altitude?.toFixed(0) || '--'} m`;
        }
        if (domElements.gpsSatellites) {
            domElements.gpsSatellites.textContent = data.gpsSats || '--';
        }
        
        // REMOVED: Latitude and longitude updates for performance panel
        // Only update GPS altitude in performance panel
        if (domElements.altitude) {
            domElements.altitude.textContent = `${data.altitude?.toFixed(0) || '--'} m`;
        }
        
        // Log GPS update
        console.log(`GPS Update: ${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}, Alt: ${data.altitude?.toFixed(0) || '--'}m`);
    }
}

// Update GPS last update time
function updateGpsLastUpdateTime() {
    GpsTrackingState.lastUpdateTime = Date.now();
}

// Add position to history
function addToPositionHistory(data) {
    if (data.latitude !== undefined && data.longitude !== undefined) {
        const position = {
            lat: data.latitude,
            lng: data.longitude,
            alt: data.altitude || 0,
            timestamp: Date.now()
        };
        
        GpsTrackingState.positionHistory.push(position);
        
        // Keep history size manageable
        if (GpsTrackingState.positionHistory.length > GpsTrackingState.maxHistorySize) {
            GpsTrackingState.positionHistory.shift();
        }
    }
}

// ===== IGNITION SYSTEM FUNCTIONS =====
function initializeIgnitionSystem() {
    console.log('Initializing ignition system...');
    
    // Load saved ignition state
    loadIgnitionState();
    
    // Check if countdown is active on page load
    if (IgnitionState.countdownActive) {
        if (IgnitionState.remainingSeconds > 0) {
            // Show warning if countdown is active
            showRefreshWarning();
        } else {
            // Clear expired countdown
            clearIgnitionState();
        }
    }
    
    console.log('Ignition system initialized');
    addLogEntry('SYSTEM', 'Ignition control system initialized');
}

// Show refresh warning
function showRefreshWarning() {
    if (domElements.refreshWarning) {
        domElements.refreshWarning.classList.add('active');
    }
}

// Hide refresh warning
function hideRefreshWarning() {
    if (domElements.refreshWarning) {
        domElements.refreshWarning.classList.remove('active');
    }
}

// Open ignition system (full-screen overlay)
function openIgnitionSystem() {
    console.log('Opening ignition control system...');
    
    // Show ignition overlay
    const ignitionOverlay = document.getElementById('ignition-overlay');
    if (ignitionOverlay) {
        ignitionOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Load the appropriate view
        if (!IgnitionState.userAuthenticated) {
            loadIgnitionLoginView();
        } else {
            loadIgnitionDashboardView();
        }
    }
    
    addLogEntry('SYSTEM', 'Ignition control system opened');
}

// Close ignition system
function closeIgnitionSystem() {
    console.log('Closing ignition control system...');
    
    const ignitionOverlay = document.getElementById('ignition-overlay');
    if (ignitionOverlay) {
        ignitionOverlay.classList.remove('active');
        document.body.style.overflow = 'auto';
        
        // Clear the container
        const container = document.getElementById('ignition-container');
        if (container) {
            container.innerHTML = '';
        }
    }
    
    addLogEntry('SYSTEM', 'Ignition control system closed');
}

// Load ignition login view
function loadIgnitionLoginView() {
    const container = document.getElementById('ignition-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="ignition-login-container">
            <div class="ignition-system-title">SPACE CLUB IGNITION CONTROL SYSTEM</div>
            <div class="ignition-logo">
                SOUNDING ROCKET <br>IGNITION CONTROL
            </div>
            
            <div class="ignition-warning">
                ⚠️ RESTRICTED ACCESS: Authorized personnel only. All access is logged and monitored.
            </div>
            
            <div class="ignition-form-group">
                <label for="ignition-username">USER ID:</label>
                <input type="text" id="ignition-username" placeholder="Enter your User ID" autocomplete="off">
            </div>
            
            <div class="ignition-form-group">
                <label for="ignition-password">SECURITY CODE:</label>
                <div class="ignition-password-wrapper">
                    <input type="password" id="ignition-password" placeholder="Enter security code" autocomplete="off">
                    <button type="button" class="ignition-toggle-password" id="ignition-toggle-password">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
            
            <div class="ignition-error" id="ignition-error">
                Invalid credentials. Please check your User ID and Security Code.
            </div>
            
            <div class="ignition-success" id="ignition-success">
                Access granted! Loading ignition control system...
            </div>
            
            <div class="ignition-button-group">
                <button class="ignition-btn ignition-btn-reset" id="ignition-reset-btn">CLEAR</button>
                <button class="ignition-btn ignition-btn-login" id="ignition-login-btn">LOGIN</button>
            </div>
            
            <div class="ignition-footer">
                <div class="ignition-instructions">
                    <strong>Authorized Users:</strong> Use your assigned User ID and Security Code.<br>
                    <strong>Note:</strong> 3 failed attempts will trigger security protocol.
                </div>
            </div>
        </div>
    `;
    
    // Add event listeners for login form
    addIgnitionLoginListeners();
}

// Add event listeners for ignition login
function addIgnitionLoginListeners() {
    // Toggle password visibility
    const togglePasswordBtn = document.getElementById('ignition-toggle-password');
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', function() {
            const passwordInput = document.getElementById('ignition-password');
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            this.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
        });
    }
    
    // Reset button
    const resetBtn = document.getElementById('ignition-reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            document.getElementById('ignition-username').value = '';
            document.getElementById('ignition-password').value = '';
        });
    }
    
    // Login button
    const loginBtn = document.getElementById('ignition-login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', function() {
            const username = document.getElementById('ignition-username').value;
            const password = document.getElementById('ignition-password').value;
            
            if (username === '2315046' && password === '2315046') {
                // Show success message
                const successElement = document.getElementById('ignition-success');
                const errorElement = document.getElementById('ignition-error');
                
                if (errorElement) errorElement.classList.remove('active');
                if (successElement) successElement.classList.add('active');
                
                // Authenticate user
                IgnitionState.userAuthenticated = true;
                saveIgnitionState();
                
                // Show access granted notification
                showIgnitionNotification('access-granted', {
                    user: username,
                    time: new Date().toLocaleTimeString()
                });
                
                // Load dashboard after delay
                setTimeout(() => {
                    hideIgnitionNotification('access-granted');
                    loadIgnitionDashboardView();
                }, 2500);
                
            } else {
                // Show error message
                const errorElement = document.getElementById('ignition-error');
                const successElement = document.getElementById('ignition-success');
                
                if (successElement) successElement.classList.remove('active');
                if (errorElement) errorElement.classList.add('active');
            }
        });
    }
    
    // Also allow login on Enter key
    const usernameInput = document.getElementById('ignition-username');
    const passwordInput = document.getElementById('ignition-password');
    
    if (usernameInput && passwordInput) {
        usernameInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                document.getElementById('ignition-login-btn').click();
            }
        });
        
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                document.getElementById('ignition-login-btn').click();
            }
        });
    }
}

// Load ignition dashboard view
function loadIgnitionDashboardView() {
    const container = document.getElementById('ignition-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="ignition-dashboard">
            <div class="ignition-header">
                <div class="ignition-system-header">
                    <div class="ignition-system-name">SPACE CLUB IGNITION CONTROL SYSTEM</div>
                    <div class="ignition-system-version">v2.3.15</div>
                </div>
                <div class="ignition-status-bar">
                    <div class="ignition-status-item">
                        <div class="ignition-status-indicator ignition-status-online"></div>
                        <span>STATUS: ONLINE</span>
                    </div>
                    <div class="ignition-status-item">
                        <div class="ignition-status-indicator ignition-status-online"></div>
                        <span>LINK: ESTABLISHED</span>
                    </div>
                    <div class="ignition-status-item">
                        <span>USER: 2315046</span>
                    </div>
                </div>
            </div>
            
            <div class="ignition-main-content">
                <!-- Left Column -->
                <div class="ignition-left-column">
                    <!-- Sequence Panel -->
                    <div class="ignition-panel" id="ignition-sequence-panel">
                        <h3 class="ignition-panel-title">IGNITION SEQUENCE</h3>
                        <div class="ignition-sequence-item">
                            <div class="ignition-sequence-checkbox" id="ignition-check1"></div>
                            <span class="ignition-step-text">PRE-IGNITION CHECK</span>
                        </div>
                        <div class="ignition-sequence-item">
                            <div class="ignition-sequence-checkbox" id="ignition-check2"></div>
                            <span class="ignition-step-text">ARM COMMAND</span>
                        </div>
                        <div class="ignition-sequence-item">
                            <div class="ignition-sequence-checkbox disabled" id="ignition-check3"></div>
                            <span class="ignition-step-text">FIRE ENABLE</span>
                        </div>
                        <button class="ignition-sequence-btn" id="ignition-initiate-btn" disabled>INITIATE SEQUENCE</button>
                    </div>
                    
                    <!-- Event Log Panel -->
                    <div class="ignition-panel">
                        <h3 class="ignition-panel-title">EVENT LOG</h3>
                        <div class="ignition-event-log" id="ignition-event-log">
                            <div class="ignition-log-entry">
                                <span class="ignition-log-time">12:05:32</span>
                                <span>System initialized</span>
                            </div>
                            <div class="ignition-log-entry">
                                <span class="ignition-log-time">12:04:18</span>
                                <span>Ground link established</span>
                            </div>
                            <div class="ignition-log-entry">
                                <span class="ignition-log-time">12:03:45</span>
                                <span>User 2315046 authenticated</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Right Column -->
                <div class="ignition-right-column">
                    <!-- Countdown Panel (hidden by default) -->
                    <div class="ignition-panel ignition-countdown-panel" id="ignition-countdown-panel" style="display: none;">
                        <h3 class="ignition-panel-title">COUNTDOWN SEQUENCE</h3>
                        <div class="ignition-countdown-display" id="ignition-countdown-display">00:00:00</div>
                        <div class="ignition-countdown-input">
                            <div>
                                <label>Hours</label>
                                <input type="number" id="ignition-hours-input" min="0" max="23" value="0">
                            </div>
                            <div>
                                <label>Minutes</label>
                                <input type="number" id="ignition-minutes-input" min="0" max="59" value="5">
                            </div>
                            <div>
                                <label>Seconds</label>
                                <input type="number" id="ignition-seconds-input" min="0" max="59" value="0">
                            </div>
                        </div>
                        <div class="ignition-countdown-controls">
                            <button class="ignition-control-btn" id="ignition-start-countdown-btn">START COUNTDOWN</button>
                            <button class="ignition-control-btn warning" id="ignition-cancel-countdown-btn">CANCEL</button>
                        </div>
                    </div>
                    
                    <!-- Mission Complete Panel (hidden by default) -->
                    <div class="ignition-panel ignition-countdown-panel" id="ignition-mission-complete-panel" style="display: none;">
                        <div class="ignition-mission-complete-icon">🚀</div>
                        <div class="ignition-notification-title">MISSION COMPLETE</div>
                        <div class="ignition-notification-message">
                            Rocket ignition sequence successfully executed. All systems nominal.
                        </div>
                        <div class="ignition-mission-stats">
                            <div class="ignition-stat-item">
                                <div class="ignition-stat-value" id="ignition-launch-time">00:05:00</div>
                                <div class="ignition-stat-label">LAUNCH TIME</div>
                            </div>
                            <div class="ignition-stat-item">
                                <div class="ignition-stat-value" id="ignition-completion-time">12:10:45</div>
                                <div class="ignition-stat-label">COMPLETION TIME</div>
                            </div>
                            <div class="ignition-stat-item">
                                <div class="ignition-stat-value">100%</div>
                                <div class="ignition-stat-label">SYSTEM STATUS</div>
                            </div>
                            <div class="ignition-stat-item">
                                <div class="ignition-stat-value">NOMINAL</div>
                                <div class="ignition-stat-label">FLIGHT PATH</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Notifications -->
        <div class="ignition-notification" id="ignition-access-notification">
            <div class="ignition-access-icon">✓</div>
            <div class="ignition-notification-title">ACCESS GRANTED</div>
            <div class="ignition-notification-message">
                Authentication successful. You now have control system access.
            </div>
            <div class="ignition-access-details" id="ignition-access-details">
                User: 2315046<br>
                Clearance: Level 5<br>
                Time: <span id="ignition-access-time"></span>
            </div>
        </div>
        
        <div class="ignition-notification" id="ignition-confirmation-notification">
            <div class="ignition-notification-title">CONFIRM IGNITION SEQUENCE</div>
            <div class="ignition-notification-message">
                All pre-ignition checks are complete. Ready to initiate countdown sequence.
            </div>
            <div class="ignition-countdown-controls">
                <button class="ignition-control-btn" id="ignition-confirm-btn">CONFIRM</button>
                <button class="ignition-control-btn warning" id="ignition-cancel-confirm-btn">CANCEL</button>
            </div>
        </div>
        
        <div class="ignition-notification" id="ignition-ignition-notification">
            <div class="ignition-notification-title">IGNITION SEQUENCE ACTIVATED</div>
            <div class="ignition-notification-message" id="ignition-ignition-message">
                Countdown complete. Rocket ignition initiated.
            </div>
        </div>
    `;
    
    // Add event listeners for dashboard
    addIgnitionDashboardListeners();
    
    // Update sequence buttons based on saved state
    updateIgnitionSequenceButtons();
    
    // If countdown was active, resume it
    if (IgnitionState.countdownActive) {
        resumeIgnitionCountdown();
    }
}

// Add event listeners for ignition dashboard
function addIgnitionDashboardListeners() {
    // Sequence checkboxes
    const checkboxes = ['ignition-check1', 'ignition-check2', 'ignition-check3'];
    checkboxes.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.addEventListener('click', function() {
                if (this.classList.contains('disabled')) return;
                
                this.classList.toggle('checked');
                const stepName = this.parentElement.querySelector('span').textContent.trim();
                
                // Update state
                if (id === 'ignition-check1') {
                    IgnitionState.sequenceSteps.preIgnition = this.classList.contains('checked');
                } else if (id === 'ignition-check2') {
                    IgnitionState.sequenceSteps.armCommand = this.classList.contains('checked');
                } else if (id === 'ignition-check3') {
                    IgnitionState.sequenceSteps.fireEnable = this.classList.contains('checked');
                }
                
                // Update Fire Enable status
                updateIgnitionFireEnableStatus();
                
                // Update initiate button
                updateIgnitionInitiateButton();
                
                // Add log entry
                if (this.classList.contains('checked')) {
                    addIgnitionLogEntry(`Sequence step completed: ${stepName}`);
                } else {
                    addIgnitionLogEntry(`Sequence step deactivated: ${stepName}`);
                }
                
                saveIgnitionState();
            });
        }
    });
    
    // Initiate sequence button
    const initiateBtn = document.getElementById('ignition-initiate-btn');
    if (initiateBtn) {
        initiateBtn.addEventListener('click', function() {
            // Check if all steps are completed
            const allChecked = checkboxes.every(id => {
                const checkbox = document.getElementById(id);
                return checkbox && checkbox.classList.contains('checked');
            });
            
            if (!allChecked) {
                addIgnitionLogEntry("Error: Complete all sequence steps first", "warning");
                return;
            }
            
            addIgnitionLogEntry("All sequence steps completed");
            
            // Show confirmation notification
            showIgnitionNotification('confirmation');
        });
    }
    
    // Confirmation buttons
    const confirmBtn = document.getElementById('ignition-confirm-btn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', function() {
            hideIgnitionNotification('confirmation');
            addIgnitionLogEntry("Ignition sequence confirmed");
            addIgnitionLogEntry("Initiating countdown sequence");
            
            // Hide sequence panel, show countdown panel
            document.getElementById('ignition-sequence-panel').style.display = 'none';
            document.getElementById('ignition-countdown-panel').style.display = 'block';
        });
    }
    
    const cancelConfirmBtn = document.getElementById('ignition-cancel-confirm-btn');
    if (cancelConfirmBtn) {
        cancelConfirmBtn.addEventListener('click', function() {
            hideIgnitionNotification('confirmation');
            addIgnitionLogEntry("Countdown sequence cancelled");
        });
    }
    
    // Countdown controls
    const startCountdownBtn = document.getElementById('ignition-start-countdown-btn');
    if (startCountdownBtn) {
        startCountdownBtn.addEventListener('click', function() {
            const hours = parseInt(document.getElementById('ignition-hours-input').value) || 0;
            const minutes = parseInt(document.getElementById('ignition-minutes-input').value) || 0;
            const seconds = parseInt(document.getElementById('ignition-seconds-input').value) || 0;
            
            const totalSeconds = hours * 3600 + minutes * 60 + seconds;
            
            if (totalSeconds <= 0) {
                addIgnitionLogEntry("Error: Set a valid countdown time", "warning");
                return;
            }
            
            startIgnitionCountdown(totalSeconds);
        });
    }
    
    const cancelCountdownBtn = document.getElementById('ignition-cancel-countdown-btn');
    if (cancelCountdownBtn) {
        cancelCountdownBtn.addEventListener('click', function() {
            cancelIgnitionCountdown();
            addIgnitionLogEntry("Countdown cancelled");
        });
    }
}

// Update Fire Enable status
function updateIgnitionFireEnableStatus() {
    const fireEnable = document.getElementById('ignition-check3');
    if (!fireEnable) return;
    
    const check1 = document.getElementById('ignition-check1')?.classList.contains('checked');
    const check2 = document.getElementById('ignition-check2')?.classList.contains('checked');
    
    if (check1 && check2) {
        fireEnable.classList.remove('disabled');
        addIgnitionLogEntry("Fire Enable step now available");
    } else {
        fireEnable.classList.add('disabled');
        fireEnable.classList.remove('checked');
        IgnitionState.sequenceSteps.fireEnable = false;
        addIgnitionLogEntry("Fire Enable step deactivated - requires both Pre-Ignition and Arm Command");
    }
}

// Update initiate button
function updateIgnitionInitiateButton() {
    const initiateBtn = document.getElementById('ignition-initiate-btn');
    if (!initiateBtn) return;
    
    const check1 = document.getElementById('ignition-check1')?.classList.contains('checked');
    const check2 = document.getElementById('ignition-check2')?.classList.contains('checked');
    const check3 = document.getElementById('ignition-check3')?.classList.contains('checked');
    
    if (check1 && check2 && check3) {
        initiateBtn.disabled = false;
    } else {
        initiateBtn.disabled = true;
    }
}

// Update sequence buttons based on saved state
function updateIgnitionSequenceButtons() {
    if (IgnitionState.sequenceSteps.preIgnition) {
        const check1 = document.getElementById('ignition-check1');
        if (check1) check1.classList.add('checked');
    }
    
    if (IgnitionState.sequenceSteps.armCommand) {
        const check2 = document.getElementById('ignition-check2');
        if (check2) check2.classList.add('checked');
    }
    
    if (IgnitionState.sequenceSteps.fireEnable) {
        const check3 = document.getElementById('ignition-check3');
        if (check3) {
            check3.classList.add('checked');
            updateIgnitionFireEnableStatus();
        }
    }
    
    updateIgnitionInitiateButton();
}

// Show ignition notification
function showIgnitionNotification(type, data = {}) {
    let notification;
    
    switch (type) {
        case 'access-granted':
            notification = document.getElementById('ignition-access-notification');
            if (notification && data.time) {
                document.getElementById('ignition-access-time').textContent = data.time;
            }
            break;
            
        case 'confirmation':
            notification = document.getElementById('ignition-confirmation-notification');
            break;
            
        case 'ignition':
            notification = document.getElementById('ignition-ignition-notification');
            if (notification && data.message) {
                document.getElementById('ignition-ignition-message').textContent = data.message;
            }
            break;
    }
    
    if (notification) {
        notification.classList.add('active');
    }
}

// Hide ignition notification
function hideIgnitionNotification(type) {
    let notification;
    
    switch (type) {
        case 'access-granted':
            notification = document.getElementById('ignition-access-notification');
            break;
            
        case 'confirmation':
            notification = document.getElementById('ignition-confirmation-notification');
            break;
            
        case 'ignition':
            notification = document.getElementById('ignition-ignition-notification');
            break;
    }
    
    if (notification) {
        notification.classList.remove('active');
    }
}

// Start ignition countdown
function startIgnitionCountdown(totalSeconds) {
    IgnitionState.countdownActive = true;
    IgnitionState.countdownPaused = false;
    IgnitionState.countdownSeconds = totalSeconds;
    IgnitionState.remainingSeconds = totalSeconds;
    
    updateIgnitionCountdownDisplay();
    addIgnitionLogEntry(`Countdown started: ${formatIgnitionTime(totalSeconds)}`);
    
    // Save state
    saveIgnitionState();
    
    // Start countdown
    IgnitionState.countdownInterval = setInterval(() => {
        IgnitionState.remainingSeconds--;
        updateIgnitionCountdownDisplay();
        
        // Save updated state
        saveIgnitionState();
        
        // Last 10 seconds warning
        if (IgnitionState.remainingSeconds <= 10) {
            const countdownDisplay = document.getElementById('ignition-countdown-display');
            if (countdownDisplay) {
                countdownDisplay.style.color = '#ef4444';
                countdownDisplay.style.textShadow = '0 0 10px rgba(255, 85, 85, 0.5)';
            }
            
            // Add T-minus announcement
            if (IgnitionState.remainingSeconds <= 10 && IgnitionState.remainingSeconds > 0) {
                addIgnitionLogEntry(`T-minus ${IgnitionState.remainingSeconds} seconds...`);
            }
        }
        
        // Countdown complete
        if (IgnitionState.remainingSeconds <= 0) {
            clearInterval(IgnitionState.countdownInterval);
            IgnitionState.countdownActive = false;
            IgnitionState.remainingSeconds = 0;
            
            addIgnitionLogEntry("Countdown complete! Ignition sequence finished!");
            
            // Trigger Firebase ignition
            triggerFirebaseIgnition().then(ignitionSuccess => {
                if (!ignitionSuccess) {
                    addIgnitionLogEntry("WARNING: Firebase ignition command failed!", "warning");
                }
                
                // Show ignition notification
                const message = ignitionSuccess 
                    ? "Countdown complete. Rocket ignition initiated via Firebase."
                    : "Countdown complete. WARNING: Firebase ignition command failed!";
                
                showIgnitionNotification('ignition', { message: message });
                
                // After ignition notification, show mission complete panel
                setTimeout(() => {
                    hideIgnitionNotification('ignition');
                    document.getElementById('ignition-countdown-panel').style.display = 'none';
                    
                    const missionCompletePanel = document.getElementById('ignition-mission-complete-panel');
                    if (missionCompletePanel) {
                        missionCompletePanel.style.display = 'block';
                        
                        // Set mission completion stats
                        const launchTime = document.getElementById('ignition-launch-time');
                        const completionTime = document.getElementById('ignition-completion-time');
                        
                        if (launchTime) {
                            launchTime.textContent = formatIgnitionTime(IgnitionState.countdownSeconds);
                        }
                        
                        if (completionTime) {
                            completionTime.textContent = new Date().toLocaleTimeString('en-US', {
                                hour12: false,
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                            });
                        }
                        
                        // Reset countdown display style
                        const countdownDisplay = document.getElementById('ignition-countdown-display');
                        if (countdownDisplay) {
                            countdownDisplay.style.color = '';
                            countdownDisplay.style.textShadow = '';
                        }
                        
                        // Update main dashboard ignition status
                        updateMainDashboardIgnitionStatus(true);
                        
                        addIgnitionLogEntry("Mission complete. All systems nominal.");
                    }
                    
                    // Clear saved state
                    clearIgnitionState();
                    
                }, 3000);
            });
        }
    }, 1000);
}

// Resume ignition countdown
function resumeIgnitionCountdown() {
    if (!IgnitionState.countdownActive || !IgnitionState.countdownPaused) return;
    
    IgnitionState.countdownPaused = false;
    updateIgnitionCountdownDisplay();
    addIgnitionLogEntry(`Countdown resumed: ${formatIgnitionTime(IgnitionState.remainingSeconds)}`);
    
    // Hide sequence panel, show countdown panel
    const sequencePanel = document.getElementById('ignition-sequence-panel');
    const countdownPanel = document.getElementById('ignition-countdown-panel');
    if (sequencePanel) sequencePanel.style.display = 'none';
    if (countdownPanel) countdownPanel.style.display = 'block';
    
    // Resume countdown
    IgnitionState.countdownInterval = setInterval(() => {
        IgnitionState.remainingSeconds--;
        updateIgnitionCountdownDisplay();
        
        // Save updated state
        saveIgnitionState();
        
        // Last 10 seconds warning
        if (IgnitionState.remainingSeconds <= 10) {
            const countdownDisplay = document.getElementById('ignition-countdown-display');
            if (countdownDisplay) {
                countdownDisplay.style.color = '#ef4444';
                countdownDisplay.style.textShadow = '0 0 10px rgba(255, 85, 85, 0.5)';
            }
            
            // Add T-minus announcement
            if (IgnitionState.remainingSeconds <= 10 && IgnitionState.remainingSeconds > 0) {
                addIgnitionLogEntry(`T-minus ${IgnitionState.remainingSeconds} seconds...`);
            }
        }
        
        // Countdown complete
        if (IgnitionState.remainingSeconds <= 0) {
            clearInterval(IgnitionState.countdownInterval);
            IgnitionState.countdownActive = false;
            IgnitionState.remainingSeconds = 0;
            
            addIgnitionLogEntry("Countdown complete! Ignition sequence finished!");
            
            // Trigger Firebase ignition
            triggerFirebaseIgnition().then(ignitionSuccess => {
                if (!ignitionSuccess) {
                    addIgnitionLogEntry("WARNING: Firebase ignition command failed!", "warning");
                }
                
                // Show ignition notification
                const message = ignitionSuccess 
                    ? "Countdown complete. Rocket ignition initiated via Firebase."
                    : "Countdown complete. WARNING: Firebase ignition command failed!";
                
                showIgnitionNotification('ignition', { message: message });
                
                // After ignition notification, show mission complete panel
                setTimeout(() => {
                    hideIgnitionNotification('ignition');
                    document.getElementById('ignition-countdown-panel').style.display = 'none';
                    
                    const missionCompletePanel = document.getElementById('ignition-mission-complete-panel');
                    if (missionCompletePanel) {
                        missionCompletePanel.style.display = 'block';
                        
                        // Set mission completion stats
                        const launchTime = document.getElementById('ignition-launch-time');
                        const completionTime = document.getElementById('ignition-completion-time');
                        
                        if (launchTime) {
                            launchTime.textContent = formatIgnitionTime(IgnitionState.countdownSeconds);
                        }
                        
                        if (completionTime) {
                            completionTime.textContent = new Date().toLocaleTimeString('en-US', {
                                hour12: false,
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                            });
                        }
                        
                        // Reset countdown display style
                        const countdownDisplay = document.getElementById('ignition-countdown-display');
                        if (countdownDisplay) {
                            countdownDisplay.style.color = '';
                            countdownDisplay.style.textShadow = '';
                        }
                        
                        // Update main dashboard ignition status
                        updateMainDashboardIgnitionStatus(true);
                        
                        addIgnitionLogEntry("Mission complete. All systems nominal.");
                    }
                    
                    // Clear saved state
                    clearIgnitionState();
                    
                }, 3000);
            });
        }
    }, 1000);
}

// Pause ignition countdown
function pauseIgnitionCountdown() {
    if (!IgnitionState.countdownActive || IgnitionState.countdownPaused) return;
    
    clearInterval(IgnitionState.countdownInterval);
    IgnitionState.countdownPaused = true;
    saveIgnitionState();
}

// Cancel ignition countdown
function cancelIgnitionCountdown() {
    clearInterval(IgnitionState.countdownInterval);
    IgnitionState.countdownActive = false;
    IgnitionState.countdownPaused = false;
    IgnitionState.remainingSeconds = 0;
    
    const countdownDisplay = document.getElementById('ignition-countdown-display');
    if (countdownDisplay) {
        countdownDisplay.textContent = '00:00:00';
        countdownDisplay.style.color = '';
        countdownDisplay.style.textShadow = '';
    }
    
    // Show sequence panel, hide countdown panel
    const sequencePanel = document.getElementById('ignition-sequence-panel');
    const countdownPanel = document.getElementById('ignition-countdown-panel');
    if (sequencePanel) sequencePanel.style.display = 'block';
    if (countdownPanel) countdownPanel.style.display = 'none';
    
    // Clear saved state
    clearIgnitionState();
}

// Update countdown display
function updateIgnitionCountdownDisplay() {
    const hours = Math.floor(IgnitionState.remainingSeconds / 3600);
    const minutes = Math.floor((IgnitionState.remainingSeconds % 3600) / 60);
    const seconds = IgnitionState.remainingSeconds % 60;
    
    const countdownDisplay = document.getElementById('ignition-countdown-display');
    if (countdownDisplay) {
        countdownDisplay.textContent = 
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

// Format time for display
function formatIgnitionTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Reset ignition sequence
function resetIgnitionSequence() {
    const checkboxes = ['ignition-check1', 'ignition-check2', 'ignition-check3'];
    checkboxes.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.classList.remove('checked');
            checkbox.classList.add('disabled');
        }
    });
    
    // Reset state
    IgnitionState.sequenceSteps = {
        preIgnition: false,
        armCommand: false,
        fireEnable: false
    };
    
    // Update buttons
    updateIgnitionFireEnableStatus();
    updateIgnitionInitiateButton();
    
    // Show sequence panel, hide others
    document.getElementById('ignition-sequence-panel').style.display = 'block';
    document.getElementById('ignition-countdown-panel').style.display = 'none';
    document.getElementById('ignition-mission-complete-panel').style.display = 'none';
    
    saveIgnitionState();
}

// Add log entry to ignition system
function addIgnitionLogEntry(message, type = "normal") {
    const log = document.getElementById('ignition-event-log');
    if (!log) return;
    
    const entry = document.createElement('div');
    entry.className = 'ignition-log-entry';
    
    if (type === "warning") {
        entry.classList.add('warning');
    }
    
    const time = new Date();
    const timeString = time.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    entry.innerHTML = `<span class="ignition-log-time">${timeString}</span> <span>${message}</span>`;
    
    // Force white text for log entries
    const logText = entry.querySelector('span:last-child');
    if (logText) {
        logText.style.color = '#ffffff';
    }
    
    log.insertBefore(entry, log.firstChild);
    
    // Keep log to 15 entries max
    if (log.children.length > 15) {
        log.removeChild(log.lastChild);
    }
}

// Trigger Firebase ignition
async function triggerFirebaseIgnition() {
    if (window.firebaseIgnitionDatabase) {
        try {
            // Import Firebase Database functions
            const { set, ref } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
            const ignitionRef = ref(window.firebaseIgnitionDatabase, "ignition");
            
            const ignitionData = {
                status: "FIRE",
                timestamp: Date.now(),
                mission: "Eklavya Rocket Launch",
                user: "2315046"
            };
            
            await set(ignitionRef, ignitionData);
            addIgnitionLogEntry("Fire command sent to Firebase: " + JSON.stringify(ignitionData));
            console.log("Firebase ignition triggered:", ignitionData);
            
            // Log analytics event
            if (window.firebaseIgnitionAnalytics && window.firebaseIgnitionLogEvent) {
                window.firebaseIgnitionLogEvent(window.firebaseIgnitionAnalytics, 'ignition_triggered', {
                    mission_id: 'eklavya_launch',
                    user_id: '2315046',
                    timestamp: Date.now()
                });
            }
            
            return true;
        } catch (error) {
            console.error("Error triggering ignition:", error);
            addIgnitionLogEntry("Error sending fire command to Firebase: " + error.message, "warning");
            return false;
        }
    } else {
        addIgnitionLogEntry("Firebase not initialized. Cannot send fire command.", "warning");
        console.error("Firebase database not initialized");
        return false;
    }
}

// Update main dashboard ignition status
function updateMainDashboardIgnitionStatus(ignited) {
    if (domElements.ignitionStatus) {
        domElements.ignitionStatus.textContent = ignited ? 'IGNITED' : 'NOT IGNITED';
        domElements.ignitionStatus.setAttribute('data-status', ignited ? 'nominal' : 'critical');
        
        if (ignited) {
            AppState.isIgnited = true;
            AppState.ignitionTime = AppState.missionStartTime ? 
                ((Date.now() - AppState.missionStartTime) / 1000) : 0;
            
            const minutes = Math.floor(AppState.ignitionTime / 60);
            const seconds = Math.floor(AppState.ignitionTime % 60);
            if (domElements.ignitionTime) {
                domElements.ignitionTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
        }
    }
}

// Save ignition state to localStorage
function saveIgnitionState() {
    const state = {
        userAuthenticated: IgnitionState.userAuthenticated,
        countdownActive: IgnitionState.countdownActive,
        countdownPaused: IgnitionState.countdownPaused,
        countdownSeconds: IgnitionState.countdownSeconds,
        remainingSeconds: IgnitionState.remainingSeconds,
        sequenceSteps: IgnitionState.sequenceSteps
    };
    
    localStorage.setItem('ignitionState', JSON.stringify(state));
}

// Load ignition state from localStorage
function loadIgnitionState() {
    const savedState = localStorage.getItem('ignitionState');
    if (savedState) {
        try {
            const state = JSON.parse(savedState);
            Object.assign(IgnitionState, state);
            console.log('Loaded ignition state:', state);
        } catch (error) {
            console.error('Error loading ignition state:', error);
        }
    }
}

// Clear ignition state from localStorage
function clearIgnitionState() {
    localStorage.removeItem('ignitionState');
    Object.assign(IgnitionState, {
        isActive: false,
        countdownActive: false,
        countdownPaused: false,
        countdownSeconds: 0,
        remainingSeconds: 0,
        countdownInterval: null,
        userAuthenticated: false,
        sequenceSteps: {
            preIgnition: false,
            armCommand: false,
            fireEnable: false
        }
    });
}

// ===== CHART INITIALIZATION =====
function initializeCharts() {
    // Common chart configuration
    const commonChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 0 },
        plugins: {
            legend: { display: true, position: 'top' }
        },
        scales: {
            x: {
                type: 'linear',
                title: {
                    display: true,
                    text: 'Time (s)',
                    color: '#374151'
                },
                grid: {
                    color: 'rgba(59, 130, 246, 0.1)'
                },
                ticks: {
                    callback: function(value) {
                        return value.toFixed(1);
                    }
                }
            },
            y: {
                title: {
                    display: true,
                    color: '#374151'
                },
                grid: {
                    color: 'rgba(59, 130, 246, 0.1)'
                }
            }
        },
        elements: {
            line: {
                tension: 0.4, // Smooth curves
                borderWidth: 2,
                fill: true
            },
            point: {
                radius: 0, // Hide points for cleaner line
                hoverRadius: 6 // Show on hover
            }
        }
    };

    // Acceleration Chart - Line chart with multiple datasets
    const accelCtx = document.getElementById('accelerationChart').getContext('2d');
    accelerationChart = new Chart(accelCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                { 
                    label: 'Accel X', 
                    data: [], 
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: false,
                    pointRadius: 0
                },
                { 
                    label: 'Accel Y', 
                    data: [], 
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: false,
                    pointRadius: 0
                },
                { 
                    label: 'Accel Z', 
                    data: [], 
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: false,
                    pointRadius: 0
                }
            ]
        },
        options: {
            ...commonChartOptions,
            scales: {
                ...commonChartOptions.scales,
                y: {
                    ...commonChartOptions.scales.y,
                    title: {
                        display: true,
                        text: 'Acceleration (G)'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });

    // Temperature Chart
    const tempCtx = document.getElementById('temperatureChart').getContext('2d');
    temperatureChart = new Chart(tempCtx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Temperature vs Altitude',
                data: [],
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.2)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 6
            }]
        },
        options: {
            ...commonChartOptions,
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Altitude (m)'
                    },
                    grid: {
                        color: 'rgba(59, 130, 246, 0.1)'
                    },
                    ticks: {
                        callback: function(value) {
                            return value.toFixed(0);
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Temperature (°C)'
                    },
                    grid: {
                        color: 'rgba(59, 130, 246, 0.1)'
                    }
                }
            },
            plugins: {
                ...commonChartOptions.plugins,
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Temp: ${context.parsed.y.toFixed(1)}°C at ${context.parsed.x.toFixed(0)}m`;
                        }
                    }
                }
            }
        }
    });

    // Altitude Chart
    const altitudeCtx = document.getElementById('altitudeChart').getContext('2d');
    altitudeChart = new Chart(altitudeCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Altitude',
                data: [],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6
            }]
        },
        options: {
            ...commonChartOptions,
            scales: {
                ...commonChartOptions.scales,
                y: {
                    ...commonChartOptions.scales.y,
                    title: {
                        display: true,
                        text: 'Altitude (m)'
                    }
                }
            }
        }
    });

    // Pressure Chart
    const pressureCtx = document.getElementById('pressureChart').getContext('2d');
    pressureChart = new Chart(pressureCtx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Pressure',
                data: [],
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.2)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6
            }]
        },
        options: {
            ...commonChartOptions,
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Altitude (m)'
                    },
                    grid: {
                        color: 'rgba(59, 130, 246, 0.1)'
                    },
                    ticks: {
                        callback: function(value) {
                            return value.toFixed(0);
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Pressure (hPa)'
                    },
                    grid: {
                        color: 'rgba(59, 130, 246, 0.1)'
                    }
                }
            },
            plugins: {
                ...commonChartOptions.plugins,
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Pressure: ${context.parsed.y.toFixed(1)} hPa at ${context.parsed.x.toFixed(0)}m`;
                        }
                    }
                }
            }
        }
    });

    // Trajectory Chart
    const trajectoryCtx = document.getElementById('trajectoryChart').getContext('2d');
    trajectoryChart = new Chart(trajectoryCtx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Trajectory',
                data: [],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6
            }]
        },
        options: {
            ...commonChartOptions,
            scales: {
                x: { 
                    type: 'linear',
                    title: { 
                        display: true, 
                        text: 'Downrange (km)',
                        color: '#374151',
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        color: 'rgba(59, 130, 246, 0.1)'
                    },
                    ticks: {
                        callback: function(value) {
                            return value.toFixed(1);
                        }
                    }
                },
                y: { 
                    title: { 
                        display: true, 
                        text: 'Altitude (m)',
                        color: '#374151',
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        color: 'rgba(59, 130, 246, 0.1)'
                    }
                }
            },
            plugins: {
                ...commonChartOptions.plugins,
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Altitude: ${context.parsed.y.toFixed(0)}m at ${context.parsed.x.toFixed(1)}km`;
                        }
                    }
                }
            }
        }
    });
}

// ===== SYSTEM CONNECTION FUNCTIONS =====
function connectToSystem() {
    if (AppState.isSystemConnected) {
        addLogEntry('SYSTEM', 'System already connected', 'warning');
        return;
    }
    
    addLogEntry('SYSTEM', 'Attempting to connect to rocket system...');
    
    // Simulate connection attempt
    setTimeout(() => {
        const success = Math.random() > 0.3;
        
        if (success) {
            AppState.isSystemConnected = true;
            addLogEntry('SYSTEM', 'System connection established', 'success');
            
            // Now start sensor initialization
            initializeSensors();
        } else {
            addLogEntry('ERROR', 'Failed to connect to system. Check connections and try again.', 'error');
        }
    }, 2000);
}

function disconnectFromSystem() {
    if (!AppState.isSystemConnected) {
        addLogEntry('SYSTEM', 'System not connected', 'warning');
        return;
    }
    
    // Reset all sensor states
    Object.keys(AppState.sensors).forEach(key => {
        AppState.sensors[key].initialized = false;
    });
    
    AppState.communicationEstablished = false;
    AppState.isSystemConnected = false;
    
    // Stop GPS tracking
    stopGpsTracking();
    
    // Stop Firebase telemetry
    stopFirebaseTelemetry();
    
    // Reset telemetry data
    AppState.telemetryData = [];
    AppState.chartData = {
        altitude: [], pressure: [], temperature: [], time: [],
        accelX: [], accelY: [], accelZ: [], totalAccel: []
    };
    
    // Reset charts
    resetCharts();
    
    // Reset displays
    resetAllDisplays();
    
    // Update comm status display
    if (domElements.commStatus) {
        domElements.commStatus.textContent = 'NO CONNECTION';
        domElements.commStatus.setAttribute('data-status', 'critical');
    }
    
    addLogEntry('SYSTEM', 'System disconnected. All sensors and communication reset.');
}

// ===== SENSOR INITIALIZATION =====
function initializeSensors() {
    if (!AppState.isSystemConnected) {
        addLogEntry('ERROR', 'Cannot initialize sensors: System not connected', 'error');
        return;
    }
    
    console.log('Starting sensor initialization...');
    addLogEntry('SYSTEM', 'Starting sensor initialization sequence...');
    
    // Check each sensor one by one
    const sensorNames = Object.keys(AppState.sensors);
    let initializedCount = 0;
    
    sensorNames.forEach((sensorKey, index) => {
        const sensor = AppState.sensors[sensorKey];
        
        // Simulate sensor initialization with delay
        setTimeout(() => {
            if (!AppState.isSystemConnected) {
                addLogEntry('WARNING', `Sensor initialization interrupted: System disconnected`, 'warning');
                return;
            }
            
            const success = Math.random() > 0.3;
            
            if (success) {
                sensor.initialized = true;
                initializedCount++;
                addLogEntry('SENSOR', `${sensor.name} initialized successfully`, 'success');
                
                // Update specific status based on sensor
                if (sensorKey === 'mpu6050') {
                    updateDisplayStatus('MPU6050 IMU ready');
                } else if (sensorKey === 'bmp280') {
                    updateDisplayStatus('BMP280 Barometer/Thermometer ready');
                } else if (sensorKey === 'gpsNeo6M') {
                    updateDisplayStatus('GPS NEO-6M receiver ready');
                } else if (sensorKey === 'loraSX1262') {
                    updateDisplayStatus('LoRa SX1262 transceiver ready');
                }
            } else {
                addLogEntry('WARNING', `${sensor.name} initialization failed`, 'warning');
            }
            
            // Check if all sensors are initialized
            if (index === sensorNames.length - 1) {
                checkAllSensorsInitialized();
            }
        }, index * 1500);
    });
}

function checkAllSensorsInitialized() {
    const allInitialized = Object.values(AppState.sensors).every(sensor => sensor.initialized);
    
    if (allInitialized) {
        addLogEntry('SYSTEM', 'All sensors initialized successfully', 'success');
        
        // Now establish communication
        setTimeout(() => {
            establishCommunication();
        }, 1000);
    } else {
        addLogEntry('WARNING', 'Some sensors failed to initialize. Check hardware connections.', 'warning');
        
        // Ask user if they want to retry
        if (confirm('Some sensors failed to initialize. Would you like to retry?')) {
            setTimeout(() => {
                initializeSensors();
            }, 2000);
        }
    }
}

function establishCommunication() {
    if (!AppState.isSystemConnected) {
        addLogEntry('ERROR', 'Cannot establish communication: System not connected', 'error');
        return;
    }
    
    addLogEntry('SYSTEM', 'Establishing communication with rocket...');
    
    // Simulate communication establishment
    setTimeout(() => {
        const success = Math.random() > 0.2;
        
        if (success) {
            AppState.communicationEstablished = true;
            addLogEntry('SYSTEM', 'Communication established with rocket', 'success');
            
            // Update comm status display
            if (domElements.commStatus) {
                domElements.commStatus.textContent = 'COMM ESTABLISHED';
                domElements.commStatus.setAttribute('data-status', 'nominal');
            }
            
            // Start GPS tracking
            startGpsTracking();
            
            // Start Firebase telemetry
            initializeFirebaseTelemetry();
            
            // Ready to receive telemetry
            addLogEntry('SYSTEM', 'All systems ready. Waiting for telemetry data...');
            
            // Enable telemetry input
            enableTelemetryReception();
        } else {
            addLogEntry('ERROR', 'Failed to establish communication. Retrying...', 'error');
            
            // Retry after 3 seconds
            setTimeout(establishCommunication, 3000);
        }
    }, 2000);
}

function updateDisplayStatus(message) {
    console.log('Status:', message);
}

function enableTelemetryReception() {
    addLogEntry('SYSTEM', 'Telemetry reception enabled', 'success');
}

// ===== 3D ROCKET VISUALIZATION =====
function initialize3DRocket() {
    if (!document.getElementById('rocket3d')) return;
    
    try {
        // Clean up existing renderer
        if (AppState.renderer && AppState.renderer.domElement.parentNode) {
            AppState.renderer.domElement.parentNode.removeChild(AppState.renderer.domElement);
        }
        
        // Scene setup
        AppState.scene = new THREE.Scene();
        AppState.scene.background = new THREE.Color(0x0a1128);
        
        // Camera setup
        const container = document.getElementById('rocket3d');
        AppState.camera = new THREE.PerspectiveCamera(
            60,
            container.clientWidth / container.clientHeight,
            0.1,
            10000
        );
        AppState.camera.position.set(0, 10, 25);
        AppState.camera.lookAt(0, 0, 0);
        
        // Renderer setup
        AppState.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true,
            powerPreference: "high-performance"
        });
        AppState.renderer.setSize(container.clientWidth, container.clientHeight);
        AppState.renderer.shadowMap.enabled = true;
        container.appendChild(AppState.renderer.domElement);
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        AppState.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 15);
        AppState.scene.add(directionalLight);
        
        // Create rocket
        createProfessionalRocket();
        
        // Create environment
        createEnvironment();
        
        // Start animation
        animate3DRocket();
        
        // Handle window resize
        window.addEventListener('resize', () => {
            if (AppState.camera && AppState.renderer && container) {
                AppState.camera.aspect = container.clientWidth / container.clientHeight;
                AppState.camera.updateProjectionMatrix();
                AppState.renderer.setSize(container.clientWidth, container.clientHeight);
            }
        });
        
        console.log('3D Rocket Visualization initialized');
        addLogEntry('SYSTEM', '3D Rocket visualization initialized');
    } catch (error) {
        console.error('Error initializing 3D rocket:', error);
        addLogEntry('ERROR', `3D Rocket initialization failed: ${error.message}`, 'error');
    }
}

function createProfessionalRocket() {
    const rocketGroup = new THREE.Group();
    
    // Main body
    const bodyGeometry = new THREE.CylinderGeometry(0.8, 1.0, 15, 32);
    const bodyMaterial = new THREE.MeshPhongMaterial({
        color: 0x1e3a8a,
        shininess: 100
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    rocketGroup.add(body);
    
    // Nose cone
    const noseGeometry = new THREE.ConeGeometry(1.0, 4, 32);
    const noseMaterial = new THREE.MeshPhongMaterial({
        color: 0xdc2626,
        shininess: 100
    });
    const nose = new THREE.Mesh(noseGeometry, noseMaterial);
    nose.position.y = 9.5;
    rocketGroup.add(nose);
    
    // Fins
    const finGeometry = new THREE.BoxGeometry(3, 0.2, 1.5);
    const finMaterial = new THREE.MeshPhongMaterial({
        color: 0x475569
    });
    
    for (let i = 0; i < 4; i++) {
        const fin = new THREE.Mesh(finGeometry, finMaterial);
        const angle = (i * Math.PI) / 2;
        fin.position.x = Math.cos(angle) * 1.2;
        fin.position.z = Math.sin(angle) * 1.2;
        fin.position.y = -5;
        fin.rotation.y = angle;
        rocketGroup.add(fin);
    }
    
    AppState.rocket = rocketGroup;
    AppState.scene.add(rocketGroup);
    
    return rocketGroup;
}

function createEnvironment() {
    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshPhongMaterial({
        color: 0x1e293b
    });
    AppState.terrain = new THREE.Mesh(groundGeometry, groundMaterial);
    AppState.terrain.rotation.x = -Math.PI / 2;
    AppState.scene.add(AppState.terrain);
}

function animate3DRocket() {
    if (!AppState.scene || !AppState.camera || !AppState.renderer) return;
    
    requestAnimationFrame(animate3DRocket);
    
    // Update rocket stats
    if (AppState.rocket && domElements.rocketOrientation) {
        // Calculate Euler angles from quaternion
        const euler = new THREE.Euler();
        euler.setFromQuaternion(AppState.rocket.quaternion);
        
        // Convert to degrees
        const rotationX = THREE.MathUtils.radToDeg(euler.x).toFixed(1);
        const rotationY = THREE.MathUtils.radToDeg(euler.y).toFixed(1);
        const rotationZ = THREE.MathUtils.radToDeg(euler.z).toFixed(1);
        
        domElements.rocketOrientation.textContent = 'Stable';
        if (domElements.rocketRotationX) domElements.rocketRotationX.textContent = `${rotationX}°`;
        if (domElements.rocketRotationY) domElements.rocketRotationY.textContent = `${rotationY}°`;
        if (domElements.rocketRotationZ) domElements.rocketRotationZ.textContent = `${rotationZ}°`;
    }
    
    AppState.renderer.render(AppState.scene, AppState.camera);
}

function update3DRocketFromTelemetry(data) {
    if (!AppState.rocket) return;
    
    // Update rocket orientation based on telemetry
    if (data.roll !== undefined) {
        AppState.rocket.rotation.z = data.roll * Math.PI / 180;
    }
    
    if (data.pitch !== undefined) {
        AppState.rocket.rotation.x = (data.pitch - 90) * Math.PI / 180;
    }
    
    if (data.yaw !== undefined) {
        AppState.rocket.rotation.y = data.yaw * Math.PI / 180;
    }
}

// ===== MENU NAVIGATION SYSTEM =====
function initializeMenuNavigation() {
    console.log('Initializing menu navigation...');
    
    // Toggle menu overlay
    if (domElements.menuToggle) {
        domElements.menuToggle.addEventListener('click', () => {
            console.log('Opening menu...');
            domElements.menuOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }
    
    if (domElements.menuClose) {
        domElements.menuClose.addEventListener('click', closeMenu);
    }
    
    // Menu card click handlers
    if (domElements.menuCards) {
        domElements.menuCards.forEach(card => {
            card.addEventListener('click', (e) => {
                console.log('Menu card clicked');
                e.stopPropagation();
                const panel = card.getAttribute('data-panel');
                console.log('Opening panel:', panel);
                openPanel(panel);
            });
        });
    }
    
    // Panel back button handlers
    if (domElements.panelBackBtns) {
        domElements.panelBackBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const panel = btn.getAttribute('data-panel');
                console.log('Closing panel:', panel);
                closePanel(panel);
                openMenu();
            });
        });
    }
    
    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (domElements.menuOverlay.classList.contains('active')) {
                closeMenu();
            } else if (AppState.activePanel) {
                closePanel(AppState.activePanel);
                openMenu();
            }
        }
    });
    
    // Close menu when clicking outside content
    domElements.menuOverlay.addEventListener('click', (e) => {
        if (e.target === domElements.menuOverlay) {
            closeMenu();
        }
    });
}

function openMenu() {
    console.log('Opening menu...');
    domElements.menuOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function openPanel(panelId) {
    console.log('Opening panel:', panelId);
    
    // Close menu first
    closeMenu();
    
    // Close any open panel
    if (AppState.activePanel) {
        closePanel(AppState.activePanel);
    }
    
    // Hide main dashboard
    const mainDashboard = document.querySelector('.main-dashboard');
    if (mainDashboard) {
        mainDashboard.style.display = 'none';
    }
    
    // Show selected panel
    const panel = document.getElementById(`${panelId}-panel`);
    if (panel) {
        panel.classList.add('active');
        panel.style.display = 'block';
        AppState.activePanel = panelId;
        
        addLogEntry('SYSTEM', `Opened ${panelId.replace('-', ' ').toUpperCase()} panel`);
    } else {
        console.error('Panel not found:', `${panelId}-panel`);
    }
}

function closePanel(panelId) {
    console.log('Closing panel:', panelId);
    const panel = document.getElementById(`${panelId}-panel`);
    if (panel) {
        panel.classList.remove('active');
        panel.style.display = 'none';
        AppState.activePanel = null;
    }
    
    // Show main dashboard
    const mainDashboard = document.querySelector('.main-dashboard');
    if (mainDashboard) {
        mainDashboard.style.display = 'grid';
    }
}

function closeMenu() {
    console.log('Closing menu...');
    domElements.menuOverlay.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// ===== EVENT LISTENERS =====
function initializeEventListeners() {
    console.log('Initializing event listeners...');
    
    // Menu navigation
    initializeMenuNavigation();
    
    // Ignition system
    if (domElements.ignitionControlBtn) {
        domElements.ignitionControlBtn.addEventListener('click', openIgnitionSystem);
    }
    
    if (domElements.closeIgnitionBtn) {
        domElements.closeIgnitionBtn.addEventListener('click', closeIgnitionSystem);
    }
    
    // Primary telemetry download button
    if (domElements.downloadTelemetryBtn) {
        domElements.downloadTelemetryBtn.addEventListener('click', downloadPrimaryTelemetry);
    }
    
    // Control buttons
    if (domElements.resetButton) {
        domElements.resetButton.addEventListener('click', resetMission);
    }
    
    if (domElements.downloadDataCSV) {
        domElements.downloadDataCSV.addEventListener('click', exportDataCSV);
    }
    
    if (domElements.downloadGraphsCSV) {
        domElements.downloadGraphsCSV.addEventListener('click', exportGraphsCSV);
    }
    
    if (domElements.downloadTrajectoryCSV) {
        domElements.downloadTrajectoryCSV.addEventListener('click', downloadTrajectoryCSV);
    }
    
    // Map controls
    if (domElements.toggleSatellite) {
        domElements.toggleSatellite.addEventListener('click', () => toggleMapType('satellite'));
    }
    
    // Chart CSV download buttons
    document.querySelectorAll('.download-csv-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const chartType = this.getAttribute('data-chart');
            downloadChartCSV(chartType);
        });
    });
    
    // Refresh warning continue button
    if (domElements.continueBtn) {
        domElements.continueBtn.addEventListener('click', hideRefreshWarning);
    }
    
    // Prevent page refresh during countdown
    window.addEventListener('beforeunload', function(e) {
        if (IgnitionState.countdownActive && !IgnitionState.countdownPaused) {
            e.preventDefault();
            e.returnValue = '';
            showRefreshWarning();
            return '';
        }
    });
    
    // Add Connect/Disconnect buttons to menu
    addConnectionControls();
}

function addConnectionControls() {
    // Add connection controls to the menu
    const menuFooter = document.querySelector('.menu-footer');
    if (menuFooter) {
        const connectBtn = document.createElement('button');
        connectBtn.id = 'connect-system-btn';
        connectBtn.className = 'control-btn connect-btn';
        connectBtn.innerHTML = '<i class="fas fa-plug"></i><span>Connect System</span>';
        
        const disconnectBtn = document.createElement('button');
        disconnectBtn.id = 'disconnect-system-btn';
        disconnectBtn.className = 'control-btn disconnect-btn';
        disconnectBtn.innerHTML = '<i class="fas fa-plug"></i><span>Disconnect System</span>';
        disconnectBtn.style.display = 'none';
        
        menuFooter.insertBefore(connectBtn, menuFooter.firstChild);
        menuFooter.insertBefore(disconnectBtn, menuFooter.firstChild.nextSibling);
        
        // Add event listeners
        connectBtn.addEventListener('click', () => {
            connectToSystem();
            connectBtn.style.display = 'none';
            disconnectBtn.style.display = 'flex';
        });
        
        disconnectBtn.addEventListener('click', () => {
            disconnectFromSystem();
            disconnectBtn.style.display = 'none';
            connectBtn.style.display = 'flex';
        });
    }
}

// ===== TELEMETRY PROCESSING =====
function processTelemetryData(data) {
    try {
        const telemetry = typeof data === 'string' ? JSON.parse(data) : data;
        
        // Check if communication is established
        if (!AppState.communicationEstablished) {
            addLogEntry('ERROR', 'Cannot process telemetry: Communication not established', 'error');
            return;
        }
        
        // Check if system is connected
        if (!AppState.isSystemConnected) {
            addLogEntry('ERROR', 'Cannot process telemetry: System not connected', 'error');
            return;
        }
        
        // Check if sensors are ready
        if (!areSensorsReadyForTelemetry()) {
            addLogEntry('WARNING', 'Cannot process telemetry: Sensors not fully initialized', 'warning');
            return;
        }
        
        // Start mission on first valid data
        if (!AppState.missionActive && isValidTelemetry(telemetry)) {
            startMission();
        }
        
        // Update packet count
        AppState.packetCount++;
        
        // Add timestamp and mission time
        telemetry.timestamp = Date.now();
        telemetry.missionTime = AppState.missionStartTime ? 
            (Date.now() - AppState.missionStartTime) / 1000 : 0;
        
        // Store in history
        AppState.telemetryData.push(telemetry);
        
        // Update all displays
        updateTelemetryDisplay(telemetry);
        updateCharts(telemetry);
        update3DRocketFromTelemetry(telemetry);
        addTelemetryLogEntry(telemetry);
        
        // Update data buffer count
        if (domElements.dataBuffer) {
            domElements.dataBuffer.textContent = AppState.telemetryData.length;
        }
        
    } catch (error) {
        console.error('Error processing telemetry:', error);
        addLogEntry('ERROR', `Telemetry processing error: ${error.message}`, 'error');
    }
}

function areSensorsReadyForTelemetry() {
    // Check if all required sensors are initialized
    return AppState.sensors.mpu6050.initialized && 
           AppState.sensors.bmp280.initialized && 
           AppState.sensors.gpsNeo6M.initialized &&
           AppState.sensors.loraSX1262.initialized;
}

function isValidTelemetry(data) {
    return data && (
        data.altitude !== undefined ||
        data.velocity !== undefined ||
        data.latitude !== undefined ||
        data.longitude !== undefined
    );
}

function updateTelemetryDisplay(data) {
    // Update Flight Data (GPS Altitude and Downrange)
    updateElement(data.altitude, domElements.altitude, `${data.altitude?.toFixed(0) || '--'} m`);
    updateElement(data.downrange, domElements.downrange, `${((data.downrange || 0) / 1000).toFixed(1) || '--'} km`);
    
    // Update speed displays
    updateElement(data.verticalSpeed, domElements.verticalSpeed, `${data.verticalSpeed?.toFixed(1) || '--'} m/s`);
    updateElement(data.horizontalSpeed, domElements.horizontalSpeed, `${data.horizontalSpeed?.toFixed(1) || '--'} m/s`);
    
    // Update Acceleration
    updateElement(data.accelX, domElements.accelX, `${data.accelX?.toFixed(2) || '--'} G`);
    updateElement(data.accelY, domElements.accelY, `${data.accelY?.toFixed(2) || '--'} G`);
    updateElement(data.accelZ, domElements.accelZ, `${data.accelZ?.toFixed(2) || '--'} G`);
    
    // REMOVED: Total acceleration calculation
    if (domElements.totalAccel) domElements.totalAccel.textContent = '-- G';
    
    // Update Orientation
    updateElement(data.roll, domElements.roll, `${data.roll?.toFixed(1) || '--'}°`);
    updateElement(data.pitch, domElements.pitch, `${data.pitch?.toFixed(1) || '--'}°`);
    updateElement(data.yaw, domElements.yaw, `${data.yaw?.toFixed(1) || '--'}°`);
    updateElement(data.angularRate, domElements.angularRate, `${data.angularRate?.toFixed(1) || '--'}°/s`);
    
    // Update System Status
    if (data.ignition !== undefined && domElements.ignitionStatus) {
        const isIgnited = data.ignition === true || data.ignition === 1;
        AppState.isIgnited = isIgnited;
        domElements.ignitionStatus.textContent = isIgnited ? 'IGNITED' : 'NOT IGNITED';
        domElements.ignitionStatus.setAttribute('data-status', isIgnited ? 'nominal' : 'critical');
        
        if (isIgnited && !AppState.ignitionTime) {
            AppState.ignitionTime = data.missionTime || 0;
            const minutes = Math.floor(AppState.ignitionTime / 60);
            const seconds = Math.floor(AppState.ignitionTime % 60);
            if (domElements.ignitionTime) {
                domElements.ignitionTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
        }
    }
    
    // Update GPS and Temperature
    updateElement(data.gpsSats, domElements.gpsSats, data.gpsSats || '--');
    updateElement(data.temperature, domElements.temperature, `${data.temperature?.toFixed(1) || '--'} °C`);
    
    // Update Thermocouple and Strain Gauge
    updateElement(data.thermocouple1, domElements.thermocouple1, `${data.thermocouple1?.toFixed(1) || '--'} °C`);
    updateElement(data.strainGauge1, domElements.strainGauge1, `${data.strainGauge1?.toFixed(0) || '--'} µε`);
    
    // Update additional displays for active panels
    if (AppState.activePanel === 'trajectory') {
        updatePanelSpecificData(data);
    }
}

function updatePanelSpecificData(data) {
    // Update trajectory panel
    if (AppState.activePanel === 'trajectory') {
        updateElement(data.altitude, domElements.currentAltitude, `${data.altitude?.toFixed(0) || '--'} m`);
        updateElement(data.altitude, domElements.trajCurrentAltitude, `${data.altitude?.toFixed(0) || '--'} m`);
        updateElement(data.downrange, domElements.downrangeDistance, `${((data.downrange || 0) / 1000).toFixed(1) || '--'} km`);
        
        if (data.altitude !== undefined) {
            if (data.altitude > parseFloat(domElements.maxAltitude?.textContent || 0) || 
                (domElements.maxAltitude && domElements.maxAltitude.textContent === '-- m')) {
                if (domElements.maxAltitude) {
                    domElements.maxAltitude.textContent = `${data.altitude.toFixed(0)} m`;
                }
            }
        }
        
        if (data.verticalVelocity < 0 && domElements.descentAltitude) {
            domElements.descentAltitude.textContent = `${data.altitude?.toFixed(0) || '--'} m`;
        }
    }
}

function updateElement(value, element, formattedValue) {
    if (element && value !== undefined) {
        element.textContent = formattedValue;
    } else if (element && value === undefined && formattedValue.includes('--')) {
        element.textContent = formattedValue;
    }
}

// ===== GOOGLE MAPS =====
function initMap() {
    const mapElement = document.getElementById('google-map');
    if (!mapElement) return;
    
    try {
        AppState.googleMap = new google.maps.Map(mapElement, {
            center: AppState.launchSitePosition,
            zoom: 15,
            mapTypeId: 'satellite',
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            zoomControl: true
        });
        
        // Create launch site marker
        AppState.launchSiteMarker = new google.maps.Marker({
            position: AppState.launchSitePosition,
            map: AppState.googleMap,
            icon: {
                url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
            },
            title: 'Launch Site'
        });
        
        console.log('Google Maps initialized');
        addLogEntry('SYSTEM', 'Google Maps tracking initialized', 'success');
    } catch (error) {
        console.error('Google Maps initialization error:', error);
        addLogEntry('ERROR', 'Google Maps failed to load', 'error');
    }
}

function toggleMapType(type) {
    if (AppState.googleMap) {
        AppState.googleMap.setMapTypeId(type);
        addLogEntry('SYSTEM', `Map type changed to ${type}`);
    }
}

// ===== CHART UPDATES =====
function updateCharts(data) {
    const missionTime = data.missionTime || 0;
    
    if (data.altitude !== undefined) {
        AppState.chartData.time.push(missionTime);
        AppState.chartData.altitude.push(data.altitude);
        
        if (data.accelX !== undefined) {
            AppState.chartData.accelX.push(data.accelX);
        }
        
        if (data.accelY !== undefined) {
            AppState.chartData.accelY.push(data.accelY);
        }
        
        if (data.accelZ !== undefined) {
            AppState.chartData.accelZ.push(data.accelZ);
        }
        
        if (data.pressure !== undefined) {
            AppState.chartData.pressure.push({
                x: data.altitude,
                y: data.pressure
            });
        }
        
        // Add temperature data point
        if (data.temperature !== undefined) {
            AppState.chartData.temperature.push({
                x: data.altitude,
                y: data.temperature
            });
        }
        
        // Keep last 500 points
        const maxPoints = 500;
        if (AppState.chartData.time.length > maxPoints) {
            AppState.chartData.time.shift();
            AppState.chartData.altitude.shift();
            AppState.chartData.accelX.shift();
            AppState.chartData.accelY.shift();
            AppState.chartData.accelZ.shift();
            AppState.chartData.totalAccel.shift();
        }
        
        // Keep last 300 temperature and pressure points
        if (AppState.chartData.temperature.length > 300) {
            AppState.chartData.temperature.shift();
        }
        if (AppState.chartData.pressure.length > 300) {
            AppState.chartData.pressure.shift();
        }
        
        // Update charts
        updateChartData();
    }
}

function updateChartData() {
    // Update altitude chart
    if (altitudeChart) {
        altitudeChart.data.labels = AppState.chartData.time.slice(-100);
        altitudeChart.data.datasets[0].data = AppState.chartData.altitude.slice(-100);
        altitudeChart.update('none');
    }
    
    // Update pressure chart
    if (pressureChart && AppState.chartData.pressure.length > 0) {
        pressureChart.data.datasets[0].data = AppState.chartData.pressure.slice(-100);
        pressureChart.update('none');
    }
    
    // Update acceleration chart
    if (accelerationChart) {
        accelerationChart.data.labels = AppState.chartData.time.slice(-100);
        accelerationChart.data.datasets[0].data = AppState.chartData.accelX.slice(-100);
        accelerationChart.data.datasets[1].data = AppState.chartData.accelY.slice(-100);
        accelerationChart.data.datasets[2].data = AppState.chartData.accelZ.slice(-100);
        accelerationChart.update('none');
    }
    
    // Update temperature chart
    if (temperatureChart && AppState.chartData.temperature.length > 0) {
        temperatureChart.data.datasets[0].data = AppState.chartData.temperature.slice(-100);
        temperatureChart.update('none');
    }
    
    // Update trajectory chart
    if (trajectoryChart) {
        const currentData = AppState.telemetryData[AppState.telemetryData.length - 1];
        if (currentData && currentData.downrange !== undefined && currentData.altitude !== undefined) {
            trajectoryChart.data.datasets[0].data.push({
                x: currentData.downrange / 1000,
                y: currentData.altitude
            });
            
            if (trajectoryChart.data.datasets[0].data.length > 200) {
                trajectoryChart.data.datasets[0].data.shift();
            }
            
            trajectoryChart.update('none');
        }
    }
}

function resetCharts() {
    if (altitudeChart) {
        altitudeChart.data.labels = [];
        altitudeChart.data.datasets[0].data = [];
        altitudeChart.update();
    }
    if (accelerationChart) {
        accelerationChart.data.labels = [];
        accelerationChart.data.datasets.forEach(dataset => dataset.data = []);
        accelerationChart.update();
    }
    if (temperatureChart) {
        temperatureChart.data.datasets[0].data = [];
        temperatureChart.update();
    }
    if (pressureChart) {
        pressureChart.data.labels = [];
        pressureChart.data.datasets[0].data = [];
        pressureChart.update();
    }
    if (trajectoryChart) {
        trajectoryChart.data.datasets[0].data = [];
        trajectoryChart.update();
    }
}

// ===== CSV DOWNLOAD FUNCTIONS =====
function downloadPrimaryTelemetry() {
    try {
        // Get current telemetry values
        const telemetryData = getCurrentTelemetryData();
        
        // Create CSV content
        let csvContent = "PRIMARY TELEMETRY DATA - SPACE CLUB RIT\n";
        csvContent += "Generated: " + telemetryData.displayTime + "\n\n";
        
        csvContent += "CATEGORY,PARAMETER,VALUE\n";
        
        // Flight Data (GPS Altitude and Downrange only)
        csvContent += "Flight Data,GPS Altitude," + telemetryData.flightData.gpsAltitude + "\n";
        csvContent += "Flight Data,Downrange," + telemetryData.flightData.downrange + "\n";
        csvContent += "Flight Data,Vertical Speed," + telemetryData.flightData.verticalSpeed + "\n";
        csvContent += "Flight Data,Horizontal Speed," + telemetryData.flightData.horizontalSpeed + "\n";
        
        // Acceleration 
        csvContent += "Acceleration,Accel X," + telemetryData.accelerationVectors.accelX + "\n";
        csvContent += "Acceleration,Accel Y," + telemetryData.accelerationVectors.accelY + "\n";
        csvContent += "Acceleration,Accel Z," + telemetryData.accelerationVectors.accelZ + "\n";
        csvContent += "Acceleration,Total Accel," + telemetryData.accelerationVectors.totalAccel + "\n";
        
        // Orientation
        csvContent += "Attitude,Roll," + telemetryData.attitudeOrientation.roll + "\n";
        csvContent += "Attitude,Pitch," + telemetryData.attitudeOrientation.pitch + "\n";
        csvContent += "Attitude,Yaw," + telemetryData.attitudeOrientation.yaw + "\n";
        csvContent += "Attitude,Angular Rate," + telemetryData.attitudeOrientation.angularRate + "\n";
        
        // System Status
        csvContent += "System,Ignition Status," + telemetryData.systemStatus.ignition + "\n";
        csvContent += "System,Comm Status," + telemetryData.systemStatus.commStatus + "\n";
        csvContent += "System,GPS Satellites," + telemetryData.systemStatus.gpsSats + "\n";
        csvContent += "System,Temperature," + telemetryData.systemStatus.temperature + "\n";
        
        // Mission Info
        csvContent += "\nMISSION INFORMATION\n";
        csvContent += "Parameter,Value\n";
        csvContent += "Mission Status," + telemetryData.missionInfo.status + "\n";
        csvContent += "Packet Count," + telemetryData.missionInfo.packetCount + "\n";
        csvContent += "Data Points," + telemetryData.missionInfo.dataPoints + "\n";
        csvContent += "Mission Time," + telemetryData.missionInfo.missionTime + "\n";
        
        // Check if there's any real data
        const hasRealData = AppState.telemetryData.length > 0;
        
        if (hasRealData) {
            // Add latest telemetry data points
            csvContent += "\n=== LATEST TELEMETRY DATA POINTS ===\n";
            csvContent += "Timestamp,GPS Altitude(m),Downrange(km),AccelX(G),AccelY(G),AccelZ(G),Temperature(°C)\n";
            
            // Get last 10 data points or all if less than 10
            const dataPoints = AppState.telemetryData.slice(-10);
            
            dataPoints.forEach((data, index) => {
                const timestamp = new Date(data.timestamp).toLocaleTimeString();
                csvContent += `${timestamp},`;
                csvContent += `${data.altitude?.toFixed(2) || '--'},`;
                csvContent += `${((data.downrange || 0) / 1000).toFixed(3) || '--'},`;
                csvContent += `${data.accelX?.toFixed(3) || '--'},`;
                csvContent += `${data.accelY?.toFixed(3) || '--'},`;
                csvContent += `${data.accelZ?.toFixed(3) || '--'},`;
                csvContent += `${data.temperature?.toFixed(1) || '--'}\n`;
            });
        }
        
        // Create and download the CSV file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `primary_telemetry_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        // Show success message
        showDownloadSuccess(domElements.downloadTelemetryBtn);
        
        // Log the download
        addLogEntry('SYSTEM', 'Primary telemetry data downloaded as CSV');
        
    } catch (error) {
        console.error('Error downloading telemetry:', error);
        addLogEntry('ERROR', `Failed to download telemetry: ${error.message}`, 'error');
    }
}

function getCurrentTelemetryData() {
    // Get current values from display
    const data = {
        timestamp: new Date().toISOString(),
        displayTime: new Date().toLocaleString(),
        flightData: {
            gpsAltitude: domElements.altitude ? domElements.altitude.textContent : '-- m',
            downrange: domElements.downrange ? domElements.downrange.textContent : '-- km',
            verticalSpeed: domElements.verticalSpeed ? domElements.verticalSpeed.textContent : '-- m/s',
            horizontalSpeed: domElements.horizontalSpeed ? domElements.horizontalSpeed.textContent : '-- m/s'
        },
        accelerationVectors: {
            accelX: domElements.accelX ? domElements.accelX.textContent : '-- G',
            accelY: domElements.accelY ? domElements.accelY.textContent : '-- G',
            accelZ: domElements.accelZ ? domElements.accelZ.textContent : '-- G',
            totalAccel: domElements.totalAccel ? domElements.totalAccel.textContent : '-- G'
        },
        attitudeOrientation: {
            roll: domElements.roll ? domElements.roll.textContent : '--°',
            pitch: domElements.pitch ? domElements.pitch.textContent : '--°',
            yaw: domElements.yaw ? domElements.yaw.textContent : '--°',
            angularRate: domElements.angularRate ? domElements.angularRate.textContent : '--°/s'
        },
        systemStatus: {
            ignition: domElements.ignitionStatus ? domElements.ignitionStatus.textContent : 'NOT IGNITED',
            commStatus: domElements.commStatus ? domElements.commStatus.textContent : 'NO CONNECTION',
            gpsSats: domElements.gpsSats ? domElements.gpsSats.textContent : '--',
            temperature: domElements.temperature ? domElements.temperature.textContent : '-- °C'
        },
        missionInfo: {
            status: AppState.missionActive ? 'ACTIVE' : 'STANDBY',
            packetCount: AppState.packetCount,
            dataPoints: AppState.telemetryData.length,
            missionTime: AppState.missionStartTime ? 
                ((Date.now() - AppState.missionStartTime) / 1000).toFixed(1) + 's' : '0s'
        },
        rawDataPoints: AppState.telemetryData.slice(-10)
    };
    
    return data;
}

function downloadChartCSV(chartType) {
    if (AppState.chartData.time.length === 0) {
        alert('No chart data to export!');
        return;
    }
    
    try {
        let headers = '';
        let csvRows = [];
        
        switch(chartType) {
            case 'acceleration':
                headers = 'Time (s),Accel X (G),Accel Y (G),Accel Z (G)\n';
                for (let i = 0; i < AppState.chartData.time.length; i++) {
                    csvRows.push([
                        AppState.chartData.time[i].toFixed(2),
                        (AppState.chartData.accelX[i] || 0).toFixed(3),
                        (AppState.chartData.accelY[i] || 0).toFixed(3),
                        (AppState.chartData.accelZ[i] || 0).toFixed(3)
                    ].join(','));
                }
                break;
                
            case 'temperature':
                headers = 'Altitude (m),Temperature (°C)\n';
                AppState.chartData.temperature.forEach(point => {
                    if (point && point.x && point.y) {
                        csvRows.push([
                            point.x.toFixed(2),
                            point.y.toFixed(2)
                        ].join(','));
                    }
                });
                break;
                
            case 'altitude':
                headers = 'Time (s),Altitude (m)\n';
                for (let i = 0; i < AppState.chartData.time.length; i++) {
                    csvRows.push([
                        AppState.chartData.time[i].toFixed(2),
                        (AppState.chartData.altitude[i] || 0).toFixed(2)
                    ].join(','));
                }
                break;
                
            case 'pressure':
                headers = 'Altitude (m),Pressure (hPa)\n';
                for (let i = 0; i < AppState.chartData.altitude.length; i++) {
                    if (AppState.chartData.altitude[i] && AppState.chartData.pressure[i]) {
                        csvRows.push([
                            AppState.chartData.altitude[i].toFixed(2),
                            AppState.chartData.pressure[i].toFixed(2)
                        ].join(','));
                    }
                }
                break;
        }
        
        if (csvRows.length === 0) {
            alert('No data available for this chart');
            return;
        }
        
        const csvString = headers + csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${chartType}_chart_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        addLogEntry('SYSTEM', `${chartType} chart data exported to CSV`);
    } catch (error) {
        console.error('Error exporting chart CSV:', error);
        addLogEntry('ERROR', `Failed to export ${chartType} chart CSV: ${error.message}`, 'error');
    }
}

function downloadTrajectoryCSV() {
    if (trajectoryChart.data.datasets[0].data.length === 0) {
        alert('No trajectory data to export!');
        return;
    }
    
    try {
        const headers = 'Downrange (km),Altitude (m)\n';
        const csvRows = trajectoryChart.data.datasets[0].data.map(point => 
            `${point.x.toFixed(2)},${point.y.toFixed(2)}`
        );
        
        const csvString = headers + csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trajectory_chart_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        addLogEntry('SYSTEM', 'Trajectory chart data exported to CSV');
    } catch (error) {
        console.error('Error exporting trajectory CSV:', error);
        addLogEntry('ERROR', `Failed to export trajectory CSV: ${error.message}`, 'error');
    }
}

function exportDataCSV() {
    if (AppState.telemetryData.length === 0) {
        alert('No telemetry data to export!');
        return;
    }
    
    try {
        const headers = [
            'Timestamp', 'Mission Time (s)', 'GPS Altitude (m)', 'Downrange (km)',
            'Accel X (G)', 'Accel Y (G)', 'Accel Z (G)', 'Roll (°)', 'Pitch (°)', 'Yaw (°)',
            'Angular Rate (°/s)', 'Temperature (°C)', 'GPS Satellites', 'Ignition',
            'Communication Status', 'Vertical Speed (m/s)', 'Horizontal Speed (m/s)', 'Pressure (hPa)'
        ].join(',');
        
        const csvRows = [headers];
        
        AppState.telemetryData.forEach(data => {
            const row = [
                new Date(data.timestamp).toISOString(),
                (data.missionTime || 0).toFixed(2),
                (data.altitude || 0).toFixed(2),
                ((data.downrange || 0) / 1000).toFixed(3),
                (data.accelX || 0).toFixed(3),
                (data.accelY || 0).toFixed(3),
                (data.accelZ || 0).toFixed(3),
                (data.roll || 0).toFixed(2),
                (data.pitch || 0).toFixed(2),
                (data.yaw || 0).toFixed(2),
                (data.angularRate || 0).toFixed(2),
                (data.temperature || 0).toFixed(2),
                data.gpsSats || 0,
                data.ignition ? 'YES' : 'NO',
                data.commStatus ? 'OK' : 'FAIL',
                (data.verticalSpeed || 0).toFixed(2),
                (data.horizontalSpeed || 0).toFixed(2),
                (data.pressure || 1013).toFixed(2)
            ];
            csvRows.push(row.join(','));
        });
        
        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mission_telemetry_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        addLogEntry('SYSTEM', 'Telemetry data exported to CSV');
    } catch (error) {
        console.error('Error exporting data CSV:', error);
        addLogEntry('ERROR', `Failed to export data CSV: ${error.message}`, 'error');
    }
}

function exportGraphsCSV() {
    if (AppState.chartData.time.length === 0) {
        alert('No chart data to export!');
        return;
    }
    
    try {
        const headers = [
            'Time (s)', 'Altitude (m)', 'Pressure (hPa)', 'Accel X (G)', 'Accel Y (G)',
            'Accel Z (G)', 'Temperature (°C)'
        ].join(',');
        
        const csvRows = [headers];
        
        const maxLength = Math.max(
            AppState.chartData.time.length,
            AppState.chartData.altitude.length,
            AppState.chartData.pressure.length,
            AppState.chartData.accelX.length,
            AppState.chartData.accelY.length,
            AppState.chartData.accelZ.length
        );
        
        for (let i = 0; i < maxLength; i++) {
            const tempPoint = AppState.chartData.temperature[i] || { x: 0, y: 0 };
            const row = [
                (AppState.chartData.time[i] || 0).toFixed(2),
                (AppState.chartData.altitude[i] || 0).toFixed(2),
                (AppState.chartData.pressure[i] || 0).toFixed(2),
                (AppState.chartData.accelX[i] || 0).toFixed(3),
                (AppState.chartData.accelY[i] || 0).toFixed(3),
                (AppState.chartData.accelZ[i] || 0).toFixed(3),
                (tempPoint.y || 0).toFixed(2)
            ];
            csvRows.push(row.join(','));
        }
        
        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mission_graphs_data_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        addLogEntry('SYSTEM', 'Graphs data exported to CSV');
    } catch (error) {
        console.error('Error exporting graphs CSV:', error);
        addLogEntry('ERROR', `Failed to export graphs CSV: ${error.message}`, 'error');
    }
}

function showDownloadSuccess(button) {
    if (!button) return;
    
    const originalHTML = button.innerHTML;
    const originalBackground = button.style.background;
    
    button.innerHTML = '<i class="fas fa-check"></i> <span>Downloaded!</span>';
    button.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    button.disabled = true;
    
    setTimeout(() => {
        button.innerHTML = originalHTML;
        button.style.background = originalBackground;
        button.disabled = false;
    }, 2000);
}

// ===== MISSION CONTROL FUNCTIONS =====
function startMission() {
    if (!AppState.missionActive) {
        AppState.missionActive = true;
        AppState.missionStartTime = Date.now();
        AppState.systemStatus = 'ACTIVE';
        
        addLogEntry('SYSTEM', 'Mission started - receiving telemetry data');
    }
}

// ===== UTILITY FUNCTIONS =====
function formatCoordinate(value, isLatitude) {
    if (value === undefined || value === null) return '--.--°';
    const absoluteValue = Math.abs(value);
    const degrees = Math.floor(absoluteValue);
    const minutes = (absoluteValue - degrees) * 60;
    const direction = isLatitude ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W');
    return `${degrees}°${minutes.toFixed(4)}' ${direction}`;
}

function addTelemetryLogEntry(data) {
    const timestamp = new Date().toLocaleTimeString('en-IN');
    let message = '';
    
    if (data.latitude !== undefined && data.longitude !== undefined) {
        message = `GPS: ${data.latitude.toFixed(4)}°, ${data.longitude.toFixed(4)}°, Alt: ${data.altitude?.toFixed(0) || '--'}m`;
    } else if (data.altitude !== undefined) {
        message = `Alt: ${data.altitude.toFixed(0)}m, Accel: ${data.accelX?.toFixed(1) || '--'}G`;
    } else {
        message = 'Telemetry data received';
    }
    
    addLogEntry('TELEMETRY', message);
}

function addLogEntry(type, message, status = '') {
    const timestamp = new Date().toLocaleTimeString('en-IN');
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    logEntry.innerHTML = `
        <span class="log-time">${timestamp}</span>
        <span class="log-data ${status}">[${type}] ${message}</span>
    `;
    
    if (domElements.telemetryLog) {
        domElements.telemetryLog.appendChild(logEntry);
        
        // Auto-scroll to bottom
        domElements.telemetryLog.scrollTop = domElements.telemetryLog.scrollHeight;
        
        // Keep last 100 entries
        while (domElements.telemetryLog.children.length > 100) {
            domElements.telemetryLog.removeChild(domElements.telemetryLog.firstChild);
        }
    }
}

// ===== RESET FUNCTIONS =====
function resetMission() {
    if (confirm('Reset mission and clear all data?')) {
        // Clear state
        AppState.missionActive = false;
        AppState.missionStartTime = null;
        AppState.telemetryData = [];
        AppState.packetCount = 0;
        AppState.systemStatus = 'STANDBY';
        AppState.isIgnited = false;
        AppState.ignitionTime = null;
        AppState.communicationEstablished = false;
        
        // Stop GPS tracking
        stopGpsTracking();
        
        // Stop Firebase telemetry
        stopFirebaseTelemetry();
        
        // DO NOT reset system connection - let user decide
        // DO NOT reset sensors - they remain as they are
        
        // Reset chart data
        AppState.chartData = {
            altitude: [], pressure: [], temperature: [], time: [],
            accelX: [], accelY: [], accelZ: [], totalAccel: []
        };
        
        // Reset GPS tracking data
        GpsTrackingState.positionHistory = [];
        GpsTrackingState.lastPosition = null;
        
        // Reset charts
        resetCharts();
        
        // Reset 3D rocket
        if (AppState.rocket) {
            AppState.rocket.rotation.set(0, 0, 0);
        }
        if (AppState.camera) {
            AppState.camera.position.set(0, 10, 25);
            AppState.camera.lookAt(0, 0, 0);
        }
        
        // Close all panels and show main page
        closeAllPanels();
        
        // Close menu
        closeMenu();
        
        // Reset displays
        resetAllDisplays();
        
        // Clear logs
        if (domElements.telemetryLog) {
            domElements.telemetryLog.innerHTML = `
                <div class="log-entry">
                    <span class="log-time">${new Date().toLocaleTimeString('en-IN')}</span>
                    <span class="log-data">[SYSTEM] Mission reset complete. System connection maintained.</span>
                </div>
            `;
        }
        
        addLogEntry('SYSTEM', 'Mission reset completed. System ready.');
    }
}

function closeAllPanels() {
    // Close any active panel
    if (AppState.activePanel) {
        closePanel(AppState.activePanel);
    }
    
    // Show main dashboard
    const mainDashboard = document.querySelector('.main-dashboard');
    if (mainDashboard) {
        mainDashboard.style.display = 'grid';
    }
}

function resetAllDisplays() {
    const resetValue = '--';
    
    // Update all elements with reset values
    const elementsToReset = [
        { element: domElements.dataBuffer, value: '0' },
        { element: domElements.altitude, value: `${resetValue} m` },
        { element: domElements.downrange, value: `${resetValue} km` },
        { element: domElements.verticalSpeed, value: `${resetValue} m/s` },
        { element: domElements.horizontalSpeed, value: `${resetValue} m/s` },
        { element: domElements.accelX, value: `${resetValue} G` },
        { element: domElements.accelY, value: `${resetValue} G` },
        { element: domElements.accelZ, value: `${resetValue} G` },
        { element: domElements.totalAccel, value: `${resetValue} G` },
        { element: domElements.roll, value: `${resetValue}°` },
        { element: domElements.pitch, value: `${resetValue}°` },
        { element: domElements.yaw, value: `${resetValue}°` },
        { element: domElements.angularRate, value: `${resetValue}°/s` },
        { element: domElements.ignitionStatus, value: 'NOT IGNITED', status: 'critical' },
        { element: domElements.gpsSats, value: resetValue },
        { element: domElements.temperature, value: `${resetValue} °C` },
        { element: domElements.thermocouple1, value: `${resetValue} °C` },
        { element: domElements.strainGauge1, value: `${resetValue} µε` },
        { element: domElements.rocketOrientation, value: 'Stable' },
        { element: domElements.rocketRotationX, value: '0°' },
        { element: domElements.rocketRotationY, value: '0°' },
        { element: domElements.rocketRotationZ, value: '0°' },
        { element: domElements.gpsLatitude, value: `${resetValue}°` },
        { element: domElements.gpsLongitude, value: `${resetValue}°` },
        { element: domElements.gpsAltitude, value: `${resetValue} m` },
        { element: domElements.gpsSatellites, value: resetValue },
        { element: domElements.maxAltitude, value: `${resetValue} m` },
        { element: domElements.downrangeDistance, value: `${resetValue} km` },
        { element: domElements.currentAltitude, value: `${resetValue} m` },
        { element: domElements.trajCurrentAltitude, value: `${resetValue} m` },
        { element: domElements.descentAltitude, value: `${resetValue} m` },
        { element: domElements.ignitionTime, value: '--:--' },
        { element: domElements.maxqAlt, value: `${resetValue} m` }
    ];
    
    elementsToReset.forEach(item => {
        if (item.element) {
            item.element.textContent = item.value;
            if (item.status) {
                item.element.setAttribute('data-status', item.status);
            }
        }
    });
    
    // Update comm status based on connection state
    if (domElements.commStatus) {
        if (AppState.communicationEstablished) {
            domElements.commStatus.textContent = 'COMM ESTABLISHED';
            domElements.commStatus.setAttribute('data-status', 'nominal');
        } else if (AppState.isSystemConnected) {
            domElements.commStatus.textContent = 'SYSTEM CONNECTED';
            domElements.commStatus.setAttribute('data-status', 'warning');
        } else {
            domElements.commStatus.textContent = 'NO CONNECTION';
            domElements.commStatus.setAttribute('data-status', 'critical');
        }
    }
}

// ===== START APPLICATION =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    initializeApp();
});

// Make initMap globally available
window.initMap = initMap;

// Make inputTelemetryData globally available for external systems
window.inputTelemetryData = function(telemetryData) {
    console.log('Receiving telemetry data:', telemetryData);
    
    // Check if system is connected
    if (!AppState.isSystemConnected) {
        addLogEntry('ERROR', 'Cannot process telemetry: System not connected', 'error');
        return;
    }
    
    // Validate incoming data
    if (!telemetryData || typeof telemetryData !== 'object') {
        console.error('Invalid telemetry data format');
        addLogEntry('ERROR', 'Invalid telemetry data format received', 'error');
        return;
    }
    
    // Check if communication is established
    if (!AppState.communicationEstablished) {
        addLogEntry('ERROR', 'Cannot process telemetry: Communication not established', 'error');
        return;
    }
    
    // Check if sensors are ready
    if (!areSensorsReadyForTelemetry()) {
        addLogEntry('WARNING', 'Cannot process telemetry: Sensors not fully initialized', 'warning');
        return;
    }
    
    // Process the telemetry data
    processTelemetryData(telemetryData);
};
