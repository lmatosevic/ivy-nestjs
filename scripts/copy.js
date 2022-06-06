const fs = require('fs');

// Copy package.json to dist
let resizable = fs.readFileSync('package.json').toString();
fs.writeFileSync('dist/package.json', resizable);

// Copy README.md to dist
resizable = fs.readFileSync('README.md').toString();
fs.writeFileSync('dist/README.md', resizable);

// Copy CHANGELOG.md to dist
resizable = fs.readFileSync('CHANGELOG.md').toString();
fs.writeFileSync('dist/CHANGELOG.md', resizable);

// Copy LICENSE to dist
resizable = fs.readFileSync('LICENSE').toString();
fs.writeFileSync('dist/LICENSE', resizable);
