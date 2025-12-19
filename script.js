// ===== MISSION CONTROL DASHBOARD - SPACE CLUB RIT =====
// Enhanced with Primary Telemetry Download Feature

// Main application state
const AppState = {
    missionActive: false,
    missionStartTime: null,
    currentTime: null,
    telemetryData: [],
    gpsHistory: [],
    flightPath: [],
    systemStatus: 'STANDBY',
    dataRate: 0,
    packetCount: 0,
    lastUpdateTime: null,
    launchSitePosition: { lat: 18.7291, lng: 73.4642 }, // RIT coordinates
    groundStationPosition: { lat: 18.7291, lng: 73.4642 }, // Ground station location
    isIgnited: false,
    ignitionTime: null,
    isRocketRotating: false,
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
    groundStationMarker: null,
    
    // Chart data
    chartData: {
        altitude: [],
        pressure: [],
        temperature: [],
        time: [],
        velocity: [],
        accelX: [],
        accelY: [],
        accelZ: [],
        totalAccel: []
    }
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
    
    // Mission elements
    dataRateValue: document.getElementById('data-rate-value'),
    packetCount: document.getElementById('packet-count'),
    
    // Primary telemetry
    latitude: document.getElementById('latitude'),
    longitude: document.getElementById('longitude'),
    altitude: document.getElementById('altitude'),
    downrange: document.getElementById('downrange'),
    
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
    
    // 3D Rocket stats
    rocketOrientation: document.getElementById('rocket-orientation'),
    
    // Trajectory elements
    maxAltitude: document.getElementById('max-altitude'),
    downrangeDistance: document.getElementById('downrange-distance'),
    currentAltitude: document.getElementById('current-altitude'),
    trajCurrentAltitude: document.getElementById('traj-current-altitude'),
    descentAltitude: document.getElementById('descent-altitude'),
    maxqAlt: document.getElementById('maxq-alt'),
    ignitionTime: document.getElementById('ignition-time'),
    
    // GPS elements
    mapLat: document.getElementById('map-lat'),
    mapLon: document.getElementById('map-lon'),
    mapAlt: document.getElementById('map-alt'),
    gpsLatitude: document.getElementById('gps-latitude'),
    gpsLongitude: document.getElementById('gps-longitude'),
    gpsAltitude: document.getElementById('gps-altitude'),
    gpsSatellites: document.getElementById('gps-satellites'),
    
    // Panels
    performancePanel: document.getElementById('performance-panel'),
    trajectoryPanel: document.getElementById('trajectory-panel'),
    trackingPanel: document.getElementById('tracking-panel'),
    visualizationPanel: document.getElementById('visualization-panel'),
    
    // Buttons
    resetButton: document.getElementById('reset-button'),
    downloadDataCSV: document.getElementById('download-data-csv'),
    downloadGraphsCSV: document.getElementById('download-graphs-csv'),
    downloadTrajectory: document.getElementById('download-trajectory'),
    toggleSatellite: document.getElementById('toggle-satellite'),
    
    // Log elements
    telemetryLog: document.getElementById('telemetry-log'),
    dataBuffer: document.getElementById('data-buffer')
};

// ===== INITIALIZATION =====
function initializeApp() {
    console.log('Initializing Enhanced Mission Control Dashboard...');
    
    // Initialize state
    AppState.currentTime = new Date();
    AppState.lastUpdateTime = Date.now();
    
    // Initialize charts
    initializeCharts();
    
    // Initialize 3D rocket
    initialize3DRocket();
    
    // Initialize event listeners
    initializeEventListeners();
    
    // Start data rate monitor
    startDataRateMonitor();
    
    console.log('Mission Control Dashboard initialized');
    addLogEntry('SYSTEM', 'Mission Control initialized with telemetry download feature');
    addLogEntry('SYSTEM', 'Waiting for telemetry data...');
}

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
        }
    };

    // Acceleration Chart
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
                    fill: true
                },
                { 
                    label: 'Accel Y', 
                    data: [], 
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                { 
                    label: 'Accel Z', 
                    data: [], 
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                { 
                    label: 'Total', 
                    data: [], 
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true
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
            }
        }
    });

    // Temperature Chart
    const tempCtx = document.getElementById('temperatureChart').getContext('2d');
    temperatureChart = new Chart(tempCtx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Temperature vs Altitude',
                data: [],
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.2)',
                borderWidth: 2,
                pointRadius: 4,
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
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Temperature (°C)'
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
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
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
            labels: [],
            datasets: [{
                label: 'Pressure',
                data: [],
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
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
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Pressure (hPa)'
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
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
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
            }
        }
    });
}

// ===== PRIMARY TELEMETRY DOWNLOAD FUNCTIONS =====
function downloadPrimaryTelemetry() {
    try {
        // Get current telemetry values from the display
        const telemetryData = getCurrentTelemetryData();
        
        // Create CSV content
        let csvContent = "PRIMARY TELEMETRY DATA - SPACE CLUB RIT\n";
        csvContent += "Generated: " + telemetryData.displayTime + "\n\n";
        
        csvContent += "CATEGORY,PARAMETER,VALUE\n";
        
        // Position Data
        csvContent += "Position Data,Latitude," + telemetryData.positionData.latitude + "\n";
        csvContent += "Position Data,Longitude," + telemetryData.positionData.longitude + "\n";
        csvContent += "Position Data,Altitude," + telemetryData.positionData.altitude + "\n";
        csvContent += "Position Data,Downrange," + telemetryData.positionData.downrange + "\n";
        
        // Acceleration Vectors
        csvContent += "Acceleration,Accel X," + telemetryData.accelerationVectors.accelX + "\n";
        csvContent += "Acceleration,Accel Y," + telemetryData.accelerationVectors.accelY + "\n";
        csvContent += "Acceleration,Accel Z," + telemetryData.accelerationVectors.accelZ + "\n";
        csvContent += "Acceleration,Total Accel," + telemetryData.accelerationVectors.totalAccel + "\n";
        
        // Attitude & Orientation
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
            csvContent += "Timestamp,Latitude,Longitude,Altitude(m),Velocity(m/s),AccelX(G),AccelY(G),AccelZ(G),Temperature(°C)\n";
            
            // Get last 10 data points or all if less than 10
            const dataPoints = AppState.telemetryData.slice(-10);
            
            dataPoints.forEach((data, index) => {
                const timestamp = new Date(data.timestamp).toLocaleTimeString();
                csvContent += `${timestamp},`;
                csvContent += `${data.latitude?.toFixed(6) || '--'},`;
                csvContent += `${data.longitude?.toFixed(6) || '--'},`;
                csvContent += `${data.altitude?.toFixed(2) || '--'},`;
                csvContent += `${data.velocity?.toFixed(2) || '--'},`;
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
        
        return telemetryData;
        
    } catch (error) {
        console.error('Error downloading telemetry:', error);
        addLogEntry('ERROR', `Failed to download telemetry: ${error.message}`);
        alert('Error downloading telemetry data. Please try again.');
    }
}

function getCurrentTelemetryData() {
    // Get current values from display
    const data = {
        timestamp: new Date().toISOString(),
        displayTime: new Date().toLocaleString(),
        positionData: {
            latitude: domElements.latitude ? domElements.latitude.textContent : '--.--° N',
            longitude: domElements.longitude ? domElements.longitude.textContent : '--.--° E',
            altitude: domElements.altitude ? domElements.altitude.textContent : '-- m',
            downrange: domElements.downrange ? domElements.downrange.textContent : '-- m'
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
            commStatus: domElements.commStatus ? domElements.commStatus.textContent : 'NO DATA',
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

function downloadTelemetryWithOptions(format = 'csv') {
    const telemetryData = getCurrentTelemetryData();
    
    if (format === 'csv') {
        downloadPrimaryTelemetry();
    } else if (format === 'json') {
        downloadTelemetryAsJSON(telemetryData);
    } else if (format === 'txt') {
        downloadTelemetryAsText(telemetryData);
    }
}

function downloadTelemetryAsJSON(data) {
    try {
        const jsonData = {
            header: {
                mission: "SPACE CLUB RIT - EKLAVYA",
                timestamp: data.timestamp,
                generated: data.displayTime
            },
            telemetry: {
                positionData: data.positionData,
                accelerationVectors: data.accelerationVectors,
                attitudeOrientation: data.attitudeOrientation,
                systemStatus: data.systemStatus
            },
            missionInfo: data.missionInfo,
            recentData: data.rawDataPoints.map(point => ({
                timestamp: new Date(point.timestamp).toLocaleTimeString(),
                latitude: point.latitude,
                longitude: point.longitude,
                altitude: point.altitude,
                velocity: point.velocity
            }))
        };
        
        const jsonString = JSON.stringify(jsonData, null, 2);
        downloadFile(jsonString, 'primary_telemetry.json', 'application/json');
        
        showDownloadSuccess(domElements.downloadTelemetryBtn);
        addLogEntry('SYSTEM', 'Primary telemetry downloaded as JSON');
        
    } catch (error) {
        console.error('Error downloading JSON:', error);
        addLogEntry('ERROR', `Failed to download JSON: ${error.message}`);
    }
}

function downloadTelemetryAsText(data) {
    try {
        let text = "========================================\n";
        text += "     SPACE CLUB RIT - EKLAVYA MISSION\n";
        text += "       PRIMARY TELEMETRY DATA\n";
        text += "========================================\n\n";
        
        text += "Generated: " + data.displayTime + "\n";
        text += "Mission Status: " + data.missionInfo.status + "\n\n";
        
        text += "POSITION DATA\n";
        text += "─────────────\n";
        text += "Latitude:      " + data.positionData.latitude + "\n";
        text += "Longitude:     " + data.positionData.longitude + "\n";
        text += "Altitude:      " + data.positionData.altitude + "\n";
        text += "Downrange:     " + data.positionData.downrange + "\n\n";
        
        text += "ACCELERATION VECTORS\n";
        text += "───────────────────\n";
        text += "Accel X (Ax):  " + data.accelerationVectors.accelX + "\n";
        text += "Accel Y (Ay):  " + data.accelerationVectors.accelY + "\n";
        text += "Accel Z (Az):  " + data.accelerationVectors.accelZ + "\n";
        text += "Total Accel:   " + data.accelerationVectors.totalAccel + "\n\n";
        
        text += "ATTITUDE & ORIENTATION\n";
        text += "─────────────────────\n";
        text += "Roll (Φ):      " + data.attitudeOrientation.roll + "\n";
        text += "Pitch (θ):     " + data.attitudeOrientation.pitch + "\n";
        text += "Yaw (Ψ):       " + data.attitudeOrientation.yaw + "\n";
        text += "Angular Rate:  " + data.attitudeOrientation.angularRate + "\n\n";
        
        text += "SYSTEM STATUS\n";
        text += "─────────────\n";
        text += "Ignition:      " + data.systemStatus.ignition + "\n";
        text += "Comm Status:   " + data.systemStatus.commStatus + "\n";
        text += "GPS Satellites:" + data.systemStatus.gpsSats + "\n";
        text += "Temperature:   " + data.systemStatus.temperature + "\n\n";
        
        text += "MISSION INFORMATION\n";
        text += "──────────────────\n";
        text += "Packet Count:  " + data.missionInfo.packetCount + "\n";
        text += "Data Points:   " + data.missionInfo.dataPoints + "\n";
        text += "Mission Time:  " + data.missionInfo.missionTime + "\n";
        
        downloadFile(text, 'primary_telemetry.txt', 'text/plain');
        
        showDownloadSuccess(domElements.downloadTelemetryBtn);
        addLogEntry('SYSTEM', 'Primary telemetry downloaded as Text');
        
    } catch (error) {
        console.error('Error downloading text:', error);
        addLogEntry('ERROR', `Failed to download text: ${error.message}`);
    }
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function showDownloadOptions(event) {
    event.preventDefault();
    
    // Create options menu
    const menu = document.createElement('div');
    menu.className = 'download-options-menu';
    menu.innerHTML = `
        <div class="download-option" data-format="csv">
            <i class="fas fa-file-csv"></i>
            <span>Download as CSV</span>
        </div>
        <div class="download-option" data-format="json">
            <i class="fas fa-file-code"></i>
            <span>Download as JSON</span>
        </div>
        <div class="download-option" data-format="txt">
            <i class="fas fa-file-alt"></i>
            <span>Download as Text</span>
        </div>
    `;
    
    menu.style.position = 'fixed';
    menu.style.top = event.clientY + 'px';
    menu.style.left = event.clientX + 'px';
    menu.style.zIndex = '10000';
    
    document.body.appendChild(menu);
    
    // Add event listeners to options
    const options = menu.querySelectorAll('.download-option');
    options.forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            const format = option.getAttribute('data-format');
            downloadTelemetryWithOptions(format);
            document.body.removeChild(menu);
        });
    });
    
    // Remove menu when clicking elsewhere
    const removeMenu = () => {
        if (document.body.contains(menu)) {
            document.body.removeChild(menu);
        }
        document.removeEventListener('click', removeMenu);
    };
    
    setTimeout(() => {
        document.addEventListener('click', removeMenu);
    }, 100);
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
    
    // Hide primary telemetry section
    const primaryTelemetry = document.getElementById('primary-telemetry');
    if (primaryTelemetry) {
        primaryTelemetry.style.display = 'none';
    }
    
    // Hide data log section
    const dataLogSection = document.getElementById('data-log-section');
    if (dataLogSection) {
        dataLogSection.style.display = 'none';
    }
    
    // Show selected panel
    const panel = document.getElementById(`${panelId}-panel`);
    if (panel) {
        panel.classList.add('active');
        panel.style.display = 'block';
        AppState.activePanel = panelId;
        
        // Initialize specific panel features
        switch (panelId) {
            case 'visualization':
                setTimeout(() => {
                    initialize3DRocket();
                }, 100);
                break;
            case 'tracking':
                if (typeof initMap === 'function') {
                    setTimeout(() => {
                        initMap();
                    }, 100);
                }
                break;
        }
        
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
    
    // Show main page elements
    const primaryTelemetry = document.getElementById('primary-telemetry');
    if (primaryTelemetry) {
        primaryTelemetry.style.display = 'block';
    }
    
    const dataLogSection = document.getElementById('data-log-section');
    if (dataLogSection) {
        dataLogSection.style.display = 'block';
    }
}

function closeMenu() {
    console.log('Closing menu...');
    domElements.menuOverlay.classList.remove('active');
    document.body.style.overflow = 'auto';
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
        AppState.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(AppState.renderer.domElement);
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        AppState.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 15);
        directionalLight.castShadow = true;
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
        addLogEntry('ERROR', `3D Rocket initialization failed: ${error.message}`);
    }
}

function createProfessionalRocket() {
    const rocketGroup = new THREE.Group();
    
    // Main body
    const bodyGeometry = new THREE.CylinderGeometry(0.8, 1.0, 15, 32);
    const bodyMaterial = new THREE.MeshPhongMaterial({
        color: 0x1e3a8a,
        shininess: 100,
        specular: 0x444444
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    rocketGroup.add(body);
    
    // Nose cone
    const noseGeometry = new THREE.ConeGeometry(1.0, 4, 32);
    const noseMaterial = new THREE.MeshPhongMaterial({
        color: 0xdc2626,
        shininess: 100
    });
    const nose = new THREE.Mesh(noseGeometry, noseMaterial);
    nose.position.y = 9.5;
    nose.castShadow = true;
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
        fin.castShadow = true;
        rocketGroup.add(fin);
    }
    
    // Engine nozzle
    const nozzleGeometry = new THREE.CylinderGeometry(0.6, 0.8, 1.5, 32);
    const nozzleMaterial = new THREE.MeshPhongMaterial({
        color: 0x1f2937,
        emissive: 0xff4400,
        emissiveIntensity: 0.3
    });
    const nozzle = new THREE.Mesh(nozzleGeometry, nozzleMaterial);
    nozzle.position.y = -7.5;
    rocketGroup.add(nozzle);
    
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
    AppState.terrain.receiveShadow = true;
    AppState.scene.add(AppState.terrain);
}

function animate3DRocket() {
    if (!AppState.scene || !AppState.camera || !AppState.renderer) return;
    
    requestAnimationFrame(animate3DRocket);
    
    // Update rocket stats
    if (AppState.rocket && domElements.rocketOrientation) {
        domElements.rocketOrientation.textContent = 'Stable';
    }
    
    AppState.renderer.render(AppState.scene, AppState.camera);
}

// ===== TELEMETRY PROCESSING =====
function processTelemetryData(data) {
    try {
        const telemetry = typeof data === 'string' ? JSON.parse(data) : data;
        
        // Start mission on first valid data
        if (!AppState.missionActive && isValidTelemetry(telemetry)) {
            startMission();
        }
        
        // Update packet count
        AppState.packetCount++;
        if (domElements.packetCount) {
            domElements.packetCount.textContent = AppState.packetCount;
        }
        
        // Add timestamp and mission time
        telemetry.timestamp = Date.now();
        telemetry.missionTime = AppState.missionStartTime ? 
            (Date.now() - AppState.missionStartTime) / 1000 : 0;
        
        // Store in history
        AppState.telemetryData.push(telemetry);
        
        // Update all displays
        updateTelemetryDisplay(telemetry);
        updateGPSData(telemetry);
        updateCharts(telemetry);
        update3DRocketFromTelemetry(telemetry);
        addTelemetryLogEntry(telemetry);
        
        // Update data buffer count
        if (domElements.dataBuffer) {
            domElements.dataBuffer.textContent = AppState.telemetryData.length;
        }
        
    } catch (error) {
        console.error('Error processing telemetry:', error);
        addLogEntry('ERROR', `Telemetry processing error: ${error.message}`);
    }
}

function updateTelemetryDisplay(data) {
    // Update all telemetry values with real data or placeholders
    updateElement(data.latitude, domElements.latitude, formatCoordinate(data.latitude, true));
    updateElement(data.longitude, domElements.longitude, formatCoordinate(data.longitude, false));
    updateElement(data.altitude, domElements.altitude, `${data.altitude?.toFixed(0) || '--'} m`);
    updateElement(data.downrange, domElements.downrange, `${((data.downrange || 0) / 1000).toFixed(1) || '--'} km`);
    
    updateElement(data.accelX, domElements.accelX, `${data.accelX?.toFixed(2) || '--'} G`);
    updateElement(data.accelY, domElements.accelY, `${data.accelY?.toFixed(2) || '--'} G`);
    updateElement(data.accelZ, domElements.accelZ, `${data.accelZ?.toFixed(2) || '--'} G`);
    
    // Calculate total acceleration
    if (data.accelX !== undefined && data.accelY !== undefined && data.accelZ !== undefined) {
        const total = Math.sqrt(data.accelX**2 + data.accelY**2 + data.accelZ**2);
        if (domElements.totalAccel) domElements.totalAccel.textContent = `${total.toFixed(2)} G`;
    } else {
        if (domElements.totalAccel) domElements.totalAccel.textContent = '-- G';
    }
    
    updateElement(data.roll, domElements.roll, `${data.roll?.toFixed(1) || '--'}°`);
    updateElement(data.pitch, domElements.pitch, `${data.pitch?.toFixed(1) || '--'}°`);
    updateElement(data.yaw, domElements.yaw, `${data.yaw?.toFixed(1) || '--'}°`);
    updateElement(data.angularRate, domElements.angularRate, `${data.angularRate?.toFixed(1) || '--'}°/s`);
    
    // System status
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
    
    if (data.commStatus !== undefined && domElements.commStatus) {
        const status = data.commStatus ? 'nominal' : 'critical';
        domElements.commStatus.textContent = data.commStatus ? 'NOMINAL' : 'NO DATA';
        domElements.commStatus.setAttribute('data-status', status);
    } else if (domElements.commStatus) {
        domElements.commStatus.textContent = 'NO DATA';
        domElements.commStatus.setAttribute('data-status', 'critical');
    }
    
    updateElement(data.gpsSats, domElements.gpsSats, data.gpsSats || '--');
    updateElement(data.temperature, domElements.temperature, `${data.temperature?.toFixed(1) || '--'} °C`);
    
    // Update additional displays for active panels
    if (AppState.activePanel === 'trajectory' || AppState.activePanel === 'tracking') {
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
    
    // Update tracking panel
    if (AppState.activePanel === 'tracking') {
        updateElement(data.latitude, domElements.gpsLatitude, formatCoordinate(data.latitude, true));
        updateElement(data.longitude, domElements.gpsLongitude, formatCoordinate(data.longitude, false));
        updateElement(data.altitude, domElements.gpsAltitude, `${data.altitude?.toFixed(0) || '--'} m`);
        updateElement(data.gpsSats, domElements.gpsSatellites, data.gpsSats || '--');
    }
}

function updateElement(value, element, formattedValue) {
    if (element && value !== undefined) {
        element.textContent = formattedValue;
    } else if (element && value === undefined && formattedValue.includes('--')) {
        element.textContent = formattedValue;
    }
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

// ===== EVENT LISTENERS =====
function initializeEventListeners() {
    console.log('Initializing event listeners...');
    
    // Menu navigation
    initializeMenuNavigation();
    
    // Primary telemetry download button
    if (domElements.downloadTelemetryBtn) {
        // Left click for CSV download
        domElements.downloadTelemetryBtn.addEventListener('click', downloadPrimaryTelemetry);
        
        // Right click for format options
        domElements.downloadTelemetryBtn.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            showDownloadOptions(e);
        });
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
    
    if (domElements.downloadTrajectory) {
        domElements.downloadTrajectory.addEventListener('click', downloadTrajectoryChart);
    }
    
    // Map controls
    if (domElements.toggleSatellite) {
        domElements.toggleSatellite.addEventListener('click', () => toggleMapType('satellite'));
    }
    
    // Log controls
    const pauseLogBtn = document.getElementById('pause-log');
    const exportLogBtn = document.getElementById('export-log');
    const clearLogBtn = document.getElementById('clear-log');
    
    if (pauseLogBtn) {
        let logPaused = false;
        pauseLogBtn.addEventListener('click', () => {
            logPaused = !logPaused;
            pauseLogBtn.innerHTML = logPaused ? 
                '<i class="fas fa-play"></i><span class="btn-text">Resume Stream</span>' :
                '<i class="fas fa-pause"></i><span class="btn-text">Pause Stream</span>';
            addLogEntry('SYSTEM', logPaused ? 'Log stream paused' : 'Log stream resumed');
        });
    }
    
    if (exportLogBtn) {
        exportLogBtn.addEventListener('click', exportLogData);
    }
    
    if (clearLogBtn) {
        clearLogBtn.addEventListener('click', clearLog);
    }
    
    // Chart controls - only download buttons
    document.querySelectorAll('.chart-btn[data-action="export"]').forEach(btn => {
        btn.addEventListener('click', function() {
            const chartContainer = this.closest('.chart-container');
            const chartId = chartContainer.querySelector('canvas').id;
            exportChartAsImage(chartId);
        });
    });
}

function downloadTrajectoryChart() {
    const canvas = document.getElementById('trajectoryChart');
    if (!canvas) return;
    
    try {
        // Create a temporary canvas with higher resolution
        const tempCanvas = document.createElement('canvas');
        const ctx = tempCanvas.getContext('2d');
        
        // Set higher resolution
        const scale = 2;
        tempCanvas.width = canvas.width * scale;
        tempCanvas.height = canvas.height * scale;
        
        // Apply scaling
        ctx.scale(scale, scale);
        
        // Fill background with white
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, tempCanvas.width / scale, tempCanvas.height / scale);
        
        // Draw the chart
        ctx.drawImage(canvas, 0, 0);
        
        // Add title and timestamp
        ctx.fillStyle = '#111827';
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.fillText('Trajectory Analysis - Altitude vs Range', 20, 30);
        
        ctx.font = '12px Inter, sans-serif';
        ctx.fillStyle = '#6b7280';
        ctx.fillText(`Generated: ${new Date().toLocaleString()}`, 20, 50);
        
        // Convert to image and download
        const image = tempCanvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = image;
        link.download = `trajectory_chart_${new Date().toISOString().slice(0, 10)}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        addLogEntry('SYSTEM', 'Trajectory chart downloaded as PNG');
    } catch (error) {
        console.error('Error downloading trajectory chart:', error);
        addLogEntry('ERROR', `Failed to download trajectory chart: ${error.message}`);
    }
}

function exportChartAsImage(chartId) {
    const canvas = document.getElementById(chartId);
    if (!canvas) return;
    
    try {
        // Create a temporary canvas with higher resolution
        const tempCanvas = document.createElement('canvas');
        const ctx = tempCanvas.getContext('2d');
        
        // Set higher resolution
        const scale = 2;
        tempCanvas.width = canvas.width * scale;
        tempCanvas.height = canvas.height * scale;
        
        // Apply scaling
        ctx.scale(scale, scale);
        
        // Fill background with white
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, tempCanvas.width / scale, tempCanvas.height / scale);
        
        // Draw the chart
        ctx.drawImage(canvas, 0, 0);
        
        // Add title based on chart type
        let title = '';
        switch(chartId) {
            case 'accelerationChart':
                title = 'Acceleration Vectors vs Time';
                break;
            case 'temperatureChart':
                title = 'Temperature vs Altitude';
                break;
            case 'altitudeChart':
                title = 'Altitude vs Time';
                break;
            case 'pressureChart':
                title = 'Pressure vs Altitude';
                break;
        }
        
        // Add title and timestamp
        ctx.fillStyle = '#111827';
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.fillText(title, 20, 30);
        
        ctx.font = '12px Inter, sans-serif';
        ctx.fillStyle = '#6b7280';
        ctx.fillText(`Generated: ${new Date().toLocaleString()}`, 20, 50);
        
        // Convert to image and download
        const image = tempCanvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = image;
        link.download = `${chartId}_${new Date().toISOString().slice(0, 10)}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        addLogEntry('SYSTEM', `${title} chart downloaded as PNG`);
    } catch (error) {
        console.error('Error exporting chart:', error);
        addLogEntry('ERROR', `Failed to export chart ${chartId}: ${error.message}`);
    }
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

function startDataRateMonitor() {
    setInterval(() => {
        const currentTime = Date.now();
        const timeDiff = (currentTime - AppState.lastUpdateTime) / 1000;
        
        if (timeDiff > 0 && AppState.packetCount > 0) {
            const dataRate = (AppState.packetCount * 100) / timeDiff;
            AppState.dataRate = dataRate;
            
            if (domElements.dataRateValue) {
                domElements.dataRateValue.textContent = `${(dataRate / 1000).toFixed(2)} Mbps`;
            }
        } else if (domElements.dataRateValue) {
            domElements.dataRateValue.textContent = '0.00 Mbps';
        }
        
        AppState.lastUpdateTime = currentTime;
    }, 2000);
}

// ===== DATA INPUT FUNCTION =====
function inputTelemetryData(telemetryData) {
    console.log('Receiving telemetry data:', telemetryData);
    
    // Validate incoming data
    if (!telemetryData || typeof telemetryData !== 'object') {
        console.error('Invalid telemetry data format');
        addLogEntry('ERROR', 'Invalid telemetry data format received');
        return;
    }
    
    // Process the telemetry data
    processTelemetryData(telemetryData);
}

// ===== UTILITY FUNCTIONS =====
function isValidTelemetry(data) {
    return data && (
        data.altitude !== undefined ||
        data.velocity !== undefined ||
        data.latitude !== undefined ||
        data.longitude !== undefined
    );
}

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
        message = `Pos: ${data.latitude.toFixed(4)}°, ${data.longitude.toFixed(4)}°`;
        if (data.altitude !== undefined) {
            message += `, Alt: ${data.altitude.toFixed(0)}m`;
        }
    } else if (data.altitude !== undefined) {
        message = `Alt: ${data.altitude.toFixed(0)}m`;
        if (data.velocity !== undefined) {
            message += `, Vel: ${data.velocity.toFixed(1)}m/s`;
        }
    } else {
        message = 'Telemetry data received';
    }
    
    addLogEntry('TELEMETRY', message);
}

function addLogEntry(type, message) {
    const timestamp = new Date().toLocaleTimeString('en-IN');
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type.toLowerCase()}`;
    logEntry.innerHTML = `
        <span class="log-time">${timestamp}</span>
        <span class="log-data">[${type}] ${message}</span>
    `;
    
    if (domElements.telemetryLog) {
        domElements.telemetryLog.appendChild(logEntry);
        
        if (document.getElementById('auto-scroll')?.checked) {
            domElements.telemetryLog.scrollTop = domElements.telemetryLog.scrollHeight;
        }
        
        // Keep last 100 entries
        while (domElements.telemetryLog.children.length > 100) {
            domElements.telemetryLog.removeChild(domElements.telemetryLog.firstChild);
        }
    }
}

function exportLogData() {
    const logEntries = Array.from(domElements.telemetryLog.querySelectorAll('.log-entry'));
    
    if (logEntries.length === 0) {
        alert('No log data to export!');
        return;
    }
    
    try {
        const logData = logEntries.map(entry => {
            const time = entry.querySelector('.log-time').textContent;
            const data = entry.querySelector('.log-data').textContent;
            return `${time},${data}`;
        }).join('\n');
        
        const blob = new Blob([`Time,Message\n${logData}`], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mission_log_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        addLogEntry('SYSTEM', 'Log data exported to CSV');
    } catch (error) {
        console.error('Error exporting log:', error);
        addLogEntry('ERROR', `Failed to export log: ${error.message}`);
    }
}

function clearLog() {
    if (confirm('Clear all log entries?')) {
        domElements.telemetryLog.innerHTML = `
            <div class="log-entry">
                <span class="log-time">${new Date().toLocaleTimeString('en-IN')}</span>
                <span class="log-data">[SYSTEM] Log cleared</span>
            </div>
        `;
        addLogEntry('SYSTEM', 'Log cleared by user');
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
        addLogEntry('SYSTEM', 'Google Maps tracking initialized');
    } catch (error) {
        console.error('Google Maps initialization error:', error);
        addLogEntry('ERROR', 'Google Maps failed to load');
    }
}

function updateGPSData(data) {
    if (data.latitude !== undefined && data.longitude !== undefined && AppState.googleMap) {
        const position = { lat: data.latitude, lng: data.longitude };
        
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
            if (path.getLength() > 100) {
                path.removeAt(0);
            }
        }
        
        // Center map on rocket if tracking panel is active
        if (AppState.activePanel === 'tracking') {
            AppState.googleMap.panTo(position);
        }
        
        // Update map coordinates overlay
        if (domElements.mapLat) domElements.mapLat.textContent = `${data.latitude.toFixed(4)}°`;
        if (domElements.mapLon) domElements.mapLon.textContent = `${data.longitude.toFixed(4)}°`;
        if (domElements.mapAlt) domElements.mapAlt.textContent = `${data.altitude?.toFixed(0) || '--'} m`;
    }
}

function toggleMapType(type) {
    if (AppState.googleMap) {
        AppState.googleMap.setMapTypeId(type);
        addLogEntry('SYSTEM', `Map type changed to ${type}`);
    }
}

// ===== CSV EXPORT FUNCTIONS =====
function exportDataCSV() {
    if (AppState.telemetryData.length === 0) {
        alert('No data to export!');
        return;
    }
    
    try {
        const headers = [
            'Timestamp', 'Mission Time (s)', 'Latitude', 'Longitude', 'Altitude (m)',
            'Velocity (m/s)', 'Vertical Velocity (m/s)', 'Horizontal Velocity (m/s)',
            'Accel X (G)', 'Accel Y (G)', 'Accel Z (G)', 'Roll (°)', 'Pitch (°)', 'Yaw (°)',
            'Angular Rate (°/s)', 'Temperature (°C)', 'GPS Satellites', 'Ignition',
            'Communication Status', 'Dynamic Pressure (Pa)', 'Downrange (m)', 'Pressure (hPa)'
        ];
        
        const csvRows = [headers.join(',')];
        
        AppState.telemetryData.forEach(data => {
            const row = [
                new Date(data.timestamp).toISOString(),
                (data.missionTime || 0).toFixed(2),
                (data.latitude || 0).toFixed(6),
                (data.longitude || 0).toFixed(6),
                (data.altitude || 0).toFixed(2),
                (data.velocity || 0).toFixed(2),
                (data.verticalVelocity || 0).toFixed(2),
                (data.horizontalVelocity || 0).toFixed(2),
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
                (data.dynamicPressure || 0).toFixed(2),
                (data.downrange || 0).toFixed(2),
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
        addLogEntry('ERROR', `Failed to export data CSV: ${error.message}`);
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
            'Accel Z (G)', 'Total Acceleration (G)', 'Temperature (°C)', 'Altitude (m)'
        ];
        
        const csvRows = [headers.join(',')];
        
        const maxLength = Math.max(
            AppState.chartData.time.length,
            AppState.chartData.altitude.length,
            AppState.chartData.pressure.length,
            AppState.chartData.accelX.length,
            AppState.chartData.accelY.length,
            AppState.chartData.accelZ.length,
            AppState.chartData.temperature.length
        );
        
        for (let i = 0; i < maxLength; i++) {
            const row = [
                (AppState.chartData.time[i] || 0).toFixed(2),
                (AppState.chartData.altitude[i] || 0).toFixed(2),
                (AppState.chartData.pressure[i] || 1013).toFixed(2),
                (AppState.chartData.accelX[i] || 0).toFixed(3),
                (AppState.chartData.accelY[i] || 0).toFixed(3),
                (AppState.chartData.accelZ[i] || 0).toFixed(3),
                (AppState.chartData.totalAccel[i] || 0).toFixed(3),
                (AppState.chartData.temperature[i]?.y || 0).toFixed(2),
                (AppState.chartData.temperature[i]?.x || 0).toFixed(2)
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
        addLogEntry('ERROR', `Failed to export graphs CSV: ${error.message}`);
    }
}

// ===== CHART UPDATES =====
function updateCharts(data) {
    const missionTime = data.missionTime || 0;
    
    if (data.altitude !== undefined) {
        AppState.chartData.time.push(missionTime);
        AppState.chartData.altitude.push(data.altitude);
        
        if (data.velocity !== undefined) {
            AppState.chartData.velocity.push(data.velocity);
        }
        
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
            AppState.chartData.pressure.push(data.pressure);
        }
        
        // Calculate total acceleration
        if (data.accelX !== undefined && data.accelY !== undefined && data.accelZ !== undefined) {
            const total = Math.sqrt(data.accelX**2 + data.accelY**2 + data.accelZ**2);
            AppState.chartData.totalAccel.push(total);
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
            AppState.chartData.velocity.shift();
            AppState.chartData.accelX.shift();
            AppState.chartData.accelY.shift();
            AppState.chartData.accelZ.shift();
            AppState.chartData.totalAccel.shift();
            AppState.chartData.pressure.shift();
        }
        
        // Keep last 300 temperature points
        if (AppState.chartData.temperature.length > 300) {
            AppState.chartData.temperature.shift();
        }
        
        // Update charts
        updateChartData();
    }
}

function updateChartData() {
    // Update altitude chart
    if (altitudeChart) {
        altitudeChart.data.labels = AppState.chartData.time.slice(-50);
        altitudeChart.data.datasets[0].data = AppState.chartData.altitude.slice(-50);
        altitudeChart.update('none');
    }
    
    // Update pressure chart
    if (pressureChart && AppState.chartData.pressure.length > 0) {
        pressureChart.data.labels = AppState.chartData.altitude.slice(-50);
        pressureChart.data.datasets[0].data = AppState.chartData.pressure.slice(-50);
        pressureChart.update('none');
    }
    
    // Update acceleration chart
    if (accelerationChart) {
        accelerationChart.data.labels = AppState.chartData.time.slice(-50);
        accelerationChart.data.datasets[0].data = AppState.chartData.accelX.slice(-50);
        accelerationChart.data.datasets[1].data = AppState.chartData.accelY.slice(-50);
        accelerationChart.data.datasets[2].data = AppState.chartData.accelZ.slice(-50);
        accelerationChart.data.datasets[3].data = AppState.chartData.totalAccel.slice(-50);
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
        AppState.isRocketRotating = false;
        
        // Reset chart data
        AppState.chartData = {
            altitude: [], pressure: [], temperature: [], time: [],
            velocity: [], accelX: [], accelY: [], accelZ: [], totalAccel: []
        };
        
        // Reset charts
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
                    <span class="log-data">[SYSTEM] Mission reset complete. Ready for telemetry data.</span>
                </div>
            `;
        }
        
        addLogEntry('SYSTEM', 'Mission reset completed. Ready for new data.');
    }
}

function closeAllPanels() {
    // Close any active panel
    if (AppState.activePanel) {
        closePanel(AppState.activePanel);
    }
    
    // Show all main page elements
    const elementsToShow = [
        document.getElementById('primary-telemetry'),
        document.getElementById('data-log-section')
    ];
    
    elementsToShow.forEach(element => {
        if (element) {
            element.style.display = 'block';
        }
    });
}

function resetAllDisplays() {
    const resetValue = '--';
    
    // Update all elements with reset values
    const elementsToReset = [
        { element: domElements.dataRateValue, value: '0.00 Mbps' },
        { element: domElements.packetCount, value: '0' },
        { element: domElements.dataBuffer, value: '0' },
        { element: domElements.latitude, value: `${resetValue}°` },
        { element: domElements.longitude, value: `${resetValue}°` },
        { element: domElements.altitude, value: `${resetValue} m` },
        { element: domElements.downrange, value: `${resetValue} km` },
        { element: domElements.accelX, value: `${resetValue} G` },
        { element: domElements.accelY, value: `${resetValue} G` },
        { element: domElements.accelZ, value: `${resetValue} G` },
        { element: domElements.totalAccel, value: `${resetValue} G` },
        { element: domElements.roll, value: `${resetValue}°` },
        { element: domElements.pitch, value: `${resetValue}°` },
        { element: domElements.yaw, value: `${resetValue}°` },
        { element: domElements.angularRate, value: `${resetValue}°/s` },
        { element: domElements.ignitionStatus, value: 'NOT IGNITED', status: 'critical' },
        { element: domElements.commStatus, value: 'NO DATA', status: 'critical' },
        { element: domElements.gpsSats, value: resetValue },
        { element: domElements.temperature, value: `${resetValue} °C` },
        { element: domElements.rocketOrientation, value: 'Stable' },
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
}

// ===== START APPLICATION =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    initializeApp();
});

// Make initMap globally available
window.initMap = initMap;

// Make inputTelemetryData globally available for external systems
window.inputTelemetryData = inputTelemetryData;

// Add global function to simulate receiving telemetry data (for testing)
window.simulateTelemetryData = function() {
    const sampleData = {
        latitude: 18.7291 + (Math.random() * 0.01),
        longitude: 73.4642 + (Math.random() * 0.01),
        altitude: 1000 + Math.random() * 500,
        velocity: 150 + Math.random() * 50,
        verticalVelocity: 20 + Math.random() * 10,
        horizontalVelocity: 140 + Math.random() * 20,
        downrange: 5000 + Math.random() * 1000,
        accelX: 0.1 + Math.random() * 0.1,
        accelY: -0.05 + Math.random() * 0.1,
        accelZ: 2.5 + Math.random() * 0.5,
        roll: -2 + Math.random() * 4,
        pitch: 85 + Math.random() * 5,
        yaw: 1 + Math.random() * 2,
        angularRate: 0.5 + Math.random() * 1,
        ignition: true,
        commStatus: true,
        gpsSats: 12,
        temperature: 25 + Math.random() * 10,
        dynamicPressure: 25000 + Math.random() * 5000,
        pressure: 800 + Math.random() * 100
    };
    
    inputTelemetryData(sampleData);
    return sampleData;
};
