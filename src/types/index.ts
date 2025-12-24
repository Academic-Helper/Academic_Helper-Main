
import { type Timestamp } from "firebase/firestore";
import * as z from "zod";

export type UserRole = 'seeker' | 'writer' | 'admin' | 'teacher';
export type EducationLevel = 'O/L' | 'A/L' | 'University';

export const signupFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string(),
  phone: z.string().min(1, { message: "Phone number is required." }),
  whatsApp: z.string().min(1, { message: "WhatsApp number is required." }),
  role: z.enum(["seeker", "writer", "teacher"], { required_error: "You must select a role." }),
  educationLevel: z.enum(["O/L", "A/L", "University"]).optional(),
  referralCode: z.string().optional(),
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
}).refine(data => {
    if (data.role === 'writer') {
        return !!data.educationLevel;
    }
    return true;
}, {
    message: "Education level is required for writers.",
    path: ["educationLevel"],
});

export type SignUpFormData = z.infer<typeof signupFormSchema>;

export interface Location {
    province: string;
    district: string;
    city: string;
}

export interface UserData {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt?: any;
  photoURL?: string;
  ahUserId?: string;
  phone?: string;
  whatsApp?: string;
  walletBalance?: number;
  bankDetails?: BankDetails;
  aboutMe?: string;
  status?: 'active' | 'banned';
  contactWarningCount?: number;
  cancellationWarningCount?: number;
  isOnline?: boolean;
  lastSeen?: any;
  emailVerificationCredited?: boolean;
  fcmTokens?: string[];
  notifiedForOfflineMessage?: boolean;

  // Writer specific
  educationLevel?: EducationLevel;
  averageRating?: number;
  ratingCount?: number;
  interestedAreas?: string;
  referredBy?: string | null;
  referralCount?: number;
  hasZeroServiceCharge?: boolean;

  // Teacher specific
  subjects?: string[];
  grades?: number[];
  locations?: Location[];
  experienceStartDate?: Timestamp;
  experienceEndDate?: Timestamp;
  banners?: string[];
}

export type AssignmentStatus = 'open' | 'claimed' | 'in-progress' | 'submitted' | 'completed' | 'pending-writer-acceptance' | 'rejected' | 'bidding';

export interface Stage {
    percentage: number;
    amount: number;
    paid: boolean;
    submitted: boolean;
    completed: boolean;
    submissionURL?: string;
    submissionName?: string;
}

export const structuredProposalSchema = z.object({
    aboutMe: z.string().min(20, { message: "This section must be at least 20 characters." }),
    qualifications: z.string().min(20, { message: "This section must be at least 20 characters." }),
    workPlan: z.string().min(20, { message: "This section must be at least 20 characters." }),
});

export interface Bid {
  writerId: string;
  writerName: string;
  writerEducationLevel?: EducationLevel;
  writerRating?: number;
  writerRatingCount?: number;
  fee: number;
  proposal: string;
  createdAt: Timestamp;
  editCount?: number;
}


export interface Assignment {
  id: string;
  title: string;
  educationLevel: EducationLevel;
  subject: string;
  description: string;
  status: AssignmentStatus;
  seekerId: string;
  seekerName: string;
  writerId?: string | null;
  writerName?: string | null;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  givenUpBy?: string[];
  proposedFee?: number | null;
  fee?: number | null;
  feeAgreed?: boolean;
  paymentConfirmed?: boolean;
  paidOut?: boolean;
  rating?: number;
  review?: string;
  reviewSubmitted?: boolean;
  adminFeedbackSubmitted?: boolean;
  attachmentURL?: string;
  attachmentName?: string;
  submissionURL?: string;
  submissionName?: string;
  isStagedPayment?: boolean;
  currentStage?: number;
  stages?: {
    [key: number]: Stage;
  };
  typingUsers?: { [key: string]: boolean };
  // Bidding fields
  isBidding?: boolean;
  biddingDeadline?: Timestamp | null;
  budget?: number | null;
  bids?: { [writerId: string]: Bid };
  withdrawnBids?: string[];
  // Zoom Meeting
  zoomMeeting?: {
    status: 'pending' | 'approved' | 'declined' | 'cancelled';
    requestedBy: 'seeker' | 'writer';
    requesterMessage: string;
    link?: string;
    adminMessage?: string;
    requestedAt: Timestamp;
    scheduledAt?: Timestamp;
    durationMinutes?: number;
  }
}

export interface Message {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    createdAt: Timestamp;
}

export const bankDetailsSchema = z.object({
  accountName: z.string().min(1, "Account name is required."),
  accountNumber: z.string().min(1, "Account number is required."),
  bankName: z.string().min(1, "Bank name is required."),
  branchName: z.string().min(1, "Branch name is required."),
});
export interface BankDetails extends z.infer<typeof bankDetailsSchema> {}

export const contactSettingsSchema = z.object({
  whatsAppNumber: z.string().min(1, "WhatsApp number is required."),
});
export interface ContactSettings extends z.infer<typeof contactSettingsSchema> {}

export const tutorialSettingsSchema = z.object({
  seekerVideoUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  writerVideoUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
});
export interface TutorialSettings extends z.infer<typeof tutorialSettingsSchema> {}

export const promotionSettingsSchema = z.object({
  maxWinners: z.coerce.number().int().min(1, "Must have at least one winner."),
  referralsNeeded: z.coerce.number().int().min(1, "At least one referral must be needed."),
  endDate: z.date({
    required_error: "An end date is required.",
  }),
});
export interface PromotionSettings extends z.infer<typeof promotionSettingsSchema> {}

export interface PromotionStatus {
  winnerCount: number;
  endDate: Timestamp;
  maxWinners: number;
  referralsNeeded: number;
}

export interface SupportConversation {
  id: string; // Will be the user's UID
  userName: string;
  userEmail: string;
  lastMessage?: string;
  lastMessageTimestamp?: Timestamp;
  isReadByAdmin: boolean;
  typingUsers?: { [key: string]: boolean }; // 'user': true/false, 'admin': true/false
}

export interface SupportMessage {
    id: string;
    text: string;
    senderId: string; // Can be user's UID or 'admin'
    senderName: string; // User's name or 'Admin'
    createdAt: Timestamp;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: Timestamp;
  type?: 'general' | 'cancellation';
}

export interface DepositRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  ahUserId?: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'rejected';
  createdAt: Timestamp;
  confirmedAt?: Timestamp;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  ahUserId?: string;
  amount: number;
  status: 'pending' | 'completed' | 'rejected';
  bankDetails: BankDetails;
  requestedAt: Timestamp;
  completedAt?: Timestamp;
  serviceCharge?: number;
  payoutAmount?: number;
  currentWalletBalance?: number;
}

export interface Feedback {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  userId: string;
  userName: string;
  feedbackText: string;
  createdAt: Timestamp;
}

export interface CancellationReport {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  reporterId: string;
  reporterName: string;
  reporterRole: UserRole;
  reportedUserId: string;
  reportedUserName: string;
  reason: string;
  createdAt: Timestamp;
}

export interface FinanceSummary {
    totalProfit: number;
}

export interface FinanceTransaction {
    id: string;
    amount: number;
    type: 'commission' | 'manual';
    description: string;
    timestamp: Timestamp;
}
