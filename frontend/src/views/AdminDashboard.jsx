'use client';

import React from 'react';
import { DashboardOverview } from '@/components/admin/DashboardOverview';

/**
 * Legacy AdminDashboard view adapter.
 * Replaced in Phase 00 with the clean React Admin Foundation.
 * The original legacy 6,985-line file is safely backed up in:
 * backups/admin-legacy-reset-2026-11-18T02-35-00/frontend/src/views/AdminDashboard.jsx
 */
export default function AdminDashboard() {
  return <DashboardOverview />;
}
