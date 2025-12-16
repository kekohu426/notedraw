/**
 * 测试脚本：验证拆解Agent功能
 * 运行：node test-organizer.mjs
 */

const API_KEY = process.env.GLM_API_KEY;
const BASE_URL = process.env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
const TEXT_MODEL = 'glm-4-flash';

// 拆解Agent提示词
function getAnalyzePrompt(text, language, mode) {
  const modeInstruction = mode === 'compact'
    ? '【强制要求】用户选择了精简模式，你必须只生成1张卡片，最多4个知识点。选择最重要的内容。'
    : '【详细模式】根据知识点数量决定卡片数量：≤4个知识点=1张图，>4个知识点=多张图（每张≤4个Section）';

  return `
你是一位视觉笔记架构师，专精于将长文转化为结构化的视觉笔记。

${modeInstruction}

## 分析步骤
1. **知识点提取**：阅读全文，识别所有核心知识点
2. **数量决策**：统计知识点数量，决定生成几张卡片
3. **内容精炼**：将长句提炼为精华短语（每个关键词≤8字）
4. **结构输出**：按格式输出JSON

## 输出规则
- 每张卡片最多4个Section（密度红线）
- 标题精炼（≤10字）
- 每个Section的summary是精炼后的内容（≤50字），不是原文截取
- keywords是金句短语，每个≤8字

## 待分析文本
"""
${text}
"""

## 返回格式（严格JSON）
{
  "totalKnowledgePoints": 7,
  "cards": [
    {
      "cardIndex": 1,
      "cardTitle": "卡片标题",
      "sections": [
        {
          "heading": "板块标题",
          "summary": "精炼后的核心内容...",
          "keywords": ["关键词1", "关键词2", "关键词3"]
        }
      ]
    }
  ]
}

只返回JSON，不要任何解释或markdown代码块标记。
`.trim();
}

// 调用GLM API
async function callGLM(prompt) {
  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: TEXT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    throw new Error(`GLM API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// 测试文本
const testText = `
Vercel 的模板库是一个非常棒的资源，可以帮助你快速启动新项目。以下是一些值得推荐的模板：

1. Next.js Commerce - 电商模板
这是一个功能完整的电商解决方案，包含产品展示、购物车、结账流程等功能。适合想要快速搭建在线商店的开发者。

2. AI Chatbot - AI对话机器人
基于 OpenAI API 的聊天机器人模板，支持流式响应和上下文记忆。非常适合学习如何将 AI 集成到 Next.js 应用中。

3. Blog Starter Kit - 博客模板
使用 MDX 的博客模板，支持 Markdown 写作，代码高亮，SEO 优化等功能。是个人博客的理想起点。

4. Dashboard Template - 管理后台
包含图表、表格、表单等常用组件的管理后台模板。使用 Tailwind CSS 构建，响应式设计。

5. SaaS Starter - SaaS模板
包含用户认证、订阅支付、团队管理等 SaaS 常见功能。集成了 Stripe 支付和数据库。

6. Portfolio - 作品集模板
简洁的个人作品集模板，适合展示项目和个人信息。支持暗黑模式。

总结：Vercel 模板库涵盖了从电商到 AI、从博客到 SaaS 的各种场景，是学习和快速启动项目的绝佳资源。
`;

async function runTest() {
  console.log('='.repeat(60));
  console.log('测试拆解Agent');
  console.log('='.repeat(60));
  console.log('');
  console.log('输入文本长度:', testText.length, '字符');
  console.log('');

  try {
    // 测试详细模式
    console.log('--- 测试详细模式 ---');
    const detailedPrompt = getAnalyzePrompt(testText, 'zh', 'detailed');

    console.log('调用GLM API...');
    const detailedResponse = await callGLM(detailedPrompt);

    console.log('');
    console.log('GLM返回结果:');
    console.log(detailedResponse);
    console.log('');

    // 尝试解析JSON
    try {
      let cleanResponse = detailedResponse.trim();
      if (cleanResponse.startsWith('```json')) cleanResponse = cleanResponse.slice(7);
      if (cleanResponse.startsWith('```')) cleanResponse = cleanResponse.slice(3);
      if (cleanResponse.endsWith('```')) cleanResponse = cleanResponse.slice(0, -3);
      cleanResponse = cleanResponse.trim();

      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) cleanResponse = jsonMatch[0];

      const parsed = JSON.parse(cleanResponse);
      console.log('✅ JSON解析成功');
      console.log('知识点总数:', parsed.totalKnowledgePoints);
      console.log('生成卡片数:', parsed.cards.length);
      parsed.cards.forEach((card, i) => {
        console.log(`\n卡片${i + 1}: ${card.cardTitle}`);
        card.sections.forEach((section, j) => {
          console.log(`  Section${j + 1}: ${section.heading}`);
          console.log(`    摘要: ${section.summary.substring(0, 50)}...`);
          console.log(`    关键词: ${section.keywords.join(', ')}`);
        });
      });
    } catch (parseError) {
      console.log('❌ JSON解析失败:', parseError.message);
    }

    // 测试精简模式
    console.log('\n');
    console.log('--- 测试精简模式 ---');
    const compactPrompt = getAnalyzePrompt(testText, 'zh', 'compact');

    console.log('调用GLM API...');
    const compactResponse = await callGLM(compactPrompt);

    console.log('');
    console.log('GLM返回结果:');
    console.log(compactResponse);
    console.log('');

    try {
      let cleanResponse = compactResponse.trim();
      if (cleanResponse.startsWith('```json')) cleanResponse = cleanResponse.slice(7);
      if (cleanResponse.startsWith('```')) cleanResponse = cleanResponse.slice(3);
      if (cleanResponse.endsWith('```')) cleanResponse = cleanResponse.slice(0, -3);
      cleanResponse = cleanResponse.trim();

      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) cleanResponse = jsonMatch[0];

      const parsed = JSON.parse(cleanResponse);
      console.log('✅ JSON解析成功');
      console.log('知识点总数:', parsed.totalKnowledgePoints);
      console.log('生成卡片数:', parsed.cards.length);
      if (parsed.cards.length === 1) {
        console.log('✅ 精简模式正确：只生成了1张卡片');
      } else {
        console.log('❌ 精简模式错误：应该只生成1张卡片');
      }
    } catch (parseError) {
      console.log('❌ JSON解析失败:', parseError.message);
    }

  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

runTest();
