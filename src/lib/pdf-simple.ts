// Simple PDF generation service for testing
import PDFDocument from 'pdfkit';

// Basic interfaces
export interface ClaimPDFData {
  id?: string;
  providerName: string;
  dateOfService: Date;
  amountCents: number;
  cptCodes: string[];
  icdCodes: string[];
}

export interface AppealPDFData {
  claimId: string;
  denialReason: string;
  appealLetter: string;
  providerName: string;
  dateOfService: Date;
  amountCents: number;
  appealDate: Date;
}

// Generate simple claim PDF
export async function generateClaimPDF(
  claimData: ClaimPDFData,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userId: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Simple content
      doc.fontSize(20).text('Insurance Claim Form', 100, 100);
      doc.fontSize(12).text(`Provider: ${claimData.providerName}`, 100, 150);
      doc.text(`Date: ${claimData.dateOfService.toLocaleDateString()}`, 100, 170);
      doc.text(`Amount: $${(claimData.amountCents / 100).toFixed(2)}`, 100, 190);
      doc.text(`CPT Codes: ${claimData.cptCodes.join(', ')}`, 100, 210);
      doc.text(`ICD Codes: ${claimData.icdCodes.join(', ')}`, 100, 230);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// Generate simple appeal PDF
export async function generateAppealPDF(
  appealData: AppealPDFData,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userId: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Simple content
      doc.fontSize(20).text('Appeal Letter', 100, 100);
      doc.fontSize(12).text(`Claim ID: ${appealData.claimId}`, 100, 150);
      doc.text(`Provider: ${appealData.providerName}`, 100, 170);
      doc.text(`Denial Reason: ${appealData.denialReason}`, 100, 190);
      doc.text('Appeal Letter:', 100, 220);
      doc.text(appealData.appealLetter, 100, 240, { width: 400 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// Simple validation functions
export function validateClaimPDFData(data: ClaimPDFData): string[] {
  const errors: string[] = [];
  if (!data.providerName) errors.push('Provider name is required');
  if (!data.dateOfService) errors.push('Date of service is required');
  if (!data.amountCents || data.amountCents <= 0) errors.push('Valid amount is required');
  return errors;
}

export function validateAppealPDFData(data: AppealPDFData): string[] {
  const errors: string[] = [];
  if (!data.claimId) errors.push('Claim ID is required');
  if (!data.denialReason) errors.push('Denial reason is required');
  if (!data.appealLetter) errors.push('Appeal letter is required');
  return errors;
}