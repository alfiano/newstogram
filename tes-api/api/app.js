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
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(400).json({ error: "Gagal mengambil konten dari URL tersebut." });
    }
    const html = await response.text();
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
    }

    // Ambil URL gambar dari artikel tanpa melakukan konversi base64
    let images = [];
    if (article) {
      const imgElements = article.querySelectorAll('img');
      imgElements.forEach(img => {
        const src = img.getAttribute('data-src') || img.getAttribute('src');
        if (src && !images.includes(src)) {
          images.push(src);
        }
      });
    }

    // Ambil URL gambar thumbnail yang berada di luar <article>
    let thumbnail = "";
    const thumbAnchor = document.querySelector('a.mg-blog-thumb');
    if (thumbAnchor) {
      const img = thumbAnchor.querySelector('img');
      if (img) {
        const src = img.getAttribute('data-src') || img.getAttribute('src');
        if (src) {
          thumbnail = src;
        }
      }
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
