-- ==============================================================================
-- 10Q CHALLENGE LMS — POSTGRESQL DATA SEED FROM CANONICAL JSON STORAGE
-- Generated: 2026-11-18T14:42:37.513Z
-- Preserves Exact Primary Keys (IDs), Foreign Keys & Academic Relationships
-- ==============================================================================

BEGIN;

-- 1. EXAMS (5 records)
INSERT INTO "Exam" ("id", "examName", "slug", "description", "displayIndex", "isActive", "createdAt", "updatedAt")
VALUES (1, 'BITSAT', 'bitsat', 'BITSAT Prep', 1, true, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "examName" = EXCLUDED."examName", "slug" = EXCLUDED."slug";
INSERT INTO "Exam" ("id", "examName", "slug", "description", "displayIndex", "isActive", "createdAt", "updatedAt")
VALUES (2, 'Comedk', 'comedk', 'COMEDK Prep', 2, true, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "examName" = EXCLUDED."examName", "slug" = EXCLUDED."slug";
INSERT INTO "Exam" ("id", "examName", "slug", "description", "displayIndex", "isActive", "createdAt", "updatedAt")
VALUES (3, 'JEE', 'jee', 'JEE Prep', 3, true, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "examName" = EXCLUDED."examName", "slug" = EXCLUDED."slug";
INSERT INTO "Exam" ("id", "examName", "slug", "description", "displayIndex", "isActive", "createdAt", "updatedAt")
VALUES (4, 'Manipal (MET)', 'manipal-met', 'MET Prep', 4, true, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "examName" = EXCLUDED."examName", "slug" = EXCLUDED."slug";
INSERT INTO "Exam" ("id", "examName", "slug", "description", "displayIndex", "isActive", "createdAt", "updatedAt")
VALUES (5, 'VITEEE', 'viteee', 'VITEEE Prep', 5, true, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "examName" = EXCLUDED."examName", "slug" = EXCLUDED."slug";

-- 2. SUBJECTS (5 records)
INSERT INTO "Subject" ("id", "subjectCode", "subjectName", "slug", "description", "displayIndex", "isActive", "createdAt", "updatedAt")
VALUES (1, '101', 'Physics', 'physics', 'Comprehensive physics curriculum covering Mechanics, Electrodynamics, Optics, and Modern Physics.', 1, true, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "subjectName" = EXCLUDED."subjectName", "slug" = EXCLUDED."slug";
INSERT INTO "Subject" ("id", "subjectCode", "subjectName", "slug", "description", "displayIndex", "isActive", "createdAt", "updatedAt")
VALUES (2, '201', 'Chemistry', 'chemistry', 'Organic, Inorganic, and Physical Chemistry modules with formula sheets.', 2, true, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "subjectName" = EXCLUDED."subjectName", "slug" = EXCLUDED."slug";
INSERT INTO "Subject" ("id", "subjectCode", "subjectName", "slug", "description", "displayIndex", "isActive", "createdAt", "updatedAt")
VALUES (3, '301', 'Mathematics', 'mathematics', 'Calculus, Algebra, Coordinate Geometry, Trigonometry, and Vectors.', 3, true, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "subjectName" = EXCLUDED."subjectName", "slug" = EXCLUDED."slug";
INSERT INTO "Subject" ("id", "subjectCode", "subjectName", "slug", "description", "displayIndex", "isActive", "createdAt", "updatedAt")
VALUES (4, '204', 'LR & English', 'lr-english', 'Logical Reasoning and English Proficiency for BITSAT & engineering entrance exams.', 4, true, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "subjectName" = EXCLUDED."subjectName", "slug" = EXCLUDED."slug";
INSERT INTO "Subject" ("id", "subjectCode", "subjectName", "slug", "description", "displayIndex", "isActive", "createdAt", "updatedAt")
VALUES (5, '302', 'Aptitude', 'aptitude', 'Quantitative aptitude, analytical problem solving, and data interpretation.', 5, true, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "subjectName" = EXCLUDED."subjectName", "slug" = EXCLUDED."slug";

-- 3. COURSES (2 records)
INSERT INTO "Course" ("id", "examId", "title", "slug", "shortDescription", "description", "originalPrice", "discountedPrice", "discountString", "expiryDate", "enrolledStudent", "displayIndex", "additionalDetails", "image", "bannerImage", "altCourseImage", "altBannerImage", "scheduleFile", "metaTitle", "metaDescription", "courseLink", "isShowInIndex", "isActive", "isShowInMentorship", "isShowInTestSeries", "rating", "reviewsCount", "mentor", "createdBy", "updatedBy", "createdAt", "updatedAt")
VALUES (1, 1, 'BITSAT 2026 Master Crash Course (Updated Batch)', 'bitsat-2026-master-crash-course', 'Complete 60-day intensive crash course by BITSians', '<p>Comprehensive BITSAT preparation batch with full mocks and shortcuts.</p>', 9999, 4999, '50% OFF', '2026-06-30', 1450, 1, 'Includes 1-on-1 mentorship & 25 full mock tests', '/uploads/courses/bitsat-crash-thumb.png', '/uploads/courses/bitsat-crash-banner.png', 'BITSAT 2026 Crash Course Thumbnail', 'BITSAT 2026 Banner', '/uploads/courses/bitsat-roadmap.pdf', 'BITSAT 2026 Master Crash Course | 10Q Challenge', 'Crack BITSAT 2026 with toppers guidance.', '/course-detail/bitsat-2026-master-crash-course', true, true, false, true, 4.9, 142, 'Harshal Jain', 'Admin_A@10qchallenge.in', 'Master Admin (test.admin@10qchallenge.in)', NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "title" = EXCLUDED."title", "slug" = EXCLUDED."slug";
INSERT INTO "Course" ("id", "examId", "title", "slug", "shortDescription", "description", "originalPrice", "discountedPrice", "discountString", "expiryDate", "enrolledStudent", "displayIndex", "additionalDetails", "image", "bannerImage", "altCourseImage", "altBannerImage", "scheduleFile", "metaTitle", "metaDescription", "courseLink", "isShowInIndex", "isActive", "isShowInMentorship", "isShowInTestSeries", "rating", "reviewsCount", "mentor", "createdBy", "updatedBy", "createdAt", "updatedAt")
VALUES (2, 3, 'JEE Main 2026 Rank Booster Batch', 'jee-main-2026-rank-booster-batch', 'Formula shortcut tricks and speed problem solving', '<p>Master Physics, Chemistry and Mathematics for JEE Main 2026.</p>', 12999, 5999, '54% OFF', '2026-05-31', 980, 2, 'Daily DPPs and weekly live doubt clearance', '/uploads/courses/jee-rank-booster-thumb.png', '/uploads/courses/jee-rank-booster-banner.png', 'JEE Main 2026 Booster Thumbnail', 'JEE Main Banner', '/uploads/courses/jee-roadmap.pdf', 'JEE Main 2026 Rank Booster | 10Q Challenge', 'Target 99+ percentile in JEE Main 2026.', '/course-detail/jee-main-2026-rank-booster-batch', true, true, true, false, 4.8, 88, 'IIT-BITS Faculty Panel', 'Admin_B@10qchallenge.in', 'Admin_B@10qchallenge.in', NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "title" = EXCLUDED."title", "slug" = EXCLUDED."slug";

-- 4. CHAPTERS (7 records)
INSERT INTO "Chapter" ("id", "courseId", "subjectId", "chapterName", "chapterCode", "slug", "description", "displayOrder", "isActive", "createdAt", "updatedAt")
VALUES (1, 1, 1, 'Mechanics & Kinematics', 'BIT-PHY-01', 'bitsat-physics-mechanics-kinematics', 'Vectors, 1D/2D Kinematics, Newton laws, Friction, and Work-Energy-Power.', 1, true, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "chapterName" = EXCLUDED."chapterName", "slug" = EXCLUDED."slug";
INSERT INTO "Chapter" ("id", "courseId", "subjectId", "chapterName", "chapterCode", "slug", "description", "displayOrder", "isActive", "createdAt", "updatedAt")
VALUES (2, 1, 1, 'Rotational Motion & Gravitation', 'BIT-PHY-02', 'bitsat-physics-rotational-motion-gravitation', 'Center of mass, Moment of inertia, Torque, Angular momentum, and Gravitation.', 2, true, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "chapterName" = EXCLUDED."chapterName", "slug" = EXCLUDED."slug";
INSERT INTO "Chapter" ("id", "courseId", "subjectId", "chapterName", "chapterCode", "slug", "description", "displayOrder", "isActive", "createdAt", "updatedAt")
VALUES (3, 1, 2, 'Physical Chemistry: Atomic Structure & Solutions', 'BIT-CHEM-01', 'bitsat-chemistry-atomic-structure-solutions', 'Quantum numbers, Electronic configuration, Raoult law, and Colligative properties.', 1, true, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "chapterName" = EXCLUDED."chapterName", "slug" = EXCLUDED."slug";
INSERT INTO "Chapter" ("id", "courseId", "subjectId", "chapterName", "chapterCode", "slug", "description", "displayOrder", "isActive", "createdAt", "updatedAt")
VALUES (4, 1, 3, 'Calculus: Limits, Continuity & Derivatives', 'BIT-MATH-01', 'bitsat-math-calculus-limits-derivatives', 'L’Hopital rule, Differentiability, Tangents and Normals, and Maxima-Minima.', 1, true, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "chapterName" = EXCLUDED."chapterName", "slug" = EXCLUDED."slug";
INSERT INTO "Chapter" ("id", "courseId", "subjectId", "chapterName", "chapterCode", "slug", "description", "displayOrder", "isActive", "createdAt", "updatedAt")
VALUES (5, 2, 1, 'Mechanics: Laws of Motion & Momentum', 'JEE-PHY-01', 'jee-physics-laws-of-motion-momentum', 'Newtonian dynamics, Impulse-momentum theorem, Collisions in 1D and 2D.', 1, true, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "chapterName" = EXCLUDED."chapterName", "slug" = EXCLUDED."slug";
INSERT INTO "Chapter" ("id", "courseId", "subjectId", "chapterName", "chapterCode", "slug", "description", "displayOrder", "isActive", "createdAt", "updatedAt")
VALUES (6, 2, 1, 'Thermodynamics & Heat Transfer', 'JEE-PHY-02', 'jee-physics-thermodynamics-heat-transfer', 'First and second laws of thermodynamics, Carnot cycle, and Thermal radiation.', 2, true, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "chapterName" = EXCLUDED."chapterName", "slug" = EXCLUDED."slug";
INSERT INTO "Chapter" ("id", "courseId", "subjectId", "chapterName", "chapterCode", "slug", "description", "displayOrder", "isActive", "createdAt", "updatedAt")
VALUES (7, 2, 2, 'Chemical Bonding & Molecular Structure', 'JEE-CHEM-01', 'jee-chemistry-chemical-bonding', 'VSEPR theory, Hybridization, Molecular orbital theory, and Hydrogen bonding.', 1, true, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "chapterName" = EXCLUDED."chapterName", "slug" = EXCLUDED."slug";

-- 5. TOPICS (10 records)
INSERT INTO "Topic" ("id", "chapterId", "courseId", "subjectId", "topicName", "topicCode", "slug", "description", "displayOrder", "isActive", "createdAt", "updatedAt")
VALUES (1, 1, 1, 1, 'Vectors & Coordinate Systems', 'TOP-PHY-01', 'bitsat-physics-mechanics-vectors', 'Vector addition, dot product, cross product, resolution of vectors in 2D and 3D.', 1, true, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "topicName" = EXCLUDED."topicName", "slug" = EXCLUDED."slug";
INSERT INTO "Topic" ("id", "chapterId", "courseId", "subjectId", "topicName", "topicCode", "slug", "description", "displayOrder", "isActive", "createdAt", "updatedAt")
VALUES (2, 1, 1, 1, '1D & 2D Motion under Gravity', 'TOP-PHY-02', 'bitsat-physics-mechanics-motion-gravity', 'Kinematic equations, relative velocity, and projectile motion equations.', 2, true, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "topicName" = EXCLUDED."topicName", "slug" = EXCLUDED."slug";
INSERT INTO "Topic" ("id", "chapterId", "courseId", "subjectId", "topicName", "topicCode", "slug", "description", "displayOrder", "isActive", "createdAt", "updatedAt")
VALUES (3, 1, 1, 1, 'Newton''s Laws of Motion & Friction', 'TOP-PHY-03', 'bitsat-physics-mechanics-newtons-laws', 'Free body diagrams, static and kinetic friction, pulley-block systems.', 3, true, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "topicName" = EXCLUDED."topicName", "slug" = EXCLUDED."slug";
INSERT INTO "Topic" ("id", "chapterId", "courseId", "subjectId", "topicName", "topicCode", "slug", "description", "displayOrder", "isActive", "createdAt", "updatedAt")
VALUES (4, 1, 1, 1, 'Work, Energy & Power Theorems', 'TOP-PHY-04', 'bitsat-physics-mechanics-work-energy', 'Work-energy theorem, conservative forces, potential energy curves, power.', 4, true, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "topicName" = EXCLUDED."topicName", "slug" = EXCLUDED."slug";
INSERT INTO "Topic" ("id", "chapterId", "courseId", "subjectId", "topicName", "topicCode", "slug", "description", "displayOrder", "isActive", "createdAt", "updatedAt")
VALUES (5, 2, 1, 1, 'Center of Mass & Linear Momentum', 'TOP-PHY-05', 'bitsat-physics-rotational-center-of-mass', 'Discrete and continuous mass distribution, conservation of momentum, explosion problems.', 1, true, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "topicName" = EXCLUDED."topicName", "slug" = EXCLUDED."slug";
INSERT INTO "Topic" ("id", "chapterId", "courseId", "subjectId", "topicName", "topicCode", "slug", "description", "displayOrder", "isActive", "createdAt", "updatedAt")
VALUES (6, 2, 1, 1, 'Moment of Inertia & Torque Analysis', 'TOP-PHY-06', 'bitsat-physics-rotational-torque-inertia', 'Parallel and perpendicular axis theorems, angular momentum conservation, rolling without slipping.', 2, true, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "topicName" = EXCLUDED."topicName", "slug" = EXCLUDED."slug";
INSERT INTO "Topic" ("id", "chapterId", "courseId", "subjectId", "topicName", "topicCode", "slug", "description", "displayOrder", "isActive", "createdAt", "updatedAt")
VALUES (7, 4, 1, 3, 'Limits & L''Hopital''s Rule', 'TOP-MATH-01', 'bitsat-math-calculus-limits-lhopital', 'Standard limits, indeterminate forms, series expansions, rationalization techniques.', 1, true, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "topicName" = EXCLUDED."topicName", "slug" = EXCLUDED."slug";
INSERT INTO "Topic" ("id", "chapterId", "courseId", "subjectId", "topicName", "topicCode", "slug", "description", "displayOrder", "isActive", "createdAt", "updatedAt")
VALUES (8, 4, 1, 3, 'Continuity & Differentiability', 'TOP-MATH-02', 'bitsat-math-calculus-continuity-differentiability', 'Left and right limits, jump discontinuities, differentiability criteria.', 2, true, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "topicName" = EXCLUDED."topicName", "slug" = EXCLUDED."slug";
INSERT INTO "Topic" ("id", "chapterId", "courseId", "subjectId", "topicName", "topicCode", "slug", "description", "displayOrder", "isActive", "createdAt", "updatedAt")
VALUES (9, 5, 2, 1, 'Newton''s First & Second Laws', 'JEE-TOP-01', 'jee-physics-laws-of-motion-first-second', 'Inertial reference frames, constraint relations, pseudo-force problems.', 1, true, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "topicName" = EXCLUDED."topicName", "slug" = EXCLUDED."slug";
INSERT INTO "Topic" ("id", "chapterId", "courseId", "subjectId", "topicName", "topicCode", "slug", "description", "displayOrder", "isActive", "createdAt", "updatedAt")
VALUES (10, 5, 2, 1, 'Conservation of Linear Momentum & Collisions', 'JEE-TOP-02', 'jee-physics-laws-of-motion-momentum-collisions', 'Elastic and inelastic collisions, coefficient of restitution, oblique impacts.', 2, true, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "topicName" = EXCLUDED."topicName", "slug" = EXCLUDED."slug";

-- 6. QUESTIONS (5 records)
INSERT INTO "Question" ("id", "subjectId", "chapterId", "questionType", "questionContent", "optionA", "optionB", "optionC", "optionD", "correctOption", "numericalAnswer", "explanation", "difficulty", "orderNumber", "isActive", "createdAt", "updatedAt")
VALUES (1, 1, 1, 'OBJECTIVE', 'A particle moves along a straight line such that its displacement x at time t is given by x = 3t² - 12t + 9. At what time is the velocity of the particle zero?', 't = 1 s', 't = 2 s', 't = 3 s', 't = 4 s', 'B', NULL, 'Velocity v = dx/dt = d(3t² - 12t + 9)/dt = 6t - 12. Setting v = 0 gives 6t - 12 = 0 => t = 2 seconds.', 'MEDIUM', 1, true, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "questionContent" = EXCLUDED."questionContent";
INSERT INTO "Question" ("id", "subjectId", "chapterId", "questionType", "questionContent", "optionA", "optionB", "optionC", "optionD", "correctOption", "numericalAnswer", "explanation", "difficulty", "orderNumber", "isActive", "createdAt", "updatedAt")
VALUES (2, 1, 2, 'OBJECTIVE', 'A solid uniform sphere of mass M and radius R rolls down an inclined plane of height h without slipping. What is the speed of its center of mass upon reaching the bottom?', '√(2gh)', '√(4gh/3)', '√(10gh/7)', '√(5gh/3)', 'C', NULL, 'By conservation of mechanical energy: Mgh = ½Mv² + ½Iω². For a solid sphere, I = ⅖MR² and ω = v/R. Thus Mgh = ½Mv² + ⅕Mv² = ⁷/₁₀Mv² => v = √(10gh/7).', 'MEDIUM', 2, true, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "questionContent" = EXCLUDED."questionContent";
INSERT INTO "Question" ("id", "subjectId", "chapterId", "questionType", "questionContent", "optionA", "optionB", "optionC", "optionD", "correctOption", "numericalAnswer", "explanation", "difficulty", "orderNumber", "isActive", "createdAt", "updatedAt")
VALUES (3, 3, 4, 'OBJECTIVE', 'Evaluate the limit: lim (x -> 0) [sin(5x) / x].', '0', '1', '5', 'Does not exist', 'C', NULL, 'Standard trigonometric limit: lim (u -> 0) [sin(u)/u] = 1. Multiplying and dividing by 5 gives: lim (5 * sin(5x)/(5x)) = 5 * 1 = 5.', 'MEDIUM', 1, true, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "questionContent" = EXCLUDED."questionContent";
INSERT INTO "Question" ("id", "subjectId", "chapterId", "questionType", "questionContent", "optionA", "optionB", "optionC", "optionD", "correctOption", "numericalAnswer", "explanation", "difficulty", "orderNumber", "isActive", "createdAt", "updatedAt")
VALUES (4, 1, 1, 'NUMERICAL', 'A block of mass 2 kg rests on a frictionless horizontal plane. A constant horizontal force of 10 N is applied to it. Calculate the acceleration of the block in m/s².', '', '', '', '', '', NULL, 'According to Newton''s Second Law: a = F / m = 10 N / 2 kg = 5.00 m/s².', 'MEDIUM', 1, true, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "questionContent" = EXCLUDED."questionContent";
INSERT INTO "Question" ("id", "subjectId", "chapterId", "questionType", "questionContent", "optionA", "optionB", "optionC", "optionD", "correctOption", "numericalAnswer", "explanation", "difficulty", "orderNumber", "isActive", "createdAt", "updatedAt")
VALUES (5, 1, 2, 'NUMERICAL', 'A flywheel with a moment of inertia of 0.40 kg·m² is acted upon by a constant net torque of 2.0 N·m. Determine its angular acceleration in rad/s².', '', '', '', '', '', NULL, 'Torque equation: τ = I * α => α = τ / I = 2.0 / 0.40 = 5.00 rad/s².', 'MEDIUM', 2, true, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "questionContent" = EXCLUDED."questionContent";

-- Reset sequence counters to max IDs to allow future auto-increments
SELECT setval(pg_get_serial_sequence('"Exam"', 'id'), coalesce(max(id), 1)) FROM "Exam";
SELECT setval(pg_get_serial_sequence('"Subject"', 'id'), coalesce(max(id), 1)) FROM "Subject";
SELECT setval(pg_get_serial_sequence('"Course"', 'id'), coalesce(max(id), 1)) FROM "Course";
SELECT setval(pg_get_serial_sequence('"Chapter"', 'id'), coalesce(max(id), 1)) FROM "Chapter";
SELECT setval(pg_get_serial_sequence('"Topic"', 'id'), coalesce(max(id), 1)) FROM "Topic";
SELECT setval(pg_get_serial_sequence('"Question"', 'id'), coalesce(max(id), 1)) FROM "Question";

COMMIT;
