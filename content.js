let currentTypingSession = null;
let isPaused = false;
let remainingText = "";
let currentSpeedFactor = 1.0;
let currentRandomnessFactor = 1.0;

// Load settings from chrome.storage.local when script initializes
chrome.storage.local.get(['speedFactor', 'randomnessFactor'], function(result) {
  if (result.speedFactor !== undefined) {
    currentSpeedFactor = result.speedFactor;
  }
  if (result.randomnessFactor !== undefined) {
    currentRandomnessFactor = result.randomnessFactor;
  }
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log('content.js: Message received:', request.action);

    if (request.action === "updateSpeedFactor") {
        currentSpeedFactor = request.speedFactor;
        console.log(`content.js: Speed factor updated to ${currentSpeedFactor}`);
    } else if (request.action === "updateRandomnessFactor") {
        currentRandomnessFactor = request.randomnessFactor;
        console.log(`content.js: Randomness factor updated to ${currentRandomnessFactor}`);
    } else if (request.action === "emulateTyping") {
        // Always reset the state when starting a new typing session
        currentTypingSession = Math.random().toString();
        isPaused = false;
        remainingText = "";
        
        // Use speed factor from request if provided, otherwise use stored speed factor
        currentSpeedFactor = request.speedFactor || currentSpeedFactor;
        currentRandomnessFactor = request.randomnessFactor || currentRandomnessFactor;

        console.log("content.js: Action received: emulateTyping");
        navigator.clipboard
            .readText()
            .then((clipText) => {
                console.log("content.js: Clipboard text read:", clipText);
                emulateTyping(clipText, currentTypingSession, request.delayedStart, currentSpeedFactor, currentRandomnessFactor);
            })
            .catch((err) => {
                console.error("Failed to read clipboard:", err);
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
                emulateTyping(remainingText, currentTypingSession, false, currentSpeedFactor, currentRandomnessFactor);
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

function emulateTyping(text, session, delayedStart, speedFactor = 1.0, randomnessFactor = 1.0) {
    const activeElement = document.activeElement;
    console.log('content.js: Active element:', activeElement);
    console.log('content.js: Speed factor:', speedFactor);
    console.log('content.js: Randomness factor:', randomnessFactor);

    let i = 0;
    const baseDelay = 65 / speedFactor; // Average delay in milliseconds

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

                let delay;
                
                if (randomnessFactor <= 0) {
                    // 0% randomness - perfectly consistent timing
                    delay = baseDelay;
                } else {
                    // Refined randomness calculation
                    const variationScale = Math.min(2, randomnessFactor); // Cap at 200%
                    
                    // General delay variation
                    const minDelayFactor = Math.max(0.5, 1 - 0.5 * variationScale);
                    const maxDelayFactor = 1 + 0.5 * variationScale;
                    
                    // Base random delay calculation
                    delay = baseDelay * (minDelayFactor + Math.random() * (maxDelayFactor - minDelayFactor));
                    
                    // Occasional long pauses
                    // Frequency of long pauses decreases with randomness
                    const pauseProbability = randomnessFactor > 0 
                        ? (0.05 / Math.max(1, randomnessFactor * 0.5)) 
                        : 0;
                    
                    // Long pause variation
                    if (randomnessFactor > 0 && Math.random() < pauseProbability) {
                        const longPauseVariation = 1 + Math.random() * (variationScale - 1);
                        delay += (Math.random() * 300 + 100) * longPauseVariation / speedFactor;
                    }
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