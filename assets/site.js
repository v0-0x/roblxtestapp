// Aniko's site: themes, the menu, downloads from GitHub's releases, and the feedback page.
// No libraries and no tracking. The only outside request is GitHub's public API.
(() => {
  "use strict"

  // ---- Settings you may want to change ----
  const REPO = "v0-0x/Aniko" // where releases and feedback live
  const DISCORD_URL = "" // paste an invite link to show "Post in Discord" on the feedback page
  // -----------------------------------------

  const API = `https://api.github.com/repos/${REPO}`
  const WEB = `https://github.com/${REPO}`
  const $ = (s, r = document) => r.querySelector(s)
  const $$ = (s, r = document) => [...r.querySelectorAll(s)]
  const root = document.documentElement

  // Builds an element: el("a", { href, class }, "text", child…). Text is never read as HTML.
  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag)
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue
      if (k === "class") n.className = v
      else n.setAttribute(k, v === true ? "" : v)
    }
    for (const k of kids.flat()) if (k != null) n.append(k)
    return n
  }
  function icon(name) {
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    s.setAttribute("class", "i")
    s.setAttribute("aria-hidden", "true")
    const u = document.createElementNS("http://www.w3.org/2000/svg", "use")
    u.setAttribute("href", `assets/icons.svg#${name}`)
    s.append(u)
    return s
  }
  const store = {
    get(k) { try { return localStorage.getItem(k) } catch { return null } },
    set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v) } catch {} },
  }

  // ---- Themes: the app's eight, and a holiday's accent on top ----
  function applyTheme(id, accent) {
    if (id && id !== "aniko") root.dataset.theme = id
    else delete root.dataset.theme
    if (accent) root.style.setProperty("--brand", accent)
    else root.style.removeProperty("--brand")
    $$("[data-theme-pick]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.themePick === (id || "aniko"))))
    $$("[data-accent-pick]").forEach(b => b.setAttribute("aria-pressed", String(!!accent && b.dataset.accentPick === accent)))
  }
  let theme = store.get("aniko-site-theme") || "aniko"
  let accent = store.get("aniko-site-accent") || ""
  applyTheme(theme, accent)
  $$("[data-theme-pick]").forEach(b => b.addEventListener("click", () => {
    theme = b.dataset.themePick
    accent = ""
    store.set("aniko-site-theme", theme)
    store.set("aniko-site-accent", null)
    applyTheme(theme, accent)
  }))
  $$("[data-accent-pick]").forEach(b => b.addEventListener("click", () => {
    accent = accent === b.dataset.accentPick ? "" : b.dataset.accentPick
    store.set("aniko-site-accent", accent || null)
    applyTheme(theme, accent)
  }))

  // ---- Menu on phones ----
  const toggle = $(".nav-toggle"), nav = $(".nav")
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open")
      toggle.setAttribute("aria-expanded", String(open))
    })
  }

  // ---- Sections rise in as they're reached ----
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target) }
    }), { rootMargin: "0px 0px -8% 0px" })
    $$(".rise").forEach(n => io.observe(n))
  } else $$(".rise").forEach(n => n.classList.add("in"))

  // ---- Copy buttons ----
  async function copy(text, btn) {
    try { await navigator.clipboard.writeText(text) } catch { return false }
    if (btn) {
      const was = btn.getAttribute("aria-label")
      btn.setAttribute("aria-label", "Copied")
      btn.replaceChildren(icon("check"))
      setTimeout(() => { btn.setAttribute("aria-label", was); btn.replaceChildren(icon("copy")) }, 1600)
    }
    return true
  }
  $$(".cmd button").forEach(b => b.addEventListener("click", () => copy($("code", b.parentElement).textContent, b)))

  // ---- GitHub, asked at most once every ten minutes per tab ----
  async function gh(path) {
    const key = "aniko-site:" + path
    try {
      const hit = JSON.parse(sessionStorage.getItem(key) || "null")
      if (hit && Date.now() - hit.at < 600000) return hit.data
    } catch {}
    const res = await fetch(API + path, { headers: { Accept: "application/vnd.github+json" } })
    if (!res.ok) throw new Error("GitHub answered " + res.status)
    const data = await res.json()
    try { sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), data })) } catch {}
    return data
  }

  // ---- Releases: tags are windows-v3.0.29, macos-v…, android-v…; a pre-release is a beta ----
  const cmp = (a, b) => {
    const x = a.split(".").map(Number), y = b.split(".").map(Number)
    for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0)
    return 0
  }
  function parseReleases(list) {
    const out = []
    for (const r of list) {
      const m = /^(windows|macos|android)-v(\d+(?:\.\d+)+)$/.exec(r.tag_name || "")
      if (!m || r.draft) continue
      out.push({
        os: m[1], v: m[2], beta: !!r.prerelease, date: r.published_at, url: r.html_url, body: (r.body || "").trim(),
        assets: (r.assets || []).map(a => ({ name: a.name, url: a.browser_download_url, size: a.size })),
      })
    }
    return out.sort((a, b) => cmp(b.v, a.v))
  }
  const newest = (rels, os, beta) => rels.find(r => r.os === os && (beta || !r.beta))
  const mb = n => (n / 1048576).toFixed(n < 10485760 ? 1 : 0) + " MB"
  const day = d => new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })

  function myOS() {
    const p = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || ""
    const ua = navigator.userAgent || ""
    if (/android/i.test(ua)) return "android"
    if (/win/i.test(p)) return "windows"
    if (/mac/i.test(p) && !/iphone|ipad/i.test(ua)) return "macos"
    if (/linux/i.test(p)) return "linux"
    return ""
  }
  const OS_NAME = { windows: "Windows", macos: "macOS", android: "Android TV", linux: "Arch Linux" }
  const FILES = {
    windows: [[/\.exe$/i, "Installer"], [/portable\.zip$/i, "Portable zip"]],
    macos: [[/\.dmg$/i, "Disk image"], [/\.zip$/i, "Zip"]],
    android: [[/\.apk$/i, "APK"]],
  }

  const os = myOS()
  $$("[data-download-cta]").forEach(a => {
    if (!OS_NAME[os]) return
    a.href = "download.html#" + os
    $("span", a).textContent = "Download for " + OS_NAME[os]
  })

  let releases = null
  const wantsReleases = $("[data-latest]") || $("[data-os]") || $("#releases")
  if (wantsReleases) {
    gh("/releases?per_page=100").then(list => {
      releases = parseReleases(list)
      const top = releases.find(r => !r.beta)
      if (top) $$("[data-latest]").forEach(n => { n.textContent = top.v })
      fillDownloads()
      fillRecent()
    }).catch(() => {
      const box = $("#releases")
      if (box) box.replaceChildren(el("p", { class: "empty" }, "The release list couldn't be loaded just now. ", el("a", { href: WEB + "/releases" }, "See every release on GitHub"), "."))
    })
  }

  const betaBox = $("#beta")
  if (betaBox) betaBox.addEventListener("change", fillDownloads)

  function fillDownloads() {
    if (!releases) return
    const beta = !!(betaBox && betaBox.checked)
    $$("[data-os]").forEach(card => {
      const kind = card.dataset.os
      if (kind === os) {
        card.classList.add("yours")
        const chip = $(".chip-yours", card)
        if (chip) chip.hidden = false
      }
      const r = newest(releases, kind, beta)
      if (!r) return
      const ver = $(".ver", card)
      if (ver) ver.textContent = `Version ${r.v}${r.beta ? " beta" : ""} · ${day(r.date)}`
      const row = $(".btn-row", card)
      const links = []
      for (const [re, label] of FILES[kind] || []) {
        const a = r.assets.find(x => re.test(x.name))
        if (a) links.push(el("a", { class: "btn " + (links.length ? "btn-line" : "btn-white"), href: a.url }, icon("download"), el("span", {}, label, " ", el("small", {}, mb(a.size)))))
      }
      if (row && links.length) row.replaceChildren(...links)
    })
  }

  function fillRecent() {
    const box = $("#releases")
    if (!box || !releases) return
    const byV = new Map()
    for (const r of releases) {
      const g = byV.get(r.v) || { v: r.v, beta: true, date: r.date, os: [], body: "", url: r.url }
      g.os.push(r.os)
      if (!r.beta) g.beta = false
      if (!g.body && r.body) g.body = r.body
      if (r.date < g.date) g.date = r.date
      byV.set(r.v, g)
    }
    const rows = [...byV.values()].slice(0, 12).map(g => el("article", {},
      el("header", {},
        el("h3", {}, el("a", { href: g.url }, "Aniko " + g.v)),
        el("span", { class: "chip " + (g.beta ? "chip-warn" : "chip-ok") }, g.beta ? "Beta" : "Stable"),
        ...["windows", "macos", "android"].filter(o => g.os.includes(o)).map(o => el("span", { class: "chip" }, OS_NAME[o])),
        el("time", { datetime: g.date }, day(g.date))),
      g.body ? el("div", { class: "body" }, g.body.length > 700 ? g.body.slice(0, 700).trimEnd() + "…" : g.body) : null))
    box.replaceChildren(...(rows.length ? rows : [el("p", { class: "empty" }, "No releases yet.")]))
  }

  // ---- Feedback: the form writes a GitHub issue for you; the list shows what's been asked ----
  const form = $("#feedback")
  if (form) {
    const KIND = { bug: "Problem", idea: "Idea", praise: "Like" }
    const msg = $(".form-msg", form)
    const platform = $("#f-platform"), version = $("#f-version")
    if (OS_NAME[os] && platform) platform.value = OS_NAME[os] === "Android TV" ? "Android TV / Fire TV" : OS_NAME[os]
    const text = () => {
      const d = new FormData(form)
      const kind = d.get("kind") || "bug"
      const title = `[${KIND[kind]}] ${String(d.get("title") || "").trim()}`
      const lines = [String(d.get("details") || "").trim(), "", "---"]
      if (d.get("platform")) lines.push(`**Where:** ${d.get("platform")}`)
      if (String(d.get("version") || "").trim()) lines.push(`**Aniko version:** ${String(d.get("version")).trim()}`)
      lines.push("_Sent from the feedback page._")
      return { title, body: lines.join("\n") }
    }
    form.addEventListener("submit", e => {
      e.preventDefault()
      const t = text()
      const url = `${WEB}/issues/new?title=${encodeURIComponent(t.title)}&body=${encodeURIComponent(t.body)}`
      window.open(url, "_blank", "noopener")
      msg.textContent = "GitHub opened in a new tab with your feedback filled in. Press Submit there to send it."
    })
    $("#f-copy").addEventListener("click", async () => {
      if (!form.reportValidity()) return
      const t = text()
      const ok = await copy(`${t.title}\n\n${t.body.replace(/\*\*|_/g, "")}`)
      msg.textContent = ok ? "Copied. Paste it wherever you talk to us." : "Copying isn't allowed in this browser."
    })
    const discord = $("#f-discord")
    if (discord && DISCORD_URL) { discord.href = DISCORD_URL; discord.hidden = false }
    if (version && !version.value) {
      gh("/releases?per_page=100").then(list => {
        const top = parseReleases(list).find(r => !r.beta)
        if (top && !version.value) version.placeholder = "e.g. " + top.v
      }).catch(() => {})
    }
  }

  const board = $("#board")
  if (board) {
    gh("/issues?state=open&sort=reactions-%2B1&direction=desc&per_page=40").then(list => {
      const asks = list.filter(i => !i.pull_request).slice(0, 12)
      if (!asks.length) {
        board.replaceChildren(el("p", { class: "empty" }, "Nothing has been asked for yet. Yours can be the first."))
        return
      }
      board.replaceChildren(...asks.map(i => el("a", { class: "ask", href: i.html_url },
        el("span", { class: "votes num", title: "Thumbs up on GitHub" }, icon("thumb"), String((i.reactions && i.reactions["+1"]) || 0)),
        el("span", {},
          el("b", {}, i.title.replace(/^\[(Problem|Idea|Like)\]\s*/i, "")),
          el("span", {}, `${(/^\[(Problem|Idea|Like)\]/i.exec(i.title) || [, "Feedback"])[1]} · ${day(i.created_at)} · ${i.comments} ${i.comments === 1 ? "reply" : "replies"}`)))))
    }).catch(() => {
      board.replaceChildren(el("p", { class: "empty" }, "The list couldn't be loaded just now. ", el("a", { href: WEB + "/issues" }, "See it on GitHub"), "."))
    })
  }
})()
