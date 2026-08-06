(() => {
  "use strict";

  const Engine = window.OrcaEngine;
  if (!Engine || typeof Engine.extract !== "function") return;

  const originalExtract = Engine.extract.bind(Engine);

  function splitRequestedItems(text = "") {
    return String(text)
      .replace(/,\s+(?=\d+(?:[.,]\d+)?\s)/g, "\n")
      .replace(/\s+e\s+(?=\d+(?:[.,]\d+)?\s)/gi, "\n")
      .replace(/\s+\+\s+(?=\d+(?:[.,]\d+)?\s)/g, "\n")
      .split(/\n+/)
      .map(item => item.trim())
      .filter(Boolean);
  }

  Engine.extract = async function extractAllRequestedItems(text, files = []) {
    const items = splitRequestedItems(text);

    // Para listas digitadas em uma única frase, processa cada item separadamente.
    // Isso impede que o último produto seja incorporado ao item anterior.
    if (!files.length && items.length > 1) {
      const batches = [];
      for (const item of items) {
        const extracted = await originalExtract(item, []);
        if (Array.isArray(extracted)) batches.push(...extracted);
      }
      return batches;
    }

    return originalExtract(items.join("\n") || text, files);
  };
})();
