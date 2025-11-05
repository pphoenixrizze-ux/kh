(function(){
  if (typeof window === 'undefined') return;
  if (window.__AI_REPORT_INITED__) return; 
  window.__AI_REPORT_INITED__ = true;

  function initAIReport() {
    try {
      console.log('🔧 AI Report module initialized.');
      const generateBtn = document.getElementById('generate-report');
      const downloadBtn = document.getElementById('download-pdf');
      if (generateBtn) console.log('✅ Generate button detected');
      if (downloadBtn) console.log('✅ Download button detected');
    } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAIReport);
  } else {
    initAIReport();
  }
})();
