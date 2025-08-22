/*
  Полная версия script.js: автозвук, молнии, дождь, вспышки и пад. звёзды.
*/
window.addEventListener("load", () => {
  const svgStrikes = document.getElementById("strikes");
  const thunder = document.getElementById("thunderSound");
  const bgAudio = document.getElementById("bg-audio");
  const infoPanel = document.getElementById("infoPanel");

  const cfg = { color: "#ffffff", glow: true, baseWidth: 1.6, soundEnabled: true, soundVolume: 0.75 };

  function safePlay(el, vol = 1) {
    if (!el) return Promise.resolve();
    try { 
      el.currentTime = 0; 
      el.volume = Math.max(0, Math.min(1, vol)); 
      return el.play().catch(()=>{}); 
    } catch(e){ 
      return Promise.resolve(); 
    }
  }

  // --- Вспышка ---
  function flashScreen() {
    const flash = document.createElement("div");
    flash.style.position = "fixed";
    flash.style.top = "0";
    flash.style.left = "0";
    flash.style.width = "100%";
    flash.style.height = "100%";
    flash.style.background = "white";
    flash.style.opacity = "0.8";
    flash.style.zIndex = "9999";
    flash.style.pointerEvents = "none";
    document.body.appendChild(flash);
    setTimeout(() => {
      flash.style.transition = "opacity 300ms ease-out";
      flash.style.opacity = "0";
    }, 50);
    setTimeout(() => flash.remove(), 400);
  }

  // --- молнии: цикл ---
  let lightningTimer = null;
  function lightningTick(){
    if (Math.random() < 0.28) createLightning(false);
    if (Math.random() < 0.06) { 
      createLightning(false); 
      setTimeout(()=>createLightning(false),120); 
      setTimeout(()=>createLightning(false),260); 
    }
  }
  function startLightningLoop(){ if (lightningTimer) return; lightningTimer = setInterval(lightningTick, 900); }
  function stopLightningLoop(){ if (!lightningTimer) return; clearInterval(lightningTimer); lightningTimer = null; }

  function playThunderWithPause(vol = cfg.soundVolume){
    if (!thunder || !cfg.soundEnabled) return;
    stopLightningLoop();
    let resumed = false;
    const resume = ()=>{ if (resumed) return; resumed = true; startLightningLoop(); };
    const onEnded = ()=> resume();
    thunder.addEventListener("ended", onEnded, { once: true });
    const durMs = (isFinite(thunder.duration) && thunder.duration>0) ? thunder.duration*1000 : 2000;
    const fallback = setTimeout(()=>{ thunder.removeEventListener("ended", onEnded); resume(); }, durMs + 400);
    thunder.addEventListener("ended", ()=> clearTimeout(fallback), { once: true });
    safePlay(thunder, vol);
    flashScreen(); // <-- добавили вспышку синхронно со звуком
  }

  function createLightning(playSound = false){
    if (!svgStrikes) return;
    const w = window.innerWidth, h = window.innerHeight, x = Math.random()*w;
    const poly = document.createElementNS("http://www.w3.org/2000/svg","polyline");
    const pts = [
      `${x},0`,
      `${x + (Math.random()>0.5?40:-40)},${h*0.22 + Math.random()*h*0.08}`,
      `${x + (Math.random()>0.5?-30:30)},${h*0.48 + Math.random()*h*0.06}`,
      `${x + (Math.random()>0.5?20:-20)},${h}`
    ].join(" ");
    poly.setAttribute("points", pts);
    poly.setAttribute("stroke", cfg.color);
    poly.setAttribute("stroke-width", String(cfg.baseWidth + Math.random()*3));
    poly.setAttribute("fill", "none");
    if (cfg.glow) poly.setAttribute("filter", "url(#glow)");
    svgStrikes.appendChild(poly);

    const clone = poly.cloneNode();
    clone.setAttribute("stroke-width", String((Number(poly.getAttribute("stroke-width"))||2)+2));
    clone.style.opacity = "0.92";
    svgStrikes.appendChild(clone);

    setTimeout(()=>{ if (clone.parentNode) clone.parentNode.removeChild(clone); }, 180);
    setTimeout(()=>{ poly.style.transition = "opacity 220ms ease-out"; poly.style.opacity = "0"; }, 80);
    setTimeout(()=>{ if (poly.parentNode) poly.parentNode.removeChild(poly); }, 420);

    if (playSound && cfg.soundEnabled) playThunderWithPause(cfg.soundVolume);
  }

  // падающие звезды
  function shootingStar(){
    const s = document.createElement("div"); s.className = "shooting-star";
    s.style.left = `${Math.random()*window.innerWidth}px`;
    s.style.top = `${Math.random()*window.innerHeight*0.35}px`;
    const dur = 700 + Math.random()*1200; s.style.animationDuration = `${dur}ms`;
    document.body.appendChild(s);
    s.addEventListener("animationend", ()=> s.remove());
    setTimeout(()=> { if (s.parentNode) s.parentNode.removeChild(s); }, dur+200);
  }
  const starTimer = setInterval(()=>{ if (Math.random() < 0.38) shootingStar(); }, 1200);

  // дождь (canvas)
  let canvas = document.getElementById("rain");
  function ensureCanvas(){
    if (!canvas){ 
      canvas = document.createElement("canvas"); 
      canvas.id = "rain"; 
      canvas.style.position="fixed"; 
      canvas.style.top="0"; 
      canvas.style.left="0"; 
      canvas.style.width="100%"; 
      canvas.style.height="100%"; 
      canvas.style.pointerEvents="none"; 
      canvas.style.zIndex="8"; 
      document.body.appendChild(canvas); 
    }
    return canvas.getContext && canvas.getContext("2d") ? canvas.getContext("2d") : null;
  }
  const ctx = ensureCanvas();
  if (ctx){
    function resize(){ canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resize(); window.addEventListener("resize", resize);
    class Drop{ 
      constructor(){ this.reset(true); } 
      reset(init=false){ this.x=Math.random()*canvas.width; this.y = init ? Math.random()*canvas.height : -10 - Math.random()*200; this.len=10+Math.random()*25; this.speed=4+Math.random()*6; this.alpha=0.12+Math.random()*0.28; } 
      draw(){ ctx.beginPath(); ctx.moveTo(this.x,this.y); ctx.lineTo(this.x,this.y+this.len); ctx.strokeStyle=`rgba(173,216,230,${this.alpha})`; ctx.lineWidth=1; ctx.stroke(); } 
      update(){ this.y += this.speed; if(this.y>canvas.height) this.reset(); this.draw(); } 
    }
    const drops=[]; const count = Math.min(600, Math.floor(window.innerWidth/3)); 
    for(let i=0;i<count;i++) drops.push(new Drop());
    (function loop(){ ctx.clearRect(0,0,canvas.width,canvas.height); drops.forEach(d=>d.update()); requestAnimationFrame(loop); })();
  }

  // клик = молния+звук
  document.addEventListener("click", e=>{
    if (e.target && (e.target.closest('a') || e.target.closest('button'))) return;
    createLightning(true);
  });

  // --- Автозвук с mute/unmute ---
  if (bgAudio) {
    bgAudio.muted = true;
    bgAudio.loop = true;
    safePlay(bgAudio);

    // через полсекунды включаем громкость
    setTimeout(() => {
      bgAudio.muted = false;
      bgAudio.volume = 0.6;
    }, 500);

    // если браузер не дал — пробуем ещё при клике
    const kick = () => {
      safePlay(bgAudio);
      bgAudio.muted = false;
      bgAudio.volume = 0.6;
      document.removeEventListener("click", kick);
      document.removeEventListener("touchstart", kick);
    };
    document.addEventListener("click", kick, { once: true });
    document.addEventListener("touchstart", kick, { once: true });
  }

  // панели управления
  function openInfo(){ if (!infoPanel) return; infoPanel.classList.add("show"); infoPanel.setAttribute("aria-hidden","false"); }
  function closeInfo(){ if (!infoPanel) return; infoPanel.classList.remove("show"); infoPanel.setAttribute("aria-hidden","true"); }
  window.openInfo = openInfo; window.closeInfo = closeInfo;

  // старт
  startLightningLoop();

  // очистка
  window.addEventListener("beforeunload", ()=>{ clearInterval(starTimer); stopLightningLoop(); });
});
document.addEventListener("DOMContentLoaded", () => {
  const thunder = document.getElementById("thunderSound");
  const strikes = document.getElementById("strikes");

  // Попробуем запустить звук грома в фоне
  thunder.volume = 0.5;
  const tryPlay = () => {
    thunder.play().catch(() => {
      console.log("Автовоспроизведение ограничено, но будет работать после первого взаимодействия.");
    });
  };
  tryPlay();

  // Эффект молнии
  function lightningStrike() {
    const x = Math.random() * window.innerWidth;
    const y = Math.random() * window.innerHeight / 2;

    const bolt = document.createElementNS("http://www.w3.org/2000/svg", "line");
    bolt.setAttribute("x1", x);
    bolt.setAttribute("y1", 0);
    bolt.setAttribute("x2", x + (Math.random() * 100 - 50));
    bolt.setAttribute("y2", y);
    bolt.setAttribute("stroke", "white");
    bolt.setAttribute("stroke-width", "2");
    bolt.setAttribute("filter", "url(#glow)");

    strikes.appendChild(bolt);

    document.body.classList.add("flash");
    setTimeout(() => document.body.classList.remove("flash"), 100);

    thunder.currentTime = 0;
    thunder.play();

    setTimeout(() => strikes.removeChild(bolt), 300);
  }

  // Случайные молнии
  setInterval(() => {
    if (Math.random() > 0.7) lightningStrike();
  }, 2000);

  // Дрожание кнопок (рандомно)
  const buttons = document.querySelectorAll(".glass-btn");
  setInterval(() => {
    const btn = buttons[Math.floor(Math.random() * buttons.length)];
    if (btn) {
      btn.classList.add("shake");
      setTimeout(() => btn.classList.remove("shake"), 500);
    }
  }, 4000);
});
