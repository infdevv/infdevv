// Quick Notes Plugin for Axiom Browser
// Adds a floating notepad with persistent storage and keyboard shortcuts

(function() {
    'use strict';
    
    let notesPanel = null;
    let notes = '';
    
    // Initialize the plugin
    function initQuickNotes() {
        // Load saved notes
        notes = window.axiomAPI.storage.get('quick_notes') || '';
        
        // Add sidebar icon
        window.axiomAPI.addSidebarIcon(
            'sticky_note_2',
            'javascript:void(0)',
            false,
            'Quick Notes - Press Ctrl+Shift+N'
        );
        
        // Add keyboard shortcut
        window.axiomAPI.addKeyboardShortcut('ctrl+shift+n', toggleNotes, 'Toggle Quick Notes');
        
        // Add context menu option
        window.axiomAPI.addContextMenuItem('Open Quick Notes', toggleNotes);
        
        console.log('Quick Notes plugin loaded');
        window.axiomAPI.notify('Quick Notes plugin loaded! Press Ctrl+Shift+N', 'success');
    }
    
    function toggleNotes() {
        if (notesPanel) {
            notesPanel.close();
            notesPanel = null;
        } else {
            openNotes();
        }
    }
    
    function openNotes() {
        const notesContent = `
            <div style="display: flex; flex-direction: column; height: 100%;">
                <div style="margin-bottom: 12px;">
                    <button onclick="saveNotes()" style="
                        background: var(--color-primary);
                        color: white;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 6px;
                        cursor: pointer;
                        margin-right: 8px;
                    ">Save</button>
                    <button onclick="clearNotes()" style="
                        background: var(--color-danger, #ef4444);
                        color: white;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 6px;
                        cursor: pointer;
                        margin-right: 8px;
                    ">Clear</button>
                    <button onclick="exportNotes()" style="
                        background: var(--color-surface);
                        color: var(--color-text-primary);
                        border: 1px solid var(--glass-border);
                        padding: 8px 16px;
                        border-radius: 6px;
                        cursor: pointer;
                    ">Export</button>
                </div>
                <textarea id="quickNotesTextarea" placeholder="Start typing your notes..." style="
                    flex: 1;
                    background: var(--color-surface);
                    color: var(--color-text-primary);
                    border: 1px solid var(--glass-border);
                    border-radius: 6px;
                    padding: 12px;
                    font-family: 'SF Mono', Consolas, monospace;
                    font-size: 14px;
                    line-height: 1.5;
                    resize: none;
                    outline: none;
                ">${notes}</textarea>
                <div style="margin-top: 8px; font-size: 12px; color: var(--color-text-secondary);">
                    Auto-saves every 5 seconds • Ctrl+S to save manually
                </div>
            </div>
        `;
        
        notesPanel = window.axiomAPI.createFloatingPanel(notesContent, {
            title: 'Quick Notes',
            width: '400px',
            height: '500px',
            top: '100px',
            left: '100px'
        });
        
        // Add event listeners after panel is created
        setTimeout(() => {
            const textarea = document.getElementById('quickNotesTextarea');
            if (textarea) {
                // Auto-save every 5 seconds
                let autoSaveInterval = setInterval(() => {
                    if (document.getElementById('quickNotesTextarea')) {
                        saveNotes();
                    } else {
                        clearInterval(autoSaveInterval);
                    }
                }, 5000);
                
                // Manual save shortcut
                textarea.addEventListener('keydown', (e) => {
                    if (e.ctrlKey && e.key === 's') {
                        e.preventDefault();
                        saveNotes();
                    }
                });
            }
        }, 100);
        
        // Make functions globally available for button clicks
        window.saveNotes = saveNotes;
        window.clearNotes = clearNotes;
        window.exportNotes = exportNotes;
    }
    
    function saveNotes() {
        const textarea = document.getElementById('quickNotesTextarea');
        if (textarea) {
            notes = textarea.value;
            window.axiomAPI.storage.set('quick_notes', notes);
            window.axiomAPI.notify('Notes saved!', 'success', 1500);
        }
    }
    
    function clearNotes() {
        if (confirm('Are you sure you want to clear all notes?')) {
            const textarea = document.getElementById('quickNotesTextarea');
            if (textarea) {
                textarea.value = '';
                notes = '';
                window.axiomAPI.storage.set('quick_notes', '');
                window.axiomAPI.notify('Notes cleared', 'info', 1500);
            }
        }
    }
    
    function exportNotes() {
        const textarea = document.getElementById('quickNotesTextarea');
        if (textarea && textarea.value.trim()) {
            const blob = new Blob([textarea.value], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `quick-notes-${new Date().toISOString().split('T')[0]}.txt`;
            a.click();
            URL.revokeObjectURL(url);
            window.axiomAPI.notify('Notes exported!', 'success', 1500);
        } else {
            window.axiomAPI.notify('No notes to export', 'warning', 1500);
        }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initQuickNotes);
    } else {
        initQuickNotes();
    }
    
})();
