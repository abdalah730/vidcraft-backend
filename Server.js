const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const STABILITY_API_KEY = process.env.STABILITY_API_KEY;
const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;

console.log('STABILITY_API_KEY:', STABILITY_API_KEY ? 'موجود ✅' : 'غير موجود ❌');
console.log('RUNWAY_API_KEY:', RUNWAY_API_KEY ? 'موجود ✅' : 'غير موجود ❌');

// مسار توليد الصور
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, style = 'realistic', aspectRatio = '16:9', quality = '1024' } = req.body;

    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'الرجاء إدخال وصف الصورة' });
    }

    if (!STABILITY_API_KEY) {
      return res.status(500).json({ error: 'مفتاح Stability غير موجود' });
    }

    const qualityNum = parseInt(quality) || 1024;
    let width = qualityNum;
    let height = qualityNum;

    if (aspectRatio === '16:9') width = Math.round(qualityNum * (16 / 9));
    else if (aspectRatio === '9:16') height = Math.round(qualityNum * (16 / 9));
    else if (aspectRatio === '4:3') width = Math.round(qualityNum * (4 / 3));

    // تقريب الأبعاد لتكون من مضاعفات 64
    width = Math.floor(Math.min(width, 2048) / 64) * 64;
    height = Math.floor(Math.min(height, 2048) / 64) * 64;

    const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STABILITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text_prompts: [{ text: prompt.trim(), weight: 1 }],
        cfg_scale: 7,
        height: height,
        width: width,
        samples: 1,
        steps: 30,
        style_preset: style !== 'realistic' ? style : undefined,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ error: errorData.message || 'فشل توليد الصورة' });
    }

    const data = await response.json();
    if (!data.artifacts || data.artifacts.length === 0) {
      return res.status(500).json({ error: 'لم يتم استلام أي صورة' });
    }

    return res.json({ imageBase64: data.artifacts[0].base64 });
  } catch (error) {
    console.error('خطأ:', error);
    return res.status(500).json({ error: error.message || 'خطأ داخلي' });
  }
});

// مسار توليد الفيديو
app.post('/api/generate-video', async (req, res) => {
  try {
    const { script } = req.body;
    if (!script || script.trim().length === 0) {
      return res.status(400).json({ error: 'الرجاء إدخال نص الفيديو' });
    }
    // يمكن إضافة منطق الربط مع Runway API هنا
    return res.json({ message: 'جاري معالجة فيديو جديد' });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'خطأ في توليد الفيديو' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
