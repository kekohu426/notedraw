# SEO 验收手册（小白版）

> 这份手册教你如何验证网站的 SEO 配置是否正确，不需要任何技术背景。

---

## 快速检查（3分钟搞定）

### 方法一：运行自动检查脚本

在终端运行以下命令：

```bash
# 先启动项目
cd /Users/keko/Downloads/notedraw/mksaas-template-main
pnpm dev

# 新开一个终端窗口，运行检查脚本
./scripts/check-seo.sh http://localhost:3000
```

看到全是绿色的 ✓ 就说明通过了！

---

## 手动检查（更详细）

如果你想自己动手验证，按照以下步骤操作：

### 第一步：检查 SSR 直出

**目的**：确保搜索引擎能看到网页内容

1. 打开浏览器，访问 `http://localhost:3000`
2. **右键 → 查看网页源代码**（注意：不是按 F12）
3. 按 `Ctrl+F`（Mac 是 `Cmd+F`）搜索以下内容：

| 搜索内容 | 通过标准 |
|----------|----------|
| `<h1` | 能找到，且标签里有实际文字 |
| `<title>` | 能找到，显示 "NoteDraw - AI Visual Note Generator" |
| `<meta name="description"` | 能找到，有描述文字 |

❌ **失败情况**：
- 搜不到 `<h1>`
- title 或 description 显示 "undefined"
- 页面内容是空的，只有一堆 JavaScript 代码

### 第二步：检查 Canonical 标签

**目的**：确保搜索引擎知道"这是正版URL"

1. 在网页源代码中搜索 `canonical`
2. 你应该看到类似这样的代码：
   ```html
   <link rel="canonical" href="https://notedraw.com/" />
   ```

✅ **通过标准**：
- href 里的网址没有 `?` 和后面的参数
- 网址以 `/` 结尾或者是干净的路径

❌ **失败情况**：
- href 包含 `?utm_source=xxx` 这类参数
- 找不到 canonical 标签

### 第三步：检查 Sitemap

**目的**：确保搜索引擎能找到所有重要页面

1. 在浏览器中访问 `http://localhost:3000/sitemap.xml`
2. 你应该看到一个 XML 文件，里面有很多 `<url>` 标签

✅ **通过标准**：
- 页面能打开，不报错
- 能看到网站的各种页面链接
- 每个链接都有 `<loc>` 标签

### 第四步：检查 Robots.txt

**目的**：告诉搜索引擎哪些页面可以爬，哪些不行

1. 在浏览器中访问 `http://localhost:3000/robots.txt`
2. 你应该看到类似这样的内容：
   ```
   User-agent: *
   Allow: /
   Disallow: /api/*
   Disallow: /settings/*

   Sitemap: https://notedraw.com/sitemap.xml
   ```

✅ **通过标准**：
- 页面能打开
- 有 `Sitemap:` 这一行

### 第五步：检查社交分享预览

**目的**：确保分享到微信/Twitter 时有好看的预览图

1. 在网页源代码中搜索 `og:image`
2. 你应该看到类似这样的代码：
   ```html
   <meta property="og:image" content="https://notedraw.com/og.png" />
   ```

✅ **通过标准**：
- 能找到 og:image 标签
- content 里有图片地址

**额外验证**：用这个工具测试分享预览效果
- Twitter: https://cards-dev.twitter.com/validator
- Facebook: https://developers.facebook.com/tools/debug/

### 第六步：检查 JSON-LD 结构化数据

**目的**：让 Google 搜索结果显示更多信息（评分、价格等）

1. 在网页源代码中搜索 `application/ld+json`
2. 你应该看到类似这样的代码块：
   ```html
   <script type="application/ld+json">
   {"@context":"https://schema.org","@type":"Organization"...}
   </script>
   ```

✅ **通过标准**：
- 首页能找到这个 script 标签
- 里面有 `@type` 字段

---

## 常见问题

### Q: 源代码里看不到内容，只有一堆 JavaScript？

这说明页面是"客户端渲染"的，搜索引擎可能看不到内容。需要联系开发者修复。

### Q: title 或 description 显示 "undefined"？

这说明元数据配置有问题，需要检查兜底逻辑。

### Q: sitemap.xml 打开报错？

可能是代码有 bug，需要开发者修复。

### Q: 怎么知道 Google 是否收录了我的网站？

在 Google 搜索框输入：`site:你的域名.com`

如果能搜到结果，说明已经被收录了。

---

## 上线后检查清单

网站上线后，额外做这些检查：

- [ ] 在 Google Search Console 提交 sitemap
- [ ] 用 Google 的"网址检查"工具检查首页
- [ ] 等待 1-2 周，检查收录情况
- [ ] 用 `site:域名` 命令查看收录数量

---

## 需要帮助？

如果发现问题不知道怎么修，把以下信息发给开发者：

1. 问题截图
2. 访问的 URL
3. 你期望看到什么 vs 实际看到什么
