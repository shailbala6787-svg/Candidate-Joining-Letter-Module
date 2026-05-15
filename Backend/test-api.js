const axios = require('axios');

async function test() {
    try {
        console.log('Fetching candidates...');
        const res = await axios.get('http://localhost:5000/api/candidates');
        const candidates = res.data;
        console.log('Total candidates:', candidates.length);

        if (candidates.length > 0) {
            const first = candidates[0];
            console.log('Attempting to delete candidate:', first.id);
            const delRes = await axios.delete(`http://localhost:5000/api/candidates/${first.id}`);
            console.log('Delete response:', delRes.data);

            const resAfter = await axios.get('http://localhost:5000/api/candidates');
            console.log('Total candidates after delete:', resAfter.data.length);
            
            if (resAfter.data.length === candidates.length - 1) {
                console.log('SUCCESS: Candidate deleted properly.');
            } else {
                console.log('FAILURE: Candidate count did not decrease correctly.');
            }
        }

        console.log('Testing Excel download...');
        const excelRes = await axios.get('http://localhost:5000/api/candidates/sample-excel', { responseType: 'arraybuffer' });
        console.log('Excel download status:', excelRes.status);
        console.log('Excel data size:', excelRes.data.byteLength);

    } catch (err) {
        console.error('Test failed:', err.message);
        if (err.response) console.error('Response error:', err.response.data);
    }
}

test();
