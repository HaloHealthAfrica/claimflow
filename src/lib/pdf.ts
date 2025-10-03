// PDF generation service for claims and appeals
import PDFDocument from 'pdfkit';
import { createAuditLog } from './db';
import { createAuditLog } from './db';
// import { createAuditLog } from './db';

// Interfaces for PDF generation
export interface ClaimPDFData {
  id?: string;
  providerName: string;
  providerNpi?: string;
  providerAddress?: string;
  providerPhone?: string;
  dateOfService: Date;
  amountCents: number;
  cptCodes: string[];
  icdCodes: string[];
  description?: string;
  patientName?: string;
  patientDob?: Date;
  patientAddress?: string;
  insuranceInfo?: {
    insurerName?: string;
    memberId?: string;
    groupId?: string;
    payerId?: string;
  };
  submissionDate?: Date;
  claimNumber?: string;
}

export interface AppealPDFData {
  claimId: string;
  claimNumber?: string;
  denialReason: string;
  appealLetter: string;
  patientName?: string;
  providerName: string;
  dateOfService: Date;
  amountCents: number;
  insuranceInfo?: {
    insurerName?: string;
    memberId?: string;
  };
  appealDate: Date;
}

// PDF generation configuration
const PDF_CONFIG = {
  pageSize: 'LETTER' as const,
  margins: {
    top: 72,    // 1 inch
    bottom: 72, // 1 inch
    left: 72,   // 1 inch
    right: 72,  // 1 inch
  },
  fonts: {
    regular: 'Helvetica',
    bold: 'Helvetica-Bold',
    italic: 'Helvetica-Oblique',
  },
  colors: {
    primary: '#1f2937',
    secondary: '#6b7280',
    accent: '#2563eb',
    success: '#059669',
    warning: '#d97706',
    error: '#dc2626',
  },
};

// Generate claim form PDF following CMS-1500 standards
export async function generateClaimPDF(
  claimData: ClaimPDFData,
  userId: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: PDF_CONFIG.pageSize,
        margins: PDF_CONFIG.margins,
        info: {
          Title: `Insurance Claim - ${claimData.claimNumber || 'Draft'}`,
          Author: 'ClaimFlow System',
          Subject: 'Medical Insurance Claim Form',
          Keywords: 'insurance, claim, medical, healthcare',
          CreationDate: new Date(),
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        
        // Log PDF generation for audit
        createAuditLog(
          userId,
          'PDF_GENERATION',
          'pdf_service',
          {
            type: 'claim',
            claimId: claimData.id,
            pageCount: 1,
            fileSize: pdfBuffer.length,
          },
          'unknown',
          'unknown'
        ).catch(console.error);
        
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Generate claim PDF content
      generateClaimPDFContent(doc, claimData);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// Generate appeal letter PDF
export async function generateAppealPDF(
  appealData: AppealPDFData,
  userId: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: PDF_CONFIG.pageSize,
        margins: PDF_CONFIG.margins,
        info: {
          Title: `Appeal Letter - Claim ${appealData.claimNumber || appealData.claimId}`,
          Author: 'ClaimFlow System',
          Subject: 'Insurance Claim Appeal Letter',
          Keywords: 'insurance, appeal, claim, medical, healthcare',
          CreationDate: new Date(),
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        
        // Log PDF generation for audit
        createAuditLog(
          userId,
          'PDF_GENERATION',
          'pdf_service',
          {
            type: 'appeal',
            claimId: appealData.claimId,
            pageCount: Math.ceil(appealData.appealLetter.length / 3000), // Estimate pages
            fileSize: pdfBuffer.length,
          },
          'unknown',
          'unknown'
        ).catch(console.error);
        
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Generate appeal PDF content
      generateAppealPDFContent(doc, appealData);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// Generate claim PDF content following CMS-1500 format
function generateClaimPDFContent(doc: PDFKit.PDFDocument, claimData: ClaimPDFData) {
  let yPosition = PDF_CONFIG.margins.top;

  // Header
  doc.font(PDF_CONFIG.fonts.bold)
     .fontSize(20)
     .fillColor(PDF_CONFIG.colors.primary)
     .text('HEALTH INSURANCE CLAIM FORM', PDF_CONFIG.margins.left, yPosition, {
       align: 'center',
       width: doc.page.width - PDF_CONFIG.margins.left - PDF_CONFIG.margins.right,
     });

  yPosition += 40;

  // Claim number and date
  if (claimData.claimNumber) {
    doc.font(PDF_CONFIG.fonts.regular)
       .fontSize(12)
       .text(`Claim Number: ${claimData.claimNumber}`, PDF_CONFIG.margins.left, yPosition);
  }
  
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 
           doc.page.width - PDF_CONFIG.margins.right - 150, yPosition);

  yPosition += 30;

  // Patient Information Section
  yPosition = addSectionHeader(doc, 'PATIENT INFORMATION', yPosition);
  
  if (claimData.patientName) {
    yPosition = addField(doc, 'Patient Name:', claimData.patientName, yPosition);
  }
  
  if (claimData.patientDob) {
    yPosition = addField(doc, 'Date of Birth:', claimData.patientDob.toLocaleDateString(), yPosition);
  }
  
  if (claimData.patientAddress) {
    yPosition = addField(doc, 'Address:', claimData.patientAddress, yPosition);
  }

  yPosition += 20;

  // Insurance Information Section
  if (claimData.insuranceInfo) {
    yPosition = addSectionHeader(doc, 'INSURANCE INFORMATION', yPosition);
    
    if (claimData.insuranceInfo.insurerName) {
      yPosition = addField(doc, 'Insurance Company:', claimData.insuranceInfo.insurerName, yPosition);
    }
    
    if (claimData.insuranceInfo.memberId) {
      yPosition = addField(doc, 'Member ID:', claimData.insuranceInfo.memberId, yPosition);
    }
    
    if (claimData.insuranceInfo.groupId) {
      yPosition = addField(doc, 'Group ID:', claimData.insuranceInfo.groupId, yPosition);
    }
    
    if (claimData.insuranceInfo.payerId) {
      yPosition = addField(doc, 'Payer ID:', claimData.insuranceInfo.payerId, yPosition);
    }

    yPosition += 20;
  }

  // Provider Information Section
  yPosition = addSectionHeader(doc, 'PROVIDER INFORMATION', yPosition);
  yPosition = addField(doc, 'Provider Name:', claimData.providerName, yPosition);
  
  if (claimData.providerNpi) {
    yPosition = addField(doc, 'NPI:', claimData.providerNpi, yPosition);
  }
  
  if (claimData.providerAddress) {
    yPosition = addField(doc, 'Address:', claimData.providerAddress, yPosition);
  }
  
  if (claimData.providerPhone) {
    yPosition = addField(doc, 'Phone:', claimData.providerPhone, yPosition);
  }

  yPosition += 20;

  // Service Information Section
  yPosition = addSectionHeader(doc, 'SERVICE INFORMATION', yPosition);
  yPosition = addField(doc, 'Date of Service:', claimData.dateOfService.toLocaleDateString(), yPosition);
  yPosition = addField(doc, 'Amount:', `$${(claimData.amountCents / 100).toFixed(2)}`, yPosition);
  
  if (claimData.description) {
    yPosition = addField(doc, 'Description:', claimData.description, yPosition, true);
  }

  yPosition += 20;

  // Medical Codes Section
  yPosition = addSectionHeader(doc, 'MEDICAL CODES', yPosition);
  
  if (claimData.cptCodes.length > 0) {
    yPosition = addField(doc, 'CPT Codes:', claimData.cptCodes.join(', '), yPosition);
  }
  
  if (claimData.icdCodes.length > 0) {
    yPosition = addField(doc, 'ICD-10 Codes:', claimData.icdCodes.join(', '), yPosition);
  }

  yPosition += 40;

  // Signature Section
  yPosition = addSectionHeader(doc, 'CERTIFICATION', yPosition);
  
  doc.font(PDF_CONFIG.fonts.regular)
     .fontSize(10)
     .fillColor(PDF_CONFIG.colors.secondary)
     .text(
       'I certify that the information provided in this claim is true and accurate to the best of my knowledge. ' +
       'I understand that any false information may result in denial of the claim and potential legal consequences.',
       PDF_CONFIG.margins.left,
       yPosition,
       { width: doc.page.width - PDF_CONFIG.margins.left - PDF_CONFIG.margins.right }
     );

  yPosition += 60;

  // Signature lines
  const signatureWidth = 200;
  const leftSignatureX = PDF_CONFIG.margins.left;
  const rightSignatureX = doc.page.width - PDF_CONFIG.margins.right - signatureWidth;

  doc.moveTo(leftSignatureX, yPosition)
     .lineTo(leftSignatureX + signatureWidth, yPosition)
     .stroke();
  
  doc.moveTo(rightSignatureX, yPosition)
     .lineTo(rightSignatureX + signatureWidth, yPosition)
     .stroke();

  doc.font(PDF_CONFIG.fonts.regular)
     .fontSize(10)
     .text('Patient Signature', leftSignatureX, yPosition + 10)
     .text('Date', rightSignatureX, yPosition + 10);

  // Footer
  addFooter(doc);
}

// Generate appeal letter PDF content
function generateAppealPDFContent(doc: PDFKit.PDFDocument, appealData: AppealPDFData) {
  let yPosition = PDF_CONFIG.margins.top;

  // Header
  doc.font(PDF_CONFIG.fonts.bold)
     .fontSize(18)
     .fillColor(PDF_CONFIG.colors.primary)
     .text('INSURANCE CLAIM APPEAL LETTER', PDF_CONFIG.margins.left, yPosition, {
       align: 'center',
       width: doc.page.width - PDF_CONFIG.margins.left - PDF_CONFIG.margins.right,
     });

  yPosition += 40;

  // Date and reference
  doc.font(PDF_CONFIG.fonts.regular)
     .fontSize(12)
     .text(`Date: ${appealData.appealDate.toLocaleDateString()}`, PDF_CONFIG.margins.left, yPosition);

  yPosition += 20;

  if (appealData.claimNumber) {
    doc.text(`Re: Claim Number ${appealData.claimNumber}`, PDF_CONFIG.margins.left, yPosition);
    yPosition += 15;
  }

  doc.text(`Claim ID: ${appealData.claimId}`, PDF_CONFIG.margins.left, yPosition);
  yPosition += 30;

  // Insurance company address (placeholder)
  if (appealData.insuranceInfo?.insurerName) {
    doc.font(PDF_CONFIG.fonts.bold)
       .text('To:', PDF_CONFIG.margins.left, yPosition);
    
    yPosition += 15;
    
    doc.font(PDF_CONFIG.fonts.regular)
       .text(appealData.insuranceInfo.insurerName, PDF_CONFIG.margins.left, yPosition);
    
    yPosition += 15;
    doc.text('Claims Review Department', PDF_CONFIG.margins.left, yPosition);
    yPosition += 30;
  }

  // Patient and claim information
  yPosition = addSectionHeader(doc, 'CLAIM INFORMATION', yPosition);
  
  if (appealData.patientName) {
    yPosition = addField(doc, 'Patient Name:', appealData.patientName, yPosition);
  }
  
  if (appealData.insuranceInfo?.memberId) {
    yPosition = addField(doc, 'Member ID:', appealData.insuranceInfo.memberId, yPosition);
  }
  
  yPosition = addField(doc, 'Provider:', appealData.providerName, yPosition);
  yPosition = addField(doc, 'Date of Service:', appealData.dateOfService.toLocaleDateString(), yPosition);
  yPosition = addField(doc, 'Claim Amount:', `$${(appealData.amountCents / 100).toFixed(2)}`, yPosition);
  yPosition = addField(doc, 'Denial Reason:', appealData.denialReason, yPosition, true);

  yPosition += 30;

  // Appeal letter content
  yPosition = addSectionHeader(doc, 'APPEAL REQUEST', yPosition);
  
  // Split appeal letter into paragraphs and handle page breaks
  const paragraphs = appealData.appealLetter.split('\n\n');
  
  for (const paragraph of paragraphs) {
    if (yPosition > doc.page.height - PDF_CONFIG.margins.bottom - 100) {
      doc.addPage();
      yPosition = PDF_CONFIG.margins.top;
    }
    
    doc.font(PDF_CONFIG.fonts.regular)
       .fontSize(11)
       .fillColor(PDF_CONFIG.colors.primary)
       .text(paragraph.trim(), PDF_CONFIG.margins.left, yPosition, {
         width: doc.page.width - PDF_CONFIG.margins.left - PDF_CONFIG.margins.right,
         align: 'justify',
       });
    
    yPosition += doc.heightOfString(paragraph.trim(), {
      width: doc.page.width - PDF_CONFIG.margins.left - PDF_CONFIG.margins.right,
    }) + 15;
  }

  yPosition += 30;

  // Closing
  if (yPosition > doc.page.height - PDF_CONFIG.margins.bottom - 150) {
    doc.addPage();
    yPosition = PDF_CONFIG.margins.top;
  }

  doc.font(PDF_CONFIG.fonts.regular)
     .fontSize(11)
     .text('Sincerely,', PDF_CONFIG.margins.left, yPosition);

  yPosition += 60;

  // Signature line
  const signatureWidth = 200;
  doc.moveTo(PDF_CONFIG.margins.left, yPosition)
     .lineTo(PDF_CONFIG.margins.left + signatureWidth, yPosition)
     .stroke();

  doc.font(PDF_CONFIG.fonts.regular)
     .fontSize(10)
     .text('Patient Signature', PDF_CONFIG.margins.left, yPosition + 10);

  // Footer
  addFooter(doc);
}

// Helper function to add section headers
function addSectionHeader(doc: PDFKit.PDFDocument, title: string, yPosition: number): number {
  doc.font(PDF_CONFIG.fonts.bold)
     .fontSize(14)
     .fillColor(PDF_CONFIG.colors.accent)
     .text(title, PDF_CONFIG.margins.left, yPosition);
  
  // Add underline
  const titleWidth = doc.widthOfString(title);
  doc.moveTo(PDF_CONFIG.margins.left, yPosition + 18)
     .lineTo(PDF_CONFIG.margins.left + titleWidth, yPosition + 18)
     .strokeColor(PDF_CONFIG.colors.accent)
     .lineWidth(1)
     .stroke();

  return yPosition + 30;
}

// Helper function to add field with label and value
function addField(
  doc: PDFKit.PDFDocument, 
  label: string, 
  value: string, 
  yPosition: number, 
  multiline: boolean = false
): number {
  const labelWidth = 120;
  
  doc.font(PDF_CONFIG.fonts.bold)
     .fontSize(11)
     .fillColor(PDF_CONFIG.colors.secondary)
     .text(label, PDF_CONFIG.margins.left, yPosition, { width: labelWidth });

  const valueOptions = {
    width: doc.page.width - PDF_CONFIG.margins.left - PDF_CONFIG.margins.right - labelWidth - 10,
  };

  doc.font(PDF_CONFIG.fonts.regular)
     .fontSize(11)
     .fillColor(PDF_CONFIG.colors.primary)
     .text(value, PDF_CONFIG.margins.left + labelWidth + 10, yPosition, valueOptions);

  if (multiline) {
    const height = doc.heightOfString(value, valueOptions);
    return yPosition + Math.max(height, 15) + 5;
  }

  return yPosition + 20;
}

// Helper function to add footer
function addFooter(doc: PDFKit.PDFDocument) {
  const footerY = doc.page.height - PDF_CONFIG.margins.bottom + 20;
  
  doc.font(PDF_CONFIG.fonts.regular)
     .fontSize(8)
     .fillColor(PDF_CONFIG.colors.secondary)
     .text(
       'Generated by ClaimFlow - HIPAA Compliant Claims Management System',
       PDF_CONFIG.margins.left,
       footerY,
       { align: 'center', width: doc.page.width - PDF_CONFIG.margins.left - PDF_CONFIG.margins.right }
     );
  
  doc.text(
    `Generated on ${new Date().toLocaleString()}`,
    PDF_CONFIG.margins.left,
    footerY + 12,
    { align: 'center', width: doc.page.width - PDF_CONFIG.margins.left - PDF_CONFIG.margins.right }
  );
}

// Validate PDF data before generation
export function validateClaimPDFData(data: ClaimPDFData): string[] {
  const errors: string[] = [];
  
  if (!data.providerName?.trim()) {
    errors.push('Provider name is required');
  }
  
  if (!data.dateOfService) {
    errors.push('Date of service is required');
  }
  
  if (!data.amountCents || data.amountCents <= 0) {
    errors.push('Valid claim amount is required');
  }
  
  if (data.cptCodes.length === 0 && data.icdCodes.length === 0) {
    errors.push('At least one medical code is required');
  }
  
  return errors;
}

// Validate appeal PDF data
export function validateAppealPDFData(data: AppealPDFData): string[] {
  const errors: string[] = [];
  
  if (!data.claimId?.trim()) {
    errors.push('Claim ID is required');
  }
  
  if (!data.denialReason?.trim()) {
    errors.push('Denial reason is required');
  }
  
  if (!data.appealLetter?.trim()) {
    errors.push('Appeal letter content is required');
  }
  
  if (!data.providerName?.trim()) {
    errors.push('Provider name is required');
  }
  
  if (!data.dateOfService) {
    errors.push('Date of service is required');
  }
  
  return errors;
}

// Get PDF metadata
export function getPDFMetadata(type: 'claim' | 'appeal', data: ClaimPDFData | AppealPDFData) {
  const baseMetadata = {
    type,
    createdAt: new Date(),
    estimatedPages: type === 'claim' ? 1 : Math.ceil((data as AppealPDFData).appealLetter?.length / 3000 || 1),
  };
  
  if (type === 'claim') {
    const claimData = data as ClaimPDFData;
    return {
      ...baseMetadata,
      claimId: claimData.id,
      providerName: claimData.providerName,
      dateOfService: claimData.dateOfService,
      amount: claimData.amountCents / 100,
    };
  } else {
    const appealData = data as AppealPDFData;
    return {
      ...baseMetadata,
      claimId: appealData.claimId,
      providerName: appealData.providerName,
      dateOfService: appealData.dateOfService,
      amount: appealData.amountCents / 100,
      denialReason: appealData.denialReason,
    };
  }
}