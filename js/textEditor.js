/* textEditor.js - Refactored for Multiple Canvases */

import { getActiveCanvas } from './main.js';
import { createElement, getActiveTextElement } from './element.js';

// NOTE: Event listeners for controls (fontFamily, textColor, etc.)
// will be attached dynamically in main.js when a canvas is created.

// Add title element to the active canvas
document.getElementById('addTextBtn').addEventListener('click', function() {
  const activeCanvas = getActiveCanvas(); // Assumes getActiveCanvas() exists (will be in main.js)
  if (!activeCanvas) {
      alert("Please select a canvas first.");
      return;
  }
  const textTitle = document.getElementById('textTitle'); // Assuming this control remains global
  const selectedTitle = textTitle.value;
  if (selectedTitle) {
    // Create the text element itself (using p or h3 as needed)
    const titleEl = document.createElement('h3'); // Or 'p' depending on desired semantics
    titleEl.contentEditable = true;
    titleEl.className = 'editable-text'; // Add class for element.js logic
    titleEl.style.margin = "0";
    titleEl.style.padding = "10px";
    // titleEl.style.position = "absolute"; // Position is handled by the wrapper in createElement
    titleEl.style.zIndex = '10'; // z-index might be better on the wrapper
    titleEl.style.color = "#fff";
    titleEl.style.fontFamily ="Arial";
    //titleEl.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    titleEl.style.lineHeight = "22px";
    titleEl.innerText = selectedTitle;

    // Pass the editable element directly to createElement
    createElement(titleEl, 'text-title', activeCanvas);
  }
});

// Add description element to the active canvas
document.getElementById('addTextareaBtn').addEventListener('click', function() {
  const activeCanvas = getActiveCanvas(); // Assumes getActiveCanvas() exists
  if (!activeCanvas) {
      alert("Please select a canvas first.");
      return;
  }
  const textDescription = document.getElementById('textDescription'); // Assuming this control remains global
  const descriptionValue = textDescription.value.trim();
  if (descriptionValue) {
    const descEl = document.createElement('p');
    descEl.contentEditable = true;
    descEl.className = 'editable-text'; // Add class
    descEl.style.margin = "0";
    descEl.style.padding = "8px"; // Add some padding
    descEl.style.maxHeight = "500px"; // Set max height
    descEl.style.overflowY = "auto"; // Add scrollbar if content exceeds max height
    descEl.innerText = descriptionValue;

    createElement(descEl, 'text-description', activeCanvas);
  }
});


// Add summary element to the active canvas
document.getElementById('addSummaryBtn').addEventListener('click', function() {
  const activeCanvas = getActiveCanvas(); // Assumes getActiveCanvas() exists
  if (!activeCanvas) {
      alert("Please select a canvas first.");
      return;
  }
  const textSummary = document.getElementById('textSummary');
  const summaryValue = textSummary.value.trim();
  if (summaryValue) {
    const summaryEl = document.createElement('p');
    summaryEl.contentEditable = true;
    summaryEl.className = 'editable-text'; // Add class for element.js logic
    summaryEl.style.margin = "0";
    summaryEl.style.padding = "8px";
    summaryEl.style.maxHeight = "300px";
    summaryEl.style.overflowY = "auto";
    summaryEl.innerText = summaryValue;

    createElement(summaryEl, 'text-summary', activeCanvas);
  }
});


// Add elementTextInput value to the active canvas
document.getElementById('addElementTextBtn').addEventListener('click', function() {
  const activeCanvas = getActiveCanvas(); // Assumes getActiveCanvas() exists
  if (!activeCanvas) {
      alert("Please select a canvas first.");
      return;
  }
  const elementTextInput = document.getElementById('elementTextInput');
  const elementValue = elementTextInput.value.trim();
  if (elementValue) {
    const el = document.createElement('div');
    el.contentEditable = true;
    el.className = 'editable-text'; // For consistency with other elements
    el.style.margin = "0";
    el.style.padding = "10px";
    el.style.minHeight = "32px";
    el.style.color = "#000";
    el.style.fontFamily = "Arial";
    el.style.fontSize = "12px";
    el.innerText = elementValue;

    createElement(el, 'text-input',  activeCanvas);
  }
});


// --- Text Style Application Functions ---
// These functions will be called by event listeners attached in main.js

// The following functions (lines 112-192) are the older versions.
// They will be removed as the revised versions below (starting line 195) are more complete.


// --- Revised Style Application Functions ---

// Helper to check for active selection within the active text element
function getActiveSelectionRange() {
    const activeTextElement = getActiveTextElement();
    if (!activeTextElement) return null;

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        // Check if the selection is actually inside the active editable element
        if (activeTextElement.contains(range.commonAncestorContainer)) {
            return range;
        }
    }
    return null;
}

// Apply Font Family
export function applyFontFamily(fontFamily) {
    const range = getActiveSelectionRange();
    if (range) {
        document.execCommand('fontName', false, fontFamily);
    } else {
        const activeTextElement = getActiveTextElement();
        if (activeTextElement) {
            activeTextElement.style.fontFamily = fontFamily;
        }
    }
}

// Apply Text Color
export function applyTextColor(color) {
    const range = getActiveSelectionRange();
    if (range) {
        document.execCommand('foreColor', false, color);
    } else {
        const activeTextElement = getActiveTextElement();
        if (activeTextElement) {
            activeTextElement.style.color = color;
        }
    }
}

// Apply Font Size
// Note: execCommand('fontSize') uses 1-7. Mapping px to this is unreliable.
// It's often better to wrap selection in a span for font size.
export function applyFontSize(size) {
    const range = getActiveSelectionRange();
    const activeTextElement = getActiveTextElement();

    if (range) {
        try {
            const span = document.createElement('span');
            span.style.fontSize = size + 'px';
            // Prevent nesting spans unnecessarily if possible, but simple surround is easier
            range.surroundContents(span);
            window.getSelection().removeAllRanges(); // Clear selection after applying
        } catch (e) {
            console.error("Could not wrap selection for font size (maybe spans block elements):", e);
            // Fallback: Apply to whole element if wrapping fails
            if (activeTextElement) activeTextElement.style.fontSize = size + 'px';
        }
    } else if (activeTextElement) {
        activeTextElement.style.fontSize = size + 'px';
    }
}

// Apply Font Weight (Bold)
export function applyFontWeight() {
    const range = getActiveSelectionRange();
    if (range) {
        document.execCommand('bold', false, null);
    } else {
        const activeTextElement = getActiveTextElement();
        if (activeTextElement) {
            const currentWeight = window.getComputedStyle(activeTextElement).fontWeight;
            const isBold = currentWeight === 'bold' || parseInt(currentWeight) >= 700;
            activeTextElement.style.fontWeight = isBold ? 'normal' : 'bold';
        }
    }
}

// Apply Text Highlight Background Color (Solid Color)
export function applyHighlightBgColor(hexColor) {
    const range = getActiveSelectionRange();
    const activeTextElement = getActiveTextElement();

    if (range) {
        // Use execCommand for highlight color if possible (simpler)
        // Note: 'backColor' or 'hiliteColor' might have browser inconsistencies.
        // Wrapping in a span is more reliable.
        try {
            const span = document.createElement('span');
            span.style.backgroundColor = hexColor; // Apply solid color
            range.surroundContents(span);
            window.getSelection().removeAllRanges(); // Clear selection
        } catch (e) {
            console.error("Could not wrap selection for highlight color:", e);
            // Fallback: Apply to whole element if wrapping fails
            if (activeTextElement) activeTextElement.style.backgroundColor = hexColor;
        }
    } else if (activeTextElement) {
        alert("Please select text first to apply highlight color.");
    }
}


// Apply Element Wrapper Background Color and Opacity
export function applyElementBgColorWithOpacity(hexColor, opacityPercent) {
    const activeTextElement = getActiveTextElement();
    if (!activeTextElement) return;

    const wrapperElement = activeTextElement.closest('.element');
    if (!wrapperElement) return;

    // Calculate the RGBA color string
    let rgbaColor = 'transparent'; // Default to transparent if hex is invalid
    const hexMatch = hexColor.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (hexMatch) {
        const r = parseInt(hexMatch[1], 16);
        const g = parseInt(hexMatch[2], 16);
        const b = parseInt(hexMatch[3], 16);
        rgbaColor = `rgba(${r}, ${g}, ${b}, ${opacityPercent / 100})`;
    } else if (hexColor === 'transparent') {
         rgbaColor = 'transparent';
    }
    // Apply to the wrapper element
    wrapperElement.style.backgroundColor = rgbaColor;
}
