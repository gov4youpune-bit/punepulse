# Pune Pulse Development Guide

## Required Environment Variables

Make sure these environment variables are set in your `.env.local` file:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Storage Configuration
NEXT_PUBLIC_STORAGE_BUCKET=your_storage_bucket_name
```

## Database Migrations

Run these SQL commands in your Supabase SQL editor to add the required columns:

```sql
-- Add urgency column with default 'medium'
ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'medium';

-- Add optional group_name column
ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS group_name TEXT DEFAULT NULL;

-- Ensure token unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_complaints_token ON public.complaints (token);

-- Add check constraint for urgency values
ALTER TABLE public.complaints
  ADD CONSTRAINT IF NOT EXISTS check_urgency_values 
  CHECK (urgency IN ('high', 'medium', 'low'));
```

## New API Endpoints

### Attachments API

- `POST /api/attachments` - Upload single or batch files
  - Single: `{ filename: string, contentType: string }`
  - Batch: `{ files: [{ filename: string, contentType: string }, ...] }`
  - Returns: `{ uploadUrl: string, key: string }` or `{ uploads: [...] }`

- `GET /api/attachments/public?key=...` - Get signed URL for attachment
  - Returns: `{ url: string }`

### Complaints API

- `POST /api/complaints/update` - Update complaint fields
  - Body: `{ id: string, patch: { urgency?, status?, description?, category?, subtype?, location_text?, group_name? } }`
  - Returns: `{ complaint: <updated row> }`
  - Requires authentication

- `POST /api/complaints/bulk` - Bulk operations
  - Body: `{ action: 'delete'|'set_urgency'|'group', ids: string[], payload?: any }`
  - Returns: `{ success: boolean, message?: string, results?: {...} }`
  - Requires authentication

## Features Implemented

### Multi-Image Upload
- Support for multiple image selection in complaint form
- Batch upload to Supabase storage
- Progress tracking and error handling
- Image previews with remove functionality

### Admin UI Enhancements
- Priority/urgency selection with server persistence
- Bulk operations (delete, set urgency, group)
- Signed URL generation for attachment viewing
- Optimistic UI updates with server sync

### Database Schema Updates
- Added `urgency` column (high/medium/low)
- Added `group_name` column for complaint grouping
- Proper constraints and indexes

## Testing

1. Run the database migrations
2. Start the development server: `npm run dev`
3. Test complaint submission with multiple images
4. Test admin functionality (priority updates, bulk actions)
5. Verify attachments load correctly in admin details modal

## Build

The project builds successfully with `npm run build`. Some warnings about image optimization and React hooks dependencies are present but don't affect functionality.
