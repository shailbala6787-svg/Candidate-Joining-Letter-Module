const express = require('express');
const fs = require('fs-extra');
const path = require('path');
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');

const app = express();
const PORT = process.env.PORT || 5000;
const DB_FILE = path.join(__dirname, 'database', 'db.json');

app.use(express.json());
const cors = require('cors');
app.use(cors());

// Ensure DB exists
if (!fs.existsSync(DB_FILE)) {
  fs.outputJsonSync(DB_FILE, { candidates: [], districts: [], stats: {} });
}

// Multer config for Excel uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

let cachedDB = null;

// Helper function to read DB
const readDB = async () => {
  if (cachedDB) return cachedDB;
  try {
    const data = await fs.readJson(DB_FILE);
    cachedDB = data;
    return cachedDB;
  } catch (err) {
    console.error('Error reading DB:', err);
    return { candidates: [], districts: [], stats: {} };
  }
};

// Helper function to write DB
const writeDB = async (data) => {
  try {
    cachedDB = data;
    await fs.writeJson(DB_FILE, data, { spaces: 2 });
  } catch (err) {
    console.error('Error writing DB:', err);
  }
};

// --- API Routes ---

// Get all candidates
app.get('/api/candidates', async (req, res) => {
  const db = await readDB();
  res.json(db.candidates);
});

// Get stats
app.get('/api/stats', async (req, res) => {
  const db = await readDB();
  const candidates = db.candidates;
  
  const stats = {
    totalCandidates: candidates.length,
    verified10th: candidates.filter(c => c.verifyStatus10 === 'Verified').length,
    verified12th: candidates.filter(c => c.verifyStatus12 === 'Verified').length,
    verifiedTech: candidates.filter(c => c.verifyStatusTech === 'Verified').length,
    verifiedDomicile: candidates.filter(c => c.verifyStatusDomicile === 'Verified').length,
    verifiedCaste: candidates.filter(c => c.verifyStatusCaste === 'Verified').length,
    verifiedEWS: candidates.filter(c => c.verifyStatusEWS === 'Verified').length,
    totalVerified: candidates.filter(c => c.status === 'Verified' || c.status === 'Offline Verified').length,
    pendingVerification: candidates.filter(c => c.status !== 'Verified' && c.status !== 'Offline Verified').length,
    totalIssuedLetters: candidates.filter(c => c.issuedLetter === true || c.issuedLetter === 'true').length,
    postingAssigned: candidates.filter(c => c.postingDistrict && c.postingDistrict !== '' && c.postingDistrict !== 'Unassigned' && c.postingDistrict !== 'Not Allotted').length
  };
  
  res.json(stats);
});

// Get districts
app.get('/api/districts', async (req, res) => {
  const db = await readDB();
  res.json(db.districts);
});

// Add candidate
app.post('/api/candidates', upload.single('photo'), async (req, res) => {
  const db = await readDB();
  const newCandidate = {
    id: `UPP-${Math.floor(1000 + Math.random() * 9000)}`,
    status: 'Pending',
    ...req.body,
    photo: req.file ? req.file.path : null
  };
  db.candidates.push(newCandidate);
  db.stats.totalCandidates += 1;
  await writeDB(db);
  res.status(201).json(newCandidate);
});

// Update candidate
app.put('/api/candidates/:id', async (req, res) => {
  const db = await readDB();
  const index = db.candidates.findIndex(c => c.id === req.params.id);
  if (index !== -1) {
    const updatedData = { ...db.candidates[index], ...req.body };
    
    // Auto-calculate master status
    const verificationFields = [
      updatedData.verifyStatus10,
      updatedData.verifyStatus12,
      updatedData.verifyStatusTech,
      updatedData.verifyStatusDomicile,
      updatedData.verifyStatusCaste,
      updatedData.verifyStatusEWS
    ];
    
    const isAllVerified = verificationFields.every(s => s === 'Verified' || s === 'Offline Verified' || s === 'N/A');
    if (isAllVerified) {
      updatedData.status = 'Verified';
    } else {
      updatedData.status = 'Pending';
    }

    db.candidates[index] = updatedData;
    await writeDB(db);
    res.json(db.candidates[index]);
  } else {
    res.status(404).send('Candidate not found');
  }
});

// Delete candidate
app.delete('/api/candidates/:id', async (req, res) => {
  const db = await readDB();
  const index = db.candidates.findIndex(c => c.id === req.params.id);
  if (index !== -1) {
    db.candidates.splice(index, 1);
    db.stats.totalCandidates -= 1;
    await writeDB(db);
    res.status(204).send();
  } else {
    res.status(404).send('Candidate not found');
  }
});

// Verify Candidate
app.post('/api/candidates/:id/verify', async (req, res) => {
  const db = await readDB();
  const index = db.candidates.findIndex(c => c.id === req.params.id);
  if (index !== -1) {
    db.candidates[index].status = 'Verified';
    // Set individual statuses to Verified as well if they were pending
    if (db.candidates[index].verifyStatus10 === 'Pending') db.candidates[index].verifyStatus10 = 'Verified';
    if (db.candidates[index].verifyStatus12 === 'Pending') db.candidates[index].verifyStatus12 = 'Verified';
    if (db.candidates[index].verifyStatusTech === 'Pending') db.candidates[index].verifyStatusTech = 'Verified';
    if (db.candidates[index].verifyStatusDomicile === 'Pending') db.candidates[index].verifyStatusDomicile = 'Verified';
    if (db.candidates[index].verifyStatusCaste === 'Pending') db.candidates[index].verifyStatusCaste = 'Verified';
    if (db.candidates[index].verifyStatusEWS === 'Pending') db.candidates[index].verifyStatusEWS = 'Verified';
    
    db.candidates[index].verificationDate = new Date().toISOString().split('T')[0];
    await writeDB(db);
    res.json(db.candidates[index]);
  } else {
    res.status(404).send('Candidate not found');
  }
});

// Allot District
app.post('/api/candidates/:id/allot', async (req, res) => {
  const db = await readDB();
  const index = db.candidates.findIndex(c => c.id === req.params.id);
  if (index !== -1) {
    db.candidates[index].postingDistrict = req.body.district;
    db.candidates[index].allotmentDate = new Date().toISOString().split('T')[0];
    await writeDB(db);
    res.json(db.candidates[index]);
  } else {
    res.status(404).send('Candidate not found');
  }
});

// Issue Joining Letter
app.post('/api/candidates/:id/issue-letter', async (req, res) => {
  const db = await readDB();
  const index = db.candidates.findIndex(c => c.id === req.params.id);
  if (index !== -1) {
    db.candidates[index].issuedLetter = true;
    db.candidates[index].issueDate = new Date().toISOString().split('T')[0];
    await writeDB(db);
    res.json(db.candidates[index]);
  } else {
    res.status(404).send('Candidate not found');
  }
});

// Bulk Upload Excel
app.post('/api/candidates/bulk-upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded');
  
  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    
    const db = await readDB();
    let updatedCount = 0;
    let addedCount = 0;

    console.log(`Processing ${data.length} candidates from Excel. Sample keys:`, Object.keys(data[0] || {}));

    data.forEach(item => {
      // Find keys case-insensitively and remove spaces/underscores for matching
      const findVal = (possibleKeys) => {
        const foundKey = Object.keys(item).find(k => 
          possibleKeys.some(pk => k.toLowerCase().replace(/[\s_]/g, '') === pk.toLowerCase().replace(/[\s_]/g, ''))
        );
        return foundKey ? item[foundKey] : undefined;
      };

      const rollNo = (findVal(['rollNo', 'Roll No.', 'RollNumber']) || '').toString().trim();
      const regNo = (findVal(['regNo', 'Registration No.', 'RegistrationNumber']) || '').toString().trim();
      
      const existingIndex = db.candidates.findIndex(c => 
        (rollNo && c.rollNo && c.rollNo.toString().toLowerCase() === rollNo.toLowerCase()) || 
        (regNo && c.regNo && c.regNo.toString().toLowerCase() === regNo.toLowerCase())
      );

      const getStatus = (keys) => {
        let val = findVal(keys);
        if (val === undefined || val === null || val === '') return undefined;
        val = val.toString().trim();
        // Normalize common values
        if (val.toLowerCase() === 'verified') return 'Verified';
        if (val.toLowerCase().includes('offline')) return 'Offline Verified';
        if (val.toLowerCase().includes('need')) return 'Need to Offline Verified';
        if (val.toLowerCase() === 'n/a' || val.toLowerCase() === 'na') return 'N/A';
        return val;
      };

      const candidateData = {
        srNo: findVal(['srNo', 'Sr. No.', 'Serial']),
        meritNo: findVal(['meritNo', 'Merit No.', 'Merit']),
        rollNo: rollNo,
        regNo: regNo,
        name: findVal(['name', 'Candidate Name', 'FullName']),
        fatherName: findVal(['fatherName', 'Father Name', 'FathersName']),
        mobile: findVal(['mobile', 'Mobile Number', 'Phone']),
        email: findVal(['email', 'Email ID', 'EmailAddress']),
        district: findVal(['district', 'District', 'City']),
        selectedAs: findVal(['selectedAs', 'Selected As', 'Category']),
        verifyStatus10: getStatus(['verifyStatus10', '10th Verification Status', '10thVerify']),
        verifyStatus12: getStatus(['verifyStatus12', '12th Verification Status', '12thVerify']),
        verifyStatusTech: getStatus(['verifyStatusTech', 'Technical Verification Status', 'TechVerify']),
        verifyStatusDomicile: getStatus(['verifyStatusDomicile', 'DOMICILE Verification Status', 'DomVerify']),
        verifyStatusCaste: getStatus(['verifyStatusCaste', 'CASTE Verification Status', 'CasteVerify']),
        verifyStatusEWS: getStatus(['verifyStatusEWS', 'EWS Verification Status', 'EwsVerify']),
        address: findVal(['address', 'Address', 'Permanent Address']),
        status: getStatus(['status', 'Status', 'VerificationStatus']),
        postingDistrict: findVal(['postingDistrict', 'Posting District', 'AllottedDistrict']),
        issuedLetter: findVal(['issuedLetter', 'Issued Letter', 'LetterStatus'])
      };

      // Clean undefined values so they don't overwrite existing data
      Object.keys(candidateData).forEach(key => {
        if (candidateData[key] === undefined) delete candidateData[key];
      });

      if (existingIndex !== -1) {
        // Update existing - Merge data
        db.candidates[existingIndex] = { ...db.candidates[existingIndex], ...candidateData };
        updatedCount++;
      } else {
        // Add new
        db.candidates.push({
          id: `UPP-${Math.floor(1000 + Math.random() * 9000)}`,
          status: 'Pending',
          ...candidateData
        });
        addedCount++;
      }
    });
    
    console.log(`Upload complete: ${addedCount} added, ${updatedCount} updated.`);
    await writeDB(db);
    await fs.remove(req.file.path);
    
    res.json({ message: `${addedCount} new candidates added, ${updatedCount} updated successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error processing Excel file');
  }
});

// Download Sample Excel with Dropdowns
app.get('/api/candidates/sample-excel', async (req, res) => {
  const db = await readDB();
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Candidates');
  
  // Define Columns
  const columns = [
    { header: 'Sr. No.', key: 'srNo', width: 10 },
    { header: 'Merit No.', key: 'meritNo', width: 15 },
    { header: 'Roll No.', key: 'rollNo', width: 15 },
    { header: 'Registration No.', key: 'regNo', width: 20 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Father Name', key: 'fatherName', width: 25 },
    { header: 'Mobile', key: 'mobile', width: 15 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'District', key: 'district', width: 20 },
    { header: 'Selected As', key: 'selectedAs', width: 15 },
    { header: '10th Verification Status', key: 'v10', width: 25 },
    { header: '12th Verification Status', key: 'v12', width: 25 },
    { header: 'Technical Verification Status', key: 'vTech', width: 25 },
    { header: 'DOMICILE Verification Status', key: 'vDom', width: 25 },
    { header: 'CASTE Verification Status', key: 'vCas', width: 25 },
    { header: 'EWS Verification Status', key: 'vEws', width: 25 },
    { header: 'Address', key: 'address', width: 30 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Posting District', key: 'postDist', width: 20 },
    { header: 'Issued Letter', key: 'issued', width: 15 }
  ];
  
  sheet.columns = columns;

  // Add Sample Row
  const sampleRow = sheet.addRow({
    srNo: 1,
    meritNo: 101,
    rollNo: 'R12345',
    regNo: 'REG67890',
    name: 'Sample Candidate',
    fatherName: 'Father Name',
    mobile: '9876543210',
    email: 'sample@example.com',
    district: 'Lucknow',
    selectedAs: 'UR',
    v10: 'Verified',
    v12: 'Verified',
    vTech: 'Verified',
    vDom: 'Verified',
    vCas: 'Verified',
    vEws: 'N/A',
    address: 'Sample Address',
    status: 'Verified',
    postDist: 'Lucknow',
    issued: 'true'
  });

  // Data Validations (Dropdowns)
  const districtsList = db.districts.join(',');
  const categoryList = 'UR,EWS,OBC,SC,ST';
  const verifyList = 'Verified,Need to Offline Verified,Offline Verified,N/A';
  const statusList = 'Verified,Pending';
  const boolList = 'true,false';

  // Apply validations to first 100 rows
  for (let i = 2; i <= 101; i++) {
    sheet.getCell(`I${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [`"${districtsList}"`] };
    sheet.getCell(`J${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [`"${categoryList}"`] };
    sheet.getCell(`K${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [`"${verifyList}"`] };
    sheet.getCell(`L${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [`"${verifyList}"`] };
    sheet.getCell(`M${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [`"${verifyList}"`] };
    sheet.getCell(`N${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [`"${verifyList}"`] };
    sheet.getCell(`O${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [`"${verifyList}"`] };
    sheet.getCell(`P${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [`"${verifyList}"`] };
    sheet.getCell(`R${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [`"${statusList}"`] };
    sheet.getCell(`S${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [`"${districtsList}"`] };
    sheet.getCell(`T${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [`"${boolList}"`] };
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="UP_Police_Bulk_Sample_v2.xlsx"');
  
  await workbook.xlsx.write(res);
  res.end();
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
