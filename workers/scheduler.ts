/**
 * Scheduler for Eternal Sentinel
 *
 * This runs periodically to:
 * - Create check-in requests for users whose check-in is due
 * - Escalate users who have missed check-ins
 * - Process grace period expirations
 */

import { prisma } from "../src/lib/db";
import {
  scheduleCheckInReminder,
  scheduleEscalation,
  triggerDeathProtocol,
} from "../src/lib/queue";
import { generateUrlSafeToken } from "../src/lib/crypto/server";

const POLL_INTERVAL = parseInt(process.env.CHECK_IN_POLL_INTERVAL || "60000"); // 1 minute

async function processScheduledTasks() {
  console.log(`[${new Date().toISOString()}] Running scheduled task check...`);

  try {
    // 1. Find users who need a check-in request sent
    const usersNeedingCheckIn = await prisma.pollingConfig.findMany({
      where: {
        status: "ACTIVE",
        nextCheckInDue: {
          lte: new Date(),
        },
      },
      include: {
        user: true,
      },
    });

    for (const config of usersNeedingCheckIn) {
      console.log(`Creating check-in for user ${config.userId}`);

      // Calculate expiration based on interval
      const expiresAt = new Date();
      switch (config.interval) {
        case "WEEKLY":
          expiresAt.setDate(expiresAt.getDate() + 3); // 3 days to respond
          break;
        case "BIWEEKLY":
          expiresAt.setDate(expiresAt.getDate() + 5); // 5 days
          break;
        case "MONTHLY":
          expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
          break;
      }

      // Create check-in record
      const checkIn = await prisma.checkIn.create({
        data: {
          userId: config.userId,
          token: generateUrlSafeToken(),
          status: "PENDING",
          sentVia: config.emailEnabled
            ? config.smsEnabled
              ? ["EMAIL", "SMS"]
              : ["EMAIL"]
            : config.smsEnabled
            ? ["SMS"]
            : [],
          expiresAt,
        },
      });

      // Schedule the reminder job (sends immediately)
      await scheduleCheckInReminder(config.userId, checkIn.id, 0);

      // Update next check-in date
      const nextDue = new Date();
      switch (config.interval) {
        case "WEEKLY":
          nextDue.setDate(nextDue.getDate() + 7);
          break;
        case "BIWEEKLY":
          nextDue.setDate(nextDue.getDate() + 14);
          break;
        case "MONTHLY":
          nextDue.setMonth(nextDue.getMonth() + 1);
          break;
      }

      await prisma.pollingConfig.update({
        where: { id: config.id },
        data: { nextCheckInDue: nextDue },
      });
    }

    // 2. Find expired check-ins and mark them as missed
    const expiredCheckIns = await prisma.checkIn.findMany({
      where: {
        status: "PENDING",
        expiresAt: {
          lt: new Date(),
        },
      },
      include: {
        user: {
          include: {
            pollingConfig: true,
          },
        },
      },
    });

    for (const checkIn of expiredCheckIns) {
      console.log(`Check-in ${checkIn.id} expired for user ${checkIn.userId}`);

      await prisma.checkIn.update({
        where: { id: checkIn.id },
        data: { status: "MISSED" },
      });

      const config = checkIn.user.pollingConfig;
      if (!config || config.status === "PAUSED" || config.status === "TRIGGERED") {
        continue;
      }

      const newMissedCount = config.currentMissedCheckIns + 1;

      // Determine escalation level
      if (newMissedCount === 1 && config.status === "ACTIVE") {
        // First miss - enter grace period 1
        await scheduleEscalation(
          checkIn.userId,
          1,
          newMissedCount,
          0 // Immediate
        );
      } else if (newMissedCount === 2 && config.status === "GRACE_1") {
        // Second miss - enter grace period 2
        await scheduleEscalation(
          checkIn.userId,
          2,
          newMissedCount,
          0
        );
      } else if (newMissedCount >= 3 && config.status === "GRACE_2") {
        // Third miss - final grace period
        await scheduleEscalation(
          checkIn.userId,
          3,
          newMissedCount,
          0
        );
      }
    }

    // 3. Check for users in GRACE_3 whose grace period has expired
    const gracePeriodExpired = await prisma.pollingConfig.findMany({
      where: {
        status: "GRACE_3",
        updatedAt: {
          // Check if they've been in GRACE_3 for longer than gracePeriod3 days
          lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Default 7 days minimum check
        },
      },
    });

    for (const config of gracePeriodExpired) {
      // Double-check by looking at the actual grace period value
      const gracePeriodMs = config.gracePeriod3 * 24 * 60 * 60 * 1000;
      const expirationTime = new Date(config.updatedAt.getTime() + gracePeriodMs);

      if (new Date() > expirationTime) {
        console.log(`Grace period expired for user ${config.userId}, triggering death protocol`);
        await triggerDeathProtocol(config.userId);
      }
    }

    console.log(`[${new Date().toISOString()}] Scheduled task check complete`);
  } catch (error) {
    console.error("Error in scheduled task:", error);
  }
}

// Run immediately and then on interval
processScheduledTasks();
setInterval(processScheduledTasks, POLL_INTERVAL);

console.log(`Scheduler started. Checking every ${POLL_INTERVAL}ms`);

// Keep the process running
process.on("SIGTERM", () => {
  console.log("Scheduler shutting down...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("Scheduler shutting down...");
  process.exit(0);
});
