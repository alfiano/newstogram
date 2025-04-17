import express from 'express';
import cors from 'cors';
import { JSDOM } from 'jsdom';
import OpenAI from 'openai/index.mjs';
import axios from 'axios';
import probe from 'probe-image-size'; // Add this new import

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.FRONTEND_URL || '*'
}));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Modified stream-image route using Axios
app.get('/stream-image', async (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl) {
    return res.status(400).json({ error: "Parameter 'url' wajib disertakan." });
  }

  try {
    const response = await axios({
      method: 'GET',
      url: imageUrl,
      responseType: 'stream'
    });

    res.set({
      'Content-Type': response.headers['content-type'],
      'Content-Disposition': `inline`
    });

    response.data.pipe(res);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Gagal mengunduh gambar');
  }
});

app.get('/scrape', async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).json({ error: "Parameter 'url' wajib disertakan." });
  }
  const lang = req.query.lang || 'id';
  const langMapping = {
    en: "English",
    id: "Bahasa Indonesia",
    es: "Spanish",
    fr: "French",
    de: "German",
    in: "Indian",
    pt: "Portuguese"
  };
  const targetLang = langMapping[lang] || "Bahasa Indonesia";

  try {
    // Use API Ninjas webscraper API instead of direct fetching
    const apiNinjasUrl = `https://api.api-ninjas.com/v1/webscraper?url=${encodeURIComponent(url)}`;
    
    // You need to replace 'YOUR_API_NINJAS_KEY' with your actual API Ninjas API key
    // This can be stored in an environment variable for security
    const apiNinjasKey = process.env.API_NINJAS_KEY || 'YOUR_API_NINJAS_KEY';
    
    const response = await axios({
      method: 'GET',
      url: apiNinjasUrl,
      headers: {
        'X-Api-Key': apiNinjasKey,
      }
    });

    if (response.status !== 200) {
      return res.status(400).json({ error: "Gagal mengambil konten dari URL tersebut." });
    }

    // Parse the HTML content from API Ninjas response
    const html = response.data.data; // Access the HTML content in the "data" field
    const dom = new JSDOM(html);

    const document = dom.window.document;

    const h1 = document.querySelector('h1');
    const originalTitle = h1 ? h1.textContent.trim() : "";

    let originalContent = "";
    const articleElement = document.querySelector('article');
    if (articleElement) {
      const paragraphs = articleElement.querySelectorAll('p');
      paragraphs.forEach(p => {
        originalContent += p.textContent.trim() + "\n";
      });
    } else {
      // If no article tag is found, try to get content from paragraphs in the body
      const paragraphs = document.querySelectorAll('p');
      paragraphs.forEach(p => {
        originalContent += p.textContent.trim() + "\n";
      });
    }
      // Extract images from the page - modified to only get images from article or main content
      let imageSources = [];

      if (articleElement) {
        // If article tag exists, get images only from within the article
        const imgElements = articleElement.querySelectorAll('img');
        imgElements.forEach(img => {
          const src = img.getAttribute('data-src') || img.getAttribute('src');
          if (src && !imageSources.includes(src) && !src.startsWith('data:')) {
            // Convert relative URLs to absolute URLs
            const absoluteSrc = new URL(src, url).href;
            imageSources.push(absoluteSrc);
          }
        });
      } else {
        // If no article tag, try to find main content containers
        const mainContent = document.querySelector('main') || 
                            document.querySelector('.content') || 
                            document.querySelector('.post-content') ||
                            document.querySelector('.entry-content');
      
        if (mainContent) {
          const imgElements = mainContent.querySelectorAll('img');
          imgElements.forEach(img => {
            const src = img.getAttribute('data-src') || img.getAttribute('src');
            if (src && !imageSources.includes(src) && !src.startsWith('data:')) {
              const absoluteSrc = new URL(src, url).href;
              imageSources.push(absoluteSrc);
            }
          });
        } else {
          // Fallback: look for images near paragraphs in the body
          const paragraphs = document.querySelectorAll('p');
          paragraphs.forEach(p => {
            // Get images that are siblings or children of paragraphs
            const nearbyImgs = [...p.querySelectorAll('img'), 
                                ...(p.parentNode ? p.parentNode.querySelectorAll('img') : [])];
          
            nearbyImgs.forEach(img => {
              const src = img.getAttribute('data-src') || img.getAttribute('src');
              if (src && !imageSources.includes(src) && !src.startsWith('data:')) {
                const absoluteSrc = new URL(src, url).href;
                imageSources.push(absoluteSrc);
              }
            });
          });
        }
      }

      // If no images found in content, try to find a featured image or thumbnail
      if (imageSources.length === 0) {
        // Look for common thumbnail or featured image selectors
        const featuredImg = document.querySelector('.featured-image img') || 
                            document.querySelector('.thumbnail img') ||
                            document.querySelector('meta[property="og:image"]');
      
        if (featuredImg) {
          const src = featuredImg.getAttribute('content') || 
                      featuredImg.getAttribute('data-src') || 
                      featuredImg.getAttribute('src');
        
          if (src && !src.startsWith('data:')) {
            const absoluteSrc = new URL(src, url).href;
            imageSources.push(absoluteSrc);
          }
        }
      }
    // Filter images by size (at least 400px in width or height)
    let images = [];
    let thumbnail = "";
    
    // Check each image's dimensions
    const imagePromises = imageSources.map(async (src) => {
      try {
        const result = await probe(src);
        if (result.width >= 400 || result.height >= 400) {
          images.push(src);
          // Set the first large image as thumbnail if not set yet
          if (!thumbnail) {
            thumbnail = src;
          }
        }
      } catch (error) {
        console.log(`Failed to get dimensions for image: ${src}`);
      }
    });
    
    await Promise.all(imagePromises);

    // If no large images found, use the first image as thumbnail
    if (images.length === 0 && imageSources.length > 0) {
      thumbnail = imageSources[0];
      images.push(thumbnail);
    }

    // --- MODIFIKASI UNTUK 3 KANDIDAT JUDUL ---
    const translationPrompt = `Translate the following news content into ${targetLang} and create 3 engaging title candidates that entice readers to click.
Output MUST be a valid JSON string with exactly two keys: "judul" containing an array of 3 titles and "isi" for the translated content. Do not include any extra text outside the JSON.
---
Content: ${originalContent}`;

    const translationResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a news content writer tasked with translating text into " + targetLang + ". Translate the given content into " + targetLang + " and create three engaging title candidates that make users click. Output must be valid JSON with exactly two keys: 'judul' as an array containing three candidate titles and 'isi' for the translated content. Do not include any additional text or explanation."
        },
        {
          role: "user",
          content: translationPrompt
        }
      ],
      temperature: 1,
      max_tokens: 2048,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    console.log("Translation response:", translationResponse);
    if (!translationResponse || !translationResponse.choices) {
      throw new Error("Respons dari OpenAI tidak memiliki properti 'choices'.");
    }
    const translationText = translationResponse.choices[0].message.content;

    function cleanJsonText(text) {
      let cleaned = text.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?\s*[\r\n]+/, "").replace(/[\r\n]+\s*```$/, "").trim();
      }
      return cleaned;
    }

    const cleanedTranslationText = cleanJsonText(translationText);

    let candidateTitles = [];
    let translatedIsi = originalContent;
    try {
      const parsed = JSON.parse(cleanedTranslationText);
      if (parsed.judul && Array.isArray(parsed.judul) && parsed.judul.length === 3) {
        candidateTitles = parsed.judul.map(j => j.trim()).filter(j => j.length > 0);
        if (candidateTitles.length !== 3) {
          candidateTitles = [originalTitle];
        }
      } else if (typeof parsed.judul === 'string' && parsed.judul.trim().length > 0) {
        candidateTitles = [parsed.judul.trim()];
      } else {
        candidateTitles = [originalTitle];
      }
      translatedIsi = parsed.isi && parsed.isi.trim().length > 0 ? parsed.isi : originalContent;
    } catch (e) {
      console.error("Gagal parsing hasil terjemahan sebagai JSON:", e);
      candidateTitles = [originalTitle];
      translatedIsi = "";
    }

    res.json({
      judul: candidateTitles,
      isi: translatedIsi,
      gambar: images,
      thumbnail: thumbnail
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.toString() });
  }
});

app.listen(port, () => {
  console.log(`Server berjalan di port ${port}`);
});

export default app;
