/* element.js with touch support - Updated with Move Button */

// Deactivate all elements
function deactivateAllElements() {
  document.querySelectorAll('.element').forEach(el => {
    el.classList.remove('active');
    if (el.resizeHandle) el.resizeHandle.style.display = 'none';
    if (el.deleteBtn) el.deleteBtn.style.display = 'none';
    if (el.rotateHandle) el.rotateHandle.style.display = 'none';
    if (el.moveBtn) el.moveBtn.style.display = 'none';
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

// Update position for move button
function updateMoveButton(wrapper, moveBtn) {
  const canvasRect = document.getElementById('canvas').getBoundingClientRect();
  const offsetX = wrapper.offsetLeft + (wrapper.offsetWidth / 2) - 10; // Center horizontally by subtracting half button width
  const offsetY = wrapper.offsetTop + wrapper.offsetHeight + 5; // Position below the element
  moveBtn.style.left = (canvasRect.left + offsetX) + 'px';
  moveBtn.style.top = (canvasRect.top + offsetY) + 'px';
}


// Update position for rotate handle
function updateRotateHandle(wrapper, rotateHandle) {
  const canvasRect = document.getElementById('canvas').getBoundingClientRect();
  const offsetX = wrapper.offsetLeft + (wrapper.offsetWidth / 2) - 30;
  const offsetY = wrapper.offsetTop + wrapper.offsetHeight - 5;
  rotateHandle.style.left = (canvasRect.left + offsetX) + 'px';
  rotateHandle.style.top = (canvasRect.top + offsetY) + 'px';
}

// Update all handles for an element
function updateAllHandles(wrapper) {
  if (wrapper.resizeHandle) updateHandle(wrapper, wrapper.resizeHandle);
  if (wrapper.deleteBtn) updateDeleteButton(wrapper, wrapper.deleteBtn);
  if (wrapper.moveBtn) updateMoveButton(wrapper, wrapper.moveBtn);
  if (wrapper.rotateHandle) updateRotateHandle(wrapper, wrapper.rotateHandle);
}

// Get mouse or touch position
function getEventPosition(e) {
  // Handle both mouse and touch events
  if (e.touches && e.touches.length > 0) {
    return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
  } else if (e.changedTouches && e.changedTouches.length > 0) {
    return { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY };
  } else {
    return { clientX: e.clientX, clientY: e.clientY };
  }
}

// Create an element on the canvas
function createElement(content) {
  const canvasContainer = document.getElementById('canvasContainer');
  const canvas = document.getElementById('canvas');
  const wrapper = document.createElement('div');
  wrapper.style.position = 'absolute';
  // Check if content is from auto-inserted image
  if (content instanceof HTMLElement && content.classList.contains('autoTextInserted')) {
    wrapper.className = 'element autoTextInserted';
    wrapper.style.width = '400px';
    wrapper.style.height = '150px';
    wrapper.style.bottom = '0px';
    // wrapper.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
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
    content.addEventListener('click', function(e) {
      e.stopPropagation();
      // Activate the element but don't start dragging
      activateElement(wrapper);
      
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
    });
    contentDiv.appendChild(content);
  } else {
    // Create editable paragraph for text content
    const textElement = document.createElement('p');
    textElement.innerText = content;
    textElement.contentEditable = true;
    textElement.className = 'editable-text';
    textElement.style.width = '100%';
    textElement.style.height = '100%';
    textElement.style.margin = '0';
    textElement.style.padding = '8px';
    textElement.style.boxSizing = 'border-box';
    
    // Setup text editing functionality
    textElement.addEventListener('click', function(e) {
      e.stopPropagation();
      // Activate the element but don't start dragging
      activateElement(wrapper);
      
      currentTextElement = textElement;
      const editPanel = document.getElementById('textEditPanel');
      editPanel.style.display = 'block';
      document.getElementById('fontFamily').value =
        window.getComputedStyle(textElement).fontFamily.split(',')[0].replace(/['"]/g, '');
      document.getElementById('textColor').value =
        rgb2hex(window.getComputedStyle(textElement).color);
      document.getElementById('textBgColor').value =
        rgb2hex(window.getComputedStyle(textElement).backgroundColor);
      document.getElementById('fontSize').value =
        parseInt(window.getComputedStyle(textElement).fontSize);
    });
    
    contentDiv.appendChild(textElement);
  }

  wrapper.appendChild(contentDiv);

  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.innerText = 'X';
  deleteBtn.style.position = 'absolute';
  deleteBtn.style.width = '20px';
  deleteBtn.style.height = '20px';
  deleteBtn.style.backgroundColor = 'red';
  deleteBtn.style.color = 'white';
  deleteBtn.style.border = 'none';
  deleteBtn.style.cursor = 'pointer';
  deleteBtn.style.zIndex = '1000'; // Ensure it's above other elements
  deleteBtn.style.touchAction = 'none'; // Prevent default touch actions
  
  // Add event listeners for both mouse and touch
  ['click', 'touchend'].forEach(eventType => {
    deleteBtn.addEventListener(eventType, function(e) {
      e.stopPropagation();
      e.preventDefault();
      if (wrapper.resizeHandle) wrapper.resizeHandle.remove();
      if (wrapper.deleteBtn) wrapper.deleteBtn.remove();
      if (wrapper.moveBtn) wrapper.moveBtn.remove();
      if (wrapper.rotateHandle) wrapper.rotateHandle.remove();
      wrapper.remove();
    });
  });
  
  canvasContainer.appendChild(deleteBtn);
  updateDeleteButton(wrapper, deleteBtn);
  wrapper.deleteBtn = deleteBtn;
  
  // Move button - NEW
  const moveBtn = document.createElement('button');
  moveBtn.innerText = '↔';
  moveBtn.style.position = 'absolute';
  moveBtn.style.width = '20px';
  moveBtn.style.height = '20px';
  moveBtn.style.backgroundColor = 'green';
  moveBtn.style.color = 'white';
  moveBtn.style.border = 'none';
  moveBtn.style.cursor = 'move';
  moveBtn.style.zIndex = '1000';
  moveBtn.style.touchAction = 'none';
  moveBtn.title = 'Click and drag to move';
  moveBtn.style.display = 'block'; 
  canvasContainer.appendChild(moveBtn);
  wrapper.moveBtn = moveBtn;
 
  // Add drag functionality to the move button
  function setupMoveDrag(e) {
    e.stopPropagation();
    e.preventDefault();
    
    const pos = getEventPosition(e);
    const dragOffsetX = pos.clientX - wrapper.offsetLeft;
    const dragOffsetY = pos.clientY - wrapper.offsetTop;
    
    function moveElement(e) {
      e.preventDefault();
      const movePos = getEventPosition(e);
      wrapper.style.left = (movePos.clientX - dragOffsetX) + 'px';
      wrapper.style.top = (movePos.clientY - dragOffsetY) + 'px';
      updateAllHandles(wrapper);
    }
    
    function stopDragging() {
      document.removeEventListener('mousemove', moveElement);
      document.removeEventListener('touchmove', moveElement);
      document.removeEventListener('mouseup', stopDragging);
      document.removeEventListener('touchend', stopDragging);
    }
    
    document.addEventListener('mousemove', moveElement);
    document.addEventListener('touchmove', moveElement, { passive: false });
    document.addEventListener('mouseup', stopDragging);
    document.addEventListener('touchend', stopDragging);
  }
  
  moveBtn.addEventListener('mousedown', setupMoveDrag);
  moveBtn.addEventListener('touchstart', setupMoveDrag, { passive: false });


  // Append element to canvas
  canvas.appendChild(wrapper);
  updateMoveButton(wrapper, moveBtn);
  
  // Resize handle
  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'resize-handle';
  resizeHandle.style.zIndex = '1000';
  resizeHandle.style.touchAction = 'none';
  resizeHandle.style.display = 'block';
  canvasContainer.appendChild(resizeHandle);
  updateHandle(wrapper, resizeHandle);
  wrapper.resizeHandle = resizeHandle;

  // Rotate handle
  const rotateHandle = document.createElement('div');
  rotateHandle.className = 'rotate-handle';
  rotateHandle.innerHTML = '↻';
  rotateHandle.style.position = 'absolute';
  rotateHandle.style.width = '20px';
  rotateHandle.style.height = '20px';
  rotateHandle.style.backgroundColor = 'blue';
  rotateHandle.style.color = 'white';
  rotateHandle.style.cursor = 'pointer';
  rotateHandle.style.display = 'flex';
  rotateHandle.style.alignItems = 'center';
  rotateHandle.style.justifyContent = 'center';
  rotateHandle.style.borderRadius = '50%';
  rotateHandle.style.zIndex = '1000';
  rotateHandle.style.touchAction = 'none';
  canvasContainer.appendChild(rotateHandle);
  updateRotateHandle(wrapper, rotateHandle);
  wrapper.rotateHandle = rotateHandle;

  // Rotation logic - support for both mouse and touch
  let currentRotation = 0;
  
  // Helper function for rotation
  function setupRotation(e) {
    e.stopPropagation();
    e.preventDefault();
    
    const pos = getEventPosition(e);
    const rect = wrapper.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    function rotateElement(e) {
      const movePos = getEventPosition(e);
      const angle = Math.atan2(movePos.clientY - centerY, movePos.clientX - centerX);
      const degrees = angle * (180 / Math.PI);
      wrapper.style.transform = `rotate(${degrees}deg)`;
      if (content instanceof HTMLElement && content.classList.contains('autoTextInserted')) {
        wrapper.style.zIndex = 10;
      }
      currentRotation = degrees;
      updateAllHandles(wrapper);
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
  }
  
  // Add rotation events for both mouse and touch
  rotateHandle.addEventListener('mousedown', setupRotation);
  rotateHandle.addEventListener('touchstart', setupRotation, { passive: false });
  
  // Helper function to activate element
  function activateElement(element) {
    deactivateAllElements();
    element.classList.add('active');
    if (element.resizeHandle) element.resizeHandle.style.display = 'block';
    if (element.deleteBtn) element.deleteBtn.style.display = 'block';
    if (element.moveBtn) element.moveBtn.style.display = 'block'; 
    if (element.rotateHandle) element.rotateHandle.style.display = 'block';
  }

  // Enable dragging with both mouse and touch, but only for non-text elements
  // or the entire wrapper when not clicking on contentEditable elements
  function setupDrag(e) {
    // Skip if target is a handle or we're editing text
    if (e.target === resizeHandle || e.target === deleteBtn || e.target === moveBtn || e.target === rotateHandle) return;
    if (e.target.isContentEditable) {
      // Just activate the element but don't start dragging
      activateElement(wrapper);
      return;
    }
    
    e.stopPropagation();
    if (e.type === 'touchstart') e.preventDefault(); // Prevent scrolling on touch
    
    activateElement(wrapper);
    
    const pos = getEventPosition(e);
    const dragOffsetX = pos.clientX - wrapper.offsetLeft;
    const dragOffsetY = pos.clientY - wrapper.offsetTop;
    
    function moveElement(e) {
      e.preventDefault();
      const movePos = getEventPosition(e);
      wrapper.style.left = (movePos.clientX - dragOffsetX) + 'px';
      wrapper.style.top = (movePos.clientY - dragOffsetY) + 'px';
      updateAllHandles(wrapper);
    }
    
    function stopDragging() {
      document.removeEventListener('mousemove', moveElement);
      document.removeEventListener('touchmove', moveElement);
      document.removeEventListener('mouseup', stopDragging);
      document.removeEventListener('touchend', stopDragging);
    }
    
    document.addEventListener('mousemove', moveElement);
    document.addEventListener('touchmove', moveElement, { passive: false });
    document.addEventListener('mouseup', stopDragging);
    document.addEventListener('touchend', stopDragging);
  }
  
  wrapper.addEventListener('mousedown', setupDrag);
  wrapper.addEventListener('touchstart', setupDrag, { passive: false });

  // Enable resizing with both mouse and touch
  function setupResize(e) {
    e.stopPropagation();
    e.preventDefault();
    
    const pos = getEventPosition(e);
    const origWidth = wrapper.offsetWidth;
    const origHeight = wrapper.offsetHeight;
    const origMouseX = pos.clientX;
    const origMouseY = pos.clientY;
    
    function resizeElement(e) {
      e.preventDefault();
      const movePos = getEventPosition(e);
      const newWidth = origWidth + (movePos.clientX - origMouseX);
      const newHeight = origHeight + (movePos.clientY - origMouseY);
      
      if (newWidth > 50) wrapper.style.width = newWidth + 'px';
      if (newHeight > 50) wrapper.style.height = newHeight + 'px';
      
      updateAllHandles(wrapper);
    }
    
    function stopResizing() {
      document.removeEventListener('mousemove', resizeElement);
      document.removeEventListener('touchmove', resizeElement);
      document.removeEventListener('mouseup', stopResizing);
      document.removeEventListener('touchend', stopResizing);
    }
    
    document.addEventListener('mousemove', resizeElement);
    document.addEventListener('touchmove', resizeElement, { passive: false });
    document.addEventListener('mouseup', stopResizing);
    document.addEventListener('touchend', stopResizing);
  }
  
  resizeHandle.addEventListener('mousedown', setupResize);
  resizeHandle.addEventListener('touchstart', setupResize, { passive: false });

  return wrapper;
}

// Deactivate when clicking/tapping on canvas
['click', 'touchend'].forEach(eventType => {
  document.getElementById('canvas').addEventListener(eventType, function(e) {
    if (e.target === document.getElementById('canvas')) {
      deactivateAllElements();
    }
  });
});

// Global variables to store selection range and the highlighted span
var savedRange = null;
var currentSelectedWord = null;

// Listen for mouseup/touchend events on contentEditable elements to save the current range
['mouseup', 'touchend'].forEach(eventType => {
  document.addEventListener(eventType, function(e) {
    // Check if the active element is our contentEditable text
    const activeEl = document.activeElement;
    if (activeEl && activeEl.isContentEditable) {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        savedRange = selection.getRangeAt(0);
      }
    }
  });
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

// Add both click and touch support for text editing
['click', 'touchend'].forEach(eventType => {
  document.getElementById('textEditPanel').addEventListener(eventType, highlightSelectedText);
});

// Helper function to convert RGB to HEX
function rgb2hex(rgb) {
  if (!rgb || rgb === 'transparent') return '#ffffff';
  
  if (rgb.startsWith('#')) return rgb;
  
  // Extract RGB values using regex
  const rgbMatch = rgb.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
  if (rgbMatch) {
    return "#" + 
      ("0" + parseInt(rgbMatch[1], 10).toString(16)).slice(-2) +
      ("0" + parseInt(rgbMatch[2], 10).toString(16)).slice(-2) +
      ("0" + parseInt(rgbMatch[3], 10).toString(16)).slice(-2);
  }
  
  return '#ffffff'; // default fallback
}