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

// Bulk Upload (Updated indices for removed ID column)
app.post('/api/candidates/bulk-upload', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(req.file.path);
        const worksheet = workbook.getWorksheet(1);
        const candidatesToInsert = [];

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header

            const rollNo = row.getCell(3).value?.toString() || '';
            const regNo = row.getCell(4).value?.toString() || '';
            
            // Use Roll No as part of ID to make it consistent/unique
            const generatedId = `UPP-${rollNo || Math.floor(Math.random() * 9000) + 1000}`;

            const candidate = {
                id: generatedId,
                sr_no: parseInt(row.getCell(1).value) || 0,
                merit_no: row.getCell(2).value?.toString() || '',
                roll_no: rollNo,
                reg_no: regNo,
                name: row.getCell(5).value?.toString() || '',
                father_name: row.getCell(6).value?.toString() || '',
                mobile: row.getCell(7).value?.toString() || '',
                email: row.getCell(8).value?.toString() || '',
                district: row.getCell(9).value?.toString() || '',
                address: row.getCell(10).value?.toString() || '',
                selected_as: row.getCell(11).value?.toString() || 'UR',
                verify_status_10: row.getCell(12).value?.toString() || 'Pending',
                verify_status_12: row.getCell(13).value?.toString() || 'Pending',
                verify_status_tech: row.getCell(14).value?.toString() || 'Pending',
                verify_status_domicile: row.getCell(15).value?.toString() || 'Pending',
                verify_status_caste: row.getCell(16).value?.toString() || 'Pending',
                verify_status_ews: row.getCell(17).value?.toString() || 'Pending',
                status: 'Pending'
            };
            candidatesToInsert.push(candidate);
        });

        const { error } = await supabase.from('candidates').upsert(candidatesToInsert);
        await fs.remove(req.file.path);
        if (error) throw error;
        res.json({ message: `Successfully uploaded ${candidatesToInsert.length} candidates!` });
    } catch (err) {
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

        const stats = {
            totalCandidates: data.length,
            totalVerified: data.filter(c => c.status === 'Verified' || c.status === 'Offline Verified').length,
            pendingVerification: data.filter(c => c.status !== 'Verified' && c.status !== 'Offline Verified').length,
            totalIssuedLetters: data.filter(c => c.issued_letter === true || c.issued_letter === 'true').length,
            verified10th: data.filter(c => c.verify_status_10 === 'Verified').length,
            verified12th: data.filter(c => c.verify_status_12 === 'Verified').length,
            verifiedTech: data.filter(c => c.verify_status_tech === 'Verified').length,
            verifiedDomicile: data.filter(c => c.verify_status_domicile === 'Verified').length,
            verifiedCaste: data.filter(c => c.verify_status_caste === 'Verified').length,
            verifiedEWS: data.filter(c => c.verify_status_ews === 'Verified').length,
            postingAssigned: data.filter(c => c.posting_district && c.posting_district !== 'Unassigned' && c.posting_district !== '').length
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
