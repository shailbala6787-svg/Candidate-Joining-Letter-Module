const fs = require('fs');
const files = [
    'candidate-edit.html',
    'candidate-entry.html',
    'certificate-details.html',
    'dashboard.html',
    'joining-letter.html',
    'posting-allotment.html',
    'report.html'
];
for(const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(
        '<li><a href="posting-allotment.html"><i class="fa-solid fa-map-location-dot"></i><span>Posting Allotment</span></a></li>',
        '<li><a href="posting-allotment.html"><i class="fa-solid fa-map-location-dot"></i><span>Posting Allotment</span></a></li>\n            <li><a href="district-capacity.html"><i class="fa-solid fa-building"></i><span>District Capacities</span></a></li>'
    );
    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
}
