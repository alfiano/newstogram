/* main.js - Multi-Canvas Management */

// --- Global State ---
let activeCanvasElement = null; // Reference to the currently active canvas div (.canvas)
let canvasCounter = 1; // To generate unique IDs

// --- Canvas Management ---

// Function to get the currently active canvas element
function getActiveCanvas() {
    return activeCanvasElement;
}

// Function to set a canvas as active
function setActiveCanvas(canvasInstanceDiv) {
    if (!canvasInstanceDiv) return;

    const newActiveCanvas = canvasInstanceDiv.querySelector('.canvas');
    if (newActiveCanvas === activeCanvasElement) return; // Already active

    // Remove active class from previously active canvas instance
    if (activeCanvasElement) {
        const previousInstance = activeCanvasElement.closest('.canvas-instance');
        if (previousInstance) {
            previousInstance.classList.remove('active-canvas-instance');
        }
        // Deactivate elements in the old canvas
        deactivateAllElements(activeCanvasElement);
        clearActiveTextElement(); // Clear text editing state
    }

    // Set new active canvas and add class to its instance container
    activeCanvasElement = newActiveCanvas;
    canvasInstanceDiv.classList.add('active-canvas-instance');

    console.log(`Canvas ${activeCanvasElement.id} activated.`);
    // Optional: Maybe activate the first element in the new canvas? Or leave it blank.

    // Update active thumbnail
    const canvasId = newActiveCanvas.id.split('-')[1];
    const thumbnailContainer = document.querySelector('.thumbnail-container');
    if (thumbnailContainer) {
        const currentActiveThumbnail = thumbnailContainer.querySelector('.thumbnail.active-thumbnail');
        if (currentActiveThumbnail) {
            currentActiveThumbnail.classList.remove('active-thumbnail');
        }
        const newActiveThumbnail = thumbnailContainer.querySelector(`.thumbnail[data-canvas-id="${canvasId}"]`);
        if (newActiveThumbnail) {
            newActiveThumbnail.classList.add('active-thumbnail');
            // Scroll thumbnail into view if container is scrollable
            newActiveThumbnail.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }
}

// Function to attach event listeners to text edit controls for a specific canvas panel
function setupTextEditControls(textEditPanel) {
    const fontFamilySelect = textEditPanel.querySelector('.fontFamily');
    const textColorInput = textEditPanel.querySelector('.textColor');
    const textHighlightColorInput = textEditPanel.querySelector('.textBgColor'); // Text Highlight
    const elementBgColorInput = textEditPanel.querySelector('.elementBgColor'); // Element BG Color
    const bgOpacityInput = textEditPanel.querySelector('.bgOpacity'); // Element BG Opacity
    const fontSizeSelect = textEditPanel.querySelector('.fontSize');
    const boldButton = textEditPanel.querySelector('.boldText');

    // --- Standard Text Styles ---
    if (fontFamilySelect) {
        fontFamilySelect.addEventListener('change', (e) => applyFontFamily(e.target.value));
    }
    if (textColorInput) {
        textColorInput.addEventListener('input', (e) => applyTextColor(e.target.value));
    }
    if (fontSizeSelect) {
        fontSizeSelect.addEventListener('change', (e) => applyFontSize(e.target.value));
    }
    if (boldButton) {
        boldButton.addEventListener('click', () => applyFontWeight());
    }

    // --- Text Highlight Background (Solid Color) ---
    if (textHighlightColorInput) {
        textHighlightColorInput.addEventListener('input', (e) => applyHighlightBgColor(e.target.value));
    }

    // --- Element Wrapper Background Color & Opacity ---
    const applyElementBg = () => {
        const color = elementBgColorInput ? elementBgColorInput.value : '#ffffff';
        const opacity = bgOpacityInput ? parseInt(bgOpacityInput.value) : 100;
        applyElementBgColorWithOpacity(color, opacity);
    };

    if (elementBgColorInput) {
        elementBgColorInput.addEventListener('input', applyElementBg);
    }
    if (bgOpacityInput) {
        bgOpacityInput.addEventListener('input', applyElementBg);
    }
}


// Function to create and add a new canvas instance
function addCanvas() {
    canvasCounter++;
    // Get the correct container for appending new canvases
    const canvasesScrollArea = document.querySelector('.canvases-scroll-area');
    if (!canvasesScrollArea) {
        console.error("'.canvases-scroll-area' not found!");
        return; // Exit if the container doesn't exist
    }

    // 1. Create the main instance wrapper
    const canvasInstanceDiv = document.createElement('div');
    canvasInstanceDiv.className = 'canvas-instance';
    canvasInstanceDiv.id = `canvasInstance-${canvasCounter}`; // Optional ID for the instance

    // 2. Create the canvas container
    const canvasContainer = document.createElement('div');
    canvasContainer.className = 'canvas-container';
    canvasContainer.id = `canvasContainer-${canvasCounter}`;

    // 3. Create the canvas div
    const canvasDiv = document.createElement('div');
    canvasDiv.className = 'canvas';
    canvasDiv.id = `canvas-${canvasCounter}`;
    addCanvasDeactivationListener(canvasDiv); // Add listener from element.js

    // 4. Create the text edit panel
    const textEditPanel = document.createElement('div');
    textEditPanel.className = 'edit-panel';
    textEditPanel.id = `textEditPanel-${canvasCounter}`;
    textEditPanel.style.display = 'none';
    // Clone controls from the first panel (or create them programmatically)
    const firstPanel = document.getElementById('textEditPanel-1');
    if (firstPanel) {
        textEditPanel.innerHTML = firstPanel.innerHTML; // Simple clone for now
        // IMPORTANT: Re-attach listeners to the new controls
        setupTextEditControls(textEditPanel);
    } else {
        console.error("Could not find first text edit panel to clone controls.");
        // Add fallback to create controls manually if needed
    }

    // 5. Assemble the structure
    canvasContainer.appendChild(canvasDiv);
    canvasContainer.appendChild(textEditPanel);
    canvasInstanceDiv.appendChild(canvasContainer);

    // 6. Add to the canvases scroll area
    canvasesScrollArea.appendChild(canvasInstanceDiv);

    // 7. Add activation listener to the instance wrapper
    canvasInstanceDiv.addEventListener('click', (e) => {
        // Activate only if clicking within the instance but not on an interactive element inside
        if (!e.target.closest('.element, .control-button, .resize-handle, [contenteditable="true"], .edit-panel *')) {
             setActiveCanvas(canvasInstanceDiv);
        }
    });

    // 8. Create and add the download button for this instance
    const instanceActionsDiv = document.createElement('div');
    instanceActionsDiv.className = 'instance-actions';
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'downloadBtn';
    downloadBtn.textContent = `Download Canvas ${canvasCounter}`;
    downloadBtn.addEventListener('click', () => exportAsPNG(canvasDiv)); // Pass the specific canvasDiv
    instanceActionsDiv.appendChild(downloadBtn);
    canvasInstanceDiv.appendChild(instanceActionsDiv); // Add actions below the container

    // 9. Set the new canvas as active
    setActiveCanvas(canvasInstanceDiv);

    // 10. Scroll the scroll area container to show the new canvas
    canvasesScrollArea.scrollLeft = canvasesScrollArea.scrollWidth;

    // 11. Create and add the corresponding thumbnail
    const thumbnailContainer = document.querySelector('.thumbnail-container');
    const addSlideBtn = document.getElementById('addCanvasBtn');
    if (thumbnailContainer && addSlideBtn) {
        const thumbnailDiv = document.createElement('div');
        thumbnailDiv.className = 'thumbnail';
        thumbnailDiv.dataset.canvasId = canvasCounter;
        thumbnailDiv.textContent = `Slide ${canvasCounter}`;
        thumbnailDiv.addEventListener('click', () => {
            // Find the target canvas instance using the data attribute
            const targetInstance = document.getElementById(`canvasInstance-${canvasCounter}`);
            if (targetInstance) {
                setActiveCanvas(targetInstance);
            }
        });
        // Insert the new thumbnail before the "Add Slide" button
        thumbnailContainer.insertBefore(thumbnailDiv, addSlideBtn);
    } else {
        console.error("Thumbnail container or Add Slide button not found.");
    }

    console.log(`Canvas ${canvasCounter} added.`);
}

// --- Event Listeners ---

// Toggle Controls Panel & Initial Setup
document.addEventListener('DOMContentLoaded', function() {
    // Add Canvas Button Listener
    const addBtn = document.getElementById('addCanvasBtn');
    if (addBtn) {
        addBtn.addEventListener('click', addCanvas);
    } else {
        console.error("Add Canvas button not found!");
    }

    const toggleBtn = document.querySelector('.toggle-controls');
    const controls = document.querySelector('.controls');
    if (toggleBtn && controls) {
        toggleBtn.addEventListener('click', function() {
            controls.classList.toggle('open');
        });
    }

    // Initialize the first canvas
    const firstCanvasInstance = document.querySelector('.canvas-instance');
    const firstCanvas = document.getElementById('canvas-1');
    const firstTextEditPanel = document.getElementById('textEditPanel-1');
    const firstDownloadBtn = firstCanvasInstance?.querySelector('.downloadBtn');
    const firstThumbnail = document.querySelector('.thumbnail[data-canvas-id="1"]'); // Find the first thumbnail

    if (firstCanvasInstance && firstCanvas && firstTextEditPanel && firstDownloadBtn && firstThumbnail) {
        // Set initial active canvas (this will also activate the first thumbnail via setActiveCanvas)
        setActiveCanvas(firstCanvasInstance);

        // Add deactivation listener
        addCanvasDeactivationListener(firstCanvas);

        // Setup controls for the first panel
        setupTextEditControls(firstTextEditPanel);

        // Add activation listener to the first instance wrapper
        firstCanvasInstance.addEventListener('click', (e) => {
             // Activate only if clicking within the instance but not on an interactive element inside or the download button
            if (!e.target.closest('.element, .control-button, .resize-handle, [contenteditable="true"], .edit-panel *, .downloadBtn')) {
                setActiveCanvas(firstCanvasInstance);
            }
        });

        // Add listener for the first download button
        firstDownloadBtn.addEventListener('click', () => exportAsPNG(firstCanvas));

        // Add click listener to the first thumbnail
        firstThumbnail.addEventListener('click', () => setActiveCanvas(firstCanvasInstance));

    } else {
        console.error("Initial canvas elements (instance, canvas, panel, download button, or thumbnail) not found!");
    }

    // Global drag/resize listeners (from original main.js) - These should work fine globally
    // They rely on functions in element.js which are now canvas-aware or use closest()
    // No changes needed here assuming element.js handles the logic correctly.
});


// Window Resize Listener (Update handles for ALL elements in ALL canvases)
window.addEventListener('resize', function() {
    document.querySelectorAll('.element').forEach(wrapper => {
        // Use the refactored updateAllHandles which finds the correct container
        updateAllHandles(wrapper);
    });
});


// --- Export Functionality ---
// Export specific canvas content as PNG using html2canvas
function exportAsPNG(targetCanvasElement) { // Accept target canvas as argument
    if (!targetCanvasElement) {
        console.error("No target canvas provided for export.");
        alert("Cannot export: Target canvas not found.");
        return;
    }
    const canvasIdNum = targetCanvasElement.id.split('-')[1]; // Get number for filename

    // Temporarily hide controls/handles within the target canvas for cleaner export
    const elementsToHide = targetCanvasElement.querySelectorAll('.control-button, .resize-handle, .move-button'); // Include move-button
    // Also find and temporarily deactivate the active element *within this specific canvas*
    const activeElementInCanvas = targetCanvasElement.querySelector('.element.active');
    if (activeElementInCanvas) {
        activeElementInCanvas.classList.remove('active'); // Temporarily remove class to hide outline
        // Hide its handles explicitly as they might be positioned outside the element bounds slightly
         if (activeElementInCanvas.deleteBtn) activeElementInCanvas.deleteBtn.style.visibility = 'hidden';
         if (activeElementInCanvas.resizeHandle) activeElementInCanvas.resizeHandle.style.visibility = 'hidden';
         if (activeElementInCanvas.rotateHandle) activeElementInCanvas.rotateHandle.style.visibility = 'hidden';
         if (activeElementInCanvas.moveBtn) activeElementInCanvas.moveBtn.style.visibility = 'hidden';
    } else {
        // If no element is active, still hide any potentially visible handles (shouldn't happen often)
        elementsToHide.forEach(el => el.style.visibility = 'hidden');
    }


    html2canvas(targetCanvasElement, { // Use the passed canvas element
        logging: false, // Disable logging unless debugging
        useCORS: true,
        scale: 2, // Upscale output 2x (from 500x625 to 1000x1250)
        backgroundColor: window.getComputedStyle(targetCanvasElement).backgroundColor || '#ffffff' // Use actual background or default white
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `newstogram-canvas-${canvasIdNum}.png`; // Use canvas number in filename
        link.href = canvas.toDataURL('image/png');
        link.click();

        // Restore visibility of handles and active element state
        if (activeElementInCanvas) {
             if (activeElementInCanvas.deleteBtn) activeElementInCanvas.deleteBtn.style.visibility = 'visible';
             if (activeElementInCanvas.resizeHandle) activeElementInCanvas.resizeHandle.style.visibility = 'visible';
             if (activeElementInCanvas.rotateHandle) activeElementInCanvas.rotateHandle.style.visibility = 'visible';
             if (activeElementInCanvas.moveBtn) activeElementInCanvas.moveBtn.style.visibility = 'visible';
             activeElementInCanvas.classList.add('active'); // Restore active class
        } else {
            elementsToHide.forEach(el => el.style.visibility = 'visible');
        }

    }).catch(err => {
        console.error("Error exporting canvas:", err);
        alert("Error exporting canvas. Check console for details.");
        // Ensure controls/state are restored even on error
        if (activeElementInCanvas) {
             if (activeElementInCanvas.deleteBtn) activeElementInCanvas.deleteBtn.style.visibility = 'visible';
             if (activeElementInCanvas.resizeHandle) activeElementInCanvas.resizeHandle.style.visibility = 'visible';
             if (activeElementInCanvas.rotateHandle) activeElementInCanvas.rotateHandle.style.visibility = 'visible';
             if (activeElementInCanvas.moveBtn) activeElementInCanvas.moveBtn.style.visibility = 'visible';
             activeElementInCanvas.classList.add('active');
        } else {
             elementsToHide.forEach(el => el.style.visibility = 'visible');
        }
    });
}

// Note: Global drag listeners (currentDrag, currentResize) from original main.js are removed
// as that logic is now encapsulated within element.js event listeners (setupMoveDrag, setupResize, etc.)
