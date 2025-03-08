import express from 'express';
import cors from 'cors';
import { JSDOM } from 'jsdom';
import OpenAI from 'openai/index.mjs';
import axios from 'axios';

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
        'X-Api-Key': apiNinjasKey
      }
    });

    if (response.status !== 200) {
      return res.status(400).json({ error: "Gagal mengambil konten dari URL tersebut." });
    }

    // Parse the HTML content from API Ninjas response
    const html = response.data;
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const h1 = document.querySelector('h1');
    const originalTitle = h1 ? h1.textContent.trim() : "";

    let originalContent = "";
    const article = document.querySelector('article');
    if (article) {
      const paragraphs = article.querySelectorAll('p');
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

    // Extract images from the page
    let images = [];
    const imgElements = document.querySelectorAll('img');
    imgElements.forEach(img => {
      const src = img.getAttribute('data-src') || img.getAttribute('src');
      if (src && !images.includes(src) && !src.startsWith('data:')) {
        // Convert relative URLs to absolute URLs
        const absoluteSrc = new URL(src, url).href;
        images.push(absoluteSrc);
      }
    });

    // Try to find a thumbnail image
    let thumbnail = "";
    if (images.length > 0) {
      thumbnail = images[0]; // Use the first image as thumbnail
    }

    // --- MODIFIKASI UNTUK 3 KANDIDAT JUDUL ---
    const translationPrompt = `Terjemahkan isi berita berikut ke dalam Bahasa Indonesia dan buat 3 kandidat judul yang mengundang pembaca untuk mengklik.
Output HARUS berupa string JSON yang valid dengan dua key persis: "judul" yang berisi array 3 judul dan "isi" untuk isi berita. Jangan sertakan teks lain di luar JSON.
---
Isi: ${originalContent}`;

    const translationResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a news content writer tasked with translating text into Bahasa Indonesia. Translate the given content into Bahasa Indonesia and create three engaging title candidates that make users click. Output must be valid JSON with exactly two keys: 'judul' as an array containing three candidate titles and 'isi' for the translated content. Do not include any additional text or explanation."
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
