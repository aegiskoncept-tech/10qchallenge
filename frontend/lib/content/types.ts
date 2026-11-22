// ==============================================================================
// 10Q CHALLENGE LMS — FEATURE 13: BLOG CMS & EDITORIAL CONTENT DOMAIN TYPES
// ==============================================================================

export type BlogStatus =
  | 'Draft'
  | 'In Review'
  | 'Approved'
  | 'Scheduled'
  | 'Publishing'
  | 'Published'
  | 'Archived'
  | 'Failed';

export interface BlogSEO {
  seoTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  focusKeyword?: string;
  secondaryKeywords?: string[];
  robotsIndex?: boolean;
  robotsFollow?: boolean;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterCard?: 'summary' | 'summary_large_image';
}

export interface BlogRevision {
  id?: number;
  blogId?: number;
  revisionId: string;
  timestamp: string;
  author: string;
  title: string;
  content: string;
  status: BlogStatus;
  summary?: string;
  createdAt?: string;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isArchived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BlogAuthor {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  bio?: string;
  isVerified: boolean;
  createdAt?: string;
}

export interface BlogMediaItem {
  id: string;
  url: string;
  filename: string;
  altText: string;
  caption?: string;
  dimensions?: { width: number; height: number };
  fileSize?: string;
  uploadDate: string;
}

export interface BlogRedirect {
  id?: number;
  fromSlug: string;
  toSlug: string;
  statusCode: 301 | 302;
  createdAt?: string;
}

export interface BlogRecord {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  authorId?: string;
  category: string;
  readTime: string;
  coverImage?: string;
  coverImageAlt?: string;
  coverImageCaption?: string;
  tags: string[];
  status: BlogStatus;
  scheduledPublishAt?: string;
  publishedAt?: string;
  viewsCount: number;
  seo: BlogSEO;
  revisions?: BlogRevision[];
  // Fencing / Concurrency
  claimToken?: string | null;
  claimingWorkerId?: string | null;
  claimExpiresAt?: string | null;
  publishRetryCount?: number;
  // Audit
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface BlogDashboardMetrics {
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  inReviewArticles: number;
  scheduledArticles: number;
  archivedArticles: number;
  totalViews: number;
  seoAttentionNeeded: number;
}

/**
 * 17-Field Canonical Publication Audit Snapshot Payload
 * Immutable verification record captured at exact moment of publication
 */
export interface PublicationAuditSnapshot {
  id: number;
  slug: string;
  title: string;
  status: BlogStatus;
  scheduledPublishAt?: string | null;
  publishedAt: string;
  authorId?: string | null;
  authorName: string;
  categoryId?: string | null;
  categorySlug: string;
  canonicalUrl: string;
  tagsCount: number;
  wordCount: number;
  readTimeMinutes: number;
  seoTitle: string;
  seoDescription: string;
  contentSha256: string;
  // Supplementary structured metadata
  fullContent?: string;
  tags?: string[];
  coverImage?: string;
  snapshotCreatedAt: string;
}

export interface PublicationAuditLog {
  id: number;
  blogId: number;
  claimToken: string;
  workerId: string;
  eventType: 'PUBLISHED' | 'SCHEDULED_CLAIMED' | 'LEASE_EXPIRED' | 'FAILED_RETRY_EXHAUSTED';
  scheduledPublishAt?: string | null;
  actualPublishedAt: string;
  articleSnapshot: PublicationAuditSnapshot;
  contentSha256: string;
  createdAt: string;
}

export type RevalidationStatus = 'PENDING' | 'CLAIMED' | 'DELIVERED' | 'RETRYABLE_FAILED' | 'DEAD_LETTER';

export interface RevalidationEvent {
  id: number;
  blogId: number;
  eventType: string;
  slug: string;
  targetPaths: string[];
  status: RevalidationStatus;
  claimToken?: string | null;
  claimingWorkerId?: string | null;
  claimExpiresAt?: string | null;
  retryCount: number;
  maxRetries: number;
  lastError?: string | null;
  createdAt: string;
  processedAt?: string | null;
}

export interface PublicationClaim {
  blogId: number;
  claimToken: string;
  claimingWorkerId: string;
  claimExpiresAt: string;
}

export interface SchedulerResult {
  workerId: string;
  timestamp: string;
  claimedCount: number;
  publishedCount: number;
  failedCount: number;
  expiredLeasesRecovered: number;
  revalidationProcessed: number;
  errors: string[];
}

export interface MigrationSummaryRecord {
  sourceFile: string;
  totalParsed: number;
  validArticles: number;
  duplicateSlugs: string[];
  missingFields: string[];
  warnings: string[];
  checksums: Record<string, string>;
}

export interface MigrationReport {
  timestamp: string;
  environment: 'local' | 'staging' | 'production';
  legacySourcesChecked: string[];
  articlesProcessed: number;
  categoriesProcessed: number;
  authorsProcessed: number;
  redirectsProcessed: number;
  status: 'SUCCESS' | 'DRYRUN_PASSED' | 'FAILED';
  details: MigrationSummaryRecord[];
}

export type WalPhase =
  | 'CUTOVER_INITIALIZED'
  | 'LEGACY_SNAPSHOT_TAKEN'
  | 'SCHEMA_APPLIED'
  | 'DATA_MIGRATED'
  | 'DUAL_WRITE_ACTIVE'
  | 'VALIDATION_PASSED'
  | 'READ_TRAFFIC_SWITCHED'
  | 'WRITE_TRAFFIC_SWITCHED'
  | 'CUTOVER_COMPLETE'
  | 'ROLLBACK_INITIATED'
  | 'ROLLBACK_COMPLETE';

export interface WalManifest {
  manifestId: string;
  initiatedAt: string;
  currentPhase: WalPhase;
  sourceChecksum: string;
  migratedCount: number;
  phasesCompleted: { phase: WalPhase; timestamp: string; details?: any }[];
  lastError?: string;
}
