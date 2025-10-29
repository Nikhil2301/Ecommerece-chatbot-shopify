// public/embed.js
(function() {
  if (window.ChatbotIframe) return;
  
  const iframe = document.createElement('iframe');
  iframe.src = 'http://aicommerce.cinohub.com:3001';
  iframe.style.border = 'none';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.setAttribute('allow', 'cookies');
  iframe.setAttribute('crossorigin', 'anonymous');
  iframe.setAttribute('credentialless', 'false');
  
  const container = document.createElement('div');
  container.id = 'chatbot-iframe-container';
  container.style.position = 'fixed';
  container.style.bottom = '20px';
  container.style.right = '20px';
  container.style.width = '400px';
  container.style.height = '600px';
  container.style.zIndex = '9999';
  
  container.appendChild(iframe);
  document.body.appendChild(container);
  
  window.ChatbotIframe = iframe;
})();
