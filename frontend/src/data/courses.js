// Central Courses Data Store with Persistent LocalStorage Support
// Ensures courses created in Admin Panel immediately show across the live public site and student dashboard.

const STORAGE_KEY = '10q_courses_data_fresh_v1';

export function getStoredCourses() {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to parse courses from localStorage:', err);
    return [];
  }
}

export function saveStoredCourses(courses) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
    // Dispatch storage event so open tabs and components react immediately
    window.dispatchEvent(new Event('10q_courses_updated'));
  } catch (err) {
    console.error('Failed to save courses to localStorage:', err);
  }
}

// Fallback empty array for static SSR evaluation
export const coursesData = [];

export const getCourseBySlug = (slug) => {
  if (!slug) return null;
  const currentCourses = getStoredCourses();
  const searchList = currentCourses.length > 0 ? currentCourses : coursesData;
  return (
    searchList.find(
      (c) =>
        (c.slug && c.slug.toLowerCase() === String(slug).toLowerCase()) ||
        String(c.id) === String(slug)
    ) || null
  );
};
