// The background: sparks like the one in Aniko's logo, drifting up and twinkling behind the
// page, a shooting one now and then, and a holiday's animation when one is picked (snow, bats,
// hearts, petals, fireflies, fireworks), as in the app. Drawn on one canvas behind everything.
// It stops while the tab is hidden, draws nothing moving for people who ask for less motion,
// and can be switched off at the bottom of every page.
(() => {
  "use strict"
  const canvas = document.getElementById("fx")
  if (!canvas || !canvas.getContext) return
  const ctx = canvas.getContext("2d")
  const root = document.documentElement
  const still = matchMedia("(prefers-reduced-motion: reduce)")
  const TAU = Math.PI * 2
  const rand = (a, b) => a + Math.random() * (b - a)
  const pick = xs => xs[Math.floor(Math.random() * xs.length)]

  let W = 0, H = 0, dpr = 1
  let accent = "#7c6cf2"
  let effect = ""
  let sparks = [], streaks = [], bits = [], bursts = []
  let nextStreak = 3, nextBurst = 0.4
  let px = 0, py = 0, tx = 0, ty = 0 // where the pointer pulls the sparks, eased
  let raf = 0, last = 0, t = 0

  // A small picture drawn once and stamped many times: much cheaper than drawing each shape each frame.
  function sprite(size, draw) {
    const c = document.createElement("canvas")
    c.width = c.height = size
    const g = c.getContext("2d")
    g.translate(size / 2, size / 2)
    draw(g, size / 2)
    return c
  }
  const SPARK = new Path2D("M0 -9q1.3 7.7 9 9-7.7 1.3-9 9-1.3-7.7-9-9 7.7-1.3 9-9z")
  function sparkSprite(color) {
    return sprite(64, g => {
      g.scale(2.4, 2.4)
      g.shadowColor = color
      g.shadowBlur = 8
      g.fillStyle = color
      g.fill(SPARK)
      g.shadowBlur = 0
      g.globalAlpha = 0.9
      g.fillStyle = "#fff"
      g.scale(0.45, 0.45)
      g.fill(SPARK)
    })
  }
  function glow(color, core) {
    return sprite(64, (g, r) => {
      const grad = g.createRadialGradient(0, 0, 0, 0, 0, r)
      grad.addColorStop(0, "#fff")
      grad.addColorStop(core, color)
      grad.addColorStop(1, "transparent")
      g.fillStyle = grad
      g.fillRect(-r, -r, r * 2, r * 2)
    })
  }
  const shape = (color, path, scale = 1) => sprite(64, g => { g.scale(scale, scale); g.fillStyle = color; g.fill(new Path2D(path)) })
  let S = {}
  function sprites() {
    S = {
      spark: sparkSprite(accent),
      white: sparkSprite("#ffffff"),
      snow: glow("rgb(255 255 255 / 0.85)", 0.35),
      fly: glow("#d9f99d", 0.12),
      petal: [shape("#f9a8d4", "M0 -22C12 -12 12 10 0 22C-12 10 -12 -12 0 -22Z"), shape("#fbcfe8", "M0 -22C12 -12 12 10 0 22C-12 10 -12 -12 0 -22Z")],
      heart: [shape("#f2557a", "M0 20C-26 2 -20 -20 -8 -20C-3 -20 0 -16 0 -12C0 -16 3 -20 8 -20C20 -20 26 2 0 20Z"), shape("#fb7fa0", "M0 20C-26 2 -20 -20 -8 -20C-3 -20 0 -16 0 -12C0 -16 3 -20 8 -20C20 -20 26 2 0 20Z")],
      bat: shape("#fdba74", "M0 -4C2 -8 5 -8 6 -5C12 -12 22 -10 28 -2C22 -4 19 -1 17 4C14 0 10 1 8 6C5 3 2 4 0 9C-2 4 -5 3 -8 6C-10 1 -14 0 -17 4C-19 -1 -22 -4 -28 -2C-22 -10 -12 -12 -6 -5C-5 -8 -2 -8 0 -4Z"),
      fire: ["#f5c542", "#8ab4f8", "#f472b6", "#ffffff", "#34d399"].map(c => glow(c, 0.25)),
    }
  }

  function size() {
    dpr = Math.min(2, window.devicePixelRatio || 1)
    W = window.innerWidth
    H = window.innerHeight
    canvas.width = Math.round(W * dpr)
    canvas.height = Math.round(H * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const n = Math.round(Math.min(1.2, (W * H) / (1920 * 1080)) * 84) + 16
    sparks = Array.from({ length: n }, () => newSpark(true))
    scene()
  }
  function newSpark(anywhere) {
    const z = rand(0.25, 1) // how near it is: near ones are bigger, faster and pulled more by the pointer
    return { x: rand(0, W), y: anywhere ? rand(0, H) : H + 20, z, r: rand(8, 22) * z, a: rand(0.55, 1), ph: rand(0, TAU), tw: rand(0.6, 1.9), sway: rand(0.2, 0.9), rot: rand(-0.3, 0.3), white: Math.random() < 0.35 }
  }

  // ---- A holiday's particles ----
  const many = max => Math.max(6, Math.round(Math.min(1.2, (W * H) / (1920 * 1080)) * max))
  function scene() {
    bits = []
    bursts = []
    if (effect === "snow") bits = Array.from({ length: many(130) }, () => ({ x: rand(0, W), y: rand(0, H), z: rand(0.3, 1), ph: rand(0, TAU) }))
    if (effect === "petals") bits = Array.from({ length: many(46) }, () => ({ x: rand(0, W), y: rand(0, H), z: rand(0.4, 1), ph: rand(0, TAU), rot: rand(0, TAU), spin: rand(-1.4, 1.4), s: pick(S.petal) }))
    if (effect === "hearts") bits = Array.from({ length: many(26) }, () => ({ x: rand(0, W), y: rand(0, H), z: rand(0.4, 1), ph: rand(0, TAU), s: pick(S.heart) }))
    if (effect === "fireflies") bits = Array.from({ length: many(40) }, () => ({ x: rand(0, W), y: rand(0, H), z: rand(0.4, 1), ph: rand(0, TAU), dir: rand(0, TAU), tw: rand(0.5, 1.6) }))
    if (effect === "bats") bits = Array.from({ length: many(9) }, () => newBat(true))
  }
  function newBat(anywhere) {
    const dir = Math.random() < 0.5 ? 1 : -1
    return { x: anywhere ? rand(0, W) : dir > 0 ? -60 : W + 60, y: rand(H * 0.05, H * 0.7), z: rand(0.45, 1), dir, v: rand(70, 150), ph: rand(0, TAU), flap: rand(9, 13) }
  }
  function stamp(s, x, y, w, rot, sx = 1, sy = 1) {
    if (!rot && sx === 1 && sy === 1) return ctx.drawImage(s, x - w / 2, y - w / 2, w, w)
    ctx.save()
    ctx.translate(x, y)
    if (rot) ctx.rotate(rot)
    ctx.scale(sx, sy)
    ctx.drawImage(s, -w / 2, -w / 2, w, w)
    ctx.restore()
  }
  const wind = () => Math.sin(t * 0.13) * 0.6 + Math.sin(t * 0.37 + 1.3) * 0.3 + Math.sin(t * 0.071 + 4) * 0.4

  function holiday(dt) {
    const w = wind()
    if (effect === "snow") for (const b of bits) {
      b.y += (26 + 60 * b.z) * dt
      b.x += (w * 34 * b.z + Math.sin(t * 0.9 + b.ph) * 10) * dt
      if (b.y > H + 10) { b.y = -10; b.x = rand(0, W) }
      if (b.x > W + 10) b.x = -10; else if (b.x < -10) b.x = W + 10
      ctx.globalAlpha = 0.35 + 0.6 * b.z
      stamp(S.snow, b.x, b.y, 4 + 11 * b.z)
    }
    if (effect === "petals") for (const b of bits) {
      b.y += (30 + 50 * b.z) * dt
      b.x += (w * 60 * b.z + Math.sin(t * 1.1 + b.ph) * 26) * dt
      b.rot += b.spin * dt
      if (b.y > H + 20) { b.y = -20; b.x = rand(0, W) }
      if (b.x > W + 20) b.x = -20; else if (b.x < -20) b.x = W + 20
      ctx.globalAlpha = 0.45 + 0.5 * b.z
      stamp(b.s, b.x, b.y, 10 + 16 * b.z, b.rot, 1, 0.55 + 0.45 * Math.sin(t * 2 + b.ph))
    }
    if (effect === "hearts") for (const b of bits) {
      b.y -= (18 + 42 * b.z) * dt
      b.x += Math.sin(t * 1.3 + b.ph) * 16 * dt
      if (b.y < -30) { b.y = H + 30; b.x = rand(0, W) }
      ctx.globalAlpha = (0.25 + 0.55 * b.z) * Math.min(1, b.y / (H * 0.25))
      stamp(b.s, b.x, b.y, 12 + 22 * b.z, Math.sin(t + b.ph) * 0.25)
    }
    if (effect === "fireflies") for (const b of bits) {
      b.dir += rand(-1.6, 1.6) * dt
      b.x += Math.cos(b.dir) * 22 * b.z * dt
      b.y += Math.sin(b.dir) * 16 * b.z * dt
      if (b.x < -20) b.x = W + 20; else if (b.x > W + 20) b.x = -20
      if (b.y < -20) b.y = H + 20; else if (b.y > H + 20) b.y = -20
      ctx.globalAlpha = Math.max(0, Math.sin(t * b.tw + b.ph)) ** 2 * (0.4 + 0.6 * b.z)
      stamp(S.fly, b.x, b.y, 10 + 22 * b.z)
    }
    if (effect === "bats") for (let i = 0; i < bits.length; i++) {
      const b = bits[i]
      b.x += b.dir * b.v * b.z * dt
      b.y += Math.sin(t * 1.7 + b.ph) * 24 * dt
      if (b.x < -80 || b.x > W + 80) bits[i] = newBat(false)
      ctx.globalAlpha = 0.3 + 0.4 * b.z
      stamp(S.bat, b.x, b.y, 26 + 34 * b.z, b.dir * 0.08, 1, 0.45 + 0.55 * Math.abs(Math.sin(t * b.flap + b.ph)))
    }
    if (effect === "fireworks") {
      nextBurst -= dt
      if (nextBurst <= 0) {
        nextBurst = rand(0.7, 1.9)
        const s = pick(S.fire), x = rand(W * 0.1, W * 0.9), y = rand(H * 0.1, H * 0.55), n = Math.round(rand(36, 60)), v = rand(120, 230)
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU + rand(-0.06, 0.06), u = v * rand(0.55, 1)
          bursts.push({ x, y, vx: Math.cos(a) * u, vy: Math.sin(a) * u, life: 0, max: rand(1.1, 1.9), s })
        }
      }
      ctx.globalCompositeOperation = "lighter"
      bursts = bursts.filter(b => (b.life += dt) < b.max)
      for (const b of bursts) {
        const drag = Math.exp(-1.5 * dt)
        b.vx *= drag
        b.vy = b.vy * drag + 60 * dt
        b.x += b.vx * dt
        b.y += b.vy * dt
        const k = 1 - b.life / b.max
        ctx.globalAlpha = Math.min(1, k * 1.6)
        stamp(b.s, b.x, b.y, 8 + 16 * k)
      }
      ctx.globalCompositeOperation = "source-over"
    }
    ctx.globalAlpha = 1
  }

  // ---- One frame ----
  function frame(dt, moving) {
    ctx.clearRect(0, 0, W, H)
    px += (tx - px) * Math.min(1, dt * 3)
    py += (ty - py) * Math.min(1, dt * 3)
    const quiet = effect ? 0.45 : 1 // a holiday takes the stage
    for (const s of sparks) {
      if (moving) {
        s.y -= (5 + 16 * s.z) * dt
        s.x += Math.sin(t * s.sway + s.ph) * 5 * dt
        if (s.y < -20) Object.assign(s, newSpark(false))
      }
      const tw = 0.5 + 0.5 * Math.sin(t * s.tw + s.ph)
      ctx.globalAlpha = s.a * (0.2 + 0.8 * tw * tw) * quiet
      stamp(s.white ? S.white : S.spark, s.x + px * s.z * 26, s.y + py * s.z * 18, s.r * (0.75 + 0.35 * tw), s.rot)
    }
    if (moving) {
      nextStreak -= dt
      if (nextStreak <= 0 && !effect) {
        nextStreak = rand(3.5, 8)
        const dir = Math.random() < 0.5 ? 1 : -1
        streaks.push({ x: dir > 0 ? rand(-0.1, 0.6) * W : rand(0.4, 1.1) * W, y: rand(-0.05, 0.4) * H, vx: dir * rand(520, 820), vy: rand(200, 340), life: 0, max: rand(0.7, 1.1) })
      }
      streaks = streaks.filter(s => (s.life += dt) < s.max)
      for (const s of streaks) {
        s.x += s.vx * dt
        s.y += s.vy * dt
        const k = Math.sin((s.life / s.max) * Math.PI)
        const len = 0.16
        const g = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * len, s.y - s.vy * len)
        g.addColorStop(0, "rgb(255 255 255 / " + 0.9 * k + ")")
        g.addColorStop(0.25, accent)
        g.addColorStop(1, "transparent")
        ctx.globalAlpha = k
        ctx.strokeStyle = g
        ctx.lineWidth = 1.6
        ctx.lineCap = "round"
        ctx.beginPath()
        ctx.moveTo(s.x, s.y)
        ctx.lineTo(s.x - s.vx * len, s.y - s.vy * len)
        ctx.stroke()
        stamp(S.white, s.x, s.y, 16 * k)
      }
      holiday(dt)
    }
    ctx.globalAlpha = 1
  }

  function tick(now) {
    raf = requestAnimationFrame(tick)
    const dt = Math.min(0.05, (now - last) / 1000 || 0)
    last = now
    t += dt
    frame(dt, true)
  }
  function start() {
    cancelAnimationFrame(raf)
    raf = 0
    if (root.classList.contains("fx-off")) return ctx.clearRect(0, 0, W, H)
    if (still.matches) return frame(0, false) // the sparks, standing still
    if (document.hidden) return
    last = performance.now()
    raf = requestAnimationFrame(tick)
  }

  // ---- What the rest of the site tells it (assets/site.js) ----
  function look() {
    const c = getComputedStyle(root).getPropertyValue("--brand").trim()
    if (c && c !== accent) { accent = c; sprites() }
  }
  window.addEventListener("aniko-look", e => {
    look()
    const next = (e.detail && e.detail.effect) || ""
    if (next !== effect) { effect = next; scene() }
    start()
  })
  window.addEventListener("resize", () => { size(); start() })
  document.addEventListener("visibilitychange", start)
  still.addEventListener("change", start)
  window.addEventListener("pointermove", e => {
    if (e.pointerType === "touch") return
    tx = e.clientX / W - 0.5
    ty = e.clientY / H - 0.5
  }, { passive: true })

  look()
  sprites()
  try { effect = localStorage.getItem("aniko-site-effect") || "" } catch {}
  size()
  start()
})()
