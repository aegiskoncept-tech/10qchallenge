'use client';

import React, { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Percent,
  IndianRupee,
  Calendar,
  Users,
  Copy,
  Check,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/admin/ui/LoadingSpinner';

interface Coupon {
  id: number;
  code: string;
  discountType: 'PERCENTAGE' | 'FLAT';
  discountValue: number;
  minOrderAmount: number;
  maxDiscount?: number;
  expiryDate?: string;
  usageLimit?: number;
  usedCount: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PERCENTAGE' | 'FLAT'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FLAT',
    discountValue: '',
    minOrderAmount: '',
    maxDiscount: '',
    expiryDate: '',
    usageLimit: '',
    description: '',
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete State
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchCoupons = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/coupons');
      if (res.ok) {
        const j = await res.json();
        if (j.success && Array.isArray(j.data)) setCoupons(j.data);
      }
    } catch (err) {
      console.error('[AdminCoupons] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const openCreateModal = () => {
    setEditingCoupon(null);
    setFormData({
      code: '',
      discountType: 'PERCENTAGE',
      discountValue: '10',
      minOrderAmount: '500',
      maxDiscount: '',
      expiryDate: '',
      usageLimit: '',
      description: '',
      isActive: true,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (c: Coupon) => {
    setEditingCoupon(c);
    setFormData({
      code: c.code,
      discountType: c.discountType,
      discountValue: String(c.discountValue),
      minOrderAmount: String(c.minOrderAmount || 0),
      maxDiscount: c.maxDiscount ? String(c.maxDiscount) : '',
      expiryDate: c.expiryDate ? c.expiryDate.split('T')[0] : '',
      usageLimit: c.usageLimit ? String(c.usageLimit) : '',
      description: c.description || '',
      isActive: c.isActive,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.code.trim()) {
      setFormError('Coupon code is required.');
      return;
    }

    const discountVal = Number(formData.discountValue);
    if (isNaN(discountVal) || discountVal <= 0) {
      setFormError('Please enter a valid positive discount value.');
      return;
    }

    if (formData.discountType === 'PERCENTAGE' && discountVal > 100) {
      setFormError('Percentage discount cannot exceed 100%.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        code: formData.code.trim().toUpperCase(),
        discountType: formData.discountType,
        discountValue: discountVal,
        minOrderAmount: Number(formData.minOrderAmount) || 0,
        maxDiscount: formData.maxDiscount ? Number(formData.maxDiscount) : undefined,
        expiryDate: formData.expiryDate ? new Date(formData.expiryDate).toISOString() : undefined,
        usageLimit: formData.usageLimit ? Number(formData.usageLimit) : undefined,
        description: formData.description.trim() || undefined,
        isActive: formData.isActive,
      };

      const url = editingCoupon
        ? `/api/admin/coupons/${editingCoupon.id}`
        : '/api/admin/coupons';
      const method = editingCoupon ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save coupon.');
      }

      setIsModalOpen(false);
      await fetchCoupons();
    } catch (err: any) {
      setFormError(err.message || 'Error saving coupon.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete coupon.');
      }
      setDeleteConfirmId(null);
      await fetchCoupons();
    } catch (err: any) {
      setDeleteError(err.message || 'Error deleting coupon.');
    } finally {
      setIsDeleting(false);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Filtered
  const filteredCoupons = coupons.filter((c) => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const matchCode = c.code.toLowerCase().includes(q);
      const matchDesc = c.description?.toLowerCase().includes(q) || false;
      if (!matchCode && !matchDesc) return false;
    }
    if (typeFilter !== 'ALL' && c.discountType !== typeFilter) return false;
    if (statusFilter === 'ACTIVE' && !c.isActive) return false;
    if (statusFilter === 'INACTIVE' && c.isActive) return false;

    return true;
  });

  const activeCount = coupons.filter((c) => c.isActive).length;
  const flatCount = coupons.filter((c) => c.discountType === 'FLAT').length;
  const percentCount = coupons.filter((c) => c.discountType === 'PERCENTAGE').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Tag className="h-7 w-7 text-indigo-600" />
            Coupon Master
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Create promotional discount codes, validity windows, and percentage or flat cart reductions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchCoupons}
            disabled={isLoading}
            className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Refresh Coupons"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Coupon
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Coupons</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{coupons.length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Active Coupons</p>
          <p className="text-2xl font-bold text-emerald-700 mt-2">{activeCount}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Flat Discounter</p>
          <p className="text-2xl font-bold text-blue-700 mt-2">{flatCount}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Percentage Off</p>
          <p className="text-2xl font-bold text-purple-700 mt-2">{percentCount}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search coupon codes or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full py-2 px-3 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Discount Types</option>
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="FLAT">Flat Amount (₹)</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full py-2 px-3 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error alert */}
      {deleteError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">Cannot Delete Coupon</p>
            <p className="text-sm text-red-700 mt-0.5">{deleteError}</p>
          </div>
          <button
            onClick={() => setDeleteError(null)}
            className="text-red-400 hover:text-red-600 text-sm font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Coupons Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-gray-500 mt-2">Loading coupons...</p>
          </div>
        ) : filteredCoupons.length === 0 ? (
          <div className="p-12 text-center">
            <Tag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-base font-medium text-gray-900">No coupons found</p>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              {searchTerm || typeFilter !== 'ALL' || statusFilter !== 'ALL'
                ? 'Try adjusting your search criteria.'
                : 'Create your first promotional discount coupon code.'}
            </p>
            {!searchTerm && typeFilter === 'ALL' && (
              <button
                onClick={openCreateModal}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                Add Coupon
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Coupon Code</th>
                  <th className="py-3.5 px-4">Discount Value</th>
                  <th className="py-3.5 px-4">Min Order</th>
                  <th className="py-3.5 px-4">Usage & Limit</th>
                  <th className="py-3.5 px-4">Expiry Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCoupons.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/75 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded border border-indigo-200">
                          {c.code}
                        </span>
                        <button
                          onClick={() => copyToClipboard(c.code)}
                          className="text-gray-400 hover:text-gray-600 p-1"
                          title="Copy Code"
                        >
                          {copiedCode === c.code ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                      {c.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">{c.description}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-900 flex items-center gap-1">
                        {c.discountType === 'PERCENTAGE' ? (
                          <>
                            <Percent className="h-3.5 w-3.5 text-purple-600" />
                            <span>{c.discountValue}% OFF</span>
                            {c.maxDiscount && (
                              <span className="text-xs text-gray-500 font-normal">
                                (Max ₹{c.maxDiscount})
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <IndianRupee className="h-3.5 w-3.5 text-blue-600" />
                            <span>₹{c.discountValue} FLAT OFF</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-700">
                      ₹{c.minOrderAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-xs text-gray-700">
                        <span className="font-semibold">{c.usedCount}</span>
                        {c.usageLimit ? (
                          <span className="text-gray-500"> / {c.usageLimit} redeemed</span>
                        ) : (
                          <span className="text-gray-500"> redeemed (Unlimited)</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-600">
                      {c.expiryDate ? (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          {new Date(c.expiryDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-medium">No Expiration</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {c.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                          <XCircle className="h-3 w-3" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(c)}
                          className="p-1.5 rounded-md text-gray-500 hover:text-indigo-600 hover:bg-gray-100 transition-colors"
                          title="Edit Coupon"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(c.id)}
                          className="p-1.5 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete Coupon"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 transition-all">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {editingCoupon ? 'Edit Coupon' : 'Create New Discount Coupon'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="mt-4 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Code */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Coupon Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. BITSAT500"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                  required
                />
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Discount Type
                  </label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FLAT">Flat Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Discount Value <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder={formData.discountType === 'PERCENTAGE' ? '20' : '500'}
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Min Order & Max Discount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Min Order Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 1000"
                    value={formData.minOrderAmount}
                    onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Max Discount (₹, Optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 1500"
                    value={formData.maxDiscount}
                    onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={formData.discountType === 'FLAT'}
                  />
                </div>
              </div>

              {/* Expiry Date & Usage Limit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Expiry Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Usage Limit (Optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 500"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Description / Terms (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Special festive discount code for BITSAT aspirants"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="couponIsActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                />
                <label htmlFor="couponIsActive" className="text-sm font-medium text-gray-700">
                  Active (Allowed to be redeemed during checkout)
                </label>
              </div>

              {/* Submit Buttons */}
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
                  {editingCoupon ? 'Save Changes' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-gray-100">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center">Delete Coupon?</h3>
            <p className="text-xs text-gray-500 text-center mt-1">
              Are you sure you want to permanently delete this coupon? It will no longer be redeemable by students.
            </p>

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                {isDeleting && <LoadingSpinner size="sm" className="p-0 text-white" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
