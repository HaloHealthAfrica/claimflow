// OCR service integration for document processing
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { TextractClient, DetectDocumentTextCommand } from '@aws-sdk/client-textract';
import { createAuditLog } from './db';

// Initialize Google Vision client
const visionClient = new ImageAnnotatorClient({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE, // Path to service account key file
  credentials: process.env.GOOGLE_CLOUD_PRIVATE_KEY ? {
    client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY.replace(/\\n/g, '\n'),
  } : undefined,
});

// Initialize AWS Textract client
const textractClient = new TextractClient({
  region: process.env.AWS_TEXTRACT_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// OCR confidence thresholds
export const OCR_CONFIG = {
  minConfidence: 0.7,
  highConfidence: 0.9,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  supportedFormats: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
};

// Insurance profile data structure
export interface InsuranceProfilePartial {
  insurer?: string;
  plan?: string;
  memberId?: string;
  groupId?: string;
  payerId?: string;
  address?: string;
  confidence?: number;
  rawText?: string;
}

// Receipt data structure
export interface ReceiptData {
  providerName?: string;
  dateOfService?: Date;
  amount?: number;
  rawText: string;
  confidence?: number;
  extractedFields?: {
    [key: string]: {
      value: string;
      confidence: number;
    };
  };
}

// OCR result structure
export interface OCRResult {
  text: string;
  confidence: number;
  blocks?: TextBlock[];
}

export interface TextBlock {
  text: string;
  confidence: number;
  boundingBox?: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}

// Extract text using Google Vision API
export async function extractTextWithVision(imageBuffer: Buffer, userId: string): Promise<OCRResult> {
  try {
    const [result] = await visionClient.textDetection({
      image: { content: imageBuffer },
    });

    const detections = result.textAnnotations || [];
    
    if (detections.length === 0) {
      throw new Error('No text detected in image');
    }

    const fullText = detections[0]?.description || '';
    const confidence = detections[0]?.score || 0;

    // Extract individual text blocks
    const blocks: TextBlock[] = detections.slice(1).map(detection => ({
      text: detection.description || '',
      confidence: detection.score || 0,
      boundingBox: detection.boundingPoly?.vertices ? {
        left: Math.min(...detection.boundingPoly.vertices.map(v => v.x || 0)),
        top: Math.min(...detection.boundingPoly.vertices.map(v => v.y || 0)),
        width: Math.max(...detection.boundingPoly.vertices.map(v => v.x || 0)) - 
               Math.min(...detection.boundingPoly.vertices.map(v => v.x || 0)),
        height: Math.max(...detection.boundingPoly.vertices.map(v => v.y || 0)) - 
                Math.min(...detection.boundingPoly.vertices.map(v => v.y || 0)),
      } : undefined,
    }));

    // Log OCR operation
    await createAuditLog(
      userId,
      'OCR_VISION_PROCESSED',
      'document',
      { 
        textLength: fullText.length,
        confidence,
        blocksCount: blocks.length,
      },
      'unknown',
      'unknown'
    );

    return {
      text: fullText,
      confidence,
      blocks,
    };
  } catch (error) {
    console.error('Google Vision OCR error:', error);
    throw new Error('Failed to process image with Google Vision');
  }
}

// Extract text using AWS Textract
export async function extractTextWithTextract(imageBuffer: Buffer, userId: string): Promise<OCRResult> {
  try {
    const command = new DetectDocumentTextCommand({
      Document: {
        Bytes: imageBuffer,
      },
    });

    const result = await textractClient.send(command);
    const blocks = result.Blocks || [];

    // Extract lines of text
    const textLines = blocks
      .filter(block => block.BlockType === 'LINE')
      .map(block => ({
        text: block.Text || '',
        confidence: (block.Confidence || 0) / 100, // Convert to 0-1 scale
        boundingBox: block.Geometry?.BoundingBox ? {
          left: block.Geometry.BoundingBox.Left || 0,
          top: block.Geometry.BoundingBox.Top || 0,
          width: block.Geometry.BoundingBox.Width || 0,
          height: block.Geometry.BoundingBox.Height || 0,
        } : undefined,
      }));

    const fullText = textLines.map(line => line.text).join('\n');
    const avgConfidence = textLines.length > 0 
      ? textLines.reduce((sum, line) => sum + line.confidence, 0) / textLines.length 
      : 0;

    // Log OCR operation
    await createAuditLog(
      userId,
      'OCR_TEXTRACT_PROCESSED',
      'document',
      { 
        textLength: fullText.length,
        confidence: avgConfidence,
        blocksCount: textLines.length,
      },
      'unknown',
      'unknown'
    );

    return {
      text: fullText,
      confidence: avgConfidence,
      blocks: textLines,
    };
  } catch (error) {
    console.error('AWS Textract OCR error:', error);
    throw new Error('Failed to process image with AWS Textract');
  }
}

// Parse insurance card information from OCR text
export function parseInsuranceCard(ocrResult: OCRResult): InsuranceProfilePartial {
  const text = ocrResult.text.toLowerCase();
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  const result: InsuranceProfilePartial = {
    confidence: ocrResult.confidence,
    rawText: ocrResult.text,
  };

  // Common insurance company patterns
  const insurerPatterns = [
    /(?:blue cross|bcbs|anthem|aetna|cigna|humana|kaiser|united|uhc|medicare|medicaid)/i,
  ];

  // Member ID patterns
  const memberIdPatterns = [
    /(?:member|id|subscriber)[\s:]*([a-z0-9]{6,20})/i,
    /(?:^|\s)([a-z]{2,3}\d{6,15})(?:\s|$)/i,
  ];

  // Group ID patterns
  const groupIdPatterns = [
    /(?:group|grp)[\s:]*([a-z0-9]{3,15})/i,
  ];

  // Payer ID patterns
  const payerIdPatterns = [
    /(?:payer|payor)[\s:]*([a-z0-9]{3,10})/i,
  ];

  // Extract insurer name
  for (const line of lines) {
    for (const pattern of insurerPatterns) {
      const match = line.match(pattern);
      if (match) {
        result.insurer = match[0].trim();
        break;
      }
    }
    if (result.insurer) break;
  }

  // Extract member ID
  for (const line of lines) {
    for (const pattern of memberIdPatterns) {
      const match = line.match(pattern);
      if (match && match[1]) {
        result.memberId = match[1].trim();
        break;
      }
    }
    if (result.memberId) break;
  }

  // Extract group ID
  for (const line of lines) {
    for (const pattern of groupIdPatterns) {
      const match = line.match(pattern);
      if (match && match[1]) {
        result.groupId = match[1].trim();
        break;
      }
    }
    if (result.groupId) break;
  }

  // Extract payer ID
  for (const line of lines) {
    for (const pattern of payerIdPatterns) {
      const match = line.match(pattern);
      if (match && match[1]) {
        result.payerId = match[1].trim();
        break;
      }
    }
    if (result.payerId) break;
  }

  // Extract plan name (usually on a separate line near insurer)
  if (result.insurer) {
    const insurerIndex = lines.findIndex(line => 
      line.toLowerCase().includes(result.insurer!.toLowerCase())
    );
    if (insurerIndex >= 0 && insurerIndex < lines.length - 1) {
      const nextLine = lines[insurerIndex + 1];
      if (nextLine && !memberIdPatterns.some(p => p.test(nextLine))) {
        result.plan = nextLine;
      }
    }
  }

  return result;
}

// Parse receipt information from OCR text
export function parseReceipt(ocrResult: OCRResult): ReceiptData {
  const text = ocrResult.text;
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  const result: ReceiptData = {
    rawText: text,
    confidence: ocrResult.confidence,
    extractedFields: {},
  };

  // Provider name patterns (usually at the top)
  const providerPatterns = [
    /^([A-Z][a-z]+ [A-Z][a-z]+ (?:MD|Dr|Doctor|Clinic|Hospital|Medical|Health))/,
    /^(Dr\.?\s+[A-Z][a-z]+ [A-Z][a-z]+)/,
    /^([A-Z][a-z]+ (?:Medical|Health|Clinic|Hospital))/,
  ];

  // Amount patterns
  const amountPatterns = [
    /(?:total|amount|due|balance|charge)[\s:]*\$?(\d+\.?\d{0,2})/i,
    /\$(\d+\.?\d{0,2})(?:\s|$)/,
  ];

  // Date patterns
  const datePatterns = [
    /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
    /(\d{1,2}-\d{1,2}-\d{2,4})/,
    /(?:date|service|visit)[\s:]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
  ];

  // Extract provider name (usually in first few lines)
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    for (const pattern of providerPatterns) {
      const match = line.match(pattern);
      if (match && match[1]) {
        result.providerName = match[1].trim();
        result.extractedFields!.providerName = {
          value: match[1].trim(),
          confidence: 0.8,
        };
        break;
      }
    }
    if (result.providerName) break;
  }

  // Extract amount
  for (const line of lines) {
    for (const pattern of amountPatterns) {
      const match = line.match(pattern);
      if (match && match[1]) {
        const amount = parseFloat(match[1]);
        if (!isNaN(amount) && amount > 0 && amount < 10000) { // Reasonable range
          result.amount = amount;
          result.extractedFields!.amount = {
            value: match[1],
            confidence: 0.9,
          };
          break;
        }
      }
    }
    if (result.amount) break;
  }

  // Extract date of service
  for (const line of lines) {
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match && match[1]) {
        const dateStr = match[1];
        const date = new Date(dateStr);
        if (!isNaN(date.getTime()) && date.getFullYear() > 2000) {
          result.dateOfService = date;
          result.extractedFields!.dateOfService = {
            value: dateStr,
            confidence: 0.85,
          };
          break;
        }
      }
    }
    if (result.dateOfService) break;
  }

  return result;
}

// Main OCR processing function with fallback
export async function processDocument(
  imageBuffer: Buffer, 
  documentType: 'insurance' | 'receipt',
  userId: string
): Promise<InsuranceProfilePartial | ReceiptData> {
  let ocrResult: OCRResult;

  try {
    // Try Google Vision first (generally better for text recognition)
    ocrResult = await extractTextWithVision(imageBuffer, userId);
  } catch (visionError) {
    console.warn('Google Vision failed, trying AWS Textract:', visionError);
    
    try {
      // Fallback to AWS Textract
      ocrResult = await extractTextWithTextract(imageBuffer, userId);
    } catch (textractError) {
      console.error('Both OCR services failed:', { visionError, textractError });
      throw new Error('OCR processing failed with both services');
    }
  }

  // Check confidence threshold
  if (ocrResult.confidence < OCR_CONFIG.minConfidence) {
    console.warn(`Low OCR confidence: ${ocrResult.confidence}`);
  }

  // Parse based on document type
  if (documentType === 'insurance') {
    return parseInsuranceCard(ocrResult);
  } else {
    return parseReceipt(ocrResult);
  }
}

// Validate OCR result quality
export function validateOCRResult(result: InsuranceProfilePartial | ReceiptData): {
  isValid: boolean;
  confidence: number;
  issues: string[];
} {
  const issues: string[] = [];
  let confidence = result.confidence || 0;

  if ('memberId' in result) {
    // Insurance card validation
    const insuranceResult = result as InsuranceProfilePartial;
    if (!insuranceResult.insurer) {
      issues.push('Insurance company not detected');
      confidence -= 0.2;
    }
    if (!insuranceResult.memberId) {
      issues.push('Member ID not detected');
      confidence -= 0.3;
    }
    if (insuranceResult.memberId && insuranceResult.memberId.length < 6) {
      issues.push('Member ID seems too short');
      confidence -= 0.1;
    }
  } else {
    // Receipt validation
    const receiptResult = result as ReceiptData;
    if (!receiptResult.providerName) {
      issues.push('Provider name not detected');
      confidence -= 0.2;
    }
    if (!receiptResult.amount) {
      issues.push('Amount not detected');
      confidence -= 0.3;
    }
    if (!receiptResult.dateOfService) {
      issues.push('Date of service not detected');
      confidence -= 0.2;
    }
  }

  return {
    isValid: confidence >= OCR_CONFIG.minConfidence && issues.length < 3,
    confidence: Math.max(0, confidence),
    issues,
  };
}