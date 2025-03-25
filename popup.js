// Default speed (130% instead of 100% for faster default)
let speedFactor = 1.3;

// DOM elements
const elements = {
  speedInput: document.getElementById('speedInput'),
  speedSlider: document.getElementById('speedSlider'),
  decreaseSpeed: document.getElementById('decreaseSpeed'),
  increaseSpeed: document.getElementById('increaseSpeed'),
  shortcutsLink: document.getElementById('shortcutsLink'),
  activateValue: document.getElementById('activateValue'),
  startValue: document.getElementById('startValue'),
  stopValue: document.getElementById('stopValue'),
  toggleValue: document.getElementById('toggleValue')
};

// Initialize the popup
document.addEventListener('DOMContentLoaded', function() {
  loadSpeedFactor();
  loadShortcuts();
  setupEventListeners();
});

function loadSpeedFactor() {
  chrome.storage.local.get(['speedFactor'], function(result) {
    if (result.speedFactor !== undefined) {
      speedFactor = result.speedFactor;
    }
    updateSpeedDisplay();
  });
}

function loadShortcuts() {
  chrome.commands.getAll(function(commands) {
    commands.forEach(command => {
      switch(command.name) {
        case '_execute_action':
          elements.activateValue.textContent = command.shortcut || 'Not set';
          break;
        case 'start_typing':
          elements.startValue.textContent = command.shortcut || 'Not set';
          break;
        case 'stop_typing':
          elements.stopValue.textContent = command.shortcut || 'Not set';
          break;
        case 'toggle_typing':
          elements.toggleValue.textContent = command.shortcut || 'Not set';
          break;
      }
    });
  });
}

function setupEventListeners() {
  // Speed controls
  elements.decreaseSpeed.addEventListener('click', decreaseSpeed);
  elements.increaseSpeed.addEventListener('click', increaseSpeed);
  elements.speedInput.addEventListener('change', handleSpeedInputChange);
  elements.speedSlider.addEventListener('input', handleSpeedSliderChange);
  
  // Shortcuts link
  elements.shortcutsLink.addEventListener('click', function(e) {
    e.preventDefault();
    chrome.tabs.create({url: 'chrome://extensions/shortcuts'});
  });
}

function decreaseSpeed() {
  let value = Math.max(10, Math.floor(speedFactor * 100));
  
  if (value % 10 === 0 && value > 10) {
    value -= 10;
  } else {
    value = Math.floor(value / 10) * 10;
  }
  
  speedFactor = value / 100;
  saveSpeedFactor();
}

function increaseSpeed() {
  let value = Math.min(200, Math.floor(speedFactor * 100));
  
  if (value % 10 === 0 && value < 200) {
    value += 10;
  } else {
    value = Math.ceil(value / 10) * 10;
  }
  
  speedFactor = value / 100;
  saveSpeedFactor();
}

function handleSpeedInputChange() {
  let value = parseInt(elements.speedInput.value);
  
  if (isNaN(value)) {
    value = 100;
  } else {
    value = Math.max(10, Math.min(200, value));
  }
  
  speedFactor = value / 100;
  saveSpeedFactor();
}

function handleSpeedSliderChange() {
  speedFactor = parseInt(elements.speedSlider.value) / 100;
  updateSpeedDisplay();
  saveSpeedFactor();
}

function saveSpeedFactor() {
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
  const value = Math.round(speedFactor * 100);
  elements.speedInput.value = value;
  elements.speedSlider.value = value;
}