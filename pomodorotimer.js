// Pomodoro Timer Plugin for Axiom Browser
// Implements the Pomodoro Technique with customizable work/break intervals

(function() {
    'use strict';
    
    let timerState = {
        isRunning: false,
        isPaused: false,
        currentSession: 'work', // 'work', 'shortBreak', 'longBreak'
        timeLeft: 25 * 60, // 25 minutes in seconds
        sessionCount: 0,
        totalWorkTime: 0
    };
    
    let timerSettings = {
        workDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        sessionsUntilLongBreak: 4,
        autoStartBreaks: false,
        autoStartWork: false,
        playNotificationSound: true,
        showDesktopNotifications: true
    };
    
    let timerInterval = null;
    let timerPanel = null;
    
    function initPomodoroTimer() {
        // Load saved settings
        const savedSettings = window.axiomAPI.storage.get('pomodoro_settings');
        if (savedSettings) {
            timerSettings = { ...timerSettings, ...savedSettings };
        }
        
        const savedState = window.axiomAPI.storage.get('pomodoro_state');
        if (savedState) {
            timerState = { ...timerState, ...savedState };
            // Don't restore running state on page load
            timerState.isRunning = false;
            timerState.isPaused = false;
        } else {
            timerState.timeLeft = timerSettings.workDuration * 60;
        }
        
        // Add sidebar icon
        window.axiomAPI.addSidebarIcon(
            'timer',
            'javascript:void(0)',
            false,
            'Pomodoro Timer - Ctrl+Shift+P'
        );
        
        // Add keyboard shortcuts
        window.axiomAPI.addKeyboardShortcut('ctrl+shift+p', openTimer, 'Open Pomodoro Timer');
        window.axiomAPI.addKeyboardShortcut('ctrl+shift+space', toggleTimer, 'Start/Pause Timer');
        
        // Add context menu
        window.axiomAPI.addContextMenuItem('Pomodoro Timer', openTimer);
        window.axiomAPI.addContextMenuItem('Start/Pause Timer', toggleTimer);
        
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
        
        console.log('Pomodoro Timer plugin loaded');
        window.axiomAPI.notify('Pomodoro Timer ready! Ctrl+Shift+P to open', 'success');
    }
    
    function openTimer() {
        if (timerPanel) {
            timerPanel.close();
            timerPanel = null;
            return;
        }
        
        const timerContent = generateTimerContent();
        
        timerPanel = window.axiomAPI.createFloatingPanel(timerContent, {
            title: 'Pomodoro Timer',
            width: '350px',
            height: '500px',
            top: '100px',
            left: '400px'
        });
        
        // Start updating the display
        updateTimerDisplay();
        
        // Make functions globally available
        window.startTimer = startTimer;
        window.pauseTimer = pauseTimer;
        window.resetTimer = resetTimer;
        window.skipSession = skipSession;
        window.openTimerSettings = openTimerSettings;
        
        // Update display every second
        const displayInterval = setInterval(() => {
            if (document.getElementById('timerDisplay')) {
                updateTimerDisplay();
            } else {
                clearInterval(displayInterval);
            }
        }, 1000);
    }
    
    function generateTimerContent() {
        const sessionNames = {
            work: 'Work Session',
            shortBreak: 'Short Break',
            longBreak: 'Long Break'
        };
        
        const progress = getProgress();
        const timeDisplay = formatTime(timerState.timeLeft);
        
        return `
            <div style="text-align: center; padding: 20px;">
                <!-- Session info -->
                <div style="margin-bottom: 20px;">
                    <h2 style="color: var(--color-text-primary); margin: 0; font-size: 24px;">
                        ${sessionNames[timerState.currentSession]}
                    </h2>
                    <div style="color: var(--color-text-secondary); font-size: 14px; margin-top: 4px;">
                        Session ${timerState.sessionCount + 1} • Total: ${Math.floor(timerState.totalWorkTime / 60)}min
                    </div>
                </div>
                
                <!-- Timer display -->
                <div style="
                    background: var(--color-surface);
                    border: 2px solid var(--color-primary);
                    border-radius: 50%;
                    width: 200px;
                    height: 200px;
                    margin: 0 auto 30px auto;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    overflow: hidden;
                ">
                    <!-- Progress ring -->
                    <div style="
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: conic-gradient(
                            var(--color-primary) 0deg,
                            var(--color-primary) ${progress * 360}deg,
                            transparent ${progress * 360}deg,
                            transparent 360deg
                        );
                        border-radius: 50%;
                        mask: radial-gradient(circle at center, transparent 85px, black 87px);
                        -webkit-mask: radial-gradient(circle at center, transparent 85px, black 87px);
                    "></div>
                    
                    <!-- Time display -->
                    <div id="timerDisplay" style="
                        color: var(--color-text-primary);
                        font-size: 36px;
                        font-weight: bold;
                        font-family: 'SF Mono', Consolas, monospace;
                        z-index: 1;
                    ">${timeDisplay}</div>
                </div>
                
                <!-- Control buttons -->
                <div style="display: flex; gap: 12px; justify-content: center; margin-bottom: 20px;">
                    ${!timerState.isRunning ? `
                        <button onclick="startTimer()" style="
                            background: var(--color-primary);
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 8px;
                            cursor: pointer;
                            font-size: 16px;
                            font-weight: 600;
                        ">Start</button>
                    ` : `
                        <button onclick="pauseTimer()" style="
                            background: var(--color-warning, #f59e0b);
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 8px;
                            cursor: pointer;
                            font-size: 16px;
                            font-weight: 600;
                        ">Pause</button>
                    `}
                    
                    <button onclick="resetTimer()" style="
                        background: var(--color-surface);
                        color: var(--color-text-primary);
                        border: 1px solid var(--color-border);
                        padding: 12px 24px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 16px;
                    ">Reset</button>
                    
                    <button onclick="skipSession()" style="
                        background: var(--color-surface);
                        color: var(--color-text-primary);
                        border: 1px solid var(--color-border);
                        padding: 12px 24px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 16px;
                    ">Skip</button>
                </div>
                
                <!-- Statistics -->
                <div style="
                    background: var(--color-surface);
                    border-radius: 8px;
                    padding: 16px;
                    margin-bottom: 16px;
                ">
                    <div style="color: var(--color-text-primary); font-weight: 600; margin-bottom: 8px;">
                        Today's Progress
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 14px;">
                        <div style="color: var(--color-text-secondary);">
                            Completed Sessions: <strong style="color: var(--color-text-primary);">${timerState.sessionCount}</strong>
                        </div>
                        <div style="color: var(--color-text-secondary);">
                            Work Time: <strong style="color: var(--color-text-primary);">${Math.floor(timerState.totalWorkTime / 60)}m</strong>
                        </div>
                    </div>
                </div>
                
                <!-- Settings button -->
                <button onclick="openTimerSettings()" style="
                    background: var(--color-surface);
                    color: var(--color-text-primary);
                    border: 1px solid var(--color-border);
                    padding: 8px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    width: 100%;
                ">Timer Settings</button>
            </div>
        `;
    }
    
    function updateTimerDisplay() {
        const timerDisplay = document.getElementById('timerDisplay');
        if (timerDisplay) {
            timerDisplay.textContent = formatTime(timerState.timeLeft);
        }
        
        // Update the entire panel content to refresh progress ring
        if (timerPanel) {
            timerPanel.update(generateTimerContent());
        }
    }
    
    function getProgress() {
        let totalTime;
        switch (timerState.currentSession) {
            case 'work':
                totalTime = timerSettings.workDuration * 60;
                break;
            case 'shortBreak':
                totalTime = timerSettings.shortBreakDuration * 60;
                break;
            case 'longBreak':
                totalTime = timerSettings.longBreakDuration * 60;
                break;
        }
        return (totalTime - timerState.timeLeft) / totalTime;
    }
    
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    function startTimer() {
        if (!timerState.isRunning) {
            timerState.isRunning = true;
            timerState.isPaused = false;
            
            timerInterval = setInterval(() => {
                timerState.timeLeft--;
                
                if (timerState.currentSession === 'work') {
                    timerState.totalWorkTime++;
                }
                
                saveTimerState();
                
                if (timerState.timeLeft <= 0) {
                    completeSession();
                }
            }, 1000);
            
            window.axiomAPI.notify('Timer started!', 'success', 1500);
            updateTimerDisplay();
        }
    }
    
    function pauseTimer() {
        if (timerState.isRunning) {
            timerState.isRunning = false;
            timerState.isPaused = true;
            clearInterval(timerInterval);
            window.axiomAPI.notify('Timer paused', 'info', 1500);
            updateTimerDisplay();
        }
    }
    
    function resetTimer() {
        timerState.isRunning = false;
        timerState.isPaused = false;
        clearInterval(timerInterval);
        
        switch (timerState.currentSession) {
            case 'work':
                timerState.timeLeft = timerSettings.workDuration * 60;
                break;
            case 'shortBreak':
                timerState.timeLeft = timerSettings.shortBreakDuration * 60;
                break;
            case 'longBreak':
                timerState.timeLeft = timerSettings.longBreakDuration * 60;
                break;
        }
        
        saveTimerState();
        window.axiomAPI.notify('Timer reset', 'info', 1500);
        updateTimerDisplay();
    }
    
    function skipSession() {
        clearInterval(timerInterval);
        completeSession();
    }
    
    function completeSession() {
        clearInterval(timerInterval);
        timerState.isRunning = false;
        
        const sessionName = timerState.currentSession;
        
        if (sessionName === 'work') {
            timerState.sessionCount++;
            
            // Determine next session type
            if (timerState.sessionCount % timerSettings.sessionsUntilLongBreak === 0) {
                timerState.currentSession = 'longBreak';
                timerState.timeLeft = timerSettings.longBreakDuration * 60;
            } else {
                timerState.currentSession = 'shortBreak';
                timerState.timeLeft = timerSettings.shortBreakDuration * 60;
            }
        } else {
            // Break is over, back to work
            timerState.currentSession = 'work';
            timerState.timeLeft = timerSettings.workDuration * 60;
        }
        
        // Show notification
        const nextSessionName = {
            work: 'Work Session',
            shortBreak: 'Short Break',
            longBreak: 'Long Break'
        };
        
        window.axiomAPI.notify(
            `${sessionName === 'work' ? 'Work' : 'Break'} session complete! Next: ${nextSessionName[timerState.currentSession]}`,
            'success',
            5000
        );
        
        // Show desktop notification
        if (timerSettings.showDesktopNotifications && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(`Pomodoro Timer`, {
                body: `${sessionName === 'work' ? 'Work' : 'Break'} session complete!\nNext: ${nextSessionName[timerState.currentSession]}`,
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="%234f46e5" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>'
            });
        }
        
        // Auto-start next session if enabled
        if ((sessionName === 'work' && timerSettings.autoStartBreaks) || 
            (sessionName !== 'work' && timerSettings.autoStartWork)) {
            setTimeout(() => {
                startTimer();
            }, 3000);
        }
        
        saveTimerState();
        updateTimerDisplay();
    }
    
    function toggleTimer() {
        if (timerState.isRunning) {
            pauseTimer();
        } else {
            startTimer();
        }
    }
    
    function openTimerSettings() {
        const settingsContent = `
            <div style="padding: 20px;">
                <h3 style="color: var(--color-text-primary); margin-top: 0;">Timer Settings</h3>
                
                <div style="margin-bottom: 16px;">
                    <label style="color: var(--color-text-primary); display: block; margin-bottom: 4px;">
                        Work Duration (minutes):
                    </label>
                    <input type="number" id="workDuration" value="${timerSettings.workDuration}" min="1" max="60" style="
                        background: var(--color-surface);
                        color: var(--color-text-primary);
                        border: 1px solid var(--color-border);
                        padding: 8px;
                        border-radius: 4px;
                        width: 100%;
                    ">
                </div>
                
                <div style="margin-bottom: 16px;">
                    <label style="color: var(--color-text-primary); display: block; margin-bottom: 4px;">
                        Short Break Duration (minutes):
                    </label>
                    <input type="number" id="shortBreakDuration" value="${timerSettings.shortBreakDuration}" min="1" max="30" style="
                        background: var(--color-surface);
                        color: var(--color-text-primary);
                        border: 1px solid var(--color-border);
                        padding: 8px;
                        border-radius: 4px;
                        width: 100%;
                    ">
                </div>
                
                <div style="margin-bottom: 16px;">
                    <label style="color: var(--color-text-primary); display: block; margin-bottom: 4px;">
                        Long Break Duration (minutes):
                    </label>
                    <input type="number" id="longBreakDuration" value="${timerSettings.longBreakDuration}" min="1" max="60" style="
                        background: var(--color-surface);
                        color: var(--color-text-primary);
                        border: 1px solid var(--color-border);
                        padding: 8px;
                        border-radius: 4px;
                        width: 100%;
                    ">
                </div>
                
                <div style="margin-bottom: 16px;">
                    <label style="color: var(--color-text-primary); display: block; margin-bottom: 4px;">
                        Sessions until long break:
                    </label>
                    <input type="number" id="sessionsUntilLongBreak" value="${timerSettings.sessionsUntilLongBreak}" min="2" max="10" style="
                        background: var(--color-surface);
                        color: var(--color-text-primary);
                        border: 1px solid var(--color-border);
                        padding: 8px;
                        border-radius: 4px;
                        width: 100%;
                    ">
                </div>
                
                <div style="margin-bottom: 16px;">
                    <label style="display: flex; align-items: center; gap: 8px; color: var(--color-text-primary);">
                        <input type="checkbox" id="autoStartBreaks" ${timerSettings.autoStartBreaks ? 'checked' : ''}>
                        Auto-start breaks
                    </label>
                </div>
                
                <div style="margin-bottom: 16px;">
                    <label style="display: flex; align-items: center; gap: 8px; color: var(--color-text-primary);">
                        <input type="checkbox" id="autoStartWork" ${timerSettings.autoStartWork ? 'checked' : ''}>
                        Auto-start work sessions
                    </label>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: flex; align-items: center; gap: 8px; color: var(--color-text-primary);">
                        <input type="checkbox" id="showDesktopNotifications" ${timerSettings.showDesktopNotifications ? 'checked' : ''}>
                        Show desktop notifications
                    </label>
                </div>
                
                <div style="display: flex; gap: 12px;">
                    <button onclick="saveTimerSettings()" style="
                        background: var(--color-primary);
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 6px;
                        cursor: pointer;
                        flex: 1;
                    ">Save Settings</button>
                    <button onclick="resetStats()" style="
                        background: var(--color-danger, #ef4444);
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 6px;
                        cursor: pointer;
                        flex: 1;
                    ">Reset Stats</button>
                </div>
            </div>
        `;
        
        const settingsPanel = window.axiomAPI.createFloatingPanel(settingsContent, {
            title: 'Pomodoro Settings',
            width: '350px',
            height: '550px',
            top: '150px',
            left: '500px'
        });
        
        window.saveTimerSettings = () => {
            timerSettings.workDuration = parseInt(document.getElementById('workDuration').value);
            timerSettings.shortBreakDuration = parseInt(document.getElementById('shortBreakDuration').value);
            timerSettings.longBreakDuration = parseInt(document.getElementById('longBreakDuration').value);
            timerSettings.sessionsUntilLongBreak = parseInt(document.getElementById('sessionsUntilLongBreak').value);
            timerSettings.autoStartBreaks = document.getElementById('autoStartBreaks').checked;
            timerSettings.autoStartWork = document.getElementById('autoStartWork').checked;
            timerSettings.showDesktopNotifications = document.getElementById('showDesktopNotifications').checked;
            
            window.axiomAPI.storage.set('pomodoro_settings', timerSettings);
            
            // Reset current timer if not running
            if (!timerState.isRunning) {
                resetTimer();
            }
            
            window.axiomAPI.notify('Settings saved!', 'success');
            settingsPanel.close();
        };
        
        window.resetStats = () => {
            if (confirm('Reset all statistics? This cannot be undone.')) {
                timerState.sessionCount = 0;
                timerState.totalWorkTime = 0;
                saveTimerState();
                updateTimerDisplay();
                window.axiomAPI.notify('Statistics reset', 'info');
                settingsPanel.close();
            }
        };
    }
    
    function saveTimerState() {
        window.axiomAPI.storage.set('pomodoro_state', timerState);
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPomodoroTimer);
    } else {
        initPomodoroTimer();
    }
    
})();
