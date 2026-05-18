const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const html = fs.readFileSync('candidate-edit.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost' });
const window = dom.window;
const document = window.document;

const scriptSrc = fs.readFileSync('js/script.js', 'utf8');
const scriptEl = document.createElement('script');
scriptEl.textContent = scriptSrc + `
window.candidates = [{id: "UPP-1001", name: "test", fatherName: "father"}]; 
try { 
    window.openEditModal("UPP-1001"); 
    
    // Override fetch to fail
    window.fetch = async () => ({ ok: false, status: 500 });

    window.alert = console.log;
    window.confirm = () => true;
    
    // Capture what deleteId is found inside handleDelete
    const originalHandleDelete = window.handleDelete;
    window.handleDelete = async function(id) {
        console.log("Calling handleDelete with:", typeof id, id);
        console.log("edit-id value before delete:", document.getElementById('edit-id').value);
        await originalHandleDelete(id);
        console.log("Candidates after delete:", window.candidates.length);
    };

    window.handleDelete();
} catch (e) { 
    console.log("CATCH ERROR:", e.message, e.stack); 
}`;
document.body.appendChild(scriptEl);
