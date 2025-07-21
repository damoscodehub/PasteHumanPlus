let menuStrings = {
  main: "v",
  start: ">",
  toggle: "╠",
  stop: "."
};

// Load saved menu strings
chrome.storage.local.get(['menuStrings'], function(result) {
  if (result.menuStrings) {
    menuStrings = result.menuStrings;
  }
  createContextMenus();
});

// Handle menu string updates
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateContextMenu') {
    menuStrings = request.menuStrings;
    createContextMenus();
  }
});

// === Set all parameter config and current values on install/update ===
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

function getDefaultCurrentValues() {
  return Object.fromEntries(
    Object.entries(PARAM_CONFIG).map(([key, cfg]) => [key, cfg.default])
  );
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ PARAM_CONFIG });
  // Only set current values if not already present
  chrome.storage.local.get(Object.keys(PARAM_CONFIG), (result) => {
    const toSet = {};
    for (const key in PARAM_CONFIG) {
      if (result[key] === undefined) {
        toSet[key] = PARAM_CONFIG[key].default;
      }
    }
    if (Object.keys(toSet).length > 0) {
      chrome.storage.local.set(toSet);
    }
  });
});

function createContextMenus() {
  // Remove all existing menus first
  chrome.contextMenus.removeAll(() => {
    // Create parent menu item
    chrome.contextMenus.create({
      id: "pasteHumanMenu",
      title: menuStrings.main,
      contexts: ["editable"]
    });

    // Create child items
    chrome.contextMenus.create({
      id: "pasteHuman",
      title: menuStrings.start,
      parentId: "pasteHumanMenu",
      contexts: ["editable"]
    });

    chrome.contextMenus.create({
      id: "togglePasteHuman",
      title: menuStrings.toggle,
      parentId: "pasteHumanMenu",
      contexts: ["editable"]
    });

    chrome.contextMenus.create({
      id: "stopPasteHuman",
      title: menuStrings.stop,
      parentId: "pasteHumanMenu",
      contexts: ["editable"]
    });
  });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "pasteHuman") {
    chrome.tabs.sendMessage(tab.id, { action: "emulateTyping" });
  } else if (info.menuItemId === "stopPasteHuman") {
    chrome.tabs.sendMessage(tab.id, { action: "stopTyping" });
  } else if (info.menuItemId === "togglePasteHuman") {
    chrome.tabs.sendMessage(tab.id, { action: "toggleTyping" });
  }
});

chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (command === "start_typing") {
      chrome.tabs.sendMessage(tabs[0].id, { action: "emulateTyping" });
    } else if (command === "stop_typing") {
      chrome.tabs.sendMessage(tabs[0].id, { action: "stopTyping" });
    } else if (command === "toggle_typing") {
      chrome.tabs.sendMessage(tabs[0].id, { action: "toggleTyping" });
    }
  });
});