const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const html = fs.readFileSync('candidate-edit.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost' });
const window = dom.window;
const document = window.document;

const scriptSrc = fs.readFileSync('js/script.js', 'utf8');
const scriptEl = document.createElement('script');
scriptEl.textContent = scriptSrc;
document.body.appendChild(scriptEl);

setTimeout(() => {
    window.candidates = [{
        id: 'UPP-1001', name: 'Amit Sharma', fatherName: 'Rajesh Sharma', mobile: '9876543210', district: 'Lucknow', 
        status: 'Pending', meritNo: '1001', rollNo: '123456', regNo: '987654', verifyStatus10: 'Pending',
        email: 'amit@test.com', address: 'Lucknow Address'
    }];
    
    window.fetch = async () => ({ ok: false, status: 500, json: async () => ({error: "test"}) });
    window.alert = () => {};
    
    window.openEditModal("UPP-1001");
    
    document.getElementById('edit-name').value = 'Amit Updated';
    
    const form = document.getElementById('editForm');
    
    // Check FormData directly
    const formData = new window.FormData(form);
    const data = Object.fromEntries(formData);
    console.log("Extracted FormData:", data);
    
    const event = new window.Event('submit', { cancelable: true });
    // Override reload to prevent breaking execution
    window.location.reload = () => console.log("Reload called");
    
    window.handleUpdate({
        preventDefault: () => {},
        target: form
    }).then(() => {
        console.log("Candidates after update:", window.candidates);
        console.log("Mock Candidates in Storage:", JSON.parse(window.localStorage.getItem('mock_candidates')));
    });

}, 500);
