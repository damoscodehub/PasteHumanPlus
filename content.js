// === Configurable Parameters ===
const MIN_CHARS_BEFORE_REVIEW = 5;
const MAX_CHARS_BEFORE_REVIEW = 15;
const MIN_REVIEW_PAUSE_MS = 300;
const MAX_REVIEW_PAUSE_MS = 1200;
const MIN_IMMEDIATE_FIX_PAUSE_MS = 100;
const MAX_IMMEDIATE_FIX_PAUSE_MS = 400;
const MIN_BETWEEN_FIX_PAUSE_MS = 100;
const MAX_BETWEEN_FIX_PAUSE_MS = 300;

let typingState = null;
let isPaused = false;
let currentSpeedFactor = 1.0;
let currentRandomnessFactor = 1.0;
let currentMistakeProbability = 0.03; // Default: 3%

// Advanced settings with defaults
const ADVANCED_DEFAULTS = {
    allowWordNavigation: true,
    immediateFixPercentage: 75,
    minCharsBeforeReview: 5,
    maxCharsBeforeReview: 15,
    minReviewPause: 1000,
    maxReviewPause: 3000,
    minImmediateFixPause: 100,
    maxImmediateFixPause: 400,
    minBetweenFixPause: 100,
    maxBetweenFixPause: 300
};
let advancedSettings = {...ADVANCED_DEFAULTS};

// Load settings from chrome.storage.local when script initializes
chrome.storage.local.get(['speedFactor', 'randomnessFactor', 'mistakeProbability', 'allowWordNavigation', 'immediateFixPercentage', 'minCharsBeforeReview', 'maxCharsBeforeReview', 'minReviewPause', 'maxReviewPause', 'minImmediateFixPause', 'maxImmediateFixPause', 'minBetweenFixPause', 'maxBetweenFixPause', 'advancedSettings'], function(result) {
    if (result.speedFactor !== undefined) {
        currentSpeedFactor = result.speedFactor;
    }
    if (result.randomnessFactor !== undefined) {
        currentRandomnessFactor = result.randomnessFactor;
    }
    if (result.mistakeProbability !== undefined) {
        currentMistakeProbability = result.mistakeProbability;
    }
    // Merge advancedSettings from storage with defaults
    if (result.advancedSettings) {
        advancedSettings = {...ADVANCED_DEFAULTS, ...result.advancedSettings};
    } else {
        // For backward compatibility, check for individual keys
        Object.keys(ADVANCED_DEFAULTS).forEach(key => {
            if (result[key] !== undefined) advancedSettings[key] = result[key];
        });
    }
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === "updateSpeedFactor") {
        currentSpeedFactor = request.speedFactor;
    } else if (request.action === "updateRandomnessFactor") {
        currentRandomnessFactor = request.randomnessFactor;
    } else if (request.action === "updateMistakeProbability") {
        currentMistakeProbability = request.mistakeProbability;
    } else if (request.action === "updateAdvancedSettings") {
        // Merge with defaults to avoid missing properties
        advancedSettings = {...ADVANCED_DEFAULTS, ...request.settings};
    } else if (request.action === "emulateTyping") {
        // Cancel any existing session
        typingState = null;
        isPaused = false;
        // Use speed factor from request if provided, otherwise use stored speed factor
        currentSpeedFactor = request.speedFactor || currentSpeedFactor;
        currentRandomnessFactor = request.randomnessFactor || currentRandomnessFactor;
        currentMistakeProbability = request.mistakeProbability || currentMistakeProbability;
        navigator.clipboard
            .readText()
            .then((clipText) => {
                startTypingSession(clipText, currentSpeedFactor, currentRandomnessFactor, currentMistakeProbability, request.delayedStart);
            })
            .catch((err) => {
                console.error("Failed to read clipboard:", err);
            });
    } else if (request.action === "stopTyping") {
        typingState = null;
        isPaused = false;
    } else if (request.action === "toggleTyping") {
        if (typingState) {
            isPaused = !isPaused;
            if (!isPaused && typingState.pausedResolver) {
                typingState.pausedResolver();
            }
        }
    }
});

function waitIfPaused() {
    if (!isPaused) return Promise.resolve();
    return new Promise(resolve => {
        if (typingState) typingState.pausedResolver = resolve;
    });
}

function startTypingSession(text, speedFactor, randomnessFactor, mistakeProbability, delayedStart) {
    const activeElement = document.activeElement;
    console.log('[DEBUG] Typing session settings:', JSON.stringify(advancedSettings));
    const minChars = advancedSettings.minCharsBeforeReview ?? ADVANCED_DEFAULTS.minCharsBeforeReview;
    const maxChars = advancedSettings.maxCharsBeforeReview ?? ADVANCED_DEFAULTS.maxCharsBeforeReview;
    typingState = {
        text,
        i: 0,
        baseDelay: 100 / speedFactor,
        charsSinceLastReview: 0,
        reviewCharThreshold: (minChars === maxChars)
            ? minChars
            : getRandomInt(minChars, maxChars),
        mistakeLog: [],
        sessionStartIndex: getCaretPosition(activeElement),
        speedFactor,
        randomnessFactor,
        mistakeProbability,
        activeElement,
        running: true,
        pausedResolver: null
    };
    console.log(`[DEBUG] New typing session. sessionStartIndex: ${typingState.sessionStartIndex}`);
    if (delayedStart) {
        setTimeout(() => mainTypingLoop(), 0);
    } else {
        mainTypingLoop();
    }
}

async function mainTypingLoop() {
    const state = typingState;
    if (!state || !state.running) return;
    while (state.i < state.text.length && typingState === state && state.running) {
        await waitIfPaused();
        if (!state.running) return;
        // Simulate a typo with probability
        const randomValue = Math.random();
        const shouldMakeMistake = randomValue < state.mistakeProbability && state.text[state.i].match(/[a-zA-Z0-9]/);
        if (shouldMakeMistake) {
            console.log(`[DEBUG] immediateFixPercentage at mistake: ${advancedSettings.immediateFixPercentage}`);
            const isImmediate = Math.random() < (advancedSettings.immediateFixPercentage / 100);
            const wrongChar = getRandomWrongChar(state.text[state.i]);
            let event = new KeyboardEvent("keydown", {key: wrongChar});
            state.activeElement.dispatchEvent(event);
            document.execCommand("insertText", false, wrongChar);
            state.mistakeLog.push({pos: state.i, wrong: wrongChar, correct: state.text[state.i]});
            console.log(`[DEBUG] Mistake logged at session-relative pos ${state.i}: '${wrongChar}' should be '${state.text[state.i]}'`);
            if (isImmediate) {
                console.log(`[DEBUG] Immediately fixing mistake at session-relative pos ${state.i}: "${wrongChar}" -> "${state.text[state.i]}"`);
                await new Promise(res => setTimeout(res, getRandomInt(MIN_IMMEDIATE_FIX_PAUSE_MS, MAX_IMMEDIATE_FIX_PAUSE_MS)));
                await waitIfPaused();
                if (!state.running) return;
                // Backspace
                let backspaceEvent = new KeyboardEvent("keydown", {key: "Backspace"});
                state.activeElement.dispatchEvent(backspaceEvent);
                document.execCommand("delete", false, null);
                await new Promise(res => setTimeout(res, getRandomInt(MIN_IMMEDIATE_FIX_PAUSE_MS, MAX_IMMEDIATE_FIX_PAUSE_MS)));
                await waitIfPaused();
                if (!state.running) return;
                // Type the correct character
                let correctEvent = new KeyboardEvent("keydown", {key: state.text[state.i]});
                state.activeElement.dispatchEvent(correctEvent);
                document.execCommand("insertText", false, state.text[state.i++]);
                state.mistakeLog.pop();
                await new Promise(res => setTimeout(res, state.baseDelay));
                continue;
            } else {
                state.i++;
                state.charsSinceLastReview++;
                await new Promise(res => setTimeout(res, state.baseDelay));
                continue;
            }
        }
        let event = new KeyboardEvent("keydown", {
            key: state.text[state.i],
            code: "Key" + state.text[state.i].toUpperCase(),
            charCode: state.text[state.i].charCodeAt(0),
            keyCode: state.text[state.i].charCodeAt(0),
            which: state.text[state.i].charCodeAt(0),
        });
        state.activeElement.dispatchEvent(event);
        document.execCommand("insertText", false, state.text[state.i++]);
        state.charsSinceLastReview++;
        // Check if it's time for a review phase
        const minChars = advancedSettings.minCharsBeforeReview ?? ADVANCED_DEFAULTS.minCharsBeforeReview;
        const maxChars = advancedSettings.maxCharsBeforeReview ?? ADVANCED_DEFAULTS.maxCharsBeforeReview;
        console.log(`[DEBUG] charsSinceLastReview: ${state.charsSinceLastReview}, reviewCharThreshold: ${state.reviewCharThreshold}, mistakeLog.length: ${state.mistakeLog.length}`);
        if (state.charsSinceLastReview >= state.reviewCharThreshold && state.mistakeLog.length > 0) {
            await new Promise(res => setTimeout(res, getRandomInt(MIN_REVIEW_PAUSE_MS, MAX_REVIEW_PAUSE_MS)));
            await waitIfPaused();
            if (!state.running) return;
            await reviewAndFixMistakes(state);
            state.charsSinceLastReview = 0;
            state.reviewCharThreshold = (minChars === maxChars)
                ? minChars
                : getRandomInt(minChars, maxChars);
            await new Promise(res => setTimeout(res, state.baseDelay));
        } else {
            let delay;
            if (state.randomnessFactor <= 0) {
                delay = state.baseDelay;
            } else {
                const variationPower = 1 + (state.randomnessFactor * 0.75);
                const minDelay = state.baseDelay * Math.max(0.15, 1 - Math.pow(state.randomnessFactor/variationPower, 1.2));
                const maxDelay = state.baseDelay * (1 + Math.pow(state.randomnessFactor*variationPower, 1.2)/2);
                delay = minDelay + Math.random() * (maxDelay - minDelay);
                const pauseProbability = 0.1 * Math.sqrt(state.randomnessFactor*variationPower);
                if (Math.random() < pauseProbability) {
                    const pauseIntensity = Math.pow(state.randomnessFactor, variationPower/2);
                    delay += (Math.random() * 1000 * pauseIntensity + 200) / state.speedFactor;
                }
            }
            await new Promise(res => setTimeout(res, delay));
        }
    }
    // Typing completed
    if (state.mistakeLog.length > 0) {
        console.log('[DEBUG] Final review phase triggered. mistakeLog:', JSON.stringify(state.mistakeLog));
        console.log(`[DEBUG] Final review: ${state.mistakeLog.length} mistakes to fix`);
        await reviewAndFixMistakes(state);
        console.log('[DEBUG] Final review phase complete. activeElement text:', isTextInput(state.activeElement) ? state.activeElement.value : state.activeElement.innerText);
        
        // Double-check: if there are still mistakes, try one more time
        if (state.mistakeLog.length > 0) {
            console.log('[DEBUG] Some mistakes still remain, trying final cleanup');
            await reviewAndFixMistakes(state);
            console.log('[DEBUG] Final cleanup complete. Remaining mistakes:', state.mistakeLog.length);
        }
    }
    typingState = null;
}

async function reviewAndFixMistakes(state) {
    console.log('[DEBUG] Entering reviewAndFixMistakes. mistakeLog:', JSON.stringify(state.mistakeLog));
    if (state.mistakeLog.length === 0) return;
    // Safety timeout
    let finished = false;
    const safetyTimeout = setTimeout(() => {
        if (!finished) {
            console.log('[DEBUG] Safety timeout triggered, forcing review completion');
            state.mistakeLog = [];
            finished = true;
        }
    }, 10000);
    const order = Math.random() < 0.5 ? 'forward' : 'backward';
    let indices = order === 'forward'
        ? [...Array(state.mistakeLog.length).keys()]
        : [...Array(state.mistakeLog.length).keys()].reverse();
    for (let fixIndex = 0; fixIndex < indices.length; fixIndex++) {
        await waitIfPaused();
        if (!state.running) break;
        const idx = indices[fixIndex];
        const {pos, correct} = state.mistakeLog[idx];
        let absolutePos = state.sessionStartIndex + pos;
        const textLen = getTextLength(state.activeElement);
        if (absolutePos < 0) absolutePos = 0;
        if (absolutePos > textLen) absolutePos = textLen;
        if (absolutePos < 0 || absolutePos > textLen) {
            console.warn(`[DEBUG] Skipping fix: calculated absolutePos ${absolutePos} is out of bounds (0,${textLen})`);
            continue;
        }
        console.log(`[DEBUG] Fixing mistake at session-relative pos ${pos} (absolute ${absolutePos}): "${state.mistakeLog[idx].wrong}" -> "${correct}"`);
        const currentPos = getCaretPosition(state.activeElement);
        console.log(`[DEBUG] Moving caret from ${currentPos} to ${absolutePos + 1}`);
        await hybridNavigateToPosition(state.activeElement, absolutePos + 1, currentPos, advancedSettings.allowWordNavigation);
        console.log('[DEBUG] Performing backspace');
        const beforeText = isTextInput(state.activeElement) ? state.activeElement.value : state.activeElement.innerText;
        stealthyBackspace(state.activeElement);
        await new Promise(res => setTimeout(res, getRandomInt(MIN_BETWEEN_FIX_PAUSE_MS, MAX_BETWEEN_FIX_PAUSE_MS)));
        console.log(`[DEBUG] Inserting correct character: "${correct}"`);
        stealthyInsertText(state.activeElement, correct);
        await new Promise(res => setTimeout(res, getRandomInt(MIN_BETWEEN_FIX_PAUSE_MS, MAX_BETWEEN_FIX_PAUSE_MS)));
        const afterText = isTextInput(state.activeElement) ? state.activeElement.value : state.activeElement.innerText;
        const newTextLength = getTextLength(state.activeElement);
        const expectedLength = beforeText.length;
        if (newTextLength !== expectedLength) {
            const diff = newTextLength - expectedLength;
            state.sessionStartIndex += diff;
            // Update all remaining mistake positions
            for (let j = fixIndex + 1; j < indices.length; j++) {
                const remainingIdx = indices[j];
                if (state.mistakeLog[remainingIdx]) {
                    state.mistakeLog[remainingIdx].pos += diff;
                }
            }
            console.log(`[DEBUG] Text length changed by ${diff}. Updated sessionStartIndex: ${state.sessionStartIndex}`);
        }
    }
    finished = true;
    clearTimeout(safetyTimeout);
    state.mistakeLog = [];
    setCaretPosition(state.activeElement, getTextLength(state.activeElement));
    console.log('[DEBUG] Finished reviewAndFixMistakes.');
}

// Arrow key navigation function (async, stepwise, human-like)
async function navigateWithArrowKeys(el, targetPos, currentPos, allowWordNavigation = false) {
    const steps = Math.abs(targetPos - currentPos);
    if (steps === 0) return;
    let pos = currentPos;
    for (let i = 0; i < steps; i++) {
        let nextPos;
        if (allowWordNavigation) {
            // Move by word
            const text = isTextInput(el) ? el.value : el.innerText;
            if (targetPos > pos) {
                nextPos = findNextWordBoundary(text, pos);
                if (nextPos > targetPos) nextPos = targetPos;
            } else {
                nextPos = findPrevWordBoundary(text, pos);
                if (nextPos < targetPos) nextPos = targetPos;
            }
        } else {
            // Move by character
            nextPos = pos + (targetPos > pos ? 1 : -1);
        }
        const direction = nextPos > pos ? 'right' : 'left';
        const key = direction === 'right' ? 'ArrowRight' : 'ArrowLeft';
        const keyCode = direction === 'right' ? 39 : 37;
        const eventOptions = {
            key: key,
            code: key,
            keyCode: keyCode,
            which: keyCode,
            bubbles: true,
            cancelable: true
        };
        if (allowWordNavigation) eventOptions.ctrlKey = true;
        const event = new KeyboardEvent('keydown', eventOptions);
        el.dispatchEvent(event);
        pos = nextPos;
        setCaretPosition(el, pos);
        console.log(`[DEBUG] Arrow navigation step ${i+1}/${steps}: pos=${pos}`);
        await new Promise(res => setTimeout(res, getRandomInt(30, 80)));
        if (pos === targetPos) break;
    }
}

// Hybrid navigation: use word navigation for big jumps, then character navigation for fine-tuning
async function hybridNavigateToPosition(el, targetPos, currentPos, allowWordNavigation = false) {
    let pos = currentPos;
    // Use word navigation for big jumps
    if (allowWordNavigation && Math.abs(targetPos - pos) > 5) {
        while (Math.abs(targetPos - pos) > 5) {
            let nextPos;
            const text = isTextInput(el) ? el.value : el.innerText;
            if (targetPos > pos) {
                nextPos = findNextWordBoundary(text, pos);
                if (nextPos > targetPos) nextPos = targetPos;
            } else {
                nextPos = findPrevWordBoundary(text, pos);
                if (nextPos < targetPos) nextPos = targetPos;
            }
            if (nextPos === pos) break; // can't move further by word
            await navigateWithArrowKeys(el, nextPos, pos, true);
            pos = nextPos;
        }
    }
    // Fine-tune with character navigation
    if (pos !== targetPos) {
        await navigateWithArrowKeys(el, targetPos, pos, false);
    }
}

window.addEventListener("keydown", function (event) {
    // Only stop typing if the key combination matches
    const isStopCombo = event.shiftKey && event.ctrlKey && event.code === 'KeyX';
    if (isStopCombo && typingState) {
        chrome.runtime.sendMessage({ action: "toggleTyping" });
    }
});

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

// --- Utility for word navigation ---
function findNextWordBoundary(text, pos) {
    // Move right to the end of the current word, then to the start of the next word
    const len = text.length;
    let i = pos;
    // Skip non-word chars
    while (i < len && !/\w/.test(text[i])) i++;
    // Skip word chars
    while (i < len && /\w/.test(text[i])) i++;
    // Skip non-word chars to the start of the next word
    while (i < len && !/\w/.test(text[i])) i++;
    return i;
}
function findPrevWordBoundary(text, pos) {
    // Move left to the start of the current word, then to the end of the previous word
    let i = pos;
    // Skip non-word chars
    while (i > 0 && !/\w/.test(text[i-1])) i--;
    // Skip word chars
    while (i > 0 && /\w/.test(text[i-1])) i--;
    return i;
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

// Utility to get caret position in the field
function getCaretPosition(el) {
    if (isTextInput(el)) {
        return el.selectionStart;
    } else if (isContentEditable(el)) {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return 0;
        const range = selection.getRangeAt(0);
        let preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(el);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        return preCaretRange.toString().length;
    }
    return 0;
}