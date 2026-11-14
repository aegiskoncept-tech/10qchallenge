'use client';
import React, { useState, useEffect } from 'react';
import { Link } from '@/src/compat/router';
import { Star, Clock, BookOpen, ArrowRight, ShieldCheck, Flame } from 'lucide-react';
import { coursesData, getStoredCourses } from '../data/courses';

export default function FeaturedCoursesSection({ limit = 6 }) {
  const [courses, setCourses] = useState(() => {
    const stored = getStoredCourses();
    return stored.length > 0 ? stored : coursesData;
  });
  const [isLoading, setIsLoading] = useState(() => {
    const stored = getStoredCourses();
    return stored.length === 0;
  });

  useEffect(() => {
    const handleUpdate = () => {
      const stored = getStoredCourses();
      setCourses(stored.length > 0 ? stored : coursesData);
    };
    handleUpdate();
    window.addEventListener('10q_courses_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    // Fetch live homepage courses from central server database
    fetch('/api/courses?showInIndex=true', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setCourses(json.data);
          saveStoredCourses(json.data);
        }
      })
      .catch((err) => console.warn('[FeaturedCourses] Using local fallback:', err))
      .finally(() => {
        setIsLoading(false);
      });

    return () => {
      window.removeEventListener('10q_courses_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const displayedCourses = courses.slice(0, limit);

  return (
    <section className="py-20 bg-slate-50 text-slate-900 relative border-b border-slate-200 selection:bg-amber-400 selection:text-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12 border-b border-slate-200 pb-6">
          <div className="space-y-1.5">
            <span className="text-amber-800 font-black text-xs uppercase tracking-widest px-3.5 py-1 bg-amber-100 rounded-full inline-flex items-center gap-1.5 border border-amber-200 shadow-xs">
              <Flame className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
              <span>Top Prep Batches</span>
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Featured Entrance Batches
            </h2>
          </div>
          <Link
            to="/course-all"
            className="mt-4 sm:mt-0 inline-flex items-center space-x-2 text-amber-700 hover:text-amber-800 font-bold text-sm bg-white hover:bg-slate-100 px-5 py-2.5 rounded-xl border border-slate-200 shadow-xs transition-all group"
          >
            <span>View All Courses</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Course Cards Grid */}
        {isLoading && displayedCourses.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-3xl overflow-hidden border border-slate-200 animate-pulse shadow-sm">
                <div className="h-52 bg-slate-200" />
                <div className="p-6 space-y-4">
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-6 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 rounded w-full" />
                  <div className="h-10 bg-slate-100 rounded-xl mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : displayedCourses.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-xs space-y-3">
            <BookOpen className="w-10 h-10 text-amber-500 mx-auto" />
            <h3 className="text-lg font-extrabold text-slate-900">No Courses Available Yet</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Courses and batches will appear here once they are created and published from the Admin Panel.
            </p>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {displayedCourses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-3xl overflow-hidden border border-slate-200/90 hover:border-amber-400 shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between group"
            >
              <div>
                {/* Clickable Course Image Header */}
                <Link
                  to={`/course-detail/${course.slug || course.id}`}
                  className="block relative h-52 overflow-hidden bg-slate-100 cursor-pointer"
                  aria-label={`View ${course.title}`}
                >
                  <img
                    src={course.image}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                  
                  {/* Tag Badge */}
                  <span className="absolute top-3.5 left-3.5 bg-amber-400 text-slate-950 font-black text-[11px] uppercase tracking-wider px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                    <Flame className="w-3 h-3 fill-slate-950" />
                    <span>{course.tag || 'BEST SELLER'}</span>
                  </span>

                  {/* Exam Badge */}
                  <span className="absolute top-3.5 right-3.5 bg-slate-950/80 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-lg border border-white/20">
                    {course.exam}
                  </span>

                  {/* Star Rating */}
                  <span className="absolute bottom-3 right-3.5 bg-white/95 text-slate-900 font-bold text-xs px-2.5 py-1 rounded-lg border border-slate-200 shadow flex items-center space-x-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{course.rating || '4.9'}</span>
                    <span className="text-slate-500 text-[10px]">({course.reviewsCount || '120'})</span>
                  </span>
                </Link>

                {/* Course Content */}
                <div className="p-6 space-y-4">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-slate-600">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">{course.mentor || 'Harshal Jain'}</span>
                  </div>

                  <Link to={`/course-detail/${course.slug || course.id}`}>
                    <h3 className="text-lg font-black text-slate-900 group-hover:text-amber-600 transition-colors line-clamp-2 leading-snug cursor-pointer">
                      {course.title}
                    </h3>
                  </Link>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-normal">
                    {course.description || course.shortDescription}
                  </p>

                  <div className="pt-2 flex items-center justify-between text-xs text-slate-600 border-t border-slate-100">
                    <div className="flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>{course.duration || '60+ Hours'}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                      <span>{course.lectures || course.tests || '50+ Lessons'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Price & Enroll Footer */}
              <div className="p-6 pt-0 border-t border-slate-100 mt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-black text-slate-900">
                      ₹{course.price || course.discountedPrice || '4,999'}
                    </span>
                    <span className="text-xs text-slate-400 line-through">
                      ₹{course.originalPrice || '9,999'}
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
                    {course.discount || '50% OFF'}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <Link
                    to={`/course-detail/${course.slug || course.id}`}
                    className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer text-center flex-1 sm:flex-none"
                  >
                    View Details
                  </Link>
                  <Link
                    to={`/course-detail/${course.slug || course.id}`}
                    className="px-4.5 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer text-center flex items-center justify-center gap-1 flex-1 sm:flex-none"
                  >
                    <span>Enroll</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

            </div>
          ))}
        </div>
        )}

      </div>
    </section>
  );
}
