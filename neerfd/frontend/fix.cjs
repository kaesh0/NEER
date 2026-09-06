const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // We are looking for functional components that use t( but don't have const { t }
  // A simple way is to match function bodies:
  // \bfunction\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{
  const funcRegex = /\bfunction\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{/g;
  
  let match;
  const matches = [];
  while ((match = funcRegex.exec(content)) !== null) {
     matches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[0]
     });
  }

  // Reverse iterate to avoid index shifting
  let modified = false;
  for (let i = matches.length - 1; i >= 0; i--) {
     const m = matches[i];
     // Find the end of this function body (approximate: up to the next function or end of file)
     const nextM = matches[i + 1];
     const endIndex = nextM ? nextM.start : content.length;
     const body = content.slice(m.end, endIndex);
     
     if (body.includes('t(') && !body.includes('const { t } = useTranslation()')) {
        content = content.slice(0, m.end) + "\n  const { t } = useTranslation()\n" + content.slice(m.end);
        modified = true;
     }
  }
  
  // also handle arrow functions: const Name = ({...}) => {
  const arrowRegex = /const\s+[A-Za-z0-9_]+\s*=\s*(?:\([^)]*\)|[A-Za-z0-9_]+)\s*=>\s*\{/g;
  let arrowMatch;
  const arrowMatches = [];
  while ((arrowMatch = arrowRegex.exec(content)) !== null) {
     arrowMatches.push({
        start: arrowMatch.index,
        end: arrowMatch.index + arrowMatch[0].length,
        text: arrowMatch[0]
     });
  }

  for (let i = arrowMatches.length - 1; i >= 0; i--) {
     const m = arrowMatches[i];
     const nextM = arrowMatches[i + 1];
     const endIndex = nextM ? nextM.start : content.length;
     const body = content.slice(m.end, endIndex);
     
     if (body.includes('t(') && !body.includes('const { t } = useTranslation()')) {
        content = content.slice(0, m.end) + "\n  const { t } = useTranslation()\n" + content.slice(m.end);
        modified = true;
     }
  }

  // make sure import is there
  if (modified && !content.includes('import { useTranslation }')) {
      const importRegex = /import .* from '.*';?\n/g;
      let lastMatch;
      let imatch;
      while ((imatch = importRegex.exec(content)) !== null) {
        lastMatch = imatch;
      }
      
      let importStr = "import { useTranslation } from '";
      const parts = filePath.split(/[\\/]/);
      if (parts.includes('pages') && parts.length === parts.indexOf('pages') + 2) {
         importStr += "../i18n/translations.js';\n";
      } else if (parts.includes('pages') || parts.includes('components')) {
         importStr += "../../i18n/translations.js';\n";
      } else {
         importStr += "./i18n/translations.js';\n";
      }
      
      if (lastMatch) {
        content = content.slice(0, lastMatch.index + lastMatch[0].length) + importStr + content.slice(lastMatch.index + lastMatch[0].length);
      } else {
        content = importStr + content;
      }
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log('Fixed', filePath);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      processFile(fullPath);
    }
  }
}
walkDir('e:/NEER/src');
