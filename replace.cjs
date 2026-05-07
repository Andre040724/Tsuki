const fs = require('fs');
const path = require('path');

const files = [
  'src/types.ts',
  'src/data/phaseInsights.ts',
  'src/hooks/useCycleData.ts',
  'src/services/aiWellnessService.ts',
  'src/App.tsx',
  'src/components/AIInsightCard.tsx',
  'src/components/Onboarding.tsx',
  'src/components/AuthProvider.tsx',
  'firestore.rules'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace modes
    content = content.replace(/'boyfriend'/g, "'hubby'");
    content = content.replace(/"boyfriend"/g, '"hubby"');
    content = content.replace(/=== 'boyfriend'/g, "=== 'hubby'");
    content = content.replace(/boyfriend:/g, "hubby:");
    
    content = content.replace(/'girlfriend'/g, "'wifey'");
    content = content.replace(/"girlfriend"/g, '"wifey"');
    content = content.replace(/=== 'girlfriend'/g, "=== 'wifey'");
    content = content.replace(/girlfriend:/g, "wifey:");

    // Capitalized strings
    content = content.replace(/'Boyfriend'/g, "'Hubby'");
    content = content.replace(/"Boyfriend"/g, '"Hubby"');
    content = content.replace(/Girlfriend/g, 'Wifey');
    content = content.replace(/Boyfriend/g, 'Hubby');
    content = content.replace(/boyfriend/g, "hubby");
    content = content.replace(/girlfriend/g, "wifey");

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated ' + file);
  }
});
