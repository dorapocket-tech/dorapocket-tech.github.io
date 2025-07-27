# MyFitnessTimer Links

GitHub Pages site for MyFitnessTimer app legal content and support documentation.

## 🔗 Live URLs

- **Support Page**: https://shujin-jim-li.github.io/MyFitnessTimerLinks/support.html
- **Privacy Policy**: https://shujin-jim-li.github.io/MyFitnessTimerLinks/privacy.html
- **Terms of Service**: https://shujin-jim-li.github.io/MyFitnessTimerLinks/terms.html

## 🏗️ Build System

This repository uses a Git submodule to automatically sync legal content from the main app repository.

### Setup

The submodule is already configured and points to:
```
app-source -> https://github.com/shujin-jim-li/MyFitnessTimer.git
```

### Building Legal Content

To regenerate the legal HTML files from the latest app content:

```bash
# Sync the submodule to latest content
npm run sync-submodule

# Generate HTML files from legal content
npm run build-legal

# Or do both at once
npm run build
```

### Development

To test locally:
```bash
npm run dev
# Opens local server at http://localhost:8000
```

## 📁 File Structure

```
├── app-source/              # Git submodule (MyFitnessTimer repo)
│   └── constants/
│       └── legal-content.ts # Source of truth for legal content
├── scripts/
│   └── build-legal.js       # Converts TS content to HTML
├── support.html             # Manually maintained support page
├── privacy.html             # Auto-generated from app-source
├── terms.html               # Auto-generated from app-source
└── index.html               # Landing page
```

## 🔄 Workflow

1. **Update legal content** in the main app repo (`constants/legal-content.ts`)
2. **Run build** in this repo to sync and generate new HTML files
3. **Commit and push** the updated HTML files
4. **GitHub Pages** automatically deploys the changes

## 🚀 App Store Submission

Use these URLs in your App Store submission:

- **Privacy Policy URL**: `https://shujin-jim-li.github.io/MyFitnessTimerLinks/privacy.html`
- **Terms of Service URL**: `https://shujin-jim-li.github.io/MyFitnessTimerLinks/terms.html`
- **Support URL**: `https://shujin-jim-li.github.io/MyFitnessTimerLinks/support.html`

## 📝 Manual Updates

- **support.html**: Edit directly in this repository
- **index.html**: Edit directly in this repository
- **Legal content**: Edit in main app repo, then run build script

## 🔧 Maintenance

To update the submodule to track a different branch:
```bash
cd app-source
git checkout main  # or develop
cd ..
git add app-source
git commit -m "Update submodule to track main branch"
```
