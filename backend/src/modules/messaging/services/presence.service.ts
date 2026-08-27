import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);

  // userId -> Set of active socket IDs
  private readonly userSockets = new Map<string, Set<string>>();

  // socketId -> userId for fast reverse lookup
  private readonly socketUserMap = new Map<string, string>();

  // userId -> last seen Date
  private readonly lastSeenMap = new Map<string, Date>();

  userConnected(userId: string, socketId: string): boolean {
    let sockets = this.userSockets.get(userId);
    const isFirstConnection = !sockets || sockets.size === 0;

    if (!sockets) {
      sockets = new Set<string>();
      this.userSockets.set(userId, sockets);
    }

    sockets.add(socketId);
    this.socketUserMap.set(socketId, userId);
    this.lastSeenMap.set(userId, new Date());

    this.logger.debug(
      `User ${userId} connected socket ${socketId} (Total active: ${sockets.size})`,
    );

    return isFirstConnection;
  }

  userDisconnected(socketId: string): { userId?: string; isNowOffline: boolean } {
    const userId = this.socketUserMap.get(socketId);
    if (!userId) {
      return { isNowOffline: false };
    }

    this.socketUserMap.delete(socketId);
    const sockets = this.userSockets.get(userId);

    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
        this.lastSeenMap.set(userId, new Date());
        this.logger.debug(`User ${userId} is now offline`);
        return { userId, isNowOffline: true };
      }
    }

    return { userId, isNowOffline: false };
  }

  isUserOnline(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return !!sockets && sockets.size > 0;
  }

  getLastSeen(userId: string): Date | null {
    if (this.isUserOnline(userId)) {
      return null;
    }
    return this.lastSeenMap.get(userId) || null;
  }

  getUserSockets(userId: string): string[] {
    const sockets = this.userSockets.get(userId);
    return sockets ? Array.from(sockets) : [];
  }

  getPresenceInfo(userId: string): { isOnline: boolean; lastSeen: Date | null } {
    const isOnline = this.isUserOnline(userId);
    return {
      isOnline,
      lastSeen: isOnline ? null : this.getLastSeen(userId),
    };
  }
}
