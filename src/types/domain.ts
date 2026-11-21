export type UserRole = 'admin' | 'advisor' | 'technician' | 'parts_manager' | 'customer';
export type DealershipRole = Exclude<UserRole, 'customer'>;
export type SupportedLanguage = 'en' | 'ta' | 'hi';

export type RepairStage =
  | 'vehicle_received'
  | 'inspection'
  | 'diagnosis'
  | 'repair_in_progress'
  | 'waiting_for_approval'
  | 'repair_completed'
  | 'ready_for_pickup';

export const REPAIR_STAGES: {
  key: RepairStage;
  index: number;
  label: string;
  shortLabel: string;
  description: string;
}[] = [
  {
    key: 'vehicle_received',
    index: 0,
    label: 'Vehicle Received',
    shortLabel: 'Received',
    description: 'Checked in at service bay and job card opened.',
  },
  {
    key: 'inspection',
    index: 1,
    label: 'Inspection',
    shortLabel: 'Inspection',
    description: 'Multi-point mechanical and safety walkaround in progress.',
  },
  {
    key: 'diagnosis',
    index: 2,
    label: 'Diagnosis',
    shortLabel: 'Diagnosis',
    description: 'OBD-II scan, fault isolation, and root-cause verification.',
  },
  {
    key: 'repair_in_progress',
    index: 3,
    label: 'Repair In Progress',
    shortLabel: 'In Repair',
    description: 'Technician executing approved service and replacement tasks.',
  },
  {
    key: 'waiting_for_approval',
    index: 4,
    label: 'Waiting for Customer Approval',
    shortLabel: 'Approval',
    description: 'Additional findings sent to customer for authorization.',
  },
  {
    key: 'repair_completed',
    index: 5,
    label: 'Repair Completed',
    shortLabel: 'Completed',
    description: 'Work finished; road test and quality control check underway.',
  },
  {
    key: 'ready_for_pickup',
    index: 6,
    label: 'Ready for Pickup',
    shortLabel: 'Ready',
    description: 'Vehicle washed, invoice finalized, and ready at handover bay.',
  },
];

export const SAFETY_CRITICAL_CATEGORIES = [
  'Airbags & SRS',
  'Brake System & Calipers',
  'Steering Column & Rack',
  'Seatbelts & Pretensioners',
  'ABS & Stability Sensors',
  'Suspension Structural Arms',
] as const;

export const ELIGIBLE_CIRCULAR_CATEGORIES = [
  'Exterior Lighting & Headlamps',
  'Alternators & Starters',
  'Infotainment & Display Modules',
  'Interior Trim & Panels',
  'Side Mirrors & Actuators',
  'HVAC Blowers & Compressors',
  'Alloy Wheels & Hubcaps',
  'Body Panels & Grilles',
] as const;

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  role: UserRole;
  preferredLanguage?: SupportedLanguage;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  userId?: string;
  employeeCode: string;
  name: string;
  email: string;
  phone: string;
  role: DealershipRole;
  designation: string;
  department: string;
  avatarUrl?: string;
  skills: string[];
  availability: 'available' | 'busy' | 'off_duty';
  activeJobCount: number;
  completedJobs: number;
  averageRating: number;
  ratingCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  userId?: string;
  name: string;
  email: string;
  phone: string;
  preferredLanguage: SupportedLanguage;
  serviceCredits: number;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  customerId: string;
  customerUserId?: string;
  make: string;
  model: string;
  year: number;
  registrationNumber: string;
  vin?: string;
  color?: string;
  mileageKm?: number;
  healthScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  customerId: string;
  customerUserId?: string;
  customerName: string;
  vehicleId: string;
  vehicleLabel: string;
  advisorId?: string;
  scheduledDate: string;
  scheduledSlot: string;
  serviceType: string;
  reportedIssues?: string;
  status: 'scheduled' | 'checked_in' | 'converted' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface CostItem {
  id: string;
  label: string;
  category: 'labor' | 'parts' | 'diagnostics' | 'additional_approved';
  amount: number;
}

export interface ChecklistTask {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: string;
}

export interface TechnicalNote {
  id: string;
  authorName: string;
  text: string;
  stage: RepairStage;
  createdAt: string;
}

export interface CustomerUpdateEntry {
  id: string;
  text: string;
  language: SupportedLanguage;
  stage: RepairStage;
  source: 'gemini' | 'advisor' | 'technician';
  createdAt: string;
}

export interface MediaAttachment {
  id: string;
  type: 'image' | 'video';
  url: string;
  caption: string;
  uploadedBy: string;
  stage: RepairStage;
  createdAt: string;
}

export interface ServiceOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerUserId?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  preferredLanguage: SupportedLanguage;
  vehicleId: string;
  vehicleLabel: string;
  registrationNumber: string;
  advisorId?: string;
  advisorName?: string;
  technicianId?: string;
  technicianName?: string;
  technicianAvatar?: string;
  priority: 'standard' | 'high' | 'urgent';
  stage: RepairStage;
  stageIndex: number;
  reportedIssues: string;
  estimatedCompletion: string;
  isDelayed: boolean;
  delayReason?: string;
  baseEstimate: number;
  approvedExtrasTotal: number;
  totalCost: number;
  costBreakdown: CostItem[];
  checklist: ChecklistTask[];
  technicalNotes: TechnicalNote[];
  customerUpdates: CustomerUpdateEntry[];
  media: MediaAttachment[];
  inspectionSummary?: string;
  maintenanceRecommendations: string[];
  customerRating?: number;
  customerFeedback?: string;
  partExchangeOptIn?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalRequest {
  id: string;
  serviceOrderId: string;
  orderNumber: string;
  customerId: string;
  customerUserId?: string;
  technicianId?: string;
  technicianName: string;
  title: string;
  description: string;
  estimatedCost: number;
  mediaUrl?: string;
  mediaCaption?: string;
  status: 'pending' | 'approved' | 'declined';
  customerResponseNote?: string;
  respondedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CircularPart {
  id: string;
  partName: string;
  category: string;
  isSafetyCritical: boolean;
  condition: 'excellent' | 'good' | 'refurbished';
  compatibleModels: string;
  sourceOrderId?: string;
  sourceCustomerId?: string;
  dealershipName: string;
  inspectionNotes?: string;
  imageUrl?: string;
  creditValue: number;
  co2SavedKg: number;
  status: 'available' | 'requested' | 'exchanged';
  requestedByDealership?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationLog {
  id: string;
  serviceOrderId?: string;
  customerId: string;
  customerUserId?: string;
  recipientName: string;
  recipientContact?: string;
  channel: 'sms' | 'whatsapp' | 'in_app';
  templateType?: string;
  message: string;
  estimatedCompletion?: string;
  deliveryStatus: 'delivered' | 'not_configured' | 'failed' | 'in_app_logged';
  providerMessage?: string;
  sentByName: string;
  createdAt: string;
}

export interface IntegrationStatus {
  gemini: { configured: boolean; model: string };
  twilio: { smsConfigured: boolean; whatsappConfigured: boolean; accountConfigured: boolean };
  fcm: { configured: boolean };
  dms: { configured: boolean; note: string };
}
