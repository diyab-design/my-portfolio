// Position the native detail-page text and photos at the measurements of the selected Figma frame.
function createDetailLayout(route, container, windowElement) {
  const layouts = portfolioDetailLayouts.views[route];
  if (!layouts) return;
  const w = container.clientWidth;
  const size = innerWidth <= 382 ? "small" : innerWidth < 600 ? "phone"
    : innerWidth <= 900 ? "tablet" : windowElement.classList.contains("maximized") ? "wide" : "desktop";
  const layout = layouts[size];
  if (!layout || !w) return;
  const maxZoom = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--maximized-scale")) || (w / layout.w);
  const scale = size === "wide" ? Math.min(w / layout.w, maxZoom) : (w / layout.w);
  const stage = document.createElement("article");
  stage.className = "figma-detail";
  stage.setAttribute("aria-label", windowElement.dataset.heading || route);
  stage.style.width = layout.w + "px";
  stage.style.zoom = scale;
  let firstText = true;
  let bottom = 0;
  for (const layer of layout.items) {
    const [x, y, width, height] = layer.rect;
    let element;
    if (layer.type === "text") {
      const segments = portfolioDetailLayouts.text[layer.content];
      element = document.createElement(firstText ? "h1" : "p");
      firstText = false;
      element.style.textAlign = layer.align.toLowerCase();
      for (const [value, family, face, fontSize, color, url, underline] of segments) {
        const link = url && /^(https?:|mailto:)/i.test(url);
        const span = document.createElement(link ? "a" : "span");
        if (link) {
          span.href = url;
          span.target = "_blank";
          span.rel = "noreferrer";
        }
        span.textContent = value.replace(/\u2028/g, "\n");
        span.style.fontFamily = '"' + family + '", ' + (/Mono|Courier/.test(family) ? '"Courier New", monospace' : 'sans-serif');
        span.style.fontSize = fontSize + "px";
        span.style.fontWeight = /semi/i.test(face) ? "600" : /bold/i.test(face) ? "700" : /medium/i.test(face) ? "500" : "400";
        if (/italic/i.test(face)) span.style.fontStyle = "italic";
        if (underline || link) span.style.textDecoration = "underline";
        span.style.color = color || "inherit";
        element.append(span);
      }
      element.dataset.fontSize = Math.max(...segments.map(s => Number(s[3]) || 0));
      element.style.lineHeight = "1.25";
    } else if (layer.type === "photo") {
      if (!layer.src) continue;
      element = document.createElement("img");
      element.src = layer.src;
      element.alt = layer.alt;
    } else {
      element = document.createElement("div");
      element.setAttribute("aria-hidden","true");
      element.style.background = layer.bg || "transparent";
      if (layer.border) element.style.border = layer.sw + "px solid " + layer.border;
      element.style.borderRadius = layer.r + "px";
    }
    element.style.left = x + "px";
    element.style.top = (y-layout.bar) + "px";
    element.style.width = width + "px";
    if (layer.type !== "text") element.style.height = height + "px";
    element.dataset.designWidth = width;
    element.dataset.designHeight = height;
    element.dataset.designTop = y-layout.bar;
    stage.append(element);
    bottom = Math.max(bottom, y-layout.bar+height);
  }
  stage.style.height = Math.ceil(bottom + 36) + "px";
  container.replaceChildren(stage);
  // Account for a different locally available font without clipping paragraphs or cards.
  const children = [...stage.children];
  for (const el of children) {
    const fs = Number(el.dataset.fontSize) || 14;
    if (el.matches("p,h1") && !el.textContent.includes("\n") && Number(el.dataset.designHeight) <= fs * 1.45 && parseFloat(el.style.width) <= 600) {
      el.style.width = "max-content";
      el.style.maxWidth = "calc(100% - " + (parseFloat(el.style.left) || 0) + "px)";
      el.style.whiteSpace = "nowrap";
    }
  }
  const placed = [];
  for (const el of [...children].sort((a,b)=>Number(a.dataset.designTop)-Number(b.dataset.designTop))) {
    const dTop = Number(el.dataset.designTop);
    const dH = Number(el.dataset.designHeight);
    const dLeft = parseFloat(el.style.left) || 0;
    const dW = Number(el.dataset.designWidth) || el.offsetWidth;
    let shift = 0;
    for (const prev of placed) {
      const xOverlap = Math.min(dLeft + dW, prev.right) - Math.max(dLeft, prev.left);
      if (prev.designTop < dTop && (xOverlap > 4 || prev.tag === "IMG")) {
        const designGap = Math.max(0, dTop - prev.designEnd);
        const minGap = designGap <= 12 ? designGap : 10;
        const neededTop = prev.finalBottom + minGap;
        if (neededTop > dTop + shift) {
          shift = neededTop - dTop;
        }
      }
    }
    el.style.top = (dTop + shift) + "px";
    const finalBottom = dTop + shift + el.offsetHeight;
    if (el.matches("p,h1,img")) {
      placed.push({ tag: el.tagName, left: dLeft, right: dLeft + Math.max(dW, el.offsetWidth), designTop: dTop, designEnd: dTop + dH, finalBottom });
    }
    bottom = Math.max(bottom, finalBottom);
  }
  for (const box of children) {
    if (!box.matches("div") || box.classList.contains("figma-detail-photo")) continue;
    const bTop = Number(box.dataset.designTop), bH = Number(box.dataset.designHeight);
    const bLeft = parseFloat(box.style.left) || 0, bW = Number(box.dataset.designWidth) || 0;
    const enclosed = children.filter(c => {
      if (c === box) return false;
      const cTop = Number(c.dataset.designTop), cH = Number(c.dataset.designHeight);
      const cLeft = parseFloat(c.style.left) || 0, cW = Number(c.dataset.designWidth) || 0;
      return cLeft >= bLeft - 2 && cLeft + cW <= bLeft + bW + 2 && cTop >= bTop - 2 && cTop + cH <= bTop + bH + 2;
    });
    if (!enclosed.length) continue;
    const maxDesignBottom = Math.max(...enclosed.map(c => Number(c.dataset.designTop) + Number(c.dataset.designHeight)));
    const bottomPad = Math.max(0, bTop + bH - maxDesignBottom);
    const boxFinalTop = parseFloat(box.style.top) || bTop;
    const maxFinalBottom = Math.max(...enclosed.map(c => (parseFloat(c.style.top) || Number(c.dataset.designTop)) + c.offsetHeight));
    const neededH = Math.max(bH, maxFinalBottom - boxFinalTop + bottomPad);
    box.style.height = neededH + "px";
    const maxDesignRight = Math.max(...enclosed.map(c => (parseFloat(c.style.left) || 0) + Number(c.dataset.designWidth || 0)));
    const rightPad = Math.max(6, bLeft + bW - maxDesignRight);
    const maxFinalRight = Math.max(...enclosed.map(c => (parseFloat(c.style.left) || 0) + c.offsetWidth));
    const neededW = Math.max(bW, maxFinalRight - bLeft + rightPad);
    box.style.width = neededW + "px";
    bottom = Math.max(bottom, boxFinalTop + neededH);
  }
  stage.style.height = Math.ceil(bottom + 36) + "px";
}

