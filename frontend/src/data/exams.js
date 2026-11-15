export const examsData = {
  BITSAT: {
    name: "BITSAT 2026",
    fullName: "Birla Institute of Technology and Science Admission Test",
    heroTitle: "Ace BITSAT 2026 with BITSian Alumni Mentors",
    description: "Master the speed and accuracy needed for BITS Pilani, Goa & Hyderabad campuses with India's #1 dedicated BITSAT prep platform.",
    totalQuestions: 130,
    duration: "3 Hours (180 Minutes)",
    markingScheme: "+3 for Correct, -1 for Incorrect",
    sections: [
      { name: "Physics", questions: 30 },
      { name: "Chemistry", questions: 30 },
      { name: "Mathematics / Biology", questions: 40 },
      { name: "English Proficiency", questions: 10 },
      { name: "Logical Reasoning", questions: 20 }
    ],
    features: [
      "130 Questions + 12 Bonus Questions Strategy",
      "AI-driven speed & accuracy analytical dashboard",
      "Live doubt clearing sessions by top BITSians",
      "Full syllabus mock test series per latest pattern"
    ]
  },
  Comedk: {
    name: "COMEDK UGET 2026",
    fullName: "Consortium of Medical, Engineering and Dental Colleges of Karnataka",
    heroTitle: "Crack COMEDK 2026 & Secure Top Engineering Colleges in Karnataka",
    description: "Comprehensive crash courses and mock tests for top Karnataka colleges like RVCE, BMSCE, and MSRIT.",
    totalQuestions: 180,
    duration: "3 Hours (180 Minutes)",
    markingScheme: "+1 for Correct, 0 for Incorrect (No Negative Marking)",
    sections: [
      { name: "Physics", questions: 60 },
      { name: "Chemistry", questions: 60 },
      { name: "Mathematics", questions: 60 }
    ],
    features: [
      "180 Questions in 180 Minutes Speed Drills",
      "Chapterwise high-yield question banks",
      "Previous 10 Years Solved Papers with video solutions",
      "No negative marking strategic guessing techniques"
    ]
  },
  JEE: {
    name: "JEE Main & Advanced 2026",
    fullName: "Joint Entrance Examination",
    heroTitle: "Target IITs & NITs with JEE Master Batches",
    description: "Rigorous concept building, multi-conceptual problem solving, and rank predictor tests curated by IITian toppers.",
    totalQuestions: 75,
    duration: "3 Hours",
    markingScheme: "+4 for Correct, -1 for Incorrect",
    sections: [
      { name: "Physics", questions: 25 },
      { name: "Chemistry", questions: 25 },
      { name: "Mathematics", questions: 25 }
    ],
    features: [
      "In-depth concept lectures from basics to Advanced level",
      "Daily Practice Problems (DPPs) with video hints",
      "Adaptive test engine matching NTA exam interface",
      "Personal mentorship for exam pressure management"
    ]
  },
  MET: {
    name: "Manipal (MET) 2026",
    fullName: "Manipal Entrance Test",
    heroTitle: "Secure Top Rank in MET 2026 for Manipal Tech Campuses",
    description: "Dedicated preparation module for Manipal Institute of Technology (MIT Manipal, Jaipur & Bengaluru).",
    totalQuestions: 60,
    duration: "2 Hours (120 Minutes)",
    markingScheme: "+4 for MCQ (+1 for Numerical), -1 for incorrect MCQ",
    sections: [
      { name: "Physics", questions: 15 },
      { name: "Chemistry", questions: 15 },
      { name: "Mathematics", questions: 20 },
      { name: "English", questions: 10 }
    ],
    features: [
      "Shortcuts and speed recall techniques",
      "MET specific mock tests with instant percentile predictor",
      "English section scoring strategies",
      "Doubt resolution support till rank counseling"
    ]
  },
  VITEEE: {
    name: "VITEEE 2026",
    fullName: "Vellore Institute of Technology Engineering Entrance Examination",
    heroTitle: "Excel in VITEEE 2026 & Land CSE Category 1",
    description: "Tailored preparation designed to get you under Rank 5000 in VITEEE for VIT Vellore and Chennai.",
    totalQuestions: 125,
    duration: "2.5 Hours (150 Minutes)",
    markingScheme: "+1 for Correct, 0 for Incorrect",
    sections: [
      { name: "Physics", questions: 35 },
      { name: "Chemistry", questions: 35 },
      { name: "Mathematics", questions: 40 },
      { name: "Aptitude", questions: 10 },
      { name: "English", questions: 5 }
    ],
    features: [
      "Targeted speed practice for 125 questions",
      "Category 1 target strategy workshops",
      "Aptitude & English high score masterclasses",
      "10 Full length mock tests in real exam portal layout"
    ]
  }
};

// ============================================================================
// CENTRAL EXAM MASTER CLIENT SYNCHRONIZATION HELPERS
// ============================================================================

const EXAMS_STORAGE_KEY = '10q_exams_data_fresh_v1';

export function getStoredExams() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(EXAMS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to parse exams from localStorage:', err);
    return [];
  }
}

export function saveStoredExams(exams) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(EXAMS_STORAGE_KEY, JSON.stringify(exams));
    window.dispatchEvent(new Event('10q_exams_updated'));
  } catch (err) {
    console.error('Failed to save exams to localStorage:', err);
  }
}

// Fetch public active exams from central database
export async function fetchServerExams() {
  try {
    const res = await fetch('/api/exams', { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        saveStoredExams(json.data);
        return json.data;
      }
    }
  } catch (err) {
    console.warn('[Exams API] Failed to fetch server exams, using cached fallback:', err);
  }
  return getStoredExams();
}

// Fetch admin exams (with course counts and search filter)
export async function fetchAdminExams(searchTerm = '') {
  try {
    const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '';
    const res = await fetch(`/api/admin/exams${query}`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        saveStoredExams(json.data);
        return json.data;
      }
    }
  } catch (err) {
    console.warn('[Admin Exams API] Failed to fetch admin exams:', err);
  }
  return getStoredExams();
}

// Create new exam in central database
export async function apiCreateExam(examData, adminUser = 'Administrator') {
  try {
    const res = await fetch('/api/admin/exams', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-user': adminUser,
      },
      body: JSON.stringify(examData),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to create exam in Exam Master.');
    }

    await fetchAdminExams();
    return json.data;
  } catch (err) {
    console.error('[Create Exam Error]', err);
    throw err;
  }
}

// Update existing exam in central database
export async function apiUpdateExam(id, examData, adminUser = 'Administrator') {
  try {
    const res = await fetch(`/api/admin/exams/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-user': adminUser,
      },
      body: JSON.stringify(examData),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to update exam in Exam Master.');
    }

    await fetchAdminExams();
    return json.data;
  } catch (err) {
    console.error('[Update Exam Error]', err);
    throw err;
  }
}

// Delete exam with dependency check
export async function apiDeleteExam(id) {
  try {
    const res = await fetch(`/api/admin/exams/${id}`, {
      method: 'DELETE',
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to delete exam.');
    }

    await fetchAdminExams();
    return true;
  } catch (err) {
    console.error('[Delete Exam Error]', err);
    throw err;
  }
}
