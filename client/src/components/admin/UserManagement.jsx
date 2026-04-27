import { useState } from 'react';
import { adminService } from '../../services/adminService.js';
import { useApiResource } from '../../hooks/useApiResource.js';
import { getDisplayName } from '../../utils/stringUtils.js';
import { AdminPageHead, ErrorBanner, EmptyState } from './AdminStates.jsx';
import './AdminModules.css';

const EMPTY_FORM = {
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    email: '',
    role: 'user',
};

// This component provides an interface for administrators to manage user accounts.

function NewUserForm({ value, onChange, onSubmit }) {
    const setField = (field, fieldValue) => onChange({ ...value, [field]: fieldValue });

    return (
        <div className="glass-form-card">
            <form onSubmit={onSubmit} className="glass-form">
                <div className="glass-form-group">
                    <label htmlFor="username">Username *</label>
                    <input
                        id="username"
                        className="glass-input"
                        type="text"
                        placeholder="johndoe"
                        value={value.username}
                        onChange={(e) => setField('username', e.target.value)}
                        required
                    />
                </div>

                <div className="glass-form-group">
                    <label htmlFor="email">Email</label>
                    <input
                        id="email"
                        className="glass-input"
                        type="email"
                        placeholder="john@example.com"
                        value={value.email}
                        onChange={(e) => setField('email', e.target.value)}
                    />
                </div>

                <div className="glass-form-row">
                    <div className="glass-form-group">
                        <label htmlFor="firstName">First Name</label>
                        <input
                            id="firstName"
                            className="glass-input"
                            type="text"
                            placeholder="John"
                            value={value.firstName}
                            onChange={(e) => setField('firstName', e.target.value)}
                        />
                    </div>

                    <div className="glass-form-group">
                        <label htmlFor="lastName">Last Name</label>
                        <input
                            id="lastName"
                            className="glass-input"
                            type="text"
                            placeholder="Doe"
                            value={value.lastName}
                            onChange={(e) => setField('lastName', e.target.value)}
                        />
                    </div>
                </div>

                <div className="glass-form-group">
                    <label htmlFor="password">Password *</label>
                    <input
                        id="password"
                        className="glass-input"
                        type="password"
                        placeholder="••••••••"
                        value={value.password}
                        onChange={(e) => setField('password', e.target.value)}
                        required
                    />
                </div>

                <div className="glass-form-group">
                    <label htmlFor="role">Role</label>
                    <select
                        id="role"
                        className="glass-input"
                        value={value.role}
                        onChange={(e) => setField('role', e.target.value)}
                    >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>

                <div className="glass-form-actions">
                    <button type="submit" className="btn btn--primary">Create User</button>
                </div>
            </form>
        </div>
    );
}

function UserListItem({ user, onDelete }) {
    const roleClass = user.role === 'admin' ? 'glass-badge glass-badge--admin' : 'glass-badge';
    const deleteButtonStyle = { padding: '0.4rem 0.8rem', fontSize: '0.85rem' };

    return (
        <div className="glass-list-item">
            <div className="glass-list-item__avatar">{user.username.charAt(0).toUpperCase()}</div>
            <div className="glass-list-item__info">
                <strong>{getDisplayName(user)}</strong>
                <div className="glass-list-item__meta">
                    <span>@{user.username}</span>
                    {user.email && <span>• {user.email}</span>}
                </div>
            </div>
            <div className="glass-list-item__actions">
                <span className={roleClass}>{user.role}</span>
                <button
                    type="button"
                    className="btn btn--glass btn--danger"
                    style={deleteButtonStyle}
                    onClick={() => onDelete(user.id)}
                >
                    Delete
                </button>
            </div>
        </div>
    );
}

export default function UserManagement({ token }) {
    const { data, error: loadError, refetch } = useApiResource(token, adminService.listUsers);
    const users = data?.users || [];

    const [newUser, setNewUser] = useState(EMPTY_FORM);
    const [showForm, setShowForm] = useState(false);
    const [mutationError, setMutationError] = useState('');

    const handleCreateUser = async (event) => {
        event.preventDefault();
        if (!newUser.username || !newUser.password) return;

        setMutationError('');
        try {
            await adminService.createUser(token, newUser);
            setNewUser(EMPTY_FORM);
            setShowForm(false);
            refetch();
        } catch (err) {
            setMutationError(err.message || 'Failed to create user.');
        }
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm('Delete this user?')) return;

        setMutationError('');
        try {
            await adminService.deleteUser(token, id);
            refetch();
        } catch (err) {
            setMutationError(err.message || 'Failed to delete user.');
        }
    };

    const toggleButtonClass = showForm ? 'btn btn--glass' : 'btn btn--primary';

    return (
        <div className="col-fill">
            <AdminPageHead
                crumb={['Admin', 'People']}
                title="User Management"
                desc="Create new accounts and manage permissions."
                actions={
                    <button type="button" className={toggleButtonClass} onClick={() => setShowForm(!showForm)}>
                        {showForm ? 'Cancel' : 'Create User'}
                    </button>
                }
            />

            <ErrorBanner>{loadError || mutationError}</ErrorBanner>

            {showForm && (
                <NewUserForm value={newUser} onChange={setNewUser} onSubmit={handleCreateUser} />
            )}

            <div className="glass-list-container">
                {users.length === 0 ? (
                    <EmptyState icon="👥">No users found in the system.</EmptyState>
                ) : (
                    users.map((user) => (
                        <UserListItem key={user.id} user={user} onDelete={handleDeleteUser} />
                    ))
                )}
            </div>
        </div>
    );
}
