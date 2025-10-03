# ClaimFlow - HIPAA-Compliant Insurance Claims Management System

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template/claimflow?referralCode=halohealthafrica)

ClaimFlow is a comprehensive, HIPAA-compliant insurance claims management system built with Next.js 14, featuring AI-powered OCR, medical coding assistance, and secure claim tracking.

## 🚀 Features

### Core Functionality
- **📋 Claim Management** - Create, track, and manage insurance claims
- **🔍 OCR Processing** - Extract data from insurance cards and receipts
- **🤖 AI-Powered Coding** - Intelligent CPT and ICD code suggestions
- **📊 Smart Validation** - Real-time claim validation with approval likelihood
- **📄 PDF Generation** - Professional claim forms and appeal letters
- **🔔 Notifications** - Email and push notifications for claim updates

### Security & Compliance
- **🔒 HIPAA Compliant** - End-to-end encryption for PHI data
- **🛡️ Secure Authentication** - NextAuth.js with JWT tokens
- **📝 Audit Logging** - Comprehensive audit trails for all PHI access
- **🔐 Role-Based Access** - Granular permissions and access controls

### AI & Automation
- **🧠 OpenAI Integration** - GPT-4 powered medical coding and validation
- **📸 OCR Services** - Google Vision API and AWS Textract support
- **🔄 Auto-Recovery** - Intelligent error handling and retry mechanisms
- **📈 Analytics** - Performance monitoring and error tracking

### Developer Experience
- **⚡ Next.js 14** - App Router with Server Components
- **🎨 Tailwind CSS** - Modern, responsive UI design
- **🗄️ Prisma ORM** - Type-safe database operations
- **🧪 Comprehensive Testing** - Unit, integration, and E2E tests
- **📱 Mobile API** - RESTful API for mobile applications

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   Next.js 14    │◄──►│   App Router    │◄──►│   PostgreSQL    │
│   React 18      │    │   Prisma ORM    │    │   Encrypted PHI │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AI Services   │    │   File Storage  │    │   Monitoring    │
│   OpenAI GPT-4  │    │   AWS S3        │    │   Error Track   │
│   OCR APIs      │    │   Secure Upload │    │   Audit Logs    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Railway account (for deployment)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/HaloHealthAfrica/claimflow.git
   cd claimflow
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Set up the database**
   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   ```
   http://localhost:3000
   ```

## 🌐 Deploy to Railway

### One-Click Deploy
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template/claimflow?referralCode=halohealthafrica)

### Manual Deployment

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login and deploy**
   ```bash
   railway login
   railway init
   railway add postgresql
   railway up
   ```

3. **Set environment variables**
   ```bash
   railway variables set NEXTAUTH_SECRET="your-secret-key"
   railway variables set NEXTAUTH_URL="https://your-app.railway.app"
   ```

4. **Run migrations**
   ```bash
   railway run npx prisma migrate deploy
   railway run npx prisma db seed
   ```

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## 📋 Environment Variables

### Required
```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com
NODE_ENV=production
```

### Optional (for full functionality)
```env
# AI Features
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4

# File Storage
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=claimflow-uploads

# Email Notifications
SENDGRID_API_KEY=SG...
SENDGRID_FROM_EMAIL=noreply@domain.com

# OCR Services
GOOGLE_CLOUD_PROJECT_ID=project-id
GOOGLE_CLOUD_PRIVATE_KEY=-----BEGIN...
GOOGLE_CLOUD_CLIENT_EMAIL=service@project.iam...
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:components

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## 📚 API Documentation

### REST API
- **Authentication**: `/api/auth/*`
- **Claims**: `/api/claims/*`
- **OCR**: `/api/receipt/process`
- **AI Services**: `/api/ai/*`
- **Mobile API**: `/api/mobile/*`

### Health Check
```
GET /api/health
```

For complete API documentation, see [src/docs/mobile-api.md](./src/docs/mobile-api.md).

## 🏛️ Project Structure

```
claimflow/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API routes
│   │   ├── auth/           # Authentication pages
│   │   ├── claims/         # Claims management
│   │   └── ...
│   ├── components/         # React components
│   ├── lib/               # Utility libraries
│   ├── hooks/             # Custom React hooks
│   └── docs/              # Documentation
├── prisma/                # Database schema & migrations
├── tests/                 # Test suites
├── scripts/               # Deployment scripts
└── public/               # Static assets
```

## 🔧 Development

### Database Operations
```bash
npm run db:generate     # Generate Prisma client
npm run db:migrate      # Run migrations
npm run db:seed         # Seed database
npm run db:studio       # Open Prisma Studio
npm run db:reset        # Reset database
```

### Code Quality
```bash
npm run lint           # ESLint
npm run type-check     # TypeScript check
npm run format         # Prettier formatting
```

## 🛡️ Security Features

- **Data Encryption**: Column-level encryption for PHI data
- **Audit Logging**: Comprehensive audit trails for compliance
- **Access Controls**: Role-based permissions system
- **Secure Headers**: CSRF, XSS, and other security headers
- **Rate Limiting**: API rate limiting and abuse prevention
- **Input Validation**: Comprehensive input sanitization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [DEPLOYMENT.md](./DEPLOYMENT.md) | [RAILWAY_SETUP.md](./RAILWAY_SETUP.md)
- **Issues**: [GitHub Issues](https://github.com/HaloHealthAfrica/claimflow/issues)
- **Discussions**: [GitHub Discussions](https://github.com/HaloHealthAfrica/claimflow/discussions)

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Prisma](https://prisma.io/) - Database ORM
- [Railway](https://railway.app/) - Deployment platform
- [OpenAI](https://openai.com/) - AI services
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework

---

**Built with ❤️ for healthcare providers and insurance professionals**