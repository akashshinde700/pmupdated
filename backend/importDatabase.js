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

async function importDatabase() {
  let connection;
  
  try {
    // Connect to MySQL without database first
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });
    
    console.log('✅ Connected to MySQL server');
    
    // Step 1: Execute main schema (patient_management.sql)
    console.log('📄 Importing main schema...');
    const schemaPath = path.join(__dirname, '../config/db/patient_management.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema in chunks
    const statements = splitSqlStatements(schema);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement && !statement.startsWith('--') && !statement.startsWith('/*')) {
        try {
          await connection.query(statement);
        } catch (err) {
          // Ignore expected errors (DROP IF EXISTS, already exists, etc.)
          if (!err.message.includes('already exists') && 
              !err.message.includes('Unknown table') &&
              !err.message.includes('doesn\'t exist') &&
              !err.message.includes('DROP')) {
            console.warn(`Schema warning (${i}):`, err.message);
          }
        }
      }
    }
    console.log('✅ Main schema imported');
    
    // Step 2: Switch to patient_management database
    await connection.end();
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: 'patient_management'
    });
    console.log('✅ Connected to patient_management database');
    
    // Step 3: Import procedures (procedure_complete.sql)
    console.log('🔧 Importing procedures...');
    const proceduresPath = path.join(__dirname, '../config/db/procedure_complete.sql');
    if (fs.existsSync(proceduresPath)) {
      const procedures = fs.readFileSync(proceduresPath, 'utf8');

      const statements = splitSqlStatements(procedures);
      for (const statement of statements) {
        const trimmedStatement = statement.trim();
        if (!trimmedStatement || trimmedStatement.startsWith('--') || trimmedStatement.startsWith('/*')) continue;
        try {
          await connection.query(trimmedStatement);
        } catch (err) {
          if (!err.message.includes('already exists')) {
            console.warn('Procedure import warning:', err.message);
          }
        }
      }
      console.log('✅ Procedures imported');
    }
    
    // Step 4: Import corrected procedures (CORRECTED_PROCEDURES.sql)
    console.log('🔧 Importing corrected procedures...');
    const correctedProceduresPath = path.join(__dirname, '../config/db/CORRECTED_PROCEDURES.sql');
    if (fs.existsSync(correctedProceduresPath)) {
      const correctedProcedures = fs.readFileSync(correctedProceduresPath, 'utf8');

      const statements = splitSqlStatements(correctedProcedures);
      for (const statement of statements) {
        const trimmedStatement = statement.trim();
        if (!trimmedStatement || trimmedStatement.startsWith('--') || trimmedStatement.startsWith('/*')) continue;
        try {
          await connection.query(trimmedStatement);
        } catch (err) {
          if (!err.message.includes('already exists')) {
            console.warn('Corrected procedure import warning:', err.message);
          }
        }
      }
      console.log('✅ Corrected procedures imported');
    }
    
    // Step 5: Verify critical tables exist
    console.log('🔍 Verifying tables...');
    const criticalTables = ['patients', 'users', 'clinics', 'doctors', 'medical_records', 'family_history', 'patient_vitals', 'prescriptions'];
    
    for (const table of criticalTables) {
      const [tables] = await connection.execute(`SHOW TABLES LIKE '${table}'`);
      if (tables.length > 0) {
        console.log(`✅ ${table} table exists`);
      } else {
        console.log(`❌ ${table} table missing`);
      }
    }
    
    console.log('🎉 Database import completed successfully!');
    
  } catch (error) {
    console.error('❌ Database import failed:', error);
  } finally {
    if (connection) await connection.end();
  }
}

importDatabase();
