export function getInitials(name) {
    const trimmed = String(name || '').trim();
    if (!trimmed) return 'U';
    return trimmed
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

export function getDisplayName(user, fallback = 'User') {
    if (!user) return fallback;
    if (user.firstName || user.lastName) {
        return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return user.username || fallback;
}

export function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}