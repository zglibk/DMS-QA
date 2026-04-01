---
name: "diagram-generator"
description: "Generates architecture and flow diagrams from requirements or code context. Invoke when users ask for system diagrams, process flows, sequence diagrams, or relationship visualization."
---

# Diagram Generator

本技能用于根据需求说明、业务流程或代码结构，生成清晰可落地的图表设计输出。

## Language Policy (Chinese First)

- 默认使用简体中文输出说明。
- 用户明确要求其他语言时，切换到用户指定语言。
- 术语首次出现可中英并列，后续以中文为主。

## Invoke When

- 用户要求生成系统架构图、模块关系图、流程图。
- 用户要求生成时序图、数据流图、状态流转图。
- 用户要求把现有文档或代码结构可视化。
- 用户要求输出可直接粘贴到 Mermaid/PlantUML 的图表源码。

## Inputs

- 业务背景与目标
- 参与角色与系统边界
- 核心流程步骤与分支
- 模块、服务、数据库、外部依赖

## Outputs

- 图表类型建议与选择理由
- 图表文本说明（可读版）
- Mermaid 或 PlantUML 源码
- 图中元素命名规范与图例
- 校验清单（完整性、一致性、可维护性）

## Format Preference

- 默认优先输出 Mermaid 源码。
- 当用户明确要求 PlantUML 时，切换为 PlantUML 输出。
- 若目标平台不支持 Mermaid，再提供 PlantUML 作为备选。

## Workflow

1. 识别目标：展示结构、流程、时序还是状态。
2. 抽取实体：角色、模块、数据对象、接口。
3. 建立关系：调用、依赖、输入输出、条件分支。
4. 生成图稿：先简版，再补充关键细节。
5. 输出源码：提供 Mermaid/PlantUML 可直接复用版本。
6. 质量检查：确保与需求一致且命名统一。

## Constraints

- 优先复用项目既有术语与模块命名。
- 避免过度细节导致图不可读。
- 不编造不存在的系统组件或流程节点。
