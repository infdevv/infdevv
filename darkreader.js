// Smart Dark Mode Toggle Plugin for Axiom Browser
// Automatically toggles dark mode based on time and provides manual controls

(function() {
    'use strict';
    
    let darkModeSettings = {
        autoMode: true,
        darkStart: 19, // 7 PM
        darkEnd: 7,    // 7 AM
        manualOverride: null
    };
    
    function initDarkModeToggle() {
        // Load saved settings
        const savedSettings = window.axiomAPI.storage.get('dark_mode_settings');
        if (savedSettings) {
            darkModeSettings = { ...darkModeSettings, ...savedSettings };
        }
        
        // Add sidebar icon
        window.axiomAPI.addSidebarIcon(
            'dark_mode',
            'javascript:void(0)',
            false,
            'Dark Mode Toggle - Ctrl+Shift+D'
        );
        
        // Add keyboard shortcut
        window.axiomAPI.addKeyboardShortcut('ctrl+shift+d', toggleDarkMode, 'Toggle Dark Mode');
        
        // Add context menu
        window.axiomAPI.addContextMenuItem('Toggle Dark Mode', toggleDarkMode);
        window.axiomAPI.addContextMenuItem('Dark Mode Settings', openSettings);
        
        // Apply initial mode
        applyDarkMode();
        
        // Set up auto-check timer (every minute)
        if (darkModeSettings.autoMode) {
            setInterval(checkAutoMode, 60000);
        }
        
        console.log('Dark Mode Toggle plugin loaded');
        window.axiomAPI.notify('Dark mode control ready!', 'success');
    }
    
    function getCurrentThemeState() {
        // Try to detect current theme state from the page
        const body = document.body;
        const computedStyle = getComputedStyle(body);
        const backgroundColor = computedStyle.backgroundColor;
        
        // Simple heuristic: if background is dark, assume dark mode
        const rgb = backgroundColor.match(/\d+/g);
        if (rgb) {
            const brightness = (parseInt(rgb[0]) + parseInt(rgb[1]) + parseInt(rgb[2])) / 3;
            return brightness < 128;
        }
        
        return false;
    }
    
    function shouldBeDark() {
        if (darkModeSettings.manualOverride !== null) {
            return darkModeSettings.manualOverride;
        }
        
        if (!darkModeSettings.autoMode) {
            return getCurrentThemeState();
        }
        
        const now = new Date();
        const hour = now.getHours();
        
        // Handle overnight period (e.g., 19:00 to 07:00)
        if (darkModeSettings.darkStart > darkModeSettings.darkEnd) {
            return hour >= darkModeSettings.darkStart || hour < darkModeSettings.darkEnd;
        } else {
            return hour >= darkModeSettings.darkStart && hour < darkModeSettings.darkEnd;
        }
    }
    
    function applyDarkMode() {
        const isDark = shouldBeDark();
        
        if (isDark) {
            enableDarkMode();
        } else {
            enableLightMode();
        }
    }
    
    function enableDarkMode() {
        const darkCSS = `
            :root {
                --color-background: #0a0a0a;
                --color-surface: #111111;
                --color-surface-hover: #1a1a1a;
                --color-text-primary: #ffffff;
                --color-text-secondary: #a0a0a0;
                --color-border: #333333;
                --glass-background: rgba(17, 17, 17, 0.8);
                --glass-border: rgba(255, 255, 255, 0.1);
                --glass-blur: blur(12px);
            }
            
            body {
                background-color: var(--color-background) !important;
                color: var(--color-text-primary) !important;
            }
            
            /* Style scrollbars */
            ::-webkit-scrollbar {
                width: 8px;
                background: var(--color-surface);
            }
            
            ::-webkit-scrollbar-thumb {
                background: var(--color-text-secondary);
                border-radius: 4px;
            }
            
            ::-webkit-scrollbar-thumb:hover {
                background: var(--color-text-primary);
            }
            
            /* Style common elements */
            input, textarea, select {
                background-color: var(--color-surface) !important;
                color: var(--color-text-primary) !important;
                border-color: var(--color-border) !important;
            }
            
            button {
                background-color: var(--color-surface) !important;
                color: var(--color-text-primary) !important;
                border-color: var(--color-border) !important;
            }
        `;
        
        window.axiomAPI.applyCustomCSS(darkCSS);
        
        // Also try to inject dark mode into active tabs
        const tabs = window.axiomAPI.getAllTabs();
        tabs.forEach(tab => {
            try {
                window.axiomAPI.injectCSS(tab.id, `
                    html { filter: invert(1) hue-rotate(180deg) !important; }
                    img, video, iframe, svg, canvas { filter: invert(1) hue-rotate(180deg) !important; }
                `);
            } catch (e) {
                // Silently fail for cross-origin content
            }
        });
    }
    
    function enableLightMode() {
        const lightCSS = `
            :root {
                --color-background: #ffffff;
                --color-surface: #f8f9fa;
                --color-surface-hover: #e9ecef;
                --color-text-primary: #212529;
                --color-text-secondary: #6c757d;
                --color-border: #dee2e6;
                --glass-background: rgba(248, 249, 250, 0.8);
                --glass-border: rgba(0, 0, 0, 0.1);
                --glass-blur: blur(12px);
            }
            
            body {
                background-color: var(--color-background) !important;
                color: var(--color-text-primary) !important;
            }
        `;
        
        window.axiomAPI.applyCustomCSS(lightCSS);
        
        // Remove dark mode from tabs
        const tabs = window.axiomAPI.getAllTabs();
        tabs.forEach(tab => {
            try {
                window.axiomAPI.injectCSS(tab.id, `
                    html { filter: none !important; }
                    img, video, iframe, svg, canvas { filter: none !important; }
                `);
            } catch (e) {
                // Silently fail for cross-origin content
            }
        });
    }
    
    function toggleDarkMode() {
        const currentState = getCurrentThemeState();
        darkModeSettings.manualOverride = !currentState;
        darkModeSettings.autoMode = false; // Disable auto mode when manually toggling
        
        saveDarkModeSettings();
        applyDarkMode();
        
        const mode = darkModeSettings.manualOverride ? 'dark' : 'light';
        window.axiomAPI.notify(`Switched to ${mode} mode`, 'info');
    }
    
    function checkAutoMode() {
        if (darkModeSettings.autoMode && darkModeSettings.manualOverride === null) {
            applyDarkMode();
        }
    }
    
    function openSettings() {
        const settingsContent = `
            <div style="padding: 20px;">
                <h3 style="color: var(--color-text-primary); margin-top: 0;">Dark Mode Settings</h3>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: flex; align-items: center; gap: 8px; color: var(--color-text-primary);">
                        <input type="checkbox" id="autoModeCheck" ${darkModeSettings.autoMode ? 'checked' : ''}>
                        Enable automatic dark mode
                    </label>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="color: var(--color-text-primary); display: block; margin-bottom: 8px;">
                        Dark mode starts at:
                    </label>
                    <select id="darkStartSelect" style="
                        background: var(--color-surface);
                        color: var(--color-text-primary);
                        border: 1px solid var(--color-border);
                        padding: 8px;
                        border-radius: 4px;
                        width: 100%;
                    ">
                        ${generateTimeOptions(darkModeSettings.darkStart)}
                    </select>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="color: var(--color-text-primary); display: block; margin-bottom: 8px;">
                        Dark mode ends at:
                    </label>
                    <select id="darkEndSelect" style="
                        background: var(--color-surface);
                        color: var(--color-text-primary);
                        border: 1px solid var(--color-border);
                        padding: 8px;
                        border-radius: 4px;
                        width: 100%;
                    ">
                        ${generateTimeOptions(darkModeSettings.darkEnd)}
                    </select>
                </div>
                
                <div style="display: flex; gap: 12px; margin-top: 24px;">
                    <button onclick="saveSettings()" style="
                        background: var(--color-primary);
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 6px;
                        cursor: pointer;
                    ">Save Settings</button>
                    <button onclick="resetToAuto()" style="
                        background: var(--color-surface);
                        color: var(--color-text-primary);
                        border: 1px solid var(--color-border);
                        padding: 10px 20px;
                        border-radius: 6px;
                        cursor: pointer;
                    ">Reset to Auto</button>
                    <button onclick="toggleNow()" style="
                        background: var(--color-warning, #f59e0b);
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 6px;
                        cursor: pointer;
                    ">Toggle Now</button>
                </div>
                
                <div style="margin-top: 20px; padding: 12px; background: var(--color-surface); border-radius: 6px;">
                    <div style="color: var(--color-text-secondary); font-size: 12px; line-height: 1.4;">
                        <strong>Current Status:</strong><br>
                        Mode: <span id="currentMode">${darkModeSettings.autoMode ? 'Auto' : 'Manual'}</span><br>
                        Time: <span id="currentTime">${new Date().toLocaleTimeString()}</span><br>
                        Should be dark: <span id="shouldBeDark">${shouldBeDark() ? 'Yes' : 'No'}</span>
                    </div>
                </div>
            </div>
        `;
        
        const settingsPanel = window.axiomAPI.createFloatingPanel(settingsContent, {
            title: 'Dark Mode Settings',
            width: '350px',
            height: '450px',
            top: '100px',
            left: '300px'
        });
        
        // Make functions globally available
        window.saveSettings = () => {
            const autoMode = document.getElementById('autoModeCheck').checked;
            const darkStart = parseInt(document.getElementById('darkStartSelect').value);
            const darkEnd = parseInt(document.getElementById('darkEndSelect').value);
            
            darkModeSettings.autoMode = autoMode;
            darkModeSettings.darkStart = darkStart;
            darkModeSettings.darkEnd = darkEnd;
            
            if (autoMode) {
                darkModeSettings.manualOverride = null;
            }
            
            saveDarkModeSettings();
            applyDarkMode();
            
            window.axiomAPI.notify('Settings saved!', 'success');
            settingsPanel.close();
        };
        
        window.resetToAuto = () => {
            darkModeSettings.autoMode = true;
            darkModeSettings.manualOverride = null;
            saveDarkModeSettings();
            applyDarkMode();
            window.axiomAPI.notify('Reset to automatic mode', 'info');
            settingsPanel.close();
        };
        
        window.toggleNow = () => {
            toggleDarkMode();
            settingsPanel.close();
        };
        
        // Update time display every second
        const timeInterval = setInterval(() => {
            const timeElement = document.getElementById('currentTime');
            const shouldBeElement = document.getElementById('shouldBeDark');
            const modeElement = document.getElementById('currentMode');
            
            if (timeElement && shouldBeElement && modeElement) {
                timeElement.textContent = new Date().toLocaleTimeString();
                shouldBeElement.textContent = shouldBeDark() ? 'Yes' : 'No';
                modeElement.textContent = darkModeSettings.autoMode ? 'Auto' : 'Manual';
            } else {
                clearInterval(timeInterval);
            }
        }, 1000);
    }
    
    function generateTimeOptions(selectedHour) {
        let options = '';
        for (let i = 0; i < 24; i++) {
            const hour12 = i === 0 ? 12 : i > 12 ? i - 12 : i;
            const ampm = i < 12 ? 'AM' : 'PM';
            const selected = i === selectedHour ? 'selected' : '';
            options += `<option value="${i}" ${selected}>${hour12}:00 ${ampm}</option>`;
        }
        return options;
    }
    
    function saveDarkModeSettings() {
        window.axiomAPI.storage.set('dark_mode_settings', darkModeSettings);
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDarkModeToggle);
    } else {
        initDarkModeToggle();
    }
    
})();
