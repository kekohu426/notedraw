/**
 * 测试脚本：验证完整流程
 * 从文本输入到占位图生成
 */

const API_KEY = process.env.GLM_API_KEY;
const BASE_URL = process.env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
const TEXT_MODEL = 'glm-4-flash';

// 模拟 types
const VisualStyles = ['sketch', 'business', 'cute', 'minimal', 'chalkboard'];

// 风格配置
const styleConfigs = {
  sketch: {
    promptKeywords: 'hand-drawn notebook style, sketchy lines, warm personal feel',
    colorPalette: 'warm neutrals with accent colors: beige, coral, mint',
    negativePrompt: 'digital, cold, corporate',
  },
  business: {
    promptKeywords: 'clean professional infographic, corporate style',
    colorPalette: 'professional blues and grays with accent colors',
    negativePrompt: 'childish, messy, informal',
  },
  cute: {
    promptKeywords: 'kawaii style, adorable illustrations, playful',
    colorPalette: 'pastel colors, pink, mint, lavender',
    negativePrompt: 'dark, serious, boring',
  },
  minimal: {
    promptKeywords: 'minimalist design, clean lines, lots of whitespace',
    colorPalette: 'monochrome with single accent color',
    negativePrompt: 'cluttered, busy, colorful',
  },
  chalkboard: {
    promptKeywords: 'chalkboard style, chalk texture, classroom feel',
    colorPalette: 'dark green/black background with white and colored chalk',
    negativePrompt: 'clean, digital, modern',
  },
};

// 拆解Agent提示词
function getAnalyzePrompt(text, language, mode) {
  const isZh = language === 'zh';

  const modeInstruction = mode === 'compact'
    ? (isZh
        ? '【强制要求】用户选择了精简模式，你必须只生成1张卡片，最多4个知识点。选择最重要的内容。'
        : '[STRICT] User selected compact mode. You MUST output only 1 card with max 4 sections. Pick the most important content.')
    : (isZh
        ? '【详细模式】根据知识点数量决定卡片数量：≤4个知识点=1张图，>4个知识点=多张图（每张≤4个Section）'
        : '[DETAILED MODE] Decide card count by knowledge points: ≤4 points=1 card, >4 points=multiple cards (each ≤4 sections)');

  return `
${isZh ? '你是一位视觉笔记架构师，专精于将长文转化为结构化的视觉笔记。' : 'You are a Visual Note Architect, expert at transforming long text into structured visual notes.'}

${modeInstruction}

${isZh ? '## 分析步骤' : '## Analysis Steps'}
${isZh ? `
1. **知识点提取**：阅读全文，识别所有核心知识点
2. **数量决策**：统计知识点数量，决定生成几张卡片
3. **内容精炼**：将长句提炼为精华短语（每个关键词≤8字）
4. **结构输出**：按格式输出JSON
` : `
1. **Extract Knowledge Points**: Read the text, identify all core points
2. **Quantity Decision**: Count points, decide how many cards to generate
3. **Content Refinement**: Distill long sentences into essence (keywords ≤8 chars)
4. **Structured Output**: Output JSON in the required format
`}

${isZh ? '## 输出规则' : '## Output Rules'}
${isZh ? `
- 每张卡片最多4个Section（密度红线）
- 标题精炼（≤10字）
- 每个Section的summary是精炼后的内容（≤50字），不是原文截取
- keywords是金句短语，每个≤8字
` : `
- Max 4 sections per card (density limit)
- Title should be concise (≤10 words)
- Each section summary is refined content (≤50 words), not raw text
- Keywords are golden phrases, each ≤8 chars
`}

${isZh ? '## 待分析文本' : '## Text to Analyze'}
"""
${text}
"""

${isZh ? '## 返回格式（严格JSON）' : '## Response Format (strict JSON)'}
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

${isZh ? '只返回JSON，不要任何解释或markdown代码块标记。' : 'Return ONLY the JSON, no explanations or markdown code blocks.'}
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

// 解析AI返回的JSON
function parseAnalysisResult(response) {
  let cleanResponse = response.trim();
  if (cleanResponse.startsWith('```json')) cleanResponse = cleanResponse.slice(7);
  if (cleanResponse.startsWith('```')) cleanResponse = cleanResponse.slice(3);
  if (cleanResponse.endsWith('```')) cleanResponse = cleanResponse.slice(0, -3);
  cleanResponse = cleanResponse.trim();

  const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
  if (jsonMatch) cleanResponse = jsonMatch[0];

  return JSON.parse(cleanResponse);
}

// 转换为LeftBrainData格式
function convertToLeftBrainData(card, totalCards) {
  const subtitle = totalCards > 1 ? ` (${card.cardIndex}/${totalCards})` : '';

  return {
    title: card.cardTitle + subtitle,
    summary_context: card.sections.map(s => s.heading).join('、'),
    visual_theme_keywords: card.sections.flatMap(s => s.keywords).slice(0, 5).join(', '),
    modules: card.sections.map((section, index) => ({
      id: String(index + 1),
      heading: section.heading,
      content: section.summary,
      keywords: section.keywords,
    })),
  };
}

// 生成绘图Prompt（V1模板）
function generateImagePrompt(structure, style, language, signature = '娇姐手绘整理') {
  const styleConfig = styleConfigs[style];
  const sectionCount = structure.modules.length;

  const sectionsPrompt = structure.modules.map((module, index) => {
    const keywords = module.keywords?.slice(0, 3) || [];
    const keywordsStr = keywords.map(k => `"${k}"`).join(' ');
    const goldenPhrase = keywords[0] || module.heading;

    return `
Section ${index + 1}: ${module.heading}
Icon: A cute hand-drawn icon representing "${module.heading}"
${keywordsStr}
Key stat/quote: "${goldenPhrase}"`;
  }).join('\n');

  return `
A cute hand-drawn notebook style infographic showing "${structure.title}".

Main title: "${structure.title}"

${sectionCount} main sections with cute icons:
${sectionsPrompt}

Center connecting element: "${structure.summary_context}" with flowing arrows connecting all sections

Bottom right corner: "${signature}"

Style: ${styleConfig.promptKeywords}
Color palette: ${styleConfig.colorPalette}

Design requirements:
- Hand-drawn sketchy lines with warm, personal feel
- Clear visual hierarchy with the title at top
- Each section has its own cute icon
- Keywords displayed as handwritten labels
- Clean layout that's easy to read
- Aspect ratio: 3:4 (portrait, suitable for mobile)
- Theme: ${structure.visual_theme_keywords}
`.trim();
}

// 生成占位图SVG（用于测试，不调用真正的图像API）
function generatePlaceholderImage(prompt, width = 1024, height = 768) {
  const lines = prompt.split('\n').filter(l => l.trim()).slice(0, 20);
  const textElements = lines.map((line, i) => {
    const y = 80 + i * 25;
    const truncatedLine = line.length > 60 ? line.substring(0, 57) + '...' : line;
    const escapedLine = truncatedLine
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    return `<text x="40" y="${y}" fill="#333" font-size="14" font-family="monospace">${escapedLine}</text>`;
  }).join('\n');

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="#f5f5dc"/>
  <text x="40" y="40" fill="#666" font-size="20" font-weight="bold">📝 Prompt Preview (占位图)</text>
  ${textElements}
  <rect x="20" y="20" width="${width - 40}" height="${height - 40}" fill="none" stroke="#ccc" stroke-width="2" stroke-dasharray="5,5"/>
</svg>`.trim();

  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
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

async function runFullFlowTest() {
  console.log('='.repeat(70));
  console.log('NoteDraw V2 完整流程测试');
  console.log('='.repeat(70));
  console.log('');

  const config = {
    inputText: testText,
    language: 'zh',
    visualStyle: 'sketch',
    generateMode: 'detailed',
  };

  console.log(`配置：`);
  console.log(`  语言: ${config.language}`);
  console.log(`  风格: ${config.visualStyle}`);
  console.log(`  模式: ${config.generateMode}`);
  console.log(`  文本长度: ${config.inputText.length} 字符`);
  console.log('');

  try {
    // Step 1: 拆解Agent
    console.log('--- Step 1: 拆解Agent ---');
    console.log('调用GLM分析文本...');

    const prompt = getAnalyzePrompt(config.inputText, config.language, config.generateMode);
    const response = await callGLM(prompt);
    const analysisResult = parseAnalysisResult(response);

    console.log(`✅ 分析完成: ${analysisResult.totalKnowledgePoints} 个知识点, ${analysisResult.cards.length} 张卡片`);
    console.log('');

    // Step 2: 转换为结构化数据
    console.log('--- Step 2: 转换结构 ---');
    const structures = analysisResult.cards.map(card =>
      convertToLeftBrainData(card, analysisResult.cards.length)
    );

    console.log(`✅ 生成 ${structures.length} 个结构化数据`);
    structures.forEach((s, i) => {
      console.log(`  卡片${i + 1}: "${s.title}" (${s.modules.length} 个模块)`);
    });
    console.log('');

    // Step 3: Prompt构建Agent
    console.log('--- Step 3: Prompt构建Agent ---');
    const prompts = structures.map(s => generateImagePrompt(s, config.visualStyle, config.language));

    console.log(`✅ 生成 ${prompts.length} 个绘图Prompt`);
    prompts.forEach((p, i) => {
      console.log(`  Prompt ${i + 1} (前100字): ${p.substring(0, 100).replace(/\n/g, ' ')}...`);
    });
    console.log('');

    // Step 4: 生成占位图
    console.log('--- Step 4: 生成占位图 ---');
    const images = prompts.map(p => generatePlaceholderImage(p));

    console.log(`✅ 生成 ${images.length} 个占位图`);
    images.forEach((img, i) => {
      console.log(`  图片${i + 1}: ${img.substring(0, 50)}...`);
    });
    console.log('');

    // 最终结果
    console.log('='.repeat(70));
    console.log('✅ 完整流程测试通过！');
    console.log('='.repeat(70));
    console.log('');
    console.log('生成的NoteUnits:');

    const units = structures.map((structure, index) => ({
      id: `test-${index}`,
      order: index,
      originalText: config.inputText,
      structure,
      prompt: prompts[index],
      imageUrl: images[index],
      status: 'completed',
    }));

    units.forEach((unit, i) => {
      console.log(`\n--- Unit ${i + 1} ---`);
      console.log(`ID: ${unit.id}`);
      console.log(`标题: ${unit.structure.title}`);
      console.log(`模块数: ${unit.structure.modules.length}`);
      console.log(`状态: ${unit.status}`);
    });

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error(error.stack);
  }
}

runFullFlowTest();
