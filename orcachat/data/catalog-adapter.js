window.__ORCACHAT_CATALOG = (async () => {
  const brandMap = {
    "0": "Bosch",
    "1": "Bremen",
    "2": "Gedore",
    "3": "Lotus",
    "4": "Lynus",
    "5": "Makita",
    "6": "Motomil",
    "7": "Branco"
  };

  async function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function decodePayload() {
    const base64 = (window.__ORCACHAT_STOCK_CHUNKS || []).join("");
    const binary = atob(base64);
    const compressed = Uint8Array.from(binary, char => char.charCodeAt(0));
    let jsonText;
    if ("DecompressionStream" in window) {
      const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("gzip"));
      jsonText = await new Response(stream).text();
    } else {
      await loadScript("https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js");
      jsonText = new TextDecoder().decode(window.pako.ungzip(compressed));
    }
    return JSON.parse(jsonText);
  }

  const payload = await decodePayload();
  const stockMap = payload.stocks || {};
  const bySku = new Map();

  String(window.TT_ROWS || "")
    .split("\n")
    .map(row => row.trim())
    .filter(Boolean)
    .forEach(row => {
      const [skuRaw, nameRaw, referenceRaw, brandCode, categoryCode] = row.split("|");
      const sku = String(skuRaw || "").trim().padStart(6, "0");
      if (!sku || bySku.has(sku)) return;
      const name = String(nameRaw || "").trim();
      const reference = String(referenceRaw || "").trim();
      const brand = brandMap[String(brandCode)] || inferBrand(name);
      bySku.set(sku, {
        sku,
        name,
        reference,
        brand,
        category: String(categoryCode || ""),
        application: "",
        tags: [brand, reference].filter(Boolean),
        stock: Number(stockMap[sku] || 0)
      });
    });

  (payload.branco || []).forEach(product => {
    const sku = String(product.sku || "").trim().padStart(6, "0");
    if (!sku || bySku.has(sku)) return;
    bySku.set(sku, {
      sku,
      name: String(product.name || "").trim(),
      reference: String(product.reference || "").trim(),
      brand: "Branco",
      category: String(product.category || ""),
      application: String(product.application || ""),
      tags: Array.isArray(product.tags) ? product.tags : ["Branco"],
      stock: Number(product.stock_quantity || stockMap[sku] || 0)
    });
  });

  function inferBrand(name) {
    const normalized = String(name || "").toUpperCase();
    if (/BOSCH|SKIL/.test(normalized)) return "Bosch";
    if (/BREMEN/.test(normalized)) return "Bremen";
    if (/GEDORE|ROBUST/.test(normalized)) return "Gedore";
    if (/LOTUS/.test(normalized)) return "Lotus";
    if (/LYNUS/.test(normalized)) return "Lynus";
    if (/MAKITA/.test(normalized)) return "Makita";
    if (/MOTOMIL|GARTHEN/.test(normalized)) return "Motomil";
    if (/BRANCO/.test(normalized)) return "Branco";
    return "TEM TUDO";
  }

  return {
    manifest: {
      version: "1.0.0",
      products: bySku.size,
      stockUpdatedAt: payload.updatedAt || "2026-07-13",
      stockIsLive: false
    },
    products: [...bySku.values()]
  };
})();
