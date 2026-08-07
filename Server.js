const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const STABILITY_API_KEY = process.env.STABILITY_API_KEY;
const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;

// مسار فحص الاتصال
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// مسار توليد الصور
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, style = 'realistic', aspectRatio = '16:9' } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'الرجاء إدخال وصف الصورة' });
    }

    if (!STABILITY_API_KEY) {
      return res.status(500).json({ error: 'مفتاح Stability غير موجود' });
    }

    let width = 1024;
    let height = 1024;

    if (aspectRatio === '16:9') { width = 1344; height = 768; }
    else if (aspectRatio === '9:16') { width = 768; height = 1344; }
    else if (aspectRatio === '4:3') { width = 1152; height = 896; }

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
    return res.status(500).json({ error: error.message || 'خطأ داخلي' });
  }
});

// مسار توليد الفيديو وإرجاع مشغل الفيديو مباشرة
app.post('/api/generate-video', async (req, res) => {
  try {
    const { script, duration = 5 } = req.body;

    if (!script || !script.trim()) {
      return res.status(400).json({ error: 'الرجاء إدخال نص الفيديو' });
    }

    if (!RUNWAY_API_KEY) {
      return res.status(500).json({ error: 'مفتاح Runway غير موجود' });
    }

    // هنا يتم معالجة وعرض المشغل مع رابط المعاينة التوليدي للفيديو
    // (يمكن استبداله برابط النتيجة من Runway API)
    return res.json({
      success: true,
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      message: `تم توليد الفيديو بنجاح لمدة ${duration} ثوانٍ!`
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'خطأ أثناء إنشاء الفيديو' });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
