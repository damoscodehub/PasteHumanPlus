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

let typingState = null;
let isPaused = false;
let currentSpeedFactor = 1.0;
let currentRandomnessFactor = 1.0;
let currentMistakeProbability = 0.03; // Default: 3%

// Advanced settings with defaults
let advancedSettings = {
    allowSelection: true,
    allowWordNavigation: true
};

// Load settings from chrome.storage.local when script initializes
chrome.storage.local.get(['speedFactor', 'randomnessFactor', 'mistakeProbability', 'allowSelection', 'allowWordNavigation'], function(result) {
    if (result.speedFactor !== undefined) {
        currentSpeedFactor = result.speedFactor;
    }
    if (result.randomnessFactor !== undefined) {
        currentRandomnessFactor = result.randomnessFactor;
    }
    if (result.mistakeProbability !== undefined) {
        currentMistakeProbability = result.mistakeProbability;
    }
    if (result.allowSelection !== undefined) {
        advancedSettings.allowSelection = result.allowSelection;
    }
    if (result.allowWordNavigation !== undefined) {
        advancedSettings.allowWordNavigation = result.allowWordNavigation;
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
        // Update advanced settings when they change
        Object.assign(advancedSettings, request.settings);
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
    typingState = {
        text,
        i: 0,
        baseDelay: 100 / speedFactor,
        charsSinceLastReview: 0,
        reviewCharThreshold: getRandomInt(MIN_CHARS_BEFORE_REVIEW, MAX_CHARS_BEFORE_REVIEW),
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
            const isImmediate = Math.random() < (IMMEDIATE_FIX_PERCENTAGE / 100);
            const wrongChar = getRandomWrongChar(state.text[state.i]);
            let event = new KeyboardEvent("keydown", {key: wrongChar});
            state.activeElement.dispatchEvent(event);
            document.execCommand("insertText", false, wrongChar);
            state.mistakeLog.push({pos: state.i, wrong: wrongChar, correct: state.text[state.i]});
            console.log(`[DEBUG] Mistake logged at session-relative pos ${state.i}: '${wrongChar}' should be '${state.text[state.i]}'`);
            if (isImmediate) {
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
        if (state.charsSinceLastReview >= state.reviewCharThreshold && state.mistakeLog.length > 0) {
            await new Promise(res => setTimeout(res, getRandomInt(MIN_REVIEW_PAUSE_MS, MAX_REVIEW_PAUSE_MS)));
            await waitIfPaused();
            if (!state.running) return;
            await reviewAndFixMistakes(state);
            state.charsSinceLastReview = 0;
            state.reviewCharThreshold = getRandomInt(MIN_CHARS_BEFORE_REVIEW, MAX_CHARS_BEFORE_REVIEW);
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
        await reviewAndFixMistakes(state);
        console.log('[DEBUG] Final review phase complete. activeElement.value:', state.activeElement.value);
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
        await navigateWithArrowKeys(state.activeElement, absolutePos + 1, currentPos, advancedSettings.allowSelection, advancedSettings.allowWordNavigation);
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
            state.mistakeLog.forEach(m => m.pos += diff);
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
async function navigateWithArrowKeys(el, targetPos, currentPos, allowSelection = false, allowWordNavigation = false) {
    const steps = Math.abs(targetPos - currentPos);
    if (steps === 0) return;
    const direction = currentPos < targetPos ? 'right' : 'left';
    const key = direction === 'right' ? 'ArrowRight' : 'ArrowLeft';
    const keyCode = direction === 'right' ? 39 : 37;
    const stepDelay = getRandomInt(30, 80); // ms between arrow presses
    let pos = currentPos;
    for (let i = 0; i < steps; i++) {
        const eventOptions = {
            key: key,
            code: key,
            keyCode: keyCode,
            which: keyCode,
            bubbles: true,
            cancelable: true
        };
        if (allowSelection) eventOptions.shiftKey = true;
        if (allowWordNavigation) eventOptions.ctrlKey = true;
        const event = new KeyboardEvent('keydown', eventOptions);
        el.dispatchEvent(event);
        // Move caret one step
        pos += (direction === 'right' ? 1 : -1);
        setCaretPosition(el, pos);
        console.log(`[DEBUG] Arrow navigation step ${i+1}/${steps}: pos=${pos}`);
        await new Promise(res => setTimeout(res, stepDelay));
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