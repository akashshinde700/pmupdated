/**
 * LOINC Lab Test Importer
 * Imports LOINC Universal Lab Orders into lab_templates table
 * Also imports Panel/Form parameters for tests that have sub-parameters
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const DB_CONFIG = {
  host: '72.60.206.56',
  port: 3306,
  user: 'root',
  password: 'LASTrivon@8055',
  database: 'patient_management'
};

// Map LOINC CLASS to user-friendly categories
const CLASS_TO_CATEGORY = {
  'CHEM': 'Biochemistry',
  'HEM/BC': 'Hematology',
  'COAG': 'Coagulation',
  'UA': 'Urine Analysis',
  'MICRO': 'Microbiology',
  'SERO': 'Serology & Immunology',
  'DRUG/TOX': 'Toxicology & Drug Monitoring',
  'ALLERGY': 'Allergy Testing',
  'BLDBK': 'Blood Banking',
  'HLA': 'HLA Typing',
  'CYTO': 'Cytology',
  'PATH': 'Pathology',
  'MOLPATH': 'Molecular Pathology',
  'MOLPATH.MUT': 'Molecular Pathology',
  'MOLPATH.NUCREPEAT': 'Molecular Pathology',
  'CHAL.ROUTINE': 'Challenge Tests',
  'DOC.MISC': 'Miscellaneous',
  'ABXBACT': 'Antibiotic Susceptibility',
  // Panels
  'PANEL.CHEM': 'Biochemistry Panel',
  'PANEL.HEM/BC': 'Hematology Panel',
  'PANEL.ALLERGY': 'Allergy Panel',
  'PANEL.MICRO': 'Microbiology Panel',
  'PANEL.CELLMARK': 'Cell Markers Panel',
  'PANEL.DRUG/TOX': 'Toxicology Panel',
  'PANEL.UA': 'Urine Analysis Panel',
  'PANEL.FERT': 'Fertility Panel',
  'PANEL.SERO': 'Serology Panel',
  'PANEL.COAG': 'Coagulation Panel',
  'PANEL.BLDBK': 'Blood Banking Panel',
  'PANEL.CHAL': 'Challenge Test Panel',
};

const LOINC_BASE = path.join(__dirname, '..', 'Loinc_2.81');

function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath, { encoding: 'utf-8' })
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

async function main() {
  console.log('=== LOINC Lab Test Importer ===\n');

  // Step 1: Read Universal Lab Orders
  console.log('1. Reading Universal Lab Orders Value Set...');
  const universalPath = path.join(LOINC_BASE, 'AccessoryFiles', 'LoincUniversalLabOrdersValueSet', 'LoincUniversalLabOrdersValueSet.csv');
  const universalOrders = await readCSV(universalPath);
  console.log(`   Found ${universalOrders.length} universal lab orders`);

  // Step 2: Read LoincTableCore for additional details
  console.log('2. Reading LoincTableCore for details...');
  const corePath = path.join(LOINC_BASE, 'LoincTableCore', 'LoincTableCore.csv');
  const coreData = await readCSV(corePath);
  const coreMap = {};
  for (const row of coreData) {
    coreMap[row.LOINC_NUM] = row;
  }
  console.log(`   Loaded ${Object.keys(coreMap).length} core entries`);

  // Step 3: Read full Loinc.csv for EXAMPLE_UNITS
  console.log('3. Reading Loinc.csv for units and example data...');
  const loincPath = path.join(LOINC_BASE, 'LoincTable', 'Loinc.csv');
  const loincData = await readCSV(loincPath);
  const loincMap = {};
  for (const row of loincData) {
    loincMap[row.LOINC_NUM] = row;
  }
  console.log(`   Loaded ${Object.keys(loincMap).length} full LOINC entries`);

  // Step 4: Read Panels and Forms
  console.log('4. Reading Panels and Forms...');
  const panelsPath = path.join(LOINC_BASE, 'AccessoryFiles', 'PanelsAndForms', 'PanelsAndForms.csv');
  const panelsData = await readCSV(panelsPath);
  const panelMap = {};
  for (const row of panelsData) {
    const parentLoinc = row.ParentLoinc;
    const childLoinc = row.Loinc;
    if (parentLoinc && childLoinc && parentLoinc !== childLoinc) {
      if (!panelMap[parentLoinc]) {
        panelMap[parentLoinc] = [];
      }
      // Avoid duplicates
      if (!panelMap[parentLoinc].some(m => m.loinc === childLoinc)) {
        panelMap[parentLoinc].push({
          loinc: childLoinc,
          name: row.LoincName || '',
          sequence: parseInt(row.SEQUENCE) || 0,
          required: row.ObservationRequiredInPanel || '',
        });
      }
    }
  }
  console.log(`   Found ${Object.keys(panelMap).length} panels with parameters`);

  // Step 5: Connect to database
  console.log('5. Connecting to database...');
  const db = await mysql.createConnection(DB_CONFIG);

  // Step 6: Create lab_template_parameters table
  console.log('6. Creating lab_template_parameters table...');
  await db.execute(`
    CREATE TABLE IF NOT EXISTS lab_template_parameters (
      id INT AUTO_INCREMENT PRIMARY KEY,
      lab_template_id INT NOT NULL,
      loinc_num VARCHAR(20),
      parameter_name VARCHAR(255) NOT NULL,
      short_name VARCHAR(100),
      unit VARCHAR(50),
      reference_range VARCHAR(255),
      sequence_order INT DEFAULT 0,
      is_required TINYINT(1) DEFAULT 0,
      data_type VARCHAR(50) DEFAULT 'numeric',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_lab_template_id (lab_template_id),
      FOREIGN KEY (lab_template_id) REFERENCES lab_templates(id) ON DELETE CASCADE
    )
  `);
  console.log('   Table created/verified');

  // Step 7: Insert lab templates
  console.log('7. Importing lab tests...');

  let inserted = 0;
  let skipped = 0;
  let parametersInserted = 0;

  for (const order of universalOrders) {
    const loincNum = order.LOINC_NUM;
    const longName = order.LONG_COMMON_NAME;
    const core = coreMap[loincNum] || {};
    const full = loincMap[loincNum] || {};

    const className = core.CLASS || '';
    const category = CLASS_TO_CATEGORY[className] || className || 'Other';
    const component = core.COMPONENT || '';
    const property = core.PROPERTY || '';
    const system = core.SYSTEM || '';
    const scale = core.SCALE_TYP || '';
    const shortName = core.SHORTNAME || '';
    const exampleUnits = full.EXAMPLE_UNITS || full.EXAMPLE_UCUM_UNITS || '';
    const sampleType = system
      .replace('^Patient', '')
      .replace('Ser/Plas', 'Blood (Serum/Plasma)')
      .replace('SerPl', 'Blood (Serum/Plasma)')
      .replace('Bld', 'Blood')
      .replace('Urine', 'Urine')
      .replace('Ser', 'Serum')
      .replace('Plas', 'Plasma')
      .replace('CSF', 'CSF')
      .replace('Stool', 'Stool')
      .trim() || 'Blood';

    // Check if already exists
    const [existing] = await db.execute(
      'SELECT id FROM lab_templates WHERE test_code = ? AND is_global = 1',
      [loincNum]
    );

    let templateId;
    if (existing.length > 0) {
      templateId = existing[0].id;
      skipped++;
    } else {
      const [result] = await db.execute(
        `INSERT INTO lab_templates (test_name, test_code, category, sample_type, unit, reference_range, description, is_active, is_global)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)`,
        [
          longName,
          loincNum,
          category,
          sampleType,
          exampleUnits,
          '', // reference_range - varies by lab
          `LOINC: ${loincNum} | Component: ${component} | Property: ${property} | Scale: ${scale}`
        ]
      );
      templateId = result.insertId;
      inserted++;
    }

    // Insert panel parameters if available
    if (panelMap[loincNum] && panelMap[loincNum].length > 0) {
      // Check if parameters already exist
      const [existingParams] = await db.execute(
        'SELECT COUNT(*) as count FROM lab_template_parameters WHERE lab_template_id = ?',
        [templateId]
      );

      if (existingParams[0].count === 0) {
        for (const member of panelMap[loincNum]) {
          const memberCore = coreMap[member.loinc] || {};
          const memberFull = loincMap[member.loinc] || {};
          const memberUnit = memberFull.EXAMPLE_UNITS || memberFull.EXAMPLE_UCUM_UNITS || '';
          const memberName = memberCore.LONG_COMMON_NAME || member.name || '';

          await db.execute(
            `INSERT INTO lab_template_parameters (lab_template_id, loinc_num, parameter_name, short_name, unit, sequence_order, is_required)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              templateId,
              member.loinc,
              memberName,
              member.name,
              memberUnit,
              member.sequence,
              member.required === 'R' ? 1 : 0
            ]
          );
          parametersInserted++;
        }
      }
    }
  }

  console.log(`\n=== Import Complete ===`);
  console.log(`Tests inserted: ${inserted}`);
  console.log(`Tests skipped (already exist): ${skipped}`);
  console.log(`Parameters inserted: ${parametersInserted}`);

  // Step 8: Show summary
  const [counts] = await db.execute('SELECT COUNT(*) as total FROM lab_templates');
  const [paramCounts] = await db.execute('SELECT COUNT(*) as total FROM lab_template_parameters');
  const [catCounts] = await db.execute('SELECT category, COUNT(*) as count FROM lab_templates GROUP BY category ORDER BY count DESC');

  console.log(`\nTotal lab templates in DB: ${counts[0].total}`);
  console.log(`Total parameters in DB: ${paramCounts[0].total}`);
  console.log('\nCategories:');
  for (const cat of catCounts) {
    console.log(`  ${cat.category}: ${cat.count}`);
  }

  await db.end();
  console.log('\nDone!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
