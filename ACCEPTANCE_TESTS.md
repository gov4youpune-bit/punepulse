# Pune Pulse - Worker Assignment & Verification Workflow - Acceptance Tests

## Overview
This document outlines the acceptance tests for the implemented worker assignment and verification workflow, along with the Leaflet map fixes and admin authentication improvements.

## Test Environment Setup
1. Ensure the database migrations have been applied:
   - `supabase/migrations/20241201_add_urgency_group_name.sql`
   - `supabase/migrations/20241201_worker_assignment_workflow.sql`
   - `supabase/migrations/20241201_fix_schema_mismatch.sql`

2. Ensure worker profiles are seeded in `public.workers` table:
   - Karve Nagar, Erandwane, Deccan, FC Road, Pune City

3. Ensure admin accounts exist with `user_metadata.role = 'admin'`

## Test Cases

### 1. Admin Authentication (Email/Password Signin)
**Test ID:** AUTH-001
**Description:** Verify admins can sign in using email/password instead of magic links

**Steps:**
1. Navigate to `/admin`
2. Enter admin email and password
3. Click "Sign In"

**Expected Results:**
- ✅ Admin successfully signs in
- ✅ Admin role is read from `user_metadata.role`
- ✅ Admin dashboard loads with full functionality
- ✅ No magic link email is sent

**Test Data:**
- Use existing admin credentials (created locally by owner)

---

### 2. Role-Based Access Control - Admin Endpoints
**Test ID:** RBAC-001
**Description:** Verify admin-only endpoints require admin role

**Endpoints to Test:**
- `POST /api/complaints/update`
- `POST /api/complaints/bulk`
- `POST /api/complaints/assign`
- `POST /api/complaints/verify`
- `GET /api/workers`

**Steps:**
1. Sign in as non-admin user
2. Attempt to access each admin endpoint
3. Sign in as admin user
4. Verify admin endpoints work

**Expected Results:**
- ✅ Non-admin users receive 403 Forbidden
- ✅ Admin users can access all endpoints successfully
- ✅ Role check uses `user_metadata.role === 'admin'`

---

### 3. Role-Based Access Control - Worker Endpoints
**Test ID:** RBAC-002
**Description:** Verify worker endpoints require worker role or membership

**Endpoints to Test:**
- `GET /api/complaints/assigned`
- `POST /api/complaints/report`

**Steps:**
1. Sign in as non-worker user
2. Attempt to access worker endpoints
3. Sign in as worker user (or user in `public.workers`)
4. Verify worker endpoints work

**Expected Results:**
- ✅ Non-worker users receive 403 Forbidden
- ✅ Worker users can access endpoints successfully
- ✅ Role check uses `user_metadata.role === 'worker'` OR membership in `public.workers`

---

### 4. Worker Assignment Dropdown Population
**Test ID:** ASSIGN-001
**Description:** Verify assign dropdown shows seeded workers

**Steps:**
1. Sign in as admin
2. Navigate to complaints list
3. Click "Assign" button on any complaint
4. Check worker dropdown

**Expected Results:**
- ✅ Dropdown shows all 5 seeded workers:
  - Karve Nagar
  - Erandwane
  - Deccan
  - FC Road
  - Pune City
- ✅ Worker names display correctly
- ✅ Worker emails display (or "No email" if null)

---

### 5. Complaint Assignment Persistence
**Test ID:** ASSIGN-002
**Description:** Verify assignment persists to database and updates complaint

**Steps:**
1. Sign in as admin
2. Select a complaint and click "Assign"
3. Select a worker from dropdown
4. Add optional note
5. Click "Assign"

**Expected Results:**
- ✅ Assignment created in `complaint_assignments` table
- ✅ Complaint `assigned_to` field updated
- ✅ Complaint `assigned_at` field updated
- ✅ Complaint `status` set to 'assigned'
- ✅ Audit log entry created
- ✅ UI shows optimistic update immediately
- ✅ Success toast displayed

**Database Verification:**
```sql
-- Check assignment
SELECT * FROM complaint_assignments WHERE complaint_id = '<complaint_id>';

-- Check complaint update
SELECT assigned_to, assigned_at, status FROM complaints WHERE id = '<complaint_id>';

-- Check audit log
SELECT * FROM audit_logs WHERE complaint_id = '<complaint_id>' AND action = 'complaint_assigned';
```

---

### 6. Leaflet Map - Coordinate Parsing
**Test ID:** MAP-001
**Description:** Verify API returns numeric lat/lng fields

**Steps:**
1. Sign in as admin
2. Navigate to "City Map" tab
3. Check browser network tab for `/api/complaints` response

**Expected Results:**
- ✅ API response includes `lat` and `lng` fields as numbers
- ✅ Coordinates parsed from `location_text` format "lat,lng"
- ✅ Null values for complaints without coordinates

**Sample API Response:**
```json
{
  "complaints": [
    {
      "id": "...",
      "location_text": "18.5204, 73.8567",
      "lat": 18.5204,
      "lng": 73.8567
    }
  ]
}
```

---

### 7. Leaflet Map - Marker Plotting
**Test ID:** MAP-002
**Description:** Verify markers plot correctly for complaints with coordinates

**Steps:**
1. Sign in as admin
2. Navigate to "City Map" tab
3. Wait for map to load
4. Check marker visibility

**Expected Results:**
- ✅ Markers appear only for complaints with valid lat/lng
- ✅ Markers positioned correctly on map
- ✅ Map calls `invalidateSize()` after tab change
- ✅ Map calls `fitBounds()` when markers exist
- ✅ Map centers on Pune when no markers exist

---

### 8. Leaflet Map - Marker Click Interaction
**Test ID:** MAP-003
**Description:** Verify marker clicks open details modal

**Steps:**
1. Sign in as admin
2. Navigate to "City Map" tab
3. Click on any marker
4. Verify modal behavior

**Expected Results:**
- ✅ Clicking marker calls `openDetails(token)`
- ✅ Details modal opens with complaint information
- ✅ Modal z-index higher than map (no hiding issues)
- ✅ Modal shows assignment history and worker reports

---

### 9. Worker Dashboard - Assigned Complaints
**Test ID:** WORKER-001
**Description:** Verify workers can view assigned complaints

**Steps:**
1. Sign in as worker user
2. Navigate to `/worker`
3. Check assigned complaints list

**Expected Results:**
- ✅ Worker dashboard loads successfully
- ✅ Shows only complaints assigned to current worker
- ✅ Displays complaint details (token, category, description, etc.)
- ✅ Shows assignment date and location
- ✅ Shows assignment notes if present

---

### 10. Worker Report Submission
**Test ID:** WORKER-002
**Description:** Verify workers can submit reports with photos

**Steps:**
1. Sign in as worker user
2. Navigate to `/worker`
3. Click "Submit Report" on assigned complaint
4. Add comments
5. Upload photos
6. Submit report

**Expected Results:**
- ✅ Report dialog opens correctly
- ✅ Photos upload successfully with progress indicators
- ✅ Report submitted to `worker_reports` table
- ✅ Complaint status updated to 'pending_verification'
- ✅ Complaint `verification_status` set to 'pending'
- ✅ Audit log entry created
- ✅ Success toast displayed

**Database Verification:**
```sql
-- Check worker report
SELECT * FROM worker_reports WHERE complaint_id = '<complaint_id>';

-- Check complaint status update
SELECT status, verification_status FROM complaints WHERE id = '<complaint_id>';
```

---

### 11. Admin Verification/Rejection
**Test ID:** VERIFY-001
**Description:** Verify admins can verify or reject worker reports

**Steps:**
1. Sign in as admin
2. Navigate to complaints list
3. Open details for complaint with pending verification
4. Click "Verify" or "Reject" on worker report

**Expected Results:**
- ✅ Verification updates complaint status to 'resolved'
- ✅ Rejection sets complaint back to 'assigned' or 'in_progress'
- ✅ Report status updated to 'verified' or 'rejected'
- ✅ Complaint `verified_at` and `verified_by` fields updated
- ✅ Audit log entry created

**Database Verification:**
```sql
-- Check verification
SELECT verification_status, verified_at, verified_by FROM complaints WHERE id = '<complaint_id>';

-- Check report status
SELECT status FROM worker_reports WHERE id = '<report_id>';
```

---

### 12. Assignment History Display
**Test ID:** HISTORY-001
**Description:** Verify assignment history shows in details modal

**Steps:**
1. Sign in as admin
2. Open complaint details modal
3. Check "Assignment History" section

**Expected Results:**
- ✅ Shows all previous assignments
- ✅ Displays worker name and assignment date
- ✅ Shows assignment notes
- ✅ Properly formatted and styled

---

### 13. Worker Reports Display
**Test ID:** REPORTS-001
**Description:** Verify worker reports show in details modal

**Steps:**
1. Sign in as admin
2. Open complaint details modal
3. Check "Worker Reports" section

**Expected Results:**
- ✅ Shows all worker reports
- ✅ Displays worker name and report date
- ✅ Shows report comments
- ✅ Shows report photos via AttachmentViewer
- ✅ Shows report status badges
- ✅ Verify/Reject buttons for pending reports

---

### 14. Public Tracking Page Updates
**Test ID:** TRACK-001
**Description:** Verify public tracking page shows worker information

**Steps:**
1. Navigate to `/track/<token>` for assigned complaint
2. Check displayed information

**Expected Results:**
- ✅ Shows worker assignment information if available
- ✅ Shows verified worker reports with photos
- ✅ Uses AttachmentViewer for report photos
- ✅ Displays worker comments and verification status

---

### 15. Build and TypeScript Validation
**Test ID:** BUILD-001
**Description:** Verify application builds successfully

**Steps:**
1. Run `npm run build`
2. Check for errors and warnings

**Expected Results:**
- ✅ Build completes successfully (exit code 0)
- ✅ No TypeScript errors
- ✅ Only warnings about `<img>` usage and React hooks dependencies
- ✅ All routes and API endpoints compile correctly

---

## Test Execution Summary

### Manual Testing Checklist
- [ ] Admin email/password signin works
- [ ] Role checks enforced on all endpoints
- [ ] Worker assignment dropdown populated
- [ ] Assignment persistence verified
- [ ] Leaflet map displays markers correctly
- [ ] Marker clicks open details modal
- [ ] Worker dashboard shows assigned complaints
- [ ] Worker report submission works
- [ ] Admin verification/rejection works
- [ ] Assignment history displays
- [ ] Worker reports display with photos
- [ ] Public tracking page updated
- [ ] Build passes successfully

### Database Verification Queries
```sql
-- Check workers table
SELECT * FROM workers WHERE is_active = true;

-- Check assignments
SELECT ca.*, w.name as worker_name 
FROM complaint_assignments ca 
JOIN workers w ON ca.assigned_to = w.id 
ORDER BY ca.created_at DESC;

-- Check worker reports
SELECT wr.*, w.name as worker_name 
FROM worker_reports wr 
JOIN workers w ON wr.worker_id = w.id 
ORDER BY wr.created_at DESC;

-- Check complaint statuses
SELECT id, token, status, assigned_to, verification_status, verified_at 
FROM complaints 
WHERE assigned_to IS NOT NULL 
ORDER BY updated_at DESC;
```

## Notes
- All tests should be performed with actual data in the database
- Worker accounts need to be created with `user_metadata.role = 'worker'` or added to `public.workers` table
- Admin accounts need `user_metadata.role = 'admin'`
- Test with various complaint states (submitted, assigned, pending_verification, resolved)
- Verify optimistic UI updates work correctly
- Check error handling for network failures and invalid data
