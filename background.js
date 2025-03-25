chrome.runtime.onInstalled.addListener(() => {
  // Create parent menu item
  chrome.contextMenus.create({
    id: "pasteHumanMenu",
    title: "v",
    contexts: ["editable"]
  });

  // Create child items
  chrome.contextMenus.create({
    id: "pasteHuman",
    title: ">",
    parentId: "pasteHumanMenu",
    contexts: ["editable"]
  });

  chrome.contextMenus.create({
    id: "togglePasteHuman",
    title: "╠",
    parentId: "pasteHumanMenu",
    contexts: ["editable"]
  });

  chrome.contextMenus.create({
    id: "stopPasteHuman",
    title: ".",
    parentId: "pasteHumanMenu",
    contexts: ["editable"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "pasteHuman") {
    chrome.tabs.sendMessage(tab.id, { action: "emulateTyping" });
  } else if (info.menuItemId === "stopPasteHuman") {
    chrome.tabs.sendMessage(tab.id, { action: "stopTyping" });
  } else if (info.menuItemId === "togglePasteHuman") {
    chrome.tabs.sendMessage(tab.id, { action: "toggleTyping" });
  }
});

// Keep the existing commands handler
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