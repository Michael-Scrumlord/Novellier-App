function formatDate(value) {
    if (!value) return null;
    return new Date(value).toLocaleDateString();
}

export default function ProfileViewFields({ user, displayName }) {
    const createdLabel = formatDate(user?.createdAt);
    const updatedLabel = formatDate(user?.updatedAt);

    return (
        <div className="profile__view">
            <div className="profile__field">
                <label>Username</label>
                <p>@{user?.username}</p>
            </div>

            <div className="profile__field">
                <label>Full Name</label>
                <p>{displayName}</p>
            </div>

            <div className="profile__field">
                <label>Email</label>
                <p>{user?.email || 'Not provided'}</p>
            </div>

            <div className="profile__field">
                <label>UUID</label>
                <p className="profile__uuid">{user?.uuid}</p>
            </div>

            <div className="profile__field">
                <label>Role</label>
                <span className={`user-list__role user-list__role--${user?.role}`}>
                    {user?.role}
                </span>
            </div>

            <div className="profile__field profile__field--meta">
                {createdLabel && <p>Created {createdLabel}</p>}
                {updatedLabel && <p>Last updated {updatedLabel}</p>}
            </div>
        </div>
    );
}
