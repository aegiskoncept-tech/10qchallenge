'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Plus,
  Search,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Send,
  Users,
  Megaphone,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/admin/ui/LoadingSpinner';
import { apiClient } from '@/lib/apiClient';

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  targetAudience: 'ALL' | 'BITSAT' | 'JEE' | 'COMEDK' | 'ENROLLED';
  type: 'ANNOUNCEMENT' | 'EXAM_ALERT' | 'SYSTEM' | 'OFFER';
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  actionUrl?: string;
  isActive: boolean;
  createdAt: string;
  sentBy: string;
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    targetAudience: 'ALL' as 'ALL' | 'BITSAT' | 'JEE' | 'COMEDK' | 'ENROLLED',
    type: 'ANNOUNCEMENT' as 'ANNOUNCEMENT' | 'EXAM_ALERT' | 'SYSTEM' | 'OFFER',
    priority: 'NORMAL' as 'NORMAL' | 'HIGH' | 'URGENT',
    actionUrl: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchNotifs = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient('/api/admin/notifications');
      if (res.ok) {
        const j = await res.json();
        if (j.success && Array.isArray(j.data)) setNotifications(j.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.title.trim()) {
      setFormError('Notification title is required.');
      return;
    }
    if (!formData.message.trim()) {
      setFormError('Message body is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiClient('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to dispatch broadcast.');

      setIsModalOpen(false);
      setFormData({
        title: '',
        message: '',
        targetAudience: 'ALL',
        type: 'ANNOUNCEMENT',
        priority: 'NORMAL',
        actionUrl: '',
      });
      await fetchNotifs();
    } catch (err: any) {
      setFormError(err.message || 'Error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to retract/delete this notification?')) return;
    try {
      await apiClient(`/api/admin/notifications/${id}`, { method: 'DELETE' });
      await fetchNotifs();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredNotifs = notifications.filter((n) => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      return n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-7 w-7 text-indigo-600" />
            Notification & Broadcast Master
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Dispatch urgent exam alerts, live batch announcements, and system notifications to student dashboards.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchNotifs}
            disabled={isLoading}
            className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Refresh Notifications"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Send className="h-4 w-4" />
            Dispatch Broadcast
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Broadcasts</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{notifications.length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Active Broadcasts</p>
          <p className="text-2xl font-bold text-emerald-700 mt-2">
            {notifications.filter((n) => n.isActive).length}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Urgent Priority</p>
          <p className="text-2xl font-bold text-rose-700 mt-2">
            {notifications.filter((n) => n.priority === 'URGENT' || n.priority === 'HIGH').length}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search broadcasts by title or message..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-12 text-center bg-white rounded-xl border border-gray-200">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-gray-500 mt-2">Loading broadcast logs...</p>
          </div>
        ) : filteredNotifs.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-gray-200">
            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-base font-medium text-gray-900">No broadcasts found</p>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              Broadcast announcements and notifications dispatched to students will appear here.
            </p>
          </div>
        ) : (
          filteredNotifs.map((n) => (
            <div
              key={n.id}
              className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-3 hover:border-indigo-200 transition-all"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span
                    className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                      n.priority === 'URGENT'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : n.priority === 'HIGH'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}
                  >
                    {n.priority}
                  </span>
                  <span className="font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                    Audience: {n.targetAudience}
                  </span>
                  <span className="text-gray-400 font-mono text-[11px]">
                    Type: {n.type}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">
                    {new Date(n.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <button
                    onClick={() => handleDelete(n.id)}
                    className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                    title="Retract / Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 text-sm">{n.title}</h3>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">{n.message}</p>
                {n.actionUrl && (
                  <a
                    href={n.actionUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline mt-2"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Target Link: {n.actionUrl}
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 transition-all">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Dispatch Broadcast Notification</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="mt-4 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Notification Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. BITSAT 2026 Session 1 Registration Live"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Audience
                  </label>
                  <select
                    value={formData.targetAudience}
                    onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ALL">All Students</option>
                    <option value="BITSAT">BITSAT Aspirants</option>
                    <option value="JEE">JEE Aspirants</option>
                    <option value="COMEDK">COMEDK Aspirants</option>
                    <option value="ENROLLED">Enrolled Batches</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ANNOUNCEMENT">Announcement</option>
                    <option value="EXAM_ALERT">Exam Alert</option>
                    <option value="SYSTEM">System Notice</option>
                    <option value="OFFER">Special Offer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent Alert</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Message Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Detail the announcement for students..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Call-to-Action Link (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. /student/tests or https://bitsadmission.com"
                  value={formData.actionUrl}
                  onChange={(e) => setFormData({ ...formData, actionUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSubmitting && <LoadingSpinner size="sm" className="p-0 text-white" />}
                  Dispatch Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
