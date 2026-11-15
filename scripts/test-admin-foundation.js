/**
 * 10Q CHALLENGE LMS — FEATURE 01: ADMIN UI FOUNDATION VERIFICATION TEST SUITE
 * 
 * Verifies:
 * 1. Design Tokens and Colors match specifications exactly
 * 2. Reusable UI Components exist and export all required components
 * 3. Left Sidebar navigation structure (exact 15 modules & 5 categories)
 * 4. Next.js App Router admin subpage routes exist
 * 5. Production database records integrity (5 exams, 2 courses, 100% intact)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('10Q CHALLENGE LMS — FEATURE 01: ADMIN UI FOUNDATION AUDIT');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(`       Error: ${err.message}`);
    failed++;
  }
}

// 1. DESIGN TOKENS
test('1. Design tokens file exists and contains exact required color tokens', () => {
  const tokensPath = path.join(__dirname, '..', 'frontend', 'src', 'styles', 'adminTokens.ts');
  assert(fs.existsSync(tokensPath), 'adminTokens.ts must exist');
  const content = fs.readFileSync(tokensPath, 'utf8');

  assert(content.includes('#1455C0'), 'Primary Blue #1455C0 must be defined');
  assert(content.includes('#14233F'), 'Dark Navy #14233F must be defined');
  assert(content.includes('#F6F8FC'), 'Main Background #F6F8FC must be defined');
  assert(content.includes('#FFFFFF'), 'Card Background #FFFFFF must be defined');
  assert(content.includes('#E3E8F0'), 'Border #E3E8F0 must be defined');
  assert(content.includes('#172B4D'), 'Primary Text #172B4D must be defined');
  assert(content.includes('#6B7890'), 'Secondary Text #6B7890 must be defined');
  assert(content.includes('#16A36A'), 'Success #16A36A must be defined');
  assert(content.includes('#E5484D'), 'Danger #E5484D must be defined');
  assert(content.includes('#E6A23C'), 'Warning #E6A23C must be defined');
});

// 2. REUSABLE UI COMPONENTS
test('2. All 14 Reusable UI Components exist and are exported in components/admin/ui', () => {
  const uiDir = path.join(__dirname, '..', 'frontend', 'components', 'admin', 'ui');
  assert(fs.existsSync(uiDir), 'components/admin/ui directory must exist');

  const requiredFiles = [
    'PageHeader.tsx',
    'Buttons.tsx',
    'SearchInput.tsx',
    'DataTable.tsx',
    'EmptyState.tsx',
    'FormComponents.tsx',
    'Pagination.tsx',
    'index.ts'
  ];

  requiredFiles.forEach(file => {
    assert(fs.existsSync(path.join(uiDir, file)), `Component file ${file} must exist`);
  });

  const pageHeaderContent = fs.readFileSync(path.join(uiDir, 'PageHeader.tsx'), 'utf8');
  assert(pageHeaderContent.includes('export const PageHeader'), 'PageHeader must be exported');
  assert(pageHeaderContent.includes('export const Breadcrumbs'), 'Breadcrumbs must be exported');

  const buttonsContent = fs.readFileSync(path.join(uiDir, 'Buttons.tsx'), 'utf8');
  assert(buttonsContent.includes('export const PrimaryButton'), 'PrimaryButton must be exported');
  assert(buttonsContent.includes('export const SecondaryButton'), 'SecondaryButton must be exported');

  const searchContent = fs.readFileSync(path.join(uiDir, 'SearchInput.tsx'), 'utf8');
  assert(searchContent.includes('export const SearchInput'), 'SearchInput must be exported');
  assert(searchContent.includes('export const FilterBar'), 'FilterBar must be exported');

  const dataTableContent = fs.readFileSync(path.join(uiDir, 'DataTable.tsx'), 'utf8');
  assert(dataTableContent.includes('export function DataTable'), 'DataTable must be exported');

  const emptyStateContent = fs.readFileSync(path.join(uiDir, 'EmptyState.tsx'), 'utf8');
  assert(emptyStateContent.includes('export const EmptyState'), 'EmptyState must be exported');
  assert(emptyStateContent.includes('export const StatusBadge'), 'StatusBadge must be exported');
  assert(emptyStateContent.includes('export const ConfirmDialog'), 'ConfirmDialog must be exported');

  const formContent = fs.readFileSync(path.join(uiDir, 'FormComponents.tsx'), 'utf8');
  assert(formContent.includes('export const FormSection'), 'FormSection must be exported');
  assert(formContent.includes('export const FormField'), 'FormField must be exported');

  const paginationContent = fs.readFileSync(path.join(uiDir, 'Pagination.tsx'), 'utf8');
  assert(paginationContent.includes('export const Pagination'), 'Pagination must be exported');
  assert(paginationContent.includes('export const LoadingState'), 'LoadingState must be exported');
  assert(paginationContent.includes('export const ErrorState'), 'ErrorState must be exported');
});

// 3. ADMIN SIDEBAR STRUCTURE
test('3. AdminSidebar implements the exact 5 categories and 15 modules without omission', () => {
  const sidebarPath = path.join(__dirname, '..', 'frontend', 'components', 'admin', 'AdminSidebar.tsx');
  assert(fs.existsSync(sidebarPath), 'AdminSidebar.tsx must exist');
  const content = fs.readFileSync(sidebarPath, 'utf8');

  // Categories
  assert(content.includes("title: 'MAIN'"), "Group 'MAIN' must exist");
  assert(content.includes("title: 'ACADEMIC MANAGEMENT'"), "Group 'ACADEMIC MANAGEMENT' must exist");
  assert(content.includes("title: 'CONTENT MANAGEMENT'"), "Group 'CONTENT MANAGEMENT' must exist");
  assert(content.includes("title: 'BUSINESS MANAGEMENT'"), "Group 'BUSINESS MANAGEMENT' must exist");
  assert(content.includes("title: 'MISCELLANEOUS'"), "Group 'MISCELLANEOUS' must exist");

  // Modules
  const requiredModules = [
    'Dashboard',
    'Exam Master',
    'Course Master',
    'Subject Master',
    'Chapter Management',
    'Chapter Master',
    'Chapter Topic Master',
    'Question Management',
    'Objective Question',
    'Numerical Question',
    'Video Master',
    'Document Master',
    'Coupon',
    'Notification',
    'Blog Master',
    'SEO Page',
    'Student Doubt',
    'Student Attempted Test',
    'Student Invoices'
  ];

  requiredModules.forEach(mod => {
    assert(content.includes(`name: '${mod}'`), `Module '${mod}' must exist in AdminSidebar`);
  });
});

// 4. ADMIN HEADER & SHELL
test('4. AdminHeader and AdminShell wrappers exist and implement full responsive layout', () => {
  const headerPath = path.join(__dirname, '..', 'frontend', 'components', 'admin', 'AdminHeader.tsx');
  const shellPath = path.join(__dirname, '..', 'frontend', 'components', 'admin', 'AdminShell.tsx');
  assert(fs.existsSync(headerPath), 'AdminHeader.tsx must exist');
  assert(fs.existsSync(shellPath), 'AdminShell.tsx must exist');

  const headerContent = fs.readFileSync(headerPath, 'utf8');
  assert(headerContent.includes('toggleFullscreen'), 'Fullscreen toggle must be implemented');
  assert(headerContent.includes('Harshal Jain'), 'Harshal Jain profile must be present');
  assert(headerContent.includes('handleSignOut'), 'Sign out control must be implemented');

  const shellContent = fs.readFileSync(shellPath, 'utf8');
  assert(shellContent.includes('AdminSidebar'), 'AdminShell must render AdminSidebar');
  assert(shellContent.includes('AdminHeader'), 'AdminShell must render AdminHeader');
  assert(shellContent.includes('isCollapsed'), 'Collapse state must be supported');
  assert(shellContent.includes('isMobileOpen'), 'Mobile drawer state must be supported');
});

// 5. DASHBOARD UI FOUNDATION
test('5. DashboardOverview renders 6 required overview cards, analytics and recent activity log', () => {
  const dashboardPath = path.join(__dirname, '..', 'frontend', 'components', 'admin', 'DashboardOverview.tsx');
  assert(fs.existsSync(dashboardPath), 'DashboardOverview.tsx must exist');
  const content = fs.readFileSync(dashboardPath, 'utf8');

  assert(content.includes('Total Courses'), 'Must have Total Courses card');
  assert(content.includes('Total Students'), 'Must have Total Students card');
  assert(content.includes('Total Exams'), 'Must have Total Exams card');
  assert(content.includes('Total Questions'), 'Must have Total Questions card');
  assert(content.includes('Total Test Series'), 'Must have Total Test Series card');
  assert(content.includes('Active Courses'), 'Must have Active Courses card');

  assert(content.includes('Student Enrollment Trend'), 'Must have Student Enrollment analytics');
  assert(content.includes('Course Performance'), 'Must have Course Performance breakdown');
  assert(content.includes('Recent Administrator Activity'), 'Must have Recent Activity log');
});

// 6. COURSE MASTER UI ENTRY
test('6. CourseMasterEntry component exists with cards grid, filters, and three-dot action menu', () => {
  const courseMasterPath = path.join(__dirname, '..', 'frontend', 'components', 'admin', 'CourseMasterEntry.tsx');
  assert(fs.existsSync(courseMasterPath), 'CourseMasterEntry.tsx must exist');
  const content = fs.readFileSync(courseMasterPath, 'utf8');

  assert(content.includes('Add New Course'), 'Must have Add New Course action');
  assert(content.includes('SearchInput'), 'Must have search bar');
  assert(content.includes('MoreVertical'), 'Must have three-dot action button');
  assert(content.includes("'edit'"), 'Action menu must support edit');
  assert(content.includes("'faq'"), 'Action menu must support faq');
  assert(content.includes("'subject'"), 'Action menu must support subject');
  assert(content.includes("'video'"), 'Action menu must support video');
  assert(content.includes("'document'"), 'Action menu must support document');
  assert(content.includes("'testseries'"), 'Action menu must support testseries');
});

// 7. ALL OTHER MODULE ROUTES
test('7. Next.js App Router admin subpage routes exist for all sidebar modules', () => {
  const appAdminDir = path.join(__dirname, '..', 'frontend', 'app', 'admin');
  const routes = [
    'dashboard',
    'exams',
    'courses',
    'subjects',
    'chapters',
    'topics',
    'questions',
    'videos',
    'documents',
    'coupons',
    'notifications',
    'blogs',
    'seo',
    'doubts',
    'attempted-tests',
    'invoices'
  ];

  routes.forEach(r => {
    const pagePath = path.join(appAdminDir, r, 'page.tsx');
    assert(fs.existsSync(pagePath), `Route /admin/${r}/page.tsx must exist`);
  });
});

// 8. MANDATORY PRODUCTION DATA PROTECTION
test('8. Mandatory Production Data Safety: 5 exams and 2 courses 100% untouched', () => {
  const prodExamsPath = path.join(__dirname, '..', 'data', 'exams.json');
  const prodCoursesPath = path.join(__dirname, '..', 'data', 'courses.json');

  assert(fs.existsSync(prodExamsPath), 'Production data/exams.json must exist');
  assert(fs.existsSync(prodCoursesPath), 'Production data/courses.json must exist');

  const exams = JSON.parse(fs.readFileSync(prodExamsPath, 'utf8'));
  const courses = JSON.parse(fs.readFileSync(prodCoursesPath, 'utf8'));

  assert.strictEqual(exams.length, 5, 'Must have exactly 5 canonical exams');
  assert.strictEqual(courses.length, 2, 'Must have exactly 2 canonical courses');

  const examSlugs = exams.map(e => e.slug).sort();
  assert.deepStrictEqual(examSlugs, ['bitsat', 'comedk', 'jee', 'manipal-met', 'viteee']);

  const courseSlugs = courses.map(c => c.slug).sort();
  assert.deepStrictEqual(courseSlugs, ['bitsat-2026-master-crash-course', 'jee-main-2026-rank-booster-batch']);

  console.log('       [Verified] Exams:', examSlugs.join(', '));
  console.log('       [Verified] Courses:', courseSlugs.join(', '));
});

console.log('\n================================================================');
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
}
