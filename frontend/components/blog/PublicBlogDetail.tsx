'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  User,
  Share2,
  Bookmark,
  Check,
  ChevronRight,
  Home,
  BookOpen,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Tag,
  ArrowLeft,
  ExternalLink,
  MessageCircle,
  Eye,
  List,
} from 'lucide-react';
import { BlogRecord } from '@/lib/content/types';
import { serializeJsonLd } from '@/lib/content/security';

interface PublicBlogDetailProps {
  slug?: string;
  previewToken?: string;
}

export default function PublicBlogDetail({ slug, previewToken }: PublicBlogDetailProps) {
  const [blog, setBlog] = useState<BlogRecord | null>(null);
  const [relatedBlogs, setRelatedBlogs] = useState<BlogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    async function loadArticle() {
      setIsLoading(true);
      setError(null);
      try {
        let endpoint = '';
        if (previewToken) {
          endpoint = `/api/blogs/preview?token=${encodeURIComponent(previewToken)}`;
        } else if (slug) {
          endpoint = `/api/blogs/${encodeURIComponent(slug)}`;
        } else {
          throw new Error('No article slug or preview token provided.');
        }

        const res = await fetch(endpoint);
        const json = await res.json();

        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error || 'Article not found or not published.');
        }

        if (isMounted) {
          setBlog(json.data);

          // Update Document Title
          if (typeof document !== 'undefined') {
            document.title = `${json.data.seo?.seoTitle || json.data.title} | 10Q Challenge`;
          }

          // Fetch related articles from same category
          if (json.data.category) {
            try {
              const relRes = await fetch(`/api/blogs?category=${encodeURIComponent(json.data.category)}&limit=4`);
              if (relRes.ok) {
                const relJson = await relRes.json();
                if (relJson.success && Array.isArray(relJson.data)) {
                  setRelatedBlogs(relJson.data.filter((b: BlogRecord) => b.id !== json.data.id).slice(0, 3));
                }
              }
            } catch (_) {}
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to load article.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadArticle();
    return () => {
      isMounted = false;
    };
  }, [slug, previewToken]);

  // Extract Table of Contents from content
  const tableOfContents = React.useMemo(() => {
    if (!blog?.content) return [];
    const lines = blog.content.split('\n');
    const items: { id: string; text: string; level: number }[] = [];
    for (const line of lines) {
      const h2Match = line.match(/^##\s+(.+)$/);
      const h3Match = line.match(/^###\s+(.+)$/);
      if (h2Match) {
        const text = h2Match[1].trim();
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        items.push({ id, text, level: 2 });
      } else if (h3Match) {
        const text = h3Match[1].trim();
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        items.push({ id, text, level: 3 });
      }
    }
    return items;
  }, [blog?.content]);

  // Social Share Handlers
  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const shareOnWhatsApp = () => {
    if (typeof window === 'undefined' || !blog) return;
    const text = encodeURIComponent(`*${blog.title}*\n${blog.excerpt}\n\nRead full article here: ${window.location.href}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const shareOnTelegram = () => {
    if (typeof window === 'undefined' || !blog) return;
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(blog.title);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
  };

  const shareOnTwitter = () => {
    if (typeof window === 'undefined' || !blog) return;
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`${blog.title} by @10QChallenge\n\n`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 flex items-center justify-center px-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 max-w-md w-full text-center space-y-4 shadow-xl">
          <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <h3 className="text-base font-bold text-slate-200">Loading educational article...</h3>
          <p className="text-xs text-slate-500">Retrieving content from authoritative editorial engine</p>
        </div>
      </main>
    );
  }

  if (error || !blog) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 flex items-center justify-center px-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 max-w-md w-full text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-amber-400/10 text-amber-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-100">Article Not Found</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            {error || 'This article is currently in draft or is unavailable.'}
          </p>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to All Blogs</span>
          </Link>
        </div>
      </main>
    );
  }

  // JSON-LD Structured Data for Article & Breadcrumbs
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: blog.seo?.seoTitle || blog.title,
    description: blog.seo?.metaDescription || blog.excerpt,
    image: [blog.coverImage || 'https://10qchallenge.in/site/assets/img/blog/blog-1.jpg'],
    datePublished: blog.publishedAt || blog.createdAt,
    dateModified: blog.updatedAt || blog.createdAt,
    author: {
      '@type': 'Person',
      name: blog.author,
    },
    publisher: {
      '@type': 'Organization',
      name: '10Q Challenge',
      logo: {
        '@type': 'ImageObject',
        url: 'https://10qchallenge.in/site/assets/images/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://10qchallenge.in/blog/${blog.slug}`,
    },
  };

  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://10qchallenge.in',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: 'https://10qchallenge.in/blog',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: blog.title,
        item: `https://10qchallenge.in/blog/${blog.slug}`,
      },
    ],
  };

  return (
    <>
      {/* Inject Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbsJsonLd) }}
      />

      <article className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20">
        {/* Private Preview Banner */}
        {previewToken && (
          <div className="bg-amber-400 text-slate-950 py-2.5 px-4 text-center font-black text-xs sticky top-16 z-40 shadow-lg flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>PRIVATE EDITORIAL PREVIEW MODE &bull; Active Token: {previewToken.slice(0, 10)}... &bull; Status: {blog.status}</span>
          </div>
        )}

        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-2 text-xs text-slate-400 overflow-x-auto whitespace-nowrap py-1">
            <Link href="/" className="hover:text-amber-400 transition-colors flex items-center gap-1">
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <Link href="/blog" className="hover:text-amber-400 transition-colors">
              Blog
            </Link>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <span className="text-amber-400 font-bold">{blog.category}</span>
          </nav>

          {/* Article Header */}
          <header className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-sm">
                {blog.category}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>{blog.readTime}</span>
              </span>
              {blog.viewsCount > 0 && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-400 flex items-center gap-1">
                  <Eye className="w-3 h-3 text-slate-400" />
                  <span>{blog.viewsCount} reads</span>
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-100 tracking-tight leading-tight">
              {blog.title}
            </h1>

            <p className="text-base sm:text-lg text-slate-300 font-medium leading-relaxed">
              {blog.excerpt}
            </p>

            {/* Author Attribution Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center font-bold">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-200">{blog.author}</span>
                    <span title="Verified Author">
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    Published on {new Date(blog.publishedAt || blog.createdAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {/* Social Share Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={shareOnWhatsApp}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold transition-all flex items-center gap-1.5"
                  title="Share on WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
                <button
                  onClick={shareOnTelegram}
                  className="px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 text-xs font-bold transition-all"
                  title="Share on Telegram"
                >
                  Telegram
                </button>
                <button
                  onClick={shareOnTwitter}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
                  title="Share on X"
                >
                  X
                </button>
                <button
                  onClick={handleCopyLink}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                  title="Copy Link"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </header>

          {/* Featured Hero Banner */}
          {blog.coverImage && (
            <figure className="space-y-2">
              <div className="rounded-3xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl">
                <img
                  src={blog.coverImage}
                  alt={blog.coverImageAlt || blog.title}
                  className="w-full max-h-[460px] object-cover"
                  onError={(e: any) => {
                    e.currentTarget.src = '/site/assets/img/blog/blog-1.jpg';
                  }}
                />
              </div>
              {blog.coverImageCaption && (
                <figcaption className="text-center text-xs text-slate-500 italic">
                  {blog.coverImageCaption}
                </figcaption>
              )}
            </figure>
          )}

          {/* Main Layout: Table of Contents + Article Body */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Table of Contents Sticky Sidebar */}
            {tableOfContents.length > 0 && (
              <aside className="lg:col-span-1 hidden lg:block">
                <div className="sticky top-28 bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                    <List className="w-4 h-4" />
                    <span>Table of Contents</span>
                  </div>
                  <nav className="space-y-1.5 text-xs">
                    {tableOfContents.map((item, idx) => (
                      <a
                        key={idx}
                        href={`#${item.id}`}
                        className={`block text-slate-400 hover:text-amber-400 transition-colors ${
                          item.level === 3 ? 'pl-3 text-[11px]' : 'font-medium'
                        }`}
                      >
                        {item.text}
                      </a>
                    ))}
                  </nav>
                </div>
              </aside>
            )}

            {/* Article Content Container */}
            <div className={tableOfContents.length > 0 ? 'lg:col-span-3' : 'lg:col-span-4'}>
              <div className="prose prose-invert max-w-none text-slate-200 text-sm sm:text-base leading-relaxed space-y-6">
                {/* Parse simple markdown sections */}
                {blog.content.split('\n\n').map((paragraph, index) => {
                  const trimmed = paragraph.trim();

                  // H2 Heading
                  if (trimmed.startsWith('## ')) {
                    const titleText = trimmed.replace('## ', '');
                    const anchorId = titleText.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    return (
                      <h2
                        key={index}
                        id={anchorId}
                        className="text-2xl sm:text-3xl font-black text-slate-100 pt-6 pb-2 border-b border-slate-800/80 scroll-mt-32"
                      >
                        {titleText}
                      </h2>
                    );
                  }

                  // H3 Heading
                  if (trimmed.startsWith('### ')) {
                    const titleText = trimmed.replace('### ', '');
                    const anchorId = titleText.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    return (
                      <h3
                        key={index}
                        id={anchorId}
                        className="text-xl sm:text-2xl font-bold text-amber-400 pt-4 pb-1 scroll-mt-32"
                      >
                        {titleText}
                      </h3>
                    );
                  }

                  // Blockquote
                  if (trimmed.startsWith('> ')) {
                    return (
                      <blockquote
                        key={index}
                        className="p-4 my-4 bg-slate-900 border-l-4 border-amber-400 rounded-r-2xl text-slate-300 italic"
                      >
                        {trimmed.replace(/^>\s*/, '')}
                      </blockquote>
                    );
                  }

                  // Unordered List
                  if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                    const items = trimmed.split('\n').map((l) => l.replace(/^[-*]\s*/, ''));
                    return (
                      <ul key={index} className="space-y-2 my-4 pl-4 list-disc list-outside text-slate-300">
                        {items.map((it, i) => (
                          <li key={i}>{it}</li>
                        ))}
                      </ul>
                    );
                  }

                  // Table block
                  if (trimmed.includes('|') && trimmed.includes('\n|')) {
                    const rows = trimmed.split('\n').filter((r) => r.trim().startsWith('|'));
                    const headers = rows[0]?.split('|').map((c) => c.trim()).filter(Boolean);
                    const bodyRows = rows.slice(2);
                    return (
                      <div key={index} className="overflow-x-auto my-6">
                        <table className="w-full text-left border-collapse bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden text-xs">
                          <thead>
                            <tr className="bg-slate-950 border-b border-slate-800 text-amber-400 font-bold uppercase text-[10px]">
                              {headers.map((h, i) => (
                                <th key={i} className="p-3">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                            {bodyRows.map((r, ri) => {
                              const cells = r.split('|').map((c) => c.trim()).filter(Boolean);
                              return (
                                <tr key={ri} className="hover:bg-slate-800/40">
                                  {cells.map((c, ci) => (
                                    <td key={ci} className="p-3 text-slate-300">
                                      {c}
                                    </td>
                                  ))}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  }

                  // Default paragraph
                  return (
                    <p key={index} className="text-slate-300 leading-relaxed">
                      {trimmed}
                    </p>
                  );
                })}
              </div>

              {/* Tags Section */}
              {blog.tags && blog.tags.length > 0 && (
                <div className="pt-8 border-t border-slate-800/80 mt-8 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-400" />
                    <span>Related Topics</span>
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {blog.tags.map((tag, idx) => (
                      <Link
                        key={idx}
                        href={`/blog?search=${encodeURIComponent(tag)}`}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
                      >
                        #{tag}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Author Bio Card */}
              <div className="mt-10 p-6 bg-slate-900 border border-slate-800 rounded-3xl flex flex-col sm:flex-row items-center sm:items-start gap-5 shadow-xl">
                <div className="w-16 h-16 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center shrink-0">
                  <User className="w-8 h-8" />
                </div>
                <div className="space-y-1.5 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <h4 className="text-base font-black text-slate-100">{blog.author}</h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-400/10 border border-amber-400/20 text-amber-400">
                      Author & Mentor
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Senior mentor at 10Q Challenge specializing in entrance exam pedagogy, computer-based test strategies, and score acceleration.
                  </p>
                </div>
              </div>

              {/* High-Converting Course CTA */}
              <div className="mt-10 p-8 rounded-3xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 shadow-2xl relative overflow-hidden space-y-4">
                <div className="space-y-2 relative z-10">
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-950 text-amber-400">
                    Boost Your Accuracy
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                    Master BITSAT & JEE with 10Q Challenge Full-Length Test Series
                  </h3>
                  <p className="text-xs sm:text-sm font-semibold text-slate-900 max-w-xl">
                    Take full-length timed CBT tests with official marking schemes, instant detailed analytics, and question-by-question solutions.
                  </p>
                </div>
                <div className="relative z-10 pt-2">
                  <Link
                    href="/course-all"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-slate-950 hover:bg-slate-900 text-amber-400 font-black text-xs rounded-xl shadow-xl transition-all"
                  >
                    <span>Explore Course Catalog</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Related Articles Carousel / Grid */}
          {relatedBlogs.length > 0 && (
            <section className="pt-12 border-t border-slate-800 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-100">Related Articles in {blog.category}</h3>
                  <p className="text-xs text-slate-500">Continue learning with these recommended guides</p>
                </div>
                <Link
                  href={`/blog?category=${encodeURIComponent(blog.category)}`}
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {relatedBlogs.map((rel) => (
                  <Link
                    key={rel.id}
                    href={`/blog/${rel.slug}`}
                    className="group bg-slate-900 border border-slate-800 hover:border-amber-400 rounded-3xl overflow-hidden shadow-lg transition-all flex flex-col justify-between"
                  >
                    <div>
                      <img
                        src={rel.coverImage || '/site/assets/img/blog/blog-1.jpg'}
                        alt={rel.coverImageAlt || rel.title}
                        className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e: any) => {
                          e.currentTarget.src = '/site/assets/img/blog/blog-1.jpg';
                        }}
                      />
                      <div className="p-5 space-y-2">
                        <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                          {rel.category}
                        </span>
                        <h4 className="text-sm font-bold text-slate-100 group-hover:text-amber-400 transition-colors line-clamp-2">
                          {rel.title}
                        </h4>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {rel.excerpt}
                        </p>
                      </div>
                    </div>
                    <div className="p-5 pt-0 flex items-center justify-between text-xs text-slate-500 font-semibold border-t border-slate-800/60 mt-3">
                      <span>{rel.readTime}</span>
                      <span className="text-amber-400 flex items-center gap-1 font-bold group-hover:translate-x-1 transition-transform">
                        <span>Read</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </article>
    </>
  );
}
