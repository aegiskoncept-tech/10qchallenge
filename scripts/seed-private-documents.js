const fs = require('fs');
const path = require('path');

function createPdfBuffer(title, subtitle) {
  const contentText = `BT
/F1 20 Tf
50 720 Td
(${title}) Tj
/F1 12 Tf
0 -30 Td
(${subtitle}) Tj
/F1 10 Tf
0 -25 Td
(Authoritative Protected Course Material - 10Q Challenge LMS) Tj
0 -20 Td
(Strictly Confidential - For Enrolled Student Use Only) Tj
ET`;

  const streamLength = Buffer.byteLength(contentText, 'utf8');

  let pdf = `%PDF-1.4\n`;
  const offsets = [];

  // Obj 1: Catalog
  offsets.push(Buffer.byteLength(pdf, 'utf8'));
  pdf += `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;

  // Obj 2: Pages
  offsets.push(Buffer.byteLength(pdf, 'utf8'));
  pdf += `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`;

  // Obj 3: Page
  offsets.push(Buffer.byteLength(pdf, 'utf8'));
  pdf += `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n`;

  // Obj 4: Content Stream
  offsets.push(Buffer.byteLength(pdf, 'utf8'));
  pdf += `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${contentText}\nendstream\nendobj\n`;

  // Obj 5: Font
  offsets.push(Buffer.byteLength(pdf, 'utf8'));
  pdf += `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;

  // Xref
  const startXref = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 6\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

  return Buffer.from(pdf, 'utf8');
}

const targetDir = path.join(process.cwd(), 'storage', 'documents');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const docs = [
  {
    filename: 'physics-mechanics-formula-sheet.pdf',
    title: 'Kinematics & Mechanics Formula Handbook',
    subtitle: 'High-Yield Formula Sheet for BITSAT & JEE Main Physics',
  },
  {
    filename: 'chemistry-atomic-structure-mindmap.pdf',
    title: 'Atomic Structure & Periodic Table Mind Maps',
    subtitle: 'High-Speed Visual Memory Maps for Chemistry',
  },
  {
    filename: 'math-calculus-super-tricks.pdf',
    title: 'Calculus Super Tricks & Standard Integrals DPP',
    subtitle: '45 Curated BITSAT & JEE Practice Problems with Solutions',
  },
];

for (const d of docs) {
  const filePath = path.join(targetDir, d.filename);
  const buf = createPdfBuffer(d.title, d.subtitle);
  fs.writeFileSync(filePath, buf);
  console.log(`Generated: ${filePath} (${buf.length} bytes)`);
}

console.log('Successfully seeded private documents storage.');
