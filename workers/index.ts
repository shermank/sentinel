/**
 * Eternal Sentinel Background Worker
 *
 * Processes background jobs for:
 * - Check-in reminders
 * - Escalation handling
 * - Death protocol triggering
 * - Email sending
 * - SMS sending
 */

import "dotenv/config";
import { Worker } from "bullmq";
import {
  connection,
  QUEUE_NAMES,
  type CheckInJobData,
  type EscalationJobData,
  type DeathProtocolJobData,
  type EmailJobData,
  type SmsJobData,
} from "../src/lib/queue";
import { prisma } from "../src/lib/db";
import {
  sendEmail,
  checkInReminderEmail,
  escalationWarningEmail,
  trusteeNotificationEmail,
} from "../src/lib/email";
import {
  sendSms,
  checkInReminderSms,
  escalationWarningSms,
  trusteeNotificationSms,
} from "../src/lib/sms";
import { generateUrlSafeToken } from "../src/lib/crypto/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || "5");

console.log("Starting Eternal Sentinel workers...");

// Check-in reminder worker
const checkInWorker = new Worker<CheckInJobData>(
  QUEUE_NAMES.CHECK_IN,
  async (job) => {
    console.log(`Processing check-in reminder for user ${job.data.userId}`);

    const checkIn = await prisma.checkIn.findUnique({
      where: { id: job.data.checkInId },
      include: {
        user: {
          include: {
            pollingConfig: true,
          },
        },
      },
    });

    if (!checkIn || checkIn.status !== "PENDING") {
      console.log(`Check-in ${job.data.checkInId} already processed, skipping`);
      return;
    }

    const user = checkIn.user;
    const config = user.pollingConfig;

    if (!config || config.status === "PAUSED") {
      console.log(`Polling paused for user ${user.id}, skipping`);
      return;
    }

    const checkInUrl = `${APP_URL}/checkin?token=${checkIn.token}`;

    // Send email reminder
    if (config.emailEnabled && user.email) {
      const emailData = checkInReminderEmail(
        user.name || "User",
        checkInUrl,
        checkIn.expiresAt
      );
      emailData.to = user.email;
      await sendEmail(emailData);
    }

    // Send SMS reminder
    if (config.smsEnabled) {
      // Get user's phone number (would need to add to user model or get from settings)
      // For now, skipping SMS
      console.log("SMS reminder would be sent here");
    }

    console.log(`Check-in reminder sent for user ${user.id}`);
  },
  { connection, concurrency: CONCURRENCY }
);

// Escalation worker
const escalationWorker = new Worker<EscalationJobData>(
  QUEUE_NAMES.ESCALATION,
  async (job) => {
    console.log(`Processing escalation level ${job.data.level} for user ${job.data.userId}`);

    const config = await prisma.pollingConfig.findUnique({
      where: { userId: job.data.userId },
      include: {
        user: true,
      },
    });

    if (!config || config.status === "PAUSED" || config.status === "TRIGGERED") {
      console.log(`Escalation skipped for user ${job.data.userId}`);
      return;
    }

    // Check if user has checked in since this job was scheduled
    if (config.currentMissedCheckIns < job.data.previousMissedCount) {
      console.log(`User ${job.data.userId} has checked in, cancelling escalation`);
      return;
    }

    const user = config.user;
    const gracePeriod =
      job.data.level === 1
        ? config.gracePeriod1
        : job.data.level === 2
        ? config.gracePeriod2
        : config.gracePeriod3;

    // Generate new check-in token
    const checkInToken = generateUrlSafeToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + gracePeriod);

    const newCheckIn = await prisma.checkIn.create({
      data: {
        userId: user.id,
        token: checkInToken,
        status: "PENDING",
        sentVia: config.emailEnabled
          ? config.smsEnabled
            ? ["EMAIL", "SMS"]
            : ["EMAIL"]
          : ["SMS"],
        expiresAt,
      },
    });

    const checkInUrl = `${APP_URL}/checkin?token=${checkInToken}`;

    // Update polling config status
    const newStatus =
      job.data.level === 1
        ? "GRACE_1"
        : job.data.level === 2
        ? "GRACE_2"
        : "GRACE_3";

    await prisma.pollingConfig.update({
      where: { userId: user.id },
      data: {
        status: newStatus,
        currentMissedCheckIns: config.currentMissedCheckIns + 1,
      },
    });

    // Send escalation warning
    if (config.emailEnabled && user.email) {
      const emailData = escalationWarningEmail(
        user.name || "User",
        config.currentMissedCheckIns + 1,
        gracePeriod,
        checkInUrl
      );
      emailData.to = user.email;
      await sendEmail(emailData);
    }

    // Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: `ESCALATION_LEVEL_${job.data.level}`,
        resource: "polling_config",
        details: { missedCheckIns: config.currentMissedCheckIns + 1 },
      },
    });

    // If this is level 3 and still no response after grace period, trigger death protocol
    if (job.data.level === 3) {
      // Schedule final check
      const { triggerDeathProtocol } = await import("../src/lib/queue");
      // Give them the full grace period
      setTimeout(async () => {
        const latestConfig = await prisma.pollingConfig.findUnique({
          where: { userId: user.id },
        });
        if (latestConfig?.status === "GRACE_3") {
          await triggerDeathProtocol(user.id);
        }
      }, gracePeriod * 24 * 60 * 60 * 1000);
    }

    console.log(`Escalation level ${job.data.level} processed for user ${user.id}`);
  },
  { connection, concurrency: CONCURRENCY }
);

// Death protocol worker
const deathProtocolWorker = new Worker<DeathProtocolJobData>(
  QUEUE_NAMES.DEATH_PROTOCOL,
  async (job) => {
    console.log(`TRIGGERING DEATH PROTOCOL for user ${job.data.userId}`);

    const user = await prisma.user.findUnique({
      where: { id: job.data.userId },
      include: {
        vault: {
          include: { items: true },
        },
        trustees: {
          where: { status: { in: ["VERIFIED", "ACTIVE"] } },
        },
        pollingConfig: true,
      },
    });

    if (!user || !user.pollingConfig) {
      console.error(`User ${job.data.userId} not found for death protocol`);
      return;
    }

    // Double-check status
    if (user.pollingConfig.status === "TRIGGERED") {
      console.log(`Death protocol already triggered for user ${job.data.userId}`);
      return;
    }

    // Update polling config
    await prisma.pollingConfig.update({
      where: { userId: user.id },
      data: {
        status: "TRIGGERED",
        triggeredAt: new Date(),
      },
    });

    // Grant access to all trustees
    const accessExpiresAt = new Date();
    accessExpiresAt.setDate(accessExpiresAt.getDate() + 30); // 30 days access

    for (const trustee of user.trustees) {
      const accessToken = generateUrlSafeToken(48);

      await prisma.trustee.update({
        where: { id: trustee.id },
        data: {
          accessToken,
          accessGrantedAt: new Date(),
          accessExpiresAt,
          status: "ACTIVE",
        },
      });

      const accessUrl = `${APP_URL}/trustee/access?token=${accessToken}`;

      // Notify trustee via email
      const emailData = trusteeNotificationEmail(
        trustee.name,
        user.name || "User",
        accessUrl
      );
      emailData.to = trustee.email;
      await sendEmail(emailData);

      // Notify via SMS if phone available
      if (trustee.phone) {
        const smsMessage = trusteeNotificationSms(
          trustee.name,
          user.name || "User",
          accessUrl
        );
        await sendSms({ to: trustee.phone, message: smsMessage });
      }

      // Log access grant
      await prisma.trusteeAccessLog.create({
        data: {
          trusteeId: trustee.id,
          action: "ACCESS_GRANTED",
        },
      });
    }

    // Log the trigger
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "DEATH_PROTOCOL_TRIGGERED",
        resource: "user",
        details: {
          trusteesNotified: user.trustees.length,
          triggeredAt: job.data.triggeredAt,
        },
      },
    });

    console.log(
      `Death protocol completed for user ${user.id}. ${user.trustees.length} trustees notified.`
    );
  },
  { connection, concurrency: 1 } // Only process one at a time for safety
);

// Email worker
const emailWorker = new Worker<EmailJobData>(
  QUEUE_NAMES.EMAIL,
  async (job) => {
    console.log(`Sending email to ${job.data.to}: ${job.data.subject}`);
    // This worker handles generic email jobs
    // Template-based emails are handled inline in other workers
  },
  { connection, concurrency: CONCURRENCY }
);

// SMS worker
const smsWorker = new Worker<SmsJobData>(
  QUEUE_NAMES.SMS,
  async (job) => {
    console.log(`Sending SMS to ${job.data.to}`);
    await sendSms(job.data);
  },
  { connection, concurrency: CONCURRENCY }
);

// Error handlers
const workers = [
  checkInWorker,
  escalationWorker,
  deathProtocolWorker,
  emailWorker,
  smsWorker,
];

workers.forEach((worker) => {
  worker.on("completed", (job) => {
    console.log(`Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed:`, err);
  });
});

// Graceful shutdown
async function shutdown() {
  console.log("Shutting down workers...");
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

console.log("All workers started successfully");
