import { useState } from "react";

export default function Profile ({ user, token, onProfileUpdate}) {
    const [profileData, setProfileData] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
        profilePicture: user?.profilePicture || null
    });

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

    

}