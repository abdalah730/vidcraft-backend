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

console.log('✅ STABILITY_API_KEY:', STABILITY_API_KEY ? 'موجود' : 'غير موجود');
console.log('✅ RUNWAY_API_KEY:', RUNWAY_API_KEY ? 'موجود' : 'غير موجود');

// ===== توليد الصورة =====
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, style = 'realistic', aspectRatio = '16:9', quality = '1024' } = req.body;
    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'الرجاء إدخال وصف للصورة' });
    }
    if (!STABILITY_API_KEY) {
      return res.status(500).json({ error: 'مفتاح Stability غير موجود' });
    }

    const qualityNum = parseInt(quality);
    let height = qualityNum, width = qualityNum;
    if (aspectRatio === '16:9') width = Math.round(qualityNum * 16/9);
    else if (aspectRatio === '9:16') height = Math.round(qualityNum * 16/9);
    else if (aspectRatio === '4:3') width = Math.round(qualityNum * 4/3);

    const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STABILITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text_prompts: [{ text: prompt.trim(), weight: 1 }],
        cfg_scale: 7,
        height: Math.min(height, 2048),
        width: Math.min(width, 2048),
        samples: 1,
        steps: 30,
        style_preset: style,
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
    res.json({ imageBase64: data.artifacts[0].base64 });
  } catch (error) {
    console.error('❌ خطأ:', error);
    res.status(500).json({ error: error.message || 'خطأ داخلي' });
  }
});

// ===== توليد الفيديو (محاكاة) =====
app.post('/api/generate-video', async (req, res) => {
  try {
    const { script } = req.body;
    if (!script || script.trim().length === 0) {
      return res.status(400).json({ error: 'الرجاء إدخال نص الفيديو' });
    }
    console.log('🎬 توليد فيديو:', script.substring(0, 30) + '...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    res.json({ videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4' });
  } catch (error) {
    console.error('❌ خطأ:', error);
    res.status(500).json({ error: error.message || 'خطأ داخلي' });
  }
});

// ===== التحقق =====
app.get('/api/health', (req, res) => {
  res.json({
    status: '✅ الخادم يعمل',
    timestamp: new Date().toISOString(),
    stability_key: STABILITY_API_KEY ? '✅ موجود' : '❌ غير موجود',
    runway_key: RUNWAY_API_KEY ? '✅ موجود' : '❌ غير موجود',
  });
});

app.listen(PORT, () => {
  console.log(`🚀 خادم VidCraft يعمل على http://localhost:${PORT}`);
});
