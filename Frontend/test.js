const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('candidate-edit.html', 'utf8');
const scriptSrc = fs.readFileSync('js/script.js', 'utf8');

const dom = new JSDOM(html, {
    url: "http://localhost/candidate-edit.html",
    runScripts: "dangerously",
    resources: "usable"
});

const window = dom.window;
const document = window.document;

// Mock fetch
window.fetch = async (url) => {
    return { ok: false, status: 500, json: async () => ({error: "test"}) };
};

// Insert script manually
const scriptEl = document.createElement('script');
scriptEl.textContent = scriptSrc;
document.body.appendChild(scriptEl);

setTimeout(() => {
    try {
        console.log("Mock data setup...");
        window.candidates = [{
            id: 'UPP-1001', name: 'Amit Sharma', fatherName: 'Rajesh Sharma', mobile: '9876543210', district: 'Lucknow', 
            status: 'Pending', meritNo: '1001', rollNo: '123456', regNo: '987654', verifyStatus10: 'Pending'
        }];
        
        console.log("Opening edit modal for UPP-1001");
        window.openEditModal('UPP-1001');
        console.log("Modal display:", document.getElementById('edit-modal').style.display);
        console.log("Name in modal:", document.getElementById('edit-name').value);
        console.log("VerifyStatus10:", document.getElementById('edit-verifyStatus10').value);

        console.log("Testing handle delete...");
        window.handleDelete('UPP-1001').then(() => {
            console.log("Handle delete completed. Candidates:", window.candidates);
        }).catch(e => console.error("handleDelete error:", e));
        
    } catch(err) {
        console.error("Test Error:", err);
    }
}, 1000);
