document.addEventListener('mousemove', function(event) {
  chrome.runtime.sendMessage({
    type: 'interactionUpdate',
    timestamp: new Date().getTime()
  });
});
