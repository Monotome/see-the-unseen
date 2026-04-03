# See the Unseen

> Privacy-first desktop notepad with a sliding protection window

**See the Unseen** is a privacy-focused writing application that protects your notes from shoulder-surfing and screen sharing. Text appears as ordinary, random-looking content to anyone nearby, while your real notes stay readable only in a small window around your cursor position.

## ✨ Features

- **🎭 Masked Editor** - Real content visible only around cursor, fake text shown everywhere else
- **🔒 Content Protection** - Screenshot and screen recording protection (Windows/macOS)
- **🌓 Theme Support** - Light/dark/system theme modes
- **💾 Auto-save** - Configurable automatic file saving
- **⚡ Alt-Tab Protection** - Auto-mask when you switch windows
- **📏 Adjustable Window** - Control the visible text radius (tight/medium/wide)
- **⌨️ Keyboard Shortcuts** - Fast navigation and protection toggle
- **🎨 Modern UI** - Clean, native-feeling interface built with Svelte 5

## 🛠 Tech Stack

- **[Tauri v2](https://tauri.app/)** - Lightweight desktop framework with Rust backend
- **[Svelte 5](https://svelte.dev/)** - Reactive frontend framework with modern runes API
- **[SvelteKit](https://kit.svelte.dev/)** - Meta-framework with SSR/SSG support
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[Vite](https://vitejs.dev/)** - Fast build tool and dev server
- **[pnpm](https://pnpm.io/)** - Efficient package manager with workspace support

## 📋 Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 10.0.0
- **Rust** (latest stable) - Required for Tauri
- **System dependencies** for Tauri (varies by platform)

### Install Rust

```bash
# macOS/Linux
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Windows
# Download from https://rustup.rs/
```

### Install pnpm

```bash
npm install -g pnpm
```

## 🚀 Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/see-the-unseen.git
cd see-the-unseen

# Install dependencies
pnpm install
```

### Development

```bash
# Run desktop app in development mode
pnpm desktop:dev

# Type-check without running
pnpm desktop:check

# Build web version only
pnpm desktop:web-build

# Build desktop app for production
pnpm desktop:build
```

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+H` | Toggle privacy protection on/off |
| `Ctrl+,` | Open settings panel |
| `Ctrl+S` | Save current file |
| `Ctrl+Shift+S` | Save as (choose new location) |
| `Ctrl+O` | Open file |
| `Ctrl+N` | New file |

## 📁 Project Structure

```
see-the-unseen/
├── apps/
│   └── desktop/           # Tauri + Svelte desktop app
│       ├── src/
│       │   ├── lib/
│       │   │   ├── components/
│       │   │   │   ├── AppHeader.svelte
│       │   │   │   ├── EditorPane.svelte
│       │   │   │   └── SettingsPanel.svelte
│       │   │   ├── desktop-config.ts    # Types and defaults
│       │   │   └── masking.ts           # Text masking algorithm
│       │   └── routes/
│       │       └── +page.svelte         # Main app orchestration
│       └── src-tauri/      # Rust backend
│           ├── capabilities/
│           │   └── default.json         # Permission manifest
│           └── tauri.conf.json          # Tauri configuration
├── .github/
│   └── workflows/
│       ├── ci.yml          # CI/CD pipeline
│       └── release.yml     # Release workflow
├── pnpm-workspace.yaml     # Workspace configuration
├── LICENSE                 # MIT license
└── README.md
```

## 🎯 How It Works

The masking algorithm uses a deterministic pseudo-random generator to replace characters outside the visible window with frequency-matched fake text:

1. **Session Seed** - Random seed generated on app launch
2. **Character Mapping** - Each position maps to a fake character based on English letter frequency
3. **Cursor Window** - Real text visible within configurable radius (10-35 chars)
4. **Seamless Transitions** - Smooth reveal as you type or move the cursor

The fake text maintains realistic letter frequency distribution, making it appear as genuine English text to casual observers.

## 🔐 Privacy & Security

- **Local-first** - All files stored on your device, no cloud sync
- **Screenshot Protection** - Leverages native OS APIs to block screenshots/recordings
- **Window Blur Protection** - Auto-mask when switching apps (configurable)
- **No Telemetry** - Zero data collection or tracking

## 🧪 Development

### Type Checking

```bash
pnpm desktop:check
```

### Linting & Formatting

This project uses `.editorconfig` for consistent code style:
- UTF-8 encoding
- LF line endings
- 2-space indentation (4 spaces for Rust)
- Trim trailing whitespace

## 📦 Building for Production

```bash
# Build for your current platform
pnpm desktop:build

# Output will be in apps/desktop/src-tauri/target/release/bundle/
```

## 🚢 Releasing

This project uses GitHub Actions to automatically build and publish releases.

### Creating a Release

**Option 1: Manual Trigger (Recommended)**

1. Go to the [Actions tab](../../actions) in your GitHub repository
2. Select the **Release** workflow
3. Click **Run workflow**
4. Enter the version number (e.g., `0.1.0`)
5. Click **Run workflow** button

The workflow will:
- Build Windows installer (.msi)
- Create a draft GitHub Release
- Upload the installer as a release asset

**Option 2: Git Tags**

```bash
# Tag the release
git tag v0.1.0
git push origin v0.1.0

# The workflow will trigger automatically
```

### Publishing the Release

1. Go to the [Releases page](../../releases)
2. Find your draft release
3. Edit the release notes (add changelog, breaking changes, etc.)
4. Click **Publish release**

Users can now download the installer from the Releases page!

### Release Artifacts

- `See-the-Unseen_{version}_x64_en-US.msi` - Windows MSI installer

### Important Notes

- **Code Signing**: The app is currently not code-signed. Users will see a Windows SmartScreen warning. Click "More info" → "Run anyway" to install.
- **Version Management**: The workflow automatically updates the version in `tauri.conf.json` during build.
- **Draft Releases**: All releases are created as drafts first, giving you time to review before publishing.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Tauri](https://tauri.app/) for secure, lightweight desktop apps
- UI powered by [Svelte 5](https://svelte.dev/) and its modern runes API
- Inspired by privacy-focused writing tools and the need for shoulder-surfing protection

---

**Made with ❤️ for privacy-conscious writers**
