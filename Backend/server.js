const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const multer = require('multer');
const ExcelJS = require('exceljs');
const fs = require('fs-extra');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const upload = multer({ dest: 'uploads/' });

// Initialize Supabase Client
const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_KEY || '');

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../Frontend')));

// Logging Middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// --- Mapping Helpers ---

const mapToFrontend = (c) => {
    if (!c) return null;
    return {
        id: c.id || '',
        srNo: c.sr_no || 0,
        meritNo: c.merit_no || '',
        rollNo: c.roll_no || '',
        regNo: c.reg_no || '',
        name: c.name || 'Unknown',
        fatherName: c.father_name || '',
        mobile: c.mobile || '',
        email: c.email || '',
        district: c.district || 'Unassigned',
        address: c.address || '',
        selectedAs: c.selected_as || 'UR',
        verifyStatus10: c.verify_status_10 || 'Pending',
        verifyStatus12: c.verify_status_12 || 'Pending',
        verifyStatusTech: c.verify_status_tech || 'Pending',
        verifyStatusDomicile: c.verify_status_domicile || 'Pending',
        verifyStatusCaste: c.verify_status_caste || 'Pending',
        verifyStatusEWS: c.verify_status_ews || 'Pending',
        status: c.status || 'Pending',
        postingDistrict: c.posting_district || 'Unassigned',
        issuedLetter: c.issued_letter === true || c.issued_letter === 'true',
        verificationDate: c.verification_date || '',
        allotmentDate: c.allotment_date || '',
        issueDate: c.issue_date || ''
    };
};

const mapToSupabase = (c) => {
    const s = {};
    if (c.id) s.id = c.id;
    if (c.srNo !== undefined) s.sr_no = c.srNo;
    if (c.meritNo !== undefined) s.merit_no = c.meritNo;
    if (c.rollNo !== undefined) s.roll_no = c.rollNo;
    if (c.regNo !== undefined) s.reg_no = c.regNo;
    if (c.name !== undefined) s.name = c.name;
    if (c.fatherName !== undefined) s.father_name = c.fatherName;
    if (c.mobile !== undefined) s.mobile = c.mobile;
    if (c.email !== undefined) s.email = c.email;
    if (c.district !== undefined) s.district = c.district;
    if (c.address !== undefined) s.address = c.address;
    if (c.selectedAs !== undefined) s.selected_as = c.selectedAs;
    if (c.verifyStatus10 !== undefined) s.verify_status_10 = c.verifyStatus10;
    if (c.verifyStatus12 !== undefined) s.verify_status_12 = c.verifyStatus12;
    if (c.verifyStatusTech !== undefined) s.verify_status_tech = c.verifyStatusTech;
    if (c.verifyStatusDomicile !== undefined) s.verify_status_domicile = c.verifyStatusDomicile;
    if (c.verifyStatusCaste !== undefined) s.verify_status_caste = c.verifyStatusCaste;
    if (c.verifyStatusEWS !== undefined) s.verify_status_ews = c.verifyStatusEWS;
    if (c.status !== undefined) s.status = c.status;
    if (c.postingDistrict !== undefined) s.posting_district = c.postingDistrict;
    if (c.issuedLetter !== undefined) s.issued_letter = c.issuedLetter;
    if (c.verificationDate !== undefined) s.verification_date = c.verificationDate;
    if (c.allotmentDate !== undefined) s.allotment_date = c.allotmentDate;
    if (c.issueDate !== undefined) s.issue_date = c.issueDate;
    return s;
};

// --- API Routes ---

app.get('/api/candidates', async (req, res) => {
    try {
        const { search = '' } = req.query;
        let query = supabase.from('candidates').select('*');
        if (search) {
            query = query.or(`name.ilike.%${search}%,roll_no.ilike.%${search}%,reg_no.ilike.%${search}%,id.ilike.%${search}%`);
        }
        const { data, error } = await query.order('sr_no', { ascending: true });
        if (error) throw error;
        console.log(`[GET] Candidates fetched: ${data?.length || 0}`);
        res.json(data.map(mapToFrontend));
    } catch (err) {
        console.error('[GET] Fetch error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Sample Excel Download (REMOVED Candidate ID)
app.get('/api/candidates/sample-excel', async (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sample Data');
        
        worksheet.columns = [
            { header: 'Sr. No.', key: 'sr_no', width: 8 },
            { header: 'Merit No.', key: 'merit_no', width: 12 },
            { header: 'Roll No.', key: 'roll_no', width: 15 },
            { header: 'Reg No.', key: 'reg_no', width: 15 },
            { header: 'Name', key: 'name', width: 25 },
            { header: 'Father Name', key: 'father_name', width: 25 },
            { header: 'Mobile', key: 'mobile', width: 15 },
            { header: 'Email', key: 'email', width: 20 },
            { header: 'District', key: 'district', width: 15 },
            { header: 'Address', key: 'address', width: 30 },
            { header: 'Selected As', key: 'selected_as', width: 12 },
            { header: '10th Status', key: 'v10', width: 15 },
            { header: '12th Status', key: 'v12', width: 15 },
            { header: 'Tech Status', key: 'vtech', width: 15 },
            { header: 'Domicile Status', key: 'vdomicile', width: 15 },
            { header: 'Caste Status', key: 'vcaste', width: 15 },
            { header: 'EWS Status', key: 'vews', width: 15 }
        ];

        worksheet.addRow([1, '501', '12345678', '9876543', 'Amit Sharma', 'Rajesh Sharma', '9876543210', 'amit@example.com', 'Lucknow', 'House 123, Street 4, Lucknow', 'UR', 'Verified', 'Verified', 'Verified', 'Verified', 'Verified', 'N/A']);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=UP_Police_Bulk_Template.xlsx');
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/candidates', upload.none(), async (req, res) => {
    try {
        const candidateData = mapToSupabase(req.body);
        
        if (!candidateData.id) {
            candidateData.id = `UPP-${Math.floor(Math.random() * 90000) + 10000}`;
        }
        
        if (!candidateData.status) candidateData.status = 'Pending';
        
        // Get max sr_no and increment
        const { data: maxCand, error: maxError } = await supabase
            .from('candidates')
            .select('sr_no')
            .order('sr_no', { ascending: false })
            .limit(1);
            
        if (maxError) throw maxError;
        const nextSrNo = (maxCand && maxCand.length > 0) ? (maxCand[0].sr_no + 1) : 1;
        candidateData.sr_no = nextSrNo;

        const { data, error } = await supabase
            .from('candidates')
            .insert(candidateData)
            .select();

        if (error) throw error;
        console.log(`[POST] Candidate created: ${data[0].id}`);
        res.json(mapToFrontend(data[0]));
    } catch (err) {
        console.error('[POST] Create error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Bulk Upload (Updated indices for removed ID column)
app.post('/api/candidates/bulk-upload', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(req.file.path);
        const worksheet = workbook.getWorksheet(1);
        const candidatesToInsert = [];

        const getCellText = (cell) => {
            if (!cell) return '';
            if (cell.value && typeof cell.value === 'object') {
                if (cell.value.result !== undefined) return cell.value.result.toString().trim();
                if (cell.value.richText) return cell.value.richText.map(t => t.text).join('').trim();
            }
            return cell.text?.toString().trim() || cell.value?.toString().trim() || '';
        };

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header

            const name = getCellText(row.getCell(5));
            const rollNo = getCellText(row.getCell(3));
            
            // Skip empty rows to prevent database failures on empty rows
            if (!name && !rollNo) return;

            const srNoVal = row.getCell(1).value;
            const sr_no = parseInt(srNoVal) || (srNoVal && typeof srNoVal === 'object' && parseInt(srNoVal.result)) || 0;
            const merit_no = getCellText(row.getCell(2));
            const regNo = getCellText(row.getCell(4));
            const father_name = getCellText(row.getCell(6));
            const mobile = getCellText(row.getCell(7));
            const email = getCellText(row.getCell(8));
            const district = getCellText(row.getCell(9));
            const address = getCellText(row.getCell(10));
            const selected_as = getCellText(row.getCell(11)) || 'UR';
            const verify_status_10 = getCellText(row.getCell(12)) || 'Pending';
            const verify_status_12 = getCellText(row.getCell(13)) || 'Pending';
            const verify_status_tech = getCellText(row.getCell(14)) || 'Pending';
            const verify_status_domicile = getCellText(row.getCell(15)) || 'Pending';
            const verify_status_caste = getCellText(row.getCell(16)) || 'Pending';
            const verify_status_ews = getCellText(row.getCell(17)) || 'Pending';

            // Use Roll No as part of ID to make it consistent/unique
            const generatedId = `UPP-${rollNo || Math.floor(Math.random() * 90000) + 10000}`;

            candidatesToInsert.push({
                id: generatedId,
                sr_no,
                merit_no,
                roll_no: rollNo,
                reg_no: regNo,
                name,
                father_name,
                mobile,
                email,
                district,
                address,
                selected_as,
                verify_status_10,
                verify_status_12,
                verify_status_tech,
                verify_status_domicile,
                verify_status_caste,
                verify_status_ews,
                status: 'Pending'
            });
        });

        // Deduplicate the array by ID (keep the last occurrence in case of duplicates in the Excel file)
        const uniqueCandidatesMap = new Map();
        for (const candidate of candidatesToInsert) {
            uniqueCandidatesMap.set(candidate.id, candidate);
        }
        const deduplicatedCandidates = Array.from(uniqueCandidatesMap.values());

        if (deduplicatedCandidates.length === 0) {
            await fs.remove(req.file.path);
            return res.status(400).json({ error: 'No valid candidate rows found in Excel file.' });
        }

        // Upsert in chunks of 100 to prevent payload size limits
        const chunkSize = 100;
        for (let i = 0; i < deduplicatedCandidates.length; i += chunkSize) {
            const chunk = deduplicatedCandidates.slice(i, i + chunkSize);
            const { error } = await supabase.from('candidates').upsert(chunk);
            if (error) throw error;
        }

        await fs.remove(req.file.path);
        res.json({ message: `Successfully uploaded ${deduplicatedCandidates.length} candidates!` });
    } catch (err) {
        if (req.file && await fs.exists(req.file.path)) {
            await fs.remove(req.file.path).catch(() => {});
        }
        console.error('Bulk Upload Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Update, Delete, Verify, Allot, Issue, Stats, Districts (Already correct)
app.put('/api/candidates/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('candidates')
            .update(mapToSupabase(req.body))
            .eq('id', req.params.id)
            .select();

        if (error) throw error;
        if (!data || data.length === 0) {
            return res.status(404).json({ error: 'Candidate not found' });
        }
        res.json(mapToFrontend(data[0]));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/candidates/:id', async (req, res) => {
    try {
        if (req.params.id === 'all') {
            const { error } = await supabase.from('candidates').delete().neq('id', '0'); // Delete all rows
            if (error) throw error;
            return res.json({ message: 'All records deleted successfully' });
        }
        const { data, error } = await supabase
            .from('candidates')
            .delete()
            .eq('id', req.params.id)
            .select();
            
        if (error) throw error;
        if (!data || data.length === 0) {
            return res.status(404).json({ error: 'Candidate not found' });
        }
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/candidates/:id/verify', async (req, res) => {
    try {
        const { data, error } = await supabase.from('candidates').update({ 
            status: 'Verified',
            verification_date: new Date().toISOString().split('T')[0]
        }).eq('id', req.params.id).select();
        if (error) throw error;
        res.json(mapToFrontend(data[0]));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/candidates/:id/allot', async (req, res) => {
    try {
        const { data, error } = await supabase.from('candidates').update({ 
            posting_district: req.body.district,
            allotment_date: new Date().toISOString().split('T')[0]
        }).eq('id', req.params.id).select();
        if (error) throw error;
        res.json(mapToFrontend(data[0]));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/candidates/:id/issue-letter', async (req, res) => {
    try {
        const { data, error } = await supabase.from('candidates').update({ 
            issued_letter: true,
            issue_date: new Date().toISOString().split('T')[0]
        }).eq('id', req.params.id).select();
        if (error) throw error;
        res.json(mapToFrontend(data[0]));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const { data, error } = await supabase.from('candidates').select('status, issued_letter, verify_status_10, verify_status_12, verify_status_tech, verify_status_domicile, verify_status_caste, verify_status_ews, posting_district');
        if (error) throw error;

        const isValVerified = (val) => {
            if (!val) return false;
            const s = val.toString().trim().toLowerCase();
            return s === 'verified' || s === 'offline verified' || s === 'n/a';
        };

        const stats = {
            totalCandidates: data.length,
            totalVerified: data.filter(c => c.status === 'Verified' || c.status === 'Offline Verified').length,
            pendingVerification: data.filter(c => c.status !== 'Verified' && c.status !== 'Offline Verified').length,
            totalIssuedLetters: data.filter(c => c.issued_letter === true || c.issued_letter === 'true').length,
            verified10th: data.filter(c => isValVerified(c.verify_status_10)).length,
            verified12th: data.filter(c => isValVerified(c.verify_status_12)).length,
            verifiedTech: data.filter(c => isValVerified(c.verify_status_tech)).length,
            verifiedDomicile: data.filter(c => isValVerified(c.verify_status_domicile)).length,
            verifiedCaste: data.filter(c => isValVerified(c.verify_status_caste)).length,
            verifiedEWS: data.filter(c => isValVerified(c.verify_status_ews)).length,
            postingAssigned: data.filter(c => c.posting_district && c.posting_district !== 'Unassigned' && c.posting_district !== 'Not Allotted' && c.posting_district !== '').length
        };
        console.log(`[GET] Stats calculated for ${data?.length || 0} candidates`);
        res.json(stats);
    } catch (err) {
        console.error('[GET] Stats error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/districts', async (req, res) => {
    try {
        const { data, error } = await supabase.from('districts').select('name').order('name');
        if (error) throw error;
        console.log(`[GET] Districts fetched: ${data?.length || 0}`);
        res.json(data.map(d => d.name));
    } catch (err) {
        console.error('[GET] Districts error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} with Auto-ID Bulk Upload!`);
});
