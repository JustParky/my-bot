const fs = require('fs');
const path = require('path');

const filesToCheck = [
  path.join(__dirname, 'index.js'),
  ...fs.readdirSync(path.join(__dirname, 'commands'))
    .filter(file => file.endsWith('.js'))
    .map(file => path.join(__dirname, 'commands', file)),
];

filesToCheck.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf-8');
  if (content.includes('ephemeral: true')) {
    content = content.replace(/ephemeral: true/g, 'flags: 64');
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${filePath}: Replaced 'ephemeral: true' with 'flags: 64'`);
  } else {
    console.log(`No changes needed in ${filePath}`);
  }
});

console.log('Finished updating files for ephemeral warning.');