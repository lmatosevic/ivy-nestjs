const fs = require('fs');

// Copy package.json to dist
let file = fs.readFileSync('package.json').toString();
fs.writeFileSync('dist/package.json', file);

// Copy README.md to dist
file = fs.readFileSync('README.md').toString();
fs.writeFileSync('dist/README.md', file);

// Copy LICENSE to dist
file = fs.readFileSync('LICENSE').toString();
fs.writeFileSync('dist/LICENSE', file);

// Copy .npmignore to dist
file = fs.readFileSync('.npmignore').toString();
fs.writeFileSync('dist/.npmignore', file);
