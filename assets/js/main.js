/* Santosh Electrical Services — site behaviour (no dependencies) */
(function () {
  "use strict";

  /* ---------- Analytics hook (FR-08) ----------
     Events are pushed to window.dataLayer. Load Google Analytics / GTM only after
     SES approves the privacy approach; until then these pushes are harmless. */
  function track(event, detail) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({ event: event }, detail || {}));
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    var href = a.getAttribute("href");
    if (href.indexOf("tel:") === 0) track("phone_click", { phone: href.slice(4) });
    else if (href.indexOf("mailto:") === 0) track("email_click", { email: href.slice(7) });
    else if (/google\.[a-z.]+\/maps/.test(href)) track("map_click", { location: a.dataset.loc || "" });
    else if (a.dataset.cta) track("cta_click", { cta: a.dataset.cta });
  });

  /* ---------- Mobile navigation ---------- */
  var nav = document.getElementById("main-nav");
  var toggle = document.querySelector(".nav-toggle");
  var closeBtn = document.querySelector(".nav-close");
  var backdrop = document.querySelector(".nav-backdrop");
  function setNav(open) {
    if (!nav) return;
    nav.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
    if (backdrop) backdrop.hidden = !open;
    document.body.style.overflow = open ? "hidden" : "";
    if (open) { (closeBtn || nav.querySelector("a")).focus(); } else { toggle.focus(); }
  }
  if (toggle) toggle.addEventListener("click", function () { setNav(!nav.classList.contains("open")); });
  if (closeBtn) closeBtn.addEventListener("click", function () { setNav(false); });
  if (backdrop) backdrop.addEventListener("click", function () { setNav(false); });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (nav && nav.classList.contains("open")) setNav(false);
    document.querySelectorAll(".has-sub.open").forEach(function (li) {
      li.classList.remove("open");
      li.querySelector(".sub-toggle").setAttribute("aria-expanded", "false");
    });
  });

  /* Submenus: toggle button (keyboard + touch) */
  document.querySelectorAll(".sub-toggle").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var li = btn.closest(".has-sub");
      var open = !li.classList.contains("open");
      document.querySelectorAll(".has-sub.open").forEach(function (o) {
        if (o !== li) { o.classList.remove("open"); o.querySelector(".sub-toggle").setAttribute("aria-expanded", "false"); }
      });
      li.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", String(open));
    });
  });
  document.addEventListener("click", function (e) {
    if (window.matchMedia("(max-width: 1100px)").matches) return;
    if (!e.target.closest(".has-sub")) {
      document.querySelectorAll(".has-sub.open").forEach(function (o) {
        o.classList.remove("open"); o.querySelector(".sub-toggle").setAttribute("aria-expanded", "false");
      });
    }
  });

  /* ---------- Enquiry form ---------- */
  var form = document.getElementById("enquiry-form");
  if (!form) return;
  var params = new URLSearchParams(window.location.search);

  // Pre-select the enquiry type / product from the link that brought the visitor here.
  var typeSel = form.querySelector("#f-type");
  var preType = params.get("type");
  if (preType && typeSel) {
    Array.prototype.forEach.call(typeSel.options, function (o) { if (o.value === preType) typeSel.value = preType; });
  }
  var preProduct = params.get("product");
  var msg = form.querySelector("#f-message");
  if (preProduct && msg && !msg.value) msg.value = "I would like details / a quotation for: " + preProduct + "\n\n";

  // Panel-specific fields (requirements §6.5)
  var panelBox = form.querySelector(".panel-extra");
  function syncPanel() { if (panelBox) panelBox.hidden = typeSel.value !== "Panel Manufacturing"; }
  if (typeSel) { typeSel.addEventListener("change", syncPanel); syncPanel(); }

  // Server-reported status
  var status = params.get("status");
  var box = document.getElementById("form-status");
  if (status === "error" && box) {
    box.className = "notice error";
    box.textContent = "Sorry — your enquiry could not be sent. Please check the highlighted fields or call us on 040-23066178.";
    box.hidden = false;
  }

  // Time-trap: record when the form was rendered (bots submit instantly).
  var ts = form.querySelector('[name="ts"]');
  if (ts) ts.value = String(Math.floor(Date.now() / 1000));

  var MAX_FILE = 5 * 1024 * 1024;
  var ALLOWED = ["pdf", "jpg", "jpeg", "png", "dwg", "dxf"];

  function fieldOf(el) { return el.closest(".field"); }
  function setErr(el, text) {
    var f = fieldOf(el); if (!f) return;
    var e = f.querySelector(".err");
    f.classList.toggle("invalid", !!text);
    el.setAttribute("aria-invalid", text ? "true" : "false");
    if (e) e.textContent = text || "";
  }
  function validate() {
    var first = null;
    function fail(el, t) { setErr(el, t); if (!first) first = el; }
    var name = form.elements.name, email = form.elements.email, phone = form.elements.phone,
        type = form.elements.type, message = form.elements.message, consent = form.elements.consent,
        file = form.elements.attachment;
    [name, email, phone, type, message, consent, file].forEach(function (el) { if (el) setErr(el, ""); });

    if (!name.value.trim() || name.value.trim().length < 2) fail(name, "Please enter your name.");
    var em = email.value.trim(), ph = phone.value.replace(/[\s\-()+]/g, "");
    if (!em && !ph) { fail(email, "Please give an email address or a phone number."); fail(phone, "Please give a phone number or an email address."); }
    if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) fail(email, "Please enter a valid email address.");
    if (ph && !/^\d{10,13}$/.test(ph)) fail(phone, "Please enter a valid phone number (10–13 digits).");
    if (!type.value) fail(type, "Please choose an enquiry type.");
    if (message.value.trim().length < 10) fail(message, "Please tell us a little more (at least 10 characters).");
    if (!consent.checked) fail(consent, "Please confirm you agree to be contacted about this enquiry.");
    if (file && file.files && file.files[0]) {
      var f = file.files[0], ext = f.name.split(".").pop().toLowerCase();
      if (ALLOWED.indexOf(ext) === -1) fail(file, "Allowed file types: PDF, JPG, PNG, DWG, DXF.");
      else if (f.size > MAX_FILE) fail(file, "File must be 5 MB or smaller.");
    }
    if (first) first.focus();
    return !first;
  }
  form.addEventListener("submit", function (e) {
    if (!validate()) { e.preventDefault(); track("form_error", { form: "enquiry" }); return; }
    track("form_submit", { form: "enquiry", enquiry_type: form.elements.type.value });
    if (form.hasAttribute("data-demo")) {
      // Demo build: there is no mail handler, so say so instead of submitting.
      e.preventDefault();
      if (box) {
        box.className = "notice ok";
        box.textContent = "Demo preview: the form checks passed, but this enquiry was not sent. On the live site it is emailed to SES.";
        box.hidden = false;
        box.scrollIntoView({ block: "center" });
      }
      return;
    }
    var btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
  });
  form.querySelectorAll("input, select, textarea").forEach(function (el) {
    el.addEventListener("change", function () { if (fieldOf(el) && fieldOf(el).classList.contains("invalid")) validate(); });
  });
})();
