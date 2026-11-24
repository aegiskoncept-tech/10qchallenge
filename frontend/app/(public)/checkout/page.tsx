'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  CreditCard,
  QrCode,
  ArrowRight,
  AlertCircle,
  Loader2,
  Tag,
  X,
  Sparkles,
} from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/apiClient';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    state: 'Karnataka',
  });

  const [paymentMethod, setPaymentMethod] = useState<'payu_upi' | 'payu_cards'>('payu_upi');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.mobileNumber || '',
      }));
    }
  }, [user]);

  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold">No Items in Checkout</h2>
        <p className="text-xs text-[#6E6990]">Please add a course before checking out.</p>
        <Link
          href="/course-all"
          className="px-6 py-2.5 rounded-xl bg-[#3F328A] text-white text-xs font-bold inline-block"
        >
          Browse Courses
        </Link>
      </div>
    );
  }

  const STATE_CODE_MAP: Record<string, string> = {
    'Karnataka': 'KA',
    'Maharashtra': 'MH',
    'Rajasthan': 'RJ',
    'Delhi': 'DL',
    'Delhi / NCR': 'DL',
    'Uttar Pradesh': 'UP',
    'Telangana': 'TG',
    'Tamil Nadu': 'TN',
    'Other': 'DL',
  };

  const currentCourseId = String(items[0].courseId);
  const discount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const total = Math.max(0, subtotal - discount);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = couponInput.trim().toUpperCase();
    if (!code) return;

    setCouponError(null);
    setIsValidatingCoupon(true);

    try {
      const res = await apiClient('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          courseId: currentCourseId,
          orderAmount: subtotal,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.valid) {
        throw new Error(json.message || 'Invalid coupon code.');
      }

      setAppliedCoupon({
        code: json.code,
        discountAmount: json.discountAmount,
        message: json.message,
      });
      setCouponInput('');
    } catch (err: any) {
      setCouponError(err.message || 'Failed to apply coupon.');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsProcessing(true);

    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent('/checkout')}`);
      return;
    }

    try {
      const stateCode = STATE_CODE_MAP[formData.state] || 'KA';

      // 1. Server-Side Order & Payment Attempt Creation
      const res = await apiClient('/api/checkout/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: currentCourseId,
          couponCode: appliedCoupon?.code || undefined,
          billingFullName: formData.fullName,
          billingEmail: formData.email,
          billingPhone: formData.phone,
          billingStateCode: stateCode,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to create order.');
      }

      const { payuParams, payuPaymentUrl } = json.data;

      // 2. Submit Form Directly to PayU Sandbox
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = payuPaymentUrl;

      Object.entries(payuParams).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = k;
          input.value = String(v);
          form.appendChild(input);
        }
      });

      document.body.appendChild(form);
      clearCart();
      form.submit();
    } catch (err: any) {
      console.error('Payment processing failed:', err);
      setErrorMessage(err.message || 'Payment transaction could not be initialized. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-[#17152A] tracking-tight">Checkout</h1>
        <p className="text-xs sm:text-sm text-[#6E6990] mt-1">
          Complete your enrollment details to get instant access to the LMS classroom.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Billing Information Form */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handlePayment} id="checkout-form" className="space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E7E3F5] shadow-xs space-y-4">
              <h3 className="font-bold text-base text-[#17152A] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#3F328A] text-white text-xs flex items-center justify-center font-bold">
                  1
                </span>
                <span>Student & Billing Details</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#17152A] mb-1.5">
                    Student Full Name <span className="text-[#FF3F68]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E7E3F5] text-xs focus:outline-none focus:border-[#3F328A]"
                    placeholder="e.g. Rahul Sharma"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#17152A] mb-1.5">
                    Email Address (Account ID) <span className="text-[#FF3F68]">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E7E3F5] text-xs focus:outline-none focus:border-[#3F328A]"
                    placeholder="name@example.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#17152A] mb-1.5">
                    WhatsApp Mobile Number <span className="text-[#FF3F68]">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E7E3F5] text-xs focus:outline-none focus:border-[#3F328A]"
                    placeholder="10-digit mobile number"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#17152A] mb-1.5">
                    State of Residence (for GST) <span className="text-[#FF3F68]">*</span>
                  </label>
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E7E3F5] text-xs focus:outline-none focus:border-[#3F328A] bg-white"
                  >
                    <option value="Karnataka">Karnataka (KA)</option>
                    <option value="Maharashtra">Maharashtra (MH)</option>
                    <option value="Rajasthan">Rajasthan (RJ)</option>
                    <option value="Delhi">Delhi / NCR (DL)</option>
                    <option value="Uttar Pradesh">Uttar Pradesh (UP)</option>
                    <option value="Telangana">Telangana (TG)</option>
                    <option value="Tamil Nadu">Tamil Nadu (TN)</option>
                    <option value="Other">Other States</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E7E3F5] shadow-xs space-y-4">
              <h3 className="font-bold text-base text-[#17152A] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#3F328A] text-white text-xs flex items-center justify-center font-bold">
                  2
                </span>
                <span>Payment Gateway Mode</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  onClick={() => setPaymentMethod('payu_upi')}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                    paymentMethod === 'payu_upi'
                      ? 'border-[#3F328A] bg-[#F0EDFD]'
                      : 'border-[#E7E3F5] bg-white hover:border-[#3F328A]/30'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#20D66B]/20 text-[#16A34A] flex items-center justify-center">
                    <QrCode size={22} />
                  </div>
                  <div>
                    <div className="font-bold text-xs sm:text-sm text-[#17152A]">
                      UPI / QR Code (PayU)
                    </div>
                    <p className="text-[11px] text-[#6E6990]">GPay, PhonePe, Paytm, BHIM</p>
                  </div>
                </div>

                <div
                  onClick={() => setPaymentMethod('payu_cards')}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                    paymentMethod === 'payu_cards'
                      ? 'border-[#3F328A] bg-[#F0EDFD]'
                      : 'border-[#E7E3F5] bg-white hover:border-[#3F328A]/30'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#3F328A]/10 text-[#3F328A] flex items-center justify-center">
                    <CreditCard size={22} />
                  </div>
                  <div>
                    <div className="font-bold text-xs sm:text-sm text-[#17152A]">
                      Cards & NetBanking (PayU)
                    </div>
                    <p className="text-[11px] text-[#6E6990]">All Indian Banks & Debit/Credit Cards</p>
                  </div>
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="p-4 rounded-xl bg-[#FFE8ED] border border-[#FFCCD6] text-xs text-[#FF3F68] flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}
          </form>
        </div>

        {/* Order Summary & Coupon on Right */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E7E3F5] shadow-lg space-y-6">
            <h3 className="font-bold text-lg text-[#17152A]">Review Order</h3>

            <div className="divide-y divide-[#F1EFFB] space-y-3">
              {items.map((item) => (
                <div key={item.courseId} className="pt-3 flex justify-between items-center text-xs">
                  <div>
                    <div className="font-bold text-[#17152A] line-clamp-1">{item.courseTitle}</div>
                    <span className="text-[10px] text-[#6E6990]">{item.examTag}</span>
                  </div>
                  <span className="font-bold text-[#17152A] ml-2">
                    ₹{item.price.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>

            {/* Coupon Application Box */}
            <div className="pt-2">
              {appliedCoupon ? (
                <div className="p-3 rounded-2xl bg-[#E8FAF0] border border-[#20D66B]/30 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <Sparkles size={14} className="text-[#16A34A]" />
                    <div>
                      <span className="font-bold text-[#16A34A]">{appliedCoupon.code}</span> applied
                      <p className="text-[10px] text-[#16A34A]">₹{appliedCoupon.discountAmount.toLocaleString('en-IN')} savings</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="p-1 rounded-lg hover:bg-[#20D66B]/20 text-[#16A34A] transition-colors"
                    title="Remove coupon"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="space-y-1.5">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag size={13} className="absolute left-3 top-3 text-[#6E6990]" />
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder="Coupon (e.g. BITSAT500)"
                        className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#E7E3F5] text-xs font-mono font-bold tracking-wider uppercase focus:outline-none focus:border-[#3F328A]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!couponInput.trim() || isValidatingCoupon}
                      className="px-4 py-2 rounded-xl bg-[#3F328A] hover:bg-[#2D246B] text-white font-bold text-xs transition-colors disabled:opacity-40"
                    >
                      {isValidatingCoupon ? <Loader2 size={13} className="animate-spin" /> : 'Apply'}
                    </button>
                  </div>
                  {couponError && (
                    <p className="text-[11px] text-[#FF3F68] font-medium">{couponError}</p>
                  )}
                </form>
              )}
            </div>

            {/* Price Calculations */}
            <div className="pt-4 border-t border-[#F1EFFB] space-y-2 text-xs">
              <div className="flex justify-between text-[#6E6990]">
                <span>Course Price</span>
                <span className="font-semibold text-[#17152A]">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-[#16A34A] font-semibold">
                  <span>Coupon Discount ({appliedCoupon?.code})</span>
                  <span>- ₹{discount.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between items-baseline pt-3 border-t border-[#F1EFFB] text-base font-extrabold text-[#17152A]">
                <span>Total Payable Amount</span>
                <span className="text-2xl text-[#3F328A]">₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              type="submit"
              form="checkout-form"
              disabled={isProcessing}
              className="w-full py-4 rounded-xl bg-[#FF3F68] hover:bg-[#E02E53] text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Connecting to PayU...</span>
                </>
              ) : (
                <>
                  <Lock size={16} />
                  <span>Pay ₹{total.toLocaleString('en-IN')} & Enroll</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div className="text-center text-[11px] text-[#6E6990] space-y-1">
              <p>Course prices are tax-inclusive. No additional GST added at payment.</p>
              <div className="flex items-center justify-center gap-1 text-[#20D66B] font-semibold">
                <ShieldCheck size={13} />
                <span>Encrypted PayU Sandbox Gateway Integration</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
