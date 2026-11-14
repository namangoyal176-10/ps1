import { PrismaClient, MemberRole, TeamStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting RaceProof database seeding...');

  // Clean existing data for clean seed
  await prisma.auditLog.deleteMany();
  await prisma.idempotencyRecord.deleteMany();
  await prisma.joinRequest.deleteMany();
  await prisma.teamInvite.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Create Demo Users
  const leader = await prisma.user.create({
    data: {
      email: 'leader@raceproof.dev',
      username: 'alex_lead',
      fullName: 'Alex Vance',
      passwordHash,
      skills: ['React', 'TypeScript', 'Node.js', 'System Architecture'],
      timezone: 'UTC-5',
      timezoneOffset: -5.0,
      bio: 'Full-stack lead building race-condition-free distributed systems.',
      githubUrl: 'https://github.com/alexvance',
      lookingForTeam: false,
    },
  });

  const member1 = await prisma.user.create({
    data: {
      email: 'member1@raceproof.dev',
      username: 'sarah_dev',
      fullName: 'Sarah Chen',
      passwordHash,
      skills: ['PostgreSQL', 'Python', 'Docker', 'DevOps'],
      timezone: 'UTC-5',
      timezoneOffset: -5.0,
      bio: 'Database specialist & performance optimization fanatic.',
      githubUrl: 'https://github.com/sarahchen',
      lookingForTeam: false,
    },
  });

  const member2 = await prisma.user.create({
    data: {
      email: 'member2@raceproof.dev',
      username: 'marcus_ui',
      fullName: 'Marcus Rivera',
      passwordHash,
      skills: ['Tailwind CSS', 'UI/UX Design', 'React', 'Figma'],
      timezone: 'UTC-4',
      timezoneOffset: -4.0,
      bio: 'Frontend craftsman obsessed with accessible and snappy interfaces.',
      lookingForTeam: false,
    },
  });

  const soloUser = await prisma.user.create({
    data: {
      email: 'solo@raceproof.dev',
      username: 'jordan_solo',
      fullName: 'Jordan Taylor',
      passwordHash,
      skills: ['Rust', 'Solidity', 'Web3', 'Node.js'],
      timezone: 'UTC-5',
      timezoneOffset: -5.0,
      bio: 'Hackathon veteran looking for an ambitious team with 1 slot open!',
      lookingForTeam: true,
    },
  });

  // 2. Create Demo Team with 3 members and 1 seat available (maxMembers: 4)
  const teamAlpha = await prisma.team.create({
    data: {
      name: 'CyberGuardians',
      description: 'Building zero-trust decentralized identity with sub-50ms latency.',
      track: 'Cybersecurity',
      skillsNeeded: ['Rust', 'Web3', 'Solidity', 'React'],
      maxMembers: 4,
      status: TeamStatus.OPEN,
      members: {
        create: [
          { userId: leader.id, role: MemberRole.LEADER },
          { userId: member1.id, role: MemberRole.MEMBER },
          { userId: member2.id, role: MemberRole.MEMBER },
        ],
      },
    },
  });

  // 3. Create an active invite code for CyberGuardians
  const invite = await prisma.teamInvite.create({
    data: {
      teamId: teamAlpha.id,
      code: 'RACE2026',
      createdBy: leader.id,
      maxUses: 10,
      usedCount: 0,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000), // 7 days
    },
  });

  // 4. Create initial Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        teamId: teamAlpha.id,
        actorId: leader.id,
        action: 'TEAM_CREATED',
        details: { name: teamAlpha.name, track: teamAlpha.track },
      },
      {
        teamId: teamAlpha.id,
        actorId: member1.id,
        action: 'MEMBER_JOINED',
        details: { method: 'INVITE_CODE' },
      },
      {
        teamId: teamAlpha.id,
        actorId: member2.id,
        action: 'MEMBER_JOINED',
        details: { method: 'INVITE_CODE' },
      },
      {
        teamId: teamAlpha.id,
        actorId: leader.id,
        action: 'INVITE_CREATED',
        details: { code: invite.code, maxUses: 10 },
      },
    ],
  });

  // 5. Create some additional diverse teams
  const teamAI = await prisma.team.create({
    data: {
      name: 'NeuralPulse AI',
      description: 'Autonomous multi-agent orchestration for clinical trial verification.',
      track: 'AI/ML & Agents',
      skillsNeeded: ['Python', 'PyTorch', 'Node.js', 'React'],
      maxMembers: 4,
      status: TeamStatus.OPEN,
    },
  });

  const aiLeader = await prisma.user.create({
    data: {
      email: 'ailead@raceproof.dev',
      username: 'elena_ai',
      fullName: 'Dr. Elena Rostova',
      passwordHash,
      skills: ['Python', 'PyTorch', 'Machine Learning'],
      timezone: 'UTC+1',
      timezoneOffset: 1.0,
      lookingForTeam: false,
    },
  });

  await prisma.teamMember.create({
    data: {
      teamId: teamAI.id,
      userId: aiLeader.id,
      role: MemberRole.LEADER,
    },
  });

  console.log('✅ Demo seed completed successfully!');
  console.log('👉 Demo Leader: leader@raceproof.dev / Password123!');
  console.log('👉 Demo Solo User: solo@raceproof.dev / Password123!');
  console.log(`👉 Demo Invite Code: ${invite.code} (Team: CyberGuardians, 3/4 members)`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
