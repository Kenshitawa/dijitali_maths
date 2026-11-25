import { prisma } from './prisma.js';

export async function recordAuditLog(opts: {
  userId?: string | null;
  userEmail: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: opts.userId ?? null,
        userEmail: opts.userEmail,
        action: opts.action,
        entityType: opts.entityType ?? null,
        entityId: opts.entityId ?? null,
        detailsJson: JSON.stringify(opts.details ?? {}),
      },
    });
  } catch (err) {
    console.error('[audit] Failed to record audit log:', err);
  }
}
