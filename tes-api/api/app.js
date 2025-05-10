import express from 'express';
import cors from 'cors';
import { JSDOM } from 'jsdom';
import OpenAI from 'openai/index.mjs';
import axios from 'axios';
import probe from 'probe-image-size'; // Add this new import
// Tambahan untuk member area
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import mysql from 'mysql2/promise';

// Koneksi MySQL
const db = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'newstogram'
});

// User serialization
passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
  try {
    const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
    done(null, rows[0]);
  } catch (err) {
    done(err);
  }
});

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Cari user berdasarkan google_id
    const [rows] = await db.execute('SELECT * FROM users WHERE google_id = ?', [profile.id]);
    if (rows.length > 0) {
      return done(null, rows[0]);
    } else {
      // Insert user baru
      const [result] = await db.execute(
        'INSERT INTO users (nama, email, google_id) VALUES (?, ?, ?)',
        [profile.displayName, profile.emails[0].value, profile.id]
      );
      const [newUserRows] = await db.execute('SELECT * FROM users WHERE id = ?', [result.insertId]);
      return done(null, newUserRows[0]);
    }
  } catch (err) {
    return done(err);
  }
}));

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: 'http://localhost:8080',
  credentials: true
}));
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret', // Default name 'connect.sid' will be used
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Keep false for HTTP localhost development
    sameSite: 'lax'  // Explicitly set SameSite to Lax
    // Removed explicit name and domain to rely on defaults
  }
}));
app.use(passport.initialize());
app.use(passport.session());

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

// Middleware to log session and user before scrape
app.use('/scrape', (req, res, next) => {
  console.log('--- [SCRAPE Middleware] ---');
  console.log('req.sessionID (in /scrape middleware):', req.sessionID);
  console.log('req.session (in /scrape middleware):', req.session);
  console.log('req.user (in /scrape middleware):', req.user);
  next();
});

app.get('/scrape', async (req, res) => {
  console.log('--- [SCRAPE Handler] ---');
  console.log('User di /scrape:', req.user);
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
  //    if (imageSources.length === 0) {
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
  //    }
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

    // --- MODIFIKASI: SATU PROMPT UNTUK JUDUL, ISI, DAN SUMMARY SEKALIGUS ---
    const allInOnePrompt = `Translate the following news content into ${targetLang}, create 3 engaging title candidates, and summarize the content.
Output MUST be a valid JSON string with exactly three keys:
- "judul": an array of 3 click-enticing titles in ${targetLang}
- "isi": the translated news content in ${targetLang}
- "summary": a concise summary in ${targetLang}
Do not include any extra text outside the JSON.
---
Content: ${originalContent}`;

    const allInOneResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a news content writer and summarizer. Translate the given content into ${targetLang}, create three engaging title candidates, and summarize the content. Output must be valid JSON with exactly three keys: 'judul' (array of 3 titles), 'isi' (translated content), and 'summary' (concise summary). Do not include any additional text or explanation.`
        },
        {
          role: "user",
          content: allInOnePrompt
        }
      ],
      temperature: 1,
      max_tokens: 2300,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    console.log("All-in-one response:", allInOneResponse);
    if (!allInOneResponse || !allInOneResponse.choices) {
      throw new Error("Respons dari OpenAI tidak memiliki properti 'choices'.");
    }
    const allInOneText = allInOneResponse.choices[0].message.content;

    function cleanJsonText(text) {
      let cleaned = text.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?\s*[\r\n]+/, "").replace(/[\r\n]+\s*```$/, "").trim();
      }
      return cleaned;
    }

    const cleanedAllInOneText = cleanJsonText(allInOneText);

    let candidateTitles = [];
    let translatedIsi = originalContent;
    let summaryText = "";
    try {
      const parsed = JSON.parse(cleanedAllInOneText);
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
      summaryText = parsed.summary && parsed.summary.trim().length > 0 ? parsed.summary : "";
    } catch (e) {
      console.error("Gagal parsing hasil all-in-one sebagai JSON:", e);
      candidateTitles = [originalTitle];
      translatedIsi = "";
      summaryText = "";
    }

    res.json({
      judul: candidateTitles,
      isi: translatedIsi,
      gambar: images,
      thumbnail: thumbnail,
      summary: summaryText
    });
    // Kurangi kredit user jika login
    if (req.user && req.user.id) {
      console.log('Akan mengurangi kredit user id:', req.user.id);
      // Ambil kredit user saat ini
      const [userRows] = await db.execute('SELECT kredit FROM users WHERE id = ?', [req.user.id]);
      const currentKredit = userRows[0]?.kredit ?? 0;
      console.log('Kredit user sebelum dikurangi:', currentKredit);
      if (currentKredit > 0) {
        await db.execute('UPDATE users SET kredit = kredit - 1 WHERE id = ?', [req.user.id]);
        const [afterRows] = await db.execute('SELECT kredit FROM users WHERE id = ?', [req.user.id]);
        console.log('Kredit user berhasil dikurangi, sisa:', afterRows[0]?.kredit);
      } else {
        console.log('Kredit user sudah 0, tidak dikurangi');
      }
    } else {
      console.log('Tidak ada user login, kredit tidak dikurangi');
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.toString() });
  }
});

// ========== AUTH ROUTES ==========
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', passport.authenticate('google', {
  failureRedirect: '/login',
  session: true
}), (req, res) => {
  // Log session after login
  console.log('--- [AUTH GOOGLE CALLBACK] ---');
  console.log('req.sessionID (after login):', req.sessionID);
  console.log('req.session (after login):', req.session);
  console.log('req.user (after login, from passport):', req.user); // req.user should be populated here by passport
  res.redirect((process.env.FRONTEND_URL || '') + '/member.html');
});

app.get('/auth/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ id: req.user.id, nama: req.user.nama, email: req.user.email });
});

app.get('/logout', (req, res) => {
  req.logout(() => {
    res.json({ success: true });
  });
});

// Middleware proteksi
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// Contoh endpoint create post (hanya untuk user login)
app.post('/create-post', isAuthenticated, async (req, res) => {
  // Di sini logika create post, misal insert ke database
  res.json({ success: true, message: 'Post created by user', user: req.user });
});

// Endpoint ambil data user dari database langsung (bukan session)
app.get('/api/user/:id', isAuthenticated, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT id, nama, email, kredit FROM users WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint untuk klaim kredit (tambah 5 kredit)
app.post('/api/user/claim-credit', isAuthenticated, async (req, res) => {
  try {
    // Tambah 5 kredit ke user yang sedang login
    await db.execute('UPDATE users SET kredit = kredit + 5 WHERE id = ?', [req.user.id]);
    // Ambil data user terbaru
    const [rows] = await db.execute('SELECT id, nama, email, kredit FROM users WHERE id = ?', [req.user.id]);
    res.json({ success: true, kredit: rows[0].kredit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server berjalan di port ${port}`);
});

export default app;

// ===== INSTRUKSI SQL: Buat tabel users di MySQL =====
// CREATE TABLE users (
//   id INT AUTO_INCREMENT PRIMARY KEY,
//   nama VARCHAR(255),
//   email VARCHAR(255) UNIQUE,
//   google_id VARCHAR(64) UNIQUE,
//   kredit INT DEFAULT 0,
//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// );
