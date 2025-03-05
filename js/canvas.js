/* canvas.js */

// Export canvas content as PNG using html2canvas
function exportAsPNG() {
    html2canvas(document.getElementById('canvas')).then(canvas => {
      const link = document.createElement('a');
      link.download = 'design.png';
      link.href = canvas.toDataURL();
      link.click();
    });
  }
  
  // Update handles on window resize
  window.addEventListener('resize', function() {
    document.querySelectorAll('.element').forEach(wrapper => {
      if (wrapper.resizeHandle) {
        updateHandle(wrapper, wrapper.resizeHandle);
      }
      if (wrapper.deleteBtn) {
        updateDeleteButton(wrapper, wrapper.deleteBtn);
      }
      if (wrapper.rotateHandle) {
        updateRotateHandle(wrapper, wrapper.rotateHandle);
      }
    });
  });
  