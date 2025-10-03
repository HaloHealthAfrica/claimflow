# ClaimFlow Mobile API Documentation

## Overview

The ClaimFlow Mobile API provides a comprehensive REST API for mobile applications to interact with the ClaimFlow system. This API enables customers to authenticate, manage claims, upload documents, and access their profile information.

## Base URL

```
https://your-domain.com/api/mobile
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the access token in the Authorization header:

```
Authorization: Bearer <access_token>
```

## Response Format

All API responses follow a consistent format:

```json
{
  "success": boolean,
  "data": object | null,
  "error": {
    "code": string,
    "message": string,
    "details": string[] | null
  } | null
}
```

## Rate Limiting

- Authentication endpoints: 5 requests per 15 minutes
- General API endpoints: 100 requests per hour
- File uploads: 20 requests per hour
- Claim submissions: 10 requests per hour

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset timestamp

## Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Authentication required or invalid token |
| `FORBIDDEN` | Access denied |
| `VALIDATION_ERROR` | Request validation failed |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `RESOURCE_NOT_FOUND` | Requested resource not found |
| `INTERNAL_ERROR` | Server error |

---

## Authentication Endpoints

### POST /auth/register

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "dateOfBirth": "1990-01-01",
  "deviceId": "device-uuid",
  "deviceType": "ios",
  "appVersion": "1.0.0",
  "pushToken": "push-token"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1234567890",
      "verified": false
    },
    "tokens": {
      "accessToken": "jwt-access-token",
      "refreshToken": "jwt-refresh-token",
      "expiresIn": 86400
    },
    "message": "Account created successfully"
  }
}
```

### POST /auth/login

Authenticate user and get access tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "deviceId": "device-uuid",
  "deviceType": "ios",
  "appVersion": "1.0.0",
  "pushToken": "push-token"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "verified": true
    },
    "tokens": {
      "accessToken": "jwt-access-token",
      "refreshToken": "jwt-refresh-token",
      "expiresIn": 86400
    },
    "preferences": {
      "notifications": true,
      "biometric": false,
      "autoSync": true
    }
  }
}
```

### POST /auth/refresh

Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "jwt-refresh-token",
  "deviceId": "device-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "new-jwt-access-token",
    "refreshToken": "new-jwt-refresh-token",
    "expiresIn": 86400
  }
}
```

---

## Claims Endpoints

### GET /claims

Retrieve user's claims with pagination and filtering.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 50)
- `status` (optional): Filter by status (DRAFT, SUBMITTED, PROCESSING, APPROVED, DENIED, PAID)
- `startDate` (optional): Filter by creation date (ISO 8601)
- `endDate` (optional): Filter by creation date (ISO 8601)

**Response:**
```json
{
  "success": true,
  "data": {
    "claims": [
      {
        "id": "claim-id",
        "status": "SUBMITTED",
        "amountCents": 15000,
        "dateOfService": "2024-01-15T00:00:00Z",
        "providerName": "Dr. Smith Medical",
        "insurerName": "Health Insurance Co",
        "claimNumber": "CLM123456",
        "cptCodes": ["99213", "90834"],
        "icdCodes": ["Z00.00", "F32.9"],
        "submittedAt": "2024-01-16T10:30:00Z",
        "createdAt": "2024-01-15T14:20:00Z",
        "updatedAt": "2024-01-16T10:30:00Z",
        "documents": [
          {
            "id": "doc-id",
            "name": "receipt.pdf",
            "type": "RECEIPT",
            "size": 245760,
            "uploadedAt": "2024-01-15T14:25:00Z"
          }
        ]
      }
    ],
    "pagination": {
      "total": 25,
      "page": 1,
      "limit": 20,
      "hasMore": true
    },
    "summary": {
      "totalClaims": 25,
      "pendingClaims": 5,
      "approvedClaims": 18,
      "deniedClaims": 2,
      "totalAmount": 125000,
      "paidAmount": 98000
    }
  }
}
```

### POST /claims

Create a new claim.

**Request Body:**
```json
{
  "providerName": "Dr. Smith Medical",
  "dateOfService": "2024-01-15",
  "amountCents": 15000,
  "cptCodes": ["99213", "90834"],
  "icdCodes": ["Z00.00", "F32.9"],
  "insurerName": "Health Insurance Co",
  "notes": "Regular checkup and consultation"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "claim": {
      "id": "new-claim-id",
      "status": "DRAFT",
      "amountCents": 15000,
      "dateOfService": "2024-01-15T00:00:00Z",
      "providerName": "Dr. Smith Medical",
      "cptCodes": ["99213", "90834"],
      "icdCodes": ["Z00.00", "F32.9"],
      "createdAt": "2024-01-16T10:00:00Z",
      "updatedAt": "2024-01-16T10:00:00Z",
      "documents": []
    },
    "message": "Claim created successfully"
  }
}
```

### GET /claims/{id}

Get detailed information about a specific claim.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "claim-id",
    "status": "SUBMITTED",
    "amountCents": 15000,
    "dateOfService": "2024-01-15T00:00:00Z",
    "providerName": "Dr. Smith Medical",
    "insurerName": "Health Insurance Co",
    "claimNumber": "CLM123456",
    "cptCodes": ["99213", "90834"],
    "icdCodes": ["Z00.00", "F32.9"],
    "submittedAt": "2024-01-16T10:30:00Z",
    "notes": "Regular checkup and consultation",
    "createdAt": "2024-01-15T14:20:00Z",
    "updatedAt": "2024-01-16T10:30:00Z",
    "documents": [
      {
        "id": "doc-id",
        "name": "receipt.pdf",
        "type": "RECEIPT",
        "size": 245760,
        "uploadedAt": "2024-01-15T14:25:00Z",
        "url": "https://storage.example.com/documents/receipt.pdf"
      }
    ],
    "timeline": [
      {
        "id": "timeline-1",
        "type": "SUBMITTED",
        "title": "Claim Submitted",
        "description": "Claim was submitted to insurance company",
        "timestamp": "2024-01-16T10:30:00Z"
      },
      {
        "id": "timeline-2",
        "type": "CREATED",
        "title": "Claim Created",
        "description": "Claim was created and saved as draft",
        "timestamp": "2024-01-15T14:20:00Z"
      }
    ]
  }
}
```

### PUT /claims/{id}

Update a claim (only DRAFT status claims can be updated).

**Request Body:**
```json
{
  "providerName": "Updated Provider Name",
  "amountCents": 16000,
  "notes": "Updated notes"
}
```

### DELETE /claims/{id}

Delete a claim (only DRAFT status claims can be deleted).

### POST /claims/{id}/submit

Submit a claim for processing.

**Request Body:**
```json
{
  "submissionMethod": "electronic",
  "insurerInfo": {
    "name": "Health Insurance Co",
    "payerCode": "12345",
    "address": "123 Insurance St, City, State 12345"
  },
  "notes": "Submission notes"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "claimId": "claim-id",
    "submissionId": "SUB_123456789",
    "method": "electronic",
    "status": "SUBMITTED",
    "submittedAt": "2024-01-16T10:30:00Z",
    "estimatedProcessingTime": "3-5 business days",
    "trackingInfo": {
      "confirmationNumber": "ECN_SUB_123456789",
      "submissionUrl": "https://clearinghouse.example.com/track/SUB_123456789"
    },
    "message": "Claim submitted electronically successfully"
  }
}
```

---

## File Upload Endpoints

### GET /upload

Get upload requirements and limits.

**Response:**
```json
{
  "success": true,
  "data": {
    "maxFileSize": 10485760,
    "maxFileSizeMB": 10,
    "allowedTypes": [
      "image/jpeg",
      "image/png",
      "image/heic",
      "application/pdf"
    ],
    "documentTypes": [
      "RECEIPT",
      "INSURANCE_CARD",
      "MEDICAL_RECORD",
      "PRESCRIPTION",
      "LAB_RESULT",
      "REFERRAL",
      "OTHER"
    ],
    "requirements": {
      "RECEIPT": "Medical receipt or invoice showing services and costs",
      "INSURANCE_CARD": "Front and back of insurance card",
      "MEDICAL_RECORD": "Relevant medical records or doctor notes"
    },
    "tips": [
      "Ensure documents are clear and readable",
      "Take photos in good lighting",
      "PDF files are preferred for text documents"
    ]
  }
}
```

### POST /upload

Upload a document for a claim.

**Request Body (multipart/form-data):**
- `file`: File to upload
- `claimId`: ID of the claim
- `documentType`: Type of document (RECEIPT, INSURANCE_CARD, etc.)
- `description`: Optional description

**Response:**
```json
{
  "success": true,
  "data": {
    "document": {
      "id": "doc-id",
      "name": "receipt.pdf",
      "type": "RECEIPT",
      "size": 245760,
      "url": "https://storage.example.com/documents/receipt.pdf",
      "uploadedAt": "2024-01-15T14:25:00Z"
    },
    "message": "Document uploaded successfully"
  }
}
```

---

## Profile Endpoints

### GET /profile

Get user profile and preferences.

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1234567890",
      "dateOfBirth": "1990-01-01",
      "verified": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "lastLoginAt": "2024-01-16T10:00:00Z"
    },
    "preferences": {
      "notifications": {
        "email": true,
        "push": true,
        "sms": false,
        "claimUpdates": true,
        "paymentAlerts": true,
        "documentReminders": true,
        "securityAlerts": true,
        "marketingEmails": false,
        "weeklyDigest": true
      },
      "privacy": {
        "shareDataForResearch": false,
        "allowMarketingCommunications": false
      },
      "mobile": {
        "biometricEnabled": true,
        "autoSync": true,
        "offlineMode": false
      }
    },
    "statistics": {
      "totalClaims": 25,
      "submittedClaims": 23,
      "approvedClaims": 18,
      "totalAmountClaimed": 125000,
      "totalAmountReceived": 98000,
      "averageProcessingTime": 7
    }
  }
}
```

### PUT /profile

Update user profile and preferences.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "preferences": {
    "notifications": {
      "email": true,
      "push": true,
      "claimUpdates": true
    },
    "mobile": {
      "biometricEnabled": true,
      "autoSync": true
    }
  }
}
```

### POST /profile

Change password.

**Request Body:**
```json
{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword123",
  "confirmPassword": "NewPassword123"
}
```

---

## Security Features

### Data Protection
- All PHI (Protected Health Information) is encrypted at rest and in transit
- Row-level security ensures users can only access their own data
- Comprehensive audit logging for all data access

### Authentication Security
- JWT tokens with configurable expiration
- Refresh token rotation
- Device registration and tracking
- Rate limiting on authentication endpoints

### File Upload Security
- File type validation and size limits
- Virus scanning (in production)
- Secure storage with signed URLs
- Automatic file cleanup

### API Security
- HTTPS enforcement
- CSRF protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection

---

## Error Handling

The API provides detailed error information to help with debugging:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please fix the following errors:",
    "details": [
      "Email is required",
      "Password must be at least 8 characters"
    ]
  }
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (access denied)
- `404`: Not Found
- `409`: Conflict (resource already exists)
- `429`: Too Many Requests (rate limited)
- `500`: Internal Server Error

---

## SDK and Examples

### iOS Swift Example

```swift
import Foundation

class ClaimFlowAPI {
    private let baseURL = "https://your-domain.com/api/mobile"
    private var accessToken: String?
    
    func login(email: String, password: String) async throws -> LoginResponse {
        let url = URL(string: "\(baseURL)/auth/login")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = [
            "email": email,
            "password": password,
            "deviceId": UIDevice.current.identifierForVendor?.uuidString,
            "deviceType": "ios"
        ]
        
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        let loginResponse = try JSONDecoder().decode(APIResponse<LoginResponse>.self, from: data)
        
        if loginResponse.success {
            self.accessToken = loginResponse.data?.tokens.accessToken
        }
        
        return loginResponse.data!
    }
    
    func getClaims() async throws -> [Claim] {
        let url = URL(string: "\(baseURL)/claims")!
        var request = URLRequest(url: url)
        request.setValue("Bearer \(accessToken!)", forHTTPHeaderField: "Authorization")
        
        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(APIResponse<ClaimsResponse>.self, from: data)
        
        return response.data?.claims ?? []
    }
}
```

### Android Kotlin Example

```kotlin
import retrofit2.http.*
import retrofit2.Response

interface ClaimFlowAPI {
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<APIResponse<LoginResponse>>
    
    @GET("claims")
    suspend fun getClaims(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<APIResponse<ClaimsResponse>>
    
    @POST("claims")
    suspend fun createClaim(@Body claim: CreateClaimRequest): Response<APIResponse<ClaimResponse>>
    
    @Multipart
    @POST("upload")
    suspend fun uploadDocument(
        @Part("claimId") claimId: RequestBody,
        @Part("documentType") documentType: RequestBody,
        @Part file: MultipartBody.Part
    ): Response<APIResponse<DocumentResponse>>
}
```

---

## Testing

### Postman Collection

A Postman collection is available with pre-configured requests for all endpoints. Import the collection and set up the following environment variables:

- `base_url`: https://your-domain.com/api/mobile
- `access_token`: Your JWT access token
- `refresh_token`: Your JWT refresh token

### Test Accounts

For development and testing, you can use these test accounts:

- Email: `test@example.com`
- Password: `TestPass123`

---

## Support

For API support and questions:
- Email: api-support@claimflow.com
- Documentation: https://docs.claimflow.com/mobile-api
- Status Page: https://status.claimflow.com

## Changelog

### v1.0.0 (Current)
- Initial release
- Authentication endpoints
- Claims management
- File upload
- Profile management
- Comprehensive error handling and security