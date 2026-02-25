/**
 * Create admin user script
 * Run with: npx ts-node scripts/create-admin.ts
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@eternal-sentinel.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin123!";
  const adminName = process.env.ADMIN_NAME || "Admin";

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    if (existingAdmin.role === "ADMIN") {
      console.log(`Admin user already exists: ${adminEmail}`);
      return;
    }
    // Upgrade existing user to admin
    await prisma.user.update({
      where: { email: adminEmail },
      data: { role: "ADMIN" },
    });
    console.log(`Upgraded user to admin: ${adminEmail}`);
    return;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  // Create admin user
  const admin = await prisma.user.create({
    data: {
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      role: "ADMIN",
      emailVerified: new Date(), // Admin is pre-verified
    },
  });

  // Create default subscription
  await prisma.subscription.create({
    data: {
      userId: admin.id,
      plan: "PREMIUM",
      status: "ACTIVE",
    },
  });

  // Create default polling config
  await prisma.pollingConfig.create({
    data: {
      userId: admin.id,
      interval: "MONTHLY",
      emailEnabled: true,
      smsEnabled: false,
      status: "ACTIVE",
    },
  });

  console.log(`Admin user created successfully!`);
  console.log(`Email: ${adminEmail}`);
  console.log(`Password: ${adminPassword}`);
  console.log(`\nIMPORTANT: Change this password immediately after first login!`);
}

main()
  .catch((e) => {
    console.error("Error creating admin:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
