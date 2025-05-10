/* image.js */

// Convert image URL to Data URL using a proxy
function toDataURLProxy(url) {
  //const endpoint = 'https://tes-api7.agep.web.id';
  const endpoint = 'http://localhost:3000';
    return fetch(`${endpoint}/stream-image?url=${encodeURIComponent(url)}`)
      .then(response => {
        if (!response.ok) throw new Error('Error fetching image from proxy.');
        return response.blob();
      })
      .then(blob => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }));
  }  
  // Fetch data from the API and update the UI
  const fetchDataBtn = document.getElementById('fetchDataBtn');
  if (fetchDataBtn) {
      //const endpoint = 'https://tes-api7.agep.web.id';
    const endpoint = 'http://localhost:3000';
    fetchDataBtn.addEventListener('click', function() {
      const userUrl = document.getElementById('apiUrl').value.trim();
      if (!userUrl) {
        alert('Silakan masukkan URL website terlebih dahulu.');
        return;
      }
      showLoader(); // Use the global function
      const language = document.getElementById('languageSelect').value;
      
      // Use our backend API to scrape the website entered by the user
      const backendApiUrl = `${endpoint}/scrape?url=${encodeURIComponent(userUrl)}&lang=${encodeURIComponent(language)}`;
      
      fetch(backendApiUrl, { credentials: 'include' }) // Added credentials: 'include'
        .then(response => response.json())
        .then(data => {
          const textTitle = document.getElementById('textTitle');
          const textDescription = document.getElementById('textDescription');
          
          // Update title options
          if (data.judul && Array.isArray(data.judul)) {
            textTitle.innerHTML = "";
            data.judul.forEach(item => {
              const option = document.createElement('option');
              option.value = item;
              option.innerText = item;
              textTitle.appendChild(option);
            });
          }
          
          // Update description
          if (data.isi) {
            textDescription.value = data.isi;
          }

          // Update summary
          if (data.summary) {
            const textSummary = document.getElementById('textSummary');
            if (textSummary) {
              textSummary.value = data.summary;
            }
          }
          
          // Update images
          if (data.gambar || data.thumbnail) {
            const imagePanel = document.getElementById('imagePanel');
            imagePanel.innerHTML = "";
            const allImages = [];
            if (data.gambar && Array.isArray(data.gambar)) {
              allImages.push(...data.gambar);
            }
            if (data.thumbnail) {
              allImages.push(data.thumbnail);
            }
            allImages.forEach((imgUrl, index) => {
              toDataURLProxy(imgUrl)
                .then(dataUrl => {
                  const imgEl = document.createElement('img');
                  imgEl.src = dataUrl;
                  imgEl.alt = "Gambar " + (index + 1);
                  imgEl.addEventListener('click', function() {
                    const eltype = "img-api";
                    const activeCanvas = getActiveCanvas(); // Get active canvas
                    if (!activeCanvas) {
                        alert("Please select a canvas first.");
                        return;
                    }
                    const imgObj = new Image();
                    imgObj.src = dataUrl;
                    imgObj.onload = function() {
                      createElement(imgObj, eltype, activeCanvas); // Pass active canvas
                    }
                  });
                  imagePanel.appendChild(imgEl);
                })
                .catch(err => console.error('Error converting image:', err));
            });

            if (allImages.length > 0) {
              toDataURLProxy(allImages[0])
                .then(dataUrl => {
                  const activeCanvas = getActiveCanvas(); // Get active canvas
                  if (!activeCanvas) return; // Don't auto-add if no canvas is active/exists
                  const imgObj = new Image();
                  imgObj.src = dataUrl;
                  imgObj.onload = function() {
                    imgObj.style.zIndex = 1;
                    createElement(imgObj, 'img-api',activeCanvas); // Pass active canvas
                  }
                })
                .catch(err => console.error('Error auto inserting image:', err));
            }

          }

          // Add logic for gradient_layer.png after other images are processed
          const activeCanvas = getActiveCanvas(); // Get active canvas
          if (activeCanvas) { // Only add if a canvas is active
            const imgObj = new Image();
            imgObj.src = 'assets/gradient_layer.png';
            imgObj.onload = function() {
              imgObj.dataset.isGradient = 'true'; // Add data attribute to identify gradient layer
              // z-index is handled in createElement based on data attribute
              createElement(imgObj, 'img-api', activeCanvas); // Pass active canvas
            }
            imgObj.onerror = function() {
              console.error('Error loading gradient_layer.png');
            }
          }

          if (data.judul && Array.isArray(data.judul) && data.judul.length > 0) {
              const activeCanvas = getActiveCanvas(); // Get active canvas
              if (activeCanvas) {
                  const titleEl = document.createElement('h3'); // Create the editable element directly
                  titleEl.contentEditable = true;
                  titleEl.className = 'editable-text autoTextInserted'; // Add classes
                  titleEl.style.margin = "0";
                  titleEl.style.padding = "10px";
                  // titleEl.style.position = "absolute"; // Handled by wrapper
                  //titleEl.style.color = "#000";
                  titleEl.style.fontFamily ="Arial";
                  titleEl.style.lineHeight = "22px";
                  //titleEl.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                  titleEl.style.zIndex = 10; // Maybe apply to wrapper instead
                  titleEl.innerText = data.judul[0];
                  createElement(titleEl, 'text-title', activeCanvas); // Pass element and active canvas
              }
            }
        })
        .catch(error => {
          console.error('Error fetching data:', error);
          alert('Gagal mengambil data dari API.');
        })
        .finally(() => {
          hideLoader(); // Use the global function
        });
    });
  }
  
  // Handle image uploads from the user
  document.getElementById('imageUpload').addEventListener('change', function(e) {
    const files = e.target.files;
    for (let file of files) {
      const reader = new FileReader();
      reader.onload = function(evt) {
        const activeCanvas = getActiveCanvas(); // Get active canvas
        if (!activeCanvas) {
            alert("Please select a canvas first to upload the image.");
            return;
        }
        const img = new Image();
        img.src = evt.target.result;
        img.onload = function() {
          createElement(img, 'img-upload', activeCanvas); // Pass active canvas
        }
      };
      reader.readAsDataURL(file);
    }
  });
