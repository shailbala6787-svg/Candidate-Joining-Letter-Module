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
    try {
        console.log("Mock data setup...");
        window.candidates = [{
            id: 'UPP-1001', name: 'Amit Sharma', fatherName: 'Rajesh Sharma', mobile: '9876543210', district: 'Lucknow', 
            status: 'Pending', meritNo: '1001', rollNo: '123456', regNo: '987654', verifyStatus10: 'Pending',
            email: 'amit@test.com', address: 'Lucknow Address'
        }];
        
        // Mock fetch
        window.fetch = async () => ({ ok: false, status: 500, json: async () => ({error: "test"}) });
        window.alert = console.log;
        window.confirm = () => true;

        console.log("1. Testing openEditModal");
        window.openEditModal("UPP-1001");
        console.log("Modal display:", document.getElementById('edit-modal').style.display);
        console.log("Email value:", document.getElementById('edit-email').value);
        console.log("Address value:", document.getElementById('edit-address').value);

        console.log("2. Testing handleUpdate");
        document.getElementById('edit-name').value = 'Amit Updated';
        
        // Create submit event
        const form = document.getElementById('editForm');
        const event = new window.Event('submit', { cancelable: true });
        form.dispatchEvent(event);
        window.handleUpdate(event).then(() => {
            console.log("Updated candidate:", window.candidates[0].name);

            console.log("3. Testing handleDelete");
            window.handleDelete("UPP-1001").then(() => {
                console.log("Candidates after delete:", window.candidates.length);
                const deletedIds = JSON.parse(window.localStorage.getItem('deleted_candidates'));
                console.log("Deleted IDs in localStorage:", deletedIds);
            });
        }).catch(e => console.error("Update Error:", e));

    } catch (e) {
        console.error("Test execution error:", e.message, e.stack);
    }
}, 500);
