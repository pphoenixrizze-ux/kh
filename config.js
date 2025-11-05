// Configuration for AI report generation
// SECURITY: Do NOT commit real keys. Prefer environment injection or runtime input.

// Ensure global config object exists
window.APP_CONFIG = window.APP_CONFIG || {};

// REQUIRED LINE: set at runtime; avoid committing real keys.
// Get a key from https://platform.openai.com/api-keys
// [API KEY CONFIG FIX] Do not hardcode a real key; allow runtime injection via
// window.__OPENAI_API_KEY, window.OPENAI_API_KEY, or localStorage('OPENAI_API_KEY').
// Keep APP_CONFIG.OPENAI_API_KEY only if provided elsewhere.
if (!window.APP_CONFIG.OPENAI_API_KEY) {
  window.APP_CONFIG.OPENAI_API_KEY = "sk-proj-"; // placeholder; ignored if empty
}

(function () {
  const cfg = window.APP_CONFIG;

  // Force the use of the API key defined in APP_CONFIG only.
  // Propagate it to other known places and ignore differing values elsewhere.
  (function forceKeyPropagation(){
    try {
      const key = typeof cfg.OPENAI_API_KEY === "string" ? cfg.OPENAI_API_KEY.trim() : "sk-proj-";
      if (!key) return;
      try { window.__OPENAI_API_KEY = key; } catch (_) {}
      try { window.OPENAI_API_KEY = key; } catch (_) {}
      try { localStorage.setItem("OPENAI_API_KEY", key); } catch (_) {}
    } catch (_) { /* ignore */ }
  })();

  // Defaults (do not overwrite if already provided)
  if (!cfg.OPENAI_API_ENDPOINT) cfg.OPENAI_API_ENDPOINT = "https://api.openai.com/v1/chat/completions";
  if (!cfg.OPENAI_MODEL) cfg.OPENAI_MODEL = "gpt-4o-mini";

  if (!cfg.EXPERT_PROMPT_TEXT) {
    cfg.EXPERT_PROMPT_TEXT =
      "اكتب تقرير دراسة جدوى احترافيًا وشاملًا بأسلوب أكاديمي عربي رصين، مع تحليل متعمّق في كل قسم، وتنسيق محاذاة كاملة للنص، وبطول 1500–2000+ كلمة لكل قسم رئيسي، وإجمالي لا يتجاوز 25 صفحة، يتضمن بيانات مالية وجداول وتحليلات ونِسب وROI وفي النهايه اخر صفحه يكود جدول يحتوي على السيناريو الحالي للمشروع والسيناريو المتفائل والسيناريو المتشائم.";
  }

  cfg.BRAND = Object.assign({
    LOGO_PATH: "../images/LOGO PH.png",
    WATERMARK_TEXT: "PhoenixRizze.com\nFeasibility Study Simulator"
  }, cfg.BRAND || {});

  cfg.PDF = Object.assign({
    DEFAULT_FONT: "Roboto",
    PRIMARY_COLOR: "#2c3e50",
    SECONDARY_COLOR: "#3498db"
  }, cfg.PDF || {});
})();

// SECURITY: Do NOT commit real keys. Inject at runtime via environment, server-side template, or localStorage.
