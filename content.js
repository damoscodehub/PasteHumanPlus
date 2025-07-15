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
    // Define adjacent keys on a QWERTY keyboard (most common mistakes)
    const adjacentKeys = {
        'a': ['q', 'w', 's', 'z'],
        'b': ['v', 'g', 'n'],
        'c': ['x', 'v', 'f'],
        'd': ['s', 'e', 'r', 'f', 'c', 'x'],
        'e': ['w', 's', 'd', 'r'],
        'f': ['d', 'r', 't', 'g', 'v', 'c'],
        'g': ['f', 't', 'y', 'h', 'b', 'v'],
        'h': ['g', 'y', 'u', 'j', 'n', 'b'],
        'i': ['u', 'j', 'k', 'o'],
        'j': ['h', 'u', 'i', 'k', 'm', 'n'],
        'k': ['j', 'i', 'o', 'l', 'm'],
        'l': ['k', 'o', 'p'],
        'm': ['n', 'j', 'k'],
        'n': ['b', 'h', 'j', 'm'],
        'o': ['i', 'k', 'l', 'p'],
        'p': ['o', 'l'],
        'q': ['w', 'a'],
        'r': ['e', 'd', 'f', 't'],
        's': ['a', 'w', 'e', 'd', 'z', 'x'],
        't': ['r', 'f', 'g', 'y'],
        'u': ['y', 'h', 'j', 'i'],
        'v': ['c', 'f', 'g', 'b'],
        'w': ['q', 'a', 's', 'e'],
        'x': ['z', 's', 'd', 'c'],
        'y': ['t', 'g', 'h', 'u'],
        'z': ['a', 's', 'x'],
        // Numbers
        '0': ['9', 'p', 'o'],
        '1': ['q', '2'],
        '2': ['1', 'q', 'w', '3'],
        '3': ['2', 'w', 'e', '4'],
        '4': ['3', 'e', 'r', '5'],
        '5': ['4', 'r', 't', '6'],
        '6': ['5', 't', 'y', '7'],
        '7': ['6', 'y', 'u', '8'],
        '8': ['7', 'u', 'i', '9'],
        '9': ['8', 'i', 'o', '0']
    };

    // Similar-looking characters (common visual mistakes)
    const similarChars = {
        'a': ['q', 'o', 'e'],
        'b': ['h', 'n', 'v'],
        'c': ['e', 'o'],
        'd': ['b', 'p', 'q'],
        'e': ['a', 'c', 'o'],
        'f': ['t', 'r'],
        'g': ['q', '9'],
        'h': ['n', 'b', 'u'],
        'i': ['l', '1', 'j'],
        'j': ['i', 'l', '1'],
        'k': ['h', 'l'],
        'l': ['i', '1', 'j', 'k'],
        'm': ['n', 'w'],
        'n': ['m', 'h', 'u'],
        'o': ['0', 'a', 'c', 'e'],
        'p': ['o', 'q', 'd'],
        'q': ['a', 'p', 'g'],
        'r': ['f', 't'],
        's': ['z', 'a'],
        't': ['f', 'r', 'y'],
        'u': ['y', 'h', 'n'],
        'v': ['b', 'c'],
        'w': ['v', 'm'],
        'x': ['z', 'c'],
        'y': ['t', 'u'],
        'z': ['s', 'x'],
        '0': ['o', '9'],
        '1': ['l', 'i'],
        '2': ['z'],
        '3': ['e'],
        '5': ['s'],
        '6': ['b'],
        '8': ['b'],
        '9': ['g', '0']
    };

    // Case mistakes (more common to type lowercase instead of uppercase)
    const caseMistakes = {
        'A': ['a', 'q', 's'],
        'B': ['b', 'v', 'n'],
        'C': ['c', 'x', 'v'],
        'D': ['d', 's', 'f'],
        'E': ['e', 'w', 'r'],
        'F': ['f', 'd', 'g'],
        'G': ['g', 'f', 'h'],
        'H': ['h', 'g', 'j'],
        'I': ['i', 'u', 'k'],
        'J': ['j', 'h', 'k'],
        'K': ['k', 'j', 'l'],
        'L': ['l', 'k'],
        'M': ['m', 'n'],
        'N': ['n', 'b', 'm'],
        'O': ['o', 'i', 'p'],
        'P': ['p', 'o'],
        'Q': ['q', 'a', 'w'],
        'R': ['r', 'e', 't'],
        'S': ['s', 'a', 'd'],
        'T': ['t', 'r', 'y'],
        'U': ['u', 'y', 'i'],
        'V': ['v', 'c', 'b'],
        'W': ['w', 'q', 'e'],
        'X': ['x', 'z', 'c'],
        'Y': ['y', 't', 'u'],
        'Z': ['z', 'a', 's']
    };

    let possibleMistakes = [];
    
    // Add adjacent keys (highest priority - most common)
    if (adjacentKeys[correctChar]) {
        possibleMistakes = possibleMistakes.concat(adjacentKeys[correctChar]);
    }
    
    // Add similar characters (medium priority)
    if (similarChars[correctChar]) {
        possibleMistakes = possibleMistakes.concat(similarChars[correctChar]);
    }
    
    // Add case mistakes (for uppercase letters)
    if (caseMistakes[correctChar]) {
        possibleMistakes = possibleMistakes.concat(caseMistakes[correctChar]);
    }
    
    // If no specific mistakes defined, use a fallback
    if (possibleMistakes.length === 0) {
        const allChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        possibleMistakes = allChars.split('').filter(char => char !== correctChar);
    }
    
    // Remove duplicates and the correct character
    possibleMistakes = [...new Set(possibleMistakes)].filter(char => char !== correctChar);
    
    // Return a random mistake from the possible ones
    return possibleMistakes[Math.floor(Math.random() * possibleMistakes.length)];
}