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