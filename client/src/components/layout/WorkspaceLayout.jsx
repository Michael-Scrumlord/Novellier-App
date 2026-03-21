import './WorkspaceLayout.css'; 

export default function WorkspaceLayout({ 
    leftPanel, 
    centerPanel, 
    rightPanel, 
    isLeftCollapsed, 
    isRightCollapsed 
}) {
    return (
        <main 
        className={`workspace-layout 
            ${isLeftCollapsed ? 'workspace--left-collapsed' : ''} 
            ${isRightCollapsed ? 'workspace--right-collapsed' : ''}`
        }
        >
        <div className="workspace__left-pane">
            {leftPanel}
        </div>
        
        <div className="workspace__center-pane">
            {centerPanel}
        </div>
        
        <div className="workspace__right-pane">
            {rightPanel}
        </div>
        </main>
    );
}