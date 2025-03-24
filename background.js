chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "pasteHumanPlus",
    title: ">",
    contexts: ["editable"],
  });

  chrome.contextMenus.create({
    id: "stopPasteHumanPlus",
    title: ".",
    contexts: ["editable"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "pasteHumanPlus") {
    chrome.tabs.sendMessage(tab.id, { action: "emulateTyping" });
  } else if (info.menuItemId === "stopPasteHumanPlus") {
    chrome.tabs.sendMessage(tab.id, { action: "stopTyping" });
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "start_typing") {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "emulateTyping" });
    });
  } else if (command === "stop_typing") {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "stopTyping" });
    });
  }
});