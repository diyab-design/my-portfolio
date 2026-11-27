const home = document.querySelector(".desktop");
const panels = [...document.querySelectorAll(".window, .project-window")];
const detail = document.getElementById("projectDetail");
const detailBody = document.getElementById("detailBody");
const theme = document.getElementById("themeToggle");
const zoom = document.getElementById("resumeZoom");
const zoomBtn = document.getElementById("resumeZoomBtn");
let lastOpener;

const viewStack = [""];
let fromClose = false;
(() => {
  const init = location.hash.slice(1);
  if (!init) return;
  const tpl = document.getElementById("view-" + init);
  if (tpl instanceof HTMLTemplateElement && tpl.dataset.parent) viewStack.push(tpl.dataset.parent);
  viewStack.push(init);
})();

function navigate(view = "") {
  if (location.hash.slice(1) === view) return;
  location.hash = view;
}

function closeWindow(panel) {
  const route = location.hash.slice(1);
  const template = document.getElementById("view-" + route);
  if (viewStack.length > 1 && viewStack[viewStack.length - 1] === route) viewStack.pop();
  let destination = viewStack[viewStack.length - 1] || "";
  if (destination === route) destination = "";
  if (!destination && panel === detail && template instanceof HTMLTemplateElement && template.dataset.parent) {
    destination = template.dataset.parent;
    viewStack.push(destination);
  }
  const keepMax = innerWidth > 900 && Boolean(destination) && panel.classList.contains("maximized");
  if (!destination) {
    panels.forEach(item => item.classList.remove("maximized"));
    document.body.classList.remove("page-maximized");
  } else {
    const destPanel = document.getElementById(destination);
    if (destPanel) destPanel.classList.toggle("maximized", keepMax);
  }
  fromClose = true;
  navigate(destination);
}

function breadcrumb(container, text, destination) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = text;
  button.addEventListener("click", () => {
    const activeMax = Boolean(panels.find(p => !p.hidden && p.classList.contains("maximized")));
    if (!destination) {
      viewStack.splice(0, viewStack.length, "");
      panels.forEach(item => item.classList.remove("maximized"));
      document.body.classList.remove("page-maximized");
      fromClose = true;
    } else {
      const idx = viewStack.lastIndexOf(destination);
      if (idx !== -1) {
        viewStack.length = idx + 1;
        fromClose = true;
      }
      if (innerWidth > 900) {
        const target = document.getElementById(destination);
        if (target) target.classList.toggle("maximized", activeMax);
      }
    }
    navigate(destination);
  });
  container.append(button);
}

function renderView() {
  const route = location.hash.slice(1);
  if (fromClose) {
    fromClose = false;
  } else if (!route) {
    viewStack.splice(0, viewStack.length, "");
  } else if (viewStack[viewStack.length - 1] !== route) {
    if (viewStack.length >= 2 && viewStack[viewStack.length - 2] === route) viewStack.pop();
    else viewStack.push(route);
  }
  const template = document.getElementById("view-" + route);
  const panel = template instanceof HTMLTemplateElement ? detail : panels.find(item => item.id === route && item !== detail);
  panels.forEach(item => { item.hidden = item !== panel; });
  document.body.classList.toggle("page-maximized", Boolean(panel?.classList.contains("maximized")));
  if (panel) {
    const size = panel.querySelector(".minimize");
    if (size) {
      const full = panel.classList.contains("maximized");
      size.textContent = full ? "▣" : "□";
      size.setAttribute("aria-label", full ? "Restore window" : "Maximize window");
      size.setAttribute("aria-pressed", String(full));
    }
  }
  home.inert = Boolean(panel);
  const parent = template?.dataset.parent || route;
  home.querySelectorAll(".desktop-folder").forEach(folder => folder.classList.toggle("folder-open", Boolean(panel) && folder.dataset.open === parent));
  home.querySelector(".all-folders").classList.toggle("folder-open", Boolean(panel) && route === "all");
  if (!panel) {
    lastOpener?.focus({preventScroll: true});
    return;
  }
  const path = panel.querySelector(".window-path");
  path.replaceChildren();
  if (!template) {
    breadcrumb(path, "C:\\Diya B", "about");
  } else if (innerWidth > 900) {
    breadcrumb(path, "C:\\Diya B", "about");
  }
  if (!template && (panel.id !== "about" || innerWidth <= 900)) {
    const folderPath = innerWidth <= 900 && ["works","experience","toolbox","resume"].includes(panel.id);
    breadcrumb(path, folderPath ? "\\All folders" : "\\Portfolio", folderPath ? "all" : "");
  }
  if (template) {
    detail.dataset.parent = template.dataset.parent;
    detailBody.replaceChildren(template.content.cloneNode(true));
    if (innerWidth > 900) breadcrumb(path, "\\Portfolio", "");
    breadcrumb(path, template.dataset.parent === "works" ? "\\my works" : "\\experience", template.dataset.parent);
    path.append("\\" + detailBody.querySelector("h1").textContent);
    detail.dataset.heading = detailBody.querySelector("h1").textContent;
    createDetailLayout(route, detailBody, detail);
    detailBody.scrollTop = 0;
  } else if (panel.id === "all") {
    path.append("\\All folders");
  } else if (panel.id === "resume") {
    path.append("\\resume.pdf");
    setResumeZoom(false);
  } else if (panel.id === "contact") {
    path.append(innerWidth <= 900 ? "\\contact me" : "\\Contact Me");
  } else if (panel.id === "about" && innerWidth <= 900) {
    path.append("\\about me");
  } else if (panel.id !== "about") {
    path.append("\\" + panel.getAttribute("aria-label").toLowerCase());
  }
  path.scrollLeft = 0;
  panel.tabIndex = -1;
  panel.focus({preventScroll: true});
}

document.addEventListener("click", event => {
  const trigger = event.target.closest("[data-open], [data-detail]");
  if (trigger) {
    if (home.contains(trigger)) lastOpener = trigger;
    const activePanel = panels.find(p => !p.hidden);
    const keepMax = innerWidth > 900 && !home.contains(trigger) && Boolean(activePanel?.classList.contains("maximized"));
    const targetId = trigger.dataset.detail ? "projectDetail" : trigger.dataset.open;
    const targetPanel = document.getElementById(targetId);
    if (targetPanel) targetPanel.classList.toggle("maximized", keepMax);
    navigate(trigger.dataset.detail || trigger.dataset.open);
  }
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && location.hash) {
    const activePanel = panels.find(panel => !panel.hidden);
    if (activePanel) closeWindow(activePanel);
  }
  if ((event.key === "Enter" || event.key === " ") && event.target.matches("article[data-detail]")) {
    event.preventDefault();
    event.target.click();
  }
});
panels.forEach(panel => {
  const close = panel.querySelector(".close");
  close.setAttribute("aria-label", "Close window");
  close.addEventListener("click", () => closeWindow(panel));
  const size = panel.querySelector(".minimize");
  if (size) {
    size.textContent = "□";
    size.setAttribute("aria-label", "Maximize window");
    size.addEventListener("click", () => {
      const full = panel.classList.toggle("maximized");
      size.textContent = full ? "▣" : "□";
      size.setAttribute("aria-label", full ? "Restore window" : "Maximize window");
      size.setAttribute("aria-pressed", String(full));
      document.body.classList.toggle("page-maximized", full);
      if (panel === detail && detail.dataset.parent) {
        document.getElementById(detail.dataset.parent)?.classList.toggle("maximized", full);
      }
    });
  }
});
function setResumeZoom(zoomed) {
  zoom.setAttribute("aria-pressed", String(zoomed));
  if (zoomBtn) {
    zoomBtn.textContent = zoomed ? "− Fit to screen" : "+ Zoom in";
    zoomBtn.setAttribute("aria-label", zoomed ? "Fit résumé to screen" : "Zoom in résumé");
  }
}
zoom.addEventListener("click", () => {
  if (innerWidth <= 900 && zoom.getAttribute("aria-pressed") !== "true") setResumeZoom(true);
});
zoomBtn?.addEventListener("click", () => setResumeZoom(zoom.getAttribute("aria-pressed") !== "true"));
theme.addEventListener("click", () => {
  const dark = document.body.classList.toggle("dark");
  document.getElementById("themeLabel").textContent = dark ? "dark mode" : "light mode";
  theme.setAttribute("aria-pressed", String(dark));
});
window.addEventListener("hashchange", renderView);
renderView();

document.getElementById("contactForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const subject = encodeURIComponent(`Portfolio message from ${data.get("name")}`);
  const body = encodeURIComponent(`${data.get("message")}\n\nFrom: ${data.get("name")} (${data.get("email")})`);
  window.location.href = `mailto:diyababuraj2006@gmail.com?subject=${subject}&body=${body}`;
});

let lastCompact = innerWidth <= 900;
function sizeDesktopWindow() {
  const frameScale = Math.min(innerWidth / 1440, innerHeight / 900);
  const maxBarH = 65 * frameScale;
  document.documentElement.style.setProperty("--window-scale", Math.min(frameScale, 1.25));
  document.documentElement.style.setProperty("--maximized-scale", frameScale);
  document.documentElement.style.setProperty("--maximized-body-h", ((innerHeight - maxBarH) / frameScale) + "px");
  const compact = innerWidth <= 900;
  if (compact !== lastCompact) {
    lastCompact = compact;
    renderView();
  }
}
sizeDesktopWindow();
window.addEventListener("resize", sizeDesktopWindow);

let lastDetailWidth = 0;
new ResizeObserver(() => {
  const width = detailBody.clientWidth;
  if (!detail.hidden && width && width !== lastDetailWidth) {
    lastDetailWidth = width;
    createDetailLayout(location.hash.slice(1), detailBody, detail);
  }
}).observe(detailBody);
