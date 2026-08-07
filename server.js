const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 1. فحص حالة السيرفر
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'VidCraft AI Server is running smoothly!' });
});

// دالة مساعدة لترجمة النصوص تلقائياً إلى الإنجليزية
async function autoTranslateToEnglish(text) {
  try {
    const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`);
    const data = await res.json();
    return data[0][0][0];
  } catch (err) {
    console.error('Translation error:', err);
    return text; // في حال تعذر الترجمة نرسل النص الأصلي
  }
}

// 2. مسار توليد الصور الحقيقية (Stability AI)
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, style = 'realistic', aspectRatio = '16:9' } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'الرجاء إدخال وصف للصورة' });
    }

    if (!process.env.STABILITY_API_KEY) {
      return res.status(500).json({ error: 'مفتاح Stability API غير متوفر في السيرفر' });
    }

    // ترجمة الوصف تلقائياً للإنجليزية
    const translatedPrompt = await autoTranslateToEnglish(prompt);
    const finalPrompt = `${translatedPrompt}, ${style} style, high quality, 8k resolution`;

    const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-v1-6/text-to-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${process.env.STABILITY_API_KEY}`
      },
      body: JSON.stringify({
        text_prompts: [
          { text: finalPrompt, weight: 1 },
          { text: 'blurry, bad quality, nsfw, nude, violence', weight: -1 }
        ],
        cfg_scale: 7,
        height: aspectRatio === '9:16' ? 768 : 512,
        width: aspectRatio === '9:16' ? 512 : 768,
        samples: 1,
        steps: 30
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'فشل توليد الصورة من المصدر');
    }

    res.json({
      success: true,
      imageBase64: data.artifacts[0].base64
    });

  } catch (error) {
    console.error('Image Gen Error:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء توليد الصورة' });
  }
});

// 3. مسار توليد الفيديو الحقيقي (RunwayML API Gen-3)
app.post('/api/generate-video', async (req, res) => {
  try {
    const { script, duration = 5, aspectRatio = '16:9' } = req.body;

    if (!script || !script.trim()) {
      return res.status(400).json({ error: 'الرجاء إدخال سيناريو أو وصف للفيديو' });
    }

    const apiKey = process.env.RUNWAYML_API_SECRET || process.env.RUNWAY_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'مفتاح Runway API غير متوفر في السيرفر' });
    }

    // ترجمة سيناريو الفيديو
    const translatedScript = await autoTranslateToEnglish(script);

    // تحويل مقاسات الأبعاد حسب المطلوب
    let ratio = '1280:768';
    if (aspectRatio === '9:16') ratio = '768:1280';

    // أ) إرسال طلب إنشاء الفيديو إلى Runway
    const startResponse = await fetch('https://api.dev.runwayml.com/v1/tasks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-Runway-Version': '2024-11-06',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        taskType: 'gen3a_turbo',
        promptText: translatedScript,
        duration: parseInt(duration),
        ratio: ratio
      })
    });

    const taskData = await startResponse.json();

    if (!startResponse.ok) {
      throw new Error(taskData.error || taskData.message || 'فشل إرسال طلب الفيديو إلى Runway');
    }

    const taskId = taskData.id;

    // ب) انتهاء الطلب ومتابعة العملية حتى يجهز الفيديو (Polling)
    let videoUrl = null;
    let status = 'PENDING';
    let attempts = 0;
    const maxAttempts = 30; // الحد الأقصى للمحاولات (حوالي 2.5 دقيقة)

    while (status !== 'SUCCEEDED' && status !== 'FAILED' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // الانتظار 5 ثوانٍ بين كل فحص
      attempts++;

      const checkResponse = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'X-Runway-Version': '2024-11-06'
        }
      });

      const checkData = await checkResponse.json();
      status = checkData.status;

      if (status === 'SUCCEEDED') {
        videoUrl = checkData.output[0];
        break;
      } else if (status === 'FAILED') {
        throw new Error(checkData.failure || 'فشلت عملية معالجة الفيديو في Runway');
      }
    }

    if (!videoUrl) {
      throw new Error('استغرق معالجة الفيديو وقتاً أطول من المتوقع، يرجى المحاولة لاحقاً');
    }

    res.json({
      success: true,
      message: 'تم إنشاء الفيديو بنجاح!',
      videoUrl: videoUrl
    });

  } catch (error) {
    console.error('Video Gen Error:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء إنشاء الفيديو' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
