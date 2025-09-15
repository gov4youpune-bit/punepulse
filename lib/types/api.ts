// API Types for Pune Pulse

// Attachments API
export interface SingleFileRequest {
  filename: string;
  contentType: string;
  bucket?: string;
  filePath?: string;
}

export interface BatchFileRequest {
  files: Array<{
    filename: string;
    contentType: string;
  }>;
  bucket?: string;
}

export interface SingleFileResponse {
  uploadUrl: string;
  key: string;
}

export interface BatchFileResponse {
  uploads: Array<{
    uploadUrl: string;
    key: string;
  }>;
}

export interface PublicUrlResponse {
  url: string;
}

// Complaints API
export interface ComplaintCreateRequest {
  category: string;
  subtype?: string;
  description: string;
  lat?: number | null;
  lng?: number | null;
  location_text?: string;
  email?: string | null;
  attachments?: string[];
}

export interface ComplaintCreateResponse {
  id: string;
  token: string;
  status: string;
}

export interface ComplaintUpdateRequest {
  id: string;
  patch: {
    urgency?: 'high' | 'medium' | 'low';
    status?: string;
    description?: string;
    category?: string;
    subtype?: string;
    location_text?: string;
    group_name?: string;
  };
}

export interface ComplaintUpdateResponse {
  complaint: any;
}

export interface BulkActionRequest {
  action: 'delete' | 'set_urgency' | 'group';
  ids: string[];
  payload?: {
    urgency?: 'high' | 'medium' | 'low';
    group?: string;
  };
}

export interface BulkActionResponse {
  success: boolean;
  message?: string;
  results?: {
    updated: number;
    failed: number;
    errors: string[];
  };
}

// Database types
export interface Complaint {
  id: string;
  token: string;
  category: string;
  subtype: string;
  description: string;
  location_text?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  ward_number?: number;
  urgency?: 'high' | 'medium' | 'low';
  attachments?: string[];
  group_name?: string | null;
  submitted_to_portal?: any;
  audit_logs?: any[];
  // Worker assignment fields
  assigned_to?: string | null;
  assigned_at?: string | null;
  verification_status?: 'none' | 'pending' | 'verified' | 'rejected';
  verified_at?: string | null;
  verified_by?: string | null;
  // Assignment history and worker reports
  complaint_assignments?: ComplaintAssignment[];
  worker_reports?: WorkerReport[];
  // local UI fields
  _selected?: boolean;
  _group?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface Worker {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  department?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ComplaintAssignment {
  id: string;
  complaint_id: string;
  assigned_to: string;
  assigned_by: string | null;
  note?: string | null;
  status: 'assigned' | 'accepted' | 'rejected' | 'completed';
  created_at: string;
  updated_at: string;
  workers?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface WorkerReport {
  id: string;
  complaint_id: string;
  worker_id: string;
  comments?: string | null;
  photos: string[];
  status: 'submitted' | 'verified' | 'rejected';
  created_at: string;
  updated_at: string;
  workers?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface AuditLog {
  id: string;
  complaint_id: string;
  actor: string;
  action: string;
  payload: any;
  created_at: string;
}
