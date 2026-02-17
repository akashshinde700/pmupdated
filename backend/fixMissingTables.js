const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

function splitSqlStatements(sqlText) {
  let delimiter = ';';
  const statements = [];
  let buffer = '';

  const lines = sqlText.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();

    if (/^DELIMITER\s+/i.test(trimmed)) {
      delimiter = trimmed.replace(/^DELIMITER\s+/i, '').trim();
      continue;
    }

    buffer += line + '\n';

    const bufTrimmed = buffer.trimEnd();
    if (delimiter && bufTrimmed.endsWith(delimiter)) {
      const withoutDelimiter = bufTrimmed.slice(0, -delimiter.length).trim();
      if (withoutDelimiter) {
        statements.push(withoutDelimiter);
      }
      buffer = '';
    }
  }

  const tail = buffer.trim();
  if (tail) {
    statements.push(tail);
  }

  return statements;
}

async function fixMissingTables() {
  let connection;
  
  try {
    // Connect to database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: 'patient_management'
    });
    
    console.log('✅ Connected to patient_management database');
    
    // Check which tables are missing
    const requiredTables = [
      'medical_records',
      'family_history', 
      'patient_vitals',
      'prescriptions',
      'appointments',
      'prescription_items',
      'doctors',
      'users',
      'patients'
    ];
    
    console.log('🔍 Checking for missing tables...');
    
    for (const tableName of requiredTables) {
      const [tables] = await connection.execute(`SHOW TABLES LIKE '${tableName}'`);
      
      if (tables.length === 0) {
        console.log(`❌ Missing table: ${tableName}`);
        
        // Create the table manually for critical missing tables
        if (tableName === 'family_history') {
          await connection.execute(`
            CREATE TABLE family_history (
              id INT AUTO_INCREMENT PRIMARY KEY,
              patient_id VARCHAR(50) NOT NULL,
              relation VARCHAR(100) NOT NULL,
              \`condition\` VARCHAR(255) NOT NULL,
              notes TEXT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              INDEX idx_patient_id (patient_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
          `);
          console.log(`✅ Created table: ${tableName}`);
        }
        
        if (tableName === 'patient_vitals') {
          await connection.execute(`
            CREATE TABLE patient_vitals (
              id INT AUTO_INCREMENT PRIMARY KEY,
              patient_id VARCHAR(50) NOT NULL,
              appointment_id INT NULL,
              temperature DECIMAL(4,1) NULL,
              height_cm DECIMAL(5,1) NULL,
              weight_kg DECIMAL(5,1) NULL,
              pulse INT NULL,
              spo2 DECIMAL(4,1) NULL,
              blood_pressure VARCHAR(20) NULL,
              recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              INDEX idx_patient_id (patient_id),
              INDEX idx_appointment_id (appointment_id),
              INDEX idx_recorded_at (recorded_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
          `);
          console.log(`✅ Created table: ${tableName}`);
        }
        
      } else {
        console.log(`✅ Table exists: ${tableName}`);
      }
    }
    
    // Add procedures if needed
    console.log('🔧 Adding procedures...');
    
    try {
      // Read procedures file
      const proceduresPath = path.join(__dirname, '../config/db/CORRECTED_PROCEDURES.sql');
      if (fs.existsSync(proceduresPath)) {
        const procedures = fs.readFileSync(proceduresPath, 'utf8');
        
        // Split and execute procedure statements
        const statements = splitSqlStatements(procedures);
        
        for (const statement of statements) {
          if (statement.trim() && !statement.startsWith('--')) {
            try {
              await connection.query(statement.trim());
            } catch (err) {
              // Ignore procedure creation errors (they might already exist)
              if (!err.message.includes('already exists')) {
                console.warn('Procedure warning:', err.message);
              }
            }
          }
        }
        console.log('✅ Procedures added/updated');
      }
    } catch (procErr) {
      console.warn('Procedures file not found or error:', procErr.message);
    }
    
    console.log('✅ Database fix completed!');
    
  } catch (error) {
    console.error('❌ Database fix failed:', error);
  } finally {
    if (connection) await connection.end();
  }
}

fixMissingTables();
