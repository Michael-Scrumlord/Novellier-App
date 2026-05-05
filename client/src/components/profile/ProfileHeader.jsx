import { getInitials } from '../../utils/stringUtils.js';

function PictureDisplay({ profilePicture, displayName }) {
    if (profilePicture) {
        return <img src={profilePicture} alt={displayName} className="profile__picture-img" />;
    }
    return <span className="profile__picture-initials">{getInitials(displayName)}</span>;
}

export default function ProfileHeader({
    profilePicture,
    displayName,
    username,
    isEditing,
    onStartEdit,
    onChangePictureClick,
}) {
    return (
        <div className="panel__header panel__header--spatial">
            <div className="profile__picture-group">
                <div className="profile__picture">
                    <PictureDisplay profilePicture={profilePicture} displayName={displayName} />
                </div>
                <div className="profile__title-group">
                    <h3>{displayName}</h3>
                    <p className="profile__subtitle">@{username}</p>
                </div>
            </div>

            <div className="profile__header-actions">
                {isEditing ? (
                    <button type="button" className="btn btn--glass btn--small" onClick={onChangePictureClick}>
                        Change Picture
                    </button>
                ) : (
                    <button type="button" className="btn btn--primary" onClick={onStartEdit}>
                        Edit Profile
                    </button>
                )}
            </div>
        </div>
    );
}
