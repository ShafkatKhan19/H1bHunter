const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const { Document, Packer, Paragraph, TextRun, convertInchesToTwip } = require('docx');

// Parse PDF resume
async function parsePDFResume(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (err) {
    console.error('PDF parse error:', err);
    throw new Error('Failed to parse PDF resume');
  }
}

// Parse Word resume
async function parseWordResume(filePath) {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (err) {
    console.error('Word parse error:', err);
    throw new Error('Failed to parse Word resume');
  }
}

// Parse any resume format
async function parseResume(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf') {
    return parsePDFResume(filePath);
  } else if (ext === '.docx' || ext === '.doc') {
    return parseWordResume(filePath);
  } else {
    throw new Error('Unsupported file format. Use PDF or Word.');
  }
}

// Generate Word document from resume sections
async function generateResumeDocument(sections) {
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          text: 'RESUME',
          bold: true,
          size: 28,
          spacing: { after: 200 }
        }),
        
        // Summary
        ...(sections.summary ? [
          new Paragraph({
            text: 'PROFESSIONAL SUMMARY',
            bold: true,
            size: 22,
            spacing: { before: 200, after: 100 },
            border: { bottom: { color: '4f8ef7', space: 1, style: 'single', size: 6 } }
          }),
          new Paragraph({
            text: sections.summary,
            spacing: { after: 200 }
          })
        ] : []),
        
        // Skills
        ...(sections.skills ? [
          new Paragraph({
            text: 'SKILLS',
            bold: true,
            size: 22,
            spacing: { before: 200, after: 100 },
            border: { bottom: { color: '4f8ef7', space: 1, style: 'single', size: 6 } }
          }),
          new Paragraph({
            text: sections.skills,
            spacing: { after: 200 }
          })
        ] : []),
        
        // Experience
        ...(sections.experience ? [
          new Paragraph({
            text: 'EXPERIENCE',
            bold: true,
            size: 22,
            spacing: { before: 200, after: 100 },
            border: { bottom: { color: '4f8ef7', space: 1, style: 'single', size: 6 } }
          }),
          new Paragraph({
            text: sections.experience,
            spacing: { after: 200 }
          })
        ] : []),
        
        // Education
        ...(sections.education ? [
          new Paragraph({
            text: 'EDUCATION',
            bold: true,
            size: 22,
            spacing: { before: 200, after: 100 },
            border: { bottom: { color: '4f8ef7', space: 1, style: 'single', size: 6 } }
          }),
          new Paragraph({
            text: sections.education,
            spacing: { after: 200 }
          })
        ] : [])
      ]
    }]
  });

  return await Packer.toBuffer(doc);
}

module.exports = {
  parseResume,
  generateResumeDocument
};
