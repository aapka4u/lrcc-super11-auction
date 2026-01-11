import { kv } from '@vercel/kv';

// ============================================
// TYPES
// ============================================

export type AuditAction =
  // Tournament lifecycle
  | 'TOURNAMENT_CREATED'
  | 'TOURNAMENT_UPDATED'
  | 'TOURNAMENT_PUBLISHED'
  | 'TOURNAMENT_UNPUBLISHED'
  | 'TOURNAMENT_ARCHIVED'
  | 'TOURNAMENT_DELETED'
  // Auction actions
  | 'AUCTION_STARTED'
  | 'PLAYER_SOLD'
  | 'PLAYER_UNSOLD'
  | 'AUCTION_PAUSED'
  | 'AUCTION_RESUMED'
  | 'AUCTION_RESET'
  | 'JOKER_USED'
  | 'PLAYER_CORRECTED'
  // Admin actions
  | 'ADMIN_LOGIN'
  | 'ADMIN_LOGOUT'
  | 'ADMIN_SESSION_EXPIRED'
  | 'AUTH_FAILED'
  // Player/team management
  | 'PLAYER_PROFILE_UPDATED'
  | 'TEAM_PROFILE_UPDATED'
  | 'PLAYER_ADDED'
  | 'TEAM_ADDED';

export type ActorType = 'admin' | 'system' | 'public' | 'cron';

export interface AuditEntry {
  id: string;
  timestamp: number;
  tournamentId: string;
  action: AuditAction;
  actorType: ActorType;
  actorId?: string; // Session ID or "system"
  ip?: string;
  userAgent?: string;
  details: Record<string, unknown>;
  // For search/filtering
  targetType?: 'player' | 'team' | 'tournament' | 'auction';
  targetId?: string;
}

export interface AuditQuery {
  tournamentId: string;
  action?: AuditAction;
  actorType?: ActorType;
  targetType?: string;
  startTime?: number;
  endTime?: number;
  limit?: number;
  offset?: number;
}

// ============================================
// AUDIT LOGGING
// ============================================

const AUDIT_RETENTION_DAYS = 90;
const MAX_AUDIT_ENTRIES_PER_TOURNAMENT = 10000;

/**
 * Log an audit entry
 */
export async function logAudit(
  entry: Omit<AuditEntry, 'id' | 'timestamp'>
): Promise<string> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const timestamp = Date.now();

  const fullEntry: AuditEntry = {
    ...entry,
    id,
    timestamp,
  };

  const ttlSeconds = AUDIT_RETENTION_DAYS * 24 * 60 * 60;

  try {
    // Store individual entry with TTL
    const entryKey = `audit:${entry.tournamentId}:entry:${id}`;
    await kv.set(entryKey, fullEntry, { ex: ttlSeconds });

    // Add to tournament's audit list (for querying)
    const listKey = `audit:${entry.tournamentId}:list`;
    await kv.lpush(listKey, id);

    // Trim list to max size
    await kv.ltrim(listKey, 0, MAX_AUDIT_ENTRIES_PER_TOURNAMENT - 1);

    // Set TTL on list if not already set
    const listTTL = await kv.ttl(listKey);
    if (listTTL < 0) {
      await kv.expire(listKey, ttlSeconds);
    }

    return id;
  } catch (error) {
    // Audit logging should not break the main flow
    console.error('Failed to log audit entry:', error, fullEntry);
    return id;
  }
}

/**
 * Query audit entries for a tournament
 */
export async function queryAuditLog(query: AuditQuery): Promise<AuditEntry[]> {
  const { tournamentId, limit = 100, offset = 0 } = query;

  const listKey = `audit:${tournamentId}:list`;

  try {
    // Get entry IDs from list
    const ids = await kv.lrange(listKey, offset, offset + limit - 1);

    if (!ids || ids.length === 0) {
      return [];
    }

    // Fetch entries in parallel
    const entryKeys = (ids as string[]).map((id: string) => `audit:${tournamentId}:entry:${id}`);
    const entries = await Promise.all(
      entryKeys.map(key => kv.get<AuditEntry>(key))
    );

    // Filter out nulls (expired entries) and apply query filters
    return entries
      .filter((entry): entry is AuditEntry => entry !== null)
      .filter(entry => {
        if (query.action && entry.action !== query.action) return false;
        if (query.actorType && entry.actorType !== query.actorType) return false;
        if (query.targetType && entry.targetType !== query.targetType) return false;
        if (query.startTime && entry.timestamp < query.startTime) return false;
        if (query.endTime && entry.timestamp > query.endTime) return false;
        return true;
      });
  } catch (error) {
    console.error('Failed to query audit log:', error);
    return [];
  }
}

/**
 * Get audit statistics for a tournament
 */
export async function getAuditStats(tournamentId: string): Promise<{
  totalEntries: number;
  actionCounts: Record<string, number>;
  recentActivity: AuditEntry[];
}> {
  const listKey = `audit:${tournamentId}:list`;

  try {
    const totalEntries = await kv.llen(listKey) || 0;
    const recentActivity = await queryAuditLog({
      tournamentId,
      limit: 10,
    });

    // Count actions from recent entries (approximation)
    const actionCounts: Record<string, number> = {};
    for (const entry of recentActivity) {
      actionCounts[entry.action] = (actionCounts[entry.action] || 0) + 1;
    }

    return {
      totalEntries,
      actionCounts,
      recentActivity,
    };
  } catch (error) {
    console.error('Failed to get audit stats:', error);
    return {
      totalEntries: 0,
      actionCounts: {},
      recentActivity: [],
    };
  }
}

// ============================================
// CONVENIENCE HELPERS
// ============================================

/**
 * Log admin action with request context
 */
export async function logAdminAction(
  tournamentId: string,
  action: AuditAction,
  details: Record<string, unknown>,
  context: {
    sessionId?: string;
    ip?: string;
    userAgent?: string;
  }
): Promise<string> {
  return logAudit({
    tournamentId,
    action,
    actorType: 'admin',
    actorId: context.sessionId,
    ip: context.ip,
    userAgent: context.userAgent,
    details,
  });
}

/**
 * Log player sale with full context
 */
export async function logPlayerSold(
  tournamentId: string,
  playerId: string,
  teamId: string,
  soldPrice: number,
  context: {
    sessionId?: string;
    ip?: string;
  }
): Promise<string> {
  return logAudit({
    tournamentId,
    action: 'PLAYER_SOLD',
    actorType: 'admin',
    actorId: context.sessionId,
    ip: context.ip,
    targetType: 'player',
    targetId: playerId,
    details: {
      playerId,
      teamId,
      soldPrice,
    },
  });
}

/**
 * Log authentication failure (for security monitoring)
 */
export async function logAuthFailure(
  tournamentId: string,
  reason: string,
  ip?: string
): Promise<string> {
  return logAudit({
    tournamentId,
    action: 'AUTH_FAILED',
    actorType: 'public',
    ip,
    details: {
      reason,
    },
  });
}
