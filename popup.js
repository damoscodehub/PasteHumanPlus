// Speed control (default is 100% - normal speed)
let speedFactor = 1.0;

document.addEventListener('DOMContentLoaded', function() {
  // Retrieve speed factor from chrome.storage.local
  chrome.storage.local.get(['speedFactor'], function(result) {
    if (result.speedFactor !== undefined) {
      speedFactor = result.speedFactor;
    }
    updateSpeedDisplay();
  });
});

document.getElementById('decreaseSpeed').addEventListener('click', function() {
  speedFactor = Math.max(0.2, speedFactor - 0.1); // Minimum 20% speed
  saveSpeedFactor();
});

document.getElementById('increaseSpeed').addEventListener('click', function() {
  speedFactor = Math.min(2.0, speedFactor + 0.1); // Maximum 200% speed
  saveSpeedFactor();
});

function saveSpeedFactor() {
  // Save to storage and update display
  chrome.storage.local.set({speedFactor: speedFactor}, function() {
    updateSpeedDisplay();
    // Broadcast speed change to all tabs
    chrome.tabs.query({}, function(tabs) {
      tabs.forEach(function(tab) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'updateSpeedFactor',
          speedFactor: speedFactor
        });
      });
    });
  });
}

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