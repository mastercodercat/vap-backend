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

  // Utility method to create temporary directory
  private static ensureTempDir(): string {
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    return tempDir;
  }

  // Utility method to create temporary file
  private static createTempFile(prefix: string, extension: string): string {
    const tempDir = this.ensureTempDir();
    const tempFileName = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2)}${extension}`;
    return path.join(tempDir, tempFileName);
  }

  // Utility method to clean up temporary file
  private static cleanupTempFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.warn('Could not delete temporary file:', filePath);
    }
  }

  // Download file from Firebase Storage URL
  static async downloadFromFirebase(firebaseUrl: string): Promise<Buffer> {
    try {
      const response = await axios.get(firebaseUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });
      return Buffer.from(response.data);
    } catch (error) {
      console.error(
        'Error downloading file from Firebase Storage:',
        error.message,
      );
      throw new Error('Failed to download file from Firebase Storage');
    }
  }

  // Extract text from DOCX buffer (reusable method)
  static extractTextFromDocxBuffer(buffer: Buffer): string {
    try {
      const zip = new PizZip(buffer);

      // Get the document.xml file from the DOCX
      const documentXml = zip.file('word/document.xml');
      if (!documentXml) {
        throw new Error('Could not find document.xml in DOCX file');
      }

      const xmlContent = documentXml.asText();

      // Extract text from XML by removing tags
      let text = xmlContent
        .replace(/<[^>]+>/g, ' ') // Remove XML tags
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim();

      return text;
    } catch (error) {
      console.error('Error extracting text from DOCX buffer:', error.message);
      throw error;
    }
  }

  // Extract text from DOCX file path (legacy support)
  static extractTextFromDocx(filePath: string): string {
    try {
      const content = fs.readFileSync(filePath, 'binary');
      return this.extractTextFromDocxBuffer(Buffer.from(content, 'binary'));
    } catch (error) {
      console.error('Error extracting text from DOCX file:', error.message);
      throw error;
    }
  }

  // Extract text from Firebase Storage URL
  static async extractTextFromFirebaseUrl(
    firebaseUrl: string,
  ): Promise<string> {
    const buffer = await this.downloadFromFirebase(firebaseUrl);
    return this.extractTextFromDocxBuffer(buffer);
  }

  // Extract text from file buffer (for uploaded files)
  static extractTextFromFileBuffer(buffer: Buffer): string {
    return this.extractTextFromDocxBuffer(buffer);
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
          model: 'llama3-70b-8192',
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
    templateUrl: string,
    exportPath: string,
  ): Promise<string> {
    let zip: PizZip;

    if (templateUrl && templateUrl.trim() !== '') {
      // Use existing template file from Firebase Storage
      if (templateUrl.startsWith('http')) {
        try {
          // Download template from Firebase Storage
          const templateBuffer = await this.downloadFromFirebase(templateUrl);
          zip = new PizZip(templateBuffer);
          console.log('✅ Using original document as template');
        } catch (error) {
          console.error(
            'Error downloading template from Firebase:',
            error.message,
          );
          throw new Error('Failed to download template from Firebase Storage');
        }
      } else {
        // Use local file path (legacy support)
        const fileContent = fs.readFileSync(templateUrl, 'binary');
        zip = new PizZip(fileContent);
      }
    } else {
      // Create a basic DOCX structure from scratch
      const basicDocxContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:t>Name: {name}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Email: {email}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Phone: {phone}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Summary: {summary}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Experience:</w:t>
      </w:r>
    </w:p>
    {#experience}
    <w:p>
      <w:r>
        <w:t>{.}</w:t>
      </w:r>
    </w:p>
    {/experience}
    <w:p>
      <w:r>
        <w:t>Education: {education}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Skills: {skills}</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`;

      // Create a minimal DOCX structure
      zip = new PizZip();
      zip.file('word/document.xml', basicDocxContent);
      zip.file(
        '[Content_Types].xml',
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
      );
      zip.file(
        '_rels/.rels',
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
      );
      zip.file(
        'word/_rels/document.xml.rels',
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`,
      );
    }

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
    firebaseStorageService?: any,
    developerId?: string,
  ): Promise<string> {
    const convert = promisify(libre.convert);

    let docxBuf: Buffer;

    // Handle Firebase Storage URL or local file path
    if (importPath.startsWith('http')) {
      // Download from Firebase Storage
      try {
        docxBuf = await this.downloadFromFirebase(importPath);
        console.log(
          '✅ Downloaded DOCX from Firebase Storage for PDF conversion',
        );
      } catch (error) {
        console.error(
          'Error downloading DOCX from Firebase Storage:',
          error.message,
        );
        throw new Error(
          'Failed to download DOCX from Firebase Storage for PDF conversion',
        );
      }
    } else {
      // Read from local file path
      docxBuf = fs.readFileSync(importPath);
    }

    const pdfBuf = await convert(docxBuf, '.pdf', undefined);

    // If Firebase Storage service is provided, upload to Firebase and return URL
    if (firebaseStorageService && developerId) {
      // Generate unique filename for PDF
      const pdfFileName = `pdf-${Date.now()}-${Math.random().toString(36).substring(2)}.pdf`;

      // Upload PDF buffer to Firebase Storage
      const pdfStoragePath = firebaseStorageService.generateStoragePath(
        developerId,
        pdfFileName,
      );

      const pdfUrl = await firebaseStorageService.uploadBuffer(
        pdfBuf,
        pdfStoragePath,
        'application/pdf',
      );

      console.log('✅ PDF uploaded to Firebase Storage');
      return pdfUrl;
    } else {
      // Fallback to local file (legacy support)
      fs.writeFileSync(exportPath, pdfBuf);
      console.log('✅ Resume was transformed to the PDF file locally.');
      return exportPath;
    }
  }

  static extractJSON(text: string): any {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No JSON found in response');
  }

  static async generateResume(
    jobDescription: string,
    originalResumeUrl: string,
    extractedInformation: string,
    isPdf: boolean,
    docxPath: string,
    pdfPath: string,
    firebaseStorageService?: any,
    developerId?: string,
  ): Promise<{ success: boolean; pdfUrl?: string }> {
    if (!extractedInformation) {
      throw new Error('No resume content found');
    }

    // Generate optimized resume using GROQ
    const jsonData = await DocxUtils.generateResumeWithGroq(
      jobDescription,
      extractedInformation,
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

    // Create DOCX file using original document as template
    await DocxUtils.createDocxFile(formattedData, originalResumeUrl, docxPath);

    let pdfUrl: string | undefined;
    if (isPdf) {
      pdfUrl = await DocxUtils.generatePDF(
        docxPath,
        pdfPath,
        firebaseStorageService,
        developerId,
      );
    }

    return {
      success: true,
      pdfUrl,
    };
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
