/* element.js with mobile touch support */

// Deactivate all elements
function deactivateAllElements() {
  document.querySelectorAll('.element').forEach(el => {
    el.classList.remove('active');
    if (el.resizeHandle) el.resizeHandle.style.display = 'none';
    if (el.deleteBtn) el.deleteBtn.style.display = 'none';
    if (el.rotateHandle) el.rotateHandle.style.display = 'none';
  });
}

// Update position for resize handle
function updateHandle(wrapper, handle) {
  const canvasRect = document.getElementById('canvas').getBoundingClientRect();
  const offsetX = wrapper.offsetLeft + wrapper.offsetWidth - 5;
  const offsetY = wrapper.offsetTop + wrapper.offsetHeight - 5;
  handle.style.left = (canvasRect.left + offsetX) + 'px';
  handle.style.top = (canvasRect.top + offsetY) + 'px';
}

// Update position for delete button
function updateDeleteButton(wrapper, deleteBtn) {
  const canvasRect = document.getElementById('canvas').getBoundingClientRect();
  const offsetX = wrapper.offsetLeft - 5;
  const offsetY = wrapper.offsetTop - 5;
  deleteBtn.style.left = (canvasRect.left + offsetX) + 'px';
  deleteBtn.style.top = (canvasRect.top + offsetY) + 'px';
}

// Update position for rotate handle
function updateRotateHandle(wrapper, rotateHandle) {
  const canvasRect = document.getElementById('canvas').getBoundingClientRect();
  const offsetX = wrapper.offsetLeft + wrapper.offsetWidth - 5;
  const offsetY = wrapper.offsetTop - 5;
  rotateHandle.style.left = (canvasRect.left + offsetX) + 'px';
  rotateHandle.style.top = (canvasRect.top + offsetY) + 'px';
}

// Get client position (works for both mouse and touch events)
function getClientPosition(e) {
  // Check if it's a touch event
  if (e.touches && e.touches.length > 0) {
    return {
      clientX: e.touches[0].clientX,
      clientY: e.touches[0].clientY
    };
  }
  // Otherwise it's a mouse event
  return {
    clientX: e.clientX,
    clientY: e.clientY
  };
}

// Create an element on the canvas
function createElement(content) {
  const canvas = document.getElementById('canvas');
  const wrapper = document.createElement('div');
  // Check if content is from auto-inserted image
  if (content instanceof HTMLElement && content.classList.contains('autoTextInserted')) {
    wrapper.className = 'element autoTextInserted';
    wrapper.style.width = '400px';
    wrapper.style.height = '150px';
    wrapper.style.bottom = '0px';
    wrapper.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    } else {
        wrapper.className = 'element';
        wrapper.style.width = '400px';
        wrapper.style.height = 'auto';
    }
  

  const contentDiv = document.createElement('div');
  contentDiv.className = 'content';
  contentDiv.style.width = '100%';
  contentDiv.style.height = '100%';
  
  
  if (content instanceof HTMLImageElement) {
    content.style.width = '100%';
    content.style.height = '100%';
    content.style.display = 'block';
    contentDiv.appendChild(content);
  } else if (content instanceof HTMLElement) {
    // Add event listeners for both mouse and touch
    const clickHandler = function(e) {
      e.stopPropagation();
      currentTextElement = content;
      const editPanel = document.getElementById('textEditPanel');
      editPanel.style.display = 'block';
      document.getElementById('fontFamily').value =
        window.getComputedStyle(content).fontFamily.split(',')[0].replace(/['"]/g, '');
      document.getElementById('textColor').value =
        rgb2hex(window.getComputedStyle(content).color);
      document.getElementById('textBgColor').value =
        rgb2hex(window.getComputedStyle(content).backgroundColor);
      document.getElementById('fontSize').value =
        parseInt(window.getComputedStyle(content).fontSize);
    };
    
    content.addEventListener('click', clickHandler);
    content.addEventListener('touchend', function(e) {
      if (e.cancelable) e.preventDefault();
      clickHandler(e);
    });
    
    contentDiv.appendChild(content);
  } else {
    contentDiv.innerText = content;
  }
  
  wrapper.appendChild(contentDiv);
  
  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.innerText = 'X';
  deleteBtn.style.position = 'absolute';
  deleteBtn.style.width = '30px'; // Increased size for mobile
  deleteBtn.style.height = '30px'; // Increased size for mobile
  deleteBtn.style.backgroundColor = 'red';
  deleteBtn.style.color = 'white';
  deleteBtn.style.border = 'none';
  deleteBtn.style.cursor = 'pointer';
  deleteBtn.style.borderRadius = '50%'; // Make it circular
  deleteBtn.style.fontSize = '16px'; // Increased font size for mobile
  deleteBtn.style.display = 'flex';
  deleteBtn.style.alignItems = 'center';
  deleteBtn.style.justifyContent = 'center';
  
  const deleteHandler = function(e) {
    e.stopPropagation();
    if (wrapper.resizeHandle) wrapper.resizeHandle.remove();
    if (wrapper.deleteBtn) wrapper.deleteBtn.remove();
    if (wrapper.rotateHandle) wrapper.rotateHandle.remove();
    wrapper.remove();
  };
  
  deleteBtn.addEventListener('click', deleteHandler);
  deleteBtn.addEventListener('touchend', function(e) {
    if (e.cancelable) e.preventDefault();
    deleteHandler(e);
  });
  
  document.body.appendChild(deleteBtn);
  updateDeleteButton(wrapper, deleteBtn);
  wrapper.deleteBtn = deleteBtn;
  
  // Append element to canvas
  canvas.appendChild(wrapper);
  
  // Resize handle
  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'resize-handle';
  resizeHandle.style.width = '30px'; // Increased size for mobile
  resizeHandle.style.height = '30px'; // Increased size for mobile
  resizeHandle.style.backgroundColor = 'green';
  resizeHandle.style.borderRadius = '50%'; // Make it circular
  resizeHandle.innerHTML = '⤡'; // Resize icon
  resizeHandle.style.color = 'white';
  resizeHandle.style.display = 'flex';
  resizeHandle.style.alignItems = 'center';
  resizeHandle.style.justifyContent = 'center';
  resizeHandle.style.fontSize = '16px'; // Increased font size for mobile
  
  document.body.appendChild(resizeHandle);
  updateHandle(wrapper, resizeHandle);
  wrapper.resizeHandle = resizeHandle;
  
  // Rotate handle
  const rotateHandle = document.createElement('div');
  rotateHandle.className = 'rotate-handle';
  rotateHandle.innerHTML = '↻';
  rotateHandle.style.position = 'absolute';
  rotateHandle.style.width = '30px'; // Increased size for mobile
  rotateHandle.style.height = '30px'; // Increased size for mobile
  rotateHandle.style.backgroundColor = 'blue';
  rotateHandle.style.color = 'white';
  rotateHandle.style.cursor = 'pointer';
  rotateHandle.style.display = 'flex';
  rotateHandle.style.alignItems = 'center';
  rotateHandle.style.justifyContent = 'center';
  rotateHandle.style.borderRadius = '50%';
  rotateHandle.style.fontSize = '16px'; // Increased font size for mobile
  
  document.body.appendChild(rotateHandle);
  updateRotateHandle(wrapper, rotateHandle);
  wrapper.rotateHandle = rotateHandle;
  
  // Rotation logic with mouse and touch support
  let currentRotation = 0;
  
  function startRotate(e) {
    const pos = getClientPosition(e);
    const rect = wrapper.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    function rotateElement(e) {
      const pos = getClientPosition(e);
      const angle = Math.atan2(pos.clientY - centerY, pos.clientX - centerX);
      const degrees = angle * (180 / Math.PI);
      wrapper.style.transform = `rotate(${degrees}deg)`;
      if (content instanceof HTMLElement && content.classList.contains('autoTextInserted')) {
        wrapper.style.zIndex = 10;
      }
      currentRotation = degrees;
      
      // Update handle positions during rotation
      updateHandle(wrapper, resizeHandle);
      updateDeleteButton(wrapper, deleteBtn);
      updateRotateHandle(wrapper, rotateHandle);
    }
    
    function stopRotating() {
      document.removeEventListener('mousemove', rotateElement);
      document.removeEventListener('touchmove', rotateElement);
      document.removeEventListener('mouseup', stopRotating);
      document.removeEventListener('touchend', stopRotating);
    }
    
    document.addEventListener('mousemove', rotateElement);
    document.addEventListener('touchmove', rotateElement, { passive: false });
    document.addEventListener('mouseup', stopRotating);
    document.addEventListener('touchend', stopRotating);
    
    e.stopPropagation();
    if (e.cancelable && e.type === 'touchstart') e.preventDefault();
  }
  
  rotateHandle.addEventListener('mousedown', startRotate);
  rotateHandle.addEventListener('touchstart', startRotate, { passive: false });
  
  // Enable dragging with mouse and touch support
  function startDrag(e) {
    if (e.target === resizeHandle || e.target === deleteBtn || e.target === rotateHandle) return;
    
    const pos = getClientPosition(e);
    
    deactivateAllElements();
    wrapper.classList.add('active');
    if (wrapper.resizeHandle) wrapper.resizeHandle.style.display = 'block';
    if (wrapper.deleteBtn) wrapper.deleteBtn.style.display = 'block';
    if (wrapper.rotateHandle) wrapper.rotateHandle.style.display = 'block';
    
    currentDrag = wrapper;
    dragOffsetX = pos.clientX - wrapper.offsetLeft;
    dragOffsetY = pos.clientY - wrapper.offsetTop;
    
    if (e.cancelable && e.type === 'touchstart') e.preventDefault();
  }
  
  wrapper.addEventListener('mousedown', startDrag);
  wrapper.addEventListener('touchstart', startDrag, { passive: false });
  
  // Enable resizing with mouse and touch support
  function startResize(e) {
    currentResize = { wrapper, handle: resizeHandle };
    origWidth = wrapper.offsetWidth;
    origHeight = wrapper.offsetHeight;
    
    const pos = getClientPosition(e);
    origMouseX = pos.clientX;
    origMouseY = pos.clientY;
    
    e.stopPropagation();
    if (e.cancelable && e.type === 'touchstart') e.preventDefault();
  }
  
  resizeHandle.addEventListener('mousedown', startResize);
  resizeHandle.addEventListener('touchstart', startResize, { passive: false });
}

// Add global mouse and touch move handlers
document.addEventListener('mousemove', function(e) {
  if (currentDrag) {
    currentDrag.style.left = (e.clientX - dragOffsetX) + 'px';
    currentDrag.style.top = (e.clientY - dragOffsetY) + 'px';
    
    // Update handle positions during drag
    if (currentDrag.resizeHandle) updateHandle(currentDrag, currentDrag.resizeHandle);
    if (currentDrag.deleteBtn) updateDeleteButton(currentDrag, currentDrag.deleteBtn);
    if (currentDrag.rotateHandle) updateRotateHandle(currentDrag, currentDrag.rotateHandle);
  }
  
  if (currentResize) {
    const deltaWidth = e.clientX - origMouseX;
    const deltaHeight = e.clientY - origMouseY;
    
    currentResize.wrapper.style.width = (origWidth + deltaWidth) + 'px';
    currentResize.wrapper.style.height = (origHeight + deltaHeight) + 'px';
    
    // Update handle positions during resize
    updateHandle(currentResize.wrapper, currentResize.handle);
    if (currentResize.wrapper.deleteBtn) updateDeleteButton(currentResize.wrapper, currentResize.wrapper.deleteBtn);
    if (currentResize.wrapper.rotateHandle) updateRotateHandle(currentResize.wrapper, currentResize.wrapper.rotateHandle);
  }
});

document.addEventListener('touchmove', function(e) {
  if (!currentDrag && !currentResize) return;
  
  const pos = getClientPosition(e);
  
  if (currentDrag) {
    currentDrag.style.left = (pos.clientX - dragOffsetX) + 'px';
    currentDrag.style.top = (pos.clientY - dragOffsetY) + 'px';
    
    // Update handle positions during drag
    if (currentDrag.resizeHandle) updateHandle(currentDrag, currentDrag.resizeHandle);
    if (currentDrag.deleteBtn) updateDeleteButton(currentDrag, currentDrag.deleteBtn);
    if (currentDrag.rotateHandle) updateRotateHandle(currentDrag, currentDrag.rotateHandle);
  }
  
  if (currentResize) {
    const deltaWidth = pos.clientX - origMouseX;
    const deltaHeight = pos.clientY - origMouseY;
    
    currentResize.wrapper.style.width = (origWidth + deltaWidth) + 'px';
    currentResize.wrapper.style.height = (origHeight + deltaHeight) + 'px';
    
    // Update handle positions during resize
    updateHandle(currentResize.wrapper, currentResize.handle);
    if (currentResize.wrapper.deleteBtn) updateDeleteButton(currentResize.wrapper, currentResize.wrapper.deleteBtn);
    if (currentResize.wrapper.rotateHandle) updateRotateHandle(currentResize.wrapper, currentResize.wrapper.rotateHandle);
  }
  
  // Prevent default to avoid scrolling while dragging/resizing
  if (e.cancelable) e.preventDefault();
}, { passive: false });

// Add global mouse and touch end handlers
function endDragOrResize() {
  currentDrag = null;
  currentResize = null;
}

document.addEventListener('mouseup', endDragOrResize);
document.addEventListener('touchend', endDragOrResize);

// Deactivate when clicking/tapping on canvas
function canvasClick(e) {
  if (e.target === document.getElementById('canvas')) {
    deactivateAllElements();
  }
}

document.getElementById('canvas').addEventListener('click', canvasClick);
document.getElementById('canvas').addEventListener('touchend', function(e) {
  if (e.target === document.getElementById('canvas')) {
    canvasClick(e);
  }
});

// Global variables to store selection range and the highlighted span
var savedRange = null;
var currentSelectedWord = null;

// Listen for mouseup and touchend events on contentEditable elements to save the current range.
document.addEventListener('mouseup', function(e) {
// Check if the active element is our contentEditable text
const activeEl = document.activeElement;
if (activeEl && activeEl.isContentEditable) {
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    savedRange = selection.getRangeAt(0);
  }
}
});

document.addEventListener('touchend', function(e) {
// Check if the active element is our contentEditable text
const activeEl = document.activeElement;
if (activeEl && activeEl.isContentEditable) {
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    savedRange = selection.getRangeAt(0);
  }
}
});

function highlightSelectedText() {
// Use the current selection, or fall back to the saved one.
let selection = window.getSelection();
let range;
if (selection && selection.rangeCount > 0) {
  range = selection.getRangeAt(0);
} else if (savedRange) {
  range = savedRange;
} else {
  return;
}

// Make sure the range is not collapsed (i.e. some text is selected)
if (range.collapsed) return;

// If the selection is within a single text node, split it manually.
if (range.startContainer === range.endContainer && range.startContainer.nodeType === Node.TEXT_NODE) {
  const textNode = range.startContainer;
  const text = textNode.nodeValue;
  const start = range.startOffset;
  const end = range.endOffset;
  
  const before = text.substring(0, start);
  const selectedText = text.substring(start, end);
  const after = text.substring(end);
  
  // Create the styled span for the selected text.
  const span = document.createElement('span');
  const textColor = document.getElementById('textColor').value;
  const textBgColor = document.getElementById('textBgColor').value;
  span.style.color = textColor;
  span.style.backgroundColor = textBgColor;
  span.appendChild(document.createTextNode(selectedText));
  
  // Set our global pointer to this span.
  currentSelectedWord = span;
  
  // Create a fragment to reassemble split parts.
  const frag = document.createDocumentFragment();
  if (before) {
    frag.appendChild(document.createTextNode(before));
  }
  frag.appendChild(span);
  if (after) {
    frag.appendChild(document.createTextNode(after));
  }
  
  // Replace the original text node with our new fragment.
  textNode.parentNode.replaceChild(frag, textNode);
  
  // Clear selection and savedRange.
  selection.removeAllRanges();
  savedRange = null;
} else {
  // Fallback for selections that span multiple nodes.
  const highlightSpan = document.createElement('span');
  const textColor = document.getElementById('textColor').value;
  const textBgColor = document.getElementById('textBgColor').value;
  highlightSpan.style.color = textColor;
  highlightSpan.style.backgroundColor = textBgColor;
  
  const extractedContents = range.extractContents();
  highlightSpan.appendChild(extractedContents);
  range.insertNode(highlightSpan);
  
  currentSelectedWord = highlightSpan;
  selection.removeAllRanges();
  savedRange = null;
}
}

document.getElementById('textEditPanel').addEventListener('click', highlightSelectedText);
document.getElementById('textEditPanel').addEventListener('touchend', function(e) {
highlightSelectedText();
if (e.cancelable) e.preventDefault();
});