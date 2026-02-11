import type { User, Vault, VaultItem, Trustee, PollingConfig, Subscription } from "@prisma/client";



// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Vault types
export interface VaultWithItems extends Vault {
  items: VaultItem[];
}

export interface CreateVaultInput {
  encryptedMasterKey: string;
  masterKeySalt: string;
  masterKeyNonce: string;
}

export interface VaultItemInput {
  type: "PASSWORD" | "DOCUMENT" | "MESSAGE" | "SECRET";
  name: string;
  encryptedData: string;
  nonce: string;
  metadata?: Record<string, unknown>;
}

export interface DecryptedVaultItem {
  id: string;
  type: "PASSWORD" | "DOCUMENT" | "MESSAGE" | "SECRET";
  name: string;
  data: string | PasswordData | DocumentData;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PasswordData {
  website?: string;
  username: string;
  password: string;
  notes?: string;
}

export interface DocumentData {
  fileName: string;
  fileSize: number;
  mimeType: string;
  content: string; // Base64 encoded
}

// Trustee types
export interface TrusteeWithLogs extends Trustee {
  accessLogs: {
    id: string;
    action: string;
    createdAt: Date;
  }[];
}

export interface CreateTrusteeInput {
  name: string;
  email: string;
  phone?: string;
  relationship?: string;
}

// Polling types
export interface PollingConfigWithStats extends PollingConfig {
  totalCheckIns: number;
  confirmedCheckIns: number;
  missedCheckIns: number;
}

export interface UpdatePollingConfigInput {
  interval?: "WEEKLY" | "BIWEEKLY" | "MONTHLY";
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  pushEnabled?: boolean;
  gracePeriod1?: number;
  gracePeriod2?: number;
  gracePeriod3?: number;
}

// Subscription types
export interface SubscriptionWithLimits extends Subscription {
  limits: {
    maxTrustees: number;
    availableIntervals: ("WEEKLY" | "BIWEEKLY" | "MONTHLY")[];
    smsEnabled: boolean;
    prioritySupport: boolean;
  };
}

// Dashboard stats
export interface DashboardStats {
  vaultItemCount: number;
  trusteeCount: number;
  lastCheckIn?: Date;
  nextCheckInDue?: Date;
  pollingStatus: string;
  subscriptionPlan: string;
}

// Check-in types
export interface CheckInRequest {
  token: string;
  code?: string;
}

export interface CheckInResponse {
  success: boolean;
  message: string;
  nextCheckInDue?: Date;
}

// Trustee access types
export interface TrusteeAccessRequest {
  accessToken: string;
  verificationCode?: string;
}

export interface TrusteeVaultAccess {
  trusteeId: string;
  trusteeName: string;
  userName: string;
  vaultItems: {
    id: string;
    type: string;
    name: string;
    encryptedData: string;
    nonce: string;
    metadata?: Record<string, unknown>;
  }[];
  accessExpiresAt: Date;
}
