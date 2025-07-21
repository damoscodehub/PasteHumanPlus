// Default values
let speedFactor = 1.0;
let randomnessFactor = 1.0;
let mistakeProbability = 0.03; // Default: 3%
let menuStrings = {
  main: "v",
  start: ">",
  toggle: "╠",
  stop: "."
};

// Centralized configuration for all parameters
const PARAM_CONFIG = {
  speedFactor: { default: 1.0, min: 10, max: 200 },
  randomnessFactor: { default: 1.0, min: 10, max: 200 },
  mistakeProbability: { default: 0.03, min: 0, max: 20 },
  immediateFixPercentage: { default: 75, min: 0, max: 100 },
  minCharsBeforeReview: { default: 5, min: 1, max: 50 },
  maxCharsBeforeReview: { default: 15, min: 1, max: 50 },
  minReviewPause: { default: 2000, min: 10, max: 10000 },
  maxReviewPause: { default: 5000, min: 10, max: 10000 },
  minImmediateFixPause: { default: 500, min: 10, max: 10000 },
  maxImmediateFixPause: { default: 3000, min: 10, max: 10000 },
  minBetweenFixPause: { default: 1000, min: 10, max: 10000 },
  maxBetweenFixPause: { default: 3000, min: 10, max: 10000 },
  allowWordNavigation: { default: true }
};

// Extract default values for backward compatibility
const DEFAULT_VALUES = Object.fromEntries(
  Object.entries(PARAM_CONFIG).map(([key, config]) => [key, config.default])
);
// Advanced settings defaults
let advancedSettings = {
  immediateFixPercentage: DEFAULT_VALUES.immediateFixPercentage,
  minCharsBeforeReview: DEFAULT_VALUES.minCharsBeforeReview,
  maxCharsBeforeReview: DEFAULT_VALUES.maxCharsBeforeReview,
  minReviewPause: DEFAULT_VALUES.minReviewPause,
  maxReviewPause: DEFAULT_VALUES.maxReviewPause,
  minImmediateFixPause: DEFAULT_VALUES.minImmediateFixPause,
  maxImmediateFixPause: DEFAULT_VALUES.maxImmediateFixPause,
  minBetweenFixPause: DEFAULT_VALUES.minBetweenFixPause,
  maxBetweenFixPause: DEFAULT_VALUES.maxBetweenFixPause,
  allowWordNavigation: DEFAULT_VALUES.allowWordNavigation
};
// Store snapshot of advanced options when modal opens
let advancedOptionsSnapshot = null;
function getCurrentAdvancedOptions() {
  return {
    speedFactor: speedFactor,
    randomnessFactor: randomnessFactor,
    mistakeProbability: mistakeProbability,
    immediateFixPercentage: advancedSettings.immediateFixPercentage,
    minCharsBeforeReview: advancedSettings.minCharsBeforeReview,
    maxCharsBeforeReview: advancedSettings.maxCharsBeforeReview,
    minReviewPause: advancedSettings.minReviewPause,
    maxReviewPause: advancedSettings.maxReviewPause,
    minImmediateFixPause: advancedSettings.minImmediateFixPause,
    maxImmediateFixPause: advancedSettings.maxImmediateFixPause,
    minBetweenFixPause: advancedSettings.minBetweenFixPause,
    maxBetweenFixPause: advancedSettings.maxBetweenFixPause,
    allowWordNavigation: advancedSettings.allowWordNavigation
  };
}

function isAdvancedOptionsChanged() {
  if (!advancedOptionsSnapshot) return false;
  const current = getCurrentAdvancedOptions();
for (const key in current) {
    if (current[key] !== advancedOptionsSnapshot[key]) {
      return true;
}
  }
  return false;
}

function updateApplyAdvancedOptionsBtnState() {
  const btn = elements.applyAdvancedOptionsBtn;
  if (!btn) return;
  if (isAdvancedOptionsChanged() && allAdvancedInputsValid()) {
    btn.disabled = false;
    btn.classList.remove('disabled');
  } else {
    btn.disabled = true;
    btn.classList.add('disabled');
  }
  
  // Show/hide restore defaults button based on whether any values differ from defaults
  const hasNonDefaultValues = checkForNonDefaultValues();
  if (elements.restoreDefaultsBtn) {
    elements.restoreDefaultsBtn.style.display = hasNonDefaultValues ? 'block' : 'none';
  }
}

function checkForNonDefaultValues() {
  // Use the centralized DEFAULT_VALUES for consistency
  const defaultValues = {
    speedFactor: DEFAULT_VALUES.speedFactor * 100, // Convert to percentage
    randomnessFactor: DEFAULT_VALUES.randomnessFactor * 100, // Convert to percentage
    mistakeProbability: DEFAULT_VALUES.mistakeProbability * 100, // Convert to percentage
    allowWordNavigation: DEFAULT_VALUES.allowWordNavigation,
    immediateFixPercentage: DEFAULT_VALUES.immediateFixPercentage,
    minCharsBeforeReview: DEFAULT_VALUES.minCharsBeforeReview,
    maxCharsBeforeReview: DEFAULT_VALUES.maxCharsBeforeReview,
    minReviewPause: DEFAULT_VALUES.minReviewPause,
    maxReviewPause: DEFAULT_VALUES.maxReviewPause,
    minImmediateFixPause: DEFAULT_VALUES.minImmediateFixPause,
    maxImmediateFixPause: DEFAULT_VALUES.maxImmediateFixPause,
    minBetweenFixPause: DEFAULT_VALUES.minBetweenFixPause,
    maxBetweenFixPause: DEFAULT_VALUES.maxBetweenFixPause
  };
  
  // Check if any current value differs from default
  for (const [key, defaultValue] of Object.entries(defaultValues)) {
    if (key === 'allowWordNavigation') {
      if (advancedSettings[key] !== defaultValue) return true;
    } else if (key === 'speedFactor' || key === 'randomnessFactor' || key === 'mistakeProbability') {
      // These are stored as decimals but compared as percentages
      const currentValue = key === 'speedFactor' ? speedFactor * 100 : 
                          key === 'randomnessFactor' ? randomnessFactor * 100 : 
                          mistakeProbability * 100;
      if (Math.round(currentValue) !== defaultValue) return true;
    } else {
      if (parseInt(advancedSettings[key]) !== defaultValue) return true;
    }
  }
  return false;
}

function restoreAllDefaults() {
  // Restore all advanced settings to default values using centralized DEFAULT_VALUES
  advancedSettings = {
    allowWordNavigation: DEFAULT_VALUES.allowWordNavigation,
    immediateFixPercentage: DEFAULT_VALUES.immediateFixPercentage,
    minCharsBeforeReview: DEFAULT_VALUES.minCharsBeforeReview,
    maxCharsBeforeReview: DEFAULT_VALUES.maxCharsBeforeReview,
    minReviewPause: DEFAULT_VALUES.minReviewPause,
    maxReviewPause: DEFAULT_VALUES.maxReviewPause,
    minImmediateFixPause: DEFAULT_VALUES.minImmediateFixPause,
    maxImmediateFixPause: DEFAULT_VALUES.maxImmediateFixPause,
    minBetweenFixPause: DEFAULT_VALUES.minBetweenFixPause,
    maxBetweenFixPause: DEFAULT_VALUES.maxBetweenFixPause
  };
  
  // Restore main settings (these are stored separately)
  speedFactor = DEFAULT_VALUES.speedFactor;
  randomnessFactor = DEFAULT_VALUES.randomnessFactor;
  mistakeProbability = DEFAULT_VALUES.mistakeProbability;
  
  // Update all UI elements to reflect the default values
  updateAdvancedDisplay();
  updateSpeedDisplay();
  updateRandomnessDisplay();
  updateMistakeDisplay();
  
  // Update the button states
  updateApplyAdvancedOptionsBtnState();
}

// === DYNAMIC ADVANCED TOOLTIP ENHANCEMENT ===
// Map input IDs to PARAM_CONFIG keys and descriptions
const ADVANCED_OPTION_ROWS = [
  { rowId: 'advancedSpeedInput', key: 'speedFactor', desc: 'Typing speed multiplier (higher = faster typing)' },
  { rowId: 'advancedRandomnessInput', key: 'randomnessFactor', desc: 'Randomness of typing delays (higher = more variation in timing)' },
  { rowId: 'advancedMistakeInput', key: 'mistakeProbability', desc: 'Probability of making typing mistakes (0-20%)' },
  { rowId: 'immediateFixPercentageInput', key: 'immediateFixPercentage', desc: 'Percentage of mistakes fixed immediately vs. delayed' },
  { rowId: 'minCharsBeforeReviewInput', key: 'minCharsBeforeReview', desc: 'Minimum characters typed before triggering review phase' },
  { rowId: 'maxCharsBeforeReviewInput', key: 'maxCharsBeforeReview', desc: 'Maximum characters typed before triggering review phase' },
  { rowId: 'minReviewPauseInput', key: 'minReviewPause', desc: 'Minimum pause duration before review phase (milliseconds)' },
  { rowId: 'maxReviewPauseInput', key: 'maxReviewPause', desc: 'Maximum pause duration before review phase (milliseconds)' },
  { rowId: 'minImmediateFixPauseInput', key: 'minImmediateFixPause', desc: 'Minimum pause before immediate fix (milliseconds)' },
  { rowId: 'maxImmediateFixPauseInput', key: 'maxImmediateFixPause', desc: 'Maximum pause before immediate fix (milliseconds)' },
  { rowId: 'minBetweenFixPauseInput', key: 'minBetweenFixPause', desc: 'Minimum pause between fixes during review (milliseconds)' },
  { rowId: 'maxBetweenFixPauseInput', key: 'maxBetweenFixPause', desc: 'Maximum pause between fixes during review (milliseconds)' },
  { rowId: 'allowWordNavigationInput', key: 'allowWordNavigation', desc: 'Allow using Ctrl+Arrow to jump word-by-word during navigation' }
];

function updateAdvancedOptionTooltips() {
  console.log('PARAM_CONFIG keys:', Object.keys(PARAM_CONFIG));
  ADVANCED_OPTION_ROWS.forEach(opt => {
    const input = document.getElementById(opt.rowId);
    if (!input) {
      console.log('Input not found for rowId:', opt.rowId);
      return;
    }
    // Find the parent <tr>
    let tr = input.closest('tr');
    if (!tr) return;
    const config = PARAM_CONFIG[opt.key];
    console.log('Tooltip debug:', {rowId: opt.rowId, key: opt.key, config});
    let tooltip = opt.desc;
    if (config) {
      if (typeof config.default === 'boolean') {
        tooltip += ` (Default: ${config.default ? 'Enabled' : 'Disabled'})`;
      } else {
        tooltip += ` (Min: ${config.min}, Max: ${config.max}, Default: ${config.default})`;
      }
    }
    console.log('Final tooltip:', tooltip);
    tr.title = tooltip;
  });
}

// DOM elements
const elements = {
  speedInput: document.getElementById('speedInput'),
  speedSlider: document.getElementById('speedSlider'),
  decreaseSpeed: document.getElementById('decreaseSpeed'),
  increaseSpeed: document.getElementById('increaseSpeed'),
  randomnessInput: document.getElementById('randomnessInput'),
  randomnessSlider: document.getElementById('randomnessSlider'),
  decreaseRandomness: document.getElementById('decreaseRandomness'),
  increaseRandomness: document.getElementById('increaseRandomness'),
  activateValue: document.getElementById('activateValue'),
  startValue: document.getElementById('startValue'),
  stopValue: document.getElementById('stopValue'),
  toggleValue: document.getElementById('toggleValue'),
  shortcutsBtn: document.getElementById('shortcutsBtn'),
  secondaryClickBtn: document.getElementById('secondaryClickBtn'),
  advancedOptionsBtn: document.getElementById('advancedOptionsBtn'),
  mainMenuDisplay: document.getElementById('mainMenuDisplay'),
  startMenuDisplay: document.getElementById('startMenuDisplay'),
  toggleMenuDisplay: document.getElementById('toggleMenuDisplay'),
  stopMenuDisplay: document.getElementById('stopMenuDisplay'),
  shortcutsModal: document.getElementById('shortcutsModal'),
  menuStringsModal: document.getElementById('menuStringsModal'),
  advancedOptionsModal: document.getElementById('advancedOptionsModal'),
  mainMenuInput: document.getElementById('mainMenuInput'),
  startMenuInput: document.getElementById('startMenuInput'),
  toggleMenuInput: document.getElementById('toggleMenuInput'),
  stopMenuInput: document.getElementById('stopMenuInput'),
  cancelMenuStringsBtn: document.getElementById('cancelMenuStringsBtn'),
  applyMenuStringsBtn: document.getElementById('applyMenuStringsBtn'),
  cancelAdvancedOptionsBtn: document.getElementById('cancelAdvancedOptionsBtn'),
  applyAdvancedOptionsBtn: document.getElementById('applyAdvancedOptionsBtn'),
  restoreDefaultsBtn: document.getElementById('restoreDefaultsBtn'),
  shortcutsLink: document.getElementById('shortcutsLink'),
  
mistakeInput: document.getElementById('mistakeInput'),
  mistakeSlider: document.getElementById('mistakeSlider'),
  decreaseMistake: document.getElementById('decreaseMistake'),
  increaseMistake: document.getElementById('increaseMistake'),
  // Advanced elements
  advancedSpeedInput: document.getElementById('advancedSpeedInput'),
  advancedRandomnessInput: document.getElementById('advancedRandomnessInput'),
  advancedMistakeInput: document.getElementById('advancedMistakeInput'),
  immediateFixPercentageInput: document.getElementById('immediateFixPercentageInput'),
  minCharsBeforeReviewInput: document.getElementById('minCharsBeforeReviewInput'),
  maxCharsBeforeReviewInput: document.getElementById('maxCharsBeforeReviewInput'),
  minReviewPauseInput: document.getElementById('minReviewPauseInput'),
  maxReviewPauseInput: document.getElementById('maxReviewPauseInput'),
  minImmediateFixPauseInput: document.getElementById('minImmediateFixPauseInput'),
  maxImmediateFixPauseInput: document.getElementById('maxImmediateFixPauseInput'),
  minBetweenFixPauseInput: document.getElementById('minBetweenFixPauseInput'),
  maxBetweenFixPauseInput: document.getElementById('maxBetweenFixPauseInput'),
  allowWordNavigationInput: document.getElementById('allowWordNavigationInput')
};
// Add or update floating error tooltip above input
function setInputError(input, message) {
  let tooltip = input.parentElement.querySelector('.input-error-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.className = 'input-error-tooltip';
    input.parentElement.appendChild(tooltip);
  }
  tooltip.textContent = message;
  input.classList.add('input-invalid');
}

function clearInputError(input) {
  let tooltip = input.parentElement.querySelector('.input-error-tooltip');
  if (tooltip) tooltip.textContent = '';
  input.classList.remove('input-invalid');
}

function validateAndUpdateSetting(inputElement, settingKey) {
  const config = PARAM_CONFIG[settingKey];
  let value = inputElement.value;
  let valid = true;
  let errorMsg = '';
  if (inputElement.type === 'number') {
    if (value === '' || isNaN(Number(value))) {
      valid = false;
      errorMsg = 'Please enter a valid number.';
    } else {
      value = Number(value);
      if (typeof config.min === 'number' && value < config.min) {
        valid = false;
        errorMsg = `Value must be at least ${config.min}.`;
      } else if (typeof config.max === 'number' && value > config.max) {
        valid = false;
        errorMsg = `Value must be at most ${config.max}.`;
      }
    }
    if (!valid) {
      setInputError(inputElement, errorMsg);
    } else {
      clearInputError(inputElement);
      advancedSettings[settingKey] = value;
    }
  } else {
    // For checkboxes, always valid
    clearInputError(inputElement);
    advancedSettings[settingKey] = inputElement.checked;
  }
  updateRestoreButton(settingKey, inputElement);
  updateApplyAdvancedOptionsBtnState();
  return valid;
}

// Check all advanced number inputs for validity
function allAdvancedInputsValid() {
  return ADVANCED_OPTION_ROWS.every(opt => {
    const input = document.getElementById(opt.rowId);
    if (!input || input.type !== 'number') return true;
    return !input.classList.contains('input-invalid');
  });
}

// Update Apply button state based on input validity
function updateApplyAdvancedOptionsBtnState() {
  const btn = elements.applyAdvancedOptionsBtn;
  if (!btn) return;
  if (isAdvancedOptionsChanged() && allAdvancedInputsValid()) {
    btn.disabled = false;
    btn.classList.remove('disabled');
  } else {
    btn.disabled = true;
    btn.classList.add('disabled');
  }
  // Show/hide restore defaults button based on whether any values differ from defaults
  const hasNonDefaultValues = checkForNonDefaultValues();
  if (elements.restoreDefaultsBtn) {
    elements.restoreDefaultsBtn.style.display = hasNonDefaultValues ? 'block' : 'none';
  }
}

// Attach real-time validation to all advanced number inputs
function attachAdvancedInputValidation() {
  ADVANCED_OPTION_ROWS.forEach(opt => {
    const input = document.getElementById(opt.rowId);
    if (!input || input.type !== 'number') return;
    input.addEventListener('input', () => validateAndUpdateSetting(input, opt.key));
    // Initial validation
    validateAndUpdateSetting(input, opt.key);
  });
}

// Helper functions for modal animations
function showModal(modal) {
  console.log('showModal called for modal:', modal && modal.id);
  console.log('modal.id value:', modal.id, 'type:', typeof modal.id, 'modal object:', modal);
  modal.style.display = 'flex';
setTimeout(() => {
    modal.classList.add('show');
  }, 10);
  if (modal.id === 'advancedOptionsModal') {
    console.log('advancedOptionsModal block entered, calling updateAdvancedOptionTooltips');
    updateAdvancedOptionTooltips();
    attachAdvancedInputValidation();
  }
}

function hideModal(modal) {
  modal.classList.remove('show');
setTimeout(() => {
    modal.style.display = 'none';
  }, 150);
}

// Initialize the popup
document.addEventListener('DOMContentLoaded', function() {
  loadShortcuts();
  loadSettings();
  setupEventListeners();
});

function populateHtmlDefaults() {
  // Populate HTML input values and constraints from PARAM_CONFIG to ensure consistency
  if (elements.advancedSpeedInput) {
    elements.advancedSpeedInput.value = Math.round(DEFAULT_VALUES.speedFactor * 100);
    elements.advancedSpeedInput.min = PARAM_CONFIG.speedFactor.min;
    elements.advancedSpeedInput.max = PARAM_CONFIG.speedFactor.max;
  }
  if (elements.advancedRandomnessInput) {
    elements.advancedRandomnessInput.value = Math.round(DEFAULT_VALUES.randomnessFactor * 100);
    elements.advancedRandomnessInput.min = PARAM_CONFIG.randomnessFactor.min;
    elements.advancedRandomnessInput.max = PARAM_CONFIG.randomnessFactor.max;
  }
  if (elements.advancedMistakeInput) {
    elements.advancedMistakeInput.value = Math.round(DEFAULT_VALUES.mistakeProbability * 100);
    elements.advancedMistakeInput.min = PARAM_CONFIG.mistakeProbability.min;
    elements.advancedMistakeInput.max = PARAM_CONFIG.mistakeProbability.max;
  }
  if (elements.immediateFixPercentageInput) {
    elements.immediateFixPercentageInput.value = DEFAULT_VALUES.immediateFixPercentage;
    elements.immediateFixPercentageInput.min = PARAM_CONFIG.immediateFixPercentage.min;
    elements.immediateFixPercentageInput.max = PARAM_CONFIG.immediateFixPercentage.max;
  }
  if (elements.minCharsBeforeReviewInput) {
    elements.minCharsBeforeReviewInput.value = DEFAULT_VALUES.minCharsBeforeReview;
    elements.minCharsBeforeReviewInput.min = PARAM_CONFIG.minCharsBeforeReview.min;
    elements.minCharsBeforeReviewInput.max = PARAM_CONFIG.minCharsBeforeReview.max;
  }
  if (elements.maxCharsBeforeReviewInput) {
    elements.maxCharsBeforeReviewInput.value = DEFAULT_VALUES.maxCharsBeforeReview;
    elements.maxCharsBeforeReviewInput.min = PARAM_CONFIG.maxCharsBeforeReview.min;
    elements.maxCharsBeforeReviewInput.max = PARAM_CONFIG.maxCharsBeforeReview.max;
  }
  if (elements.minReviewPauseInput) {
    elements.minReviewPauseInput.value = DEFAULT_VALUES.minReviewPause;
    elements.minReviewPauseInput.min = PARAM_CONFIG.minReviewPause.min;
    elements.minReviewPauseInput.max = PARAM_CONFIG.minReviewPause.max;
  }
  if (elements.maxReviewPauseInput) {
    elements.maxReviewPauseInput.value = DEFAULT_VALUES.maxReviewPause;
    elements.maxReviewPauseInput.min = PARAM_CONFIG.maxReviewPause.min;
    elements.maxReviewPauseInput.max = PARAM_CONFIG.maxReviewPause.max;
  }
  if (elements.minImmediateFixPauseInput) {
    elements.minImmediateFixPauseInput.value = DEFAULT_VALUES.minImmediateFixPause;
    elements.minImmediateFixPauseInput.min = PARAM_CONFIG.minImmediateFixPause.min;
    elements.minImmediateFixPauseInput.max = PARAM_CONFIG.minImmediateFixPause.max;
  }
  if (elements.maxImmediateFixPauseInput) {
    elements.maxImmediateFixPauseInput.value = DEFAULT_VALUES.maxImmediateFixPause;
    elements.maxImmediateFixPauseInput.min = PARAM_CONFIG.maxImmediateFixPause.min;
    elements.maxImmediateFixPauseInput.max = PARAM_CONFIG.maxImmediateFixPause.max;
  }
  if (elements.minBetweenFixPauseInput) {
    elements.minBetweenFixPauseInput.value = DEFAULT_VALUES.minBetweenFixPause;
    elements.minBetweenFixPauseInput.min = PARAM_CONFIG.minBetweenFixPause.min;
    elements.minBetweenFixPauseInput.max = PARAM_CONFIG.minBetweenFixPause.max;
  }
  if (elements.maxBetweenFixPauseInput) {
    elements.maxBetweenFixPauseInput.value = DEFAULT_VALUES.maxBetweenFixPause;
    elements.maxBetweenFixPauseInput.min = PARAM_CONFIG.maxBetweenFixPause.min;
    elements.maxBetweenFixPauseInput.max = PARAM_CONFIG.maxBetweenFixPause.max;
  }
  if (elements.allowWordNavigationInput) {
    elements.allowWordNavigationInput.checked = DEFAULT_VALUES.allowWordNavigation;
  }
}
function loadSettings() {
  chrome.storage.local.get(['speedFactor', 'randomnessFactor', 'mistakeProbability', 'menuStrings', 'advancedSettings'], function(result) {
    let hasStoredSettings = false;
    
    if (result.speedFactor !== undefined) {
      speedFactor = result.speedFactor;
      hasStoredSettings = true;
    }
    if (result.randomnessFactor !== undefined) {
      randomnessFactor = result.randomnessFactor;
      hasStoredSettings = true;
    }
    if (result.mistakeProbability !== undefined) {
      mistakeProbability = result.mistakeProbability;
      hasStoredSettings = true;
    }
    if (result.menuStrings) {
      menuStrings = result.menuStrings;
    }
    if (result.advancedSettings) {
      advancedSettings = {...advancedSettings, ...result.advancedSettings};
      hasStoredSettings = true;
    }
    
    if (hasStoredSettings) {
      // Only update displays if we have stored settings
      updateSpeedDisplay();
      updateRandomnessDisplay();
      updateMistakeDisplay();
      updateAdvancedDisplay();
    } else {
      // Use defaults if no stored settings
      populateHtmlDefaults();
    }
    
    updateContextMenuInstructions();
    loadShortcuts();
  });
}

function loadAdvancedSettings() {
  chrome.storage.local.get(['advancedSettings'], function(result) {
    if (result.advancedSettings) {
      advancedSettings = {...advancedSettings, ...result.advancedSettings};
    }
    updateAdvancedDisplay();
  });
}

function saveAdvancedSettings() {
  chrome.storage.local.set({advancedSettings: advancedSettings}, function() {
    console.log('Advanced settings saved');
    // Send updated settings to content script
    sendAdvancedSettingsToContent();
  });
}

function sendAdvancedSettingsToContent() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'updateAdvancedSettings',
        settings: advancedSettings
      });
    }
  });
}

function updateAdvancedDisplay() {
  // Update advanced speed controls
  if (elements.advancedSpeedInput) {
    elements.advancedSpeedInput.value = Math.round(speedFactor * 100);
}
  
  // Update advanced randomness controls
  if (elements.advancedRandomnessInput) {
    elements.advancedRandomnessInput.value = Math.round(randomnessFactor * 100);
}
  
  // Update advanced mistake controls
  if (elements.advancedMistakeInput) {
    elements.advancedMistakeInput.value = Math.round(mistakeProbability * 100);
}
  
  // Update editable values
  if (elements.immediateFixPercentageInput) {
    elements.immediateFixPercentageInput.value = advancedSettings.immediateFixPercentage;
}
  if (elements.minCharsBeforeReviewInput) {
    elements.minCharsBeforeReviewInput.value = advancedSettings.minCharsBeforeReview;
}
  if (elements.maxCharsBeforeReviewInput) {
    elements.maxCharsBeforeReviewInput.value = advancedSettings.maxCharsBeforeReview;
}
  if (elements.minReviewPauseInput) {
    elements.minReviewPauseInput.value = advancedSettings.minReviewPause;
}
  if (elements.maxReviewPauseInput) {
    elements.maxReviewPauseInput.value = advancedSettings.maxReviewPause;
}
  if (elements.minImmediateFixPauseInput) {
    elements.minImmediateFixPauseInput.value = advancedSettings.minImmediateFixPause;
}
  if (elements.maxImmediateFixPauseInput) {
    elements.maxImmediateFixPauseInput.value = advancedSettings.maxImmediateFixPause;
}
  if (elements.minBetweenFixPauseInput) {
    elements.minBetweenFixPauseInput.value = advancedSettings.minBetweenFixPause;
}
  if (elements.maxBetweenFixPauseInput) {
    elements.maxBetweenFixPauseInput.value = advancedSettings.maxBetweenFixPause;
}
  if (elements.allowWordNavigationInput) {
    elements.allowWordNavigationInput.checked = advancedSettings.allowWordNavigation;
}
  
  // Update restore buttons after updating all values
  updateRestoreButtons();
}

// Make editable values clickable and editable
function makeEditable(element, settingKey, min = 0, max = 9999, isSpeedRandomness = false) {
  if (!element) return;
element.addEventListener('click', function() {
    let currentValue;
    if (isSpeedRandomness) {
      if (settingKey === 'speedFactor') {
        currentValue = Math.round(speedFactor * 100);
      } else if (settingKey === 'randomnessFactor') {
        currentValue = Math.round(randomnessFactor * 100);
      } else if (settingKey === 'mistakeProbability') {
        currentValue = Math.round(mistakeProbability * 100);
      }
    } else {
     
 currentValue = parseInt(element.value);
    }
    
    const input = document.createElement('input');
    input.type = 'number';
    input.value = currentValue;
    input.min = min;
    input.max = max;
    input.style.cssText = `
      width: ${element.offsetWidth}px;
      height: ${element.offsetHeight}px;
      border: 2px solid var(--secondary-color);
      border-radius: 3px;
      font-family: inherit;
      font-size: inherit;
      text-align: center;
 
     background: white;
    `;
    
    element.style.display = 'none';
    element.parentNode.insertBefore(input, element);
input.focus();
    input.select();
    
    function finishEdit() {
      const newValue = parseInt(input.value);
if (!isNaN(newValue) && newValue >= min && newValue <= max) {
        if (isSpeedRandomness) {
          if (settingKey === 'speedFactor') {
            speedFactor = newValue / 100;
saveSpeedFactor();
          } else if (settingKey === 'randomnessFactor') {
            randomnessFactor = newValue / 100;
saveRandomnessFactor();
          } else if (settingKey === 'mistakeProbability') {
            mistakeProbability = newValue / 100;
saveMistakeProbability();
          }
        } else {
          advancedSettings[settingKey] = newValue;
}
        element.value = newValue;
} else {
        element.value = currentValue;
}
      element.style.display = 'inline';
      input.remove();
    }
    
    input.addEventListener('blur', finishEdit);
input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        finishEdit();
      } else if (e.key === 'Escape') {
        element.value = currentValue;
        element.style.display = 'inline';
        input.remove();
      }
    });
});
}

// Helper functions for restore default functionality
function isValueDifferentFromDefault(currentValue, defaultValue, isPercentage = false) {
  if (isPercentage) {
    return Math.abs(currentValue - defaultValue) > 0.001;
// Small tolerance for floating point
  }
  return currentValue !== defaultValue;
}

function getCurrentValue(settingKey) {
  switch(settingKey) {
    case 'speedFactor':
      return speedFactor;
case 'randomnessFactor':
      return randomnessFactor;
    case 'mistakeProbability':
      return mistakeProbability;
default:
      return advancedSettings[settingKey];
  }
}

function restoreDefaultValue(settingKey) {
  const defaultValue = DEFAULT_VALUES[settingKey];
switch(settingKey) {
    case 'speedFactor':
      speedFactor = defaultValue;
      saveSpeedFactor();
      break;
case 'randomnessFactor':
      randomnessFactor = defaultValue;
      saveRandomnessFactor();
      break;
case 'mistakeProbability':
      mistakeProbability = defaultValue;
      saveMistakeProbability();
      break;
default:
      advancedSettings[settingKey] = defaultValue;
      // Update the input field immediately
      const inputElement = elements[settingKey + 'Input'];
if (inputElement) {
        inputElement.value = defaultValue;
      }
      break;
}
  
  updateAdvancedDisplay();
  updateRestoreButtons();
  updateApplyAdvancedOptionsBtnState(); // <-- Add this line
}

function updateRestoreButtons() {
  // Update restore buttons for main parameters
  updateRestoreButton('speedFactor', elements.advancedSpeedInput, true);
updateRestoreButton('randomnessFactor', elements.advancedRandomnessInput, true);
  updateRestoreButton('mistakeProbability', elements.advancedMistakeInput, true);
  
  // Update restore buttons for advanced parameters
  updateRestoreButton('immediateFixPercentage', elements.immediateFixPercentageInput);
  updateRestoreButton('minCharsBeforeReview', elements.minCharsBeforeReviewInput);
  updateRestoreButton('maxCharsBeforeReview', elements.maxCharsBeforeReviewInput);
updateRestoreButton('minReviewPause', elements.minReviewPauseInput);
  updateRestoreButton('maxReviewPause', elements.maxReviewPauseInput);
  updateRestoreButton('minImmediateFixPause', elements.minImmediateFixPauseInput);
  updateRestoreButton('maxImmediateFixPause', elements.maxImmediateFixPauseInput);
  updateRestoreButton('minBetweenFixPause', elements.minBetweenFixPauseInput);
  updateRestoreButton('maxBetweenFixPause', elements.maxBetweenFixPauseInput);
  updateRestoreButton('allowWordNavigation', elements.allowWordNavigationInput);
}

function updateRestoreButton(settingKey, inputElement, isPercentage = false) {
  if (!inputElement) return;
  
  const currentValue = getCurrentValue(settingKey);
  const defaultValue = DEFAULT_VALUES[settingKey];
const isDifferent = isValueDifferentFromDefault(currentValue, defaultValue, isPercentage);
  
  // Find the table cell that contains the input
  const tableCell = inputElement.closest('td');
if (!tableCell) return;
  
  // Find or create the restore button
  let restoreButton = tableCell.querySelector('.restore-default-btn');
if (isDifferent) {
    if (!restoreButton) {
      restoreButton = document.createElement('button');
      restoreButton.className = 'restore-default-btn';
restoreButton.innerHTML = '↺';
      restoreButton.title = ` Click to restore default (${defaultValue}${isPercentage ? '%' : ''}).`;
restoreButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        restoreDefaultValue(settingKey);
      });
tableCell.appendChild(restoreButton);
    }
    restoreButton.style.display = 'inline-block';
  } else if (restoreButton) {
    restoreButton.style.display = 'none';
}
}

function loadShortcuts() {
  // Debugging: Check if elements exist
  console.log('Elements:', {
    startValue: !!elements.startValue,
    stopValue: !!elements.stopValue,
    toggleValue: !!elements.toggleValue,
    activateValue: !!elements.activateValue
  });
chrome.commands.getAll(function(commands) {
    console.log('Retrieved commands:', commands);

    commands.forEach(command => {
      console.log(`Processing command: ${command.name}, Shortcut: ${command.shortcut}`);

      switch(command.name) {
        case '_execute_action':
          if (elements.activateValue) {
            elements.activateValue.textContent = command.shortcut || 'Not set';
          }
          break;
        case 'start_typing':
   
       if (elements.startValue) {
            elements.startValue.textContent = command.shortcut || 'Not set';
          }
          break;
        case 'stop_typing':
          if (elements.stopValue) {
            elements.stopValue.textContent = command.shortcut || 'Not set';
          }
      
    break;
        case 'toggle_typing':
          if (elements.toggleValue) {
            elements.toggleValue.textContent = command.shortcut || 'Not set';
          }
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
// Randomness controls
  elements.decreaseRandomness.addEventListener('click', decreaseRandomness);
  elements.increaseRandomness.addEventListener('click', increaseRandomness);
  elements.randomnessInput.addEventListener('change', handleRandomnessInputChange);
  elements.randomnessSlider.addEventListener('input', handleRandomnessSliderChange);
  
  // Mistake controls
  elements.decreaseMistake.addEventListener('click', decreaseMistake);
  elements.increaseMistake.addEventListener('click', increaseMistake);
elements.mistakeInput.addEventListener('change', handleMistakeInputChange);
  elements.mistakeSlider.addEventListener('input', handleMistakeSliderChange);
  
  // Shortcuts button
  elements.shortcutsBtn.addEventListener('click', function() {
    showModal(elements.shortcutsModal);
  });
// Secondary click button
  elements.secondaryClickBtn.addEventListener('click', function() {
    elements.mainMenuInput.value = menuStrings.main;
    elements.startMenuInput.value = menuStrings.start;
    elements.toggleMenuInput.value = menuStrings.toggle;
    elements.stopMenuInput.value = menuStrings.stop;
    showModal(elements.menuStringsModal);
  });
// Advanced options button
  elements.advancedOptionsBtn.addEventListener('click', function() {
    loadAdvancedSettings();
    showModal(elements.advancedOptionsModal);
    // Take snapshot of current values
    advancedOptionsSnapshot = getCurrentAdvancedOptions();
    updateApplyAdvancedOptionsBtnState();
  });
// Advanced speed controls
  if (elements.advancedSpeedInput) {
    elements.advancedSpeedInput.addEventListener('change', function() {
      let newValue = parseInt(elements.advancedSpeedInput.value);
      if (!isNaN(newValue) && newValue >= 10 && newValue <= 200) {
        speedFactor = newValue / 100;
        saveSpeedFactor();
        updateRestoreButton('speedFactor', elements.advancedSpeedInput, true);
      }
      updateApplyAdvancedOptionsBtnState();
    });
}
  
  // Advanced randomness controls
  if (elements.advancedRandomnessInput) {
    elements.advancedRandomnessInput.addEventListener('change', function() {
      let newValue = parseInt(elements.advancedRandomnessInput.value);
      if (!isNaN(newValue) && newValue >= 10 && newValue <= 200) {
        randomnessFactor = newValue / 100;
        saveRandomnessFactor();
        updateRestoreButton('randomnessFactor', elements.advancedRandomnessInput, true);
      }
      updateApplyAdvancedOptionsBtnState();
    });
}
  
  // Advanced mistake controls
  if (elements.advancedMistakeInput) {
    elements.advancedMistakeInput.addEventListener('change', function() {
      let newValue = parseInt(elements.advancedMistakeInput.value);
      if (!isNaN(newValue) && newValue >= 0 && newValue <= 20) {
        mistakeProbability = newValue / 100;
        saveMistakeProbability();
        updateRestoreButton('mistakeProbability', elements.advancedMistakeInput, true);
      }
      updateApplyAdvancedOptionsBtnState();
    });
}
  
  // Advanced options modal buttons
  if (elements.cancelAdvancedOptionsBtn) {
    elements.cancelAdvancedOptionsBtn.addEventListener('click', function() {
      // Revert advancedSettings and UI fields to snapshot
      if (advancedOptionsSnapshot) {
        Object.assign(advancedSettings, advancedOptionsSnapshot);
        // Update all UI fields to match snapshot
        if (elements.immediateFixPercentageInput) elements.immediateFixPercentageInput.value = advancedOptionsSnapshot.immediateFixPercentage;
        if (elements.minCharsBeforeReviewInput) elements.minCharsBeforeReviewInput.value = advancedOptionsSnapshot.minCharsBeforeReview;
        if (elements.maxCharsBeforeReviewInput) elements.maxCharsBeforeReviewInput.value = advancedOptionsSnapshot.maxCharsBeforeReview;
        if (elements.minReviewPauseInput) elements.minReviewPauseInput.value = advancedOptionsSnapshot.minReviewPause;
        if (elements.maxReviewPauseInput) elements.maxReviewPauseInput.value = advancedOptionsSnapshot.maxReviewPause;
        if (elements.minImmediateFixPauseInput) elements.minImmediateFixPauseInput.value = advancedOptionsSnapshot.minImmediateFixPause;
        if (elements.maxImmediateFixPauseInput) elements.maxImmediateFixPauseInput.value = advancedOptionsSnapshot.maxImmediateFixPause;
        if (elements.minBetweenFixPauseInput) elements.minBetweenFixPauseInput.value = advancedOptionsSnapshot.minBetweenFixPause;
        if (elements.maxBetweenFixPauseInput) elements.maxBetweenFixPauseInput.value = advancedOptionsSnapshot.maxBetweenFixPause;
        if (elements.allowWordNavigationInput) elements.allowWordNavigationInput.checked = advancedOptionsSnapshot.allowWordNavigation;
        updateRestoreButtons();
        updateApplyAdvancedOptionsBtnState();
      }
      hideModal(elements.advancedOptionsModal);
    });
}
  
  if (elements.applyAdvancedOptionsBtn) {
    elements.applyAdvancedOptionsBtn.addEventListener('click', function() {
      saveAdvancedSettings();
      hideModal(elements.advancedOptionsModal);
      advancedOptionsSnapshot = getCurrentAdvancedOptions();
      updateApplyAdvancedOptionsBtnState();
    });
  }
  
  if (elements.restoreDefaultsBtn) {
    elements.restoreDefaultsBtn.addEventListener('click', function() {
      restoreAllDefaults();
    });
  }
  
  // Advanced parameter input listeners
  if (elements.immediateFixPercentageInput) {
    elements.immediateFixPercentageInput.addEventListener('input', function() {
      validateAndUpdateSetting(this, 'immediateFixPercentage');
      updateApplyAdvancedOptionsBtnState();
    });
    elements.immediateFixPercentageInput.addEventListener('change', function() {
      validateAndUpdateSetting(this, 'immediateFixPercentage');
      updateApplyAdvancedOptionsBtnState();
    });
  }
  
  if (elements.minCharsBeforeReviewInput) {
    elements.minCharsBeforeReviewInput.addEventListener('input', function() {
      validateAndUpdateSetting(this, 'minCharsBeforeReview');
      updateApplyAdvancedOptionsBtnState();
    });
    elements.minCharsBeforeReviewInput.addEventListener('change', function() {
      validateAndUpdateSetting(this, 'minCharsBeforeReview');
      updateApplyAdvancedOptionsBtnState();
    });
  }
  
  if (elements.maxCharsBeforeReviewInput) {
    elements.maxCharsBeforeReviewInput.addEventListener('input', function() {
      validateAndUpdateSetting(this, 'maxCharsBeforeReview');
      updateApplyAdvancedOptionsBtnState();
    });
    elements.maxCharsBeforeReviewInput.addEventListener('change', function() {
      validateAndUpdateSetting(this, 'maxCharsBeforeReview');
      updateApplyAdvancedOptionsBtnState();
    });
  }
  
  if (elements.minReviewPauseInput) {
    elements.minReviewPauseInput.addEventListener('input', function() {
      validateAndUpdateSetting(this, 'minReviewPause');
      updateApplyAdvancedOptionsBtnState();
    });
    elements.minReviewPauseInput.addEventListener('change', function() {
      validateAndUpdateSetting(this, 'minReviewPause');
      updateApplyAdvancedOptionsBtnState();
    });
  }
  
  if (elements.maxReviewPauseInput) {
    elements.maxReviewPauseInput.addEventListener('input', function() {
      validateAndUpdateSetting(this, 'maxReviewPause');
      updateApplyAdvancedOptionsBtnState();
    });
    elements.maxReviewPauseInput.addEventListener('change', function() {
      validateAndUpdateSetting(this, 'maxReviewPause');
      updateApplyAdvancedOptionsBtnState();
    });
  }
  
  // Centralized validation function
  function validateAndUpdateSetting(inputElement, settingKey) {
    const newValue = parseInt(inputElement.value);
    const config = PARAM_CONFIG[settingKey];
    
    if (!isNaN(newValue) && newValue >= config.min && newValue <= config.max) {
      advancedSettings[settingKey] = newValue;
      updateRestoreButton(settingKey, inputElement);
      return true;
    }
    return false;
  }

  if (elements.minImmediateFixPauseInput) {
    elements.minImmediateFixPauseInput.addEventListener('input', function() {
      validateAndUpdateSetting(this, 'minImmediateFixPause');
      updateApplyAdvancedOptionsBtnState();
    });
    elements.minImmediateFixPauseInput.addEventListener('change', function() {
      validateAndUpdateSetting(this, 'minImmediateFixPause');
      updateApplyAdvancedOptionsBtnState();
    });
  }
  
  if (elements.maxImmediateFixPauseInput) {
    elements.maxImmediateFixPauseInput.addEventListener('input', function() {
      validateAndUpdateSetting(this, 'maxImmediateFixPause');
      updateApplyAdvancedOptionsBtnState();
    });
    elements.maxImmediateFixPauseInput.addEventListener('change', function() {
      validateAndUpdateSetting(this, 'maxImmediateFixPause');
      updateApplyAdvancedOptionsBtnState();
    });
  }
  
  if (elements.minBetweenFixPauseInput) {
    elements.minBetweenFixPauseInput.addEventListener('input', function() {
      validateAndUpdateSetting(this, 'minBetweenFixPause');
      updateApplyAdvancedOptionsBtnState();
    });
    elements.minBetweenFixPauseInput.addEventListener('change', function() {
      validateAndUpdateSetting(this, 'minBetweenFixPause');
      updateApplyAdvancedOptionsBtnState();
    });
  }
  
  if (elements.maxBetweenFixPauseInput) {
    elements.maxBetweenFixPauseInput.addEventListener('input', function() {
      validateAndUpdateSetting(this, 'maxBetweenFixPause');
      updateApplyAdvancedOptionsBtnState();
    });
    elements.maxBetweenFixPauseInput.addEventListener('change', function() {
      validateAndUpdateSetting(this, 'maxBetweenFixPause');
      updateApplyAdvancedOptionsBtnState();
    });
  }
  
  if (elements.allowWordNavigationInput) {
    elements.allowWordNavigationInput.addEventListener('change', function() {
      advancedSettings.allowWordNavigation = elements.allowWordNavigationInput.checked;
      updateRestoreButton('allowWordNavigation', elements.allowWordNavigationInput);
      updateApplyAdvancedOptionsBtnState();
    });
}
  
  // Shortcuts link
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
    if (event.target === elements.advancedOptionsModal) {
      hideModal(elements.advancedOptionsModal);
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

// Speed control functions
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
  if (isNaN(value)) value = 100;
  value = Math.max(10, Math.min(200, value));
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
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'updateSpeedFactor',
        speedFactor: speedFactor
      });
    });
  });
}

function updateSpeedDisplay() {
  const value = Math.round(speedFactor * 100);
  elements.speedInput.value = value;
  elements.speedSlider.value = value;
}

// Randomness control functions
function decreaseRandomness() {
  let value = Math.max(0, Math.floor(randomnessFactor * 100) - 10);
// Simple -10 with floor at 0
  randomnessFactor = value / 100;
  saveRandomnessFactor();
}

function increaseRandomness() {
  let value = Math.min(200, Math.floor(randomnessFactor * 100) + 10);
// Simple +10 with ceiling at 200
  randomnessFactor = value / 100;
  saveRandomnessFactor();
}

function handleRandomnessInputChange() {
  let value = parseInt(elements.randomnessInput.value);
  if (isNaN(value)) value = 100;
  value = Math.max(0, Math.min(200, value));
randomnessFactor = value / 100;
  saveRandomnessFactor();
}

function handleRandomnessSliderChange() {
  randomnessFactor = parseInt(elements.randomnessSlider.value) / 100;
  updateRandomnessDisplay();
  saveRandomnessFactor();
}

function saveRandomnessFactor() {
  chrome.storage.local.set({randomnessFactor: randomnessFactor}, function() {
    updateRandomnessDisplay();
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'updateRandomnessFactor',
        randomnessFactor: randomnessFactor
      });
    });
  });
}

function updateRandomnessDisplay() {
  const value = Math.round(randomnessFactor * 100);
  elements.randomnessInput.value = value;
  elements.randomnessSlider.value = value;
}

// Mistake control functions
function decreaseMistake() {
  let value = Math.max(0, Math.floor(mistakeProbability * 100) - 1);
mistakeProbability = value / 100;
  saveMistakeProbability();
}
function increaseMistake() {
  let value = Math.min(20, Math.floor(mistakeProbability * 100) + 1);
mistakeProbability = value / 100;
  saveMistakeProbability();
}
function handleMistakeInputChange() {
  let value = parseInt(elements.mistakeInput.value);
  if (isNaN(value)) value = 3;
value = Math.max(0, Math.min(20, value));
  mistakeProbability = value / 100;
  saveMistakeProbability();
}
function handleMistakeSliderChange() {
  mistakeProbability = parseInt(elements.mistakeSlider.value) / 100;
updateMistakeDisplay();
  saveMistakeProbability();
}
function saveMistakeProbability() {
  console.log('popup.js: Saving mistake probability:', mistakeProbability);
chrome.storage.local.set({mistakeProbability: mistakeProbability}, function() {
    updateMistakeDisplay();
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'updateMistakeProbability',
        mistakeProbability: mistakeProbability
      });
    });
  });
}
function updateMistakeDisplay() {
  const value = Math.round(mistakeProbability * 100);
  elements.mistakeInput.value = value;
  elements.mistakeSlider.value = value;
}