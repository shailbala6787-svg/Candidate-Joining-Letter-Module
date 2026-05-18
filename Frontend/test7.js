const puppeteer = require('puppeteer');

(async () => {
    console.log("Starting Puppeteer...");
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    // Log all page console events
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.error('PAGE ERROR:', err.toString()));
    
    // Handle alerts automatically
    page.on('dialog', async dialog => {
        console.log("DIALOG:", dialog.type(), dialog.message());
        await dialog.accept();
    });

    try {
        console.log("Navigating to local site...");
        // First go to a page to set local storage
        await page.goto('http://localhost:8000/login.html');
        await page.evaluate(() => {
            localStorage.setItem('isLoggedIn', 'true');
            // Seed a mock candidate
            localStorage.setItem('mock_candidates', JSON.stringify([{
                id: 'UPP-9999', name: 'Puppeteer Test', fatherName: 'Test Father', mobile: '1122334455', district: 'Agra', 
                status: 'Pending', meritNo: '9999', rollNo: '999999', regNo: '999999', verifyStatus10: 'Pending'
            }]));
            // Ensure no deleted candidates blocking it
            localStorage.removeItem('deleted_candidates');
        });

        console.log("Going to candidate-edit.html...");
        await page.goto('http://localhost:8000/candidate-edit.html');
        await page.waitForSelector('.action-btn.btn-edit', { timeout: 5000 });
        
        console.log("Clicking Edit button on first candidate...");
        await page.click('.action-btn.btn-edit');

        // Check if modal is visible
        const modalDisplay = await page.$eval('#edit-modal', el => window.getComputedStyle(el).display);
        console.log("Modal display:", modalDisplay);
        
        const nameVal = await page.$eval('#edit-name', el => el.value);
        console.log("Edit Name value is:", nameVal);

        console.log("Updating name...");
        await page.type('#edit-name', ' Updated');
        
        console.log("Clicking Update button...");
        await page.click('button[type="submit"].btn-primary');
        
        // Wait a bit for reload
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 }).catch(() => {});
        
        console.log("Checking if name was updated in table...");
        const newName = await page.$eval('#edit-candidates-tbody tr td:nth-child(4)', el => el.textContent);
        console.log("Table Name is:", newName);
        
        console.log("Clicking Delete button in table...");
        await page.click('.action-btn.btn-delete');
        
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 }).catch(() => {});
        
        const tbodyHtml = await page.$eval('#edit-candidates-tbody', el => el.innerHTML);
        console.log("Table body after delete:", tbodyHtml.includes('No records found') ? 'Empty' : 'Not Empty');

    } catch (e) {
        console.error("TEST FAILED:", e);
    } finally {
        await browser.close();
    }
})();
