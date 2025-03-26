// Default speed
let speedFactor = 1.0;
let menuStrings = {
  main: "v",
  start: ">",
  toggle: "╠",
  stop: "."
};

// DOM elements
const elements = {
  speedInput: document.getElementById('speedInput'),
  speedSlider: document.getElementById('speedSlider'),
  decreaseSpeed: document.getElementById('decreaseSpeed'),
  increaseSpeed: document.getElementById('increaseSpeed'),
  activateValue: document.getElementById('activateValue'),
  startValue: document.getElementById('startValue'),
  stopValue: document.getElementById('stopValue'),
  toggleValue: document.getElementById('toggleValue'),
  changeShortcutsBtn: document.getElementById('changeShortcutsBtn'),
  changeMenuStringsBtn: document.getElementById('changeMenuStringsBtn'),
  mainMenuDisplay: document.getElementById('mainMenuDisplay'),
  startMenuDisplay: document.getElementById('startMenuDisplay'),
  toggleMenuDisplay: document.getElementById('toggleMenuDisplay'),
  stopMenuDisplay: document.getElementById('stopMenuDisplay'),
  shortcutsModal: document.getElementById('shortcutsModal'),
  menuStringsModal: document.getElementById('menuStringsModal'),
  mainMenuInput: document.getElementById('mainMenuInput'),
  startMenuInput: document.getElementById('startMenuInput'),
  toggleMenuInput: document.getElementById('toggleMenuInput'),
  stopMenuInput: document.getElementById('stopMenuInput'),
  cancelMenuStringsBtn: document.getElementById('cancelMenuStringsBtn'),
  applyMenuStringsBtn: document.getElementById('applyMenuStringsBtn'),
  shortcutsLink: document.getElementById('shortcutsLink')
};

// Helper functions for modal animations
function showModal(modal) {
  modal.style.display = 'flex';
  setTimeout(() => {
    modal.classList.add('show');
  }, 10);
}

function hideModal(modal) {
  modal.classList.remove('show');
  setTimeout(() => {
    modal.style.display = 'none';
  }, 150);
}

// Initialize the popup
document.addEventListener('DOMContentLoaded', function() {
  loadSpeedFactor();
  loadShortcuts();
  loadMenuStrings();
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

function loadMenuStrings() {
  chrome.storage.local.get(['menuStrings'], function(result) {
    if (result.menuStrings) {
      menuStrings = result.menuStrings;
    }
    updateContextMenuInstructions();
  });
}

function setupEventListeners() {
  // Speed controls
  elements.decreaseSpeed.addEventListener('click', decreaseSpeed);
  elements.increaseSpeed.addEventListener('click', increaseSpeed);
  elements.speedInput.addEventListener('change', handleSpeedInputChange);
  elements.speedSlider.addEventListener('input', handleSpeedSliderChange);
  
  // Shortcuts button
  elements.changeShortcutsBtn.addEventListener('click', function() {
    showModal(elements.shortcutsModal);
  });
  
  // Menu strings button
  elements.changeMenuStringsBtn.addEventListener('click', function() {
    // Initialize inputs with current values
    elements.mainMenuInput.value = menuStrings.main;
    elements.startMenuInput.value = menuStrings.start;
    elements.toggleMenuInput.value = menuStrings.toggle;
    elements.stopMenuInput.value = menuStrings.stop;
    
    showModal(elements.menuStringsModal);
  });
  
  
  // Modal close handlers
  elements.shortcutsLink.addEventListener('click', function(e) {
    e.preventDefault();
    chrome.tabs.create({url: 'chrome://extensions/shortcuts'});
    hideModal(elements.shortcutsModal);
  });
  
  // Menu strings modal buttons
  elements.cancelMenuStringsBtn.addEventListener('click', function() {
    hideModal(elements.menuStringsModal);
  });
  
  elements.applyMenuStringsBtn.addEventListener('click', function() {
    menuStrings = {
      main: elements.mainMenuInput.value || "v",
      start: elements.startMenuInput.value || ">",
      toggle: elements.toggleMenuInput.value || "╠",
      stop: elements.stopMenuInput.value || "."
    };
    
    chrome.storage.local.set({menuStrings: menuStrings}, function() {
      updateContextMenuInstructions();
      updateContextMenu();
      hideModal(elements.menuStringsModal);
    });
  });
  
  // Close modals when clicking outside
  window.addEventListener('click', function(event) {
    if (event.target === elements.shortcutsModal) {
      hideModal(elements.shortcutsModal);
    }
    if (event.target === elements.menuStringsModal) {
      hideModal(elements.menuStringsModal);
    }
  });
}

function updateContextMenuInstructions() {
  elements.mainMenuDisplay.textContent = menuStrings.main;
  elements.startMenuDisplay.textContent = menuStrings.start;
  elements.toggleMenuDisplay.textContent = menuStrings.toggle;
  elements.stopMenuDisplay.textContent = menuStrings.stop;
}

function updateContextMenu() {
  chrome.runtime.sendMessage({
    action: 'updateContextMenu',
    menuStrings: menuStrings
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