const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server running' });
});

async function autoTranslateToEnglish(text) {
  try {
    const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`);
    const data = await res.json();
    return data[0][0][0];
  } catch (err) {
    return text;
  }
}

// توليد الصور
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, style, aspectRatio } = req.body;
    const translatedPrompt = await autoTranslateToEnglish(prompt);
    const width = (aspectRatio === '9:16') ? 896 : 1344;
    const height = (aspectRatio === '9:16') ? 1152 : 768;

    const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.STABILITY_API_KEY}`
      },
      body: JSON.stringify({
        text_prompts: [{ text: `${translatedPrompt}, ${style} style, high quality`, weight: 1 }],
        cfg_scale: 7, height, width, samples: 1, steps: 30
      })
    });
    const data = await response.json();
    res.json({ success: true, imageBase64: data.artifacts[0].base64 });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في توليد الصورة' });
  }
});

// توليد الفيديو باستخدام Replicate
app.post('/api/generate-video', async (req, res) => {
  try {
    const { script, style, duration, aspectRatio } = req.body;
    const translatedPrompt = await autoTranslateToEnglish(script);
    const fullPrompt = `${translatedPrompt}, ${style || 'cinematic'} style, high quality`;

    // استخدام موديل فيديو مستقر على Replicate
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait'
      },
      body: JSON.stringify({
        version: "9f747673945c62801b13b84701c783929c0ee784e4748ec06229c891c3cf5177", // نموذج LTX-Video أو ما يناسبه
        input: {
          prompt: fullPrompt,
          aspect_ratio: aspectRatio === '9:16' ? '9:16' : '16:9'
        }
      })
    });

    let data = await response.json();

    let predictionUrl = data.urls?.get;
    let videoOutput = data.output;

    while (predictionUrl && !videoOutput) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      const pollRes = await fetch(predictionUrl, {
        headers: { 'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}` }
      });
      data = await pollRes.json();
      videoOutput = data.output;
    }

    const videoUrl = Array.isArray(videoOutput) ? videoOutput[0] : videoOutput;

    res.json({ success: true, videoUrl });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في توليد الفيديو' });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
