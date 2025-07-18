// === Configurable Parameters ===
const IMMEDIATE_FIX_PERCENTAGE = 75; // % of mistakes fixed immediately
const MIN_CHARS_BEFORE_REVIEW = 5;
const MAX_CHARS_BEFORE_REVIEW = 15;
const MIN_REVIEW_PAUSE_MS = 1000;
const MAX_REVIEW_PAUSE_MS = 3000;
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

// === Typing State for True Pause/Resume ===
let typingState = null;

function clearTypingState() {
    typingState = null;
}

function pauseTyping() {
    if (typingState) {
        typingState.isPaused = true;
        logDebugState('Paused', typingState);
    }
}

function resumeTyping() {
    if (typingState && typingState.isPaused) {
        typingState.isPaused = false;
        logDebugState('Resumed', typingState);
        proceedTyping();
    }
}

function proceedTyping() {
    if (!typingState || typingState.isPaused) return;
    const state = typingState;
    if (state.phase === 'typing') {
        typeNextCharacter(state);
    } else if (state.phase === 'immediateFix') {
        doImmediateFix(state);
    } else if (state.phase === 'review') {
        doReviewFix(state);
    }
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === "updateSpeedFactor") {
        currentSpeedFactor = request.speedFactor;
    } else if (request.action === "updateRandomnessFactor") {
        currentRandomnessFactor = request.randomnessFactor;
    } else if (request.action === "updateMistakeProbability") {
        currentMistakeProbability = request.mistakeProbability;
    } else if (request.action === "emulateTyping") {
        currentTypingSession = Math.random().toString();
        clearTypingState();
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
        clearTypingState();
    } else if (request.action === "toggleTyping") {
        if (currentTypingSession) {
            if (typingState && typingState.isPaused) {
                resumeTyping();
            } else {
                pauseTyping();
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
    let charsSinceLastReview = 0;
    let reviewCharThreshold = getRandomInt(MIN_CHARS_BEFORE_REVIEW, MAX_CHARS_BEFORE_REVIEW);
    let mistakeLog = [];
    let fieldPos = getCaretPosition(activeElement);
    let fieldStart = getTextLength(activeElement); // Track where this typing session starts
    typingState = {
        isPaused: false,
        session,
        text,
        activeElement,
        i,
        baseDelay,
        charsSinceLastReview,
        reviewCharThreshold,
        mistakeLog,
        fieldPos,
        fieldStart,
        speedFactor,
        randomnessFactor,
        mistakeProbability,
        phase: 'typing',
        immediateFix: null,
        review: null,
        remainingText: '',
    };
    if (delayedStart) {
        setTimeout(() => proceedTyping(), 0);
    } else {
        proceedTyping();
    }
}

function typeNextCharacter(state) {
    if (state.isPaused || state.session !== currentTypingSession) {
        state.remainingText = state.text.slice(state.i);
        return;
    }
    if (state.i < state.text.length && state.session === currentTypingSession) {
        const randomValue = Math.random();
        const shouldMakeMistake = randomValue < state.mistakeProbability && state.text[state.i].match(/[a-zA-Z0-9]/);
        if (shouldMakeMistake) {
            const isImmediate = Math.random() < (IMMEDIATE_FIX_PERCENTAGE / 100);
            const wrongChar = getRandomWrongChar(state.text[state.i]);
            let event = new KeyboardEvent("keydown", {key: wrongChar});
            state.activeElement.dispatchEvent(event);
            document.execCommand("insertText", false, wrongChar);
            state.mistakeLog.push({absPos: state.fieldStart + state.i, wrong: wrongChar, correct: state.text[state.i]});
            logDebugState('After mistake', state);
            state.fieldPos++;
            if (isImmediate) {
                state.phase = 'immediateFix';
                state.immediateFix = {
                    step: 0, // 0: backspace, 1: insert correct
                    i: state.i,
                };
                setTimeout(() => proceedTyping(), getRandomInt(MIN_IMMEDIATE_FIX_PAUSE_MS, MAX_IMMEDIATE_FIX_PAUSE_MS));
                return;
            } else {
                state.i++;
                state.charsSinceLastReview++;
                let delay = state.baseDelay;
                setTimeout(() => proceedTyping(), delay);
                return;
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
        logDebugState('After character insert', state);
        state.fieldPos++;
        state.charsSinceLastReview++;
        if (state.charsSinceLastReview >= state.reviewCharThreshold && state.mistakeLog.length > 0) {
            state.phase = 'review';
            state.review = {
                order: Math.random() < 0.5 ? 'forward' : 'backward',
                fixIndex: 0,
            };
            setTimeout(() => proceedTyping(), getRandomInt(MIN_REVIEW_PAUSE_MS, MAX_REVIEW_PAUSE_MS));
            return;
        }
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
        setTimeout(() => proceedTyping(), delay);
    } else if (state.i >= state.text.length) {
        // Final review if any mistakes remain
        if (state.mistakeLog.length > 0) {
            logDebugState('Final review phase (end of typing)', state);
            state.phase = 'review';
            state.review = { order: Math.random() < 0.5 ? 'forward' : 'backward', fixIndex: 0, step: 0 };
            doReviewFix(state, () => {
                logDebugState('After final review phase', state);
                clearTypingState();
            });
            return;
        }
        clearTypingState();
        return;
    }
}

function doImmediateFix(state) {
    if (state.isPaused || state.session !== currentTypingSession) {
        state.remainingText = state.text.slice(state.i);
        return;
    }
    const fix = state.immediateFix;
    if (fix.step === 0) {
        setCaretPosition(state.activeElement, state.fieldPos);
        let backspaceEvent = new KeyboardEvent("keydown", {key: "Backspace"});
        state.activeElement.dispatchEvent(backspaceEvent);
        document.execCommand("delete", false, null);
        adjustMistakeLogPositions(state.mistakeLog, state.fieldPos);
        logDebugState('After backspace (immediate fix)', state);
        state.fieldPos--;
        fix.step = 1;
        setTimeout(() => proceedTyping(), getRandomInt(MIN_IMMEDIATE_FIX_PAUSE_MS, MAX_IMMEDIATE_FIX_PAUSE_MS));
    } else if (fix.step === 1) {
        let correctEvent = new KeyboardEvent("keydown", {key: state.text[fix.i]});
        state.activeElement.dispatchEvent(correctEvent);
        document.execCommand("insertText", false, state.text[state.i++]);
        logDebugState('After correct insert (immediate fix)', state);
        state.fieldPos++;
        state.mistakeLog.pop();
        state.phase = 'typing';
        setTimeout(() => proceedTyping(), state.baseDelay);
    }
}

// In doReviewFix, split each fix into two steps: backspace, then insert correct character. Track step in review state.
function doReviewFix(state) {
    if (state.isPaused || state.session !== currentTypingSession) {
        state.remainingText = state.text.slice(state.i);
        return;
    }
    const review = state.review;
    let indices = review.order === 'forward'
        ? [...Array(state.mistakeLog.length).keys()]
        : [...Array(state.mistakeLog.length).keys()].reverse();
    if (review.fixIndex >= indices.length) {
        state.mistakeLog = [];
        setCaretPosition(state.activeElement, getTextLength(state.activeElement));
        logDebugState('After review phase complete', state);
        state.phase = 'typing';
        state.charsSinceLastReview = 0;
        state.reviewCharThreshold = getRandomInt(MIN_CHARS_BEFORE_REVIEW, MAX_CHARS_BEFORE_REVIEW);
        setTimeout(() => proceedTyping(), state.baseDelay);
        return;
    }
    // Track step: 0 = backspace, 1 = insert correct
    if (!('step' in review)) review.step = 0;
    const idx = indices[review.fixIndex];
    const {absPos, wrong, correct} = state.mistakeLog[idx];
    let currentChar = getCharAtPosition(state.activeElement, absPos);
    if (review.step === 0) {
        if (currentChar !== wrong) {
            review.fixIndex++;
            review.step = 0;
            setTimeout(() => proceedTyping(), 0);
            return;
        }
        setCaretPosition(state.activeElement, absPos + 1);
        stealthyBackspace(state.activeElement);
        adjustMistakeLogPositions(state.mistakeLog, absPos);
        logDebugState('After backspace (review fix)', state);
        review.step = 1;
        setTimeout(() => proceedTyping(), getRandomInt(MIN_BETWEEN_FIX_PAUSE_MS, MAX_BETWEEN_FIX_PAUSE_MS));
    } else if (review.step === 1) {
        setCaretPosition(state.activeElement, absPos);
        stealthyInsertText(state.activeElement, correct);
        logDebugState('After correct insert (review fix)', state);
        review.fixIndex++;
        review.step = 0;
        setTimeout(() => proceedTyping(), 0);
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
function logDebugState(label, state) {
    const el = state && state.activeElement;
    let content = '';
    if (el) {
        if (isTextInput(el)) content = el.value;
        else if (isContentEditable(el)) content = el.innerText;
    }
    let caret = el ? getCaretPosition(el) : null;
    console.log(`[DEBUG] ${label}`);
    console.log('  Content:', JSON.stringify(content));
    console.log('  Caret:', caret);
    if (state) {
        console.log('  i:', state.i, 'fieldPos:', state.fieldPos, 'phase:', state.phase);
        console.log('  mistakeLog:', JSON.stringify(state.mistakeLog));
        if (state.immediateFix) console.log('  immediateFix:', JSON.stringify(state.immediateFix));
        if (state.review) console.log('  review:', JSON.stringify(state.review));
    }
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

// Utility: getCharAtPosition for both input/textarea and contenteditable
function getCharAtPosition(el, pos) {
    if (isTextInput(el)) {
        return el.value.charAt(pos);
    } else if (isContentEditable(el)) {
        let text = el.innerText || el.textContent || "";
        return text.charAt(pos);
    }
    return '';
}

// Utility to update mistakeLog positions after a fix
function adjustMistakeLogPositions(mistakeLog, fixedAbsPos) {
    for (let m of mistakeLog) {
        if (m.absPos > fixedAbsPos) {
            m.absPos--;
        }
    }
    console.log('[DEBUG] mistakeLog positions adjusted after fix at', fixedAbsPos, JSON.stringify(mistakeLog));
}