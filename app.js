/* ==========================================
   BIRTHDAY SURPRISE — APP
   All editable content is in CONFIG below.
   ========================================== */

// ============================================
// ██  CONFIG — Edit everything here  ██
// ============================================
const CONFIG = {
  // Names
  name: "Sharon",
  nickname: "Minnu",
  age: 21,

  // From
  from: "Akhil",
  fromRole: "your dance partner",

  // 5 balloon reasons
  reasons: [
    "Your laugh can fix almost any bad day.",
    "You make everyone around you feel cared for.",
    "You never miss a beat even when I do.",
    "Even boring days feel better when you are around.",
    "You are the reason uppumavu now feels like a love language.",
  ],

  // Letter text (each string = one paragraph)
  letter: [
    "Dear Minnu,",
    "I've never said it, but having you around has made my ordinary days feel a lot less ordinary.",
    "Some people make noise when they enter your life.",
    "You somehow made mine a little brighter without even trying.",
    "You are kind in the messy moments and funny when nobody expects it and somehow you make even my worst steps look like choreography.",
    "I hope this year gives you back all of that kindness.",
    "Happy 21st. I hope tomorrow is as sweet as you are.",
  ],

  // Photo paths (relative to project root). Leave empty [] for no photos.
  photos: [
    "photos/sharon1.jpeg",
    "photos/sharon2.jpeg",
    "photos/sharon3.jpeg",
    "photos/sharon4.jpeg",
  ],

  // Music
  musicPath: "audio/music.mpeg",
  musicVolume: 0.5,

  // Mic blow detection
  blowThreshold: 140, // audio level (0-255) to count as a blow
  blowDuration: 600,  // ms the level must stay above threshold
};

// ============================================
//  GLOBALS
// ============================================
let currentScreen = 0;
let isTransitioning = false;
let musicPlaying = false;
let isMuted = false;
let audioCtx = null;
let bgMusic = null;
let balloonsPopped = 0;
let candlesBlown = false;
let micStream = null;
let reducedMotion = false;

// ============================================
//  INIT
// ============================================
document.addEventListener("DOMContentLoaded", () => {
  reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  initMusic();
  initParticles();
  initScreenListeners();
  animateScreen(0);

  // Listen for reduced motion changes
  window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", (e) => {
    reducedMotion = e.matches;
  });
});

// ============================================
//  MUSIC SYSTEM
// ============================================
function initMusic() {
  const audioEl = document.getElementById("bg-music");
  if (audioEl) {
    bgMusic = audioEl;
  } else {
    bgMusic = new Audio(CONFIG.musicPath);
    bgMusic.loop = true;
    bgMusic.preload = "auto";
  }
  bgMusic.volume = CONFIG.musicVolume;

  // Handle missing file or format fallback gracefully
  bgMusic.addEventListener("error", () => {
    console.log("Audio load error, trying fallback to audio/music.mp3...");
    if (bgMusic.src && !bgMusic.src.endsWith(".mp3")) {
      bgMusic.src = "audio/music.mp3";
      bgMusic.load();
    }
  });

  const muteBtn = document.getElementById("mute-btn");
  if (muteBtn) {
    muteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMute();
    });
  }

  // Attempt to start music on the first user interaction anywhere
  const onFirstInteraction = () => {
    startMusic();
    if (musicPlaying) {
      window.removeEventListener("click", onFirstInteraction);
      window.removeEventListener("touchstart", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
    }
  };
  window.addEventListener("click", onFirstInteraction, { passive: true });
  window.addEventListener("touchstart", onFirstInteraction, { passive: true });
  window.addEventListener("keydown", onFirstInteraction, { passive: true });

  // Also try immediate autoplay in case browser permits it
  startMusic();
}

function startMusic() {
  if (!bgMusic) {
    bgMusic = document.getElementById("bg-music");
  }
  if (!bgMusic) return;

  if (bgMusic.paused) {
    bgMusic.volume = CONFIG.musicVolume;
    const playPromise = bgMusic.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          musicPlaying = true;
          const muteBtn = document.getElementById("mute-btn");
          if (muteBtn) muteBtn.classList.remove("muted");
        })
        .catch(() => {
          // Autoplay policy prevented playback without interaction; will start on first click/touch
        });
    }
  } else {
    musicPlaying = true;
  }
}

function toggleMute() {
  const muteBtn = document.getElementById("mute-btn");
  if (!bgMusic) return;

  isMuted = !isMuted;
  bgMusic.muted = isMuted;

  if (muteBtn) {
    muteBtn.classList.toggle("muted", isMuted);
  }

  // If unmuting while stopped or paused, start playback
  if (!isMuted && bgMusic.paused) {
    startMusic();
  }
}

// ============================================
//  WEB AUDIO — POP SOUND
// ============================================
function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playPopSound() {
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;

    // Noise burst
    const bufferSize = ctx.sampleRate * 0.12;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.1);
    filter.Q.value = 1;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.12);
  } catch (e) {
    // Silently fail
  }
}

// ============================================
//  PARTICLE SYSTEM (Background decorations)
// ============================================
const particles = [];
let particleCanvas, particleCtxRef;
let particleRAF;

function initParticles() {
  particleCanvas = document.getElementById("particle-canvas");
  particleCtxRef = particleCanvas.getContext("2d");

  resizeParticleCanvas();
  window.addEventListener("resize", resizeParticleCanvas);

  if (!reducedMotion) {
    spawnParticleLoop();
    animateParticles();
  }
}

function resizeParticleCanvas() {
  particleCanvas.width = window.innerWidth;
  particleCanvas.height = window.innerHeight;
}

function spawnParticleLoop() {
  const isDesktop = window.innerWidth >= 600;
  const spawnInterval = isDesktop ? 800 : 1400;
  const maxParticles = isDesktop ? 30 : 15;

  setInterval(() => {
    if (particles.length >= maxParticles || reducedMotion) return;

    const types = ["sunflower", "sparkle", "note", "petal"];
    const type = types[Math.floor(Math.random() * types.length)];
    const w = window.innerWidth;
    const h = window.innerHeight;

    particles.push({
      type,
      x: Math.random() * w,
      y: h + 20,
      size: 8 + Math.random() * 12,
      speed: 0.3 + Math.random() * 0.6,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.01 + Math.random() * 0.02,
      wobbleAmp: 20 + Math.random() * 30,
      opacity: 0.15 + Math.random() * 0.35,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.02,
    });
  }, spawnInterval);
}

function animateParticles() {
  const ctx = particleCtxRef;
  ctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.y -= p.speed;
    p.wobble += p.wobbleSpeed;
    p.rotation += p.rotSpeed;

    const xOff = Math.sin(p.wobble) * p.wobbleAmp;
    const drawX = p.x + xOff;

    if (p.y < -30) {
      particles.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.globalAlpha = p.opacity;
    ctx.translate(drawX, p.y);
    ctx.rotate(p.rotation);

    if (p.type === "sunflower") {
      drawSunflower(ctx, p.size);
    } else if (p.type === "sparkle") {
      drawSparkle(ctx, p.size);
    } else if (p.type === "note") {
      drawNote(ctx, p.size);
    } else if (p.type === "petal") {
      drawPetal(ctx, p.size);
    }

    ctx.restore();
  }

  particleRAF = requestAnimationFrame(animateParticles);
}

function drawSunflower(ctx, size) {
  const s = size / 2;
  // Petals
  ctx.fillStyle = "#fbbf24";
  for (let i = 0; i < 8; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI) / 4);
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.7, s * 0.3, s * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Center
  ctx.fillStyle = "#78350f";
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2);
  ctx.fill();
}

function drawSparkle(ctx, size) {
  const s = size / 2;
  ctx.fillStyle = "#fbbf24";
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 - Math.PI / 2;
    const nextAngle = ((i + 0.5) / 4) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(Math.cos(angle) * s, Math.sin(angle) * s);
    ctx.lineTo(Math.cos(nextAngle) * s * 0.3, Math.sin(nextAngle) * s * 0.3);
  }
  ctx.closePath();
  ctx.fill();
}

function drawNote(ctx, size) {
  const s = size * 0.6;
  ctx.fillStyle = "#f59e0b";
  ctx.font = `${s * 2}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("♪", 0, 0);
}

function drawPetal(ctx, size) {
  const s = size / 2;
  ctx.fillStyle = "#fde047";
  ctx.beginPath();
  ctx.ellipse(0, 0, s, s * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ============================================
//  CONFETTI SYSTEM
// ============================================
let confettiCanvas, confettiCtxRef;
const confettiParticles = [];

function initConfetti() {
  confettiCanvas = document.getElementById("confetti-canvas");
  confettiCtxRef = confettiCanvas.getContext("2d");
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}

function fireConfetti(options = {}) {
  if (reducedMotion) return;
  if (!confettiCanvas) initConfetti();

  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;

  const count = options.count || (window.innerWidth < 600 ? 60 : 120);
  const colors = options.colors || ["#f59e0b", "#fbbf24", "#fef08a", "#ffffff", "#eab308", "#f97316", "#d97706"];
  const originX = options.x !== undefined ? options.x : confettiCanvas.width / 2;
  const originY = options.y !== undefined ? options.y : confettiCanvas.height * 0.3;
  const spread = options.spread || 360;
  const velocity = options.velocity || 8;

  for (let i = 0; i < count; i++) {
    const angle = (Math.random() * spread - spread / 2) * (Math.PI / 180) - Math.PI / 2;
    const v = velocity * (0.5 + Math.random() * 0.5);

    confettiParticles.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * v + (Math.random() - 0.5) * 2,
      vy: Math.sin(angle) * v - Math.random() * 2,
      w: 4 + Math.random() * 6,
      h: 3 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.3,
      gravity: 0.12 + Math.random() * 0.06,
      drag: 0.97 + Math.random() * 0.02,
      opacity: 1,
      life: 180 + Math.random() * 60,
      age: 0,
      shape: Math.random() > 0.5 ? "rect" : "circle",
    });
  }

  if (confettiParticles.length === count) {
    animateConfetti();
  }
}

function animateConfetti() {
  const ctx = confettiCtxRef;
  ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

  for (let i = confettiParticles.length - 1; i >= 0; i--) {
    const p = confettiParticles[i];
    p.vy += p.gravity;
    p.vx *= p.drag;
    p.vy *= p.drag;
    p.x += p.vx;
    p.y += p.vy;
    p.rotation += p.rotSpeed;
    p.age++;

    if (p.age > p.life * 0.7) {
      p.opacity = Math.max(0, 1 - (p.age - p.life * 0.7) / (p.life * 0.3));
    }

    if (p.age > p.life || p.y > confettiCanvas.height + 20) {
      confettiParticles.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.globalAlpha = p.opacity;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.fillStyle = p.color;

    if (p.shape === "rect") {
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  if (confettiParticles.length > 0) {
    requestAnimationFrame(animateConfetti);
  }
}

// ============================================
//  SCREEN MANAGEMENT
// ============================================
function initScreenListeners() {
  const stage = document.getElementById("stage");

  // Tap / click to continue (for screens that support it)
  stage.addEventListener("click", handleScreenTap);
  stage.addEventListener("touchend", (e) => {
    // Prevent ghost clicks, handled by click
  });

  // Keyboard navigation
  document.addEventListener("keydown", (e) => {
    if (e.key === " " || e.key === "Enter" || e.key === "ArrowRight") {
      e.preventDefault();
      handleScreenTap(e);
    }
  });

  // Specific button listeners
  document.getElementById("blow-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    blowOutCandles();
  });

  document.getElementById("balloons-continue").addEventListener("click", (e) => {
    e.stopPropagation();
    goToScreen(4);
  });

  document.getElementById("open-letter-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    goToScreen(5);
  });

  document.getElementById("letter-continue").addEventListener("click", (e) => {
    e.stopPropagation();
    goToScreen(6);
  });

  document.getElementById("poem-continue").addEventListener("click", (e) => {
    e.stopPropagation();
    goToScreen(7);
  });

  document.getElementById("replay-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    replay();
  });
}

function handleScreenTap(e) {
  // Don't advance if clicking buttons, balloons, etc.
  if (e.target.closest("button") || e.target.closest(".balloon")) return;
  if (isTransitioning) return;

  switch (currentScreen) {
    case 0: // Opening → start music, go to greeting
      startMusic();
      goToScreen(1);
      break;
    case 1: // Greeting → cake
      goToScreen(2);
      break;
    case 2: // Cake — only advance after blow
      if (candlesBlown) goToScreen(3);
      break;
    case 3: // Balloons — don't auto-advance, needs button
      break;
    case 4: // Letter intro — don't auto-advance, has button
      break;
    case 5: // Letter — don't auto-advance, has button
      break;
    case 6: // Poem — don't auto-advance, has button
      break;
    case 7: // Finale — no advance
      break;
  }
}

function goToScreen(index) {
  if (isTransitioning || index === currentScreen) return;
  isTransitioning = true;

  const oldScreen = document.getElementById(`screen-${currentScreen}`);
  const newScreen = document.getElementById(`screen-${index}`);

  // Show top bar and progress after first screen
  if (index > 0) {
    document.getElementById("top-bar").classList.add("visible");
    document.getElementById("progress").classList.add("visible");
  }

  // Update progress dots
  const dots = document.querySelectorAll(".progress__dot");
  dots.forEach((dot, i) => {
    dot.classList.toggle("active", i === index);
    dot.classList.toggle("completed", i < index);
  });

  // Transition out
  oldScreen.classList.remove("active");
  oldScreen.classList.add("exiting");

  setTimeout(() => {
    oldScreen.classList.remove("exiting");
    newScreen.classList.add("active");
    currentScreen = index;

    // Animate in the new screen
    animateScreen(index);

    setTimeout(() => {
      isTransitioning = false;
    }, 400);
  }, 400);
}

function animateScreen(index) {
  const screen = document.getElementById(`screen-${index}`);

  switch (index) {
    case 0:
      animateOpening(screen);
      break;
    case 1:
      animateGreeting(screen);
      break;
    case 2:
      animateCake(screen);
      break;
    case 3:
      animateBalloons(screen);
      break;
    case 4:
      animateLetterIntro(screen);
      break;
    case 5:
      animateLetter(screen);
      break;
    case 6:
      animatePoem(screen);
      break;
    case 7:
      animateFinale(screen);
      break;
  }
}

// ============================================
//  SCREEN ANIMATIONS
// ============================================

// --- Screen 0: Opening ---
function animateOpening(screen) {
  const title = screen.querySelector(".opening__title");
  const yay = screen.querySelector(".opening__yay");
  const hint = screen.querySelector("#opening-hint");

  setTimeout(() => title.classList.add("animate-in"), 200);
  setTimeout(() => yay.classList.add("animate-in"), 200);
  setTimeout(() => {
    hint.classList.add("animate-in");
    // Fire opening confetti
    fireConfetti({
      count: window.innerWidth < 600 ? 50 : 100,
      y: window.innerHeight * 0.25,
      velocity: 10,
      spread: 240,
    });
  }, 200);
}

// --- Screen 1: Greeting ---
function animateGreeting(screen) {
  const sub = screen.querySelector(".greeting__sub");
  const words = screen.querySelectorAll(".greeting__word");
  const age = screen.querySelector(".greeting__age");
  const rose = screen.querySelector(".greeting__rose");

  sub.classList.add("animate-in");
  words.forEach((w) => w.classList.add("animate-in"));
  age.classList.add("animate-in");
  if (rose) rose.classList.add("animate-in");
}

// --- Screen 2: Cake ---
function animateCake(screen) {
  const title = screen.querySelector(".cake__title");
  const cake = screen.querySelector(".upma-cake");
  const blow = screen.querySelector(".cake__blow");

  title.classList.add("animate-in");
  cake.classList.add("animate-in");
  blow.classList.add("animate-in");

  // Try mic
  initMicBlowing();
}

// --- Screen 3: Balloons ---
function animateBalloons(screen) {
  const title = screen.querySelector(".balloons__title");
  const sub = screen.querySelector(".balloons__sub");

  title.classList.add("animate-in");
  sub.classList.add("animate-in");

  createBalloons();
}

// --- Screen 4: Letter Intro ---
function animateLetterIntro(screen) {
  const title = screen.querySelector(".letter-intro__title");
  const sub = screen.querySelector(".letter-intro__sub");
  const avatar = screen.querySelector(".letter-intro__avatar");
  const btn = screen.querySelector(".letter-intro__btn");

  title.classList.add("animate-in");
  sub.classList.add("animate-in");
  avatar.classList.add("animate-in");
  btn.classList.add("animate-in");
}

// --- Screen 5: Letter ---
function animateLetter(screen) {
  startTypewriter();
  loadPhotos();
}

// --- Screen 6: Poem ---
function animatePoem(screen) {
  const title = screen.querySelector(".poem__title");
  const card = screen.querySelector(".poem__card");
  const btn = screen.querySelector("#poem-continue");

  setTimeout(() => title.classList.add("animate-in"), 200);
  setTimeout(() => card.classList.add("animate-in"), 500);
  setTimeout(() => btn.classList.add("animate-in"), 1200);
}

// --- Screen 7: Finale ---
function animateFinale(screen) {
  const title = screen.querySelector(".finale__title");
  const bear = screen.querySelector(".finale__bear");
  const dancers = screen.querySelector(".finale__dancers");
  const footer = screen.querySelector(".finale__footer");
  const replayBtn = screen.querySelector("#replay-btn");

  title.classList.add("animate-in");
  bear.classList.add("animate-in");
  dancers.classList.add("animate-in");
  footer.classList.add("animate-in");
  replayBtn.classList.add("animate-in");

  // Grand finale confetti
  setTimeout(() => {
    fireConfetti({
      count: window.innerWidth < 600 ? 80 : 160,
      y: 0,
      velocity: 6,
      spread: 160,
      colors: ["#e11d74", "#f48fb1", "#f8bbd0", "#ffffff", "#f0c040", "#c2185b", "#ff80ab"],
    });
  }, 300);

  // Second wave
  setTimeout(() => {
    fireConfetti({
      count: window.innerWidth < 600 ? 40 : 80,
      x: window.innerWidth * 0.2,
      y: window.innerHeight * 0.1,
      velocity: 7,
      spread: 200,
    });
    fireConfetti({
      count: window.innerWidth < 600 ? 40 : 80,
      x: window.innerWidth * 0.8,
      y: window.innerHeight * 0.1,
      velocity: 7,
      spread: 200,
    });
  }, 1200);
}

// ============================================
//  CANDLE BLOWING (MIC DETECTION)
// ============================================
function initMicBlowing() {
  const micHint = document.getElementById("mic-hint");
  const blowBtn = document.getElementById("blow-btn");

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    micHint.style.display = "none";
    return;
  }

  navigator.mediaDevices.getUserMedia({ audio: true })
    .then((stream) => {
      micStream = stream;
      const ctx = getAudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let aboveThresholdStart = null;

      blowBtn.classList.add("listening");
      micHint.textContent = "🎤 Mic is listening — blow to extinguish!";

      function checkBlow() {
        if (candlesBlown) {
          // Cleanup
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

        if (avg > CONFIG.blowThreshold) {
          if (!aboveThresholdStart) aboveThresholdStart = Date.now();
          if (Date.now() - aboveThresholdStart > CONFIG.blowDuration) {
            blowOutCandles();
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
        } else {
          aboveThresholdStart = null;
        }

        requestAnimationFrame(checkBlow);
      }

      checkBlow();
    })
    .catch(() => {
      micHint.textContent = "Mic unavailable — tap the button!";
    });
}

function blowOutCandles() {
  if (candlesBlown) return;
  candlesBlown = true;

  const flame1 = document.getElementById("flame-1");
  const flame2 = document.getElementById("flame-2");
  const smoke1 = document.getElementById("smoke-1");
  const smoke2 = document.getElementById("smoke-2");
  const blowSection = document.getElementById("cake-blow");
  const doneSection = document.getElementById("cake-done");
  const continueHint = document.getElementById("cake-continue");
  const blowBtn = document.getElementById("blow-btn");

  blowBtn.classList.remove("listening");

  // Blow out flames
  flame1.classList.add("blown-out");
  flame2.classList.add("blown-out");

  // Show smoke
  setTimeout(() => {
    smoke1.style.opacity = "1";
    smoke2.style.opacity = "1";
    smoke1.classList.add("show");
    smoke2.classList.add("show");
  }, 200);

  // Hide blow section, show done
  setTimeout(() => {
    blowSection.style.display = "none";
    doneSection.style.display = "flex";
    doneSection.classList.add("show");
    continueHint.style.display = "";

    // Confetti burst
    fireConfetti({
      count: window.innerWidth < 600 ? 50 : 90,
      velocity: 8,
      spread: 300,
    });
  }, 600);

  // Stop mic if still active
  if (micStream) {
    micStream.getTracks().forEach((t) => t.stop());
  }
}

// ============================================
//  BALLOON GAME
// ============================================
function createBalloons() {
  const arena = document.getElementById("balloon-arena");
  arena.innerHTML = "";
  balloonsPopped = 0;

  const colors = [
    { body: "#f59e0b", highlight: "#fef08a", string: "#d97706" }, // Sunflower gold
    { body: "#eab308", highlight: "#fef9c3", string: "#ca8a04" }, // Sunny yellow
    { body: "#fbbf24", highlight: "#ffffff", string: "#d97706" }, // Bright yellow & cream
    { body: "#f97316", highlight: "#fed7aa", string: "#ea580c" }, // Warm apricot
    { body: "#d97706", highlight: "#fde68a", string: "#b45309" }, // Warm honey amber
  ];

  const positions = [
    { left: "5%", bottom: "20%" },
    { left: "25%", bottom: "35%" },
    { left: "45%", bottom: "10%" },
    { left: "62%", bottom: "30%" },
    { left: "78%", bottom: "15%" },
  ];

  for (let i = 0; i < 5; i++) {
    const balloon = document.createElement("div");
    balloon.className = "balloon";
    balloon.setAttribute("tabindex", "0");
    balloon.setAttribute("role", "button");
    balloon.setAttribute("aria-label", `Balloon ${i + 1} — tap to pop`);
    balloon.dataset.index = i;
    balloon.style.left = positions[i].left;
    balloon.style.bottom = positions[i].bottom;
    balloon.style.setProperty("--rot", `${(Math.random() - 0.5) * 6}deg`);
    balloon.style.animationDelay = `${i * 0.3}s`;

    const c = colors[i];
    balloon.innerHTML = `
      <svg viewBox="0 0 80 120">
        <defs>
          <radialGradient id="bg${i}" cx="35%" cy="30%">
            <stop offset="0%" stop-color="${c.highlight}"/>
            <stop offset="100%" stop-color="${c.body}"/>
          </radialGradient>
        </defs>
        <ellipse cx="40" cy="45" rx="30" ry="38" fill="url(#bg${i})" />
        <ellipse cx="33" cy="32" rx="8" ry="12" fill="white" opacity="0.25" transform="rotate(-15 33 32)" />
        <polygon points="35,82 40,90 45,82" fill="${c.body}" />
        <line x1="40" y1="90" x2="40" y2="118" stroke="${c.string}" stroke-width="1.5" opacity="0.6" />
      </svg>
    `;

    balloon.addEventListener("click", (e) => {
      e.stopPropagation();
      popBalloon(balloon);
    });
    balloon.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        popBalloon(balloon);
      }
    });

    arena.appendChild(balloon);
  }
}

function popBalloon(balloon) {
  if (balloon.classList.contains("popped")) return;

  const index = parseInt(balloon.dataset.index);
  balloon.classList.add("popped");
  playPopSound();

  // Small confetti burst at balloon location
  const rect = balloon.getBoundingClientRect();
  fireConfetti({
    count: 15,
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
    velocity: 4,
    spread: 360,
    colors: ["#f48fb1", "#e11d74", "#f8bbd0", "#ffffff"],
  });

  balloonsPopped++;

  // Show reason card
  setTimeout(() => {
    showReasonCard(index);
  }, 300);
}

function showReasonCard(index) {
  const reasonList = document.getElementById("reason-list");
  const card = document.createElement("div");
  card.className = "reason-card";
  card.innerHTML = `
    <div class="reason-card__label">REASON NO. ${index + 1}</div>
    <p class="reason-card__text">${CONFIG.reasons[index]}</p>
  `;
  reasonList.appendChild(card);
  reasonList.scrollTop = reasonList.scrollHeight;

  if (balloonsPopped === 5) {
    setTimeout(() => {
      document.getElementById("balloons-done").style.display = "flex";
      document.getElementById("balloons-done").style.opacity = "0";
      // Animate in
      requestAnimationFrame(() => {
        document.getElementById("balloons-done").style.transition = "opacity 0.5s ease";
        document.getElementById("balloons-done").style.opacity = "1";
      });
    }, 500);
  }
}

// ============================================
//  TYPEWRITER EFFECT
// ============================================
let typewriterTimeout = null;

function startTypewriter() {
  const container = document.getElementById("letter-text");
  container.innerHTML = "";

  const fullText = CONFIG.letter.join("\n\n");
  let charIndex = 0;

  // Add cursor
  const cursor = document.createElement("span");
  cursor.className = "cursor";
  container.appendChild(cursor);

  function typeNext() {
    if (charIndex < fullText.length) {
      const char = fullText[charIndex];

      if (char === "\n") {
        container.insertBefore(document.createElement("br"), cursor);
      } else {
        const textNode = document.createTextNode(char);
        container.insertBefore(textNode, cursor);
      }

      charIndex++;

      // Variable speed
      let delay = 30;
      if (char === "." || char === "!" || char === "?") delay = 300;
      else if (char === ",") delay = 150;
      else if (char === "—") delay = 200;
      else if (char === "\n") delay = 100;

      typewriterTimeout = setTimeout(typeNext, delay);
    } else {
      // Done typing
      cursor.remove();
      showLetterSignoff();
    }
  }

  setTimeout(typeNext, 600);
}

function showLetterSignoff() {
  const signoff = document.getElementById("letter-signoff");
  signoff.style.opacity = "1";

  const continueBtn = document.getElementById("letter-continue");
  setTimeout(() => {
    continueBtn.style.display = "";
    continueBtn.style.opacity = "0";
    requestAnimationFrame(() => {
      continueBtn.style.transition = "opacity 0.5s ease";
      continueBtn.style.opacity = "1";
    });
  }, 800);
}

// ============================================
//  PHOTO LOADING
// ============================================
function loadPhotos() {
  if (!CONFIG.photos || CONFIG.photos.length === 0) return;

  const container = document.getElementById("letter-photos");
  container.innerHTML = "";
  let loaded = 0;

  CONFIG.photos.forEach((path, i) => {
    const img = new Image();
    img.src = path;
    img.loading = "lazy";
    img.alt = `Photo ${i + 1}`;
    img.onload = () => {
      loaded++;
      const polaroid = document.createElement("div");
      polaroid.className = "polaroid";
      const rotations = [-4, 2, -2, 3];
      polaroid.style.setProperty("--rotate", `${rotations[i % 4]}deg`);
      polaroid.appendChild(img);
      container.appendChild(polaroid);

      if (loaded > 0) {
        container.style.display = "flex";
      }
    };
    img.onerror = () => {
      // Skip missing photos silently
    };
  });
}

// ============================================
//  REPLAY
// ============================================
function replay() {
  // Reset all states
  currentScreen = 0;
  isTransitioning = false;
  candlesBlown = false;
  balloonsPopped = 0;

  // Reset all screen animations
  document.querySelectorAll(".animate-in").forEach((el) => {
    el.classList.remove("animate-in");
  });

  // Reset flames
  document.querySelectorAll(".flame").forEach((f) => f.classList.remove("blown-out"));
  document.querySelectorAll(".smoke").forEach((s) => {
    s.classList.remove("show");
    s.style.opacity = "0";
  });

  // Reset cake sections
  document.getElementById("cake-blow").style.display = "";
  document.getElementById("cake-done").style.display = "none";
  document.getElementById("cake-done").classList.remove("show");
  document.getElementById("cake-continue").style.display = "none";

  // Reset balloons
  document.getElementById("balloon-arena").innerHTML = "";
  document.getElementById("reason-list").innerHTML = "";
  document.getElementById("balloons-done").style.display = "none";

  // Reset letter
  document.getElementById("letter-text").innerHTML = "";
  document.getElementById("letter-signoff").style.opacity = "0";
  document.getElementById("letter-continue").style.display = "none";
  document.getElementById("letter-photos").style.display = "none";

  // Clear typewriter
  if (typewriterTimeout) clearTimeout(typewriterTimeout);

  // Hide all screens
  document.querySelectorAll(".screen").forEach((s) => {
    s.classList.remove("active", "exiting");
  });

  // Hide top bar and progress
  document.getElementById("top-bar").classList.remove("visible");
  document.getElementById("progress").classList.remove("visible");

  // Show opening
  document.getElementById("screen-0").classList.add("active");
  animateScreen(0);
}

// ============================================
//  WINDOW RESIZE HANDLING
// ============================================
window.addEventListener("resize", () => {
  if (confettiCanvas) {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
});
