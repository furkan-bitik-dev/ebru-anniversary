// ============================================
// BİR AY — Ebru'ya
// Hearts generator + page loader + reveal-on-scroll
// ============================================

(function () {
  "use strict";

  /* ================================================================
     1. GLOBAL FLOATING HEARTS — populate #hearts-bg with 35 hearts.
        Random sizes, colors, durations, delays (negative so they're
        already mid-flight on page load — NO empty screen).
     ================================================================ */
  function createHearts() {
    const container = document.getElementById("hearts-bg");
    if (!container) {
      console.warn("[hearts] #hearts-bg not found in DOM");
      return;
    }

    const COLORS = [
      "rgba(212, 168, 83, 0.22)",   // gold
      "rgba(201, 149, 106, 0.20)",  // amber
      "rgba(139, 26, 58, 0.28)",    // deep rose
      "rgba(255, 182, 193, 0.18)"   // soft pink
    ];

    const COUNT = 35;
    const rand = (min, max) => Math.random() * (max - min) + min;

    // Build all 35 hearts in a DocumentFragment for one DOM write
    const frag = document.createDocumentFragment();
    for (let i = 0; i < COUNT; i++) {
      const span = document.createElement("span");
      span.className = "heart";
      span.innerHTML = "&#9829;"; // ♥

      const left      = rand(0, 98);                                // 0% to 98%
      const fontSize  = rand(0.6, 2.4).toFixed(2);                  // 0.6rem to 2.4rem
      const color     = COLORS[Math.floor(Math.random() * COLORS.length)];
      const duration  = rand(14, 32).toFixed(2);                    // 14s to 32s
      const delay     = (-rand(0, 30)).toFixed(2);                  // -30s to 0s (negative!)
      const peakOpacity = rand(0.12, 0.28).toFixed(2);              // 0.12 to 0.28

      span.style.left              = left + "%";
      span.style.fontSize          = fontSize + "rem";
      span.style.color             = color;
      span.style.animationDuration = duration + "s";
      span.style.animationDelay    = delay + "s";
      span.style.setProperty("--heart-opacity", peakOpacity);

      frag.appendChild(span);
    }
    container.appendChild(frag);

    // Sanity log so you can verify in DevTools console
    if (window.console && console.info) {
      console.info(
        "[hearts] generated",
        container.querySelectorAll(".heart").length,
        "hearts (expected 35)"
      );
    }
  }

  // Hearts use vh units → already responsive. Resize listener is a no-op
  // by design but kept so future tweaks have an obvious hook.
  window.addEventListener("resize", function () { /* no-op */ });

  // Run as soon as DOM is parsed (don't wait for fonts/images)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createHearts);
  } else {
    createHearts();
  }

  /* ================================================================
     2. PAGE LOADER — hold body locked, then fade
     ================================================================ */
  document.body.classList.add("is-loading");

  const loader = document.getElementById("loader");

  function hideLoader() {
    // Sayfada loader yoksa (ör. bekleme modundaki ay sayfaları) yine de
    // gövde kilidini kaldır; aksi halde body.is-loading kalır ve sayfa kaymaz.
    document.body.classList.remove("is-loading");
    if (!loader || loader.classList.contains("is-hidden")) return;
    loader.classList.add("is-hidden");
    loader.addEventListener(
      "transitionend",
      () => loader.parentNode && loader.parentNode.removeChild(loader),
      { once: true }
    );
  }

  let loadedFired = false;
  let minTimeElapsed = false;
  const tryHide = () => { if (loadedFired && minTimeElapsed) hideLoader(); };

  window.addEventListener("load", () => { loadedFired = true; tryHide(); });
  setTimeout(() => { minTimeElapsed = true; tryHide(); }, 2000);

  // Safety net: hard-hide at 4.5s if 'load' never fires
  setTimeout(hideLoader, 4500);

  // Respect reduced-motion: snap-hide immediately
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    setTimeout(hideLoader, 300);
  }

  /* ================================================================
     3. REVEAL ON SCROLL
     ================================================================ */
  const reveals = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("in-view"));
  }

  /* ================================================================
     4. MEMORY CARDS — staggered fade-in
     ================================================================ */
  const memoryCards = document.querySelectorAll(".memories .card");
  if ("IntersectionObserver" in window && memoryCards.length) {
    const cardIo = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Array.prototype.indexOf.call(memoryCards, entry.target);
            entry.target.style.transitionDelay = (idx * 220) + "ms";
            entry.target.classList.add("in-view");
            cardIo.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -40px 0px" }
    );
    memoryCards.forEach((c) => cardIo.observe(c));
  }

  /* ================================================================
     5. SIDE-NAV ACTIVE DOT
     ================================================================ */
  const sections = document.querySelectorAll("section, footer.section");
  const dots = document.querySelectorAll(".side-nav .dot, .nav-dots .dot");

  if ("IntersectionObserver" in window && dots.length) {
    const navIo = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            dots.forEach((d) => {
              d.classList.toggle("active", d.getAttribute("href") === "#" + id);
            });
          }
        });
      },
      { threshold: 0.5 }
    );
    sections.forEach((s) => navIo.observe(s));
  }

  /* ================================================================
     6. SMOOTH SCROLL FOR NAV LINKS (older browsers)
     ================================================================ */
  document.querySelectorAll('.side-nav a[href^="#"], .nav-dots a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  /* ================================================================
     7. GALLERY IMAGE FALLBACK — burgundy "F & E" monogram if missing
     ================================================================ */
  document.querySelectorAll(".tile img").forEach((img) => {
    img.addEventListener("error", () => {
      const tile = img.closest(".tile");
      if (!tile) return;
      img.style.display = "none";
      if (tile.querySelector(".tile-placeholder")) return;
      const ph = document.createElement("div");
      ph.className = "tile-placeholder";
      ph.style.cssText = `
        position:absolute; inset:0;
        display:flex; align-items:center; justify-content:center;
        background:
          radial-gradient(ellipse at center, #6b1f33 0%, #2a0a12 100%);
        color:#d4af37;
        font-family:"Dancing Script", cursive;
        font-size:3.2rem;
        letter-spacing:0.05em;
      `;
      ph.textContent = "F & E";
      tile.prepend(ph);
    });
  });
  /* ================================================================
     8. GALLERY MODAL — lightbox for #gallery .tile clicks
     Only targets tiles inside #gallery section (not anilar page).
     ================================================================ */
  const galleryModal = document.getElementById("gallery-modal");
  const galleryModalImg = document.getElementById("gallery-modal-img");
  const galleryModalQuote = document.getElementById("gallery-modal-quote");
  const galleryModalClose = document.getElementById("gallery-modal-close");

  if (galleryModal) {
    // Open modal when a tile in #gallery is clicked
    const gallerySection = document.getElementById("gallery");
    if (gallerySection) {
      gallerySection.querySelectorAll(".tile").forEach(function (tile) {
        tile.addEventListener("click", function () {
          const img = tile.querySelector("img");
          const caption = tile.querySelector("figcaption");
          if (!img) return;

          galleryModalImg.src = img.getAttribute('data-full') || img.src;
          galleryModalImg.alt = img.alt || "";
          galleryModalQuote.textContent = caption ? caption.textContent.trim() : "";

          galleryModal.classList.add("is-active");
          galleryModal.setAttribute("aria-hidden", "false");
          document.body.style.overflow = "hidden";
        });
      });
    }

    // Close helpers
    function closeGalleryModal() {
      galleryModal.classList.remove("is-active");
      galleryModal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }

    // Close on X button
    if (galleryModalClose) {
      galleryModalClose.addEventListener("click", closeGalleryModal);
    }

    // Close on backdrop (outside content) click
    galleryModal.addEventListener("click", function (e) {
      if (e.target === galleryModal) {
        closeGalleryModal();
      }
    });

    // Close on Escape key
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && galleryModal.classList.contains("is-active")) {
        closeGalleryModal();
      }
    });
  }

  /* ================================================================
     9. PASSWORD GATE & DENSE HEART RAIN
     ================================================================ */
  function generateHeartRain() {
    const container = document.getElementById("heart-rain");
    if (!container) return;

    // Use a rich palette of red, soft pinks, and gold/rose colors
    const COLORS = [
      "rgba(201, 138, 152, 0.22)",  // dusty rose
      "rgba(232, 197, 204, 0.26)",  // pale rose
      "rgba(139, 26, 58, 0.24)",    // deep rose
      "rgba(212, 168, 83, 0.20)"    // soft gold
    ];

    const COUNT = 60; // Dense rain count
    const rand = (min, max) => Math.random() * (max - min) + min;

    const frag = document.createDocumentFragment();
    for (let i = 0; i < COUNT; i++) {
      const span = document.createElement("span");
      span.className = "rain-heart";
      span.innerHTML = "&#9829;"; // ♥

      const left = rand(0, 98);
      const fontSize = rand(0.8, 2.2).toFixed(2);
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const duration = rand(8, 18).toFixed(2); // faster/slower falls
      const delay = (-rand(0, 15)).toFixed(2); // negative so already falling on load
      const peakOpacity = rand(0.12, 0.28).toFixed(2);
      const drift = rand(-35, 35).toFixed(0); // left-to-right sway amount
      const rotation = rand(180, 540).toFixed(0); // continuous rotation

      span.style.left = left + "%";
      span.style.fontSize = fontSize + "rem";
      span.style.color = color;
      span.style.animationDuration = duration + "s";
      span.style.animationDelay = delay + "s";
      span.style.setProperty("--heart-opacity", peakOpacity);
      span.style.setProperty("--drift", drift + "px");
      span.style.setProperty("--rotation", rotation + "deg");

      frag.appendChild(span);
    }
    container.appendChild(frag);
  }

  // Handle password entry
  const gate = document.getElementById("password-gate");
  const form = document.getElementById("password-form");
  const input = document.getElementById("site-password");
  const error = document.getElementById("password-error");
  const box = document.getElementById("password-box");

  if (form) {
    // If already logged in, we immediately hide the gate and clear class lock
    if (sessionStorage.getItem("ebru_auth") === "true") {
      if (gate) {
        gate.style.display = "none";
      }
      document.body.classList.remove("is-locked");
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      // ==========================================
      // EDIT: PASSWORD CONFIGURATION
      // Change 'ebru' below to change your password
      // ==========================================
      const CORRECT_PASSWORD = "2304eeff";

      if (input.value.trim().toLowerCase() === CORRECT_PASSWORD.toLowerCase()) {
        sessionStorage.setItem("ebru_auth", "true");
        gate.classList.add("fade-out");
        document.body.classList.remove("is-locked");
        
        // Remove gate from DOM after transition completes to save resources
        setTimeout(() => {
          if (gate && gate.parentNode) {
            gate.parentNode.removeChild(gate);
          }
        }, 600);
      } else {
        error.textContent = "Hatalı şifre, sevgilim. Tekrar dener misin? ❤️";
        error.classList.add("show");
        box.classList.add("shake");
        input.value = "";
        input.focus();

        // Remove shake class after animation ends
        setTimeout(() => {
          box.classList.remove("shake");
        }, 500);
      }
    });
  }


  /* ================================================================
     MENÜ SAYACI — birlikte geçen toplam süre
     23 Nisan 2026'dan bugüne kesintisiz sayar.
     ================================================================ */
  (function initSiteCounter() {
    var el = document.getElementById("site-counter");
    if (!el) return;
    var out = el.querySelector(".site-counter-value");
    if (!out) return;

    // Ay değeri 0 tabanlı: 3 = Nisan
    var BASLANGIC = new Date(2026, 3, 23, 0, 0, 0);   // 23 Nisan 2026

    function guncelle() {
      var simdi = new Date();
      var toplam = Math.max(0, simdi - BASLANGIC);

      var gun  = Math.floor(toplam / 86400000);
      var saat = Math.floor((toplam % 86400000) / 3600000);

      out.textContent = gun + " gün " + saat + " saat";
      el.setAttribute("title", "Birlikte geçen toplam süre: " + gun + " gün " + saat + " saat");
      el.setAttribute("aria-label", "Birlikte geçen toplam süre: " + gun + " gün " + saat + " saat");
      el.hidden = false;
    }

    guncelle();
    setInterval(guncelle, 60000);
  })();

  // Initialize features
  generateHeartRain();
})();
