#!/bin/bash

# ============================================================
# SEO 自动化检查脚本
# 用于验证网站的 SEO 基础配置是否正确
# ============================================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 默认检查的 URL
BASE_URL="${1:-http://localhost:3000}"

echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE}  SEO 检查脚本 - NoteDraw${NC}"
echo -e "${BLUE}  检查地址: ${BASE_URL}${NC}"
echo -e "${BLUE}=====================================================${NC}"
echo ""

# 计数器
PASSED=0
FAILED=0
WARNINGS=0

# 检查函数
check_pass() {
    echo -e "${GREEN}✓ $1${NC}"
    ((PASSED++))
}

check_fail() {
    echo -e "${RED}✗ $1${NC}"
    ((FAILED++))
}

check_warn() {
    echo -e "${YELLOW}⚠ $1${NC}"
    ((WARNINGS++))
}

# ============================================================
# 1. 检查首页
# ============================================================
echo -e "${BLUE}[1/5] 检查首页 SEO...${NC}"

# 获取首页 HTML
HOME_HTML=$(curl -s "${BASE_URL}")

# 检查 <title>
if echo "$HOME_HTML" | grep -q "<title>"; then
    TITLE=$(echo "$HOME_HTML" | grep -o '<title>[^<]*</title>' | head -1 | sed 's/<[^>]*>//g')
    if [[ "$TITLE" == *"undefined"* ]] || [[ -z "$TITLE" ]]; then
        check_fail "首页 title 为空或包含 undefined: $TITLE"
    else
        check_pass "首页 title: $TITLE"
    fi
else
    check_fail "首页缺少 <title> 标签"
fi

# 检查 <meta name="description">
if echo "$HOME_HTML" | grep -q 'meta name="description"'; then
    DESC=$(echo "$HOME_HTML" | grep -o 'meta name="description" content="[^"]*"' | head -1 | sed 's/.*content="\([^"]*\)".*/\1/')
    if [[ "$DESC" == *"undefined"* ]] || [[ -z "$DESC" ]]; then
        check_fail "首页 description 为空或包含 undefined"
    else
        check_pass "首页 description 已设置 (${#DESC} 字符)"
    fi
else
    check_fail "首页缺少 <meta name=\"description\">"
fi

# 检查 canonical
if echo "$HOME_HTML" | grep -q 'rel="canonical"'; then
    CANONICAL=$(echo "$HOME_HTML" | grep -o 'link rel="canonical" href="[^"]*"' | head -1 | sed 's/.*href="\([^"]*\)".*/\1/')
    if [[ "$CANONICAL" == *"?"* ]]; then
        check_warn "canonical URL 包含查询参数: $CANONICAL"
    else
        check_pass "首页 canonical: $CANONICAL"
    fi
else
    check_warn "首页缺少 canonical 标签"
fi

# 检查 <h1>
if echo "$HOME_HTML" | grep -q "<h1"; then
    check_pass "首页包含 <h1> 标签"
else
    check_fail "首页缺少 <h1> 标签"
fi

# 检查 JSON-LD
if echo "$HOME_HTML" | grep -q 'application/ld+json'; then
    check_pass "首页包含 JSON-LD 结构化数据"
else
    check_warn "首页缺少 JSON-LD 结构化数据"
fi

echo ""

# ============================================================
# 2. 检查 robots.txt
# ============================================================
echo -e "${BLUE}[2/5] 检查 robots.txt...${NC}"

ROBOTS=$(curl -s "${BASE_URL}/robots.txt")

if [[ -n "$ROBOTS" ]]; then
    check_pass "robots.txt 存在"

    if echo "$ROBOTS" | grep -q "Sitemap:"; then
        check_pass "robots.txt 包含 Sitemap 链接"
    else
        check_warn "robots.txt 缺少 Sitemap 链接"
    fi

    if echo "$ROBOTS" | grep -q "User-agent:"; then
        check_pass "robots.txt 包含 User-agent 规则"
    else
        check_warn "robots.txt 缺少 User-agent 规则"
    fi
else
    check_fail "robots.txt 不存在或为空"
fi

echo ""

# ============================================================
# 3. 检查 sitemap.xml
# ============================================================
echo -e "${BLUE}[3/5] 检查 sitemap.xml...${NC}"

SITEMAP=$(curl -s "${BASE_URL}/sitemap.xml")

if [[ -n "$SITEMAP" ]] && echo "$SITEMAP" | grep -q "<urlset"; then
    check_pass "sitemap.xml 存在且格式正确"

    # 统计 URL 数量
    URL_COUNT=$(echo "$SITEMAP" | grep -c "<loc>")
    check_pass "sitemap.xml 包含 $URL_COUNT 个 URL"

    # 检查 hreflang
    if echo "$SITEMAP" | grep -q "hreflang"; then
        check_pass "sitemap.xml 包含 hreflang 标签"
    else
        check_warn "sitemap.xml 缺少 hreflang 标签"
    fi
else
    check_fail "sitemap.xml 不存在或格式错误"
fi

echo ""

# ============================================================
# 4. 检查博客页面（如果存在）
# ============================================================
echo -e "${BLUE}[4/5] 检查博客页面...${NC}"

BLOG_HTML=$(curl -s "${BASE_URL}/blog" 2>/dev/null)

if [[ -n "$BLOG_HTML" ]] && echo "$BLOG_HTML" | grep -q "<title>"; then
    check_pass "博客页面可访问"

    # 检查文章链接
    if echo "$BLOG_HTML" | grep -q 'href="/blog/\|href="/en/blog/\|href="/zh/blog/'; then
        check_pass "博客页面包含文章链接"
    else
        check_warn "博客页面可能没有文章"
    fi
else
    check_warn "博客页面不存在或无法访问"
fi

echo ""

# ============================================================
# 5. 检查 Open Graph 标签
# ============================================================
echo -e "${BLUE}[5/5] 检查 Open Graph 标签...${NC}"

# 检查 og:title
if echo "$HOME_HTML" | grep -q 'property="og:title"'; then
    check_pass "首页包含 og:title"
else
    check_warn "首页缺少 og:title"
fi

# 检查 og:description
if echo "$HOME_HTML" | grep -q 'property="og:description"'; then
    check_pass "首页包含 og:description"
else
    check_warn "首页缺少 og:description"
fi

# 检查 og:image
if echo "$HOME_HTML" | grep -q 'property="og:image"'; then
    OG_IMAGE=$(echo "$HOME_HTML" | grep -o 'property="og:image" content="[^"]*"' | head -1 | sed 's/.*content="\([^"]*\)".*/\1/')
    check_pass "首页包含 og:image: $OG_IMAGE"
else
    check_warn "首页缺少 og:image"
fi

# 检查 twitter:card
if echo "$HOME_HTML" | grep -q 'name="twitter:card"'; then
    check_pass "首页包含 twitter:card"
else
    check_warn "首页缺少 twitter:card"
fi

echo ""

# ============================================================
# 总结
# ============================================================
echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE}  检查完成${NC}"
echo -e "${BLUE}=====================================================${NC}"
echo ""
echo -e "  ${GREEN}通过: $PASSED${NC}"
echo -e "  ${RED}失败: $FAILED${NC}"
echo -e "  ${YELLOW}警告: $WARNINGS${NC}"
echo ""

if [[ $FAILED -gt 0 ]]; then
    echo -e "${RED}存在 $FAILED 个问题需要修复！${NC}"
    exit 1
elif [[ $WARNINGS -gt 0 ]]; then
    echo -e "${YELLOW}有 $WARNINGS 个建议优化项${NC}"
    exit 0
else
    echo -e "${GREEN}所有检查通过！${NC}"
    exit 0
fi
