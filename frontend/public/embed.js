// public/embed.js
(function() {
  if (window.ChatbotLoaded) return;
  window.ChatbotLoaded = true;
  var container = document.createElement('div');
  container.id = 'shopify-chatbot-root';
  document.body.appendChild(container);

  var script = document.createElement('script');
  script.src = 'https://aicommerce.cinohub.com/_next/static/chunks/main.js'; // Update with your deployed Next.js build output
  script.async = true;
  document.body.appendChild(script);

  // Optionally, you can use an iframe for isolation
})();
