const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const STABILITY_API_KEY = process.env.STABILITY_API_KEY;
const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;

console.log("STABILITY_API_KEY:", STABILITY_API_KEY ? "موجود ✅" : "غير موجود ❌");
console.log("RUNWAY_API_KEY:", RUNWAY_API_KEY ? "موجود ✅" : "غير موجود ❌");

// مسار فحص الاتصال
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// مسار توليد الصور
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, style = 'realistic', aspectRatio = '16:9' } = req.body;

    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'الرجاء إدخال وصف الصورة' });
    }

    if (!STABILITY_API_KEY) {
      return res.status(500).json({ error: 'مفتاح Stability غير موجود' });
    }

    // تحديد أبعاد SDXL الرسمية المعتمدة
    let width = 1024;
    let height = 1024;

    if (aspectRatio === '16:9') {
      width = 1344;
      height = 768;
    } else if (aspectRatio === '9:16') {
      width = 768;
      height = 1344;
    } else if (aspectRatio === '4:3') {
      width = 1152;
      height = 896;
    }

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
    console.error('Error:', error);
    return res.status(500).json({ error: error.message || 'خطأ داخلي' });
  }
});

// مسار توليد الفيديو (يستقبل المدة أيضاً)
app.post('/api/generate-video', async (req, res) => {
  try {
    const { script, style, aspectRatio, duration = 5 } = req.body;

    if (!script || !script.trim()) {
      return res.status(400).json({ error: 'الرجاء إدخال نص الفيديو' });
    }

    if (!RUNWAY_API_KEY) {
      return res.status(500).json({ error: 'مفتاح Runway غير موجود' });
    }

    return res.json({ 
      message: 'جاري معالجة طلب الفيديو...', 
      duration: duration,
      aspectRatio: aspectRatio,
      status: 'processing' 
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message || 'خطأ داخلي' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
