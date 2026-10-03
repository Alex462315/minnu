# 💗 Birthday Surprise for Minnu

A responsive, interactive birthday surprise website with 7 animated screens, mic-blow candles, balloon popping, and a typewriter letter.

## Quick Start

1. **Add your music**: Drop an MP3 file into `audio/music.mp3` (soft piano or romantic instrumental works great)
2. **Add photos** (optional): Drop 1–3 photos into `photos/` and update `CONFIG.photos` in `app.js`
3. **Edit your content**: Open `app.js` and edit the `CONFIG` object at the very top

## What to Edit in CONFIG (app.js)

```js
const CONFIG = {
  name: "Sharon",           // Her real name (shown on greeting screen)
  nickname: "Minnu",        // Nickname (shown throughout)
  age: 21,                  // Age she's turning
  from: "Akhil",            // Your name
  fromRole: "your dance partner", // Your relationship label

  reasons: [                // 5 balloon pop reasons
    "Your laugh can fix almost any bad day.",
    // ... edit all 5
  ],

  letter: [                 // Letter paragraphs
    "Dear Minnu,",
    "I never say it enough...",
    // ... edit all paragraphs
  ],

  photos: [],               // Photo paths, e.g. ["photos/us.jpg"]
  musicPath: "audio/music.mp3",
  musicVolume: 0.4,         // 0.0 to 1.0

  blowThreshold: 140,       // Mic sensitivity (lower = more sensitive)
  blowDuration: 600,        // How long to blow (ms)
};
```

## Run Locally

Using any static file server:

```bash
# Option 1: npx serve
npx -y serve .

# Option 2: Python
python -m http.server 3000

# Option 3: VS Code Live Server extension
```

> ⚠️ You need a local server (not `file://`) for mic access and proper module loading.

## Deploy

### Netlify
1. Push to a GitHub repo (use a hard-to-guess repo name)
2. Connect to Netlify → deploy from repo
3. Or drag-and-drop the project folder at [app.netlify.com/drop](https://app.netlify.com/drop)

### Vercel
```bash
npx -y vercel .
```

### GitHub Pages
1. Push to a repo → Settings → Pages → Deploy from branch `main`
2. Your site will be at `https://username.github.io/repo-name/`

## 7 Screens

| # | Screen | Interaction |
|---|--------|-------------|
| 1 | Opening | Confetti burst, tap to begin (starts music) |
| 2 | Greeting | "Happy Birthday, Sharon" with staggered reveal |
| 3 | Cake | Upma-flavoured cake! Blow via mic or tap button |
| 4 | Balloons | Pop 5 balloons to reveal reasons |
| 5 | Letter Intro | "A letter from Akhil is waiting" |
| 6 | Letter | Typewriter effect, optional photos |
| 7 | Finale | Giant confetti, teddy bear, replay button |

## Features

- 🎤 **Mic blowing**: Uses `getUserMedia` to detect blowing into mic (with tap fallback)
- 🎈 **Balloon popping**: Web Audio API synthesized pop sounds (no extra files)
- ✍️ **Typewriter letter**: Line-by-line reveal with variable speed
- 🎊 **Confetti**: Custom canvas-based confetti system (no dependencies)
- 💖 **Floating particles**: Hearts, sparkles, music notes, petals
- 📱 **Responsive**: Works from 320px phones to 2560px desktops
- ♿ **Accessible**: Keyboard navigation, focus management, `prefers-reduced-motion`
- 🔇 **Music toggle**: Persists across screens, handles missing file gracefully
- 📷 **Optional photos**: Polaroid-style gallery in letter screen

## File Structure

```
Birthday/
├── index.html          # Main page
├── style.css           # All styles
├── app.js              # Logic + CONFIG at top
├── README.md           # This file
├── audio/
│   └── music.mp3       # ← Drop your music here
└── photos/
    └── (your photos)   # ← Optional photos here
```

## Browser Support

Tested for: Chrome, Safari, Firefox (desktop & mobile)

## Tips

- Use a **hard-to-guess URL** when deploying (e.g., `minnu-oct4-surprise-xk9f`)
- The mic feature requires **HTTPS** in production (Netlify/Vercel handle this)
- If music doesn't play, the first tap starts it (browser autoplay policy)
- Keep total file size small — compress photos before adding them
