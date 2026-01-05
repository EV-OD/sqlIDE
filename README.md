# SqlIde

<p align="center">
  <img src="scripts/icon.svg" alt="SqlIde Logo" width="128" height="128">
</p>

<p align="center">
  <strong>Create beautiful Entity-Relationship diagrams from your databases and SQL</strong>
</p>

<p align="center">
  <a href="https://github.com/EV-OD/sqlIDE/releases">
    <img src="https://img.shields.io/github/v/release/EV-OD/sqlIDE?style=flat-square" alt="Release">
  </a>
  <a href="https://github.com/EV-OD/sqlIDE/blob/master/LICENSE">
    <img src="https://img.shields.io/github/license/EV-OD/sqlIDE?style=flat-square" alt="License">
  </a>
</p>

---

## ✨ Features

- **🗄️ Database Connection** - Connect directly to PostgreSQL, MySQL, or MariaDB databases
- **📝 SQL Editor** - Write SQL with syntax highlighting and execute queries
- **📊 ER Diagram Generation** - Automatically generate diagrams from your database schema
- **🎨 Multiple Styles** - Choose between Chen notation and Crow's Foot notation
- **🔍 Zoom & Pan** - Navigate large diagrams with ease
- **💾 Export** - Save diagrams as PNG or SVG images
- **🌓 Dark Theme** - Easy on the eyes dark mode interface
- **📁 Project Management** - Organize your SQL files and connections

## 📸 Screenshots

<!-- Add screenshots here -->

## 🚀 Installation

Download the latest release for your platform:

- **Windows**: `.msi` installer or `.exe` (NSIS)
- **macOS**: `.dmg` for Intel or Apple Silicon
- **Linux**: `.deb` (Debian/Ubuntu), `.rpm` (Fedora/RHEL), or `.AppImage`

[Download Latest Release](https://github.com/EV-OD/sqlIDE/releases/latest)

## 🛠️ Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/)
- [Rust](https://rustup.rs/)
- Platform-specific dependencies for Tauri

### Setup

```bash
# Clone the repository
git clone https://github.com/EV-OD/sqlIDE.git
cd sqlIDE

# Install dependencies
pnpm install

# Run in development mode
pnpm tauri dev

# Build for production
pnpm tauri build
```

### Linux Dependencies

```bash
sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev patchelf
```

## 🎯 Usage

1. **Create a Connection** - Add your database credentials (PostgreSQL, MySQL, or MariaDB)
2. **Browse Databases** - Explore tables, columns, and relationships
3. **Generate Diagrams** - Right-click on a connection to create an ER diagram
4. **Customize** - Change diagram style, theme, and curve settings
5. **Export** - Download as PNG or SVG for documentation

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**EV-OD**
- GitHub: [@EV-OD](https://github.com/EV-OD)

---

<p align="center">Made with ❤️ using Tauri, React, and Rust</p>
