import './WorkspaceLayout.css';

export default function WorkspaceLayout({
    leftPanel,
    centerPanel,
    rightPanel,
    isLeftCollapsed,
    isRightCollapsed,
    className = '',
}) {
    const classNames = ['workspace-layout'];
    if (isLeftCollapsed) classNames.push('workspace--left-collapsed');
    if (isRightCollapsed) classNames.push('workspace--right-collapsed');
    if (className) classNames.push(className);

    return (
        <main className={classNames.join(' ')}>
            <div className="workspace__left-pane">{leftPanel}</div>
            <div className="workspace__center-pane">{centerPanel}</div>
            <div className="workspace__right-pane">{rightPanel}</div>
        </main>
    );
}
