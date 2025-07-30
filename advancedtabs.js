// Advanced Tab Manager Plugin for Axiom Browser
// Provides tab organization, session management, and productivity features

(function() {
    'use strict';
    
    let managerPanel = null;
    let tabSessions = {};
    let tabGroups = {};
    
    function initTabManager() {
        // Load saved data
        tabSessions = window.axiomAPI.storage.get('tab_sessions') || {};
        tabGroups = window.axiomAPI.storage.get('tab_groups') || {};
        
        // Add sidebar icon
        window.axiomAPI.addSidebarIcon(
            'tab',
            'javascript:void(0)',
            false,
            'Tab Manager - Ctrl+Shift+T'
        );
        
        // Add keyboard shortcuts
        window.axiomAPI.addKeyboardShortcut('ctrl+shift+t', openTabManager, 'Open Tab Manager');
        window.axiomAPI.addKeyboardShortcut('ctrl+shift+s', saveCurrentSession, 'Save Current Session');
        window.axiomAPI.addKeyboardShortcut('ctrl+shift+d', duplicateActiveTab, 'Duplicate Active Tab');
        
        // Add context menu items
        window.axiomAPI.addContextMenuItem('Tab Manager', openTabManager);
        window.axiomAPI.addContextMenuItem('Save Session', saveCurrentSession);
        
        console.log('Tab Manager plugin loaded');
        window.axiomAPI.notify('Tab Manager ready! Ctrl+Shift+T to open', 'success');
    }
    
    function openTabManager() {
        if (managerPanel) {
            managerPanel.close();
            managerPanel = null;
            return;
        }
        
        const tabs = window.axiomAPI.getAllTabs();
        const activeTab = window.axiomAPI.getActiveTab();
        
        const managerContent = `
            <div style="display: flex; flex-direction: column; height: 100%;">
                <!-- Header with actions -->
                <div style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
                    <button onclick="saveCurrentSession()" style="
                        background: var(--color-primary);
                        color: white;
                        border: none;
                        padding: 8px 12px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 12px;
                    ">Save Session</button>
                    <button onclick="closeAllTabs()" style="
                        background: var(--color-danger, #ef4444);
                        color: white;
                        border: none;
                        padding: 8px 12px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 12px;
                    ">Close All</button>
                    <button onclick="refreshTabList()" style="
                        background: var(--color-surface);
                        color: var(--color-text-primary);
                        border: 1px solid var(--glass-border);
                        padding: 8px 12px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 12px;
                    ">Refresh</button>
                </div>
                
                <!-- Current tabs section -->
                <div style="flex: 1; overflow-y: auto;">
                    <h3 style="color: var(--color-text-primary); margin: 0 0 12px 0; font-size: 16px;">Current Tabs (${tabs.length})</h3>
                    <div id="currentTabsList" style="margin-bottom: 24px;">
                        ${generateTabsList(tabs, activeTab)}
                    </div>
                    
                    <!-- Saved sessions section -->
                    <h3 style="color: var(--color-text-primary); margin: 0 0 12px 0; font-size: 16px;">Saved Sessions</h3>
                    <div id="savedSessionsList">
                        ${generateSessionsList()}
                    </div>
                </div>
            </div>
        `;
        
        managerPanel = window.axiomAPI.createFloatingPanel(managerContent, {
            title: 'Tab Manager',
            width: '500px',
            height: '600px',
            top: '50px',
            left: '200px'
        });
        
        // Make functions globally available
        window.saveCurrentSession = saveCurrentSession;
        window.closeAllTabs = closeAllTabs;
        window.refreshTabList = refreshTabList;
        window.switchToTab = switchToTab;
        window.closeTab = closeTab;
        window.duplicateTab = duplicateTab;
        window.restoreSession = restoreSession;
        window.deleteSession = deleteSession;
    }
    
    function generateTabsList(tabs, activeTab) {
        return tabs.map(tab => `
            <div style="
                background: ${tab.active ? 'var(--color-primary-alpha, rgba(59, 130, 246, 0.1))' : 'var(--color-surface)'};
                border: 1px solid ${tab.active ? 'var(--color-primary)' : 'var(--glass-border)'};
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 8px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            ">
                <div style="flex: 1; min-width: 0;">
                    <div style="
                        color: var(--color-text-primary);
                        font-weight: ${tab.active ? '600' : '400'};
                        font-size: 14px;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        margin-bottom: 4px;
                    ">${tab.title || 'Untitled Tab'}</div>
                    <div style="
                        color: var(--color-text-secondary);
                        font-size: 12px;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    ">${tab.id}</div>
                </div>
                <div style="display: flex; gap: 8px; margin-left: 12px;">
                    ${!tab.active ? `<button onclick="switchToTab('${tab.id}')" style="
                        background: var(--color-primary);
                        color: white;
                        border: none;
                        padding: 6px 10px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 11px;
                    ">Switch</button>` : ''}
                    <button onclick="duplicateTab('${tab.id}')" style="
                        background: var(--color-surface);
                        color: var(--color-text-primary);
                        border: 1px solid var(--glass-border);
                        padding: 6px 10px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 11px;
                    ">Duplicate</button>
                    <button onclick="closeTab('${tab.id}')" style="
                        background: var(--color-danger, #ef4444);
                        color: white;
                        border: none;
                        padding: 6px 10px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 11px;
                    ">Close</button>
                </div>
            </div>
        `).join('');
    }
    
    function generateSessionsList() {
        const sessions = Object.keys(tabSessions);
        if (sessions.length === 0) {
            return '<div style="color: var(--color-text-secondary); font-style: italic; padding: 16px; text-align: center;">No saved sessions</div>';
        }
        
        return sessions.map(sessionName => {
            const session = tabSessions[sessionName];
            return `
                <div style="
                    background: var(--color-surface);
                    border: 1px solid var(--glass-border);
                    border-radius: 8px;
                    padding: 12px;
                    margin-bottom: 8px;
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <div>
                            <div style="color: var(--color-text-primary); font-weight: 600; font-size: 14px;">
                                ${sessionName}
                            </div>
                            <div style="color: var(--color-text-secondary); font-size: 12px;">
                                ${session.tabs.length} tabs • Saved ${new Date(session.timestamp).toLocaleDateString()}
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button onclick="restoreSession('${sessionName}')" style="
                                background: var(--color-primary);
                                color: white;
                                border: none;
                                padding: 6px 10px;
                                border-radius: 4px;
                                cursor: pointer;
                                font-size: 11px;
                            ">Restore</button>
                            <button onclick="deleteSession('${sessionName}')" style="
                                background: var(--color-danger, #ef4444);
                                color: white;
                                border: none;
                                padding: 6px 10px;
                                border-radius: 4px;
                                cursor: pointer;
                                font-size: 11px;
                            ">Delete</button>
                        </div>
                    </div>
                    <div style="color: var(--color-text-secondary); font-size: 11px;">
                        ${session.tabs.slice(0, 3).map(tab => tab.title || 'Untitled').join(' • ')}
                        ${session.tabs.length > 3 ? ` • +${session.tabs.length - 3} more` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    function saveCurrentSession() {
        const tabs = window.axiomAPI.getAllTabs();
        if (tabs.length === 0) {
            window.axiomAPI.notify('No tabs to save', 'warning');
            return;
        }
        
        const sessionName = prompt('Enter session name:', `Session ${new Date().toLocaleDateString()}`);
        if (!sessionName) return;
        
        tabSessions[sessionName] = {
            timestamp: Date.now(),
            tabs: tabs.map(tab => ({
                id: tab.id,
                title: tab.title,
                url: window.axiomAPI.getTabContent(tab.id)?.url || ''
            }))
        };
        
        window.axiomAPI.storage.set('tab_sessions', tabSessions);
        window.axiomAPI.notify(`Session "${sessionName}" saved with ${tabs.length} tabs`, 'success');
        
        if (managerPanel) {
            refreshTabList();
        }
    }
    
    function restoreSession(sessionName) {
        const session = tabSessions[sessionName];
        if (!session) return;
        
        session.tabs.forEach(tab => {
            if (tab.url) {
                window.axiomAPI.addTab(tab.title || 'Restored Tab', tab.url);
            }
        });
        
        window.axiomAPI.notify(`Restored ${session.tabs.length} tabs from "${sessionName}"`, 'success');
    }
    
    function deleteSession(sessionName) {
        if (confirm(`Delete session "${sessionName}"?`)) {
            delete tabSessions[sessionName];
            window.axiomAPI.storage.set('tab_sessions', tabSessions);
            window.axiomAPI.notify(`Session "${sessionName}" deleted`, 'info');
            refreshTabList();
        }
    }
    
    function switchToTab(tabId) {
        window.axiomAPI.switchToTab(tabId);
        window.axiomAPI.notify('Switched to tab', 'info', 1000);
    }
    
    function closeTab(tabId) {
        window.axiomAPI.closeTab(tabId);
        refreshTabList();
    }
    
    function duplicateTab(tabId) {
        window.axiomAPI.duplicateTab(tabId);
        setTimeout(refreshTabList, 500); // Give time for tab to be created
    }
    
    function duplicateActiveTab() {
        const activeTab = window.axiomAPI.getActiveTab();
        if (activeTab) {
            window.axiomAPI.duplicateTab(activeTab.id);
            window.axiomAPI.notify('Active tab duplicated', 'success');
        }
    }
    
    function closeAllTabs() {
        const tabs = window.axiomAPI.getAllTabs();
        if (confirm(`Close all ${tabs.length} tabs?`)) {
            tabs.forEach(tab => window.axiomAPI.closeTab(tab.id));
            window.axiomAPI.notify('All tabs closed', 'info');
            if (managerPanel) managerPanel.close();
        }
    }
    
    function refreshTabList() {
        if (!managerPanel) return;
        
        const tabs = window.axiomAPI.getAllTabs();
        const activeTab = window.axiomAPI.getActiveTab();
        
        const currentTabsList = document.getElementById('currentTabsList');
        const savedSessionsList = document.getElementById('savedSessionsList');
        
        if (currentTabsList) {
            currentTabsList.innerHTML = generateTabsList(tabs, activeTab);
        }
        
        if (savedSessionsList) {
            savedSessionsList.innerHTML = generateSessionsList();
        }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTabManager);
    } else {
        initTabManager();
    }
    
})();
