require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Analyze job for international student safety
async function analyzeJobForInternationalStudents(jobDescription, jobTitle) {
  try {
    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Analyze this job posting for international student safety. 

Job Title: ${jobTitle}

Job Description:
${jobDescription}

Check for:
1. Mentions of H-1B sponsorship, visa sponsorship, or work authorization
2. Mentions of OPT, CPT, or international student restrictions
3. Any language that welcomes or restricts international applicants

Respond in this exact format:
SAFETY_LEVEL: [SAFE|RISKY|UNCLEAR]
REASON: [2-3 sentences explaining the safety assessment]
KEY_FINDINGS: [Comma-separated list of relevant mentions found]`
      }]
    });

    const content = message.content[0].text;
    const safetyMatch = content.match(/SAFETY_LEVEL: (.*)/);
    const reasonMatch = content.match(/REASON: (.*)/);
    const findingsMatch = content.match(/KEY_FINDINGS: (.*)/);

    return {
      safetyLevel: safetyMatch ? safetyMatch[1].trim() : 'UNCLEAR',
      reason: reasonMatch ? reasonMatch[1].trim() : 'Unable to determine',
      findings: findingsMatch ? findingsMatch[1].trim() : 'No specific findings'
    };
  } catch (err) {
    console.error('Claude API error:', err);
    return {
      safetyLevel: 'UNCLEAR',
      reason: 'Analysis not available',
      findings: 'Error during analysis'
    };
  }
}

// Extract job requirements
async function extractJobRequirements(jobDescription) {
  try {
    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Extract the key requirements from this job posting. Return as a comma-separated list of 5-10 most important skills and qualifications.

${jobDescription}

Just return the list, nothing else.`
      }]
    });

    return message.content[0].text.split(',').map(r => r.trim()).filter(r => r);
  } catch (err) {
    console.error('Error extracting requirements:', err);
    return [];
  }
}

// Compare resume to job and suggest improvements
async function generateResumeImprovements(jobDescription, resumeContent, section) {
  try {
    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `You are a professional resume writer. Compare the candidate's resume to the job requirements and suggest improvements for the ${section} section.

JOB DESCRIPTION:
${jobDescription}

CURRENT RESUME (${section.toUpperCase()} SECTION):
${resumeContent}

Provide an improved version of the ${section} section that:
1. Incorporates keywords and requirements from the job
2. Demonstrates relevant experience/skills for this specific role
3. Is professional and impactful
4. Maintains authentic information

Return ONLY the improved section, no explanations.`
      }]
    });

    return message.content[0].text;
  } catch (err) {
    console.error('Error generating resume:', err);
    return resumeContent; // Return original if error
  }
}

// Gap analysis
async function generateGapAnalysis(jobDescription, resumeContent) {
  try {
    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `Analyze the gaps between this job posting and the candidate's resume.

JOB DESCRIPTION:
${jobDescription}

CANDIDATE'S RESUME:
${resumeContent}

Identify:
1. Missing skills or qualifications
2. Weak areas that need strengthening
3. Key requirements not clearly demonstrated
4. Recommendations for improvement

Format as:
MISSING_SKILLS: [list]
WEAK_AREAS: [list]
RECOMMENDATIONS: [list]`
      }]
    });

    const content = message.content[0].text;
    const skillsMatch = content.match(/MISSING_SKILLS: (.*?)(?=\n|WEAK_AREAS)/s);
    const weakMatch = content.match(/WEAK_AREAS: (.*?)(?=\n|RECOMMENDATIONS)/s);
    const recsMatch = content.match(/RECOMMENDATIONS: (.*)/s);

    return {
      missingSkills: skillsMatch ? skillsMatch[1].trim() : '',
      weakAreas: weakMatch ? weakMatch[1].trim() : '',
      recommendations: recsMatch ? recsMatch[1].trim() : ''
    };
  } catch (err) {
    console.error('Error generating gap analysis:', err);
    return {
      missingSkills: 'Analysis unavailable',
      weakAreas: 'Analysis unavailable',
      recommendations: 'Analysis unavailable'
    };
  }
}

module.exports = {
  analyzeJobForInternationalStudents,
  extractJobRequirements,
  generateResumeImprovements,
  generateGapAnalysis
};
