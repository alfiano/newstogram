/* element.js - Refactored for Multiple Canvases */

import { AutoModel, AutoProcessor, RawImage } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1/+esm";

// --- Background Removal Model Variables ---
let model;
let processor;
let modelLoadingPromise = null;

// --- Background Removal Model Initialization ---
async function initializeBackgroundRemovalModel() {
    if (model && processor) return true; // Already loaded
    if (modelLoadingPromise) return modelLoadingPromise; // Loading in progress

    modelLoadingPromise = (async () => {
        try {
            console.log("Loading background removal model...");
            if (window.showLoader) window.showLoader("Model is loading, please wait...");

            model = await AutoModel.from_pretrained("briaai/RMBG-1.4", {
                config: { model_type: "custom" }, // Specify model type if not in config.json
                quantized: true, // Use quantized model for smaller size & faster inference
                progress_callback: (progress) => {
                    console.log("Background removal model loading progress:", progress);
                    // TODO: Update a more specific progress UI if available
                }
            });
            processor = await AutoProcessor.from_pretrained("briaai/RMBG-1.4", {
                config: { // Provide processor config if not in repo or to override
                    do_normalize: true,
                    do_pad: false,
                    do_rescale: true,
                    do_resize: true, // Resize input images to model's expected size
                    image_mean: [0.5, 0.5, 0.5],
                    feature_extractor_type: "ImageFeatureExtractor", // Important for some models
                    image_std: [1, 1, 1],
                    resample: 2, // PIL.Image.BILINEAR
                    rescale_factor: 1 / 255, // Standard rescale factor
                    size: { width: 1024, height: 1024 }, // Model's expected input size
                },
            });
            console.log("Background removal model loaded successfully.");
            if (window.hideLoader) window.hideLoader();
            return true;
        } catch (error) {
            console.error("Error loading background removal model:", error);
            if (window.hideLoader) window.hideLoader();
            modelLoadingPromise = null; // Reset promise on error to allow retry
            alert("Failed to load background removal model. Please check console and try again.");
            return false;
        }
    })();
    return modelLoadingPromise;
}

// --- Process Image for Background Removal ---
// This function is used internally by event handlers within this module, so no export needed unless called from outside.
async function processImageBackgroundRemoval(imgElementWrapper) {
    if (!imgElementWrapper) return;
    const imgContent = imgElementWrapper.querySelector('.content img');
    if (!imgContent) {
        console.error("Image content not found in wrapper for background removal.");
        alert("Could not find the image to process.");
        return;
    }

    const modelReady = await initializeBackgroundRemovalModel();
    if (!modelReady) {
        // Error already alerted in initialize function
        return;
    }

    if (window.showLoader) window.showLoader("Removing background...");

    try {
        // Ensure image is loaded before processing, especially if src was just set
        if (!imgContent.complete || imgContent.naturalWidth === 0) {
            await new Promise((resolve, reject) => {
                imgContent.onload = resolve;
                imgContent.onerror = reject;
            });
        }

        const image = await RawImage.fromURL(imgContent.src);

        const { pixel_values } = await processor(image);
        const { output } = await model({ input: pixel_values });

        const mask = await RawImage.fromTensor(output[0].mul(255).to("uint8")).resize(
            image.width,
            image.height
        );
        image.putAlpha(mask);

        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = image.width;
        tempCanvas.height = image.height;
        const ctx = tempCanvas.getContext("2d");
        ctx.drawImage(image.toCanvas(), 0, 0);

        imgContent.src = tempCanvas.toDataURL("image/png");
        console.log("Background removed successfully.");
        if (window.showLoader) window.showLoader("Background removed"); // Show success message
        setTimeout(() => {
            if (window.hideLoader) window.hideLoader();
        }, 1500); // Hide loader after 1.5 seconds

    } catch (error) {
        console.error("Error removing background:", error);
        alert("Failed to remove background. See console for details.");
        if (window.hideLoader) window.hideLoader(); // Ensure loader is hidden on error
    } finally {
        // hideLoader is now called specifically after success (with delay) or immediately on error
    }
}


// Deactivate all elements within a specific canvas or all canvases
export function deactivateAllElements(targetCanvas = null) {
  const selector = targetCanvas ? `#${targetCanvas.id} .element` : '.element';
  document.querySelectorAll(selector).forEach(el => {
    el.classList.remove('active');
    // Hide handles associated with this element
    if (el.resizeHandle) el.resizeHandle.style.display = 'none';
    if (el.deleteBtn) el.deleteBtn.style.display = 'none';
    if (el.rotateHandle) el.rotateHandle.style.display = 'none';
    if (el.moveBtn) el.moveBtn.style.display = 'none';
    if (el.removeBgBtn) el.removeBgBtn.style.display = 'none'; // Hide new button
  });
  // Hide the associated text edit panel if it exists for this canvas
  if (targetCanvas) {
    const textEditPanel = document.getElementById(`textEditPanel-${targetCanvas.id.split('-')[1]}`);
    if (textEditPanel) textEditPanel.style.display = 'none';
  }
}


// Update all handles for an element relative to its canvas container
export function updateAllHandles(wrapper) {
  if (!wrapper || !wrapper.parentElement) return; // Ensure wrapper and parent exist

  // Find the parent canvas container dynamically
  const canvasContainer = wrapper.closest('.canvas-container');
  if (!canvasContainer) {
      console.error("Could not find parent canvas container for element:", wrapper);
      return;
  }
  const containerRect = canvasContainer.getBoundingClientRect(); // Use the dynamically found container

  // Use getBoundingClientRect for accurate position/size after transforms (relative to viewport)
  const wrapperRect = wrapper.getBoundingClientRect(); // Relative to viewport

  // Get stored rotation or parse from transform style
  let rotationDegrees = parseFloat(wrapper.dataset.rotation || '0');
  const rotationRadians = rotationDegrees * (Math.PI / 180);
  const cosTheta = Math.cos(rotationRadians);
  const sinTheta = Math.sin(rotationRadians);

  // Get original (unrotated) dimensions, needed for calculating corner offsets
  // Important: Use offsetWidth/Height as getBoundingClientRect includes rotation effects
  const halfWidth = wrapper.offsetWidth / 2;
  const halfHeight = wrapper.offsetHeight / 2;

  // Calculate the element's center point relative to the viewport
  const centerX_viewport = wrapperRect.left + wrapperRect.width / 2;
  const centerY_viewport = wrapperRect.top + wrapperRect.height / 2;

  // --- Helper function to position a single handle ---
  const positionHandle = (handle, cornerOffsetX, cornerOffsetY) => {
      if (!handle) return;

      // Rotate the corner offset vector
      const rotatedOffsetX = cornerOffsetX * cosTheta - cornerOffsetY * sinTheta;
      const rotatedOffsetY = cornerOffsetX * sinTheta + cornerOffsetY * cosTheta;

      // Calculate the handle's desired center position in viewport coordinates
      const handleCenterX_viewport = centerX_viewport + rotatedOffsetX;
      const handleCenterY_viewport = centerY_viewport + rotatedOffsetY;

      // Calculate the handle's top-left position relative to the canvasContainer
      // Subtract container's offset and half the handle's size to center it
      const handleLeft = handleCenterX_viewport - containerRect.left - (handle.offsetWidth / 2);
      const handleTop = handleCenterY_viewport - containerRect.top - (handle.offsetHeight / 2);

      handle.style.left = `${handleLeft}px`;
      handle.style.top = `${handleTop}px`;

      // Ensure handle is visible if the element is active
      handle.style.display = wrapper.classList.contains('active') ? 'block' : 'none';

      // Special case for rotate handle to keep icon upright (optional)
      if (handle === wrapper.rotateHandle) {
         handle.style.transform = `rotate(${-rotationDegrees}deg)`;
      } else {
         handle.style.transform = ''; // Clear any previous transform
      }
  };

  // --- Position each handle at a specific corner/location ---
  // Values are offsets from the element's center *before* rotation

  // Delete Button (Top-Left Corner) - Adjusted slightly outwards
  positionHandle(wrapper.deleteBtn, -halfWidth - 10, -halfHeight - 10); // Increased offset

  // Resize Handle (Bottom-Right Corner) - Adjusted slightly outwards
  positionHandle(wrapper.resizeHandle, halfWidth + 10, halfHeight + 10); // Increased offset

  // Rotate Handle (Top-Center) - Adjusted slightly outwards vertically
  positionHandle(wrapper.rotateHandle, 0, -halfHeight - 10); // Increased offset

  // Move Button (Bottom-Center) - Adjusted slightly outwards vertically
  positionHandle(wrapper.moveBtn, 0, halfHeight + 10); // Increased offset

  // Remove Background Button (Top-Right Corner, for images) - Adjusted slightly outwards
  if (wrapper.removeBgBtn) {
    positionHandle(wrapper.removeBgBtn, halfWidth + 10, -halfHeight - 10); // Increased offset
  }
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


// Create an element on the specified canvas
export function createElement(content, eltype, targetCanvas) {
  if (!targetCanvas) {
    console.error("Target canvas not provided for createElement");
    return null;
  }
  const canvasContainer = targetCanvas.closest('.canvas-container');
  if (!canvasContainer) {
      console.error("Could not find canvas container for target canvas:", targetCanvas);
      return null;
  }
  const canvasIdNum = targetCanvas.id.split('-')[1]; // Get the number part of the ID
  const textEditPanel = document.getElementById(`textEditPanel-${canvasIdNum}`);
  if (!textEditPanel) {
      console.error("Could not find text edit panel for canvas:", targetCanvas);
      // Decide if you want to proceed without a text panel or return null
  }


  const wrapper = document.createElement('div');
  wrapper.style.position = 'absolute';
  // Check if content is from auto-inserted image (assuming class is still relevant)
  if (content instanceof HTMLElement && content.classList.contains('autoTextInserted')) {
    wrapper.className = `element autoTextInserted ${eltype || ''}`; // Keep element class for selection
    wrapper.style.width = '370px';
    wrapper.style.height = '85px';
    wrapper.style.left = '30px';
    wrapper.style.top = '330px';
    wrapper.style.color ='#fff';
    wrapper.style.fontSize = '20px';
    wrapper.style.bottom = '0px';
  } else {
    wrapper.className = `element ${eltype || ''}`; // Keep element class
    wrapper.style.width = '400px';
    wrapper.style.height = 'auto';
    console.log("dari sini");
  }
  const contentDiv = document.createElement('div');
  contentDiv.className = 'content';
  contentDiv.style.width = '100%';
  contentDiv.style.height = '100%';

  // --- Handle Content Type (Image, Existing Element, or Text) ---
  if (content instanceof HTMLImageElement && content.src.endsWith('assets/gradient_layer.png')) {
    wrapper.className ='element asset-image';
    wrapper.style.zIndex = '99990'; // Set z-index for the gradient layer
    content.style.width = '100%';
    content.style.height = '100%';
    content.style.display = 'block';
    contentDiv.appendChild(content);
  } else if (content instanceof HTMLImageElement) {
    wrapper.style.zIndex = '0'; // Set z-index for API images
    content.style.width = '100%';
    content.style.height = '100%';
    content.style.display = 'block';
    contentDiv.appendChild(content);

    // --- Create Remove Background Button for general images ---
    const removeBgBtn = document.createElement('button');
    removeBgBtn.innerHTML = ' BG '; // Placeholder, consider SVG icon
    removeBgBtn.className = 'control-button remove-bg-button';
    removeBgBtn.title = 'Remove Background';
    removeBgBtn.style.position = 'absolute';
    removeBgBtn.style.zIndex = '99999'; // Same as other controls
    removeBgBtn.style.touchAction = 'none';
    removeBgBtn.style.display = 'none'; // Initially hidden
    removeBgBtn.style.fontSize = '10px'; // Smaller text
    removeBgBtn.style.padding = '2px 4px'; // Adjust padding
    canvasContainer.appendChild(removeBgBtn);
    wrapper.removeBgBtn = removeBgBtn;

    // Add event listeners for remove background
    ['click', 'touchend'].forEach(eventType => {
        removeBgBtn.addEventListener(eventType, async function (e) {
            e.stopPropagation();
            e.preventDefault();
            if (!wrapper.classList.contains('active')) return;
            // Ensure model is loaded before processing, can be called multiple times safely
            const modelReady = await initializeBackgroundRemovalModel();
            if (modelReady) {
                await processImageBackgroundRemoval(wrapper);
            } else {
                // initializeBackgroundRemovalModel will alert if there's an issue
            }
        }, { capture: true });
    });

  } else if (content instanceof HTMLElement && content.classList.contains('editable-text')) {
    console.log("dari sini 2");
    wrapper.style.zIndex = '99999'; // Set z-index for text elements
    // If it's already an editable text element (e.g., from description)
    const textElement = content; // Reuse the element
    textElement.addEventListener('click', function(e) {
      e.stopPropagation();
      activateElement(wrapper); // Activate the wrapper
      setActiveTextElement(textElement, textEditPanel); // Use helper to set active text element and show panel
    });
    contentDiv.appendChild(textElement);
  } else {
    wrapper.style.zIndex = '99999'; // Set z-index for text elements
    // Assume it's plain text content, create a new editable paragraph
    const textElement = document.createElement('p');
    textElement.innerText = content;
    textElement.contentEditable = true;
    textElement.className = 'editable-text'; // Add class for identification
    textElement.style.width = '100%';
    textElement.style.height = '100%';
    textElement.style.margin = '0';
    textElement.style.padding = '8px';
    textElement.style.boxSizing = 'border-box';
    console.log("dari element");
    textElement.addEventListener('click', function(e) {
      e.stopPropagation();
      activateElement(wrapper); // Activate the wrapper
      setActiveTextElement(textElement, textEditPanel); // Use helper
    });
    contentDiv.appendChild(textElement);
  }

  wrapper.appendChild(contentDiv);
  targetCanvas.appendChild(wrapper); // Add to the SPECIFIED canvas

  // --- Create Handles (Append to the SPECIFIC canvasContainer) ---

  // Delete button (Top-Left)
  const deleteBtn = document.createElement('button');
  deleteBtn.innerHTML = '✖';
  deleteBtn.className = 'control-button delete-button';
  deleteBtn.style.position = 'absolute';
  deleteBtn.style.zIndex = '99999';
  deleteBtn.style.touchAction = 'none';
  deleteBtn.style.display = 'none';
  canvasContainer.appendChild(deleteBtn); // Append to the correct container
  wrapper.deleteBtn = deleteBtn;

  // Add event listeners for delete
  ['click', 'touchend'].forEach(eventType => {
      deleteBtn.addEventListener(eventType, function (e) {
          e.stopPropagation();
          e.preventDefault();
          // Clean up: remove handles from container, then remove wrapper
          if (wrapper.resizeHandle) wrapper.resizeHandle.remove();
          if (wrapper.deleteBtn) wrapper.deleteBtn.remove();
          if (wrapper.moveBtn) wrapper.moveBtn.remove();
          if (wrapper.rotateHandle) wrapper.rotateHandle.remove();
          if (wrapper.removeBgBtn) wrapper.removeBgBtn.remove(); // Remove new button
          wrapper.remove();
          // Check if the deleted element contained the globally active text element
          if (getActiveTextElement() && contentDiv.contains(getActiveTextElement())) {
             clearActiveTextElement(); // Clear reference and hide panel
          }
      }, { capture: true });
  });


  // Move button (Bottom-Left)
  const moveBtn = document.createElement('button');
  moveBtn.innerHTML = '✥';
  moveBtn.className = 'control-button move-button';
  moveBtn.style.position = 'absolute';
  moveBtn.style.zIndex = '99999';
  moveBtn.style.touchAction = 'none';
  moveBtn.style.cursor = 'move';
  moveBtn.title = 'Drag to move';
  moveBtn.style.display = 'none';
  canvasContainer.appendChild(moveBtn); // Append to the correct container
  wrapper.moveBtn = moveBtn;

  // Add drag functionality to the move button (references targetCanvas)
  function setupMoveDrag(e) {
      if (!wrapper.classList.contains('active')) return;
      e.stopPropagation();
      e.preventDefault();

      const pos = getEventPosition(e);
      const wrapperRect = wrapper.getBoundingClientRect();
      const dragOffsetX = pos.clientX - wrapperRect.left;
      const dragOffsetY = pos.clientY - wrapperRect.top;
      const canvasRect = targetCanvas.getBoundingClientRect(); // Use the specific canvas rect

      function moveElement(e) {
          e.preventDefault();
          const movePos = getEventPosition(e);
          const newLeft = movePos.clientX - dragOffsetX - canvasRect.left; // Relative to target canvas
          const newTop = movePos.clientY - dragOffsetY - canvasRect.top; // Relative to target canvas

          wrapper.style.left = `${newLeft}px`;
          wrapper.style.top = `${newTop}px`;
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


  // Resize handle (Bottom-Right)
  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'resize-handle';
  resizeHandle.innerHTML = '↔';
  resizeHandle.style.position = 'absolute';
  resizeHandle.style.zIndex = '99999';
  resizeHandle.style.touchAction = 'none';
  resizeHandle.style.cursor = 'nwse-resize';
  resizeHandle.style.display = 'none';
  canvasContainer.appendChild(resizeHandle); // Append to the correct container
  wrapper.resizeHandle = resizeHandle;

   // Enable resizing with both mouse and touch (no change needed in internal logic, uses wrapper)
  function setupResize(e) {
      if (!wrapper.classList.contains('active')) return;
      e.stopPropagation();
      e.preventDefault();

      const pos = getEventPosition(e);
      const startX = pos.clientX;
      const startY = pos.clientY;
      const startWidth = wrapper.offsetWidth;
      const startHeight = wrapper.offsetHeight;
      const startRotationRad = parseFloat(wrapper.dataset.rotation || '0') * (Math.PI / 180);
      const cosTheta = Math.cos(-startRotationRad);
      const sinTheta = Math.sin(-startRotationRad);

      function resizeElement(e) {
          e.preventDefault();
          const movePos = getEventPosition(e);
          const deltaX_viewport = movePos.clientX - startX;
          const deltaY_viewport = movePos.clientY - startY;

          const deltaX_element = deltaX_viewport * cosTheta - deltaY_viewport * sinTheta;
          const deltaY_element = deltaX_viewport * sinTheta + deltaY_viewport * cosTheta;

          let newWidth = startWidth + deltaX_element;
          let newHeight = startHeight + deltaY_element;

          if (newWidth < 30) newWidth = 30;
          if (newHeight < 30) newHeight = 30;

          wrapper.style.width = `${newWidth}px`;
          wrapper.style.height = `${newHeight}px`;

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


  // Rotate handle (Top-Right)
  const rotateHandle = document.createElement('div');
  rotateHandle.innerHTML = '↻';
  rotateHandle.className = 'control-button rotate-handle';
  rotateHandle.style.position = 'absolute';
  rotateHandle.style.zIndex = '99999';
  rotateHandle.style.touchAction = 'none';
  rotateHandle.style.cursor = 'alias';
  rotateHandle.style.display = 'none';
  canvasContainer.appendChild(rotateHandle); // Append to the correct container
  wrapper.rotateHandle = rotateHandle;


  // Rotation logic - support for both mouse and touch (no change needed in internal logic)
  function setupRotation(e) {
      if (!wrapper.classList.contains('active')) return;
      e.stopPropagation();
      e.preventDefault();

      const wrapperRect = wrapper.getBoundingClientRect();
      const centerX = wrapperRect.left + wrapperRect.width / 2;
      const centerY = wrapperRect.top + wrapperRect.height / 2;

      const startPos = getEventPosition(e);
      const startAngle = Math.atan2(startPos.clientY - centerY, startPos.clientX - centerX);
      const initialRotation = parseFloat(wrapper.dataset.rotation || '0') * (Math.PI / 180);

      function rotateElement(e) {
          e.preventDefault();
          const movePos = getEventPosition(e);
          const currentAngle = Math.atan2(movePos.clientY - centerY, movePos.clientX - centerX);
          const angleDelta = currentAngle - startAngle;

          let totalRotationRad = initialRotation + angleDelta;
          let totalRotationDeg = totalRotationRad * (180 / Math.PI);

          wrapper.style.transform = `rotate(${totalRotationDeg}deg)`;
          wrapper.dataset.rotation = totalRotationDeg;

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
  rotateHandle.addEventListener('mousedown', setupRotation);
  rotateHandle.addEventListener('touchstart', setupRotation, { passive: false });


  // --- Activation and Dragging Logic for the Wrapper ---

  // Helper function to activate element within its canvas
  function activateElement(element) {
      if (!element || element.classList.contains('active')) return;

      const elementCanvas = element.closest('.canvas'); // Find the canvas this element belongs to
      if (!elementCanvas) return;

      // Deactivate elements ONLY within the specific canvas the element belongs to
      deactivateAllElements(elementCanvas);

      element.classList.add('active');
      updateAllHandles(element); // updateAllHandles will show the handles
  }

  // Enable dragging the entire wrapper (references targetCanvas)
  function setupWrapperDrag(e) {
      const target = e.target;
      const isHandle = target === resizeHandle || target === deleteBtn || target === moveBtn || target === rotateHandle;
      const isEditable = target.isContentEditable || target.closest('[contenteditable="true"]');

      // If clicking on a handle or editable text of an *inactive* element, just activate it.
      if ((isHandle || isEditable) && !wrapper.classList.contains('active')) {
          activateElement(wrapper);
          return; // Don't start drag
      }
      // If clicking on a handle or editable text of an *active* element, do nothing here (let handle/text listeners manage it).
      if (isHandle || isEditable) {
          return;
      }

      // Otherwise, clicking on the wrapper itself: activate and start drag.
      activateElement(wrapper);
      e.stopPropagation();
      if (e.type === 'touchstart') e.preventDefault();

      const pos = getEventPosition(e);
      const wrapperRect = wrapper.getBoundingClientRect();
      const dragOffsetX = pos.clientX - wrapperRect.left;
      const dragOffsetY = pos.clientY - wrapperRect.top;
      const canvasRect = targetCanvas.getBoundingClientRect(); // Use the specific canvas rect

      function moveWrapper(e) {
          if (!wrapper.classList.contains('active')) {
             stopWrapperDragging();
             return;
          }
          e.preventDefault();
          const movePos = getEventPosition(e);
          const newLeft = movePos.clientX - dragOffsetX - canvasRect.left; // Relative to target canvas
          const newTop = movePos.clientY - dragOffsetY - canvasRect.top; // Relative to target canvas

          wrapper.style.left = `${newLeft}px`;
          wrapper.style.top = `${newTop}px`;
          updateAllHandles(wrapper);
      }

      function stopWrapperDragging() {
          document.removeEventListener('mousemove', moveWrapper);
          document.removeEventListener('touchmove', moveWrapper);
          document.removeEventListener('mouseup', stopWrapperDragging);
          document.removeEventListener('touchend', stopWrapperDragging);
      }

      document.addEventListener('mousemove', moveWrapper);
      document.addEventListener('touchmove', moveWrapper, { passive: false });
      document.addEventListener('mouseup', stopWrapperDragging);
      document.addEventListener('touchend', stopWrapperDragging);
  }

  wrapper.addEventListener('mousedown', setupWrapperDrag);
  wrapper.addEventListener('touchstart', setupWrapperDrag, { passive: false });

  // Initial positioning of handles after creation
  setTimeout(() => updateAllHandles(wrapper), 0);

  return wrapper;
}


// --- Global Text Element Management ---
// We need a single place to track the currently edited text element across all canvases.
let _activeTextElement = null;
let _activeTextEditPanel = null;

export function setActiveTextElement(textElement, textEditPanel) {
    _activeTextElement = textElement;
    _activeTextEditPanel = textEditPanel; // Store the associated panel

    if (!_activeTextElement || !_activeTextEditPanel) {
        console.error("Missing textElement or textEditPanel in setActiveTextElement");
        return;
    }

    // Show the correct panel
    _activeTextEditPanel.style.display = 'block';

    // Populate controls in the specific panel
    const fontFamilySelect = _activeTextEditPanel.querySelector('.fontFamily');
    // const fontFamilySelect = _activeTextEditPanel.querySelector('.fontFamily'); // Duplicate removed
    const textColorInput = _activeTextEditPanel.querySelector('.textColor');
    const textHighlightColorInput = _activeTextEditPanel.querySelector('.textBgColor'); // Renamed variable for clarity
    const elementBgColorInput = _activeTextEditPanel.querySelector('.elementBgColor'); // New control
    const bgOpacityInput = _activeTextEditPanel.querySelector('.bgOpacity');
    const fontSizeSelect = _activeTextEditPanel.querySelector('.fontSize');
    const wrapperElement = textElement.closest('.element'); // Get the parent wrapper

    // --- Populate Text Styles ---
    if (fontFamilySelect) fontFamilySelect.value = window.getComputedStyle(textElement).fontFamily.split(',')[0].replace(/['"]/g, '');
    if (textColorInput) textColorInput.value = rgb2hex(window.getComputedStyle(textElement).color);
    if (fontSizeSelect) fontSizeSelect.value = parseInt(window.getComputedStyle(textElement).fontSize);

    // --- Populate Text Highlight Color (No Opacity) ---
    // Get background of the text element itself (or potentially a span inside if styled)
    // For simplicity, let's assume we check the textElement directly for now.
    // If highlighting creates spans, this might need adjustment later.
    const textBg = window.getComputedStyle(textElement).backgroundColor;
    if (textHighlightColorInput) {
        // Convert to hex, ignoring alpha
        const rgbMatch = textBg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (rgbMatch) {
            textHighlightColorInput.value = rgb2hex(`rgb(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]})`);
        } else {
            textHighlightColorInput.value = '#ffffff'; // Default if transparent or invalid
        }
    }

    // --- Populate Element Wrapper Background Color & Opacity ---
    if (wrapperElement) {
        const wrapperBg = window.getComputedStyle(wrapperElement).backgroundColor;
        const wrapperRgbaMatch = wrapperBg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (wrapperRgbaMatch) {
            if (elementBgColorInput) elementBgColorInput.value = rgb2hex(`rgb(${wrapperRgbaMatch[1]}, ${wrapperRgbaMatch[2]}, ${wrapperRgbaMatch[3]})`);
            if (bgOpacityInput) bgOpacityInput.value = wrapperRgbaMatch[4] !== undefined ? parseFloat(wrapperRgbaMatch[4]) * 100 : 100;
        } else {
            // Handle non-rgba colors or transparent for wrapper
            if (elementBgColorInput) elementBgColorInput.value = '#ffffff'; // Default
            if (bgOpacityInput) bgOpacityInput.value = 100; // Default opacity
        }
    } else {
        // Defaults if wrapper not found (shouldn't happen)
        if (elementBgColorInput) elementBgColorInput.value = '#ffffff';
        if (bgOpacityInput) bgOpacityInput.value = 100;
    }

    console.log("Active text element set for panel:", _activeTextEditPanel.id);
}

export function getActiveTextElement() {
    return _activeTextElement;
}

function getActiveTextEditPanel() { // Not explicitly used by main.js, so no export for now
    return _activeTextEditPanel;
}

export function clearActiveTextElement() {
    if (_activeTextEditPanel) {
        _activeTextEditPanel.style.display = 'none';
    }
    _activeTextElement = null;
    _activeTextEditPanel = null;
    console.log("Active text element cleared.");
}

// Helper function to convert rgb to hex (used internally)
function rgb2hex(rgb) {
  if (!rgb || rgb.startsWith('#')) return rgb; // Already hex or invalid
  const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (!match) return '#ffffff'; // Default or handle error
  function hex(x) {
    return ("0" + parseInt(x).toString(16)).slice(-2);
  }
  return "#" + hex(match[1]) + hex(match[2]) + hex(match[3]);
}


// Function to add the deactivation listener to a specific canvas
export function addCanvasDeactivationListener(canvasElement) {
    ['click', 'touchend'].forEach(eventType => {
        canvasElement.addEventListener(eventType, function(e) {
            // Deactivate if clicking directly on the canvas background
            if (e.target === canvasElement) {
                deactivateAllElements(canvasElement); // Deactivate elements in this canvas
                clearActiveTextElement(); // Also hide text panel if clicking background
            }
        });
    });
}

// --- Initial Setup ---
// Add listener to the first canvas on load
// document.addEventListener('DOMContentLoaded', () => {
//     const initialCanvas = document.getElementById('canvas-1');
//     if (initialCanvas) {
//         addCanvasDeactivationListener(initialCanvas);
//     }
// });
// Note: Initial setup might be better handled in main.js after the first canvas is confirmed ready.

