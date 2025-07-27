const fs = require('fs');
const path = require('path');

// Read the legal content from the submodule
const legalContentPath = path.join(__dirname, '../app-source/constants/legal-content.ts');

if (!fs.existsSync(legalContentPath)) {
  console.error('Legal content file not found. Make sure the submodule is initialized.');
  process.exit(1);
}

const legalContent = fs.readFileSync(legalContentPath, 'utf8');

// Extract privacy policy and terms content using regex
const privacyMatch = legalContent.match(/PRIVACY_POLICY_CONTENT = `([\s\S]*?)`;/);
const termsMatch = legalContent.match(/TERMS_OF_SERVICE_CONTENT = `([\s\S]*?)`;/);

if (!privacyMatch || !termsMatch) {
  console.error('Could not extract legal content from the file.');
  process.exit(1);
}

const privacyContent = privacyMatch[1];
const termsContent = termsMatch[1];

// Convert markdown-style content to HTML
function convertToHTML(content) {
  return content
    // Convert **bold** to <strong>
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Convert bullet points to list items
    .replace(/^• (.*$)/gm, '<li>$1</li>')
    // Group consecutive list items into <ul> tags
    .replace(/(<li>.*<\/li>\s*)+/gs, (match) => `<ul>\n${match}</ul>\n`)
    // Convert double newlines to paragraph breaks
    .replace(/\n\n/g, '</p>\n<p>')
    // Wrap everything in paragraphs
    .replace(/^(.*)$/gm, (line) => {
      if (line.startsWith('<ul>') || line.startsWith('</ul>') || 
          line.startsWith('<li>') || line.startsWith('</li>') ||
          line.startsWith('<p>') || line.startsWith('</p>') ||
          line.trim() === '') {
        return line;
      }
      return `<p>${line}</p>`;
    })
    // Clean up empty paragraphs and fix formatting
    .replace(/<p><\/p>/g, '')
    .replace(/<p>(<ul>)/g, '$1')
    .replace(/(<\/ul>)<\/p>/g, '$1')
    .replace(/\n\s*\n/g, '\n');
}

// Generate HTML template
function generateHTML(title, content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Go Exercise Timer - ${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
            background-color: #fff;
        }
        h1 {
            color: #f43f5e;
            border-bottom: 3px solid #f43f5e;
            padding-bottom: 15px;
            margin-bottom: 30px;
            font-size: 2.2em;
        }
        h2 {
            color: #374151;
            margin-top: 35px;
            margin-bottom: 15px;
            font-size: 1.4em;
            border-left: 4px solid #f43f5e;
            padding-left: 15px;
        }
        h3 {
            color: #4b5563;
            margin-top: 25px;
            margin-bottom: 10px;
            font-size: 1.1em;
        }
        p {
            margin-bottom: 15px;
            text-align: justify;
        }
        ul {
            margin: 15px 0;
            padding-left: 25px;
        }
        li {
            margin-bottom: 8px;
        }
        .last-updated {
            background-color: #f3f4f6;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 30px;
            text-align: center;
            font-weight: 500;
            color: #6b7280;
        }
        .section {
            margin-bottom: 30px;
            padding: 20px;
            background-color: #fafafa;
            border-radius: 8px;
            border-left: 4px solid #f43f5e;
        }
        .contact-info {
            background-color: #eff6ff;
            padding: 20px;
            border-radius: 8px;
            margin: 30px 0;
            border: 1px solid #dbeafe;
        }
        .important {
            background-color: #fef2f2;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #ef4444;
            margin: 20px 0;
        }
        strong {
            color: #1f2937;
        }
        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
        }
        a {
            color: #f43f5e;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    ${convertToHTML(content)}
    
    <div class="footer">
        <p><a href="support.html">← Back to Support</a> | <a href="index.html">Home</a></p>
    </div>
</body>
</html>`;
}

// Generate the HTML files
const privacyHTML = generateHTML('Privacy Policy', privacyContent);
const termsHTML = generateHTML('Terms of Service', termsContent);

// Write the files
fs.writeFileSync('privacy.html', privacyHTML);
fs.writeFileSync('terms.html', termsHTML);

console.log('✅ Legal content generated successfully!');
console.log('📄 Generated files:');
console.log('   - privacy.html');
console.log('   - terms.html');
console.log('');
console.log('🔗 URLs for App Store submission:');
console.log('   Privacy Policy: https://shujin-jim-li.github.io/MyFitnessTimerLinks/privacy.html');
console.log('   Terms of Service: https://shujin-jim-li.github.io/MyFitnessTimerLinks/terms.html');
