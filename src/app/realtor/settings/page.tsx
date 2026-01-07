'use client';

import { useState, useEffect, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface UserSettings {
  user: {
    id: string;
    email: string;
    name: string;
    phone: string | null;
    role: string;
    timezone: string;
    avatarUrl: string | null;
    createdAt: string;
  };
  stats: {
    clientsCount: number;
    toursCount: number;
    invitesPendingCount: number;
  };
}

export default function RealtorSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

  // Profile form
  const [profileData, setProfileData] = useState({
    name: '',
    phone: '',
    timezone: '',
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password form
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data.data);
        setProfileData({
          name: data.data.user.name,
          phone: data.data.user.phone || '',
          timezone: data.data.user.timezone,
        });
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileMessage(null);

    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileData.name,
          phone: profileData.phone || null,
          timezone: profileData.timezone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to update profile');
      }

      setProfileMessage({ type: 'success', text: 'Profile updated successfully' });
      fetchSettings();
    } catch (err) {
      setProfileMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update profile',
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingPassword(true);
    setPasswordMessage(null);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match' });
      setIsUpdatingPassword(false);
      return;
    }

    try {
      const response = await fetch('/api/settings/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to change password');
      }

      setPasswordMessage({ type: 'success', text: 'Password changed successfully' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to change password',
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="text-center py-12 text-gray-500">Loading settings...</div>
      </div>
    );
  }

  const timezones = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Phoenix',
    'America/Anchorage',
    'Pacific/Honolulu',
    'America/Sao_Paulo',
    'Europe/London',
    'Europe/Paris',
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account and preferences</p>
      </div>

      {/* Stats Cards */}
      {settings?.stats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="text-center">
            <p className="text-3xl font-bold" style={{ color: '#006AFF' }}>{settings.stats.clientsCount}</p>
            <p className="text-sm text-gray-600">Clients</p>
          </Card>
          <Card className="text-center">
            <p className="text-3xl font-bold text-green-600">{settings.stats.toursCount}</p>
            <p className="text-sm text-gray-600">Tours</p>
          </Card>
          <Card className="text-center">
            <p className="text-3xl font-bold text-yellow-600">{settings.stats.invitesPendingCount}</p>
            <p className="text-sm text-gray-600">Pending Invites</p>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('profile')}
          className="px-4 py-2 font-medium text-sm border-b-2 -mb-px"
          style={
            activeTab === 'profile'
              ? { borderColor: '#006AFF', color: '#006AFF' }
              : { borderColor: 'transparent', color: '#6B7280' }
          }
        >
          Profile
        </button>
        <button
          onClick={() => setActiveTab('password')}
          className="px-4 py-2 font-medium text-sm border-b-2 -mb-px"
          style={
            activeTab === 'password'
              ? { borderColor: '#006AFF', color: '#006AFF' }
              : { borderColor: 'transparent', color: '#6B7280' }
          }
        >
          Password
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h2>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            {profileMessage && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  profileMessage.type === 'success'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {profileMessage.text}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={settings?.user.email || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            <Input
              label="Name"
              value={profileData.name}
              onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
              required
            />

            <Input
              label="Phone"
              type="tel"
              value={profileData.phone}
              onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
              placeholder="(555) 123-4567"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
              <select
                value={profileData.timezone}
                onChange={(e) => setProfileData({ ...profileData, timezone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': '#006AFF' } as React.CSSProperties}
              >
                {timezones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-4">
              <Button type="submit" disabled={isUpdatingProfile}>
                {isUpdatingProfile ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            {passwordMessage && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  passwordMessage.type === 'success'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {passwordMessage.text}
              </div>
            )}

            <Input
              label="Current Password"
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) =>
                setPasswordData({ ...passwordData, currentPassword: e.target.value })
              }
              required
            />

            <Input
              label="New Password"
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              required
            />
            <p className="text-xs text-gray-500 -mt-2">Must be at least 8 characters</p>

            <Input
              label="Confirm New Password"
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) =>
                setPasswordData({ ...passwordData, confirmPassword: e.target.value })
              }
              required
            />

            <div className="pt-4">
              <Button type="submit" disabled={isUpdatingPassword}>
                {isUpdatingPassword ? 'Changing...' : 'Change Password'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Account Info */}
      <Card className="mt-6">
        <h3 className="font-semibold text-gray-900 mb-2">Account Information</h3>
        <p className="text-sm text-gray-600">
          Member since{' '}
          {settings?.user.createdAt &&
            new Date(settings.user.createdAt).toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}
        </p>
      </Card>
    </div>
  );
}
