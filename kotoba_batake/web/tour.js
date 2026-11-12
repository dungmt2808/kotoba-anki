/* ことば畑 – 1.26.1: hướng dẫn 3 bước cho người mới (chọn deck → ôn → xem cây lớn).
   Python gửi data.tour = true khi hồ sơ chưa làm gì trong vườn (chưa tưới lần nào, 0 xu, chưa xây nhà) — người đang dùng
   cập nhật lên không thấy. Xong / Bỏ qua thì nhớ theo máy ("kb-tour-done", GardenPrefs). Mở lại: ⚙ → Hướng dẫn 3 bước.
   - Hiện sau màn chào (GardenGreet), khi không mở bảng nào.
   - Khung vàng quanh chỗ cần bấm + bong bóng (1/3 …), lớp mờ phía sau không chặn bấm: bấm thẳng vào ô Deck / Tưới ngay.
   - Bước 1 tự sang bước 2 khi đổi deck; bước 2: bấm Tưới ngay → ẩn trong lúc ôn, đóng bảng ôn → bước 3.
   - Esc = Bỏ qua (không đóng cửa sổ vườn). */
var GardenTour = (function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const STEPS = [
    { target: () => ($("kb-deck") && $("kb-deck").closest("label.kb-deck")) || $("kb-deck"), title: "Chọn deck",
      text: "Chọn deck bạn đang học. Mỗi thẻ trong deck là một cây trong ruộng." },
    { target: () => $("kb-review"), title: "Tưới cây",
      text: "Bấm Tưới ngay để ôn thẻ đến hạn ngay trong vườn. Nhớ được thì +xu." },
    { target: () => $("kb-legend"), up: true, title: "Xem cây lớn",      // bong bóng phía trên: không che cây vừa lớn
      text: "Nhớ càng lâu, cây càng lớn: Hạt giống → Mầm → Cây non → Ra hoa → Ra quả. Xu dùng để xây nhà, mua đồ (nút Nhà)." }
  ];
  let step = -1;              // -1 = không chạy
  let wait = null;            // hẹn giờ chờ màn chào / bảng đóng
  let deck0 = null;           // deck lúc bắt đầu bước 1 (đổi deck → bước 2)
  let reviewing = false;      // bước 2: đang ôn → ẩn, đóng bảng ôn → bước 3
  let wanted = false;         // Python cho phép hiện (người mới) — chỉ hiện tự động một lần mỗi lần mở vườn
  let box = null, frame = null, timer = null;

  function prefGet(k) { try { return typeof GardenPrefs !== "undefined" ? GardenPrefs.get(k) : null; } catch (e) { return null; } }
  function prefSet(k, v) { try { if (typeof GardenPrefs !== "undefined") { GardenPrefs.set(k, v); } } catch (e) { /* bỏ qua */ } }
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) { e.className = cls; } if (text !== undefined) { e.textContent = text; } return e; }
  function busy() {
    if (typeof GardenGreet !== "undefined" && GardenGreet.isGreeting && GardenGreet.isGreeting()) { return true; }
    return ["kb-panel", "kb-game", "kb-home", "kb-paper", "kb-cal", "kb-fields", "kb-ui", "kb-craft"].some((id) => $(id) && !$(id).hidden);
  }
  function deckNow() { const s = $("kb-deck"); return s ? s.value : null; }

  function build() {
    if (box) { return; }
    frame = el("div", "kb-tour-frame"); frame.id = "kb-tour-frame";
    box = el("div", "kb-tour"); box.id = "kb-tour";
    box.setAttribute("role", "dialog");
    const head = box.appendChild(el("div", "kb-tour-head"));
    head.appendChild(el("span", "kb-tour-n"));
    head.appendChild(el("span", "kb-tour-title"));
    box.appendChild(el("div", "kb-tour-text"));
    const row = box.appendChild(el("div", "kb-tour-row"));
    const dots = row.appendChild(el("span", "kb-tour-dots"));
    STEPS.forEach(() => dots.appendChild(el("i")));
    const skip = row.appendChild(el("button", "kb-btn kb-btn-small kb-tour-skip", "Bỏ qua"));
    skip.type = "button"; skip.id = "kb-tour-skip";
    const next = row.appendChild(el("button", "kb-btn kb-btn-small kb-tour-next", "Tiếp ▸"));
    next.type = "button"; next.id = "kb-tour-next";
    skip.addEventListener("click", (e) => { e.stopPropagation(); finish(); });
    next.addEventListener("click", (e) => { e.stopPropagation(); go(step + 1); });
    box.addEventListener("click", (e) => e.stopPropagation());
    const app = $("kb-app") || document.body;
    app.appendChild(frame); app.appendChild(box);
    window.addEventListener("resize", place);
    document.addEventListener("keydown", onKey, true);
  }
  function onKey(e) {
    if (step < 0 || !box || box.hidden) { return; }
    if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); finish(); }
  }
  function place() {
    if (step < 0 || !box || box.hidden) { return; }
    const t = STEPS[step].target();
    const app = ($("kb-app") || document.body).getBoundingClientRect();
    if (!t || !t.offsetParent) { frame.hidden = true; return; }
    const r = t.getBoundingClientRect();
    frame.hidden = false;
    const pad = 6;
    frame.style.left = Math.round(r.left - app.left - pad) + "px";
    frame.style.top = Math.round(r.top - app.top - pad) + "px";
    frame.style.width = Math.round(r.width + pad * 2) + "px";
    frame.style.height = Math.round(r.height + pad * 2) + "px";
    // bong bóng dưới khung (không đủ chỗ thì phía trên), không ra ngoài cửa sổ
    const bw = box.offsetWidth, bh = box.offsetHeight, W = window.innerWidth, H = window.innerHeight;
    let left = r.left + r.width / 2 - bw / 2;
    left = Math.max(8, Math.min(W - bw - 8, left));
    let top = r.bottom + pad + 12;
    const above = r.top - pad - 12 - bh;
    if ((STEPS[step].up && above >= 8) || top + bh > H - 8) { top = Math.max(8, above); }
    box.style.left = Math.round(left - app.left) + "px";
    box.style.top = Math.round(top - app.top) + "px";
    box.classList.toggle("kb-tour-up", top < r.top);
    // mũi tên chỉ vào giữa chỗ cần bấm
    box.style.setProperty("--kb-tour-arrow", Math.round(Math.max(18, Math.min(bw - 18, r.left + r.width / 2 - left))) + "px");
  }
  function draw() {
    const s = STEPS[step];
    box.querySelector(".kb-tour-n").textContent = (step + 1) + "/" + STEPS.length;
    box.querySelector(".kb-tour-title").textContent = s.title;
    box.querySelector(".kb-tour-text").textContent = s.text;
    box.querySelectorAll(".kb-tour-dots i").forEach((d, i) => d.classList.toggle("on", i === step));
    const last = step === STEPS.length - 1;
    $("kb-tour-next").textContent = last ? "Xong" : "Tiếp ▸";
    $("kb-tour-skip").hidden = last;
    box.hidden = false;
    place();
    clearInterval(timer);
    timer = setInterval(tick, 400);
  }
  function hide() { if (box) { box.hidden = true; frame.hidden = true; } }
  function go(i) {
    if (i >= STEPS.length) { finish(); return; }
    build();
    step = i;
    reviewing = false;
    if (i === 0) { deck0 = deckNow(); }
    if (busy()) { hide(); } else { draw(); }
  }
  function tick() {
    if (step < 0) { clearInterval(timer); return; }
    const rvOpen = $("kb-panel") && !$("kb-panel").hidden;
    if (step === 1 && rvOpen) { reviewing = true; }
    if (step === 1 && reviewing && !rvOpen) { go(2); return; }      // ôn xong (đóng bảng ôn) → bước 3
    if (busy()) { hide(); return; }
    if (box.hidden) { draw(); return; }
    place();
  }
  function finish() {
    step = -1;
    reviewing = false;
    clearInterval(timer); timer = null;
    clearTimeout(wait); wait = null;
    hide();
    prefSet("kb-tour-done", "1");
  }
  function start() {
    clearTimeout(wait);
    const t0 = Date.now();
    const poll = () => {
      if (step >= 0) { return; }
      if (busy() && Date.now() - t0 < 120000) { wait = setTimeout(poll, 400); return; }
      if (busy()) { return; }
      go(0);
    };
    wait = setTimeout(poll, 300);
  }

  return {
    // garden.js gọi mỗi lần vẽ lại vườn (sau GardenGreet.render)
    render: function (d) {
      if (step === 0 && deck0 !== null && deckNow() !== deck0) { go(1); return; }     // đã đổi deck → bước 2
      if (step >= 0) { if (box && !box.hidden) { place(); } return; }
      if (!wanted && d && d.tour && prefGet("kb-tour-done") !== "1") { wanted = true; start(); }
    },
    open: function () { wanted = true; go(0); },       // ⚙ → Hướng dẫn 3 bước
    close: finish,
    isOpen: () => step >= 0,
    _state: () => ({ step: step, shown: !!box && !box.hidden, reviewing: reviewing,
      text: box && !box.hidden ? box.querySelector(".kb-tour-text").textContent : "" })
  };
})();
