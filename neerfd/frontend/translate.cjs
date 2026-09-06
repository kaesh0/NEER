const fs = require('fs');
const path = require('path');

const dictionary = [
  'Overview', 'Map', 'Route', 'Zones', 'Areas', 'Alerts', 'Ask NEER', 'Profile',
  'Settings', 'Language', 'English', 'Search', 'Back', 'Close', 'Continue',
  'Cancel', 'Save', 'Apply', 'Reset', 'Refresh', 'View Details', 'Select',
  'Check this location', 'Return to my location', 'Available', 'Unavailable',
  'Live', 'Cached', 'Fallback', 'No data available', 'No results', 'Error',
  'Retry', 'Try again', 'Fishing Conditions', 'Marine Conditions', 'Wave Height',
  'Wave Period', 'Wind Speed', 'Wind Direction', 'Swell Height', 'Swell Period',
  'Fishing Zones', 'PFZ', 'Potential Fishing Zone', 'Potential Fishing Zones',
  'Recommended Zone', 'Distance', 'Conditions', 'Recommendation', 'Recommended Actions',
  'Hazards', 'Advisory', 'Official Advisory', 'Caution', 'Favourable', 'Unfavourable',
  'Data Availability', 'Explainability', 'Provenance', 'Caveat', 'Tomorrow Morning',
  'Small Fishing Boat', 'Marine Overview', 'Route Assessment', 'Route Status',
  'Route Segments', 'Departure', 'Recommended Departure', 'Vessel', 'Vessel Type',
  'Beam', 'Length', 'Transit', 'Segment', 'Wave', 'Wind', 'Swell', 'Hazard',
  'Review', 'Official Advisories', 'Regional Overview', 'Regional Risk Assessment',
  'Regional Risk', 'Area Priority', 'High Priority', 'Medium Priority', 'Low Priority',
  'Warning', 'Draft Warning', 'Target Areas', 'Target Audience', 'Main Finding',
  'Authority Review', 'Selected Location', 'Coordinates', 'Latitude', 'Longitude',
  'Selected area', 'Risk', 'Location unavailable', 'Marine intelligence unavailable',
  'Active Alerts', 'Alert Details', 'Severity', 'High', 'Watch', 'Message',
  'Valid From', 'Valid Until', 'Source', 'Review official advisories', 'Recommended Action',
  'Ask a question', 'Type your question', 'Send', 'Speak', 'Listening', 'Stop listening',
  'Suggested questions', 'Clear', 'Change Profile', 'Change Role', 'Marine',
  'Guest', 'Workspace', 'Switch Workspace', 'Continue as Guest', 'Login', 'Register',
  'Something went wrong', 'Unable to load', 'No marine intelligence available',
  'No alerts available', 'No zones available', 'No areas available', 'No route data available',
  'Home'
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  let modified = false;

  dictionary.forEach(term => {
    // Escape regex chars safely
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Replace >Term<
    const regexTag = new RegExp('>(\\s*)(' + escapedTerm + ')(\\s*)<', 'g');
    if (regexTag.test(content)) {
      content = content.replace(regexTag, '>$1{t(\'$2\')}$3<');
      modified = true;
    }

    // Replace title="Term", placeholder="Term", etc
    const regexAttr = new RegExp('(\\b(?:title|placeholder|label|aria-label|subtitle|text|badge|status))="' + escapedTerm + '"', 'g');
    if (regexAttr.test(content)) {
      content = content.replace(regexAttr, '$1={t(\'' + term + '\')}');
      modified = true;
    }
  });

  if (modified) {
    if (!content.includes('useTranslation')) {
      const importRegex = /import .* from '.*';?\n/g;
      let lastMatch;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        lastMatch = match;
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
      
      const funcRegex = /export (?:default )?function [A-Za-z0-9_]+\([^)]*\)\s*\{/g;
      const funcMatch = funcRegex.exec(content);
      if (funcMatch) {
         content = content.slice(0, funcMatch.index + funcMatch[0].length) + "\n  const { t } = useTranslation()\n" + content.slice(funcMatch.index + funcMatch[0].length);
      }
    }
    
    fs.writeFileSync(filePath, content);
    console.log('Modified', filePath);
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
