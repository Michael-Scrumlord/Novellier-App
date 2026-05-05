import { useRef, useState } from 'react';
import { authService } from '../../services/authService.js';
import { getDisplayName } from '../../utils/stringUtils.js';
import ProfileHeader from './ProfileHeader.jsx';
import ProfileViewFields from './ProfileViewFields.jsx';
import ProfileEditForm from './ProfileEditForm.jsx';
import './Profile.css';

const MAX_PICTURE_BYTES = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

function profileDataFromUser(user) {
    return {
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
        profilePicture: user?.profilePicture || null,
    };
}

export default function Profile({ user, token, onProfileUpdate }) {
    const [profileData, setProfileData] = useState(() => profileDataFromUser(user));
    const [isEditing, setIsEditing] = useState(false);
    const [pictureError, setPictureError] = useState('');
    const [saveError, setSaveError] = useState('');
    const [success, setSuccess] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef(null);

    const displayName = getDisplayName(
        { firstName: profileData.firstName, lastName: profileData.lastName, username: user?.username },
        'User'
    );

    const updateField = (field, value) => {
        setProfileData((prev) => ({ ...prev, [field]: value }));
    };

    const handlePictureSelect = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
            setPictureError('Only JPEG, PNG, GIF, and WebP images are allowed.');
            return;
        }
        if (file.size > MAX_PICTURE_BYTES) {
            setPictureError('Choose an image that is less than 4mb');
            return;
        }

        const reader = new FileReader();
        reader.onload = (loadEvent) => {
            updateField('profilePicture', loadEvent.target?.result);
            setPictureError('');
        };
        reader.onerror = () => {
            setPictureError('Error reading the image file');
        };
        reader.readAsDataURL(file);
    };

    const handleSaveProfile = async (event) => {
        event.preventDefault();
        setIsSaving(true);
        setSaveError('');
        setSuccess('');

        try {
            const result = await authService.updateSelf(token, user.id, {
                firstName: profileData.firstName,
                lastName: profileData.lastName,
                email: profileData.email,
                profilePicture: profileData.profilePicture,
            });
            setSuccess('Profile updated successfully.');
            setIsEditing(false);
            onProfileUpdate?.(result.user);
        } catch (err) {
            setSaveError(err.message || 'Failed to save profile.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setProfileData(profileDataFromUser(user));
        setIsEditing(false);
        setSaveError('');
        setSuccess('');
        setPictureError('');
    };

    const errorMessage = pictureError || saveError;

    return (
        <section className="panel panel--profile">
            <ProfileHeader
                profilePicture={profileData.profilePicture}
                displayName={displayName}
                username={user?.username}
                isEditing={isEditing}
                onStartEdit={() => setIsEditing(true)}
                onChangePictureClick={() => fileInputRef.current?.click()}
            />

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handlePictureSelect}
            />

            {errorMessage && <div className="error-message">{errorMessage}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="profile__content">
                {isEditing ? (
                    <ProfileEditForm
                        user={user}
                        profileData={profileData}
                        onChangeField={updateField}
                        onSubmit={handleSaveProfile}
                        onCancel={handleCancel}
                        isSaving={isSaving}
                    />
                ) : (
                    <ProfileViewFields user={user} displayName={displayName} />
                )}
            </div>
        </section>
    );
}
