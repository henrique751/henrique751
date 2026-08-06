(() => {
  "use strict";

  const Engine = window.OrcaEngine;
  if (!Engine || typeof Engine.extract !== "function" || typeof Engine.match !== "function") return;

  const originalLoad = Engine.load.bind(Engine);
  const originalExtract = Engine.extract.bind(Engine);
  const originalMatch = Engine.match.bind(Engine);
  let catalog = [];

  const requestedBrands = [
    "bosch", "bremen", "gedore", "lotus", "lynus", "makita", "motomil", "branco",
    "starrett", "irwin", "minipa", "vonder", "robust", "garthen"
  ];

  function strip(value = "") {
    return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function normalize(value = "") {
    return strip(value)
      .toLowerCase()
      .replace(/[“”''′″]/g, '"')
      .replace(/\b(chaves)\b/g, "chave")
      .replace(/\b(combinadas|combinados)\b/g, "combinada")
      .replace(/\b(alicates)\b/g, "alicate")
      .replace(/\b(mochilas)\b/g, "mochila")
      .replace(/\b(bolsas)\b/g, "bolsa")
      .replace(/\b(niveis)\b/g, "nivel")
      .replace(/\s+/g, " ")
      .trim();
  }

  function cleanClientCode(value = "") {
    return String(value)
      .replace(/\s*[-–—]?\s*\((?:c[oó]d(?:igo)?|sku|ref(?:er[eê]ncia)?)\s*[:#-]?\s*[A-Za-z0-9./-]+\)\s*/gi, " ")
      .replace(/\s*[-–—]?\s*(?:c[oó]d(?:igo)?|sku|ref(?:er[eê]ncia)?)\s*[:#-]?\s*[A-Za-z0-9./-]+\s*$/gi, " ")
      .replace(/\s*[-–—]\s*$/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function readClientCode(value = "") {
    const match = String(value).match(/(?:c[oó]d(?:igo)?|sku|ref(?:er[eê]ncia)?)\s*[:#-]?\s*([A-Za-z0-9./-]+)/i);
    return match ? match[1] : "";
  }

  function extractCustomerName(text = "") {
    const match = String(text).match(/(?:^|\n)\s*(?:cota[cç][aã]o|or[cç]amento)\s+(?:em\s+nome\s+de|para)\s+([^\n]+?)(?:\s+(?:pfv+r?|por\s+favor))?\s*(?:\n|$)/i);
    return match ? match[1].replace(/[.,;:-]+$/g, "").trim() : "";
  }

  function isHeaderLine(line = "") {
    const clean = normalize(line);
    return /^(cotacao|orcamento)\s+(em nome de|para)\b/.test(clean)
      || /^(cliente|nome|telefone|endereco|observacao|obs)\s*[:\-]/.test(clean)
      || /^(codigo|descricao|fabricante|minimo|maximo|estoque|quantidade|qtd|item)\b/.test(clean);
  }

  function splitRequestedLines(text = "") {
    const normalizedText = String(text)
      .replace(/\r/g, "\n")
      .replace(/[•●▪◦]/g, "\n")
      .replace(/\t+/g, " ")
      .replace(/,\s+(?=\d+(?:[.,]\d+)?\s)/g, "\n")
      .replace(/\s+e\s+(?=\d+(?:[.,]\d+)?\s)/gi, "\n")
      .replace(/\s+\+\s+(?=\d+(?:[.,]\d+)?\s)/g, "\n");

    const rawLines = normalizedText.split(/\n+|;/).map(line => line.trim()).filter(Boolean);
    const customerName = extractCustomerName(normalizedText);
    window.__ORCACHAT_CONTEXT = { ...(window.__ORCACHAT_CONTEXT || {}), customerName };

    const productLines = rawLines.filter(line => !isHeaderLine(line));
    if (productLines.length > 1) return productLines.filter(line => /^\s*\d+(?:[.,]\d+)?\s+/.test(line));
    return productLines;
  }

  function parseLine(line = "") {
    const clean = String(line).replace(/^[-–—*•]+\s*/, "").trim();
    if (!clean) return null;
    const match = clean.match(/^\s*(\d+(?:[.,]\d+)?)\s*(un|und|unid|unidade|pc|pcs|pç|pçs|peca|pecas|par|pares|m|mt|mts|metro|metros|kg|quilo|quilos|g|gr|grama|gramas|l|lt|litro|litros|cx|caixa|caixas|jg|jogo|kit|x)?\s+(.+)$/i);
    const qty = match ? Number(match[1].replace(",", ".")) || 1 : 1;
    const rawUnit = match?.[2] || "";
    const description = (match?.[3] || clean).trim();
    const unit = /^(par|pares)$/i.test(rawUnit) ? "PAR" : "UN";
    return {
      qty,
      unit,
      description,
      original: clean,
      clientCode: readClientCode(description),
      matchDescription: cleanClientCode(description)
    };
  }

  function dedupeKey(item) {
    return normalize(cleanClientCode(item.description))
      .replace(/\b(pfvr?|por favor)\b/g, "")
      .replace(/[^a-z0-9/.,\-"]+/g, " ")
      .trim();
  }

  function consolidate(items = []) {
    const byKey = new Map();
    for (const item of items.filter(Boolean)) {
      const key = dedupeKey(item);
      if (!key) continue;
      const existing = byKey.get(key);
      if (existing) {
        existing.qty += Number(item.qty) || 1;
        if (!existing.clientCode && item.clientCode) existing.clientCode = item.clientCode;
        if (item.clientCode && !existing.description.toLowerCase().includes("cód")) existing.description = item.description;
      } else {
        byKey.set(key, { ...item, dedupeKey: key });
      }
    }
    return [...byKey.values()];
  }

  function productText(product) {
    return normalize([product.name, product.brand, product.reference, product.category, product.application, ...(product.tags || [])].join(" "));
  }

  function stockSort(a, b) {
    const sa = Number(a.stock) || 0;
    const sb = Number(b.stock) || 0;
    const groupA = sa > 0 ? 2 : sa === 0 ? 1 : 0;
    const groupB = sb > 0 ? 2 : sb === 0 ? 1 : 0;
    if (groupA !== groupB) return groupB - groupA;
    return sb - sa;
  }

  function requestedBrand(query) {
    return requestedBrands.find(brand => new RegExp(`\\b${brand}\\b`, "i").test(query)) || "";
  }

  function measurementMm(query) {
    const mm = query.match(/\b(\d+(?:[.,]\d+)?)\s*mm\b/);
    if (mm) return mm[1].replace(",", ".");
    const simple = query.match(/\b(?:chave combinada|chave canhao)\s+(\d{1,2})\b/);
    return simple ? simple[1] : "";
  }

  function inchSize(query) {
    const value = query.match(/\b(\d+(?:[.,]\d+)?)\s*(?:"|pol(?:egadas?)?)\b/);
    return value ? value[1].replace(",", ".") : "";
  }

  function hasExactNumber(text, value) {
    if (!value) return true;
    return new RegExp(`(?:^|[^0-9])${String(value).replace(".", "[.,]")}(?:\\s*mm)?(?:[^0-9]|$)`).test(text);
  }

  function makeResult(item, product, confidence = "alta", score = 1000) {
    const requested = item.description;
    return {
      id: crypto.randomUUID ? crypto.randomUUID() : `q-${Date.now()}-${Math.random()}`,
      key: product ? `sku:${product.sku}` : `raw:${item.dedupeKey || dedupeKey(item)}`,
      qty: item.qty,
      unit: item.unit || "UN",
      requested,
      original: item.original || requested,
      clientCode: item.clientCode || "",
      product: product || null,
      confidence: product ? confidence : "nao_identificado",
      score: product ? score : 0
    };
  }

  function findSpecialized(item) {
    const query = normalize(item.matchDescription || cleanClientCode(item.description));
    const brand = requestedBrand(query);
    const code = item.clientCode || readClientCode(item.description);

    if (code) {
      const normalizedCode = String(code).replace(/\D/g, "").padStart(6, "0");
      const direct = catalog.find(product => String(product.sku).padStart(6, "0") === normalizedCode)
        || catalog.find(product => normalize(product.reference) === normalize(code));
      if (direct) return direct;
    }

    const candidates = catalog.filter(product => {
      const text = productText(product);
      if (brand && !text.includes(brand)) return false;

      if (/\bchave combinada\b/.test(query)) {
        if (!/\bchave combinada\b/.test(text) || /\b(jg|jogo)\b/.test(text)) return false;
        const size = measurementMm(query);
        if (!hasExactNumber(text, size)) return false;
        if (!/\b(catraca|movel)\b/.test(query) && /\b(catraca|movel)\b/.test(text)) return false;
        return true;
      }

      if (/\bchave canhao\b/.test(query)) {
        if (!/\bchave canhao\b/.test(text) || /\b(jg|jogo)\b/.test(text)) return false;
        return hasExactNumber(text, measurementMm(query));
      }

      if (/\balicate universal\b/.test(query)) {
        return /\balicate (?:universal|univ)\b/.test(text) && !/\bkit\b/.test(text);
      }

      if (/\balicate (?:de )?pressao\b/.test(query)) {
        return /\balicate pressao\b/.test(text) && (!/\bsolda\b/.test(text) || /\bsolda\b/.test(query));
      }

      if (/\bnivel\b/.test(query)) {
        if (!/\bnivel\b/.test(text)) return false;
        const inches = inchSize(query);
        if (inches && !hasExactNumber(text, inches)) return false;
        if (/\bmagnet/.test(query) && !/\b(magnet|fita magnetica)\b/.test(text)) return false;
        if (/\b3 bolha/.test(query) && !/\b3 bolha/.test(text)) return false;
        if (/\baluminio\b/.test(query) && !/\baluminio\b/.test(text)) return false;
        return true;
      }

      if (/\bmultimetro\b/.test(query)) return /\bmultimetro\b/.test(text);
      if (/\b(mochila|bolsa|mala)\b/.test(query) && /\bferrament/.test(query)) {
        return /\b(mochila|bolsa|mala)\b/.test(text) && /\bferrament/.test(text);
      }

      return false;
    });

    return candidates.sort(stockSort)[0] || null;
  }

  function shouldStayUnknown(item, product) {
    if (!product) return true;
    const query = normalize(item.matchDescription || cleanClientCode(item.description));
    const text = productText(product);
    const brand = requestedBrand(query);
    if (brand && !text.includes(brand)) return true;

    const mm = measurementMm(query);
    if (mm && /\b(chave combinada|chave canhao)\b/.test(query) && !hasExactNumber(text, mm)) return true;

    const inches = inchSize(query);
    if (inches && /\b(nivel|mochila|bolsa|mala)\b/.test(query) && !hasExactNumber(text, inches)) return true;
    if (/\b3 bolha/.test(query) && !/\b3 bolha/.test(text)) return true;
    if (/\bmagnet/.test(query) && /\bnivel\b/.test(query) && !/\b(magnet|fita magnetica)\b/.test(text)) return true;
    return false;
  }

  Engine.load = async function loadWithCatalog() {
    const data = await originalLoad();
    catalog = Array.isArray(data?.products) ? data.products : [];
    return data;
  };

  Engine.extract = async function extractQuoteIntelligently(text, files = []) {
    if (!files.length) {
      const lines = splitRequestedLines(text);
      const parsed = consolidate(lines.map(parseLine));
      if (parsed.length) return parsed;
    }

    const extracted = await originalExtract(text, files);
    return consolidate((Array.isArray(extracted) ? extracted : []).map(item => ({
      ...item,
      clientCode: readClientCode(item.description),
      matchDescription: cleanClientCode(item.description)
    })));
  };

  Engine.match = function matchWithStockPriority(item) {
    const specialized = findSpecialized(item);
    if (specialized) return makeResult(item, specialized, "alta", 1200 + Math.max(-100, Number(specialized.stock) || 0));

    const query = normalize(item.matchDescription || cleanClientCode(item.description));
    const guardedType = /\b(chave combinada|chave canhao|alicate universal|alicate (?:de )?pressao|nivel|multimetro|mochila|bolsa|mala)\b/.test(query);
    const original = originalMatch({ ...item, description: item.matchDescription || cleanClientCode(item.description) });

    if (guardedType && shouldStayUnknown(item, original.product)) return makeResult(item, null);
    if (original.product && !shouldStayUnknown(item, original.product)) {
      return { ...original, qty: item.qty, unit: item.unit || original.unit, requested: item.description, original: item.original, clientCode: item.clientCode || "" };
    }
    return makeResult(item, null);
  };
})();
