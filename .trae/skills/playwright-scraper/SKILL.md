---
name: "playwright-scraper"
description: "Scrapes dynamic web pages with Playwright and returns structured data. Invoke when pages require JS rendering, login/session handling, pagination, or resilient extraction workflows."
---

# Playwright Scraper

本技能用于通过 Playwright 抓取动态网页内容，并输出结构化结果。

## Language Policy (Chinese First)

- 默认使用简体中文输出。
- 用户明确要求其他语言时，切换到用户指定语言。
- 关键术语首次可中英并列，后续以中文为主。

## Invoke When

- 用户需要抓取依赖 JavaScript 渲染的页面数据。
- 用户需要处理登录态、Cookie、分页、懒加载、无限滚动。
- 用户需要从复杂 DOM 中稳定提取字段并导出 JSON/CSV。
- 用户需要可复现的抓取流程与错误重试策略。

## Inputs

- 目标网址与抓取范围
- 字段定义（名称、选择器、类型）
- 抓取规则（翻页、去重、时间范围、终止条件）
- 认证方式（账号、Cookie、Token）

## Outputs

- 抓取流程说明（步骤与边界）
- 结构化数据结果（JSON/CSV）
- 关键选择器与提取规则
- 失败样本与错误原因
- 重试与反脆弱建议

## 默认输出字段模板

- 默认字段：`title` / `url` / `date` / `content` / `source`
- 适用场景：新闻、公告、博客、知识库、活动页等通用内容抓取
- 字段要求：
  - `title`：页面标题或内容主标题（字符串）
  - `url`：详情页完整链接（字符串，绝对 URL）
  - `date`：发布时间或更新时间（字符串，建议 ISO 8601 或 `YYYY-MM-DD`）
  - `content`：正文文本（字符串，尽量去除导航/广告等噪音）
  - `source`：来源站点或发布方（字符串）
- 缺失字段处理：若字段无法提取，返回空字符串 `""`，不要省略字段

### JSON 示例

```json
[
  {
    "title": "示例标题",
    "url": "https://example.com/article/123",
    "date": "2026-04-01",
    "content": "这里是正文内容摘要或清洗后的正文文本。",
    "source": "Example News"
  }
]
```

## Workflow

1. 明确目标字段、分页策略与终止条件。
2. 先做单页提取验证，确认选择器稳定性。
3. 加入登录、翻页、等待策略与异常重试。
4. 批量抓取并去重、清洗、标准化。
5. 输出结果并附质量检查摘要。

## Constraints

- 不抓取用户禁止或不合规的数据。
- 优先稳健性，避免依赖脆弱选择器。
- 避免高频请求，控制并发与重试间隔。
- 不在输出中泄露账号、Cookie、Token 等敏感信息。
