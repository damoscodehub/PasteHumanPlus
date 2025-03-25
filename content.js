let currentTypingSession = null;
let isPaused = false;
let remainingText = "";
let currentSpeedFactor = 1.0;

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log('content.js: Message received:', request.action);

    if (request.action === "emulateTyping") {
        // Always reset the state when starting a new typing session
        currentTypingSession = Math.random().toString();
        isPaused = false;
        remainingText = "";
        currentSpeedFactor = request.speedFactor || 1.0;

        console.log("content.js: Action received: emulateTyping");
        navigator.clipboard
            .readText()
            .then((clipText) => {
                console.log("content.js: Clipboard text read:", clipText);
                emulateTyping(clipText, currentTypingSession, request.delayedStart, currentSpeedFactor);
            });
    } else if (request.action === "stopTyping") {
        console.log("content.js: Stopping typing session");
        currentTypingSession = null;
        isPaused = false;
        remainingText = "";
    } else if (request.action === "toggleTyping") {
        if (currentTypingSession) {
            isPaused = !isPaused;
            console.log(`content.js: Typing ${isPaused ? 'paused' : 'resumed'}`);
            if (!isPaused && remainingText) {
                console.log("content.js: Resuming typing with remaining text");
                emulateTyping(remainingText, currentTypingSession, false, currentSpeedFactor);
                remainingText = "";
            }
        }
    }
});

window.addEventListener("keydown", function (event) {
    // Only stop typing if the key combination matches
    const isStopCombo = event.shiftKey && event.ctrlKey && event.code === 'KeyX';
    if (isStopCombo && currentTypingSession) {
        console.log('content.js: Stop/Toggle keyboard shortcut detected');
        chrome.runtime.sendMessage({ action: "toggleTyping" });
    }
});

function emulateTyping(text, session, delayedStart, speedFactor = 1.0) {
    const activeElement = document.activeElement;
    console.log('content.js: Active element:', activeElement);
    console.log('content.js: Speed factor:', speedFactor);

    let i = 0;

    const startTyping = function () {
        function typeNextCharacter() {
            if (isPaused) {
                remainingText = text.slice(i);
                console.log(`content.js: Paused at position ${i}, remaining: ${remainingText.length} chars`);
                return;
            }

            console.log('content.js: Typing character', text[i]);

            if (i < text.length && session === currentTypingSession) {
                let event = new KeyboardEvent("keydown", {
                    key: text[i],
                    code: "Key" + text[i].toUpperCase(),
                    charCode: text[i].charCodeAt(0),
                    keyCode: text[i].charCodeAt(0),
                    which: text[i].charCodeAt(0),
                });

                activeElement.dispatchEvent(event);
                document.execCommand("insertText", false, text[i++]);

                let delay = (Math.random() * (200 - 50) + 50) / speedFactor;

                if (Math.random() < 0.05) {
                    delay += (Math.random() * (700 - 200) + 200) / speedFactor;
                }

                setTimeout(typeNextCharacter, delay);
            } else if (i >= text.length) {
                console.log('content.js: Typing completed');
            }
        }

        typeNextCharacter();
    };

    if (delayedStart) {
        console.log('content.js: Starting typing with a delay');
        setTimeout(startTyping, 0);
    } else {
        startTyping();
    }
}