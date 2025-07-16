// === Configurable Parameters ===
const IMMEDIATE_FIX_PERCENTAGE = 75; // % of mistakes fixed immediately
const MIN_CHARS_BEFORE_REVIEW = 5;
const MAX_CHARS_BEFORE_REVIEW = 15;
const MIN_REVIEW_PAUSE_MS = 300;
const MAX_REVIEW_PAUSE_MS = 1200;
const MIN_IMMEDIATE_FIX_PAUSE_MS = 100;
const MAX_IMMEDIATE_FIX_PAUSE_MS = 400;
const MIN_BETWEEN_FIX_PAUSE_MS = 100;
const MAX_BETWEEN_FIX_PAUSE_MS = 300;

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
    let charsSinceLastReview = 0;
    let reviewCharThreshold = getRandomInt(MIN_CHARS_BEFORE_REVIEW, MAX_CHARS_BEFORE_REVIEW);
    let mistakeLog = [];

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
                    // Decide if this mistake should be fixed immediately or delayed
                    const isImmediate = Math.random() < (IMMEDIATE_FIX_PERCENTAGE / 100);
                    const wrongChar = getRandomWrongChar(text[i]);
                    let event = new KeyboardEvent("keydown", {key: wrongChar});
                    activeElement.dispatchEvent(event);
                    document.execCommand("insertText", false, wrongChar);
                    // Log the mistake for possible delayed correction
                    mistakeLog.push({pos: i, wrong: wrongChar, correct: text[i]});
                    if (isImmediate) {
                        // Immediate fix: short pause, then fix
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
                                // Remove from mistake log (since fixed)
                                mistakeLog.pop();
                                setTimeout(typeNextCharacter, baseDelay);
                            }, getRandomInt(MIN_IMMEDIATE_FIX_PAUSE_MS, MAX_IMMEDIATE_FIX_PAUSE_MS));
                        }, getRandomInt(MIN_IMMEDIATE_FIX_PAUSE_MS, MAX_IMMEDIATE_FIX_PAUSE_MS));
                        return;
                    } else {
                        // Delayed fix: just continue typing, fix later
                        i++;
                        charsSinceLastReview++;
                        setTimeout(typeNextCharacter, baseDelay);
                        return;
                    }
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
                charsSinceLastReview++;

                // Check if it's time for a review phase
                if (charsSinceLastReview >= reviewCharThreshold && mistakeLog.length > 0) {
                    setTimeout(() => {
                        reviewAndFixMistakes(() => {
                            charsSinceLastReview = 0;
                            reviewCharThreshold = getRandomInt(MIN_CHARS_BEFORE_REVIEW, MAX_CHARS_BEFORE_REVIEW);
                            setTimeout(typeNextCharacter, baseDelay);
                        });
                    }, getRandomInt(MIN_REVIEW_PAUSE_MS, MAX_REVIEW_PAUSE_MS));
                    return;
                }

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
                // Typing completed
                if (mistakeLog.length > 0) {
                    console.log('[DEBUG] Final review phase triggered. mistakeLog:', JSON.stringify(mistakeLog));
                    reviewAndFixMistakes(() => {
                        console.log('[DEBUG] Final review phase complete. activeElement.value:', activeElement.value);
                        // All mistakes fixed, typing session truly complete
                    });
                }
            }
        }
        typeNextCharacter();
    };
    if (delayedStart) {
        setTimeout(startTyping, 0);
    } else {
        startTyping();
    }
    // --- Helper for review phase ---
    function reviewAndFixMistakes(callback) {
        console.log('[DEBUG] Entering reviewAndFixMistakes. mistakeLog:', JSON.stringify(mistakeLog));
        if (mistakeLog.length === 0) {
            callback();
            return;
        }
        // Randomly choose order: forward or backward
        const order = Math.random() < 0.5 ? 'forward' : 'backward';
        let indices = order === 'forward'
            ? [...Array(mistakeLog.length).keys()]
            : [...Array(mistakeLog.length).keys()].reverse();
        let fixIndex = 0;
        function fixNext() {
            if (fixIndex >= indices.length) {
                mistakeLog = [];
                // Move caret to end
                setCaretPosition(activeElement, getTextLength(activeElement));
                console.log('[DEBUG] Finished reviewAndFixMistakes.');
                callback();
                return;
            }
            const idx = indices[fixIndex];
            const {pos, correct} = mistakeLog[idx];
            // Move caret to position
            setCaretPosition(activeElement, pos + 1); // +1 to be after the wrong char
            // Backspace
            stealthyBackspace(activeElement);
            setTimeout(() => {
                // Type the correct character
                stealthyInsertText(activeElement, correct);
                setTimeout(() => {
                    fixIndex++;
                    fixNext();
                }, getRandomInt(MIN_BETWEEN_FIX_PAUSE_MS, MAX_BETWEEN_FIX_PAUSE_MS));
            }, getRandomInt(MIN_BETWEEN_FIX_PAUSE_MS, MAX_BETWEEN_FIX_PAUSE_MS));
        }
        console.log('[DEBUG] Before starting fixNext.');
        fixNext();
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

// --- Utility for stealthy text/caret manipulation ---
function isTextInput(el) {
    return el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && /^(text|search|url|tel|password)$/i.test(el.type)));
}
function isContentEditable(el) {
    return el && el.isContentEditable;
}
// Set caret position stealthily
function setCaretPosition(el, pos) {
    if (isTextInput(el)) {
        el.setSelectionRange(pos, pos);
        el.focus();
    } else if (isContentEditable(el)) {
        el.focus();
        const selection = window.getSelection();
        selection.removeAllRanges();
        const range = document.createRange();
        // Find the text node and offset for the given pos
        let node = el;
        let offset = pos;
        // Walk the child nodes to find the right text node
        function findTextNode(node, pos) {
            if (node.nodeType === Node.TEXT_NODE) {
                if (pos <= node.length) return {node, offset: pos};
                else return {node: null, offset: pos - node.length};
            }
            for (let child of node.childNodes) {
                let res = findTextNode(child, pos);
                if (res.node) return res;
                pos = res.offset;
            }
            return {node: null, offset: pos};
        }
        let res = findTextNode(el, pos);
        if (res.node) {
            range.setStart(res.node, res.offset);
            range.collapse(true);
            selection.addRange(range);
        } else {
            // fallback: place at end
            range.selectNodeContents(el);
            range.collapse(false);
            selection.addRange(range);
        }
    }
}
// Insert text stealthily
function stealthyInsertText(el, text) {
    el.focus();
    // Keyboard event
    for (let c of text) {
        let event = new KeyboardEvent("keydown", {key: c});
        el.dispatchEvent(event);
        document.execCommand("insertText", false, c);
        let inputEvent = new Event('input', {bubbles: true});
        el.dispatchEvent(inputEvent);
    }
}
// Stealthy backspace (delete one char before caret)
function stealthyBackspace(el) {
    el.focus();
    let event = new KeyboardEvent("keydown", {key: "Backspace"});
    el.dispatchEvent(event);
    document.execCommand("delete", false, null);
    let inputEvent = new Event('input', {bubbles: true});
    el.dispatchEvent(inputEvent);
}

// --- Utility ---
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function getTextLength(el) {
    if (isTextInput(el)) return el.value.length;
    if (isContentEditable(el)) return el.innerText.length;
    return 0;
}