import { useState, useRef } from "react";
import { api } from '../../lib/api.js';

export default function Profile ({ user, token, onProfileUpdate}) {
    const [profileData, setProfileData] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
        profilePicture: user?.profilePicture || null
    });
    const [isEditing, setIsEditing] = useState(false);

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef(null);

    const getInitials = () => {
        const name = `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim();
        if (name) {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
        }
        return user?.username ? user.username[0].toUpperCase() : 'U';
    };

    const handlePictureSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
        setError('Choose an image that is less than 2mb');
        return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
        setProfileData((prev) => ({
            ...prev,
            profilePicture: event.target?.result
        }));
        setError('');
        };
        reader.onerror = () => {
        setError('Error reading the image file');
        };
        reader.readAsDataURL(file);
    };
    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsSaving(true);

        try {
        const updated = await api.updateUser(token, user.id, {
            firstName: profileData.firstName,
            lastName: profileData.lastName,
            email: profileData.email,
            profilePicture: profileData.profilePicture
        });

        setSuccess('Profile updated successfully.');
        setIsEditing(false);

        if (onProfileUpdate) {
            onProfileUpdate(updated.user);
        }
        } catch (err) {
        console.error('Failed to save profile:', err);
        setError(err.message || 'Failed to save profile.');
        } finally {
        setIsSaving(false);
        }
    };
    const handleCancel = () => {
        setProfileData({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
        profilePicture: user?.profilePicture || null
        });
        setIsEditing(false);
        setError('');
        setSuccess('');
    };

    const displayName = profileData.firstName || profileData.lastName
        ? `${profileData.firstName} ${profileData.lastName}`.trim()
        : user?.username || 'User';

    return (

        <section className="panel panel--profile">
        <div className="panel__header">
            <h3>Profile</h3>
            {!isEditing && (
            <button
                type="button"
                className="btn btn--primary"
                onClick={() => setIsEditing(true)}
            >
                Edit Profile
            </button>
            )}
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="profile__content">
            <div className="profile__picture-section">
            <div className="profile__picture">
                {profileData.profilePicture ? (
                <img
                    src={profileData.profilePicture}
                    alt={displayName}
                    className="profile__picture-img"
                />
                ) : (
                <span className="profile__picture-initials">{getInitials()}</span>
                )}
            </div>

            {isEditing && (
                <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={() => fileInputRef.current?.click()}
                >
                Change Picture
                </button>
            )}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handlePictureSelect}
            />
            </div>

            {isEditing ? (
            <form onSubmit={handleSaveProfile} className="profile__form">
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
                    onChange={(e) =>
                        setProfileData((prev) => ({
                        ...prev,
                        firstName: e.target.value
                        }))
                    }
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="user-lastname">Last Name</label>
                    <input
                    id="user-lastname"
                    type="text"
                    placeholder="Doe"
                    value={profileData.lastName}
                    onChange={(e) =>
                        setProfileData((prev) => ({
                        ...prev,
                        lastName: e.target.value
                        }))
                    }
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
                    onChange={(e) =>
                    setProfileData((prev) => ({
                        ...prev,
                        email: e.target.value
                    }))
                    }
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
                <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={handleCancel}
                    disabled={isSaving}
                >
                    Cancel
                </button>
                </div>
            </form>
            ) : (
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
                <p>
                    Created {new Date(user?.createdAt).toLocaleDateString()}
                </p>
                {user?.updatedAt && (
                    <p>
                    Last updated {new Date(user?.updatedAt).toLocaleDateString()}
                    </p>
                )}
                </div>
            </div>
            )}
        </div>
        </section>

    );    

}