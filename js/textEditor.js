/* textEditor.js */

// Helper to convert RGB to HEX
function rgb2hex(rgb) {
  if (rgb.startsWith('#')) return rgb;
  const rgbValues = rgb.match(/\d+/g);
  return '#' + rgbValues.map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
}

// Add title element
document.getElementById('addTextBtn').addEventListener('click', function() {
  const textTitle = document.getElementById('textTitle');
  const selectedTitle = textTitle.value;
  if (selectedTitle) {
    const textContainer = document.createElement('div');
    const titleEl = document.createElement('h3');
    titleEl.contentEditable = true;
    titleEl.style.margin = "0";
    titleEl.style.padding = "10px";
    titleEl.style.position = "absolute";
    titleEl.style.zIndex = '10';
    titleEl.style.color = "#fff";
    titleEl.style.fontFamily ="Arial";
    titleEl.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    titleEl.style.lineHeight = "22px";
    titleEl.innerText = selectedTitle;
    textContainer.appendChild(titleEl);
    createElement(textContainer);
  }
});

// Add description element
document.getElementById('addTextareaBtn').addEventListener('click', function() {
  const textDescription = document.getElementById('textDescription');
  const descriptionValue = textDescription.value.trim();
  if (descriptionValue) {
    const textContainer = document.createElement('div');
    const descEl = document.createElement('p');
    descEl.contentEditable = true;
    descEl.style.margin = "0";
    descEl.style.padding = "0";
    descEl.innerText = descriptionValue;
    textContainer.appendChild(descEl);
    createElement(textContainer);
  }
});

// Text style controls
document.getElementById('fontFamily').addEventListener('change', function(e) {
  if (currentSelectedWord) {
      currentSelectedWord.style.fontFamily = e.target.value;
  } else if (currentTextElement) {
      const titleElement = currentTextElement.querySelector('h3, p');
      if (titleElement) {
          titleElement.style.fontFamily = e.target.value;
      }
  }
});

document.getElementById('textColor').addEventListener('input', function(e) {
  if (currentSelectedWord) {
      currentSelectedWord.style.color = e.target.value;
  } else if (currentTextElement) {
    const titleElement = currentTextElement.querySelector('h3, p');
    if (titleElement) {
      titleElement.style.color = e.target.value;
    }
  }
});

document.getElementById('textBgColor').addEventListener('input', function(e) {
  if (currentSelectedWord) {
      currentSelectedWord.style.backgroundColor = e.target.value;
  } else if (currentTextElement) {
    const titleElement = currentTextElement.querySelector('h3, p');
    if (titleElement) {
      titleElement.style.backgroundColor = e.target.value;
    }
  }
});

document.getElementById('fontSize').addEventListener('change', function(e) {
  if (currentSelectedWord) {
      currentSelectedWord.style.fontSize = e.target.value + 'px';
  } else if (currentTextElement) {
    const titleElement = currentTextElement.querySelector('h3, p');
    if (titleElement) {
      titleElement.style.fontSize = e.target.value + 'px';
    }
  }
});

document.getElementById('boldText').addEventListener('click', function() {
  if (currentSelectedWord) {
    const currentWeight = window.getComputedStyle(currentSelectedWord).fontWeight;
    currentSelectedWord.style.fontWeight = currentWeight === 'bold' ? 'normal' : 'bold';
  } else if (currentTextElement) {
    const currentWeight = window.getComputedStyle(currentTextElement).fontWeight;
    currentTextElement.style.fontWeight = currentWeight === 'bold' ? 'normal' : 'bold';
  }
});

// Close text edit panel when clicking outside
document.addEventListener('click', function(e) {
  if (!e.target.closest('#textEditPanel') && !e.target.closest('.element')) {
    document.getElementById('textEditPanel').style.display = 'none';
    currentTextElement = null;
    // Optionally, reset currentSelectedWord if clicking outside of the text editing context.
    currentSelectedWord = null;
  }
});

document.getElementById('bgOpacity').addEventListener('input', function(e) {
  if (currentSelectedWord) {
    const currentBgColor = window.getComputedStyle(currentSelectedWord).backgroundColor;
    const rgb = currentBgColor.match(/\d+/g);
    currentSelectedWord.style.backgroundColor = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${e.target.value / 100})`;
  } else if (currentTextElement) {
    const titleElement = currentTextElement.querySelector('h3, p');
    if (titleElement) {
      const currentBgColor = window.getComputedStyle(titleElement).backgroundColor;
      const rgb = currentBgColor.match(/\d+/g);
      titleElement.style.backgroundColor = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${e.target.value / 100})`;
    }
  }
});

