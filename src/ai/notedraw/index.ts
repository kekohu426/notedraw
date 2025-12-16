/**
 * NoteDraw AI Module
 * 统一导出和主生成流程
 *
 * 架构说明：
 * 1. 拆解Agent (organizer.ts) - 分析文本，提取知识点，决定卡片数量
 * 2. Prompt构建Agent (designer.ts + prompts.ts) - 将结构化数据转换为绘图指令
 * 3. 生图Agent (painter.ts) - 调用图像生成API
 */

// 类型导出
export * from './types';

// 风格配置导出
export { VISUAL_STYLES, getStyleConfig, getAllStyles, getDefaultStyle } from './styles';

// 三角色模块导出
export { organize } from './organizer';
export { designPrompt, designPrompts, optimizePromptForStyle } from './designer';
export { paint, paintBatch, base64ToDataUrl } from './painter';

// 导入用于主流程
import { organize } from './organizer';
import { designPrompt } from './designer';
import { paint, base64ToDataUrl } from './painter';
import type {
  GenerateRequest,
  NoteUnit,
  CardStatus,
  VisualStyle,
  Language,
  GenerateMode,
  AIConfig,
  ImageModel,
  APIProvider,
  CustomProviderConfig,
  LeftBrainData,
} from './types';

/**
 * 生成进度回调
 */
export interface GenerateProgressCallback {
  onStageChange?: (stage: string, message: string) => void;
  onUnitStart?: (unitIndex: number, totalUnits: number) => void;
  onUnitComplete?: (unitIndex: number, unit: NoteUnit) => void;
  onError?: (error: string) => void;
}

/**
 * 开发模式：是否使用占位图代替真实生图
 * 通过环境变量 USE_PLACEHOLDER_IMAGE=true 控制
 * 生产环境默认调用真实图像API
 */
const USE_PLACEHOLDER_IMAGE = process.env.USE_PLACEHOLDER_IMAGE === 'true';

/**
 * 生成占位图（显示Prompt内容）
 */
function generatePlaceholderImage(prompt: string, title: string): string {
  // 返回一个SVG占位图，显示Prompt预览
  const escapedPrompt = prompt
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .substring(0, 500);

  const escapedTitle = title
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="768" height="1024" viewBox="0 0 768 1024">
  <defs>
    <style>
      .bg { fill: #f8f9fa; }
      .title { font-family: system-ui, sans-serif; font-size: 24px; font-weight: bold; fill: #1a1a2e; }
      .label { font-family: system-ui, sans-serif; font-size: 14px; fill: #6c757d; }
      .prompt { font-family: monospace; font-size: 12px; fill: #495057; }
      .border { fill: none; stroke: #dee2e6; stroke-width: 2; }
      .badge { fill: #e9ecef; }
      .badge-text { font-family: system-ui, sans-serif; font-size: 12px; fill: #495057; }
    </style>
  </defs>
  <rect class="bg" width="768" height="1024"/>
  <rect class="border" x="20" y="20" width="728" height="984" rx="12"/>

  <!-- Header -->
  <rect class="badge" x="40" y="40" width="120" height="28" rx="4"/>
  <text class="badge-text" x="100" y="59" text-anchor="middle">Prompt Preview</text>

  <!-- Title -->
  <text class="title" x="40" y="110">${escapedTitle}</text>

  <!-- Prompt Content -->
  <text class="label" x="40" y="150">Generated Prompt:</text>
  <foreignObject x="40" y="165" width="688" height="800">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: monospace; font-size: 13px; color: #495057; white-space: pre-wrap; word-wrap: break-word; line-height: 1.6; padding: 16px; background: #fff; border-radius: 8px; border: 1px solid #dee2e6;">
${escapedPrompt}${prompt.length > 500 ? '...' : ''}
    </div>
  </foreignObject>
</svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

/**
 * 主生成流程
 * 整合三角色：Organizer → Designer → Painter
 */
export async function generate(
  request: GenerateRequest,
  callback?: GenerateProgressCallback
): Promise<NoteUnit[]> {
  const { inputText, language, visualStyle, generateMode, aiConfig, signature } = request;
  const mode: GenerateMode = generateMode || 'detailed';
  const imageModel: ImageModel = aiConfig?.imageModel || 'gpt-4o-image';
  const apiProvider: APIProvider = aiConfig?.apiProvider || 'apimart';
  const customProvider: CustomProviderConfig | undefined = aiConfig?.customProvider;
  const units: NoteUnit[] = [];

  try {
    // Step 1: Organizer - 分析文本，提取知识点，决定卡片数量
    callback?.onStageChange?.('organizing', 'Analyzing and structuring your content...');

    console.log('[Generate] Step 1: Calling organize...');
    const organizeResult = await organize(inputText, language, { mode });

    console.log(`[Generate] Organize result: ${organizeResult.totalKnowledgePoints} knowledge points, ${organizeResult.structures.length} cards`);

    // 初始化所有单元
    for (let i = 0; i < organizeResult.structures.length; i++) {
      const structure = organizeResult.structures[i];
      units.push({
        id: `unit-${Date.now()}-${i}`,
        order: i,
        originalText: inputText, // 使用完整文本作为原文
        structure,
        status: 'pending' as CardStatus,
      });
    }

    // Step 2 & 3: Designer + Painter - 为每个单元生成图像
    callback?.onStageChange?.('designing', 'Designing visual layouts...');

    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      callback?.onUnitStart?.(i, units.length);

      try {
        // Designer: 生成 Prompt
        unit.status = 'generating';
        const { prompt, negativePrompt } = designPrompt(
          unit.structure!,
          visualStyle,
          language,
          mode,
          signature
        );
        unit.prompt = prompt;

        console.log(`[Generate] Card ${i + 1} prompt generated (${prompt.length} chars)`);

        // Painter: 生成图像
        callback?.onStageChange?.('painting', `Creating visual note ${i + 1} of ${units.length}...`);

        if (USE_PLACEHOLDER_IMAGE) {
          // 开发模式：使用占位图
          console.log('[Generate] Using placeholder image (dev mode)');
          unit.imageUrl = generatePlaceholderImage(prompt, unit.structure?.title || 'Visual Note');
          unit.status = 'completed';
        } else {
          // 生产模式：调用真实API
          const paintResult = await paint({
            prompt,
            negativePrompt,
            imageModel,
            apiProvider,
            customProvider,
          });

          if (paintResult.success) {
            if (paintResult.imageBase64) {
              unit.imageUrl = base64ToDataUrl(paintResult.imageBase64);
            } else if (paintResult.imageUrl) {
              unit.imageUrl = paintResult.imageUrl;
            }
            unit.status = 'completed';
          } else {
            unit.status = 'failed';
            unit.errorMessage = paintResult.errorMessage;
          }
        }
      } catch (error) {
        unit.status = 'failed';
        unit.errorMessage = error instanceof Error ? error.message : 'Unknown error';
        callback?.onError?.(unit.errorMessage);
      }

      callback?.onUnitComplete?.(i, unit);
    }

    callback?.onStageChange?.('done', 'All visual notes generated!');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Generate] Error:', errorMessage);
    callback?.onError?.(errorMessage);

    // 标记所有未完成的单元为失败
    for (const unit of units) {
      if (unit.status === 'pending' || unit.status === 'generating') {
        unit.status = 'failed';
        unit.errorMessage = errorMessage;
      }
    }
  }

  return units;
}

/**
 * 重新生成单个卡片
 */
export async function regenerateUnit(
  unit: NoteUnit,
  visualStyle: VisualStyle,
  language: Language,
  aiConfig?: AIConfig
): Promise<NoteUnit> {
  if (!unit.structure) {
    throw new Error('Unit has no structure data');
  }

  const mode: GenerateMode = 'detailed'; // 重新生成使用详细模式
  const { prompt, negativePrompt } = designPrompt(unit.structure, visualStyle, language, mode);
  unit.prompt = prompt;
  unit.status = 'generating';

  if (USE_PLACEHOLDER_IMAGE) {
    // 开发模式：使用占位图
    unit.imageUrl = generatePlaceholderImage(prompt, unit.structure?.title || 'Visual Note');
    unit.status = 'completed';
    unit.errorMessage = undefined;
  } else {
    // 生产模式：调用真实API
    const imageModel: ImageModel = aiConfig?.imageModel || 'gpt-4o-image';
    const apiProvider: APIProvider = aiConfig?.apiProvider || 'apimart';
    const customProvider: CustomProviderConfig | undefined = aiConfig?.customProvider;

    const paintResult = await paint({
      prompt,
      negativePrompt,
      imageModel,
      apiProvider,
      customProvider,
    });

    if (paintResult.success) {
      if (paintResult.imageBase64) {
        unit.imageUrl = base64ToDataUrl(paintResult.imageBase64);
      } else if (paintResult.imageUrl) {
        unit.imageUrl = paintResult.imageUrl;
      }
      unit.status = 'completed';
      unit.errorMessage = undefined;
    } else {
      unit.status = 'failed';
      unit.errorMessage = paintResult.errorMessage;
    }
  }

  return unit;
}
