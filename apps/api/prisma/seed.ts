/**
 * Prisma seed — run with: pnpm prisma:seed (requires DATABASE_URL + migrated DB)
 * Demo memory mode seeds automatically on API boot; this script targets Postgres.
 */
import { PrismaClient } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';

const prisma = new PrismaClient();

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

async function main(): Promise<void> {
  const organizerId = '11111111-1111-4111-8111-111111111111';
  const memberId = '22222222-2222-4222-8222-222222222222';
  const clubId = '33333333-3333-4333-8333-333333333333';
  const tripId = '44444444-4444-4444-8444-444444444444';
  const iconSedan = '55555555-5555-4555-8555-555555555551';
  const iconCoupe = '55555555-5555-4555-8555-555555555552';
  const iconSuv = '55555555-5555-4555-8555-555555555553';
  const vehicleId = '66666666-6666-4666-8666-666666666666';

  await prisma.user.upsert({
    where: { id: organizerId },
    create: {
      id: organizerId,
      lineSubject: 'demo-organizer',
      displayName: 'Demo Organizer',
      isAdmin: true,
      isTestAccount: true,
    },
    update: {},
  });
  await prisma.user.upsert({
    where: { id: memberId },
    create: {
      id: memberId,
      lineSubject: 'demo-member',
      displayName: 'Demo Member',
      isTestAccount: true,
    },
    update: {},
  });

  await prisma.club.upsert({
    where: { id: clubId },
    create: {
      id: clubId,
      name: 'MCG Demo Club',
      ownerId: organizerId,
    },
    update: {},
  });

  await prisma.clubMember.upsert({
    where: { clubId_userId: { clubId, userId: organizerId } },
    create: { clubId, userId: organizerId, role: 'OWNER' },
    update: {},
  });
  await prisma.clubMember.upsert({
    where: { clubId_userId: { clubId, userId: memberId } },
    create: { clubId, userId: memberId, role: 'MEMBER' },
    update: {},
  });

  for (const row of [
    { id: iconSedan, slug: 'generic-sedan', label: 'Generic Sedan' },
    { id: iconCoupe, slug: 'generic-coupe', label: 'Generic Coupe' },
    { id: iconSuv, slug: 'generic-suv', label: 'Generic SUV' },
  ]) {
    await prisma.vehicleIconAsset.upsert({
      where: { slug: row.slug },
      create: {
        id: row.id,
        slug: row.slug,
        label: row.label,
        svgPath: `/assets/vehicles/${row.slug}.svg`,
        rightsNotes: 'Generic silhouette — no manufacturer marks',
      },
      update: { active: true },
    });
  }

  await prisma.vehicle.upsert({
    where: { id: vehicleId },
    create: {
      id: vehicleId,
      userId: organizerId,
      nickname: 'Midnight GT',
      class: 'coupe',
      color: '#111111',
      iconAssetId: iconCoupe,
    },
    update: {},
  });

  const now = new Date();
  const target = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const cutoff = new Date(target.getTime() + 45 * 60 * 1000);

  await prisma.trip.upsert({
    where: { id: tripId },
    create: {
      id: tripId,
      clubId,
      organizerId,
      title: 'Bangkok Sunset Convoy',
      state: 'OPEN',
      destination: { lat: 13.746, lng: 100.538 },
      meetingPoint: { lat: 13.7563, lng: 100.5018 },
      timezone: 'Asia/Bangkok',
      targetArrivalAt: target,
      graceMinutes: 15,
      cutoffAt: cutoff,
      capacity: 30,
      ruleVersion: '1.0.0',
      notes: 'Demo trip — meet at Victory Monument area',
    },
    update: { state: 'OPEN' },
  });

  await prisma.tripParticipant.upsert({
    where: { tripId_userId: { tripId, userId: organizerId } },
    create: {
      tripId,
      userId: organizerId,
      vehicleId,
      role: 'ORGANIZER',
    },
    update: {},
  });

  const rawToken = 'demo-invite-token-mcg-convoy';
  const tokenHash = hashToken(rawToken);
  const existing = await prisma.invite.findUnique({ where: { tokenHash } });
  if (!existing) {
    await prisma.invite.create({
      data: {
        id: randomUUID(),
        tripId,
        tokenHash,
        tokenHint: rawToken.slice(0, 8),
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        maxUses: 100,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log('Seed complete.');
  // eslint-disable-next-line no-console
  console.log({ tripId, inviteToken: rawToken, clubId, organizerId });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
