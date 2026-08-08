const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// دالة الترجمة التلقائية الذكية لضمان دقة الوصف بالإنجليزية
async function autoTranslateToEnglish(text) {
  if (!text) return text;
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

// 1. مسار توليد الصور (Flux / Stable Diffusion)
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, style, aspectRatio } = req.body;
    if (!prompt) return res.status(400).json({ error: 'الرجاء إدخال وصف الصورة' });

    const translatedPrompt = await autoTranslateToEnglish(prompt);
    const fullPrompt = `${translatedPrompt}, style: ${style || 'photorealistic'}, high quality, 4k`;

    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait'
      },
      body: JSON.stringify({
        version: "315967f082e60064f535805e54d32049e623c2174f762c648ef8979a071f6526",
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

// 2. مسار توليد الفيديوهات الاحترافية بالذكاء الاصطناعي
app.post('/api/generate-video', async (req, res) => {
  try {
    const { script, style, duration } = req.body;
    if (!script) return res.status(400).json({ error: 'الرجاء إدخال سيناريو الفيديو' });

    const translatedScript = await autoTranslateToEnglish(script);
    const fullPrompt = `${translatedScript}, ${style || 'cinematic'} style, smooth motion, high definition`;

    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait'
      },
      body: JSON.stringify({
        version: "3f045722610da15c7e112d8a4e8d35392cf02621c4327668616113b53f65b870",
        input: { prompt: fullPrompt, duration: duration || 4 }
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

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
