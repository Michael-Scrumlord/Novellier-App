export default function ProfileEditForm({
    user,
    profileData,
    onChangeField,
    onSubmit,
    onCancel,
    isSaving,
}) {
    return (
        <form onSubmit={onSubmit} className="profile__form">
            <div className="form-group">
                <label htmlFor="user-username">Username</label>
                <input
                    id="user-username"
                    type="text"
                    value={user?.username || ''}
                    disabled
                    className="input--disabled"
                />
                <p className="form__help">Username cannot be changed.</p>
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="user-firstname">First Name</label>
                    <input
                        id="user-firstname"
                        type="text"
                        placeholder="John"
                        value={profileData.firstName}
                        onChange={(event) => onChangeField('firstName', event.target.value)}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="user-lastname">Last Name</label>
                    <input
                        id="user-lastname"
                        type="text"
                        placeholder="Doe"
                        value={profileData.lastName}
                        onChange={(event) => onChangeField('lastName', event.target.value)}
                    />
                </div>
            </div>

            <div className="form-group">
                <label htmlFor="user-email">Email</label>
                <input
                    id="user-email"
                    type="email"
                    placeholder="john@example.com"
                    value={profileData.email}
                    onChange={(event) => onChangeField('email', event.target.value)}
                />
            </div>

            <div className="form-group">
                <label htmlFor="user-uuid">UUID</label>
                <input
                    id="user-uuid"
                    type="text"
                    value={user?.uuid || ''}
                    disabled
                    className="input--disabled"
                />
                <p className="form__help">Your unique identifier.</p>
            </div>

            <div className="profile__actions">
                <button type="submit" className="btn btn--primary" disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" className="btn btn--glass" onClick={onCancel} disabled={isSaving}>
                    Cancel
                </button>
            </div>
        </form>
    );
}
