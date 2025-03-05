/* main.js */

// Global variables for dragging/resizing and current text element
let currentDrag = null, dragOffsetX = 0, dragOffsetY = 0;
let currentResize = null, origWidth, origHeight, origMouseX, origMouseY;
let currentTextElement = null;

// Handle element dragging and resizing
document.addEventListener('mousemove', function(e) {
  if (currentDrag) {
    const newLeft = e.clientX - dragOffsetX;
    const newTop = e.clientY - dragOffsetY;
    currentDrag.style.left = newLeft + 'px';
    currentDrag.style.top = newTop + 'px';
    updateHandle(currentDrag, currentDrag.resizeHandle);
    updateDeleteButton(currentDrag, currentDrag.deleteBtn);
    updateRotateHandle(currentDrag, currentDrag.rotateHandle);
  }
  if (currentResize) {
    const wrapper = currentResize.wrapper;
    let newWidth = origWidth + (e.clientX - origMouseX);
    let newHeight = origHeight + (e.clientY - origMouseY);
    newWidth = newWidth < 50 ? 50 : newWidth;
    newHeight = newHeight < 50 ? 50 : newHeight;
    wrapper.style.width = newWidth + 'px';
    wrapper.style.height = newHeight + 'px';
    updateHandle(wrapper, currentResize.handle);
    updateDeleteButton(wrapper, wrapper.deleteBtn);
  }
});

document.addEventListener('mouseup', function() {
  currentDrag = null;
  currentResize = null;
});

document.addEventListener('DOMContentLoaded', function() {
  const toggleBtn = document.querySelector('.toggle-controls');
  const controls = document.querySelector('.controls');
  
  toggleBtn.addEventListener('click', function() {
      controls.classList.toggle('open');
  });
});

