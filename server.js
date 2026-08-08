const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// دالة الترجمة التلقائية
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

// مسار توليد الصور
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, style } = req.body;
    if (!prompt) return res.status(400).json({ error: 'الرجاء إدخال وصف' });

    const translatedPrompt = await autoTranslateToEnglish(prompt);
    
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: "315967f082e60064f535805e54d32049e623c2174f762c648ef8979a071f6526",
        input: { prompt: `${translatedPrompt}, ${style || 'photorealistic'}` }
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail || 'فشل توليد الصورة');
    }

    const imageUrl = data.output ? (Array.isArray(data.output) ? data.output[0] : data.output) : null;
    
    res.status(200).json({ success: true, imageUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// مسار توليد الفيديو
app.post('/api/generate-video', async (req, res) => {
  try {
    const { script } = req.body;
    if (!script) return res.status(400).json({ error: 'الرجاء إدخال وصف' });

    const translatedScript = await autoTranslateToEnglish(script);

    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: "3f045722610da15c7e112d8a4e8d35392cf02621c4327668616113b53f65b870",
        input: { input_image: null, prompt: translatedScript }
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail || 'فشل إنشاء الفيديو');
    }

    const videoUrl = data.output ? (Array.isArray(data.output) ? data.output[0] : data.output) : null;
    
    res.status(200).json({ success: true, videoUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
