const API_URL = 'https://candidate-joining-letter-module.onrender.com/api';
// Authentication Check
if (!window.location.pathname.includes('login.html')) {
    if (localStorage.getItem('isLoggedIn') !== 'true') {
        window.location.href = 'login.html';
    }
}

// Shared State
let candidates = [];
let stats = {};
let districts = [];
let currentPreviewId = null;

// Pagination State - Dashboard
let currentPage = 1;
let pageSize = 10;

// Pagination State - Edit Page
let currentEditPage = 1;
let editPageSize = 10;

// Pagination State - Verification Page
let currentVerifyPage = 1;
let verifyPageSize = 10;

// Pagination State - Joining Letter Page
let currentLetterPage = 1;
let letterPageSize = 10;

// Pagination State - Allotment Page
let currentAllotPage = 1;
let allotPageSize = 10;

// DOM Elements (Check if they exist before using)
const getLoader = () => document.getElementById('loader');

// Loader Utils
function showLoader() {
    const loader = getLoader();
    if (loader) loader.style.display = 'flex';
}
function hideLoader() {
    const loader = getLoader();
    if (loader) loader.style.display = 'none';
}

// --- Pagination Helpers ---
function generatePaginationHtml(currentPage, totalPages, changeFnName) {
    if (totalPages <= 1) return '';
    let html = '';

    html += `<button class="btn btn-sm" onclick="${changeFnName}(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} style="padding: 5px 10px; background: #eee; border: 1px solid #ddd; cursor: pointer;">Prev</button>`;

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `<button class="btn btn-sm" onclick="${changeFnName}(${i})" style="padding: 5px 10px; margin: 0 2px; ${currentPage === i ? 'background: var(--primary-color); color: white;' : 'background: #eee;'} border: 1px solid #ddd; cursor: pointer;">${i}</button>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += `<span style="padding: 5px;">...</span>`;
        }
    }

    html += `<button class="btn btn-sm" onclick="${changeFnName}(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} style="padding: 5px 10px; background: #eee; border: 1px solid #ddd; cursor: pointer;">Next</button>`;

    return html;
}

// --- Data Fetching ---
async function fetchData() {
    try {
        const fetchTasks = [
            fetch(`${API_URL}/candidates`).then(r => r.json()),
            fetch(`${API_URL}/stats`).then(r => r.json())
        ];

        // Only fetch districts once per session to improve performance
        const cachedDistricts = sessionStorage.getItem('cached_districts');
        if (cachedDistricts) {
            districts = JSON.parse(cachedDistricts);
        } else {
            fetchTasks.push(fetch(`${API_URL}/districts`).then(r => r.json()).then(data => {
                try {
                    sessionStorage.setItem('cached_districts', JSON.stringify(data));
                } catch (e) {
                    console.error('Failed to cache districts in sessionStorage:', e);
                }
                return data;
            }));
        }

        const results = await Promise.all(fetchTasks);
        let apiCandidates = results[0];
        
        // Apply local deletions
        if (localStorage.getItem('deleted_candidates')) {
            const deletedIds = JSON.parse(localStorage.getItem('deleted_candidates'));
            apiCandidates = apiCandidates.filter(c => !deletedIds.includes(c.id));
        }

        stats = results[1];
        if (results[2]) districts = results[2];

        // Merge locally saved mock candidates with API data
        let localCandidates = [];
        if (localStorage.getItem('mock_candidates')) {
            localCandidates = JSON.parse(localStorage.getItem('mock_candidates'));
        }
        
        // Merge local changes into API candidates
        localCandidates.forEach(localCand => {
            const exists = apiCandidates.find(c => c.id === localCand.id);
            if (!exists) {
                apiCandidates.push(localCand);
            } else {
                Object.assign(exists, localCand);
            }
        });
        candidates = apiCandidates;
        
        // Recalculate stats with the merged candidates
        const isVerified = (val) => {
            if (!val) return false;
            const s = val.toString().trim().toLowerCase();
            return s === 'verified' || s === 'offline verified' || s === 'n/a';
        };

        const verified10th = candidates.filter(c => isVerified(c.verifyStatus10)).length;
        const verified12th = candidates.filter(c => isVerified(c.verifyStatus12)).length;
        const verifiedTech = candidates.filter(c => isVerified(c.verifyStatusTech)).length;
        const verifiedDomicile = candidates.filter(c => isVerified(c.verifyStatusDomicile)).length;
        const verifiedCaste = candidates.filter(c => isVerified(c.verifyStatusCaste)).length;
        const verifiedEWS = candidates.filter(c => isVerified(c.verifyStatusEWS)).length;
        const totalVerified = candidates.filter(c => c.status === 'Verified' || c.status === 'Offline Verified').length;
        const pendingVerification = candidates.filter(c => c.status !== 'Verified' && c.status !== 'Offline Verified').length;
        const totalIssuedLetters = candidates.filter(c => c.issuedLetter === true || c.issuedLetter === 'true').length;
        const postingAssigned = candidates.filter(c => c.postingDistrict && c.postingDistrict !== 'Unassigned' && c.postingDistrict !== 'Not Allotted' && c.postingDistrict !== '').length;

        stats = { totalCandidates: candidates.length, verified10th, verified12th, verifiedTech, verifiedDomicile, verifiedCaste, verifiedEWS, totalVerified, pendingVerification, totalIssuedLetters, postingAssigned };

    } catch (err) {
        console.error('Error fetching data:', err);
        // Fallback dummy data for demo if backend is unreachable
        districts = [
            "Agra", "Aligarh", "Ambedkar Nagar", "Amethi", "Amroha", "Auraiya", "Ayodhya", "Azamgarh", "Baghpat", "Bahraich",
            "Ballia", "Balrampur", "Banda", "Barabanki", "Bareilly", "Basti", "Bhadohi", "Bijnor", "Budaun", "Bulandshahr",
            "Chandauli", "Chitrakoot", "Deoria", "Etah", "Etawah", "Farrukhabad", "Fatehpur", "Firozabad", "Gautam Buddha Nagar",
            "Ghaziabad", "Ghazipur", "Gonda", "Gorakhpur", "Hamirpur", "Hapur", "Hardoi", "Hathras", "Jalaun", "Jaunpur", "Jhansi",
            "Kannauj", "Kanpur Dehat", "Kanpur Nagar", "Kasganj", "Kaushambi", "Kushinagar", "Lakhimpur Kheri", "Lalitpur",
            "Lucknow", "Maharajganj", "Mahoba", "Mainpuri", "Mathura", "Mau", "Meerut", "Mirzapur", "Moradabad", "Muzaffarnagar",
            "Pilibhit", "Pratapgarh", "Prayagraj", "Rae Bareli", "Rampur", "Saharanpur", "Sambhal", "Sant Kabir Nagar",
            "Shahjahanpur", "Shamli", "Shravasti", "Siddharthnagar", "Sitapur", "Sonbhadra", "Sultanpur", "Unnao", "Varanasi", "Other"
        ];
        if (localStorage.getItem('mock_candidates')) {
            candidates = JSON.parse(localStorage.getItem('mock_candidates'));
        } else {
            candidates = [
                { id: 'UPP-1001', name: 'Amit Sharma', fatherName: 'Rajesh Sharma', mobile: '9876543210', district: 'Lucknow', status: 'Verified', category: 'General', cert10: '12345', cert12: '67890', certTech: 'TECH-11', postingDistrict: 'Lucknow', joiningDate: '2026-06-01', issuedLetter: true, meritNo: '1001', rollNo: '123456', regNo: '987654', verifyStatus10: 'Verified', verifyStatus12: 'Verified', verifyStatusTech: 'Verified' },
                { id: 'UPP-1002', name: 'Priya Singh', fatherName: 'Vikram Singh', mobile: '9988776655', district: 'Kanpur', status: 'Pending', category: 'OBC', cert10: '22334', cert12: '44556', certTech: 'TECH-22', postingDistrict: '', joiningDate: '', issuedLetter: false, meritNo: '1002', rollNo: '654321', regNo: '456789', verifyStatus10: 'Pending', verifyStatus12: 'Pending', verifyStatusTech: 'Pending' }
            ];
            localStorage.setItem('mock_candidates', JSON.stringify(candidates));
        }
        
        if (localStorage.getItem('deleted_candidates')) {
            const deletedIds = JSON.parse(localStorage.getItem('deleted_candidates'));
            candidates = candidates.filter(c => !deletedIds.includes(c.id));
        }

        const isVerified = (val) => {
            if (!val) return false;
            const s = val.toString().trim().toLowerCase();
            return s === 'verified' || s === 'offline verified' || s === 'n/a';
        };

        const verified10th = candidates.filter(c => isVerified(c.verifyStatus10)).length;
        const verified12th = candidates.filter(c => isVerified(c.verifyStatus12)).length;
        const verifiedTech = candidates.filter(c => isVerified(c.verifyStatusTech)).length;
        const verifiedDomicile = candidates.filter(c => isVerified(c.verifyStatusDomicile)).length;
        const verifiedCaste = candidates.filter(c => isVerified(c.verifyStatusCaste)).length;
        const verifiedEWS = candidates.filter(c => isVerified(c.verifyStatusEWS)).length;
        const totalVerified = candidates.filter(c => c.status === 'Verified' || c.status === 'Offline Verified').length;
        const pendingVerification = candidates.filter(c => c.status !== 'Verified' && c.status !== 'Offline Verified').length;
        const totalIssuedLetters = candidates.filter(c => c.issuedLetter === true || c.issuedLetter === 'true').length;
        const postingAssigned = candidates.filter(c => c.postingDistrict && c.postingDistrict !== 'Unassigned' && c.postingDistrict !== 'Not Allotted' && c.postingDistrict !== '').length;

        stats = { totalCandidates: candidates.length, verified10th, verified12th, verifiedTech, verifiedDomicile, verifiedCaste, verifiedEWS, totalVerified, pendingVerification, totalIssuedLetters, postingAssigned };
    }
}

function getStatusClass(status) {
    if (!status) return 'status-pending';
    const s = status.toString().trim().toLowerCase();
    
    // Anything that is "Verified", "Offline Verified", or "N/A" should be green
    if (s === 'verified' || s === 'offline verified' || s === 'n/a') {
        return 'status-verified';
    }
    
    // If it contains "Verified" but isn't one of the above (e.g., "Partially Verified"?), still make it green
    if (s.includes('verified') && !s.includes('need to')) {
        return 'status-verified';
    }
    
    if (s.includes('need to') || s === 'pending') {
        return 'status-pending';
    }
    
    return 'status-pending';
}

// --- Dashboard Page ---
async function initDashboard() {
    showLoader();
    await fetchData();

    const statsContainer = document.getElementById('dashboard-stats');
    if (statsContainer) {
        // Recalculate postingAssigned locally to ensure accuracy
        const localPostingCount = candidates.filter(c => c.postingDistrict && c.postingDistrict !== 'Unassigned' && c.postingDistrict !== 'Not Allotted' && c.postingDistrict !== '').length;

        statsContainer.innerHTML = `
            ${renderStatCard('Total Candidates', stats.totalCandidates || 0, 'fa-users', 'icon-blue')}
            ${renderStatCard('10th Verified', stats.verified10th || 0, 'fa-award', 'icon-gold')}
            ${renderStatCard('12th Verified', stats.verified12th || 0, 'fa-award', 'icon-green')}
            ${renderStatCard('Tech Verified', stats.verifiedTech || 0, 'fa-microchip', 'icon-blue')}
            ${renderStatCard('Domicile Verified', stats.verifiedDomicile || 0, 'fa-home', 'icon-gold')}
            ${renderStatCard('Caste Verified', stats.verifiedCaste || 0, 'fa-id-card', 'icon-green')}
            ${renderStatCard('EWS Verified', stats.verifiedEWS || 0, 'fa-file-invoice', 'icon-blue')}
            ${renderStatCard('Total Verified', stats.totalVerified || 0, 'fa-check-double', 'icon-green')}
            ${renderStatCard('Pending Cases', stats.pendingVerification || 0, 'fa-clock', 'icon-red')}
            ${renderStatCard('Joining Letter Issued', stats.totalIssuedLetters || 0, 'fa-file-signature', 'icon-green')}
            ${renderStatCard('Posting District Assigned', localPostingCount, 'fa-map-location-dot', 'icon-blue')}
        `;
    }

    renderRecentCandidates();
    initCharts();
    hideLoader();
}

function renderRecentCandidates() {
    const tbody = document.getElementById('recent-candidates-tbody');
    if (!tbody) return;

    const sortedCandidates = [...candidates].reverse();
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const paginatedItems = sortedCandidates.slice(start, end);

    tbody.innerHTML = paginatedItems.map((c, index) => {
        const isAssigned = c.postingDistrict && c.postingDistrict !== 'Unassigned' && c.postingDistrict !== 'Not Allotted' && c.postingDistrict !== '';
        return `
            <tr>
                <td>${candidates.length - (start + index)}</td>
                <td>${c.id}</td>
                <td>${c.name}</td>
                <td>${c.district}</td>
                <td><span class="status-badge ${getStatusClass(c.status)}">${c.status || 'Pending'}</span></td>
                <td>${isAssigned ? c.postingDistrict : 'Unassigned'}</td>
            </tr>
        `;
    }).join('') || '<tr><td colspan="6" style="text-align:center">No candidates found</td></tr>';

    renderPaginationControls();
}

function renderPaginationControls() {
    const containers = [document.getElementById('table-pagination'), document.getElementById('table-pagination-top')];
    const totalPages = Math.ceil(candidates.length / pageSize);
    const html = generatePaginationHtml(currentPage, totalPages, 'changePage');
    containers.forEach(c => { if (c) c.innerHTML = html; });

    // Sync dropdowns
    const selects = [document.getElementById('pageSizeSelect'), document.getElementById('pageSizeSelectTop')];
    selects.forEach(s => { if (s) s.value = pageSize > 1000 ? 'all' : pageSize; });
}

function changePage(page) {
    currentPage = page;
    renderRecentCandidates();
}

function changePageSize(size) {
    pageSize = size === 'all' ? (candidates.length || 1000) : parseInt(size);
    currentPage = 1;
    renderRecentCandidates();
}

function renderStatCard(label, value, icon, iconClass) {
    return `
        <div class="stat-card">
            <div class="stat-info"><h4>${label}</h4><p>${value}</p></div>
            <div class="stat-icon ${iconClass}"><i class="fa-solid ${icon}"></i></div>
        </div>
    `;
}

function initCharts() {
    // Dynamic data for charts
    const verificationData = {
        verified: candidates.filter(c => c.status === 'Verified' || c.status === 'Offline Verified').length,
        pending: candidates.filter(c => c.status !== 'Verified' && c.status !== 'Offline Verified').length
    };

    const districtCounts = {};
    candidates.forEach(c => {
        districtCounts[c.district] = (districtCounts[c.district] || 0) + 1;
    });

    const topDistricts = Object.entries(districtCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);

    const ctxVer = document.getElementById('verificationChart');
    if (ctxVer) {
        new Chart(ctxVer.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Verified', 'Pending'],
                datasets: [{
                    label: 'Candidates Count',
                    data: [verificationData.verified, verificationData.pending],
                    backgroundColor: ['#27ae60', '#f1c40f']
                }]
            },
            options: { responsive: true, scales: { y: { beginAtZero: true } } }
        });
    }

    const ctxDist = document.getElementById('districtChart');
    if (ctxDist) {
        new Chart(ctxDist.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: topDistricts.map(d => d[0]),
                datasets: [{
                    data: topDistricts.map(d => d[1]),
                    backgroundColor: ['#002147', '#f1c40f', '#27ae60', '#e74c3c']
                }]
            }
        });
    }
}

// --- Candidate Entry Page ---
async function initRegistrationForm() {
    showLoader();
    await fetchData();
    const select = document.getElementById('district-select');
    if (select) {
        select.innerHTML = `<option value="">Select Home District</option>` + districts.map(d => `<option value="${d}">${d}</option>`).join('');
    }
    
    // Auto-generate Candidate ID
    const candIdInput = document.getElementById('candidateId');
    if (candIdInput) {
        candIdInput.value = `UPP-${Math.floor(Math.random() * 90000) + 10000}`;
    }
    
    hideLoader();
}

function validateMeritNo(value) {
    const errorElem = document.getElementById('meritError');
    const submitBtn = document.querySelector('#regForm button[type="submit"]');
    if (!value || !errorElem || !submitBtn) return;
    
    // Check if merit number exists in our candidates list
    const exists = candidates.some(c => c.meritNo === value);
    if (exists) {
        errorElem.style.display = 'block';
        submitBtn.disabled = true;
    } else {
        errorElem.style.display = 'none';
        submitBtn.disabled = false;
    }
}

async function handleRegistration(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const formMessage = document.getElementById('formMessage');
    showLoader();
    try {
        const res = await fetch(`${API_URL}/candidates`, { method: 'POST', body: formData });
        if (res.ok) {
            if (formMessage) {
                formMessage.textContent = 'Candidate Registered Successfully!';
                formMessage.style.backgroundColor = '#d4edda';
                formMessage.style.color = '#155724';
                formMessage.style.display = 'block';
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setTimeout(() => { window.location.href = 'dashboard.html'; }, 2000);
            } else {
                alert('Candidate Registered Successfully!');
                window.location.href = 'dashboard.html';
            }
        } else {
            throw new Error(`Server returned ${res.status}`);
        }
    } catch (err) {
        if (formMessage) {
            formMessage.textContent = 'Candidate Registered (Added to local storage).';
            formMessage.style.backgroundColor = '#d4edda';
            formMessage.style.color = '#155724';
            formMessage.style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            alert('API Error. Candidate added to local list for demo.');
        }
        const newCand = Object.fromEntries(formData);
        if (!newCand.id) {
            newCand.id = document.getElementById('candidateId') ? document.getElementById('candidateId').value : `UPP-${Math.floor(Math.random() * 90000) + 10000}`;
        }
        newCand.status = 'Pending';
        candidates.push(newCand);
        localStorage.setItem('mock_candidates', JSON.stringify(candidates));
        alert('Candidate Registered Successfully! (Saved Locally)');
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 500);
    }
    hideLoader();
}

async function handleBulkUpload(input) {
    if (!input.files || !input.files[0]) return;

    const file = input.files[0];
    showLoader();

    try {
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                // Parse Excel file
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {type: 'array'});
                const firstSheet = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheet];
                const json = XLSX.utils.sheet_to_json(worksheet);
                
                if (json.length === 0) {
                    alert('Excel file is empty!');
                    hideLoader();
                    return;
                }

                // Map Excel rows to candidate objects
                const newCandidates = json.map(row => ({
                    id: `UPP-${Math.floor(Math.random() * 90000) + 10000}`,
                    name: row['Name'] || row['Candidate Name'] || row['Candidate Full Name'] || 'Unknown',
                    fatherName: row['Father Name'] || row["Father's Name"] || 'Unknown',
                    mobile: row['Mobile'] || row['Mobile Number'] || 'N/A',
                    email: row['Email'] || row['Email ID'] || row['Email Address'] || 'N/A',
                    address: row['Address'] || row['Permanent Address'] || 'N/A',
                    district: row['District'] || row['Home District'] || 'Other',
                    status: 'Pending',
                    category: row['Category'] || row['Selected As'] || 'General',
                    cert10: '', cert12: '', certTech: '', postingDistrict: '', joiningDate: '', issuedLetter: false,
                    meritNo: (row['Merit No'] || row['Merit No.'] || Math.floor(Math.random() * 9000)).toString(),
                    rollNo: (row['Roll No'] || row['Roll Number'] || row['Roll No.'] || Math.floor(Math.random() * 900000)).toString(),
                    regNo: (row['Reg No'] || row['Registration No'] || row['Registration Number'] || Math.floor(Math.random() * 900000)).toString(),
                    verifyStatus10: 'Pending', verifyStatus12: 'Pending', verifyStatusTech: 'Pending', verifyStatusDomicile: 'Pending', verifyStatusCaste: 'Pending', verifyStatusEWS: 'Pending'
                }));

                // Try backend (optional, won't block local storage)
                const formData = new FormData();
                formData.append('file', file);
                try {
                    await fetch(`${API_URL}/candidates/bulk-upload`, { method: 'POST', body: formData });
                } catch(backendErr) {
                    console.log('Backend sync failed, storing locally only.');
                }
                
                // Save locally so dashboard updates instantly
                let localData = candidates;
                if (localStorage.getItem('mock_candidates')) {
                    localData = JSON.parse(localStorage.getItem('mock_candidates'));
                }
                localData.push(...newCandidates);
                candidates = localData;
                localStorage.setItem('mock_candidates', JSON.stringify(localData));
                
                alert(`Bulk upload successful! ${newCandidates.length} records added.`);
                window.location.href = 'dashboard.html';
            } catch(err) {
                console.error(err);
                alert('Failed to parse Excel file. Make sure it is a valid .xlsx format.');
                hideLoader();
            }
        };
        reader.readAsArrayBuffer(file);
    } catch (err) {
        console.error(err);
        alert('An error occurred during upload.');
        hideLoader();
    }
    input.value = ''; // Reset input
}

// --- Candidate Edit Page ---
async function initEditPage() {
    showLoader();
    await fetchData();
    renderEditTable(candidates);
    const select = document.getElementById('edit-district');
    if (select) select.innerHTML = districts.map(d => `<option value="${d}">${d}</option>`).join('');
    hideLoader();
}

function renderEditTable(data) {
    const tbody = document.getElementById('edit-candidates-tbody');
    if (!tbody) return;

    const sortedData = [...data].reverse();
    const start = (currentEditPage - 1) * editPageSize;
    const end = start + editPageSize;
    const paginatedItems = sortedData.slice(start, end);

    tbody.innerHTML = paginatedItems.map((c, index) => `
        <tr>
            <td>${data.length - (start + index)}</td>
            <td>${c.id}</td>
            <td>${c.rollNo || 'N/A'}</td>
            <td>${c.name}</td>
            <td>${c.district}</td>
            <td>
                <div class="actions">
                    <button class="action-btn btn-edit" onclick="openEditModal('${c.id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="action-btn btn-delete" onclick="handleDelete('${c.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="7" style="text-align:center">No records found</td></tr>';

    renderEditPaginationControls(data.length);
}

function renderEditPaginationControls(totalItems) {
    const containers = [document.getElementById('edit-table-pagination'), document.getElementById('edit-table-pagination-top')];
    const totalPages = Math.ceil(totalItems / editPageSize);
    const html = generatePaginationHtml(currentEditPage, totalPages, 'changeEditPage');
    containers.forEach(c => { if (c) c.innerHTML = html; });

    // Sync dropdowns
    const selects = [document.getElementById('editPageSizeSelect'), document.getElementById('editPageSizeSelectTop')];
    selects.forEach(s => { if (s) s.value = editPageSize > 100 ? 'all' : editPageSize; });
}

function changeEditPage(page) {
    currentEditPage = page;
    renderEditTable(candidates);
}

function changeEditPageSize(size) {
    editPageSize = size === 'all' ? (candidates.length || 1000) : parseInt(size);
    currentEditPage = 1;
    renderEditTable(candidates);
}

function openEditModal(id) {
    const cand = candidates.find(c => c.id === id);
    if (!cand) return;
    document.getElementById('edit-id').value = cand.id;
    if (document.getElementById('edit-merit')) document.getElementById('edit-merit').value = cand.meritNo || '';
    if (document.getElementById('edit-roll')) document.getElementById('edit-roll').value = cand.rollNo || '';
    if (document.getElementById('edit-reg')) document.getElementById('edit-reg').value = cand.regNo || '';
    if (document.getElementById('edit-selectedAs')) document.getElementById('edit-selectedAs').value = cand.selectedAs || 'UR';
    if (document.getElementById('edit-verifyStatus10')) document.getElementById('edit-verifyStatus10').value = cand.verifyStatus10 || 'Verified';
    if (document.getElementById('edit-verifyStatus12')) document.getElementById('edit-verifyStatus12').value = cand.verifyStatus12 || 'Verified';
    if (document.getElementById('edit-verifyStatusTech')) document.getElementById('edit-verifyStatusTech').value = cand.verifyStatusTech || 'Verified';
    if (document.getElementById('edit-verifyStatusDomicile')) document.getElementById('edit-verifyStatusDomicile').value = cand.verifyStatusDomicile || 'Verified';
    if (document.getElementById('edit-verifyStatusCaste')) document.getElementById('edit-verifyStatusCaste').value = cand.verifyStatusCaste || 'Verified';
    if (document.getElementById('edit-verifyStatusEWS')) document.getElementById('edit-verifyStatusEWS').value = cand.verifyStatusEWS || 'Verified';
    document.getElementById('edit-name').value = cand.name || cand.candidateName || '';
    document.getElementById('edit-father').value = cand.fatherName || cand.father_name || '';
    document.getElementById('edit-mobile').value = cand.mobile || cand.mobileNo || '';
    if (document.getElementById('edit-email')) document.getElementById('edit-email').value = cand.email || '';
    if (document.getElementById('edit-address')) document.getElementById('edit-address').value = cand.address || '';
    document.getElementById('edit-district').value = cand.district || cand.homeDistrict || '';
    document.getElementById('edit-modal').style.display = 'flex';
}

function closeEditModal() { document.getElementById('edit-modal').style.display = 'none'; }

async function handleUpdate(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    showLoader();
    try {
        const res = await fetch(`${API_URL}/candidates/${data.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            const resData = await res.json();
            if (!resData) throw new Error('API returned null/empty data');
            
            // Update local storage to keep it in sync on success
            const index = candidates.findIndex(c => c.id === data.id);
            if (index !== -1) {
                candidates[index] = { ...candidates[index], ...data };
                localStorage.setItem('mock_candidates', JSON.stringify(candidates));
            }
            
            alert('Updated Successfully!');
            location.reload();
        } else {
            throw new Error('API returned ' + res.status);
        }
    } catch (err) { 
        const index = candidates.findIndex(c => c.id === data.id);
        if (index !== -1) {
            candidates[index] = { ...candidates[index], ...data };
            localStorage.setItem('mock_candidates', JSON.stringify(candidates));
        }
        alert('Updated Locally!'); 
        location.reload(); 
    }
    hideLoader();
}

async function handleDelete(id) {
    let deleteId = (typeof id === 'string' && id.trim() !== '') ? id : null;
    if (!deleteId) {
        deleteId = document.getElementById('edit-id').value;
    }
    if (!deleteId) {
        alert('No Candidate ID found to delete.');
        return;
    }

    if (!confirm('Are you sure you want to delete this candidate?')) return;
    showLoader();
    try {
        const res = await fetch(`${API_URL}/candidates/${deleteId}`, { method: 'DELETE' });
        if (res.ok) {
            const resData = await res.json();
            if (!resData) throw new Error('API returned null/empty delete response');
            
            // Sync local storage on success
            candidates = candidates.filter(c => c.id !== deleteId);
            localStorage.setItem('mock_candidates', JSON.stringify(candidates));
            
            let deletedIds = [];
            if (localStorage.getItem('deleted_candidates')) {
                deletedIds = JSON.parse(localStorage.getItem('deleted_candidates'));
            }
            if (!deletedIds.includes(deleteId)) deletedIds.push(deleteId);
            localStorage.setItem('deleted_candidates', JSON.stringify(deletedIds));

            alert('Record Deleted Successfully!');
            location.reload();
        } else {
            throw new Error('API returned ' + res.status);
        }
    } catch (err) {
        console.error('Delete simulated locally:', err);
        candidates = candidates.filter(c => c.id !== deleteId);
        localStorage.setItem('mock_candidates', JSON.stringify(candidates));
        
        let deletedIds = [];
        if (localStorage.getItem('deleted_candidates')) {
            deletedIds = JSON.parse(localStorage.getItem('deleted_candidates'));
        }
        if (!deletedIds.includes(deleteId)) deletedIds.push(deleteId);
        localStorage.setItem('deleted_candidates', JSON.stringify(deletedIds));

        alert('Record Deleted Locally!');
        location.reload();
    }
    hideLoader();
}

function filterEditTable(val) {
    const term = val.toLowerCase();
    const filtered = candidates.filter(c => c.id.toLowerCase().includes(term) || c.name.toLowerCase().includes(term));
    renderEditTable(filtered);
}

// --- Verification Page ---
async function initVerificationPage() {
    showLoader();
    await fetchData();
    renderVerificationTable();
    hideLoader();
}

function renderVerificationTable(data = null) {
    const tbody = document.getElementById('verification-tbody');
    if (!tbody) return;

    const displayData = data || candidates;
    const sortedData = [...displayData].reverse();

    const start = (currentVerifyPage - 1) * verifyPageSize;
    const end = start + verifyPageSize;
    const paginatedItems = sortedData.slice(start, end);

    tbody.innerHTML = paginatedItems.map((c, index) => `
        <tr>
            <td>${displayData.length - (start + index)}</td>
            <td>${c.id}</td>
            <td>${c.rollNo || 'N/A'}</td>
            <td>${c.name}</td>
            <td><span class="status-badge ${getStatusClass(c.verifyStatus10)}">${c.verifyStatus10 || 'Pending'}</span></td>
            <td><span class="status-badge ${getStatusClass(c.verifyStatus12)}">${c.verifyStatus12 || 'Pending'}</span></td>
            <td><span class="status-badge ${getStatusClass(c.verifyStatusTech)}">${c.verifyStatusTech || 'Pending'}</span></td>
            <td><span class="status-badge ${getStatusClass(c.verifyStatusDomicile)}">${c.verifyStatusDomicile || 'Pending'}</span></td>
            <td><span class="status-badge ${getStatusClass(c.verifyStatusCaste)}">${c.verifyStatusCaste || 'Pending'}</span></td>
            <td><span class="status-badge ${getStatusClass(c.verifyStatusEWS)}">${c.verifyStatusEWS || 'Pending'}</span></td>
            <td>${c.verificationDate || 'Pending'}</td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="verifyCandidate('${c.id}')" ${(c.status === 'Verified' || c.status === 'Offline Verified') ? 'disabled' : ''}>
                    ${(c.status === 'Verified' || c.status === 'Offline Verified') ? 'Already Verified' : 'Verify Now'}
                </button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="12" style="text-align:center">No candidates for verification</td></tr>';

    renderVerifyPaginationControls(displayData.length);
}

function renderVerifyPaginationControls(totalItems) {
    const containers = [document.getElementById('verify-table-pagination'), document.getElementById('verify-table-pagination-top')];
    const totalPages = Math.ceil(totalItems / verifyPageSize);
    const html = generatePaginationHtml(currentVerifyPage, totalPages, 'changeVerifyPage');
    containers.forEach(c => { if (c) c.innerHTML = html; });

    // Sync dropdowns
    const selects = [document.getElementById('verifyPageSizeSelect'), document.getElementById('verifyPageSizeSelectTop')];
    selects.forEach(s => { if (s) s.value = verifyPageSize > 1000 ? 'all' : verifyPageSize; });
}

function filterVerificationTable(val) {
    const term = val.toLowerCase();
    const filtered = candidates.filter(c => 
        (c.id && c.id.toLowerCase().includes(term)) || 
        (c.name && c.name.toLowerCase().includes(term)) || 
        (c.rollNo && c.rollNo.toString().toLowerCase().includes(term))
    );
    currentVerifyPage = 1;
    renderVerificationTable(filtered);
}

function changeVerifyPage(page) {
    currentVerifyPage = page;
    renderVerificationTable();
}

function changeVerifyPageSize(size) {
    verifyPageSize = size === 'all' ? (candidates.length || 1) : parseInt(size);
    currentVerifyPage = 1;
    renderVerificationTable();
}

function isEligibleForVerification(c) {
    const validStatuses = ['verified', 'offline verified', 'n/a', 'na'];
    const getCleanStatus = (status) => {
        if (!status) return 'pending';
        return status.toString().trim().toLowerCase();
    };

    const s10 = getCleanStatus(c.verifyStatus10);
    const s12 = getCleanStatus(c.verifyStatus12);
    const sTech = getCleanStatus(c.verifyStatusTech);
    const sDom = getCleanStatus(c.verifyStatusDomicile);
    const sCaste = getCleanStatus(c.verifyStatusCaste);
    const sEWS = getCleanStatus(c.verifyStatusEWS);
    
    return validStatuses.includes(s10) &&
           validStatuses.includes(s12) &&
           validStatuses.includes(sTech) &&
           validStatuses.includes(sDom) &&
           validStatuses.includes(sCaste) &&
           validStatuses.includes(sEWS);
}

async function verifyCandidate(id) {
    const cand = candidates.find(c => c.id === id);
    if (!cand) return;

    if (!isEligibleForVerification(cand)) {
        alert('Verification Failed: All certificate columns (10th, 12th, Tech, Domicile, Caste, EWS) must be "Verified" or "N/A" before final verification.');
        return;
    }

    showLoader();
    try {
        const res = await fetch(`${API_URL}/candidates/${id}/verify`, { method: 'POST' });
        if (res.ok) {
            cand.status = 'Verified';
            cand.verificationDate = new Date().toLocaleDateString('en-GB');
            localStorage.setItem('mock_candidates', JSON.stringify(candidates));
            alert('Verified successfully!');
            location.reload();
        } else {
            throw new Error('API returned ' + res.status);
        }
    } catch (err) { 
        console.error('Verify simulated locally:', err);
        cand.status = 'Verified';
        cand.verificationDate = new Date().toLocaleDateString('en-GB');
        localStorage.setItem('mock_candidates', JSON.stringify(candidates));
        alert('Verification simulated and updated locally.'); 
        location.reload(); 
    }
    hideLoader();
}

// --- Allotment Page ---
async function initAllotmentPage() {
    showLoader();
    await fetchData();
    const select = document.getElementById('allot-district-select');
    if (select) select.innerHTML = districts.map(d => `<option value="${d}">${d}</option>`).join('');
    renderAllotmentTable();
    hideLoader();
}

function renderAllotmentTable() {
    const tbody = document.getElementById('allotment-tbody');
    if (!tbody) return;

    const eligibleCandidates = candidates.filter(c => c.issuedLetter === true || c.issuedLetter === 'true');
    const start = (currentAllotPage - 1) * allotPageSize;
    const end = start + allotPageSize;
    const paginatedItems = eligibleCandidates.slice(start, end);

    tbody.innerHTML = paginatedItems.map((c, index) => {
        const isAssigned = c.postingDistrict && c.postingDistrict !== 'Unassigned' && c.postingDistrict !== 'Not Allotted' && c.postingDistrict !== '';
        return `
            <tr>
                <td>${start + index + 1}</td>
                <td>${c.id}</td>
                <td>${c.rollNo || 'N/A'}</td>
                <td>${c.name}</td>
                <td>${c.district}</td>
                <td>${isAssigned ? c.postingDistrict : 'Not Allotted'}</td>
                <td><span class="status-badge ${isAssigned ? 'status-verified' : 'status-pending'}">${isAssigned ? 'Assigned' : 'Unassigned'}</span></td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="openAllotmentModal('${c.id}')">Assign District</button>
                </td>
            </tr>
        `;
    }).join('') || '<tr><td colspan="8" style="text-align:center">No data found</td></tr>';

    renderAllotPaginationControls(eligibleCandidates.length);
}

function renderAllotPaginationControls(totalItems) {
    const containers = [document.getElementById('allot-table-pagination'), document.getElementById('allot-table-pagination-top')];
    const totalPages = Math.ceil(totalItems / allotPageSize);
    const html = generatePaginationHtml(currentAllotPage, totalPages, 'changeAllotPage');
    containers.forEach(c => { if (c) c.innerHTML = html; });

    // Sync dropdowns
    const selects = [document.getElementById('allotPageSizeSelect'), document.getElementById('allotPageSizeSelectTop')];
    selects.forEach(s => { if (s) s.value = allotPageSize > 1000 ? 'all' : allotPageSize; });
}

function changeAllotPage(page) {
    currentAllotPage = page;
    renderAllotmentTable();
}

function changeAllotPageSize(size) {
    const eligibleCount = candidates.filter(c => c.issuedLetter === true || c.issuedLetter === 'true').length;
    allotPageSize = size === 'all' ? (eligibleCount || 1) : parseInt(size);
    currentAllotPage = 1;
    renderAllotmentTable();
}

const UP_DIVISIONS = {
    "Lucknow": ["Lucknow", "Unnao", "Rae Bareli", "Sitapur", "Hardoi", "Lakhimpur Kheri"],
    "Kanpur": ["Kanpur Nagar", "Kanpur Dehat", "Etawah", "Farrukhabad", "Kannauj", "Auraiya"],
    "Meerut": ["Meerut", "Ghaziabad", "Bulandshahr", "Gautam Buddha Nagar", "Baghpat", "Hapur"],
    "Varanasi": ["Varanasi", "Jaunpur", "Ghazipur", "Chandauli"],
    "Prayagraj": ["Prayagraj", "Fatehpur", "Pratapgarh", "Kaushambi"],
    "Agra": ["Agra", "Mathura", "Firozabad", "Mainpuri"],
    "Ayodhya": ["Ayodhya", "Amethi", "Barabanki", "Sultanpur", "Ambedkar Nagar"],
    "Gorakhpur": ["Gorakhpur", "Maharajganj", "Deoria", "Kushinagar"],
    "Bareilly": ["Bareilly", "Budaun", "Pilibhit", "Shahjahanpur"],
    "Moradabad": ["Moradabad", "Bijnor", "Rampur", "Amroha", "Sambhal"],
    "Saharanpur": ["Saharanpur", "Muzaffarnagar", "Shamli"],
    "Aligarh": ["Aligarh", "Etah", "Hathras", "Kasganj"],
    "Jhansi": ["Jhansi", "Lalitpur", "Jalaun"],
    "Chitrakoot": ["Chitrakoot", "Banda", "Hamirpur", "Mahoba"],
    "Mirzapur": ["Mirzapur", "Sonbhadra", "Bhadohi"],
    "Azamgarh": ["Azamgarh", "Mau", "Ballia"],
    "Basti": ["Basti", "Siddharthnagar", "Sant Kabir Nagar"],
    "Devipatan": ["Gonda", "Bahraich", "Shravasti", "Balrampur"]
};

// Map Divisions to nearby/logical posting divisions (Excluding own)
const DIVISION_POSTING_MAP = {
    "Lucknow": ["Ayodhya", "Kanpur", "Prayagraj"],
    "Kanpur": ["Lucknow", "Jhansi", "Agra"],
    "Ayodhya": ["Lucknow", "Gorakhpur", "Basti"],
    "Meerut": ["Saharanpur", "Moradabad", "Aligarh"],
    "Varanasi": ["Prayagraj", "Mirzapur", "Azamgarh"]
    // ... Fallback logic will handle others
};

function openAllotmentModal(id) {
    const c = candidates.find(cand => cand.id === id);
    if (!c) return;

    document.getElementById('allot-id').value = id;
    const select = document.getElementById('allot-district-select');
    const homeDist = c.district;

    // 1. Find which division the Home District belongs to
    let homeDiv = null;
    for (const [div, dList] of Object.entries(UP_DIVISIONS)) {
        if (dList.includes(homeDist)) { homeDiv = div; break; }
    }

    // 2. Exclude all districts in the Home Division (Neighbors/Self)
    const homeDivDistricts = homeDiv ? UP_DIVISIONS[homeDiv] : [homeDist];

    // 3. Find Suggested Posting Divisions
    const targetDivs = DIVISION_POSTING_MAP[homeDiv] || Object.keys(UP_DIVISIONS).filter(d => d !== homeDiv);

    // 4. Collect candidates from target divisions
    let suggested = [];
    targetDivs.forEach(div => {
        if (UP_DIVISIONS[div]) suggested.push(...UP_DIVISIONS[div]);
    });

    // 5. Final Filtering (Ensure no home division districts)
    let availableDistricts = suggested.filter(d => !homeDivDistricts.includes(d));

    // Display restricted districts message
    const infoBox = document.getElementById('restricted-districts-info');
    if (infoBox) {
        const restrictedList = homeDivDistricts.join(', ');
        infoBox.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color: #ff4d4d; margin-right: 8px;"></i> <strong>Note:</strong> Candidate का Home District <strong>${homeDist}</strong> है। इसके मंडल के जिले <strong>(${restrictedList})</strong> प्रतिबंधित हैं, यहाँ पोस्टिंग नहीं की जा सकती।`;
        infoBox.style.display = 'block';
    }

    // 6. If too many, pick first few or random
    if (availableDistricts.length > 5) {
        availableDistricts = availableDistricts.sort(() => 0.5 - Math.random()).slice(0, 5);
    }

    // 7. Fallback if something goes wrong
    if (availableDistricts.length === 0) {
        availableDistricts = districts.filter(d => !homeDivDistricts.includes(d)).slice(0, 5);
    }

    select.innerHTML = availableDistricts.map(d => `<option value="${d}">${d}</option>`).join('');
    document.getElementById('allotment-modal').style.display = 'flex';
}
function closeAllotmentModal() { document.getElementById('allotment-modal').style.display = 'none'; }

async function handleAllotmentSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    // Find candidate and update locally
    const cand = candidates.find(c => c.id === data.id);
    if (cand) {
        cand.postingDistrict = data.district;
        cand.joiningDate = data.joiningDate;
        cand.orderNo = data.orderNo;
        cand.allotmentDate = new Date().toLocaleDateString('en-GB');
        localStorage.setItem('mock_candidates', JSON.stringify(candidates));
    }

    showLoader();
    try {
        const res = await fetch(`${API_URL}/candidates/${data.id}/allot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            alert('Allotment Saved!');
            location.reload();
        } else {
            throw new Error('API returned ' + res.status);
        }
    } catch (err) { 
        console.error('Allotment simulated locally:', err);
        alert('Allotment Saved (Simulated)!'); 
        location.reload(); 
    }
    hideLoader();
}

// --- Joining Letter Page ---
async function initJoiningLetterPage() {
    showLoader();
    await fetchData();
    renderJoiningLetterTable();
    hideLoader();
}

function renderJoiningLetterTable() {
    const tbody = document.getElementById('joining-tbody');
    if (!tbody) return;

    const verifiedOnes = candidates.filter(c => c.status === 'Verified' || c.status === 'Offline Verified');
    const start = (currentLetterPage - 1) * letterPageSize;
    const end = start + letterPageSize;
    const paginatedItems = verifiedOnes.slice(start, end);

    tbody.innerHTML = paginatedItems.map((c, index) => `
        <tr>
            <td>${start + index + 1}</td>
            <td>${c.id}</td>
            <td>${c.rollNo || 'N/A'}</td>
            <td>${c.name}</td>
            <td><span class="status-badge status-verified">Verified</span></td>
            <td>${c.district || 'N/A'}</td>
            <td>
                <button class="btn btn-download" onclick="openLetterPreview('${c.id}')">
                    <i class="fa-solid fa-file-signature"></i> Issue Joining Letter
                </button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="7" style="text-align:center">No verified candidates found. Please verify certificates first.</td></tr>';

    renderLetterPaginationControls(verifiedOnes.length);
}

function renderLetterPaginationControls(totalItems) {
    const containers = [document.getElementById('letter-table-pagination'), document.getElementById('letter-table-pagination-top')];
    const totalPages = Math.ceil(totalItems / letterPageSize);
    const html = generatePaginationHtml(currentLetterPage, totalPages, 'changeLetterPage');
    containers.forEach(c => { if (c) c.innerHTML = html; });

    // Sync dropdowns
    const selects = [document.getElementById('letterPageSizeSelect'), document.getElementById('letterPageSizeSelectTop')];
    selects.forEach(s => { if (s) s.value = letterPageSize > 1000 ? 'all' : letterPageSize; });
}

function changeLetterPage(page) {
    currentLetterPage = page;
    renderJoiningLetterTable();
}

function changeLetterPageSize(size) {
    const verifiedOnesCount = candidates.filter(c => c.status === 'Verified' || c.status === 'Offline Verified').length;
    letterPageSize = size === 'all' ? (verifiedOnesCount || 1) : parseInt(size);
    currentLetterPage = 1;
    renderJoiningLetterTable();
}

function openLetterPreview(id) {
    currentPreviewId = id;
    const c = candidates.find(cand => cand.id === id);
    if (!c) return;

    // Populate placeholders
    document.getElementById('l-roll').innerText = c.rollNo || 'N/A';
    document.getElementById('l-roll2').innerText = c.rollNo || 'N/A';
    document.getElementById('l-name').innerText = c.name || 'N/A';
    document.getElementById('l-name2').innerText = c.name || 'N/A';
    document.getElementById('l-name3').innerText = c.name || 'N/A';
    document.getElementById('l-father').innerText = c.fatherName || 'N/A';
    document.getElementById('l-father2').innerText = c.fatherName || 'N/A';
    document.getElementById('l-address').innerText = c.address || 'N/A';
    document.getElementById('l-address2').innerText = c.address || 'N/A';
    document.getElementById('l-district').innerText = c.district || 'N/A';

    const today = new Date().toLocaleDateString('en-GB');
    document.getElementById('l-date').innerText = today;
    document.getElementById('l-date2').innerText = today;

    document.getElementById('letter-modal').style.display = 'flex';
}

function closeLetterModal() {
    document.getElementById('letter-modal').style.display = 'none';
}

async function printLetterContent() {
    if (!currentPreviewId) return;

    const printContents = document.getElementById('printable-letter').innerHTML;

    // Mark as issued in DB and local storage
    const cand = candidates.find(c => c.id === currentPreviewId);
    if (cand) {
        cand.issuedLetter = true;
        localStorage.setItem('mock_candidates', JSON.stringify(candidates));
    }

    try {
        await fetch(`${API_URL}/candidates/${currentPreviewId}/issue-letter`, { method: 'POST' });
    } catch (err) { 
        console.error('Error marking as issued:', err); 
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Joining Letter - UP Police</title>
                <style>
                    body { font-family: 'Outfit', 'Inter', sans-serif; padding: 40px; line-height: 1.6; color: #000; font-size: 14px; }
                    h2, h3 { text-align: center; margin-bottom: 10px; }
                    p { text-align: justify; margin-bottom: 15px; }
                    .header-section { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                    @media print {
                        body { padding: 0; }
                        @page { margin: 2cm; }
                    }
                </style>
            </head>
            <body onload="window.print(); window.close();">
                ${printContents}
            </body>
        </html>
    `);
    printWindow.document.close();
}

// Logout Handler
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.querySelector('.logout-btn a');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('isLoggedIn');
            window.location.href = 'login.html';
        });
    }
});
