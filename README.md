# Hide Layer Hunter for Figma

![GitHub release (latest by date)](https://img.shields.io/github/v/release/enamulkhanbd/figma-hide-layer-hunter?style=for-the-badge)
![GitHub license](https://img.shields.io/github/license/enamulkhanbd/figma-hide-layer-hunter?style=for-the-badge)

A simple but powerful Figma plugin to instantly find and select all hidden layers, helping you clean up your design files quickly and efficiently.

---

### Key Features

✨ **Context-Aware:** Works on your current selection. If nothing is selected, it scans the entire page.
🎯 **Precise Selection:** Intelligently ignores hidden components and instances to protect your design system.
🚀 **Instant Cleanup:** Selects all hidden layers at once, so you can review and delete them in a single step.
🔔 **Clear Notifications:** Tells you exactly how many hidden layers were found and where.

---

### Installation

1.  Go to the **[Releases page](https://github.com/enamulkhanbd/figma-hide-layer-hunter/releases)** on GitHub.
2.  Under the latest release, download the `.zip` file (e.g., `Hide-Layer-Hunter-v1.0.0.zip`).
3.  Unzip the downloaded file. You will have a folder containing `manifest.json` and `code.js`.
4.  Open the Figma Desktop App.
5.  Go to the main menu and select **Plugins** > **Development** > **Import plugin from manifest...**.
6.  Navigate to the unzipped folder and select the `manifest.json` file.

Figma will install the plugin locally. You can now find "Hide Layer Hunter" in your Plugins menu!

---

### How to Use

1.  **To scan a specific area:** Select one or more frames, groups, or sections.
2.  **To scan the whole page:** Make sure you have nothing selected.
3.  Run the plugin from the **Plugins** menu.

The plugin will instantly select all the hidden layers it finds. You can then press the `Delete` key to remove them or inspect them in the Layers panel.

---

### For Developers (Building from Source)

Want to contribute or modify the code?

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/enamulkhanbd/figma-hide-layer-hunter.git](https://github.com/enamulkhanbd/figma-hide-layer-hunter.git)
    ```
2.  **Navigate to the folder:**
    ```bash
    cd figma-hide-layer-hunter
    ```
3.  **Install in Figma:**
    * Follow the installation steps above, but instead of a downloaded folder, use the cloned repository folder to import the `manifest.json`.

---

### License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
