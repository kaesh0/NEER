const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'pages', 'fisherman');
fs.readdirSync(dir).forEach(f => {
  if(f.endsWith('.jsx')){
    const p = path.join(dir, f);
    let content = fs.readFileSync(p, 'utf8');
    content = content.replace(/from '\.\.\//g, 'from \'../../');
    content = content.replace(/from "\.\.\//g, 'from "../../');
    fs.writeFileSync(p, content);
  }
});
console.log('Fixed imports in', dir);
