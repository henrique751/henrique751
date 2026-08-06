(() => {
  "use strict";

  const Engine = window.OrcaEngine;
  if (!Engine || typeof Engine.extract !== "function") return;

  const originalExtract = Engine.extract.bind(Engine);

  function separateRequestedItems(text = "") {
    return String(text)
      .replace(/,\s+(?=\d+(?:[.,]\d+)?\s)/g, "\n")
      .replace(/\s+e\s+(?=\d+(?:[.,]\d+)?\s)/gi, "\n")
      .replace(/\s+\+\s+(?=\d+(?:[.,]\d+)?\s)/g, "\n");
  }

  Engine.extract = async function extractWithoutDroppingItems(text, files = []) {
    const preparedText = separateRequestedItems(text);
    return originalExtract(preparedText, files);
  };
})();
