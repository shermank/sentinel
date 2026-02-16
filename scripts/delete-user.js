const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  const email = "kurt.sherman@gmail.com";
  const u = await p.user.findUnique({ where: { email } });
  if (!u) {
    console.log("User not found:", email);
    return;
  }
  console.log("Found user:", u.id, u.email);

  await p.auditLog.deleteMany({ where: { userId: u.id } });
  await p.checkIn.deleteMany({ where: { userId: u.id } });
  await p.pollingConfig.deleteMany({ where: { userId: u.id } });
  await p.subscription.deleteMany({ where: { userId: u.id } });

  const v = await p.vault.findUnique({ where: { userId: u.id } });
  if (v) {
    await p.vaultItem.deleteMany({ where: { vaultId: v.id } });
    await p.vault.delete({ where: { id: v.id } });
  }

  await p.trustee.deleteMany({ where: { userId: u.id } });
  await p.session.deleteMany({ where: { userId: u.id } });
  await p.account.deleteMany({ where: { userId: u.id } });
  await p.user.delete({ where: { id: u.id } });

  console.log("User deleted successfully");
}

main()
  .catch((e) => console.error(e))
  .finally(() => p.$disconnect());
