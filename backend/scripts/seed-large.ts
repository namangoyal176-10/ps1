import { PrismaClient, MemberRole, TeamStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const TRACKS = [
  'AI/ML & Agents',
  'Web3 & Crypto',
  'FinTech',
  'Developer Tools',
  'Healthcare & Biotech',
  'Cybersecurity',
  'Climate & Sustainability',
  'General',
];

const SKILL_POOL = [
  'React',
  'TypeScript',
  'Node.js',
  'Python',
  'PostgreSQL',
  'Next.js',
  'Tailwind CSS',
  'Rust',
  'Go',
  'Solidity',
  'PyTorch',
  'Docker',
  'GraphQL',
  'UI/UX Design',
  'AWS',
  'Kubernetes',
  'Flutter',
  'Swift',
  'Kotlin',
  'C++',
];

const TIMEZONES = [
  { name: 'UTC-8 (PST)', offset: -8.0 },
  { name: 'UTC-5 (EST)', offset: -5.0 },
  { name: 'UTC+0 (GMT)', offset: 0.0 },
  { name: 'UTC+1 (CET)', offset: 1.0 },
  { name: 'UTC+3 (MSK)', offset: 3.0 },
  { name: 'UTC+5:30 (IST)', offset: 5.5 },
  { name: 'UTC+8 (SGT)', offset: 8.0 },
  { name: 'UTC+9 (JST)', offset: 9.0 },
];

const FIRST_NAMES = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
  'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',
  'Aarav', 'Ananya', 'Wei', 'Mei', 'Hiroshi', 'Yuki', 'Carlos', 'Sofia', 'Mateo', 'Valentina'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
  'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Sharma', 'Patel', 'Gupta', 'Tanaka', 'Sato', 'Chen', 'Wang', 'Kim', 'Park', 'Silva'
];

async function seedLarge() {
  const TOTAL_USERS = 10000;
  const TOTAL_TEAMS = 2000;

  console.log(`🚀 Starting high-speed seed for ${TOTAL_USERS} users and ${TOTAL_TEAMS} teams...`);
  const startTime = Date.now();

  // Clear existing non-demo records if any
  console.log('🧹 Clearing previous records...');
  await prisma.auditLog.deleteMany();
  await prisma.idempotencyRecord.deleteMany();
  await prisma.joinRequest.deleteMany();
  await prisma.teamInvite.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();

  // Pre-hash single password for maximum generation speed
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Generate 10,000 Users
  console.log('👥 Generating 10,000 user profiles...');
  const userBatch: any[] = [];
  const userIds: string[] = [];

  for (let i = 1; i <= TOTAL_USERS; i++) {
    const fn = FIRST_NAMES[i % FIRST_NAMES.length];
    const ln = LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length];
    const id = `usr_${i.toString().padStart(6, '0')}`;
    userIds.push(id);

    const tz = TIMEZONES[i % TIMEZONES.length];
    const userSkills = [
      SKILL_POOL[i % SKILL_POOL.length],
      SKILL_POOL[(i * 3) % SKILL_POOL.length],
      SKILL_POOL[(i * 7) % SKILL_POOL.length],
    ];

    userBatch.push({
      id,
      email: i === 1 ? 'leader@raceproof.dev' : `participant${i}@hack4hack.dev`,
      username: i === 1 ? 'leader_demo' : `coder_${i}`,
      fullName: `${fn} ${ln}`,
      passwordHash,
      skills: Array.from(new Set(userSkills)),
      timezone: tz.name,
      timezoneOffset: tz.offset,
      bio: `Hack4Hack 2026 builder passionate about ${userSkills[0]} and distributed systems.`,
      lookingForTeam: i > TOTAL_TEAMS * 3, // Solo users remaining for recommendations
    });
  }

  // Insert users in chunks of 2,000
  const USER_CHUNK_SIZE = 2000;
  for (let i = 0; i < userBatch.length; i += USER_CHUNK_SIZE) {
    const chunk = userBatch.slice(i, i + USER_CHUNK_SIZE);
    await prisma.user.createMany({ data: chunk, skipDuplicates: true });
    console.log(`  ✓ Inserted users ${i + 1} to ${Math.min(i + USER_CHUNK_SIZE, userBatch.length)}`);
  }

  // 2. Generate 2,000 Teams
  console.log('🏆 Generating 2,000 teams...');
  const teamBatch: any[] = [];
  const teamIds: string[] = [];

  for (let t = 1; t <= TOTAL_TEAMS; t++) {
    const id = `team_${t.toString().padStart(5, '0')}`;
    teamIds.push(id);

    const track = TRACKS[t % TRACKS.length];
    const needed = [
      SKILL_POOL[(t * 2) % SKILL_POOL.length],
      SKILL_POOL[(t * 5) % SKILL_POOL.length],
    ];

    teamBatch.push({
      id,
      name: t === 1 ? 'RaceProof Guardians' : `Squadron ${t} - ${track}`,
      description: `Building game-changing ${track} solutions at Hack4Hack 2026 with concurrency safety.`,
      track,
      skillsNeeded: Array.from(new Set(needed)),
      maxMembers: 4,
      status: t % 4 === 0 ? TeamStatus.FULL : TeamStatus.OPEN,
    });
  }

  // Insert teams in chunks of 1,000
  const TEAM_CHUNK_SIZE = 1000;
  for (let i = 0; i < teamBatch.length; i += TEAM_CHUNK_SIZE) {
    const chunk = teamBatch.slice(i, i + TEAM_CHUNK_SIZE);
    await prisma.team.createMany({ data: chunk, skipDuplicates: true });
    console.log(`  ✓ Inserted teams ${i + 1} to ${Math.min(i + TEAM_CHUNK_SIZE, teamBatch.length)}`);
  }

  // 3. Assign Team Members
  console.log('🤝 Populating team memberships...');
  const memberBatch: any[] = [];
  let userIndex = 0;

  for (let t = 0; t < TOTAL_TEAMS; t++) {
    const teamId = teamIds[t];
    const isFull = t % 4 === 0;
    const memberCount = isFull ? 4 : (t % 3) + 1; // 1 to 3 members for open teams, 4 for full

    for (let m = 0; m < memberCount; m++) {
      if (userIndex < userIds.length) {
        memberBatch.push({
          id: `tm_${t}_${m}`,
          teamId,
          userId: userIds[userIndex],
          role: m === 0 ? MemberRole.LEADER : MemberRole.MEMBER,
        });
        userIndex++;
      }
    }
  }

  // Insert members in chunks of 2,000
  const MEMBER_CHUNK_SIZE = 2000;
  for (let i = 0; i < memberBatch.length; i += MEMBER_CHUNK_SIZE) {
    const chunk = memberBatch.slice(i, i + MEMBER_CHUNK_SIZE);
    await prisma.teamMember.createMany({ data: chunk, skipDuplicates: true });
    console.log(`  ✓ Inserted memberships ${i + 1} to ${Math.min(i + MEMBER_CHUNK_SIZE, memberBatch.length)}`);
  }

  // 4. Create sample invite codes for the first 50 teams
  const inviteBatch: any[] = [];
  for (let i = 0; i < 50; i++) {
    inviteBatch.push({
      id: `inv_${i}`,
      teamId: teamIds[i],
      code: `CODE${(1000 + i).toString()}`,
      createdBy: memberBatch[i * 2]?.userId || userIds[0],
      maxUses: 10,
      usedCount: 0,
      expiresAt: new Date(Date.now() + 14 * 24 * 3600 * 1000),
      isRevoked: false,
    });
  }
  await prisma.teamInvite.createMany({ data: inviteBatch });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n🎉 SEED COMPLETE in ${elapsed}s!`);
  console.log(`📊 Statistics:`);
  console.log(`   - Users created: ${TOTAL_USERS}`);
  console.log(`   - Teams created: ${TOTAL_TEAMS}`);
  console.log(`   - Memberships created: ${memberBatch.length}`);
  console.log(`   - Available Solo Users for Matching: ${TOTAL_USERS - userIndex}`);
  console.log(`   - Demo Login: leader@raceproof.dev / Password123!`);
}

seedLarge()
  .catch((e) => {
    console.error('❌ Large seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
