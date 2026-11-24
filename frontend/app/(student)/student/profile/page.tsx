'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/apiClient';
import {
  User,
  Mail,
  Phone,
  GraduationCap,
  Shield,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Save,
  Edit3,
  X,
  Loader2,
  RefreshCw,
  Lock,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

interface StudentProfile {
  id: number;
  fullName: string;
  email: string;
  mobileNumber: string | null;
  targetExam: string | null;
  role: string;
  accountStatus: string;
  createdAt: string;
  updatedAt: string;
}

const CANONICAL_EXAMS = [
  { value: 'BITSAT', label: 'BITSAT 2026' },
  { value: 'JEE', label: 'JEE (Main & Advanced) 2026' },
  { value: 'Comedk', label: 'COMEDK 2026' },
  { value: 'Manipal (MET)', label: 'Manipal MET 2026' },
  { value: 'VITEEE', label: 'VITEEE 2026' },
];

export default function StudentProfilePage() {
  const { user: authUser, refreshUser } = useAuth();

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Mode Form State
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    mobileNumber: '',
    targetExam: 'BITSAT',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch Authoritative Profile Data
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient('/api/student/profile', {
        method: 'GET',
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load student profile.');
      }
      setProfile(data.data);
      setFormData({
        fullName: data.data.fullName || '',
        mobileNumber: data.data.mobileNumber || '',
        targetExam: data.data.targetExam || 'BITSAT',
      });
    } catch (err: any) {
      console.error('[StudentProfile] Fetch error:', err);
      setError(err?.message || 'Unable to connect to profile service.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Handle Input Changes
  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    setSuccessMessage(null);
  };

  // Client Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    const trimmedName = formData.fullName.trim();
    if (!trimmedName) {
      errors.fullName = 'Full name is required.';
    } else if (trimmedName.length < 2) {
      errors.fullName = 'Full name must be at least 2 characters.';
    } else if (trimmedName.length > 100) {
      errors.fullName = 'Full name cannot exceed 100 characters.';
    }

    if (formData.mobileNumber.trim()) {
      const mobileRegex = /^(\+?[0-9]{1,4}[\s-]?)?[0-9]{7,15}$/;
      if (!mobileRegex.test(formData.mobileNumber.trim())) {
        errors.mobileNumber = 'Please enter a valid phone number (e.g. +91 9876543210).';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Cancel Edit
  const handleCancel = () => {
    if (profile) {
      setFormData({
        fullName: profile.fullName || '',
        mobileNumber: profile.mobileNumber || '',
        targetExam: profile.targetExam || 'BITSAT',
      });
    }
    setFormErrors({});
    setIsEditing(false);
    setSuccessMessage(null);
  };

  // Submit Profile Changes
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const payload: {
        fullName: string;
        mobileNumber: string | null;
        targetExam: string;
      } = {
        fullName: formData.fullName.trim(),
        mobileNumber: formData.mobileNumber.trim() ? formData.mobileNumber.trim() : null,
        targetExam: formData.targetExam,
      };

      const res = await apiClient('/api/student/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to update profile.');
      }

      setProfile(result.data);
      setFormData({
        fullName: result.data.fullName || '',
        mobileNumber: result.data.mobileNumber || '',
        targetExam: result.data.targetExam || 'BITSAT',
      });
      setIsEditing(false);
      setSuccessMessage('Your profile has been updated successfully.');

      // Refresh Auth Context so sidebar and header reflect the new name & target
      await refreshUser();
    } catch (err: any) {
      console.error('[StudentProfile] Save error:', err);
      setError(err?.message || 'An error occurred while saving profile changes.');
    } finally {
      setSaving(false);
    }
  };

  // Is Form Dirty Check
  const isDirty = profile
    ? formData.fullName.trim() !== (profile.fullName || '') ||
      (formData.mobileNumber.trim() || '') !== (profile.mobileNumber || '') ||
      formData.targetExam !== (profile.targetExam || 'BITSAT')
    : false;

  // Loading Skeleton State
  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-[#5034EB] animate-spin" />
        <p className="text-[#6E6990] text-xs font-semibold tracking-wide">
          Loading student account details...
        </p>
      </div>
    );
  }

  // Error State
  if (error && !profile) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        <div className="bg-white rounded-3xl border border-[#E7E3F5] p-10 text-center shadow-xs space-y-5">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-[#17152A]">Profile Unavailable</h2>
            <p className="text-xs text-[#6E6990] leading-relaxed max-w-sm mx-auto">
              {error}
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={fetchProfile}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#5034EB] hover:bg-[#432bc4] text-white text-xs font-bold transition-all shadow-xs"
            >
              <RefreshCw size={14} /> Retry Loading
            </button>
          </div>
        </div>
      </div>
    );
  }

  const initialLetter = profile?.fullName?.charAt(0) || 'S';
  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Active';

  const lastUpdated = profile?.updatedAt
    ? new Date(profile.updatedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Recently';

  return (
    <div className="space-y-8 pb-12 max-w-5xl mx-auto">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#6E6990]">
        <Link
          href="/student/dashboard"
          className="hover:text-[#5034EB] transition-colors flex items-center gap-1 font-semibold"
        >
          <ArrowLeft size={13} />
          <span>Dashboard</span>
        </Link>
        <span>/</span>
        <span className="text-[#17152A] font-bold">Profile & Account</span>
      </div>

      {/* Hero Profile Header */}
      <div className="bg-gradient-to-r from-[#17152A] via-[#2F2468] to-[#43358E] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            {/* Initials Avatar */}
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white font-black text-2xl sm:text-3xl flex items-center justify-center shadow-lg shrink-0">
              {initialLetter}
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-bold">
                  <Sparkles size={12} />
                  <span>{profile?.targetExam || 'BITSAT 2026'} Aspirant</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-semibold">
                  <Shield size={12} />
                  <span>Verified Student</span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {profile?.fullName}
              </h1>

              <p className="text-xs text-slate-300 font-mono">{profile?.email}</p>
            </div>
          </div>

          {/* Action Trigger */}
          <div className="shrink-0 flex items-center gap-3">
            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[#17152A] hover:bg-slate-100 font-bold text-xs transition-all shadow-md"
              >
                <Edit3 size={14} />
                <span>Edit Profile</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-all"
              >
                <X size={14} />
                <span>Cancel</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-3 shadow-xs animate-in fade-in">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-3 shadow-xs animate-in fade-in">
          <AlertCircle size={18} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Section A: Personal Information */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E7E3F5] shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-[#F1EFFB] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#5034EB]/10 text-[#5034EB] flex items-center justify-center font-bold">
                <User size={18} />
              </div>
              <div>
                <h2 className="font-extrabold text-sm sm:text-base text-[#17152A]">
                  Personal Information
                </h2>
                <p className="text-[11px] text-[#6E6990]">
                  Your identification and contact details on the platform
                </p>
              </div>
            </div>
            {isEditing && (
              <span className="text-[11px] font-bold text-[#5034EB] bg-[#5034EB]/10 px-2.5 py-1 rounded-full">
                Editing Mode Active
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#17152A] uppercase tracking-wider">
                Full Name <span className="text-rose-500">*</span>
              </label>
              {isEditing ? (
                <div>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#6E6990] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      placeholder="Enter full name"
                      className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm text-[#17152A] font-semibold focus:outline-none focus:bg-white focus:ring-4 transition-all ${
                        formErrors.fullName
                          ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10'
                          : 'border-[#E7E3F5] focus:border-[#5034EB] focus:ring-[#5034EB]/10'
                      }`}
                    />
                  </div>
                  {formErrors.fullName && (
                    <p className="text-[11px] text-rose-600 font-medium mt-1">
                      {formErrors.fullName}
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-[#F8F7FD] rounded-xl text-xs sm:text-sm font-semibold text-[#17152A] border border-[#E7E3F5]">
                  {profile?.fullName || 'Not provided'}
                </div>
              )}
            </div>

            {/* Email Address (Strictly Read-Only) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#17152A] uppercase tracking-wider">
                  Email Address
                </label>
                <span className="inline-flex items-center gap-1 text-[10px] text-[#6E6990] font-semibold">
                  <Lock size={10} /> Read-Only
                </span>
              </div>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#6E6990] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  disabled
                  value={profile?.email || ''}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-100/80 border border-[#E7E3F5] rounded-xl text-xs sm:text-sm text-[#6E6990] font-medium cursor-not-allowed select-none"
                />
              </div>
              <p className="text-[10px] text-[#6E6990] leading-tight">
                Email address is tied to your login identity and cannot be edited directly.
              </p>
            </div>

            {/* Mobile Number */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#17152A] uppercase tracking-wider">
                Mobile Number
              </label>
              {isEditing ? (
                <div>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#6E6990] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={formData.mobileNumber}
                      onChange={(e) => handleInputChange('mobileNumber', e.target.value)}
                      placeholder="+91 9876543210"
                      className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm text-[#17152A] font-semibold focus:outline-none focus:bg-white focus:ring-4 transition-all ${
                        formErrors.mobileNumber
                          ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10'
                          : 'border-[#E7E3F5] focus:border-[#5034EB] focus:ring-[#5034EB]/10'
                      }`}
                    />
                  </div>
                  {formErrors.mobileNumber && (
                    <p className="text-[11px] text-rose-600 font-medium mt-1">
                      {formErrors.mobileNumber}
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-[#F8F7FD] rounded-xl text-xs sm:text-sm font-semibold text-[#17152A] border border-[#E7E3F5]">
                  {profile?.mobileNumber || 'Not provided'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section B: Academic Information */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E7E3F5] shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 border-b border-[#F1EFFB] pb-4">
            <div className="w-8 h-8 rounded-xl bg-[#5034EB]/10 text-[#5034EB] flex items-center justify-center font-bold">
              <GraduationCap size={18} />
            </div>
            <div>
              <h2 className="font-extrabold text-sm sm:text-base text-[#17152A]">
                Academic Information & Exam Focus
              </h2>
              <p className="text-[11px] text-[#6E6990]">
                Customizes your test series, benchmark percentiles, and syllabus track
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Target Examination */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#17152A] uppercase tracking-wider">
                Target Examination <span className="text-rose-500">*</span>
              </label>
              {isEditing ? (
                <select
                  value={formData.targetExam}
                  onChange={(e) => handleInputChange('targetExam', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-[#E7E3F5] rounded-xl text-xs sm:text-sm text-[#17152A] font-semibold focus:outline-none focus:bg-white focus:border-[#5034EB] focus:ring-4 focus:ring-[#5034EB]/10 transition-all"
                >
                  {CANONICAL_EXAMS.map((exam) => (
                    <option key={exam.value} value={exam.value}>
                      {exam.label}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-3 bg-[#F8F7FD] rounded-xl text-xs sm:text-sm font-semibold text-[#17152A] border border-[#E7E3F5] flex items-center justify-between">
                  <span>{profile?.targetExam || 'BITSAT 2026'}</span>
                  <span className="text-[10px] font-bold text-[#5034EB] uppercase tracking-wider bg-[#5034EB]/10 px-2 py-0.5 rounded">
                    Active Track
                  </span>
                </div>
              )}
            </div>

            {/* Preparation Focus Notice */}
            <div className="p-4 rounded-2xl bg-[#F6F4FF] border border-[#E7E3F5] space-y-1 flex flex-col justify-center">
              <span className="text-[11px] font-bold text-[#5034EB] uppercase tracking-wider block">
                CBT & Test Series Benchmark
              </span>
              <p className="text-xs text-[#6E6990] leading-relaxed">
                Your target examination prioritizes matching CBT mock tests on your student
                dashboard and configures examination-specific negative marking rules.
              </p>
            </div>
          </div>
        </div>

        {/* Section C: Account Information (Read-Only) */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E7E3F5] shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 border-b border-[#F1EFFB] pb-4">
            <div className="w-8 h-8 rounded-xl bg-[#5034EB]/10 text-[#5034EB] flex items-center justify-center font-bold">
              <Shield size={18} />
            </div>
            <div>
              <h2 className="font-extrabold text-sm sm:text-base text-[#17152A]">
                Account & Security Details
              </h2>
              <p className="text-[11px] text-[#6E6990]">
                Authoritative credentials and administrative status (Read-Only)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Student ID */}
            <div className="p-4 rounded-2xl bg-[#F8F7FD] border border-[#E7E3F5] space-y-1">
              <span className="text-[10px] font-bold text-[#6E6990] uppercase tracking-wider block">
                Student ID
              </span>
              <div className="text-base sm:text-lg font-black text-[#17152A] font-mono">
                {profile?.id ? `#${profile.id}` : '—'}
              </div>
            </div>

            {/* Account Role */}
            <div className="p-4 rounded-2xl bg-[#F8F7FD] border border-[#E7E3F5] space-y-1">
              <span className="text-[10px] font-bold text-[#6E6990] uppercase tracking-wider block">
                Account Role
              </span>
              <div className="text-base sm:text-lg font-black text-[#5034EB]">
                {profile?.role || 'STUDENT'}
              </div>
            </div>

            {/* Account Status */}
            <div className="p-4 rounded-2xl bg-[#F8F7FD] border border-[#E7E3F5] space-y-1">
              <span className="text-[10px] font-bold text-[#6E6990] uppercase tracking-wider block">
                Status
              </span>
              <div className="text-base sm:text-lg font-black text-emerald-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{profile?.accountStatus || 'ACTIVE'}</span>
              </div>
            </div>

            {/* Registration Date */}
            <div className="p-4 rounded-2xl bg-[#F8F7FD] border border-[#E7E3F5] space-y-1">
              <span className="text-[10px] font-bold text-[#6E6990] uppercase tracking-wider block">
                Member Since
              </span>
              <div className="text-xs sm:text-sm font-bold text-[#17152A] truncate">
                {memberSince}
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls in Edit Mode */}
        {isEditing && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-[#E7E3F5] shadow-sm">
            <div className="text-xs text-[#6E6990]">
              {isDirty ? (
                <span className="text-amber-600 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  You have unsaved profile changes
                </span>
              ) : (
                <span>No changes made yet</span>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#E7E3F5] hover:bg-slate-50 font-bold text-xs text-[#6E6990] transition-all disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving || !isDirty}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#5034EB] hover:bg-[#432bc4] text-white font-bold text-xs transition-all shadow-xs disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
