/**
 * 直接测试GLM API
 */

const API_KEY = process.env.GLM_API_KEY;
const BASE_URL = process.env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';

async function testGLM() {
  console.log('Testing GLM API...');
  console.log('Base URL:', BASE_URL);
  console.log('API Key:', API_KEY?.substring(0, 10) + '...');

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'glm-4-flash',
      messages: [
        { role: 'user', content: '你好，请用一句话介绍自己' }
      ],
    }),
  });

  console.log('Status:', response.status);
  const data = await response.json();
  console.log('Response:', JSON.stringify(data, null, 2));
}

testGLM().catch(console.error);
