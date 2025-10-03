// Validation rules engine for medical coding accuracy
import { ValidationError, ValidationWarning } from './ai';

export interface ClaimValidationData {
  providerName: string;
  providerNpi?: string;
  dateOfService: string;
  amount: string;
  cptCodes: string[];
  icdCodes: string[];
  description?: string;
}

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  category: 'required' | 'format' | 'medical' | 'business' | 'compliance';
  validate: (data: ClaimValidationData) => ValidationError | ValidationWarning | null;
}

// CPT Code validation patterns (for future use)
// const CPT_CODE_PATTERNS = {
//   // Evaluation and Management
//   OFFICE_VISIT: /^9921[0-5]$/,
//   CONSULTATION: /^9924[1-5]$/,
//   HOSPITAL_VISIT: /^9922[1-3]$/,
//   
//   // Surgery
//   SURGERY: /^[1-6]\d{4}$/,
//   
//   // Radiology
//   RADIOLOGY: /^7[0-9]\d{3}$/,
//   
//   // Pathology
//   PATHOLOGY: /^8[0-9]\d{3}$/,
//   
//   // Medicine
//   MEDICINE: /^9[0-9]\d{3}$/,
// };

// ICD-10 Code validation patterns
const ICD10_CODE_PATTERNS = {
  // General format: Letter + 2 digits + optional decimal + up to 4 more characters
  GENERAL: /^[A-Z]\d{2}(\.\d{1,4})?$/,
  
  // Specific categories
  INFECTIOUS: /^[AB]\d{2}(\.\d{1,4})?$/,
  NEOPLASMS: /^[CD]\d{2}(\.\d{1,4})?$/,
  BLOOD: /^D[5-8]\d(\.\d{1,4})?$/,
  ENDOCRINE: /^E\d{2}(\.\d{1,4})?$/,
  MENTAL: /^F\d{2}(\.\d{1,4})?$/,
  NERVOUS: /^G\d{2}(\.\d{1,4})?$/,
  CIRCULATORY: /^I\d{2}(\.\d{1,4})?$/,
  RESPIRATORY: /^J\d{2}(\.\d{1,4})?$/,
  DIGESTIVE: /^K\d{2}(\.\d{1,4})?$/,
  SKIN: /^L\d{2}(\.\d{1,4})?$/,
  MUSCULOSKELETAL: /^M\d{2}(\.\d{1,4})?$/,
  GENITOURINARY: /^N\d{2}(\.\d{1,4})?$/,
  PREGNANCY: /^O\d{2}(\.\d{1,4})?$/,
  PERINATAL: /^P\d{2}(\.\d{1,4})?$/,
  CONGENITAL: /^Q\d{2}(\.\d{1,4})?$/,
  SYMPTOMS: /^R\d{2}(\.\d{1,4})?$/,
  INJURY: /^[ST]\d{2}(\.\d{1,4})?$/,
  EXTERNAL: /^[VWX]\d{2}(\.\d{1,4})?$/,
  HEALTH_STATUS: /^Z\d{2}(\.\d{1,4})?$/,
};

// Validation rules
export const VALIDATION_RULES: ValidationRule[] = [
  // Required field validations
  {
    id: 'provider_name_required',
    name: 'Provider Name Required',
    description: 'Provider name is mandatory for claim processing',
    severity: 'high',
    category: 'required',
    validate: (data) => {
      if (!data.providerName?.trim()) {
        return {
          field: 'providerName',
          message: 'Provider name is required',
          code: 'PROVIDER_NAME_REQUIRED',
          severity: 'high' as const,
        };
      }
      return null;
    },
  },
  
  {
    id: 'date_of_service_required',
    name: 'Date of Service Required',
    description: 'Date of service is mandatory for claim processing',
    severity: 'high',
    category: 'required',
    validate: (data) => {
      if (!data.dateOfService?.trim()) {
        return {
          field: 'dateOfService',
          message: 'Date of service is required',
          code: 'DATE_OF_SERVICE_REQUIRED',
          severity: 'high' as const,
        };
      }
      return null;
    },
  },
  
  {
    id: 'amount_required',
    name: 'Amount Required',
    description: 'Claim amount is mandatory',
    severity: 'high',
    category: 'required',
    validate: (data) => {
      if (!data.amount?.trim() || parseFloat(data.amount) <= 0) {
        return {
          field: 'amount',
          message: 'Valid claim amount is required',
          code: 'AMOUNT_REQUIRED',
          severity: 'high' as const,
        };
      }
      return null;
    },
  },
  
  {
    id: 'medical_codes_required',
    name: 'Medical Codes Required',
    description: 'At least one CPT or ICD code is required',
    severity: 'high',
    category: 'required',
    validate: (data) => {
      if (data.cptCodes.length === 0 && data.icdCodes.length === 0) {
        return {
          field: 'medicalCodes',
          message: 'At least one CPT or ICD code is required',
          code: 'MEDICAL_CODES_REQUIRED',
          severity: 'high' as const,
        };
      }
      return null;
    },
  },
  
  // Format validations
  {
    id: 'date_format_validation',
    name: 'Date Format Validation',
    description: 'Date of service must be in valid format',
    severity: 'medium',
    category: 'format',
    validate: (data) => {
      if (data.dateOfService) {
        const date = new Date(data.dateOfService);
        if (isNaN(date.getTime())) {
          return {
            field: 'dateOfService',
            message: 'Date of service must be in valid format (YYYY-MM-DD)',
            code: 'INVALID_DATE_FORMAT',
            severity: 'medium' as const,
          };
        }
        
        // Check if date is in the future
        if (date > new Date()) {
          return {
            field: 'dateOfService',
            message: 'Date of service cannot be in the future',
            code: 'FUTURE_DATE_OF_SERVICE',
            severity: 'medium' as const,
          };
        }
        
        // Check if date is too old (more than 1 year)
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        if (date < oneYearAgo) {
          return {
            field: 'dateOfService',
            message: 'Date of service is more than 1 year old - may affect claim processing',
            code: 'OLD_DATE_OF_SERVICE',
            severity: 'low' as const,
            suggestion: 'Verify the date is correct or contact your insurance provider about filing deadlines',
          };
        }
      }
      return null;
    },
  },
  
  {
    id: 'npi_format_validation',
    name: 'NPI Format Validation',
    description: 'NPI must be 10 digits if provided',
    severity: 'medium',
    category: 'format',
    validate: (data) => {
      if (data.providerNpi && data.providerNpi.trim()) {
        const npi = data.providerNpi.replace(/\D/g, ''); // Remove non-digits
        if (npi.length !== 10) {
          return {
            field: 'providerNpi',
            message: 'NPI must be exactly 10 digits',
            code: 'INVALID_NPI_FORMAT',
            severity: 'medium' as const,
          };
        }
      }
      return null;
    },
  },
  
  // CPT Code validations
  {
    id: 'cpt_code_format',
    name: 'CPT Code Format',
    description: 'CPT codes must be in valid format',
    severity: 'high',
    category: 'medical',
    validate: (data) => {
      for (const code of data.cptCodes) {
        // CPT codes are typically 5 digits
        if (!/^\d{5}$/.test(code)) {
          return {
            field: 'cptCodes',
            message: `CPT code "${code}" is not in valid format (should be 5 digits)`,
            code: 'INVALID_CPT_FORMAT',
            severity: 'high' as const,
          };
        }
      }
      return null;
    },
  },
  
  // ICD-10 Code validations
  {
    id: 'icd_code_format',
    name: 'ICD-10 Code Format',
    description: 'ICD-10 codes must be in valid format',
    severity: 'high',
    category: 'medical',
    validate: (data) => {
      for (const code of data.icdCodes) {
        if (!ICD10_CODE_PATTERNS.GENERAL.test(code)) {
          return {
            field: 'icdCodes',
            message: `ICD-10 code "${code}" is not in valid format`,
            code: 'INVALID_ICD_FORMAT',
            severity: 'high' as const,
          };
        }
      }
      return null;
    },
  },
  
  // Business logic validations
  {
    id: 'amount_reasonableness',
    name: 'Amount Reasonableness',
    description: 'Claim amount should be reasonable',
    severity: 'low',
    category: 'business',
    validate: (data) => {
      const amount = parseFloat(data.amount);
      if (amount > 10000) {
        return {
          field: 'amount',
          message: 'Claim amount is unusually high',
          code: 'HIGH_CLAIM_AMOUNT',
          severity: 'low' as const,
          suggestion: 'Verify the amount is correct for the services provided',
        };
      }
      if (amount < 10) {
        return {
          field: 'amount',
          message: 'Claim amount is unusually low',
          code: 'LOW_CLAIM_AMOUNT',
          severity: 'low' as const,
          suggestion: 'Verify the amount includes all applicable charges',
        };
      }
      return null;
    },
  },
  
  {
    id: 'code_quantity_check',
    name: 'Medical Code Quantity',
    description: 'Check for appropriate number of medical codes',
    severity: 'low',
    category: 'medical',
    validate: (data) => {
      if (data.cptCodes.length > 10) {
        return {
          field: 'cptCodes',
          message: 'Unusually high number of CPT codes',
          code: 'EXCESSIVE_CPT_CODES',
          severity: 'low' as const,
          suggestion: 'Verify all codes are necessary for this claim',
        };
      }
      
      if (data.icdCodes.length > 5) {
        return {
          field: 'icdCodes',
          message: 'Unusually high number of ICD codes',
          code: 'EXCESSIVE_ICD_CODES',
          severity: 'low' as const,
          suggestion: 'Verify all diagnosis codes are relevant',
        };
      }
      
      if (data.cptCodes.length === 0) {
        return {
          field: 'cptCodes',
          message: 'No procedure codes provided',
          code: 'MISSING_CPT_CODES',
          severity: 'medium' as const,
          suggestion: 'Add CPT codes for the procedures performed',
        };
      }
      
      if (data.icdCodes.length === 0) {
        return {
          field: 'icdCodes',
          message: 'No diagnosis codes provided',
          code: 'MISSING_ICD_CODES',
          severity: 'medium' as const,
          suggestion: 'Add ICD-10 codes for the diagnoses',
        };
      }
      
      return null;
    },
  },
  
  // Compliance validations
  {
    id: 'provider_name_length',
    name: 'Provider Name Length',
    description: 'Provider name should be appropriate length',
    severity: 'low',
    category: 'compliance',
    validate: (data) => {
      if (data.providerName && data.providerName.length < 3) {
        return {
          field: 'providerName',
          message: 'Provider name seems too short',
          code: 'SHORT_PROVIDER_NAME',
          severity: 'low' as const,
          suggestion: 'Provide the full provider name or practice name',
        };
      }
      
      if (data.providerName && data.providerName.length > 100) {
        return {
          field: 'providerName',
          message: 'Provider name is too long',
          code: 'LONG_PROVIDER_NAME',
          severity: 'medium' as const,
        };
      }
      
      return null;
    },
  },
];

// Main validation function
export function validateClaimData(data: ClaimValidationData): {
  errors: ValidationError[];
  warnings: ValidationWarning[];
  isValid: boolean;
  score: number;
} {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  // Run all validation rules
  for (const rule of VALIDATION_RULES) {
    const result = rule.validate(data);
    if (result) {
      if ('severity' in result) {
        errors.push(result as ValidationError);
      } else {
        warnings.push(result as ValidationWarning);
      }
    }
  }
  
  // Calculate validation score
  const totalIssues = errors.length + warnings.length * 0.5; // Warnings count as half
  const maxPossibleIssues = VALIDATION_RULES.length;
  const score = Math.max(0, 1 - (totalIssues / maxPossibleIssues));
  
  // Claim is valid if no high-severity errors
  const isValid = !errors.some(error => error.severity === 'high');
  
  return {
    errors,
    warnings,
    isValid,
    score,
  };
}

// Get validation rules by category
export function getValidationRulesByCategory(category: ValidationRule['category']): ValidationRule[] {
  return VALIDATION_RULES.filter(rule => rule.category === category);
}

// Get validation rule by ID
export function getValidationRule(id: string): ValidationRule | undefined {
  return VALIDATION_RULES.find(rule => rule.id === id);
}

// Check if a specific field has validation errors
export function hasFieldErrors(errors: ValidationError[], fieldName: string): boolean {
  return errors.some(error => error.field === fieldName);
}

// Get errors for a specific field
export function getFieldErrors(errors: ValidationError[], fieldName: string): ValidationError[] {
  return errors.filter(error => error.field === fieldName);
}

// Get warnings for a specific field
export function getFieldWarnings(warnings: ValidationWarning[], fieldName: string): ValidationWarning[] {
  return warnings.filter(warning => warning.field === fieldName);
}

// Calculate approval likelihood based on validation results
export function calculateApprovalLikelihood(
  errors: ValidationError[],
  warnings: ValidationWarning[],
  confidenceScore: number
): number {
  // Start with base score
  let likelihood = 0.8;
  
  // Reduce for errors
  const highSeverityErrors = errors.filter(e => e.severity === 'high').length;
  const mediumSeverityErrors = errors.filter(e => e.severity === 'medium').length;
  const lowSeverityErrors = errors.filter(e => e.severity === 'low').length;
  
  likelihood -= highSeverityErrors * 0.3;
  likelihood -= mediumSeverityErrors * 0.15;
  likelihood -= lowSeverityErrors * 0.05;
  
  // Reduce for warnings
  likelihood -= warnings.length * 0.02;
  
  // Factor in AI confidence
  likelihood = likelihood * confidenceScore;
  
  // Ensure bounds
  return Math.max(0, Math.min(1, likelihood));
}