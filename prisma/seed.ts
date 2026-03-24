import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@timetrack.de" },
    update: {},
    create: {
      email: "admin@timetrack.de",
      name: "Administrator",
      password: adminPassword,
      role: "ADMIN",
    },
  });
  console.log("Admin created:", admin.email);

  // Create team leader
  const leaderPassword = await bcrypt.hash("leader123", 12);
  const leader = await prisma.user.upsert({
    where: { email: "teamleiter@timetrack.de" },
    update: {},
    create: {
      email: "teamleiter@timetrack.de",
      name: "Max Mustermann",
      password: leaderPassword,
      role: "TEAMLEITER",
    },
  });
  console.log("Team leader created:", leader.email);

  // Create sample agents
  const agentPassword = await bcrypt.hash("agent123", 12);
  const agents = [];
  for (let i = 1; i <= 3; i++) {
    const agent = await prisma.user.upsert({
      where: { email: `agent${i}@timetrack.de` },
      update: {},
      create: {
        email: `agent${i}@timetrack.de`,
        name: `Agent ${i}`,
        password: agentPassword,
        role: "AGENT",
      },
    });
    agents.push(agent);
    console.log("Agent created:", agent.email);
  }

  // Create sample projects
  const project1 = await prisma.project.upsert({
    where: { id: "proj-1" },
    update: {},
    create: {
      id: "proj-1",
      name: "Kundenhotline Premium",
      client: "TeleMedia GmbH",
      hourlyRate: 35.0,
    },
  });

  const project2 = await prisma.project.upsert({
    where: { id: "proj-2" },
    update: {},
    create: {
      id: "proj-2",
      name: "Tech Support",
      client: "DigiTech AG",
      hourlyRate: 42.5,
    },
  });

  const project3 = await prisma.project.upsert({
    where: { id: "proj-3" },
    update: {},
    create: {
      id: "proj-3",
      name: "Outbound Sales",
      client: "SalesForce Corp",
      hourlyRate: 28.0,
    },
  });

  console.log("Projects created");

  // Assign agents to projects
  for (const agent of agents) {
    await prisma.projectAssignment.upsert({
      where: { userId_projectId: { userId: agent.id, projectId: project1.id } },
      update: {},
      create: { userId: agent.id, projectId: project1.id },
    });
    await prisma.projectAssignment.upsert({
      where: { userId_projectId: { userId: agent.id, projectId: project2.id } },
      update: {},
      create: { userId: agent.id, projectId: project2.id },
    });
  }

  // Assign leader
  await prisma.projectAssignment.upsert({
    where: { userId_projectId: { userId: leader.id, projectId: project1.id } },
    update: {},
    create: { userId: leader.id, projectId: project1.id },
  });
  await prisma.projectAssignment.upsert({
    where: { userId_projectId: { userId: leader.id, projectId: project3.id } },
    update: {},
    create: { userId: leader.id, projectId: project3.id },
  });

  console.log("Assignments created");
  console.log("\n--- Login Credentials ---");
  console.log("Admin:      admin@timetrack.de / admin123");
  console.log("Teamleiter: teamleiter@timetrack.de / leader123");
  console.log("Agents:     agent1@timetrack.de / agent123");
  console.log("            agent2@timetrack.de / agent123");
  console.log("            agent3@timetrack.de / agent123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
