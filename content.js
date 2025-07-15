let currentTypingSession = null;
let isPaused = false;
let remainingText = "";
let currentSpeedFactor = 1.0;
let currentRandomnessFactor = 1.0;
let currentMistakeProbability = 0.03; // Default: 3%

// Load settings from chrome.storage.local when script initializes
console.log('content.js: Starting to load settings from storage...');
chrome.storage.local.get(['speedFactor', 'randomnessFactor', 'mistakeProbability'], function(result) {
  console.log('content.js: Raw storage result:', result);
  
  if (result.speedFactor !== undefined) {
    currentSpeedFactor = result.speedFactor;
  }
  if (result.randomnessFactor !== undefined) {
    currentRandomnessFactor = result.randomnessFactor;
  }
  if (result.mistakeProbability !== undefined) {
    currentMistakeProbability = result.mistakeProbability;
  }
  console.log('content.js: Loaded settings from storage:', {
    speedFactor: currentSpeedFactor,
    randomnessFactor: currentRandomnessFactor,
    mistakeProbability: currentMistakeProbability
  });
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log('content.js: Message received:', request.action);

    if (request.action === "updateSpeedFactor") {
        currentSpeedFactor = request.speedFactor;
        console.log(`content.js: Speed factor updated to ${currentSpeedFactor}`);
    } else if (request.action === "updateRandomnessFactor") {
        currentRandomnessFactor = request.randomnessFactor;
        console.log(`content.js: Randomness factor updated to ${currentRandomnessFactor}`);
    } else if (request.action === "updateMistakeProbability") {
        currentMistakeProbability = request.mistakeProbability;
        console.log(`content.js: Mistake probability updated to ${currentMistakeProbability}`);
    } else if (request.action === "emulateTyping") {
        // Always reset the state when starting a new typing session
        currentTypingSession = Math.random().toString();
        isPaused = false;
        remainingText = "";
        
        // Use speed factor from request if provided, otherwise use stored speed factor
        currentSpeedFactor = request.speedFactor || currentSpeedFactor;
        currentRandomnessFactor = request.randomnessFactor || currentRandomnessFactor;
        currentMistakeProbability = request.mistakeProbability || currentMistakeProbability;

        console.log("content.js: Action received: emulateTyping");
        console.log("content.js: Final values before typing:", {
          speedFactor: currentSpeedFactor,
          randomnessFactor: currentRandomnessFactor,
          mistakeProbability: currentMistakeProbability
        });
        navigator.clipboard
            .readText()
            .then((clipText) => {
                console.log("content.js: Clipboard text read:", clipText);
                emulateTyping(clipText, currentTypingSession, request.delayedStart, currentSpeedFactor, currentRandomnessFactor, currentMistakeProbability);
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
                emulateTyping(remainingText, currentTypingSession, false, currentSpeedFactor, currentRandomnessFactor, currentMistakeProbability);
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

function emulateTyping(text, session, delayedStart, speedFactor = 1.0, randomnessFactor = 1.0, mistakeProbability = currentMistakeProbability) {
    const activeElement = document.activeElement;
    console.log('content.js: Active element:', activeElement);
    console.log('content.js: Speed factor:', speedFactor);
    console.log('content.js: Randomness factor:', randomnessFactor);
    console.log('content.js: Mistake probability:', mistakeProbability);

    let i = 0;
    const baseDelay = 100 / speedFactor;
    const mistakeDelay = Math.max(350, baseDelay * 3); // At least 350ms, or 3x baseDelay

    const startTyping = function () {
        function typeNextCharacter() {
            if (isPaused) {
                remainingText = text.slice(i);
                console.log(`content.js: Paused at position ${i}, remaining: ${remainingText.length} chars`);
                return;
            }

            if (i < text.length && session === currentTypingSession) {
                // Simulate a typo with probability
                const randomValue = Math.random();
                const shouldMakeMistake = randomValue < mistakeProbability && text[i].match(/[a-zA-Z0-9]/);
                console.log(`content.js: Character '${text[i]}' at position ${i}, random=${randomValue.toFixed(3)}, mistakeProb=${mistakeProbability.toFixed(3)}, shouldMakeMistake=${shouldMakeMistake}`);
                
                if (shouldMakeMistake) {
                    // Type a wrong character
                    const wrongChar = getRandomWrongChar(text[i]);
                    console.log(`content.js: Simulating mistake: intended '${text[i]}', typed wrong '${wrongChar}' at position ${i}`);
                    let event = new KeyboardEvent("keydown", {key: wrongChar});
                    activeElement.dispatchEvent(event);
                    document.execCommand("insertText", false, wrongChar);

                    setTimeout(() => {
                        // Backspace
                        let backspaceEvent = new KeyboardEvent("keydown", {key: "Backspace"});
                        activeElement.dispatchEvent(backspaceEvent);
                        document.execCommand("delete", false, null);

                        setTimeout(() => {
                            // Type the correct character
                            let correctEvent = new KeyboardEvent("keydown", {key: text[i]});
                            activeElement.dispatchEvent(correctEvent);
                            document.execCommand("insertText", false, text[i++]);
                            setTimeout(typeNextCharacter, baseDelay);
                        }, mistakeDelay);
                    }, mistakeDelay);
                    return;
                }

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
                    delay = baseDelay;
                } else {
                    const variationPower = 1 + (randomnessFactor * 0.75);
                    const minDelay = baseDelay * Math.max(0.15, 1 - Math.pow(randomnessFactor/variationPower, 1.2));
                    const maxDelay = baseDelay * (1 + Math.pow(randomnessFactor*variationPower, 1.2)/2);
                    delay = minDelay + Math.random() * (maxDelay - minDelay);
                    const pauseProbability = 0.1 * Math.sqrt(randomnessFactor*variationPower);
                    if (Math.random() < pauseProbability) {
                        const pauseIntensity = Math.pow(randomnessFactor, variationPower/2);
                        delay += (Math.random() * 1000 * pauseIntensity + 200) / speedFactor;
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

function getRandomWrongChar(correctChar) {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let wrong;
    do {
        wrong = chars[Math.floor(Math.random() * chars.length)];
    } while (wrong === correctChar);
    return wrong;
}