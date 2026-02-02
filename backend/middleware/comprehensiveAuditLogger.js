const auditLogger = (action) => {
  return (req, res, next) => {
    const startTime = Date.now();
    
    // Store original res.json to intercept response
    const originalJson = res.json;
    let responseData = null;
    
    res.json = function(data) {
      responseData = data;
      return originalJson.call(this, data);
    };

    // Continue to next middleware
    res.on('finish', async () => {
      try {
        const db = require('../config/db').getDb();
        const endTime = Date.now();
        const duration = endTime - startTime;

        const auditData = {
          action,
          user_id: req.user?.id || null,
          user_role: req.user?.role || null,
          method: req.method,
          url: req.originalUrl,
          ip_address: req.ip || req.connection.remoteAddress,
          user_agent: req.get('User-Agent'),
          request_body: req.method !== 'GET' ? JSON.stringify(req.body) : null,
          response_status: res.statusCode,
          response_data: res.statusCode < 400 ? (responseData ? JSON.stringify(responseData).substring(0, 1000) : null) : null,
          duration_ms: duration,
          timestamp: new Date(),
          success: res.statusCode < 400
        };

        // Insert audit log
        await db.execute(`
          INSERT INTO audit_logs (
            action, user_id, user_role, method, url, ip_address, 
            user_agent, request_body, response_status, response_data,
            duration_ms, timestamp, success
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          auditData.action,
          auditData.user_id,
          auditData.user_role,
          auditData.method,
          auditData.url,
          auditData.ip_address,
          auditData.user_agent,
          auditData.request_body,
          auditData.response_status,
          auditData.response_data,
          auditData.duration_ms,
          auditData.timestamp,
          auditData.success
        ]);

        // Log to console for development
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔍 AUDIT: ${action} - ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
        }

      } catch (error) {
        console.error('Failed to log audit:', error);
      }
    });

    next();
  };
};

module.exports = auditLogger;
