import axios from 'axios';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { promisify } from 'util';
import { ConfigService } from '@nestjs/config';

// Use require for path to avoid import issues
const path = require('path');
const fs = require('fs');
const libre = require('libreoffice-convert');

export class DocxUtils {
  private static configService: ConfigService;

  static initialize(configService: ConfigService) {
    DocxUtils.configService = configService;
  }

  static getGroqApiKey(): string {
    if (!DocxUtils.configService) {
      throw new Error(
        'DocxUtils not initialized. Call DocxUtils.initialize() first.',
      );
    }

    const apiKey = DocxUtils.configService.get<string>('GROQ_API_KEY');
    if (!apiKey) {
      throw new Error('GROQ_API_KEY not found in environment variables');
    }

    return apiKey;
  }

  static async generateResumeWithGroq(
    jobDescription: string,
    originalResume: string,
  ): Promise<any> {
    const apiKey = DocxUtils.getGroqApiKey();

    const prompt = `
--- JOB DESCRIPTION ---
${jobDescription}

--- ORIGINAL RESUME ---
${originalResume}

--- RULES ---
- Keep resume sections in order: Name, Title, Summary, Work Experience, Skills
- Investigate about the job description and emphasize its main industry and technical skills
- Use technical language and metrics (latency, conversion %, scalability)
- Make it match 100% to the job description but still look professional and human-written
- Work Experience sentence should be advanced, long enough including achievement, technical skills and company project details
- Please list 8 bullet points for the last position, and 5-6 bullet points for other positions for experience section
- List work experience sentences for all jobs in the resume
- Please only use 1-2 skills from relevant skills (like from cloud platforms (AWS, GCP, Azure), please use 1-2 skills from them)
- For skills section, please include all relevant technical skills (like for Java, include Spring Boot and others)
- If there are 5 jobs in a resume, please list 5 positions for work experience. It should be matched to the number of jobs exactly

Please write down professional resume which can match perfectly with the job description. ATS scores must be top. Write down 5-6 advanced professional experiences for each positions. Professional experiences should be matched to the technical skills at that time. Also write down professional skills and find out all possible skills.
Please output the full rewritten resume. Return **only** valid JSON. Return them as a JSON object with the following fields:

- title
- summary
- experience (array of array, remove company name, role, and its details only include professional work experience) (each array inside experience must have 5-6 children, and first array must have 8 children)
- skills (array, categorize skills into several categories, each item inside skills should be text string including skills and category name)
`;

    try {
      const res = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama3-70b-8192', // OR "llama3-8b-8192"
          messages: [
            {
              role: 'system',
              content:
                "You are a professional resume optimizer. Given the job description below, rewrite the candidate's resume to maximize ATS matching and showcase advanced technical experience.",
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const jsonData = DocxUtils.extractJSON(
        res.data.choices[0].message.content,
      );
      console.log('✅ Optimized resume generated successfully');

      return jsonData;
    } catch (error) {
      console.log(error);
      console.error('❌ Error generating resume:', error.message);
      throw error;
    }
  }

  static async createDocxFile(
    content: any,
    importPath: string,
    exportPath: string,
  ): Promise<string> {
    const fileContent = fs.readFileSync(importPath, 'binary');

    const zip = new PizZip(fileContent);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    try {
      doc.render(content);
    } catch (error) {
      console.error(JSON.stringify({ error: error }, null, 2));
      throw error;
    }

    const buffer = doc.getZip().generate({ type: 'nodebuffer' });
    fs.writeFileSync(exportPath, buffer);
    console.log('✅ Docx file generated successfully.');
    return exportPath;
  }

  static async generatePDF(
    importPath: string,
    exportPath: string,
  ): Promise<string> {
    const convert = promisify(libre.convert);
    const docxBuf = fs.readFileSync(importPath);
    const pdfBuf = await convert(docxBuf, '.pdf', undefined);
    fs.writeFileSync(exportPath, pdfBuf);
    console.log('✅ Resume was transformed to the PDF file.');

    return exportPath;
  }

  static extractJSON(text: string): any {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No JSON found in response');
  }

  static extractTextFromDocx(filePath: string): string {
    try {
      const content = fs.readFileSync(filePath, 'binary');
      const zip = new PizZip(content);

      // Get the document.xml file from the DOCX
      const documentXml = zip.file('word/document.xml');
      if (!documentXml) {
        throw new Error('Could not find document.xml in DOCX file');
      }

      const xmlContent = documentXml.asText();

      // Extract text from XML by removing tags
      // This is a simple approach - you might want to use a proper XML parser
      let text = xmlContent
        .replace(/<[^>]+>/g, ' ') // Remove XML tags
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim();

      return text;
    } catch (error) {
      console.error('Error extracting text from DOCX:', error.message);
      throw error;
    }
  }

  static async generateResume(
    jobDescription: string,
    resumePath: string,
    isPdf: boolean,
    docxPath: string,
    pdfPath: string,
  ): Promise<boolean> {
    let originalResume = '';
    let resumeFilePath = '';

    try {
      // Check if resumePath is provided and valid
      if (resumePath && resumePath.trim() !== '') {
        resumeFilePath = path.join(
          process.cwd(),
          resumePath.replace('/uploads/', 'uploads/'),
        );
        console.log('Resume file path:', resumeFilePath);

        if (fs.existsSync(resumeFilePath)) {
          // Check if it's a DOCX file
          if (resumeFilePath.toLowerCase().endsWith('.docx')) {
            originalResume = DocxUtils.extractTextFromDocx(resumeFilePath);
            console.log('✅ Successfully extracted text from DOCX file');
          } else {
            // For other file types, read as text
            originalResume = fs.readFileSync(resumeFilePath, 'utf-8');
            console.log('✅ Successfully read existing resume file');
          }
        } else {
          console.warn('Resume file not found at:', resumeFilePath);
        }
      } else {
        console.warn('No resume path provided, using empty original resume');
      }
    } catch (error) {
      console.warn('Could not read existing resume file:', error.message);
    }

    if (!originalResume) {
      throw new Error('No resume file found');
    }

    // Uncomment the following code when you're ready to use GROQ
    const jsonData = await DocxUtils.generateResumeWithGroq(
      jobDescription,
      originalResume,
    );

    const experience = {};
    if (jsonData.experience && Array.isArray(jsonData.experience)) {
      jsonData.experience.forEach((exp, idx) => {
        experience[idx] = exp.map((sentence) => `${sentence}`);
      });
    }

    const formattedData = {
      ...jsonData,
      experience,
    };

    await DocxUtils.createDocxFile(formattedData, resumeFilePath, docxPath);
    if (isPdf) {
      await DocxUtils.generatePDF(docxPath, pdfPath);
    }

    return true;
  }

  static async extractTitleAndSkillsFromJobDescription(
    jobDescription: string,
  ): Promise<{ title: string; skills: string }> {
    const apiKey = DocxUtils.getGroqApiKey();

    const prompt = `
--- JOB DESCRIPTION ---
${jobDescription}

Please analyze this job description and extract:
1. The job title/position
2. The key technical skills and requirements

Return the result as a JSON object with exactly these fields:
- title: The job title/position (string)
- skills: A comma-separated list of key technical skills (string)

Example response format:
{
  "title": "Senior Software Engineer",
  "skills": "JavaScript, React, Node.js, TypeScript, AWS, Docker, Kubernetes"
}

Please be concise and focus on the most important technical skills mentioned in the job description.
`;

    try {
      const res = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama3-70b-8192',
          messages: [
            {
              role: 'system',
              content:
                'You are a job description analyzer. Extract the job title and key technical skills from job descriptions.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const jsonData = DocxUtils.extractJSON(
        res.data.choices[0].message.content,
      );
      console.log('✅ Title and skills extracted successfully');

      return {
        title: jsonData.title || 'Unknown Position',
        skills: jsonData.skills || 'No skills specified',
      };
    } catch (error) {
      console.error('❌ Error extracting title and skills:', error.message);
      // Return default values if extraction fails
      return {
        title: 'Unknown Position',
        skills: 'No skills specified',
      };
    }
  }
}
