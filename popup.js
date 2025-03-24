// Speed control (default is 100% - normal speed)
let speedFactor = 1.0;

document.getElementById('decreaseSpeed').addEventListener('click', function() {
  speedFactor = Math.max(0.2, speedFactor - 0.1); // Minimum 20% speed
  updateSpeedDisplay();
});

document.getElementById('increaseSpeed').addEventListener('click', function() {
  speedFactor = Math.min(2.0, speedFactor + 0.1); // Maximum 200% speed
  updateSpeedDisplay();
});

function updateSpeedDisplay() {
  document.getElementById('speedValue').textContent = `${Math.round(speedFactor * 100)}%`;
}

// Shortcuts link
document.getElementById('shortcutsLink').addEventListener('click', function() {
  chrome.tabs.create({url: 'chrome://extensions/shortcuts'});
});

// Start typing button
document.getElementById('startTyping').addEventListener('click', function() {
  setTimeout(function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'emulateTyping',
        delayedStart: true,
        speedFactor: speedFactor
      });
    });
  }, 5000);
});