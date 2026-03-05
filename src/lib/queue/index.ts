import { Queue, Worker, Job, ConnectionOptions } from "bullmq";
import IORedis from "ioredis";

// Redis connection
const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
}) as unknown as ConnectionOptions;

// Queue names
export const QUEUE_NAMES = {
  CHECK_IN: "check-in",
  ESCALATION: "escalation",
  DEATH_PROTOCOL: "death-protocol",
  EMAIL: "email",
  SMS: "sms",
  SCHEDULED_MESSAGE: "scheduled-message",
} as const;

// Create queues
// Cast connection to avoid ioredis version mismatch between top-level and bullmq's bundled version
const conn = connection as unknown as import("bullmq").ConnectionOptions;
export const checkInQueue = new Queue(QUEUE_NAMES.CHECK_IN, { connection: conn });
export const escalationQueue = new Queue(QUEUE_NAMES.ESCALATION, { connection: conn });
export const deathProtocolQueue = new Queue(QUEUE_NAMES.DEATH_PROTOCOL, { connection: conn });
export const emailQueue = new Queue(QUEUE_NAMES.EMAIL, { connection: conn });
export const smsQueue = new Queue(QUEUE_NAMES.SMS, { connection: conn });
export const scheduledMessageQueue = new Queue(QUEUE_NAMES.SCHEDULED_MESSAGE, { connection: conn });

// Job types
export interface CheckInJobData {
  userId: string;
  checkInId: string;
}

export interface EscalationJobData {
  userId: string;
  level: 1 | 2 | 3;
  previousMissedCount: number;
}

export interface DeathProtocolJobData {
  userId: string;
  triggeredAt: Date;
}

export interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
}

export interface SmsJobData {
  to: string;
  message: string;
}

export interface ScheduledMessageJobData {
  messageId: string;
}

// Helper to add jobs
export async function scheduleCheckInReminder(
  userId: string,
  checkInId: string,
  delay: number
): Promise<Job<CheckInJobData>> {
  return checkInQueue.add(
    "send-reminder",
    { userId, checkInId },
    {
      delay,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 60000, // 1 minute
      },
    }
  );
}

export async function scheduleEscalation(
  userId: string,
  level: 1 | 2 | 3,
  previousMissedCount: number,
  delay: number
): Promise<Job<EscalationJobData>> {
  return escalationQueue.add(
    `escalation-level-${level}`,
    { userId, level, previousMissedCount },
    {
      delay,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 60000,
      },
    }
  );
}

export async function triggerDeathProtocol(
  userId: string
): Promise<Job<DeathProtocolJobData>> {
  return deathProtocolQueue.add(
    "trigger",
    { userId, triggeredAt: new Date() },
    {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 60000,
      },
    }
  );
}

export async function sendEmail(data: EmailJobData): Promise<Job<EmailJobData>> {
  return emailQueue.add("send", data, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 30000,
    },
  });
}

export async function sendSms(data: SmsJobData): Promise<Job<SmsJobData>> {
  return smsQueue.add("send", data, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 30000,
    },
  });
}

export async function dispatchScheduledMessage(
  messageId: string
): Promise<Job<ScheduledMessageJobData>> {
  return scheduledMessageQueue.add(
    "deliver",
    { messageId },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 60000,
      },
    }
  );
}

// Export connection for workers (cast to avoid ioredis version mismatch)
export { conn as connection };
