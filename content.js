let currentTypingSession = null;
let isPaused = false;
let remainingText = "";
let currentSpeedFactor = 1.0;
let currentRandomnessFactor = 1.0;
let currentMistakeProbability = 0.03; // Default: 3%

// Load settings from chrome.storage.local when script initializes
chrome.storage.local.get(['speedFactor', 'randomnessFactor', 'mistakeProbability'], function(result) {
  if (result.speedFactor !== undefined) {
    currentSpeedFactor = result.speedFactor;
  }
  if (result.randomnessFactor !== undefined) {
    currentRandomnessFactor = result.randomnessFactor;
  }
  if (result.mistakeProbability !== undefined) {
    currentMistakeProbability = result.mistakeProbability;
  }
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === "updateSpeedFactor") {
        currentSpeedFactor = request.speedFactor;
    } else if (request.action === "updateRandomnessFactor") {
        currentRandomnessFactor = request.randomnessFactor;
    } else if (request.action === "updateMistakeProbability") {
        currentMistakeProbability = request.mistakeProbability;
    } else if (request.action === "emulateTyping") {
        // Always reset the state when starting a new typing session
        currentTypingSession = Math.random().toString();
        isPaused = false;
        remainingText = "";
        
        // Use speed factor from request if provided, otherwise use stored speed factor
        currentSpeedFactor = request.speedFactor || currentSpeedFactor;
        currentRandomnessFactor = request.randomnessFactor || currentRandomnessFactor;
        currentMistakeProbability = request.mistakeProbability || currentMistakeProbability;

        navigator.clipboard
            .readText()
            .then((clipText) => {
                emulateTyping(clipText, currentTypingSession, request.delayedStart, currentSpeedFactor, currentRandomnessFactor, currentMistakeProbability);
            })
            .catch((err) => {
                console.error("Failed to read clipboard:", err);
            });
    } else if (request.action === "stopTyping") {
        currentTypingSession = null;
        isPaused = false;
        remainingText = "";
    } else if (request.action === "toggleTyping") {
        if (currentTypingSession) {
            isPaused = !isPaused;
            if (!isPaused && remainingText) {
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
        chrome.runtime.sendMessage({ action: "toggleTyping" });
    }
});

function emulateTyping(text, session, delayedStart, speedFactor = 1.0, randomnessFactor = 1.0, mistakeProbability = currentMistakeProbability) {
    const activeElement = document.activeElement;

    let i = 0;
    const baseDelay = 100 / speedFactor;
    const mistakeDelay = Math.max(350, baseDelay * 3); // At least 350ms, or 3x baseDelay

    const startTyping = function () {
        function typeNextCharacter() {
            if (isPaused) {
                remainingText = text.slice(i);
                return;
            }

            if (i < text.length && session === currentTypingSession) {
                // Simulate a typo with probability
                const randomValue = Math.random();
                const shouldMakeMistake = randomValue < mistakeProbability && text[i].match(/[a-zA-Z0-9]/);
                
                if (shouldMakeMistake) {
                    // Type a wrong character
                    const wrongChar = getRandomWrongChar(text[i]);
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
                // console.log('content.js: Typing completed'); // Removed console.log
            }
        }
        typeNextCharacter();
    };
    if (delayedStart) {
        // console.log('content.js: Starting typing with a delay'); // Removed console.log
        setTimeout(startTyping, 0);
    } else {
        startTyping();
    }
}

function getRandomWrongChar(correctChar) {
    // If character not in map, use fallback
    if (!KBD[correctChar]) {
        const allChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        const fallback = allChars.split('').filter(char => char !== correctChar);
        return fallback[Math.floor(Math.random() * fallback.length)];
    }

    const levels = KBD[correctChar];
    let selectedLevel;
    const rand = Math.random();

    // Select level based on probability
    if (rand < 0.6) {
        selectedLevel = levels.l1;
    } else if (rand < 0.9) {
        selectedLevel = levels.l2;
    } else {
        selectedLevel = levels.l3;
    }

    // Return random character from selected level
    return selectedLevel[Math.floor(Math.random() * selectedLevel.length)];
}