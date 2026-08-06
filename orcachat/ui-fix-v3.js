(() => {
  "use strict";

  function extractCustomerName(text = "") {
    const match = String(text).match(/(?:^|\n)\s*(?:cota[cç][aã]o|or[cç]amento)\s+(?:em\s+nome\s+de|para)\s+([^\n]+?)(?:\s+(?:pfv+r?|por\s+favor))?\s*(?:\n|$)/i);
    return match ? match[1].replace(/[.,;:-]+$/g, "").trim() : "";
  }

  const form = document.querySelector("#composerForm");
  const input = document.querySelector("#messageInput");
  const messages = document.querySelector("#messages");
  if (!form || !input || !messages) return;

  form.addEventListener("submit", () => {
    const name = extractCustomerName(input.value);
    if (name) sessionStorage.setItem("tt_orcachat_pending_customer_name", name);
  }, true);

  const observer = new MutationObserver(() => {
    const name = sessionStorage.getItem("tt_orcachat_pending_customer_name");
    if (!name) return;
    const bubbles = [...messages.querySelectorAll(".message.assistant .bubble")];
    const last = bubbles.at(-1)?.textContent || "";
    if (!/qual (?:é|e) o seu nome/i.test(last)) return;
    sessionStorage.removeItem("tt_orcachat_pending_customer_name");
    input.value = name;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    form.requestSubmit();
  });

  observer.observe(messages, { childList: true, subtree: true });
})();
