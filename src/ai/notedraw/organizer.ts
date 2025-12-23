/**
 * NoteDraw Organizer (拆解Agent)
 * 负责分析文本，提取知识点，决定生成几张图
 *
 * 核心逻辑：
 * - 按知识点数量决定图片数
 * - ≤4个知识点 = 1张图
 * - >4个知识点 = 多张图，每张≤4个Section
 */

import type { Language, LeftBrainData, GenerateMode } from './types';
import { TEXT_LIMITS, CARD_LIMITS } from '@/config/notedraw';

// GLM API 配置
const GLM_API_KEY = process.env.GLM_API_KEY;
const GLM_BASE_URL = process.env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
const TEXT_MODEL = 'glm-4-flash';

/**
 * 直接调用GLM API（AI SDK与GLM不兼容，改用直接fetch）
 */
async function callGLM(prompt: string): Promise<string> {
  if (!GLM_API_KEY) {
    throw new Error('GLM_API_KEY is not set');
  }

  const response = await fetch(`${GLM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: TEXT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GLM API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * 拆解Agent的系统提示词
 * 参考V1的Visual Note Architect
 */
function getAnalyzePrompt(text: string, language: Language, mode: GenerateMode): string {
  const isZh = language === 'zh';

  // 精简模式：强制输出1张卡片
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
3. **内容重组**：将原文重组为多个完整短句，用分号分隔
4. **结构输出**：按格式输出JSON
` : `
1. **Extract Knowledge Points**: Read the text, identify all core points
2. **Quantity Decision**: Count points, decide how many cards to generate
3. **Content Restructure**: Reorganize into complete short sentences, separated by semicolons
4. **Structured Output**: Output JSON in the required format
`}

${isZh ? '## 输出规则（视觉笔记专家标准）' : '## Output Rules (Visual Note Expert Standard)'}

${isZh ? `
- 每张卡片最多4个Section

**【视觉笔记三要素】**

1. **heading（标题）**：≤8字，精炼概括
   - ✅ "RAG检索增强"、"V2EX引流"
   - ❌ "关于如何使用RAG技术进行检索增强的方法"

2. **keywords（关键短语）**：2-3个可理解的短语，每个5-10字
   - 这是图片上显示的核心内容！
   - 必须是"能看懂"的短语，不是单词
   - ✅ ["检索相关文档", "增强上下文", "生成准确回答"]
   - ❌ ["检索", "增强", "生成"]

3. **summary（详细说明）**：30-50字，2-3个完整句子
   - 用于编辑时参考，不会显示在图片上
   - ✅ "先从知识库检索相关文档；然后将文档作为上下文增强提示词；最后生成更准确的回答。"
` : `
- Max 4 sections per card

**[Visual Note Three Elements]**

1. **heading (title)**: ≤8 words, concise summary
   - ✅ "RAG Retrieval", "V2EX Traffic"
   - ❌ "How to use RAG technology for retrieval augmentation methods"

2. **keywords (key phrases)**: 2-3 understandable phrases, each 5-10 words
   - This is the core content displayed on the image!
   - Must be "understandable" phrases, not single words
   - ✅ ["Retrieve relevant docs", "Enhance context", "Generate accurate answer"]
   - ❌ ["Retrieve", "Enhance", "Generate"]

3. **summary (detailed description)**: 30-50 chars, 2-3 complete sentences
   - For reference during editing, NOT displayed on the image
   - ✅ "First retrieve relevant docs from knowledge base; then enhance prompt with docs as context; finally generate more accurate answers."
`}

${isZh ? '## 待分析文本' : '## Text to Analyze'}
"""
${text}
"""

${isZh ? '## 返回格式（严格JSON）' : '## Response Format (strict JSON)'}

${isZh ? `
**重要提示**：所有 heading、keywords 和 summary 都必须使用中文。

示例格式：
` : `
**IMPORTANT**: All heading, keywords, and summary MUST be in English.

Example format:
`}

\`\`\`json
{
  "totalKnowledgePoints": 4,
  "cards": [
    {
      "cardIndex": 1,
      "cardTitle": ${isZh ? '"RAG检索增强生成"' : '"RAG Retrieval Augmented Generation"'},
      "sections": [
        {
          "heading": ${isZh ? '"检索阶段"' : '"Retrieval Stage"'},
          "keywords": ${isZh ? '["从知识库检索文档", "匹配用户问题", "返回相关片段"]' : '["Retrieve docs from knowledge base", "Match user query", "Return relevant chunks"]'},
          "summary": ${isZh ? '"先根据用户问题从知识库中检索相关文档；通过语义匹配找到最相关的内容片段。"' : '"First retrieve relevant documents from knowledge base based on user query; find most relevant content chunks through semantic matching."'}
        },
        {
          "heading": ${isZh ? '"增强阶段"' : '"Enhancement Stage"'},
          "keywords": ${isZh ? '["文档作为上下文", "增强提示词", "提供背景信息"]' : '["Docs as context", "Enhance prompt", "Provide background info"]'},
          "summary": ${isZh ? '"将检索到的文档作为上下文加入提示词；为模型提供准确的背景信息参考。"' : '"Add retrieved documents as context to prompt; provide accurate background information for the model."'}
        },
        {
          "heading": ${isZh ? '"生成阶段"' : '"Generation Stage"'},
          "keywords": ${isZh ? '["基于上下文生成", "回答更准确", "减少幻觉"]' : '["Generate from context", "More accurate answers", "Reduce hallucinations"]'},
          "summary": ${isZh ? '"模型基于增强后的上下文生成回答；有了真实资料支撑，回答更准确可靠。"' : '"Model generates answers based on enhanced context; with real data support, answers are more accurate and reliable."'}
        }
      ]
    }
  ]
}
\`\`\`

${isZh ? '只返回JSON，不要任何解释或markdown代码块标记。' : 'Return ONLY the JSON, no explanations or markdown code blocks.'}
`.trim();
}

/**
 * 解析AI返回的JSON
 */
function parseAnalysisResult(response: string): {
  totalKnowledgePoints: number;
  cards: Array<{
    cardIndex: number;
    cardTitle: string;
    sections: Array<{
      heading: string;
      summary: string;
      keywords: string[];
    }>;
  }>;
} {
  // 清理响应
  let cleanResponse = response.trim();

  // 移除可能的markdown代码块
  if (cleanResponse.startsWith('```json')) {
    cleanResponse = cleanResponse.slice(7);
  }
  if (cleanResponse.startsWith('```')) {
    cleanResponse = cleanResponse.slice(3);
  }
  if (cleanResponse.endsWith('```')) {
    cleanResponse = cleanResponse.slice(0, -3);
  }
  cleanResponse = cleanResponse.trim();

  // 尝试提取JSON对象
  const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleanResponse = jsonMatch[0];
  }

  return JSON.parse(cleanResponse);
}

/**
 * 将解析结果转换为LeftBrainData格式
 */
function convertToLeftBrainData(
  card: {
    cardIndex: number;
    cardTitle: string;
    sections: Array<{
      heading: string;
      summary: string;
      keywords: string[];
    }>;
  },
  totalCards: number
): LeftBrainData {
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

/**
 * 组织选项
 */
export interface OrganizeOptions {
  /** 生成模式：compact=精简模式（1张图），detailed=详细模式（可能多张） */
  mode?: GenerateMode;
}

/**
 * 拆解Agent主函数
 * 分析文本，返回结构化数据
 */
export async function organize(
  inputText: string,
  language: Language,
  options?: OrganizeOptions
): Promise<{
  totalKnowledgePoints: number;
  structures: LeftBrainData[];
  rawAnalysis: unknown;
}> {
  // 验证输入
  if (!inputText || inputText.trim().length === 0) {
    throw new Error('Input text is empty');
  }

  if (inputText.length > TEXT_LIMITS.MAX_INPUT_LENGTH) {
    throw new Error(`Text too long. Maximum ${TEXT_LIMITS.MAX_INPUT_LENGTH} characters allowed.`);
  }

  const text = inputText.trim();
  const mode = options?.mode || 'detailed';

  console.log(`[Organizer] Starting analysis, mode: ${mode}, text length: ${text.length}`);

  // 开发占位模式：跳过真实API调用，返回模拟数据
  if (process.env.DEV_PLACEHOLDER_MODE === 'true') {
    console.log('[Organizer] DEV_PLACEHOLDER_MODE: returning mock analysis data');

    // 根据文本长度决定生成几张卡片
    const cardCount = text.length > 500 ? 2 : 1;
    const mockStructures: LeftBrainData[] = [];

    for (let i = 0; i < cardCount; i++) {
      mockStructures.push({
        title: language === 'zh'
          ? `开发模式卡片 ${i + 1}/${cardCount}`
          : `Dev Mode Card ${i + 1}/${cardCount}`,
        summary_context: language === 'zh'
          ? `这是开发占位模式生成的模拟数据。原文长度: ${text.length}字符`
          : `This is mock data from dev placeholder mode. Input length: ${text.length} chars`,
        visual_theme_keywords: 'development, placeholder, mock, test',
        modules: [
          {
            id: '1',
            heading: language === 'zh' ? '模拟知识点 1' : 'Mock Point 1',
            content: text.substring(0, Math.min(100, text.length)) + (text.length > 100 ? '...' : ''),
            keywords: ['mock', 'dev', 'test'],
          },
          {
            id: '2',
            heading: language === 'zh' ? '模拟知识点 2' : 'Mock Point 2',
            content: language === 'zh'
              ? '开发模式下不调用真实AI API'
              : 'Real AI API is not called in dev mode',
            keywords: ['placeholder', 'development'],
          },
        ],
      });
    }

    return {
      totalKnowledgePoints: cardCount * 2,
      structures: mockStructures,
      rawAnalysis: { devMode: true, inputLength: text.length },
    };
  }

  try {
    // 调用GLM分析
    const response = await callGLM(getAnalyzePrompt(text, language, mode));

    console.log('[Organizer] Raw AI response:', response.substring(0, 500) + '...');

    // 解析结果
    const analysisResult = parseAnalysisResult(response);

    console.log(`[Organizer] Parsed: ${analysisResult.totalKnowledgePoints} knowledge points, ${analysisResult.cards.length} cards`);

    // 验证结果
    if (!analysisResult.cards || analysisResult.cards.length === 0) {
      throw new Error('No cards generated');
    }

    // 转换为LeftBrainData格式
    const structures = analysisResult.cards.map(card =>
      convertToLeftBrainData(card, analysisResult.cards.length)
    );

    return {
      totalKnowledgePoints: analysisResult.totalKnowledgePoints,
      structures,
      rawAnalysis: analysisResult,
    };

  } catch (error) {
    console.error('[Organizer] Analysis error:', error);

    // 返回fallback结构（但不是原文截取，而是提示错误）
    return {
      totalKnowledgePoints: 0,
      structures: [{
        title: language === 'zh' ? '分析失败' : 'Analysis Failed',
        summary_context: language === 'zh' ? '请重试或简化输入内容' : 'Please retry or simplify input',
        visual_theme_keywords: 'error, retry',
        modules: [{
          id: '1',
          heading: language === 'zh' ? '错误信息' : 'Error Info',
          content: error instanceof Error ? error.message : 'Unknown error',
          keywords: [],
        }],
      }],
      rawAnalysis: null,
    };
  }
}

