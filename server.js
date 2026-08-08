const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const STABILITY_API_KEY = process.env.STABILITY_API_KEY;
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

console.log('✅ STABILITY_API_KEY:', STABILITY_API_KEY ? 'موجود' : 'غير موجود');
console.log('✅ REPLICATE_API_TOKEN:', REPLICATE_API_TOKEN ? 'موجود' : 'غير موجود');

// ============================================================
//  مسار توليد الصورة (Stability AI)
// ============================================================
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

// ============================================================
//  مسار توليد الفيديو (Replicate API - Stable Video Diffusion)
// ============================================================
app.post('/api/generate-video', async (req, res) => {
  try {
    const { script } = req.body;
    if (!script || script.trim().length === 0) {
      return res.status(400).json({ error: 'الرجاء إدخال نص الفيديو' });
    }

    if (!REPLICATE_API_TOKEN) {
      return res.status(500).json({ error: 'مفتاح Replicate غير موجود' });
    }

    console.log('🎬 توليد فيديو:', script.substring(0, 30) + '...');

    // استدعاء Replicate API لتوليد فيديو من النص
    // نستخدم نموذج Stable Video Diffusion مع صورة مبدئية يتم توليدها من النص
    // أو نستخدم نموذجاً آخر لتوليد فيديو من النص مباشرة
    
    // أولاً: نولد صورة من النص (نستخدمها كصورة أساسية للفيديو)
    const imagePrompt = `Create a cinematic scene based on this description: ${script}`;
    
    const imageResponse = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STABILITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text_prompts: [{ text: imagePrompt, weight: 1 }],
        cfg_scale: 7,
        height: 768,
        width: 768,
        samples: 1,
        steps: 20,
        style_preset: 'cinematic',
      }),
    });

    if (!imageResponse.ok) {
      throw new Error('فشل توليد الصورة الأساسية للفيديو');
    }

    const imageData = await imageResponse.json();
    const imageBase64 = imageData.artifacts[0].base64;
    
    // إرسال الصورة إلى Replicate لتحويلها إلى فيديو
    // ملاحظة: هذا يتطلب تنفيذ متعدد الخطوات، سنستخدم محاكاة حالياً
    // للتجربة، سنعيد فيديو تجريبي
    
    console.log('🔄 جاري تحويل الصورة إلى فيديو (محاكاة)...');
    await new Promise(resolve => setTimeout(resolve, 4000));

    // في الإنتاج، هنا ستستدعي Replicate API الحقيقي
    // https://replicate.com/stability-ai/stable-video-diffusion
    
    // حالياً، نعيد فيديو تجريبي للمعاينة
    const videoUrl = 'https://www.w3schools.com/html/mov_bbb.mp4';

    res.json({ 
      videoUrl,
      message: 'تم إنشاء الفيديو بنجاح (محاكاة)',
      note: 'لتفعيل التوليد الحقيقي، قم بتوصيل Replicate API'
    });

  } catch (error) {
    console.error('❌ خطأ في توليد الفيديو:', error);
    res.status(500).json({ error: error.message || 'خطأ داخلي' });
  }
});

// ============================================================
//  مسار بسيط لتوليد فيديو تجريبي (للاختبار)
// ============================================================
app.get('/api/sample-video', (req, res) => {
  res.json({
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4'
  });
});

// ============================================================
//  مسار التحقق من صحة السيرفر
// ============================================================
app.get('/api/health', (req, res) => {
  res.json({
    status: '✅ السيرفر يعمل',
    timestamp: new Date().toISOString(),
    stability_key: STABILITY_API_KEY ? '✅ موجود' : '❌ غير موجود',
    replicate_key: REPLICATE_API_TOKEN ? '✅ موجود' : '❌ غير موجود',
  });
});

// ============================================================
//  تشغيل السيرفر
// ============================================================
app.listen(PORT, () => {
  console.log(`🚀 خادم VidCraft يعمل على http://localhost:${PORT}`);
});
