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
    console.log("Modal display:", document.getElementById('edit-modal').style.display);
    
    // Simulate empty arguments like onclick="handleDelete()"
    window.confirm = () => true;
    window.handleDelete().then(() => {
        console.log("After delete, candidates count:", window.candidates.length);
    });
} catch (e) { 
    console.log("CATCH ERROR:", e.message, e.stack); 
}`;
document.body.appendChild(scriptEl);
