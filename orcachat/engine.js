(() => {
  "use strict";

  const CONFIG = window.ORCACHAT_CONFIG || {};
  const aliases = {
    furadeiras: "furadeira", brocas: "broca", alicates: "alicate",
    parafusadeiras: "parafusadeira", esmerilhadeiras: "esmerilhadeira",
    lixadeiras: "lixadeira", marteletes: "martelete", chaves: "chave",
    soquetes: "soquete", discos: "disco", serras: "serra",
    bombas: "bomba", geradores: "gerador", motores: "motor",
    adaptadores: "adaptador", baterias: "bateria", unidades: "unidade",
    pecas: "peca", metros: "metro", quilos: "quilo", gramas: "grama",
    litros: "litro", caixas: "caixa", jogos: "jogo",
    furadera: "furadeira", parafuzadeira: "parafusadeira",
    esmerilhadera: "esmerilhadeira", comprensor: "compressor",
    ferro: "metal", aco: "metal", hss: "metal", und: "unidade",
    un: "unidade", pç: "peca", pc: "peca", mt: "metro",
    mts: "metro", gr: "grama", lt: "litro", jg: "jogo"
  };
  const productNouns = new Set(["broca","alicate","furadeira","parafusadeira","esmerilhadeira","lixadeira","martelete","chave","soquete","disco","serra","bomba","motor","gerador","compressor","adaptador","bateria","escova","parafuso","porca","arruela","mangueira","registro","joelho","tomada","disjuntor","lampada","eletrodo","solda","rolamento","engate","pistola","pulverizador","roçadeira","motosserra","policorte","retificadeira","carregador"]);
  const stopWords = new Set(["para","com","sem","de","do","da","dos","das","em","mm","cm","pol","v","volt","unidade","peca","metro","quilo","grama","litro","caixa","jogo"]);
  const materials = {
    metal: ["metal", "ferro", "aco", "inox", "hss"],
    madeira: ["madeira"], concreto: ["concreto", "alvenaria"],
    porcelanato: ["porcelanato"], vidro: ["vidro"]
  };
  let catalog = [];
  let brands = [];

  function strip(value = "") {
    return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  function normalize(value = "") {
    return strip(value).toLowerCase()
      .replace(/([0-9])\s*(milimetros?|mm)\b/g, "$1 mm")
      .replace(/([0-9])\s*(volts?|v)\b/g, "$1 v")
      .replace(/\bmeia\b/g, "1/2")
      .replace(/\btres quartos\b/g, "3/4")
      .replace(/[^a-z0-9/.,+\-]+/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(token => aliases[token] || token)
      .join(" ");
  }
  function tokens(value) {
    return [...new Set(normalize(value).split(/\s+/).filter(token => token.length > 1 || /^\d$/.test(token)))];
  }
  function formatQty(value) {
    const n = Number(value);
    return Number.isInteger(n) ? String(n) : String(n).replace(".", ",");
  }
  function canonicalUnit(raw = "") {
    const unit = normalize(raw);
    if (["m", "metro"].includes(unit)) return "M";
    if (["kg", "quilo"].includes(unit)) return "KG";
    if (["g", "grama"].includes(unit)) return "G";
    if (["l", "litro"].includes(unit)) return "L";
    if (["cx", "caixa"].includes(unit)) return "CX";
    if (["jogo", "kit"].includes(unit)) return "JG";
    if (["peca", "unidade"].includes(unit)) return "UN";
    return "UN";
  }
  function parseLine(line) {
    const clean = String(line || "")
      .replace(/^[-–—*•]+\s*/, "")
      .replace(/^\d+[.)]\s+(?=[A-Za-zÀ-ÿ])/, "")
      .trim();
    if (!clean) return null;
    const match = clean.match(/^\s*(\d+(?:[.,]\d+)?)\s*(un|und|unid|unidade|pc|pcs|pç|pçs|peca|pecas|m|mt|mts|metro|metros|kg|quilo|quilos|g|gr|grama|gramas|l|lt|litro|litros|cx|caixa|caixas|jg|jogo|kit|x)?\s+(.+)$/i);
    if (match) {
      return {
        qty: Number(match[1].replace(",", ".")) || 1,
        unit: canonicalUnit(match[2]),
        description: match[3].trim(),
        original: clean
      };
    }
    const trailing = clean.match(/^(.+?)\s+[xX]\s*(\d+(?:[.,]\d+)?)$/);
    if (trailing) return { qty: Number(trailing[2].replace(",", ".")) || 1, unit: "UN", description: trailing[1].trim(), original: clean };
    return { qty: 1, unit: "UN", description: clean, original: clean };
  }
  function parseText(raw = "") {
    let text = String(raw).replace(/\r/g, "\n").replace(/[•●▪◦]/g, "\n").replace(/\t+/g, " ");
    let lines = text.split(/\n+|;/).map(value => value.trim()).filter(Boolean);
    if (lines.length === 1 && /,\s*(?=\d+\s)/.test(lines[0])) lines = lines[0].split(/,\s*(?=\d+\s)/).map(value => value.trim());
    const ignored = /^(codigo|descri[cç][aã]o|fabricante|minimo|maximo|estoque|quantidade|qtd|item|or[cç]amento|cliente|telefone|endere[cç]o)\b/i;
    const items = lines.map(parseLine).filter(item => item && !ignored.test(strip(item.description)));
    return items.length ? items.slice(0, 100) : (text.trim() ? [parseLine(text.trim())].filter(Boolean) : []);
  }
  async function load() {
    const data = await window.__ORCACHAT_CATALOG;
    catalog = Array.isArray(data?.products) ? data.products : [];
    brands = [...new Set(catalog.map(product => normalize(product.brand)).filter(Boolean))];
    return data;
  }
  function scoreProduct(product, item) {
    const query = normalize(item.description);
    const sku = normalize(product.sku);
    const reference = normalize(product.reference || "");
    if (query === sku) return { score: 1000, coverage: 1, primaryMatch: true, descriptorCoverage: 1, exact: true };
    if (reference && query === reference) return { score: 900, coverage: 1, primaryMatch: true, descriptorCoverage: 1, exact: true };

    const hay = normalize([product.name, product.brand, product.reference, product.category, product.application, ...(product.tags || [])].join(" "));
    const hayTokens = new Set(tokens(hay));
    const queryTokens = tokens(query);
    const queryWords = queryTokens.filter(token => !/^\d+(?:[.,/]\d+)*$/.test(token));
    const queryNouns = queryWords.filter(word => productNouns.has(word));
    const queryNumbers = queryTokens.filter(token => /\d/.test(token));
    const primaryMatch = !queryNouns.length || queryNouns.some(noun => hayTokens.has(noun) || [...hayTokens].some(token => token.startsWith(noun) || noun.startsWith(token)));
    let score = primaryMatch ? 0 : -90;
    let matched = 0;

    const requestedBrand = brands.find(brand => queryTokens.includes(brand));
    if (requestedBrand && normalize(product.brand) !== requestedBrand) score -= 65;
    for (const [material, equivalents] of Object.entries(materials)) {
      if (queryTokens.includes(material) && !equivalents.some(term => hay.includes(term))) score -= 45;
    }
    const voltage = query.match(/\b(\d{2,3}) v\b/);
    if (voltage && !hay.includes(`${voltage[1]} v`)) score -= 42;
    const measurements = [...query.matchAll(/\b(\d+(?:[.,]\d+)?) (mm|pol|cv|kg|litro|l)\b/g)];
    measurements.forEach(measure => { if (!hay.includes(`${measure[1]} ${measure[2]}`)) score -= 22; });

    queryTokens.forEach(token => {
      if (token === sku) { score += 160; matched++; return; }
      if (reference && token === reference) { score += 130; matched++; return; }
      if (hayTokens.has(token)) { score += /\d/.test(token) ? 18 : 10; matched++; return; }
      if (token.length >= 4 && [...hayTokens].some(hayToken => hayToken.startsWith(token) || token.startsWith(hayToken))) { score += 4; matched++; }
    });
    queryNumbers.forEach(number => { score += hay.includes(number) ? 7 : -9; });
    if (normalize(product.brand) && queryWords.includes(normalize(product.brand))) score += 14;
    if (Number(product.stock) > 0) score += Math.min(7, Math.log10(Number(product.stock) + 1) * 3);
    if (Number(product.stock) < 0) score -= 2;
    const coverage = matched / Math.max(queryTokens.length, 1);
    if (coverage === 1) score += 16;
    if (queryWords.length && !queryWords.some(word => hay.includes(word))) score -= 25;
    const descriptorWords = queryWords.filter(word => !stopWords.has(word) && !brands.includes(word));
    const descriptorMatches = descriptorWords.filter(word => hayTokens.has(word) || [...hayTokens].some(token => token.startsWith(word) || word.startsWith(token))).length;
    const descriptorCoverage = descriptorMatches / Math.max(descriptorWords.length, 1);
    return { score, coverage, primaryMatch, descriptorCoverage };
  }
  function match(item) {
    const rawDescription = String(item.description || "").trim();
    const explicitSku = rawDescription.match(/^(?:sku|codigo|código)?\s*[:#-]?\s*(\d{3,6})$/i);
    if (explicitSku) {
      const sku = explicitSku[1].padStart(6, "0");
      const product = catalog.find(row => String(row.sku).padStart(6, "0") === sku);
      if (product) return {
        id: crypto.randomUUID ? crypto.randomUUID() : `q-${Date.now()}-${Math.random()}`,
        key: `sku:${product.sku}`, qty: item.qty, unit: item.unit, requested: item.description, original: item.original,
        product, confidence: "alta", score: 1000
      };
    }
    let best = null;
    let second = null;
    for (const product of catalog) {
      const result = scoreProduct(product, item);
      const row = { product, ...result };
      if (!best || row.score > best.score) { second = best; best = row; }
      else if (!second || row.score > second.score) second = row;
    }
    const margin = best && second ? best.score - second.score : (best?.score || 0);
    const queryTokenCount = tokens(item.description).length;
    const confident = best && best.primaryMatch && best.descriptorCoverage >= 0.5 && ((best.score >= 44 && best.coverage >= 0.58 && (margin >= 2 || queryTokenCount >= 4)) || (best.score >= 62 && best.coverage >= 0.46));
    const probable = best && !confident && best.primaryMatch && best.descriptorCoverage >= 0.6 && best.score >= 34 && best.coverage >= 0.48 && margin >= 4;
    return {
      id: crypto.randomUUID ? crypto.randomUUID() : `q-${Date.now()}-${Math.random()}`,
      key: confident || probable ? `sku:${best.product.sku}` : `raw:${normalize(item.description)}`,
      qty: item.qty,
      unit: item.unit,
      requested: item.description,
      original: item.original,
      product: confident || probable ? best.product : null,
      confidence: confident ? "alta" : probable ? "provavel" : "nao_identificado",
      score: best?.score || 0
    };
  }
  function loadScript(src, globalName) {
    if (globalName && window[globalName]) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src; script.onload = resolve; script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  async function readSpreadsheet(file) {
    await loadScript("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js", "XLSX");
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
    return workbook.SheetNames.map(name => XLSX.utils.sheet_to_csv(workbook.Sheets[name])).join("\n");
  }
  async function readPdf(file) {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js", "pdfjsLib");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    let text = "";
    for (let pageNo = 1; pageNo <= Math.min(pdf.numPages, 30); pageNo++) {
      const page = await pdf.getPage(pageNo);
      const content = await page.getTextContent();
      text += `\n${content.items.map(item => item.str).join(" ")}`;
    }
    return text;
  }
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  async function extractWithGemini(text, files) {
    if (!CONFIG.geminiEndpoint) return null;
    const attachments = [];
    for (const file of files) {
      if (file.size > 8 * 1024 * 1024) continue;
      if (file.type.startsWith("image/") || file.type === "application/pdf") attachments.push({ name: file.name, mimeType: file.type, data: await fileToBase64(file) });
    }
    const response = await fetch(CONFIG.geminiEndpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, attachments }) });
    if (!response.ok) throw new Error(`Gemini ${response.status}`);
    const data = await response.json();
    return Array.isArray(data.items) ? data.items.map(item => ({ qty: Number(item.qty) || 1, unit: canonicalUnit(item.unit), description: String(item.description || "").trim(), original: String(item.original || item.description || "").trim() })).filter(item => item.description) : null;
  }
  async function extract(text, files = []) {
    if (CONFIG.geminiEndpoint && (files.length || text.length > 350)) {
      try { const items = await extractWithGemini(text, files); if (items?.length) return items; } catch (error) { console.warn("Gemini indisponível; usando leitura local", error); }
    }
    let combined = text || "";
    for (const file of files) {
      if (file.type.startsWith("text/") || /\.(csv|txt)$/i.test(file.name)) combined += `\n${await file.text()}`;
      else if (/\.xlsx?$/i.test(file.name)) combined += `\n${await readSpreadsheet(file)}`;
      else if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) combined += `\n${await readPdf(file)}`;
      else if (file.type.startsWith("image/")) combined += `\n1 unidade ${file.name} (imagem para conferência do vendedor)`;
    }
    return parseText(combined);
  }

  window.OrcaEngine = { load, extract, match, normalize, formatQty };
})();
