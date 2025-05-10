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
        // Add listener to update label border color on change
        textColorInput.addEventListener('change', (e) => {
            const colorInput = e.target;
            const colorGroup = colorInput.closest('.color-picker-group');
            if (colorGroup) {
                const label = colorGroup.querySelector('.color-picker-label');
            }
        });
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
        // Add listener to update label border color on change
        textHighlightColorInput.addEventListener('change', (e) => {
            const colorInput = e.target;
            const colorGroup = colorInput.closest('.color-picker-group');
            if (colorGroup) {
                const label = colorGroup.querySelector('.color-picker-label');
            }
        });
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
    canvasInstanceDiv.style.touchAction = 'none'; // Prevent default touch actions

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
    downloadBtn.textContent = `Download`;
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
  // Modal Pop-up Logic
  const openModalBtn = document.getElementById('openModalBtn');
  const modalOverlay = document.getElementById('modalOverlay');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const modalFetchDataBtn = document.getElementById('modalFetchDataBtn');
  const modalApiUrl = document.getElementById('modalApiUrl');
  const modalLanguageSelect = document.getElementById('modalLanguageSelect');
  const modalLoader = document.getElementById('modalLoader');

  if (openModalBtn && modalOverlay) {
    openModalBtn.addEventListener('click', () => {
      modalOverlay.style.display = 'flex';
      modalApiUrl.value = '';
      modalLoader.style.display = 'none';
      modalApiUrl.focus();
    });
  }
  if (closeModalBtn && modalOverlay) {
    closeModalBtn.addEventListener('click', () => {
      modalOverlay.style.display = 'none';
    });
  }
  // Close modal on overlay click (not modal-box)
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        modalOverlay.style.display = 'none';
      }
    });
  }
  // Enter key submits in input
  if (modalApiUrl && modalFetchDataBtn) {
    modalApiUrl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        modalFetchDataBtn.click();
      }
    });
  }
  // Modal "Tarik Data" button logic
  if (modalFetchDataBtn && modalApiUrl && modalLanguageSelect && modalLoader) {
    modalFetchDataBtn.addEventListener('click', () => {
      const url = modalApiUrl.value.trim();
      const lang = modalLanguageSelect.value;
      if (!url) {
        modalApiUrl.focus();
        modalApiUrl.style.borderColor = '#e74c3c';
        setTimeout(() => { modalApiUrl.style.borderColor = ''; }, 1200);
        return;
      }
      modalLoader.style.display = 'block';
      // Simulasikan klik fetchDataBtn lama jika masih ada logic di file lain
      const oldFetchBtn = document.getElementById('fetchDataBtn');
      const oldApiUrl = document.getElementById('apiUrl');
      const oldLang = document.getElementById('languageSelect');
      if (oldApiUrl) oldApiUrl.value = url;
      if (oldLang) oldLang.value = lang;
      if (oldFetchBtn) {
        oldFetchBtn.click();
        setTimeout(() => {
          modalOverlay.style.display = 'none';
          modalLoader.style.display = 'none';
        }, 500);
      } else {
        // Jika fetchDataBtn sudah dihapus, trigger custom event atau lakukan fetch di sini
        // Implementasikan fetch langsung ke /scrape
        fetch(`${API_BASE}/scrape?url=${encodeURIComponent(url)}&lang=${encodeURIComponent(lang)}`, { // Use API_BASE
          credentials: 'include'
        })
          .then(response => response.json())
          .then(data => {
            // Set judul options
            const titleSelect = document.getElementById('textTitle');
            if (titleSelect && data.judul && Array.isArray(data.judul)) {
              // Remove old options except the first
              while (titleSelect.options.length > 1) {
                titleSelect.remove(1);
              }
              data.judul.forEach(judul => {
                const opt = document.createElement('option');
                opt.value = judul;
                opt.textContent = judul;
                titleSelect.appendChild(opt);
              });
            }
            // Set summary
            const summaryTextarea = document.getElementById('textSummary');
            if (summaryTextarea && data.summary) {
              summaryTextarea.value = data.summary;
            }
            // Optionally set description or other fields if needed

            // Add the gradient layer image
            const activeCanvas = getActiveCanvas();
            if (activeCanvas) {
              const gradientImg = new Image();
              gradientImg.src = 'assets/gradient_layer.png';
              gradientImg.onload = () => {
                createElement(gradientImg, activeCanvas);
              };
              gradientImg.onerror = (err) => {
                console.error("Failed to load gradient image:", err);
              };
            }

          })
          .catch(err => {
            alert('Gagal mengambil data berita: ' + err);
          })
          .finally(() => {
            modalOverlay.style.display = 'none';
            modalLoader.style.display = 'none';
        });
      }
    });
  }

  // --- Theme Toggle Logic ---
  const themeToggleButton = document.getElementById('theme-toggle');
  const docElement = document.documentElement; // The <html> element
  const currentTheme = localStorage.getItem('theme');

  // Apply saved theme on load
  if (currentTheme) {
    docElement.setAttribute('data-theme', currentTheme);
  }

  // Toggle button listener
  if (themeToggleButton) {
    themeToggleButton.addEventListener('click', () => {
      const newTheme = docElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      docElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
    });
  }
});

    // --- Customize Section Toggle ---
    const customizeHeader = document.getElementById('customizeSectionHeader');
    const customizeContent = document.getElementById('customizeSection');
    const customizeIcon = document.getElementById('customizeToggleIcon');
    if (customizeHeader && customizeContent && customizeIcon) {
      customizeHeader.addEventListener('click', function() {
        if (customizeContent.style.display === 'none') {
          customizeContent.style.display = '';
          customizeIcon.textContent = '▼';
        } else {
          customizeContent.style.display = 'none';
          customizeIcon.textContent = '▶';
        }
      });
    }

    // --- Template Modal Logic ---
    const openTemplateModalBtn = document.getElementById('openTemplateModalBtn');
    const templateModal = document.getElementById('templateModal');
    const closeTemplateModalBtn = document.getElementById('closeTemplateModal');
    const templateOptionsDiv = document.getElementById('templateOptions');

    if (openTemplateModalBtn && templateModal && closeTemplateModalBtn && templateOptionsDiv) {
      openTemplateModalBtn.addEventListener('click', () => {
        templateModal.style.display = 'block';
      });

      closeTemplateModalBtn.addEventListener('click', () => {
        templateModal.style.display = 'none';
      });

      // Close modal on overlay click
      window.addEventListener('click', (event) => {
        if (event.target === templateModal) {
          templateModal.style.display = 'none';
        }
      });

      // --- Template Selection Logic ---
      console.log("Attaching templateOptionsDiv click listener"); // Added log
      templateOptionsDiv.addEventListener('click', (event) => {
        console.log("Template option clicked:", event.target); // Added log
        const targetButton = event.target.closest('.template-option');
        if (targetButton) {
          const templateId = targetButton.dataset.templateId;
          applyTemplate(templateId); // Call function to apply the template
          templateModal.style.display = 'none'; // Close modal after selection
        }
      });
    }

// =========================
// Loader Overlay Functions
// =========================
function showLoader() {
  const loader = document.getElementById('loaderModal');
  if (loader) loader.classList.add('active');
}
function hideLoader() {
  const loader = document.getElementById('loaderModal');
  if (loader) loader.classList.remove('active');
}
// Optional: expose globally
window.showLoader = showLoader;
window.hideLoader = hideLoader;


// Window Resize Listener (Update handles for ALL elements in ALL canvases)
window.addEventListener('resize', function() {
    document.querySelectorAll('.element').forEach(wrapper => {
        // Use the refactored updateAllHandles which finds the correct container
        updateAllHandles(wrapper);
    });
});

// Add this to the DOMContentLoaded event listener in main.js
document.addEventListener('click', function(event) {
    // Check if the click is outside any canvas-instance
    if (!event.target.closest('.canvas-instance')) {
        // Deactivate all elements in all canvases
        deactivateAllElements();
        // Clear any active text element
        clearActiveTextElement();
    }
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
         if (activeElementInCanvas.deleteBtn) activeElementInCanvas.style.visibility = 'hidden';
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
        scale: 2.7, // Upscale output 2.7x (from 400x500 to 1080x1350)
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

// --- Template Application Logic ---

// Function to dynamically load CSS files
function loadCSS(href) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = href;

    // Check if the CSS is already loaded
    // Create a temporary anchor element to resolve the href to a full URL
    const tempLink = document.createElement('a');
    tempLink.href = href;
    const fullHref = tempLink.href;

    const existingLinks = document.querySelectorAll('link[rel="stylesheet"]');
    for (let i = 0; i < existingLinks.length; i++) {
        // Compare the full resolved URLs or pathnames
        const existingLink = document.createElement('a');
        existingLink.href = existingLinks[i].href;
        if (existingLink.pathname === tempLink.pathname) {
            console.log(`CSS file ${href} already loaded.`);
            return; // Don't load if already exists
        }
    }

    document.head.appendChild(link);
    console.log(`Loaded CSS file: ${href}`);
}

// Function to apply a selected template
function applyTemplate(templateId) {
    const activeCanvas = getActiveCanvas();
    if (!activeCanvas) {
        console.error("No active canvas found to apply template.");
        return;
    }
    console.log("applyTemplate");
    // Get data from controls
    //const titleText = document.getElementById('textTitle')?.value || '';
    const summaryText = document.getElementById('textSummary')?.value || '';

    // Apply template based on ID
    switch (templateId) {
        case 'template1':
            console.log("Applying Template 1");
            // Load template-specific CSS
            loadCSS('css/template-style.css');
            break;
        case 'template2':
            console.log("Applying Template 2");
            // Template 2: Image + Summary
            if (summaryText) {
                 const summaryElement = createElement(summaryText, 'text-summary', activeCanvas);
                 if(summaryElement) {
                    summaryElement.style.top = '150px'; // Example positioning
                    summaryElement.style.left = '50px'; // Example positioning
                    summaryElement.style.fontSize = '16px'; // Example style
                 }
            }
            // Load template-specific CSS
            loadCSS('css/templates/template2.css');
            break;
        // Add more cases for other templates
        default:
            console.warn(`Unknown template ID: ${templateId}`);
            break;
    }
}

// ========== MEMBER AREA LOGIC ==========
const API_BASE = 'http://localhost:3000'; // Ganti jika backend beda host

function checkLoginStatus() {
  return fetch(`${API_BASE}/auth/me`, {
    credentials: 'include'
  })
    .then(res => res.ok ? res.json() : null)
    .catch(() => null);
}

function showLoginButton() {
  const loginBtn = document.querySelector('a[href="#"], .site-nav a[href="#"]');
  if (loginBtn) {
    loginBtn.textContent = 'Login';
    loginBtn.onclick = (e) => {
      e.preventDefault();
      window.location.href = `${API_BASE}/auth/google`;
    };
  }
}

function showLogoutButton(user) {
  const loginBtn = document.querySelector('a[href="#"], .site-nav a[href="#"]');
  if (loginBtn) {
    loginBtn.textContent = 'Logout (' + user.nama + ')';
    loginBtn.onclick = (e) => {
      e.preventDefault();
      fetch(`${API_BASE}/logout`, { credentials: 'include' })
        .then(() => window.location.reload());
    };
  }
}

function updateCreatePostButton(isLoggedIn) {
  const createBtn = document.getElementById('openModalBtn');
  if (createBtn) {
    createBtn.disabled = !isLoggedIn;
    createBtn.style.opacity = isLoggedIn ? 1 : 0.5;
    createBtn.title = isLoggedIn ? '' : 'Login untuk membuat post';
  }
}

// On page load, cek login
window.addEventListener('DOMContentLoaded', async () => {
  const user = await checkLoginStatus();
  if (user) {
    showLogoutButton(user);
    updateCreatePostButton(true);
    // Tampilkan member area jika ada
    showMemberArea(user);
  } else {
    showLoginButton();
    updateCreatePostButton(false);
  }
});

// ========== MEMBER AREA PAGE ==========
function showMemberArea(user) {
  let memberDiv = document.getElementById('memberArea');
  if (!memberDiv) {
    memberDiv = document.createElement('div');
    memberDiv.id = 'memberArea';
    memberDiv.style = 'position:fixed;top:60px;right:20px;background:#fff;padding:16px;border-radius:8px;box-shadow:0 2px 8px #0002;z-index:1000;';
    document.body.appendChild(memberDiv);
  }
  memberDiv.innerHTML = `<b>Member Area</b><br>Nama: ${user.nama}<br>Email: ${user.email}<br><button id="closeMemberArea">Tutup</button>`;
  document.getElementById('closeMemberArea').onclick = () => memberDiv.remove();
}

// Event handler untuk tombol Akun
window.addEventListener('DOMContentLoaded', () => {
  const akunBtn = document.getElementById('akunBtn');
  if (akunBtn) {
    akunBtn.onclick = async (e) => {
      e.preventDefault();
      const user = await checkLoginStatus();
      if (user) {
        window.location.href = 'member.html';
      } else {
        window.location.href = `${API_BASE}/auth/google`;
      }
    };
  }
});
