const crypto = require('crypto');
const { getDb } = require('../config/db');

class SessionManager {
  constructor() {
    this.sessions = new Map(); // In-memory session store
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
    this.maxSessionsPerUser = 3; // Max concurrent sessions per user
  }

  generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  async createSession(userId, userAgent, ipAddress) {
    const sessionId = this.generateSessionToken();
    const sessionData = {
      sessionId,
      userId,
      userAgent,
      ipAddress,
      createdAt: new Date(),
      lastAccessed: new Date(),
      isActive: true
    };

    // Store in memory
    this.sessions.set(sessionId, sessionData);

    // Store in database for persistence
    try {
      const db = getDb();
      await db.execute(`
        INSERT INTO user_sessions (session_id, user_id, user_agent, ip_address, created_at, last_accessed, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [sessionId, userId, userAgent, ipAddress, new Date(), new Date(), true]);
    } catch (error) {
      console.error('Failed to store session in database:', error);
    }

    return sessionId;
  }

  async validateSession(sessionId, userAgent, ipAddress) {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      // Try to fetch from database
      try {
        const db = getDb();
        const [rows] = await db.execute(`
          SELECT * FROM user_sessions 
          WHERE session_id = ? AND is_active = 1
        `, [sessionId]);
        
        if (rows.length === 0) {
          return null;
        }
        
        const dbSession = rows[0];
        
        // Check if session has expired
        const now = new Date();
        const lastAccessed = new Date(dbSession.last_accessed);
        const timeDiff = now - lastAccessed;
        
        if (timeDiff > this.sessionTimeout) {
          await this.invalidateSession(sessionId);
          return null;
        }
        
        // Update last accessed time
        await db.execute(`
          UPDATE user_sessions 
          SET last_accessed = ?, ip_address = ?
          WHERE session_id = ?
        `, [now, ipAddress, sessionId]);
        
        // Update memory store
        dbSession.lastAccessed = now;
        this.sessions.set(sessionId, dbSession);
        
        return dbSession;
      } catch (error) {
        console.error('Failed to validate session:', error);
        return null;
      }
    }

    // Check memory session
    const now = new Date();
    const timeDiff = now - session.lastAccessed;
    
    if (timeDiff > this.sessionTimeout) {
      await this.invalidateSession(sessionId);
      return null;
    }

    // Update last accessed time
    session.lastAccessed = now;
    session.ipAddress = ipAddress;
    this.sessions.set(sessionId, session);

    return session;
  }

  async invalidateSession(sessionId) {
    // Remove from memory
    this.sessions.delete(sessionId);

    // Mark as inactive in database
    try {
      const db = getDb();
      await db.execute(`
        UPDATE user_sessions 
        SET is_active = 0 
        WHERE session_id = ?
      `, [sessionId]);
    } catch (error) {
      console.error('Failed to invalidate session:', error);
    }
  }

  async invalidateAllUserSessions(userId) {
    try {
      const db = getDb();
      
      // Get all active sessions for user
      const [sessions] = await db.execute(`
        SELECT session_id FROM user_sessions 
        WHERE user_id = ? AND is_active = 1
      `, [userId]);

      // Invalidate each session
      for (const session of sessions) {
        await this.invalidateSession(session.session_id);
      }
    } catch (error) {
      console.error('Failed to invalidate user sessions:', error);
    }
  }

  async cleanupExpiredSessions() {
    const now = new Date();
    const cutoffTime = new Date(now - this.sessionTimeout);

    try {
      const db = getDb();
      
      // Mark expired sessions as inactive
      await db.execute(`
        UPDATE user_sessions 
        SET is_active = 0 
        WHERE last_accessed < ? AND is_active = 1
      `, [cutoffTime]);

      // Clean up memory store
      for (const [sessionId, session] of this.sessions.entries()) {
        if (session.lastAccessed < cutoffTime) {
          this.sessions.delete(sessionId);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup expired sessions:', error);
    }
  }
}

const sessionManager = new SessionManager();

// Clean up expired sessions every 5 minutes
setInterval(() => {
  sessionManager.cleanupExpiredSessions();
}, 5 * 60 * 1000);

module.exports = sessionManager;
