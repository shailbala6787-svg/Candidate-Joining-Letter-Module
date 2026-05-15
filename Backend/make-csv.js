const fs = require('fs-extra');
const path = require('path');

async function convert() {
    try {
        const dbPath = path.join(__dirname, 'database', 'db.json');
        
        if (!fs.existsSync(dbPath)) {
            console.error('Error: database/db.json not found at', dbPath);
            return;
        }

        const db = await fs.readJson(dbPath);
        
        if (!db.candidates || db.candidates.length === 0) {
            console.error('Error: No candidates found in db.json');
            return;
        }

        const candidates = db.candidates.map(c => ({
            id: c.id,
            sr_no: c.srNo || '',
            merit_no: c.meritNo || '',
            roll_no: c.rollNo || '',
            reg_no: c.regNo || '',
            name: c.name || '',
            father_name: c.fatherName || '',
            mobile: c.mobile || '',
            email: c.email || '',
            district: c.district || '',
            selected_as: c.selectedAs || '',
            verify_status_10: c.verifyStatus10 || 'Pending',
            verify_status_12: c.verifyStatus12 || 'Pending',
            verify_status_tech: c.verifyStatusTech || 'Pending',
            verify_status_domicile: c.verifyStatusDomicile || 'Pending',
            verify_status_caste: c.verifyStatusCaste || 'Pending',
            verify_status_ews: c.verifyStatusEWS || 'Pending',
            address: (c.address || '').replace(/,/g, ' ').replace(/\n/g, ' '), 
            status: c.status || 'Pending',
            posting_district: c.postingDistrict || 'Unassigned',
            issued_letter: c.issuedLetter === true || c.issuedLetter === 'true',
            verification_date: c.verificationDate || '',
            issue_date: c.issueDate || '',
            allotment_date: c.allotmentDate || ''
        }));

        const header = Object.keys(candidates[0]).join(',') + '\n';
        const rows = candidates.map(c => Object.values(c).join(',')).join('\n');
        
        const outputPath = path.join(__dirname, 'candidates.csv');
        await fs.writeFile(outputPath, header + rows);
        
        console.log('--------------------------------------------------');
        console.log('SUCCESS: "candidates.csv" has been created!');
        console.log('Path:', outputPath);
        console.log('Now upload this file to Supabase using the UI.');
        console.log('--------------------------------------------------');
    } catch (err) {
        console.error('Migration failed:', err.message);
    }
}

convert();
