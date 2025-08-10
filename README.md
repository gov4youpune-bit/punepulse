# Pune Pulse - Civic Complaint PWA System

A production-ready, camera-first civic complaint submission system for Pune Municipal Corporation (PMC) with automated portal integration and admin management capabilities.

## 🚀 Features

### Citizen Interface
- **Camera-First Design**: Optimized mobile photo capture with GPS location tagging
- **Loginless Experience**: Anonymous complaint submission with tracking tokens
- **Offline Capability**: PWA with service worker for offline functionality
- **Real-time Tracking**: Track complaint status with unique PMC-XXXXXX tokens
- **Multi-language Support**: English/Marathi interface (configurable)

### Admin Dashboard
- **Supabase Authentication**: Magic-link email authentication for operators
- **Complaint Management**: Full CRUD operations with status updates
- **Map Visualization**: Geographic clustering of complaints
- **Portal Integration**: Automated submission to PMC/MSEDCL portals
- **Audit Trail**: Complete activity logging and reporting
- **Export Capabilities**: CSV downloads and bulk operations

### Technical Architecture
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS + PWA
- **Backend**: Next.js API Routes + Supabase + BullMQ/Redis
- **Database**: PostgreSQL with PostGIS for geospatial queries
- **Storage**: Supabase Storage for file attachments
- **RPA**: Playwright for portal automation
- **LLM**: GPT-3.5 for complaint classification and formatting
- **Monitoring**: Comprehensive logging and error tracking

## 🏗️ Project Structure

```
pune-pulse/
├── app/                    # Next.js App Router
│   ├── api/               # API endpoints
│   │   ├── complaints/    # Complaint CRUD operations
│   │   ├── attachments/   # File upload handling
│   │   └── submit/        # Portal submission
│   ├── admin/            # Admin dashboard
│   └── globals.css       # Global styles
├── components/           # React components
│   ├── ui/              # shadcn/ui components
│   ├── camera-capture.tsx
│   ├── location-capture.tsx
│   ├── complaint-form.tsx
│   └── admin-auth.tsx
├── supabase/
│   └── migrations/      # Database schema
├── providers/           # React context providers
├── store/              # Zustand state management
├── lib/                # Utility functions
└── public/             # Static assets + PWA files
```

## 🛠️ Setup & Installation

### Prerequisites
- Node.js 18+ and npm
- Supabase account and project
- OpenAI API key
- Redis instance (Upstash recommended)

### 1. Clone Repository
```bash
git clone https://github.com/your-org/pune-pulse
cd pune-pulse
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

Fill in all required environment variables:
- Supabase project URL and keys
- OpenAI API key for LLM services
- Redis URL for job queue
- Portal credentials (PMC/MSEDCL)

### 3. Database Setup
Run Supabase migrations:

```bash
# Using Supabase CLI (recommended)
npx supabase db push

# Or manually run SQL files in Supabase dashboard
```

### 4. Development Server
```bash
npm run dev
```

Access the application:
- **Citizen Interface**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3000/admin
- **API Documentation**: http://localhost:3000/api

## 📱 PWA Installation

The app is installable as a PWA on mobile devices:

1. Open the app in mobile browser
2. Tap browser menu → "Add to Home Screen"
3. Use like a native app with offline capabilities

## 🔧 API Endpoints

### Public Endpoints
```
POST /api/complaints              # Submit new complaint
GET  /api/complaints/[token]      # Track complaint status
POST /api/attachments             # Upload files
```

### Admin Endpoints (Authenticated)
```
GET    /api/admin/complaints      # List all complaints
PUT    /api/admin/complaints/[id] # Update complaint
POST   /api/submit/pmc            # Submit to PMC portal
POST   /api/submit/msedcl         # Submit to MSEDCL portal
GET    /api/admin/stats           # Dashboard statistics
POST   /api/admin/export          # Export data
```

### Webhook Endpoints
```
POST /api/webhook/connector-result # Portal automation results
POST /api/webhook/llm-classification # LLM processing results
```

## 🤖 LLM Integration

### Complaint Classification
Automatically categorizes complaints and determines:
- **Category**: roads, water, power, urban, welfare, other
- **Subtype**: pothole, streetlight, burst_pipe, etc.
- **Urgency**: low, medium, high
- **Required Documents**: based on complaint type
- **Portal Formatting**: optimized text for government portals

### Usage
```javascript
const classification = await classifyComplaint(description, location);
```

## 🔗 Portal Connectors

### PMC Connector (Implemented)
- Automated form filling for PMC citizen portal
- File upload handling for attachments
- CAPTCHA detection and retry logic
- Status tracking and confirmation scraping

### MSEDCL Connector (Stub)
- Ready for MSEDCL portal integration
- Same architecture as PMC connector
- Configurable via environment variables

### Adding New Connectors
1. Create connector in `services/worker/connectors/`
2. Implement `BaseConnector` interface
3. Add configuration in environment variables
4. Update admin dashboard for connector selection

## 🔒 Security Features

- **Row Level Security (RLS)**: Database-level access control
- **Anonymous Submissions**: No PII collection by default
- **Audit Logging**: Complete activity trail
- **File Upload Security**: Type validation and size limits
- **Rate Limiting**: API endpoint protection
- **CORS Protection**: Secure cross-origin requests

## 📊 Monitoring & Analytics

### Application Monitoring
- Error tracking with detailed stack traces
- Performance metrics and slow query detection
- API endpoint usage and response times
- User journey analytics (privacy-preserving)

### Admin Analytics
- Complaint volume and trends
- Resolution time tracking
- Category distribution analysis
- Ward-wise performance metrics
- Portal submission success rates

## 🚀 Deployment

### Frontend (Vercel)
```bash
# Connect GitHub repository to Vercel
# Environment variables auto-synced from GitHub
vercel deploy
```

### Worker Service (Fly.io/Railway)
```bash
cd services/worker
fly deploy
```

### Database (Supabase)
Database and storage are managed by Supabase cloud.

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

### E2E Tests
```bash
npm run test:e2e
```

### API Testing
```bash
npm run test:api
```

### Load Testing
```bash
npm run test:load
```

## 📈 Performance Optimization

- **Image Compression**: Automatic image optimization on upload
- **Lazy Loading**: Components and images loaded on demand  
- **Caching Strategy**: Aggressive caching for static content
- **Database Indexing**: Optimized queries with proper indexes
- **CDN**: Static assets served via Vercel Edge Network

## 🌐 Localization

### Supported Languages
- English (default)
- Marathi (मराठी)

### Adding New Languages
1. Add translation files in `locales/`
2. Update language selector component
3. Configure Next.js i18n settings

## 🔄 Data Migration

### Import Existing Complaints
```bash
npm run migrate:import -- --file=complaints.csv
```

### Export for Backup
```bash
npm run migrate:export -- --format=json
```

## 📋 Maintenance

### Regular Tasks
- **Database Cleanup**: Remove old attachments and logs
- **Cache Clearing**: Reset Redis cache periodically
- **Log Rotation**: Archive old application logs
- **Security Updates**: Keep dependencies up to date

### Monitoring Checklist
- [ ] API response times < 500ms
- [ ] Database query performance
- [ ] Storage usage and cleanup
- [ ] Portal connector success rates
- [ ] Error rates and crash reports

## 🤝 Contributing

### Development Workflow
1. Fork repository
2. Create feature branch
3. Implement changes with tests
4. Submit pull request
5. Code review and approval
6. Merge to main branch

### Code Standards
- TypeScript strict mode
- ESLint + Prettier formatting
- Component and API documentation
- Test coverage > 80%
- Security review for sensitive changes

## 📞 Support

### Technical Support
- **Development Team**: dev@punepulse.gov.in
- **System Admin**: admin@punepulse.gov.in
- **Emergency Issues**: +91-XXXX-XXXX-XX

### Documentation
- **API Docs**: https://docs.punepulse.gov.in
- **User Guide**: https://help.punepulse.gov.in
- **Admin Manual**: https://admin.punepulse.gov.in/docs

### Issue Tracking
Report bugs and feature requests on GitHub Issues with:
- Clear description and steps to reproduce
- Screenshots/videos if applicable
- Browser and device information
- Error logs and stack traces

---

**Version**: 1.0.0  
**Last Updated**: January 2025  
**License**: MIT (for open-source components)