/* image.js */

// Convert image URL to Data URL using a proxy
function toDataURLProxy(url) {
    return fetch(`http://localhost:3000/stream-image?url=${encodeURIComponent(url)}`)
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
  document.getElementById('fetchDataBtn').addEventListener('click', function() {
    const userUrl = document.getElementById('apiUrl').value.trim();
    const loader = document.getElementById('loader');
    if (!userUrl) {
      alert('Silakan masukkan URL website terlebih dahulu.');
      return;
    }
    loader.style.display = 'block';
    
    // Use our backend API to scrape the website entered by the user
    const backendApiUrl = `http://localhost:3000/scrape?url=${encodeURIComponent(userUrl)}`;
    
    fetch(backendApiUrl)
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
                  const imgObj = new Image();
                  imgObj.src = dataUrl;
                  imgObj.onload = function() {
                    createElement(imgObj);
                  }
                });
                imagePanel.appendChild(imgEl);
              })
              .catch(err => console.error('Error converting image:', err));
          });

          if (allImages.length > 0) {
            toDataURLProxy(allImages[0])
              .then(dataUrl => {
                const imgObj = new Image();
                imgObj.src = dataUrl;
                imgObj.onload = function() {
                imgObj.style.zIndex = 1;
                createElement(imgObj);
                }
              })
              .catch(err => console.error('Error auto inserting image:', err));
          }

        }

        if (data.judul && Array.isArray(data.judul) && data.judul.length > 0) {
            const textContainer = document.createElement('div');
            textContainer.classList.add('autoTextInserted');
            const titleEl = document.createElement('h3');
            titleEl.contentEditable = true;
            titleEl.style.margin = "0";
            titleEl.style.padding = "10px";
            titleEl.style.position = "absolute";
            titleEl.style.color = "#fff";
            titleEl.style.fontFamily ="Arial";
            titleEl.style.lineHeight = "22px";
            titleEl.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            titleEl.style.zIndex = 10;
            titleEl.innerText = data.judul[0];
            textContainer.appendChild(titleEl);
            createElement(textContainer);
          }

      })
      .catch(error => {
        console.error('Error fetching data:', error);
        alert('Gagal mengambil data dari API.');
      })
      .finally(() => {
        loader.style.display = 'none';
      });
  });
  
  // Handle image uploads from the user
  document.getElementById('imageUpload').addEventListener('change', function(e) {
    const files = e.target.files;
    for (let file of files) {
      const reader = new FileReader();
      reader.onload = function(evt) {
        const img = new Image();
        img.src = evt.target.result;
        img.onload = function() {
          createElement(img);
        }
      };
      reader.readAsDataURL(file);
    }
  });
  