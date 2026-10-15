/**
 * Zenith '26 Festival Celebration Effects
 * Features:
 *  1. High-octane Firecrackers / Fireworks Canvas Engine with sparkler trails & multi-stage bursts.
 *  2. Running College Fest Parade: Students, dancers, guitarists, bots, and flag-bearers sprinting from left to right.
 *  3. Interactive "Cracker Frenzy" & "Crowd Rush" turbo triggers.
 *  4. Optional Web Audio crackle/pop sound synthesis (toggleable, default off/sound-friendly).
 */

(function () {
  // Create & mount fireworks canvas
  const canvas = document.createElement("canvas");
  canvas.id = "fest-fireworks-canvas";
  canvas.className = "fixed inset-0 pointer-events-none z-40 w-full h-full";
  document.body.prepend(canvas);

  const ctx = canvas.getContext("2d");
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener("resize", () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  // Sound Engine using Web Audio API (zero external assets needed)
  let audioCtx = null;
  let soundEnabled = false;

  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioCtx = new AudioContext();
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  }

  function playCrackerSound() {
    if (!soundEnabled || !audioCtx) return;
    try {
      const now = audioCtx.currentTime;
      // Synthesize quick explosion noise
      const bufferSize = audioCtx.sampleRate * 0.15;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
      }

      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;

      const filter = audioCtx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(800 + Math.random() * 600, now);
      filter.Q.setValueAtTime(1.5, now);

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);

      noise.start(now);
    } catch (_) {}
  }

  // --- FIRECRACKERS & FIREWORKS SYSTEM ---
  const particles = [];
  const rockets = [];

  class CrackerRocket {
    constructor(targetX, targetY) {
      this.x = Math.random() * width * 0.8 + width * 0.1;
      this.y = height + 10;
      this.targetX = targetX || Math.random() * width * 0.8 + width * 0.1;
      this.targetY = targetY || Math.random() * (height * 0.5) + height * 0.1;
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const speed = 12 + Math.random() * 6;
      this.vx = (dx / dist) * speed;
      this.vy = (dy / dist) * speed;
      this.color = `hsl(${Math.floor(Math.random() * 360)}, 100%, 65%)`;
      this.trail = [];
    }

    update() {
      this.trail.push({ x: this.x, y: this.y, alpha: 1 });
      if (this.trail.length > 5) this.trail.shift();

      this.x += this.vx;
      this.y += this.vy;

      // Rocket reached target or apex
      if (this.vy < 0 && this.y <= this.targetY) {
        explodeCracker(this.x, this.y, this.color);
        return false;
      }
      return true;
    }

    draw() {
      // Draw sizzle trail
      ctx.beginPath();
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2.5;
      for (let i = 0; i < this.trail.length - 1; i++) {
        const p1 = this.trail[i];
        const p2 = this.trail[i + 1];
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
      }
      ctx.stroke();

      // Rocket head glow
      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  class CrackerParticle {
    constructor(x, y, hue, isFlash = false) {
      this.x = x;
      this.y = y;
      const angle = Math.random() * Math.PI * 2;
      const speed = isFlash ? Math.random() * 9 + 4 : Math.random() * 6 + 1.5;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.gravity = 0.12;
      this.friction = 0.96;
      this.alpha = 1;
      this.decay = Math.random() * 0.02 + 0.015;
      this.hue = hue;
      this.size = Math.random() * 3.5 + 1.5;
      this.sparkle = Math.random() > 0.4;
    }

    update() {
      this.vx *= this.friction;
      this.vy *= this.friction;
      this.vy += this.gravity;
      this.x += this.vx;
      this.y += this.vy;
      this.alpha -= this.decay;
      return this.alpha > 0;
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.alpha);
      const lightness = this.sparkle && Math.random() > 0.5 ? "90%" : "60%";
      ctx.fillStyle = `hsl(${this.hue}, 100%, ${lightness})`;
      ctx.shadowColor = `hsl(${this.hue}, 100%, 50%)`;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function explodeCracker(x, y, color) {
    playCrackerSound();
    const baseHue = parseInt(color.replace(/[^0-9]/g, "")) || Math.floor(Math.random() * 360);
    const particleCount = 45 + Math.floor(Math.random() * 25);

    for (let i = 0; i < particleCount; i++) {
      const hueVariance = baseHue + (Math.random() * 40 - 20);
      particles.push(new CrackerParticle(x, y, hueVariance, i < 15));
    }

    // Flash ring effect
    createFlashRing(x, y, `hsl(${baseHue}, 100%, 70%)`);
  }

  // Expanding shockwave ring
  const rings = [];
  function createFlashRing(x, y, color) {
    rings.push({ x, y, radius: 2, maxRadius: 35 + Math.random() * 25, alpha: 1, color });
  }

  function animateFireworks() {
    ctx.clearRect(0, 0, width, height);

    // Update & draw shockwaves
    for (let i = rings.length - 1; i >= 0; i--) {
      const ring = rings[i];
      ring.radius += 2.8;
      ring.alpha -= 0.045;
      if (ring.alpha <= 0 || ring.radius >= ring.maxRadius) {
        rings.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.strokeStyle = ring.color;
      ctx.globalAlpha = ring.alpha;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Update & draw rockets
    for (let i = rockets.length - 1; i >= 0; i--) {
      if (!rockets[i].update()) {
        rockets.splice(i, 1);
      } else {
        rockets[i].draw();
      }
    }

    // Update & draw particles
    for (let i = particles.length - 1; i >= 0; i--) {
      if (!particles[i].update()) {
        particles.splice(i, 1);
      } else {
        particles[i].draw();
      }
    }

    requestAnimationFrame(animateFireworks);
  }
  requestAnimationFrame(animateFireworks);

  // Periodic automatic fireworks
  let autoRocketInterval = setInterval(() => {
    if (document.hidden) return;
    rockets.push(new CrackerRocket());
  }, 2200);

  // Manual launch on click
  window.addEventListener("click", (e) => {
    // Only launch if not clicking interactive forms or buttons
    if (e.target.closest("button, input, select, textarea, a, form")) return;
    initAudio();
    rockets.push(new CrackerRocket(e.clientX, e.clientY));
  });

  // Rapid frenzy barrage trigger
  window.triggerCrackerBarrage = function (count = 6) {
    initAudio();
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        rockets.push(new CrackerRocket());
      }, i * 160);
    }
  };

  // --- RUNNING PEOPLE FESTIVAL PARADE ENGINE ---
  // A lineup of animated characters running across the screen from left to right!
  const characters = [
    {
      role: "Hackathon Champion",
      avatar: "🏃‍♂️",
      prop: "💻⚡",
      shout: "Code golf submission in 2 mins!",
      color: "from-sky-500 to-indigo-600",
      speed: 1.15,
    },
    {
      role: "Fest Coordinator",
      avatar: "🏃‍♀️",
      prop: "🚩 ZENITH '26",
      shout: "Main stage starting NOW!",
      color: "from-amber-400 to-rose-500",
      speed: 1.0,
    },
    {
      role: "Rockstar Band Leader",
      avatar: "🎸",
      prop: "🔥 Decibel",
      shout: "Amphitheatre sound check!",
      color: "from-fuchsia-500 to-pink-600",
      speed: 1.25,
    },
    {
      role: "Street Crew Dancer",
      avatar: "💃",
      prop: "✨ Nritya",
      shout: "Dance crew assembled!",
      color: "from-emerald-400 to-teal-600",
      speed: 1.1,
    },
    {
      role: "RoboWars Pilot",
      avatar: "🤖",
      prop: "⚙️ RoboWars",
      shout: "Spinner bot spinning up!!",
      color: "from-cyan-400 to-blue-600",
      speed: 1.35,
    },
    {
      role: "Esports Pro",
      avatar: "🎮",
      prop: "🏆 Valorant",
      shout: "Match point on LAN!",
      color: "from-violet-500 to-purple-600",
      speed: 0.95,
    },
    {
      role: "Striker Athlete",
      avatar: "⚽",
      prop: "⚡ Futsal",
      shout: "Penalty shootout ready!",
      color: "from-yellow-400 to-orange-500",
      speed: 1.2,
    },
    {
      role: "Hype Mascot",
      avatar: "🦁",
      prop: "🎉 FEST VIBES",
      shout: "LET'S GOOOOO ZENITH!!",
      color: "from-rose-500 to-amber-500",
      speed: 1.05,
    },
  ];

  // Inject CSS animations for running parade & floating cracker sparks
  const style = document.createElement("style");
  style.id = "fest-celebration-styles";
  style.textContent = `
    @keyframes runAcrossScreen {
      0% {
        transform: translateX(-150px) translateY(0);
      }
      25% {
        transform: translateX(25vw) translateY(-8px);
      }
      50% {
        transform: translateX(50vw) translateY(0);
      }
      75% {
        transform: translateX(75vw) translateY(-10px);
      }
      100% {
        transform: translateX(calc(100vw + 160px)) translateY(0);
      }
    }

    @keyframes legBob {
      0%, 100% { transform: translateY(0) rotate(-3deg); }
      50% { transform: translateY(-7px) rotate(4deg); }
    }

    @keyframes crackerFlicker {
      0%, 100% { transform: scale(1) rotate(0deg); filter: drop-shadow(0 0 6px rgba(245, 158, 11, 0.8)); }
      50% { transform: scale(1.15) rotate(8deg); filter: drop-shadow(0 0 16px rgba(236, 72, 153, 0.9)); }
    }

    @keyframes puffDust {
      0% { opacity: 0.8; transform: scale(0.6) translateX(0); }
      100% { opacity: 0; transform: scale(1.4) translateX(-20px); }
    }

    .fest-runner-item {
      position: absolute;
      will-change: transform;
      animation-name: runAcrossScreen;
      animation-timing-function: linear;
      animation-iteration-count: infinite;
    }

    .fest-runner-sprite {
      animation: legBob 0.38s ease-in-out infinite;
    }

    .fest-cracker-badge {
      animation: crackerFlicker 1.4s ease-in-out infinite;
    }

    .fest-turbo .fest-runner-item {
      animation-duration: 4.5s !important;
    }
  `;
  document.head.appendChild(style);

  // Create the Running People Parade track
  function createParadeTrack() {
    const paradeContainer = document.createElement("div");
    paradeContainer.id = "fest-parade-track";
    paradeContainer.className =
      "relative w-full h-24 overflow-hidden border-y border-violet-500/30 bg-gradient-to-r from-violet-950/60 via-slate-900/90 to-fuchsia-950/60 backdrop-blur-sm select-none my-6 shadow-inner pointer-events-auto";

    paradeContainer.innerHTML = `
      <!-- Track Label & Controls -->
      <div class="absolute left-3 top-2 z-20 flex items-center gap-2">
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 shadow-md fest-cracker-badge">
          🧨 Zenith '26 Parade
        </span>
        <button
          id="frenzy-boost-btn"
          type="button"
          class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-violet-600 hover:bg-violet-500 text-white shadow active:scale-95 transition flex items-center gap-1"
          title="Make everyone sprint at 2x speed and fire crackers!"
        >
          <span>⚡</span>
          <span>Turbo Rush!</span>
        </button>
        <button
          id="sound-toggle-btn"
          type="button"
          class="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-95 transition flex items-center gap-1"
          title="Toggle Cracker Sounds"
        >
          <span id="sound-icon">🔇</span>
          <span id="sound-label">Cracker Sound</span>
        </button>
      </div>

      <!-- Live Running Track Lane -->
      <div id="parade-lane" class="absolute inset-0 flex items-center"></div>

      <!-- Track Ground Floor Finish Line Ribbon -->
      <div class="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-violet-500 via-amber-400 to-fuchsia-500 opacity-70"></div>
    `;

    // Insert parade right under the Hero section or at top of main
    const heroSection = document.querySelector("section");
    if (heroSection && heroSection.nextSibling) {
      heroSection.parentNode.insertBefore(paradeContainer, heroSection.nextSibling);
    } else {
      document.body.prepend(paradeContainer);
    }

    const lane = paradeContainer.querySelector("#parade-lane");
    const boostBtn = paradeContainer.querySelector("#frenzy-boost-btn");
    const soundBtn = paradeContainer.querySelector("#sound-toggle-btn");
    const soundIcon = paradeContainer.querySelector("#sound-icon");
    const soundLabel = paradeContainer.querySelector("#sound-label");

    // Spawn runners
    characters.forEach((char, index) => {
      const runner = document.createElement("div");
      runner.className = "fest-runner-item flex items-center gap-1.5 cursor-pointer";
      // Stagger run durations and delays so crowd is constantly pouring across
      const duration = (9.5 + Math.random() * 4) / char.speed;
      const delay = index * 1.8;
      runner.style.animationDuration = `${duration.toFixed(2)}s`;
      runner.style.animationDelay = `-${delay.toFixed(2)}s`;
      runner.style.bottom = `${8 + (index % 3) * 7}px`;

      runner.innerHTML = `
        <!-- Floating Speech Bubble -->
        <div class="hidden sm:block absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-md bg-slate-900/90 border border-violet-400/40 text-[10px] font-bold text-violet-200 shadow-lg pointer-events-none">
          ${escapeHtml(char.shout)}
        </div>

        <!-- Running Character Sprite -->
        <div class="fest-runner-sprite flex items-center gap-1">
          <span class="text-3xl filter drop-shadow">${char.avatar}</span>
          <div class="flex flex-col">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-gradient-to-r ${char.color} text-white shadow whitespace-nowrap">
              ${escapeHtml(char.prop)}
            </span>
          </div>
          <!-- Wind trail -->
          <span class="text-xs opacity-75 animate-pulse">💨</span>
        </div>
      `;

      // Clicking any runner causes cracker explosion above them
      runner.addEventListener("click", (e) => {
        e.stopPropagation();
        const rect = runner.getBoundingClientRect();
        initAudio();
        explodeCracker(rect.left + 30, rect.top - 20, "hsl(45, 100%, 60%)");
      });

      lane.appendChild(runner);
    });

    // Turbo Boost logic
    let isTurbo = false;
    boostBtn.addEventListener("click", () => {
      initAudio();
      isTurbo = !isTurbo;
      paradeContainer.classList.toggle("fest-turbo", isTurbo);

      if (isTurbo) {
        boostBtn.className =
          "px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/50 active:scale-95 transition flex items-center gap-1 animate-pulse";
        boostBtn.innerHTML = "<span>🔥</span><span>TURBO ACTIVE!</span>";
        // Launch a massive fireworks celebration
        triggerCrackerBarrage(8);
      } else {
        boostBtn.className =
          "px-2.5 py-1 rounded-full text-[11px] font-bold bg-violet-600 hover:bg-violet-500 text-white shadow active:scale-95 transition flex items-center gap-1";
        boostBtn.innerHTML = "<span>⚡</span><span>Turbo Rush!</span>";
      }
    });

    // Sound toggle logic
    soundBtn.addEventListener("click", () => {
      initAudio();
      soundEnabled = !soundEnabled;
      if (soundEnabled) {
        soundIcon.textContent = "🔊";
        soundLabel.textContent = "Sound: ON";
        soundBtn.classList.replace("bg-slate-800", "bg-emerald-600");
        soundBtn.classList.replace("text-slate-200", "text-white");
        playCrackerSound();
      } else {
        soundIcon.textContent = "🔇";
        soundLabel.textContent = "Sound: OFF";
        soundBtn.classList.replace("bg-emerald-600", "bg-slate-800");
        soundBtn.classList.replace("text-white", "text-slate-200");
      }
    });
  }

  // Helper escape
  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Mount parade once DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createParadeTrack);
  } else {
    createParadeTrack();
  }
})();
