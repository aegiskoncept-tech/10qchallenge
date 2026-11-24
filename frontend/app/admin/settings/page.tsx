'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Server,
  Database,
  ShieldAlert,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Activity,
  HardDrive,
  Cpu,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/admin/ui/LoadingSpinner';
import { apiClient } from '@/lib/apiClient';

interface PlatformSettings {
  platformName: string;
  supportEmail: string;
  supportPhone: string;
  siteUrl: string;
  paymentGatewayMode: 'SANDBOX' | 'PRODUCTION';
  maintenanceMode: boolean;
  classroomAccessPolicy: 'STRICT_SETTLEMENT' | 'ALLOW_PENDING';
  defaultTestDurationMinutes: number;
  maxLoginAttempts: number;
  sessionTimeoutHours: number;
  updatedAt: string;
  updatedBy: string;
}

interface ServerDiagnostics {
  nodeVersion: string;
  platform: string;
  uptimeSeconds: number;
  memoryRssMb: number;
  memoryHeapUsedMb: number;
  nodeEnv: string;
  port: string;
  databases: {
    sqliteAuth: string;
    postgresCommerce: string;
  };
}

export default function PlatformSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [diagnostics, setDiagnostics] = useState<ServerDiagnostics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchSettingsAndDiagnostics = async () => {
    setIsLoading(true);
    setSaveError(null);
    try {
      const res = await apiClient('/api/admin/settings');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setSettings(json.data.settings);
          setDiagnostics(json.data.diagnostics);
        }
      } else {
        setSaveError('Failed to load platform settings from server.');
      }
    } catch (err: any) {
      setSaveError(err.message || 'Network error fetching platform settings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsAndDiagnostics();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await apiClient('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSettings(json.data);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        setSaveError(json.error || 'Failed to update platform settings.');
      }
    } catch (err: any) {
      setSaveError(err.message || 'Network error updating platform settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
    return `${mins}m ${secs}s`;
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-white">
            <Settings className="h-7 w-7 text-indigo-400" />
            Platform Settings & Server Diagnostics
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Configure global LMS parameters, security policies, and monitor live Hostinger runtime health.
          </p>
        </div>
        <button
          onClick={fetchSettingsAndDiagnostics}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Diagnostics
        </button>
      </div>

      {saveSuccess && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-400">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">Platform settings successfully updated and persisted!</p>
        </div>
      )}

      {saveError && (
        <div className="flex items-center gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-rose-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{saveError}</p>
        </div>
      )}

      {/* Diagnostics Cards Grid */}
      {diagnostics && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Node Runtime</span>
              <Cpu className="h-5 w-5 text-indigo-400" />
            </div>
            <div className="mt-3 text-2xl font-bold text-white">{diagnostics.nodeVersion}</div>
            <div className="mt-1 text-xs text-slate-400">
              OS: {diagnostics.platform} | Env: {diagnostics.nodeEnv}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Process Uptime</span>
              <Clock className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="mt-3 text-2xl font-bold text-emerald-400">{formatUptime(diagnostics.uptimeSeconds)}</div>
            <div className="mt-1 text-xs text-slate-400">Listening on Port: {diagnostics.port}</div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Memory Usage</span>
              <Activity className="h-5 w-5 text-amber-400" />
            </div>
            <div className="mt-3 text-2xl font-bold text-white">{diagnostics.memoryHeapUsedMb} MB</div>
            <div className="mt-1 text-xs text-slate-400">RSS Allocated: {diagnostics.memoryRssMb} MB</div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Database Engines</span>
              <Database className="h-5 w-5 text-cyan-400" />
            </div>
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">SQLite Auth:</span>
                <span
                  className={`font-semibold ${
                    diagnostics.databases.sqliteAuth === 'CONNECTED' ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {diagnostics.databases.sqliteAuth}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">PostgreSQL Commerce:</span>
                <span
                  className={`font-semibold ${
                    diagnostics.databases.postgresCommerce === 'CONNECTED' ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {diagnostics.databases.postgresCommerce}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Form */}
      {settings && (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Server className="h-5 w-5 text-indigo-400" />
              General Platform Identity & Branding
            </h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">Platform Name</label>
                <input
                  type="text"
                  value={settings.platformName}
                  onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                  className="mt-2 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">Canonical Site URL</label>
                <input
                  type="url"
                  value={settings.siteUrl}
                  onChange={(e) => setSettings({ ...settings, siteUrl: e.target.value })}
                  className="mt-2 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">Support Email</label>
                <input
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                  className="mt-2 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">Support Phone / WhatsApp</label>
                <input
                  type="text"
                  value={settings.supportPhone}
                  onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                  className="mt-2 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <ShieldAlert className="h-5 w-5 text-amber-400" />
              Security & Commerce Policies
            </h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">Payment Gateway Mode</label>
                <select
                  value={settings.paymentGatewayMode}
                  onChange={(e) =>
                    setSettings({ ...settings, paymentGatewayMode: e.target.value as 'SANDBOX' | 'PRODUCTION' })
                  }
                  className="mt-2 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="SANDBOX">SANDBOX (Test Mode - PayU Test Bed)</option>
                  <option value="PRODUCTION">PRODUCTION (Live Mode - Active Merchant Keys)</option>
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  {settings.paymentGatewayMode === 'SANDBOX'
                    ? 'Safe for testing. Uses sandbox endpoints and dummy payment cards.'
                    : 'Real cardholder debits enabled. Real money will be processed.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">
                  Classroom Access Policy
                </label>
                <select
                  value={settings.classroomAccessPolicy}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      classroomAccessPolicy: e.target.value as 'STRICT_SETTLEMENT' | 'ALLOW_PENDING',
                    })
                  }
                  className="mt-2 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="STRICT_SETTLEMENT">STRICT_SETTLEMENT (Production: Settled Payment Only)</option>
                  <option value="ALLOW_PENDING">ALLOW_PENDING (Bypass Settlement: Allow Initiated Orders)</option>
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Enforces strict ledger verification before granting student access to curriculum and videos.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">
                  Default Test Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="600"
                  value={settings.defaultTestDurationMinutes}
                  onChange={(e) =>
                    setSettings({ ...settings, defaultTestDurationMinutes: parseInt(e.target.value) || 180 })
                  }
                  className="mt-2 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">
                  Max Login Attempts (Rate Limit)
                </label>
                <input
                  type="number"
                  min="3"
                  max="20"
                  value={settings.maxLoginAttempts}
                  onChange={(e) => setSettings({ ...settings, maxLoginAttempts: parseInt(e.target.value) || 5 })}
                  className="mt-2 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">
                  Session Expiration (Hours)
                </label>
                <input
                  type="number"
                  min="1"
                  max="720"
                  value={settings.sessionTimeoutHours}
                  onChange={(e) => setSettings({ ...settings, sessionTimeoutHours: parseInt(e.target.value) || 72 })}
                  className="mt-2 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">Platform State</label>
                <div className="mt-3 flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="maintenanceMode"
                    checked={settings.maintenanceMode}
                    onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="maintenanceMode" className="text-sm font-medium text-slate-200">
                    Enable Maintenance Mode (Restricts public student access)
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur">
            <span className="text-xs text-slate-400">
              Last modified: {new Date(settings.updatedAt).toLocaleString()} by {settings.updatedBy}
            </span>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500 disabled:opacity-50"
            >
              {isSaving ? <LoadingSpinner size="sm" /> : <Save className="h-4 w-4" />}
              Save Platform Settings
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
