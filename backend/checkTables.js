const { initDb, getDb } = require('./src/config/db');

async function checkTables() {
  try {
    await initDb(); // Initialize database first
    const db = getDb();
    
    const [familyHistoryTable] = await db.execute('SHOW TABLES LIKE "family_history"');
    console.log('family_history table exists:', familyHistoryTable.length > 0);
    
    const [patientVitalsTable] = await db.execute('SHOW TABLES LIKE "patient_vitals"');
    console.log('patient_vitals table exists:', patientVitalsTable.length > 0);
    
    // Test the actual queries that are failing
    try {
      const [testFamily] = await db.execute('SELECT * FROM family_history WHERE patient_id = ? LIMIT 1', ['GJ2322']);
      console.log('family_history query works:', true);
    } catch (err) {
      console.log('family_history query error:', err.message);
    }
    
    try {
      const [testVitals] = await db.execute('SELECT temperature AS temp, height_cm AS height, weight_kg AS weight, pulse, spo2, blood_pressure, recorded_at as date FROM patient_vitals WHERE patient_id = ? ORDER BY recorded_at DESC LIMIT 10', ['GJ2322']);
      console.log('patient_vitals query works:', true);
    } catch (err) {
      console.log('patient_vitals query error:', err.message);
    }
    
  } catch (error) {
    console.error('Database connection error:', error);
  }
}

checkTables();
