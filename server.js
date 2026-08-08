const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// إعدادات CORS والـ JSON
app.use(cors());
app.use(express.json());

// مسار لفحص حالة السيرفر
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running smoothly' });
});

// دالة مساعدة لترجمة النصوص تلقائياً إلى الإنجليزية لضمان دقة النماذج
async function autoTranslateToEnglish(text) {
  if (!text) return '';
  try {
    const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`);
    const data = await res.json();
    if (data && data[0]) {
      return data[0].map(item => item[0]).join('');
    }
  } catch (err) {
    console.error('⚠️ خطأ في الترجمة التلقائية، سيتم استخدام النص الأصلي:', err);
  }
  return text;
}

// ==========================================
// 1. مسار توليد الصور (Image Generation)
// ==========================================
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, style, aspectRatio, quality } = req.body;

    if (!prompt) {
      return.status(400).json({ error: 'الرجاء إدخال وصف الصورة' });
    }

    // ترجمة الوصف لضمان فهم النموذج له بدقة عالية
    const translatedPrompt = await autoTranslateToEnglish(prompt);
    const fullPrompt = `${translatedPrompt}, style: ${style || 'realistic'}, high quality, 4k resolution`;

    // طلب التوليد من نموذج Replicate (مثال لنموذج Stable Diffusion)
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait'
      },
      body: JSON.stringify({
        version: "ac732df83cea7fff18b84701c783929c0ee784e4748ec06229c891c3cf5177", 
        input: {
          prompt: fullPrompt,
          aspect_ratio: aspectRatio || "1:1"
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'فشل توليد الصورة من المزود الخارجي');
    }

    const imageUrl = data.output ? (Array.isArray(data.output) ? data.output[0] : data.output) : null;

    if (!imageUrl) {
      throw new Error('لم يتم استلام رابط الصورة من النموذج');
    }

    // جلب الصورة وتحويلها إلى Base64 لإرسالها للواجهة
    const imageFetch = await fetch(imageUrl);
    const imageBuffer = await imageFetch.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');

    res.status(200).json({ success: true, imageBase64 });

  } catch (error) {
    console.error('❌ خطأ في مسار الصور:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ داخلي في السيرفر' });
  }
});

// ==========================================
// 2. مسار توليد الفيديو (Video Generation)
// ==========================================
app.post('/api/generate-video', async (req, res) => {
  try {
    const { script, style, duration, aspectRatio, quality } = req.body;

    if (!script) {
      return.status(400).json({ error: 'الرجاء إدخال سيناريو الفيديو' });
    }

    // ترجمة السيناريو للإنجليزية لضمان دقة تحويله لفيديو
    const translatedScript = await autoTranslateToEnglish(script);
    const fullPrompt = `${translatedScript}, ${style || 'cinematic'} style, high quality, smooth motion`;

    // طلب التوليد من نموذج Replicate (مثال لنموذج LTX-Video أو ما يناسبه)
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait'
      },
      body: JSON.stringify({
        version: "9f747673945c62801b13b84701c783929c0ee784e4748ec06229c891c3cf5177", 
        input: {
          prompt: fullPrompt,
          aspect_ratio: aspectRatio === '9:16' ? '9:16' : '16:9'
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'فشل إنشاء الفيديو من المزود الخارجي');
    }

    const videoUrl = data.output ? (Array.isArray(data.output) ? data.output[0] : data.output) : null;

    if (!videoUrl) {
      throw new Error('لم يتم استلام رابط الفيديو من النموذج');
    }

    res.status(200).json({ success: true, videoUrl });

  } catch (error) {
    console.error('❌ خطأ في مسار الفيديوهات:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ داخلي في السيرفر' });
  }
});

// تشغيل السيرفر
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
