const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// دالة الترجمة التلقائية
async function autoTranslateToEnglish(text) {
  if (!text) return '';
  try {
    const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`);
    const data = await res.json();
    if (data && data[0]) {
      return data[0].map(item => item[0]).join('');
    }
  } catch (err) {
    console.error('Translation error:', err);
  }
  return text;
}

// مسار توليد الصور
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, style, aspectRatio } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'الرجاء إدخال وصف الصورة' });
    }

    const translatedPrompt = await autoTranslateToEnglish(prompt);
    const fullPrompt = `${translatedPrompt}, style: ${style || 'realistic'}, high quality`;

    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait'
      },
      body: JSON.stringify({
        version: "ac732df83cea7fff18b84701c783929c0ee784e4748ec06229c891c3cf5177",
        input: { prompt: fullPrompt, aspect_ratio: aspectRatio || "1:1" }
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'فشل توليد الصورة');
    
    const imageUrl = data.output ? (Array.isArray(data.output) ? data.output[0] : data.output) : null;
    res.status(200).json({ success: true, imageUrl });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// مسار توليد الفيديو
app.post('/api/generate-video', async (req, res) => {
  try {
    const { script, style, aspectRatio } = req.body;
    if (!script) {
      return res.status(400).json({ error: 'الرجاء إدخال سيناريو الفيديو' });
    }

    const translatedScript = await autoTranslateToEnglish(script);
    const fullPrompt = `${translatedScript}, ${style || 'cinematic'} style, high quality`;

    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait'
      },
      body: JSON.stringify({
        version: "9f747673945c62801b13b84701c783929c0ee784e4748ec06229c891c3cf5177",
        input: { prompt: fullPrompt, aspect_ratio: aspectRatio === '9:16' ? '9:16' : '16:9' }
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'فشل إنشاء الفيديو');

    const videoUrl = data.output ? (Array.isArray(data.output) ? data.output[0] : data.output) : null;
    res.status(200).json({ success: true, videoUrl });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
