(() => {
  "use strict";
  const CONFIG = window.ORCACHAT_CONFIG || {};
  const Engine = window.OrcaEngine;
  const STORAGE = { current: "tt_orcachat_current_v2", history: "tt_orcachat_history_v2", seller: "tt_orcachat_seller_v2" };
  const state = { files: [], quote: [], confirmed: false, customerName: "", stage: "collecting", busy: false, currentHistoryId: null };
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];

  function escapeHtml(value = "") { return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }
  function toast(text) { const el = $("#toast"); el.textContent = text; el.classList.add("show"); clearTimeout(el.timer); el.timer = setTimeout(() => el.classList.remove("show"), 2300); }
  function scrollMessages() { const el = $("#messages"); requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; }); }
  function addMessage(role, text, actions = []) {
    const row = document.createElement("div");
    row.className = `message ${role}`;
    row.innerHTML = `<div class="avatar">TT</div><div><div class="bubble">${escapeHtml(text)}</div>${actions.length ? `<div class="quick-actions">${actions.map(action => `<button class="quick-action" data-action="${escapeHtml(action.value)}">${escapeHtml(action.label)}</button>`).join("")}</div>` : ""}</div>`;
    row.querySelectorAll("[data-action]").forEach(button => button.addEventListener("click", () => quickAction(button.dataset.action)));
    $("#messages").appendChild(row); scrollMessages();
  }
  function showTyping() { const row = document.createElement("div"); row.id = "typingMessage"; row.className = "message assistant"; row.innerHTML = '<div class="avatar">TT</div><div class="bubble"><span class="typing"><i></i><i></i><i></i></span></div>'; $("#messages").appendChild(row); scrollMessages(); }
  function hideTyping() { $("#typingMessage")?.remove(); }
  function publicAvailability(product) { return Number(product?.stock) > 0 ? "Disponibilidade será confirmada" : "Disponibilidade sob consulta"; }

  function saveCurrent() {
    const safeQuote = state.quote.map(item => ({ ...item, product: item.product ? { sku: item.product.sku, name: item.product.name, brand: item.product.brand, reference: item.product.reference, stock: item.product.stock } : null }));
    localStorage.setItem(STORAGE.current, JSON.stringify({ quote: safeQuote, confirmed: state.confirmed, customerName: state.customerName, stage: state.stage, currentHistoryId: state.currentHistoryId }));
  }
  function restoreCurrent() {
    try { const saved = JSON.parse(localStorage.getItem(STORAGE.current) || "null"); if (saved) Object.assign(state, saved); } catch (_) {}
  }
  function getHistory() { try { return JSON.parse(localStorage.getItem(STORAGE.history) || "[]"); } catch (_) { return []; } }
  function setHistory(history) { localStorage.setItem(STORAGE.history, JSON.stringify(history.slice(0, 50))); }
  function saveHistory(seller = null) {
    const history = getHistory();
    const current = state.currentHistoryId && history.find(item => item.id === state.currentHistoryId);
    const record = {
      id: current?.id || (crypto.randomUUID ? crypto.randomUUID() : `h-${Date.now()}`),
      number: current?.number || `TT-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${String(history.length + 1).padStart(3, "0")}`,
      createdAt: current?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(),
      customerName: state.customerName, seller: seller?.name || current?.seller || "",
      items: state.quote.map(item => ({ qty: item.qty, unit: item.unit, requested: item.requested, product: item.product ? { sku: item.product.sku, name: item.product.name, brand: item.product.brand } : null }))
    };
    const next = current ? history.map(item => item.id === record.id ? record : item) : [record, ...history];
    state.currentHistoryId = record.id; setHistory(next); saveCurrent(); renderHistory(); toast("Orçamento salvo neste aparelho"); return record;
  }

  function mergeQuote(items) {
    items.forEach(item => {
      const existing = state.quote.find(row => row.key === item.key);
      if (existing) existing.qty += item.qty;
      else state.quote.push(item);
    });
  }
  function updateQuoteItem(index, action, value) {
    const item = state.quote[index]; if (!item) return;
    if (action === "remove") state.quote.splice(index, 1);
    if (action === "minus") item.qty = Math.max(0.01, item.qty - 1);
    if (action === "plus") item.qty += 1;
    if (action === "set") item.qty = Math.max(0.01, Number(String(value).replace(",", ".")) || 1);
    state.confirmed = false; state.stage = "awaiting_confirmation"; saveCurrent(); renderQuote();
  }
  function renderQuote() {
    const count = state.quote.length;
    $("#itemCount").textContent = `${count} ${count === 1 ? "item" : "itens"}`;
    $("#mobileItemCount").textContent = count;
    $("#quoteEmpty").hidden = count > 0; $("#quoteContent").hidden = count === 0;
    $("#quoteList").innerHTML = state.quote.map((item, index) => {
      const identified = Boolean(item.product);
      const name = identified ? item.product.name : item.requested;
      const detail = identified ? `${item.product.brand || "TEM TUDO"} · ${publicAvailability(item.product)}` : "Não identificado na base de teste; o vendedor fará a busca interna.";
      const code = identified ? `SKU ${item.product.sku}` : "Para conferência";
      return `<article class="quote-item ${identified ? "" : "unknown"}"><button class="remove-item" data-remove="${index}" aria-label="Remover item">×</button><div class="quote-item-top"><div class="qty-control"><button data-minus="${index}">−</button><input data-qty="${index}" value="${Engine.formatQty(item.qty)}" inputmode="decimal"><button data-plus="${index}">＋</button></div><div class="quote-item-copy"><strong>${escapeHtml(name)}</strong><small>${escapeHtml(detail)}</small><span class="sku">${escapeHtml(code)} · ${escapeHtml(item.unit)}</span></div></div></article>`;
    }).join("");
    $("#quoteList").querySelectorAll("[data-remove]").forEach(button => button.onclick = () => updateQuoteItem(Number(button.dataset.remove), "remove"));
    $("#quoteList").querySelectorAll("[data-minus]").forEach(button => button.onclick = () => updateQuoteItem(Number(button.dataset.minus), "minus"));
    $("#quoteList").querySelectorAll("[data-plus]").forEach(button => button.onclick = () => updateQuoteItem(Number(button.dataset.plus), "plus"));
    $("#quoteList").querySelectorAll("[data-qty]").forEach(input => input.onchange = () => updateQuoteItem(Number(input.dataset.qty), "set", input.value));
    const unknown = state.quote.filter(item => !item.product).length;
    $("#quoteAlert").hidden = !unknown;
    $("#quoteAlert").textContent = unknown ? `${unknown} ${unknown === 1 ? "item será conferido" : "itens serão conferidos"} diretamente pelo vendedor. Nenhum pedido foi descartado.` : "";
    $("#confirmQuoteButton").hidden = state.confirmed || !count;
    $("#whatsappButton").hidden = !(state.confirmed && state.customerName && count);
    saveCurrent();
  }

  function confirmQuote() {
    if (!state.quote.length) return toast("Seu orçamento está vazio");
    state.confirmed = true; state.stage = "ask_more"; renderQuote(); closeMobileQuote();
    addMessage("assistant", "Certo. Deseja acrescentar mais algum item?", [{ label: "Sim, acrescentar", value: "more" }, { label: "Não, finalizar", value: "finish" }]);
  }
  function requestName() { state.stage = "awaiting_name"; saveCurrent(); addMessage("assistant", "Para finalizar, qual é o seu nome?"); $("#messageInput").focus(); }
  function isYes(text) { return /^(sim|s|ok|certo|correto|confirmo|pode|isso|perfeito)\b/i.test(Engine.normalize(text)); }
  function isNo(text) { return /^(nao|n|nada|so isso|somente isso|finalizar)\b/i.test(Engine.normalize(text)); }

  async function submitMessage() {
    if (state.busy) return;
    const input = $("#messageInput"); const text = input.value.trim();
    if (!text && !state.files.length) return;
    addMessage("user", text || `Enviei ${state.files.length} arquivo(s).`); input.value = ""; input.style.height = "auto";
    state.busy = true; showTyping();
    try {
      if (state.stage === "awaiting_name" && text) {
        state.customerName = text.replace(/^(meu nome e|sou|nome)\s+/i, "").trim(); state.stage = "ready"; saveCurrent(); hideTyping(); renderQuote();
        addMessage("assistant", `Perfeito, ${state.customerName}. Seu orçamento está pronto.`, [{ label: "Falar com vendedor", value: "seller" }]); return;
      }
      if (state.stage === "awaiting_confirmation" && isYes(text)) { hideTyping(); confirmQuote(); return; }
      if (state.stage === "ask_more" && isNo(text)) { hideTyping(); requestName(); return; }
      const extracted = await Engine.extract(text, state.files);
      state.files = []; renderFiles();
      const matched = extracted.map(Engine.match); mergeQuote(matched);
      state.confirmed = false; state.stage = "awaiting_confirmation"; renderQuote(); hideTyping();
      const unknown = matched.filter(item => !item.product).length;
      let reply = `Organizei ${matched.length} ${matched.length === 1 ? "item" : "itens"}`;
      if (unknown) reply += `, com ${unknown} para conferência do vendedor`;
      reply += ". Está correto o que você pediu?";
      addMessage("assistant", reply, [{ label: "Sim, está correto", value: "confirm" }, { label: "Quero corrigir", value: "correct" }]);
      if (window.innerWidth <= 900) openMobileQuote();
    } catch (error) {
      console.error(error); hideTyping(); addMessage("assistant", "Não consegui ler essa lista agora. Tente colar os itens no campo de mensagem ou envie outro arquivo.");
    } finally { state.busy = false; }
  }
  function quickAction(value) {
    if (value === "confirm") confirmQuote();
    if (value === "correct") { state.stage = "collecting"; addMessage("assistant", "Certo. Envie a correção ou a lista novamente."); }
    if (value === "more") { state.stage = "collecting"; addMessage("assistant", "Pode enviar os itens adicionais."); $("#messageInput").focus(); }
    if (value === "finish") requestName();
    if (value === "seller") sendToSeller();
  }

  function chooseSeller() {
    const sellers = CONFIG.sellers || [];
    if (!sellers.length) return null;
    const last = Number(localStorage.getItem(STORAGE.seller) ?? -1);
    const next = (last + 1) % sellers.length;
    localStorage.setItem(STORAGE.seller, String(next)); return sellers[next];
  }
  function sendToSeller() {
    if (!state.quote.length) return toast("Seu orçamento está vazio");
    if (!state.customerName) return requestName();
    const seller = chooseSeller(); if (!seller) return toast("Vendedores ainda não configurados");
    const record = saveHistory(seller);
    const identified = state.quote.filter(item => item.product);
    const unknown = state.quote.filter(item => !item.product);
    const lines = [`Olá, ${seller.name}. Meu nome é ${state.customerName}. Fiz o orçamento ${record.number} pelo TEM TUDO OrçaChat.`, ""];
    if (identified.length) {
      lines.push("ITENS IDENTIFICADOS");
      identified.forEach((item, index) => lines.push(`${index + 1}. ${Engine.formatQty(item.qty)} ${item.unit} — SKU ${item.product.sku} — ${item.product.name}`));
      lines.push("");
    }
    if (unknown.length) {
      lines.push("ITENS PARA CONFERÊNCIA");
      unknown.forEach((item, index) => lines.push(`${index + 1}. ${Engine.formatQty(item.qty)} ${item.unit} — ${item.requested}`));
      lines.push("");
    }
    lines.push("Por favor, confirme o estoque atual e os valores dos produtos.");
    addMessage("assistant", `Ótimo, ${state.customerName}. Vou direcionar você ao vendedor ${seller.name}.`);
    window.open(`https://wa.me/${seller.phone}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener");
  }

  function renderHistory() {
    const history = getHistory(); const target = $("#historyList");
    if (!history.length) { target.innerHTML = '<div class="empty-history">Nenhum orçamento salvo neste aparelho.</div>'; return; }
    target.innerHTML = history.map(record => `<article class="history-card"><div><h3>${escapeHtml(record.number)} · ${escapeHtml(record.customerName || "Cliente")}</h3><p>${new Date(record.createdAt).toLocaleString("pt-BR")}${record.seller ? ` · Vendedor ${escapeHtml(record.seller)}` : ""}</p></div><div class="history-actions"><button class="small-button open" data-open-history="${record.id}">Abrir</button><button class="small-button delete" data-delete-history="${record.id}">Apagar</button></div><div class="history-items">${record.items.map(item => `${Engine.formatQty(item.qty)} ${escapeHtml(item.unit)} — ${item.product ? `SKU ${escapeHtml(item.product.sku)} — ${escapeHtml(item.product.name)}` : `${escapeHtml(item.requested)} — conferir`}`).join("<br>")}</div></article>`).join("");
    target.querySelectorAll("[data-delete-history]").forEach(button => button.onclick = () => { if (!confirm("Apagar este orçamento?")) return; setHistory(getHistory().filter(item => item.id !== button.dataset.deleteHistory)); renderHistory(); });
    target.querySelectorAll("[data-open-history]").forEach(button => button.onclick = () => openHistory(button.dataset.openHistory));
  }
  function openHistory(id) {
    const record = getHistory().find(item => item.id === id); if (!record) return;
    state.quote = record.items.map(item => ({ id: crypto.randomUUID ? crypto.randomUUID() : String(Math.random()), key: item.product ? `sku:${item.product.sku}` : `raw:${Engine.normalize(item.requested)}`, qty: item.qty, unit: item.unit, requested: item.requested, original: item.requested, product: item.product, confidence: item.product ? "alta" : "nao_identificado" }));
    state.customerName = record.customerName || ""; state.confirmed = true; state.stage = state.customerName ? "ready" : "awaiting_name"; state.currentHistoryId = record.id; renderQuote(); route("chat"); addMessage("assistant", `Orçamento ${record.number} aberto.`);
  }

  function addFiles(files) {
    for (const file of files) {
      if (state.files.length >= 5) { toast("Limite de 5 arquivos por envio"); break; }
      if (file.size > 8 * 1024 * 1024) { toast(`${file.name}: limite de 8 MB`); continue; }
      state.files.push(file);
    }
    $("#fileInput").value = ""; renderFiles();
  }
  function renderFiles() {
    const target = $("#filePreview"); target.hidden = !state.files.length;
    target.innerHTML = state.files.map((file, index) => `<span class="file-chip">${escapeHtml(file.name)}<button data-remove-file="${index}">×</button></span>`).join("");
    target.querySelectorAll("[data-remove-file]").forEach(button => button.onclick = () => { state.files.splice(Number(button.dataset.removeFile), 1); renderFiles(); });
  }
  function newConversation(ask = true) {
    if (ask && (state.quote.length || state.customerName) && !confirm("Iniciar uma nova conversa? O orçamento atual será limpo.")) return;
    Object.assign(state, { files: [], quote: [], confirmed: false, customerName: "", stage: "collecting", busy: false, currentHistoryId: null });
    localStorage.removeItem(STORAGE.current); $("#messages").innerHTML = ""; renderFiles(); renderQuote(); route("chat"); addMessage("assistant", "Nova conversa iniciada. Envie sua lista de materiais.");
  }
  function route(name) { $$(".screen").forEach(screen => screen.classList.toggle("active", screen.id === `screen-${name}`)); if (name === "history") { closeMobileQuote(); renderHistory(); } window.scrollTo({ top: 0, behavior: "smooth" }); }
  function openMobileQuote() { $("#quotePanel").classList.add("open"); $("#backdrop").hidden = false; }
  function closeMobileQuote() { $("#quotePanel").classList.remove("open"); $("#backdrop").hidden = true; }

  async function boot() {
    restoreCurrent(); bindEvents(); renderFiles(); renderQuote(); renderHistory();
    try { const data = await Engine.load(); $("#modePill").textContent = CONFIG.geminiEndpoint ? "Gemini conectado" : `Base local · ${data?.manifest?.products || ""} produtos`; }
    catch (error) { console.error(error); $("#modePill").textContent = "Base indisponível"; }
    if (!$("#messages").children.length) addMessage("assistant", "Olá! Envie sua lista de materiais. Eu localizo os produtos e organizo o orçamento para você.");
    navigator.serviceWorker?.register?.("service-worker.js").catch(() => {});
  }
  function bindEvents() {
    $("#composerForm").addEventListener("submit", event => { event.preventDefault(); submitMessage(); });
    $("#messageInput").addEventListener("keydown", event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submitMessage(); } });
    $("#messageInput").addEventListener("input", event => { event.target.style.height = "auto"; event.target.style.height = `${Math.min(event.target.scrollHeight, 130)}px`; });
    $("#fileInput").addEventListener("change", event => addFiles([...event.target.files]));
    $("#newConversationButton").addEventListener("click", () => newConversation(true));
    $("#clearQuoteButton").addEventListener("click", () => { if (state.quote.length && confirm("Limpar o orçamento atual?")) { state.quote = []; state.confirmed = false; state.stage = "collecting"; renderQuote(); } });
    $("#confirmQuoteButton").addEventListener("click", confirmQuote);
    $("#whatsappButton").addEventListener("click", sendToSeller);
    $("#mobileQuoteButton").addEventListener("click", openMobileQuote); $("#backdrop").addEventListener("click", closeMobileQuote);
    $$('[data-route]').forEach(button => button.addEventListener("click", () => route(button.dataset.route)));
  }

  boot();
})();
