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

async function setupDatabase() {
  let connection;
  
  try {
    // Connect to MySQL without specifying database first
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });
    
    console.log('✅ Connected to MySQL server');
    
    // Create database if not exists
    await connection.execute('CREATE DATABASE IF NOT EXISTS patient_management DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    console.log('✅ Database ensured');
    
    // Close current connection and reconnect with database
    await connection.end();
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: 'patient_management'
    });
    console.log('✅ Connected to patient_management database');
    
    // Read the SQL schema file
    const schemaPath = path.join(__dirname, '../config/db/patient_management.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📄 Schema file loaded, executing...');
    
    // Remove the CREATE DATABASE and USE statements from the schema since we already handled them
    const cleanedSchema = schema
      .replace(/CREATE DATABASE.*?;/g, '')
      .replace(/USE patient_management;/g, '')
      .replace(/SET FOREIGN_KEY_CHECKS = 0;/g, '')
      .replace(/SET FOREIGN_KEY_CHECKS = 1;/g, '');
    
    // Split schema into individual statements and execute
    const statements = splitSqlStatements(cleanedSchema);
    
    // Disable foreign key checks
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement && !statement.startsWith('--') && !statement.startsWith('/*')) {
        try {
          await connection.query(statement);
          if (i % 50 === 0) {
            console.log(`Progress: ${i}/${statements.length} statements executed`);
          }
        } catch (err) {
          // Some statements might fail (like DROP IF EXISTS on non-existent tables)
          if (!err.message.includes('already exists') && 
              !err.message.includes('Unknown table') &&
              !err.message.includes('Table') && 
              !err.message.includes('doesn\'t exist')) {
            console.warn(`Warning on statement ${i}:`, err.message);
          }
        }
      }
    }
    
    // Re-enable foreign key checks
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('✅ Database schema created successfully!');
    
    // Verify key tables exist
    const [tables] = await connection.execute("SHOW TABLES LIKE 'medical_records'");
    if (tables.length > 0) {
      console.log('✅ medical_records table exists');
    } else {
      console.log('❌ medical_records table still missing');
    }
    
    const [prescriptionTables] = await connection.execute("SHOW TABLES LIKE 'prescriptions'");
    if (prescriptionTables.length > 0) {
      console.log('✅ prescriptions table exists');
    } else {
      console.log('❌ prescriptions table still missing');
    }
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
  } finally {
    if (connection) await connection.end();
  }
}

setupDatabase();
