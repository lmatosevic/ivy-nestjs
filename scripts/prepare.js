const fs = require('fs');

const packageJson = JSON.parse(fs.readFileSync('./dist/package.json').toString());

// Delete non-production properties
delete packageJson.scripts;
delete packageJson.devDependencies;
delete packageJson.jest;
delete packageJson['standard-version'];

// Change default index files
packageJson.main = './index.js';
packageJson.types = './index.d.ts';

fs.writeFileSync('./dist/package.json', JSON.stringify(packageJson, null, 2));
