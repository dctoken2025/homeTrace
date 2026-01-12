'use client';

import { useState, useEffect, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import PageHeader, { SettingsIcon } from '@/components/ui/PageHeader';

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
  privacySettings: {
    shareReportWithRealtor: boolean;
    shareDreamHouseProfile: boolean;
    shareRecordings: boolean;
  } | null;
  stats: {
    housesCount: number;
    visitsCount: number;
    realtorsCount: number;
  };
}

export default function BuyerSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'privacy' | 'password'>('profile');

  // Profile form
  const [profileData, setProfileData] = useState({
    name: '',
    phone: '',
    timezone: '',
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Privacy form
  const [privacyData, setPrivacyData] = useState({
    shareReportWithRealtor: false,
    shareDreamHouseProfile: false,
    shareRecordings: false,
  });
  const [isUpdatingPrivacy, setIsUpdatingPrivacy] = useState(false);
  const [privacyMessage, setPrivacyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
        if (data.data.privacySettings) {
          setPrivacyData({
            shareReportWithRealtor: data.data.privacySettings.shareReportWithRealtor,
            shareDreamHouseProfile: data.data.privacySettings.shareDreamHouseProfile,
            shareRecordings: data.data.privacySettings.shareRecordings,
          });
        }
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

  const handleUpdatePrivacy = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingPrivacy(true);
    setPrivacyMessage(null);

    try {
      const response = await fetch('/api/settings/privacy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(privacyData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to update privacy settings');
      }

      setPrivacyMessage({ type: 'success', text: 'Privacy settings updated' });
    } catch (err) {
      setPrivacyMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update privacy settings',
      });
    } finally {
      setIsUpdatingPrivacy(false);
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
      <div className="space-y-6">
        <PageHeader
          title="Settings"
          subtitle="Manage your account and privacy preferences"
          icon={<SettingsIcon />}
        />
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
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Manage your account and privacy preferences"
        icon={<SettingsIcon />}
        stats={settings?.stats ? [
          { label: 'Houses', value: settings.stats.housesCount },
          { label: 'Visits', value: settings.stats.visitsCount },
          { label: 'Realtors', value: settings.stats.realtorsCount },
        ] : undefined}
      />

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
          onClick={() => setActiveTab('privacy')}
          className="px-4 py-2 font-medium text-sm border-b-2 -mb-px"
          style={
            activeTab === 'privacy'
              ? { borderColor: '#006AFF', color: '#006AFF' }
              : { borderColor: 'transparent', color: '#6B7280' }
          }
        >
          Privacy
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

      {/* Privacy Tab */}
      {activeTab === 'privacy' && (
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Privacy Settings</h2>
          <p className="text-gray-600 text-sm mb-6">
            Control what information is shared with your connected realtors.
          </p>
          <form onSubmit={handleUpdatePrivacy} className="space-y-4">
            {privacyMessage && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  privacyMessage.type === 'success'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {privacyMessage.text}
              </div>
            )}

            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={privacyData.shareReportWithRealtor}
                  onChange={(e) =>
                    setPrivacyData({ ...privacyData, shareReportWithRealtor: e.target.checked })
                  }
                  className="w-4 h-4 rounded"
                  style={{ accentColor: '#006AFF' }}
                />
                <div>
                  <p className="font-medium text-gray-900">Share AI Reports</p>
                  <p className="text-sm text-gray-500">
                    Allow your realtor to view your AI-generated house reports
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={privacyData.shareDreamHouseProfile}
                  onChange={(e) =>
                    setPrivacyData({ ...privacyData, shareDreamHouseProfile: e.target.checked })
                  }
                  className="w-4 h-4 rounded"
                  style={{ accentColor: '#006AFF' }}
                />
                <div>
                  <p className="font-medium text-gray-900">Share Dream House Profile</p>
                  <p className="text-sm text-gray-500">
                    Allow your realtor to see your ideal home preferences
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={privacyData.shareRecordings}
                  onChange={(e) =>
                    setPrivacyData({ ...privacyData, shareRecordings: e.target.checked })
                  }
                  className="w-4 h-4 rounded"
                  style={{ accentColor: '#006AFF' }}
                />
                <div>
                  <p className="font-medium text-gray-900">Share Recordings</p>
                  <p className="text-sm text-gray-500">
                    Allow your realtor to listen to your visit recordings
                  </p>
                </div>
              </label>
            </div>

            <div className="pt-4">
              <Button type="submit" disabled={isUpdatingPrivacy}>
                {isUpdatingPrivacy ? 'Saving...' : 'Save Privacy Settings'}
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
