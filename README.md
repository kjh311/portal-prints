# Portal Prints 📸

**Portal Prints** is a sleek Chrome Extension (Manifest V3) designed for high-quality frame capture from YouTube videos. 

Capture any moment in native resolution and save it with its metadata for quick reference.

## 🚀 Features
- **One-Click Capture**: Injects a custom button directly into the YouTube player control bar.
- **Native Resolution**: Grabs frames using the Canvas API at the video's highest available quality (supports 4K).
- **Metadata Awareness**: Automatically saves the video title and URL alongside the image.
- **Premium Popup**: A modern, dark-mode preview gallery (glassmorphism inspired) to verify your captures.
- **Security First**: Built to comply with modern security policies like YouTube's "Trusted Types".

## 🛠 Installation (Developer Mode)
1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top right.
4. Click **Load unpacked**.
5. Select the `portal-prints` folder.

## 📺 How to Use
1. Open any YouTube video.
2. Look for the **Portal Prints** (frame icon) in the bottom-right player controls.
3. Click the icon—you'll see a "Snapshot captured!" notification.
4. Click the **Portal Prints** icon in your Chrome toolbar to see your preview!

## 🧪 Tech Stack
- **JavaScript (Vanilla)**: For core logic and DOM manipulation.
- **CSS3 (Vanilla)**: For premium styling and animations.
- **Canvas API**: For high-performance frame extraction.
- **Chrome Storage API**: For temporary data handover.

## 🗺 Roadmap
- [ ] **Supabase Integration**: Synchronize captures to a remote bucket and database.
- [ ] **History Gallery**: View all past captures in a scrollable list.
- [ ] **Download Options**: Save captures directly to your local machine.
- [ ] **Shortcut Keys**: Capture frames using keyboard commands.

---
Built with ✨ for high-quality YouTube archiving.
