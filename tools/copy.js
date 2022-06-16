const path = require('path');
const fs = require('fs');

// Create ./dist directory if it does not exist
if (!fs.existsSync('./dist')) {
  fs.mkdirSync('./dist');
}

// Copy ./cli directory recursively to dist
copyRecursiveSync('./cli', './dist/cli');

// Copy package.json to dist
let file = fs.readFileSync('package.json').toString();
fs.writeFileSync('./dist/package.json', file);

// Copy README.md to dist
file = fs.readFileSync('README.md').toString();
fs.writeFileSync('./dist/README.md', file);

// Copy LICENSE to dist
file = fs.readFileSync('LICENSE').toString();
fs.writeFileSync('./dist/LICENSE', file);

// Copy .npmignore to dist
file = fs.readFileSync('.npmignore').toString();
fs.writeFileSync('./dist/.npmignore', file);

function copyRecursiveSync(src, dest) {
  let exists = fs.existsSync(src);
  let stats = exists && fs.statSync(src);
  let isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    fs.mkdirSync(dest);
    fs.readdirSync(src).forEach(function (childItemName) {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}
