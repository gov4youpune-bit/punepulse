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
- **Clerk Authentication**: Modern authentication with role-based access control
- **Complaint Management**: Full CRUD operations with status updates
- **Worker Assignment**: Assign complaints to field workers with email notifications
- **Worker Reports Review**: Review and approve/reject worker field reports
- **Map Visualization**: Geographic clustering of complaints
- **Portal Integration**: Automated submission to PMC/MSEDCL portals
- **Audit Trail**: Complete activity logging and reporting
- **Export Capabilities**: CSV downloads and bulk operations

### Worker Portal
- **Field Worker Dashboard**: View assigned complaints and submit progress reports
- **Photo Upload**: Upload multiple photos showing work progress
- **Status Reporting**: Submit comments and status updates
- **Mobile Optimized**: Responsive design for field work

### Technical Architecture
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS + PWA
- **Authentication**: Clerk for user management and role-based access
- **Backend**: Next.js API Routes + Supabase + BullMQ/Redis
- **Database**: PostgreSQL with PostGIS for geospatial queries
- **Storage**: Supabase Storage for file attachments
- **Email**: Nodemailer with SMTP for notifications
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
- Clerk account for authentication
- OpenAI API key
- Redis instance (Upstash recommended)
- SMTP server credentials

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
- Clerk publishable key and secret key
- OpenAI API key for LLM services
- Redis URL for job queue
- SMTP credentials for email notifications
- Portal credentials (PMC/MSEDCL)

### 3. Database Setup
Run Supabase migrations:

```bash
# Using Supabase CLI (recommended)
npx supabase db push

# Or manually run SQL files in Supabase dashboard
```

### 4. Clerk Authentication Setup

#### Create Clerk Application
1. Sign up at [clerk.com](https://clerk.com)
2. Create a new application
3. Copy your publishable key and secret key to `.env.local`

#### Environment Variables
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

#### User Role Management
The system uses role-based access control with these roles:
- **admin**: Full access to admin dashboard and worker management
- **worker**: Access to worker dashboard and assigned complaints  
- **citizen**: Default role for complaint submission

#### Creating User Mappings
To create admin or worker accounts, insert records into the `app_users` table:

```sql
-- Create admin user
INSERT INTO public.app_users (clerk_user_id, email, role, display_name)
VALUES ('user_xxx', 'admin@example.com', 'admin', 'Admin User');

-- Create worker user
INSERT INTO public.app_users (clerk_user_id, email, role, display_name)
VALUES ('user_yyy', 'worker@example.com', 'worker', 'Field Worker');

-- Create worker record
INSERT INTO public.workers (clerk_user_id, display_name, phone, area, is_active)
VALUES ('user_yyy', 'Field Worker', '+91-9876543210', 'Ward 1', true);
```

### 5. Development Server
```bash
npm run dev
```

Access the application:
- **Citizen Interface**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3000/admin (requires admin role)
- **Worker Dashboard**: http://localhost:3000/worker/dashboard (requires worker role)
- **Worker Login**: http://localhost:3000/worker/login

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

### Admin Endpoints (Clerk Authenticated)
```
GET    /api/complaints            # List all complaints
POST   /api/complaints/assign     # Assign complaint to worker
POST   /api/complaints/verify     # Approve/reject worker reports
GET    /api/complaints/reports    # Get worker reports for review
POST   /api/submit/pmc            # Submit to PMC portal
POST   /api/submit/msedcl         # Submit to MSEDCL portal
```

### Worker Endpoints (Clerk Authenticated)
```
GET    /api/complaints/assigned   # Get assigned complaints
POST   /api/complaints/report     # Submit worker report
```

### Public Endpoints
```
GET    /api/attachments/public    # Get signed URLs for attachments
```

### Webhook Endpoints
```
POST /api/webhook/connector-result # Portal automation results
POST /api/webhook/llm-classification # LLM processing results
```

## 🔄 Assignment & Worker Flow

### Complete Workflow
1. **Citizen submits complaint** → Status: `submitted`
2. **Admin assigns to worker** → Status: `assigned`, Email sent to worker
3. **Worker submits report** → Status: `admin_verification_pending`
4. **Admin reviews report** → Approve: Status: `resolved`, Email sent to citizen
5. **Admin rejects report** → Status: `in_progress`, Email sent to worker

### Assignment Process
1. Admin selects complaint and clicks "Assign"
2. Selects worker from dropdown
3. Adds optional assignment note
4. System updates complaint status and sends email to worker
5. Worker receives email with dashboard link

### Worker Report Process
1. Worker logs in to `/worker/dashboard`
2. Views assigned complaints
3. Clicks "Submit Report" for a complaint
4. Uploads photos and adds comments
5. Submits report for admin review

### Admin Review Process
1. Admin goes to "Worker Replies" tab
2. Reviews submitted reports with photos
3. Clicks "Approve" → Complaint marked resolved, citizen notified
4. Clicks "Reject" → Worker notified to resubmit

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