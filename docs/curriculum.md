# 课表：LlamaIndex（RAG 工程化）

> 主线 12 课，全部围绕一个目标：**把检索做对** —— 从「能跑通」到「能用、能落地、能评测」。
> 学员只维护一个项目 `my-llamaindex-app`（Python），每课覆盖式演进（见 `README.md`）。
> 场景：网站内容知识库（markdown 语料 → 带引用的问答）。

---

### 第 1 课 · 最小 RAG 闭环

- **目标**：跑通「读文件 → 建索引 → 查询」，建立 LlamaIndex 的世界观（Document / Node / Index / QueryEngine）
- **示例**：`SimpleDirectoryReader("content")` → `VectorStoreIndex.from_documents(...)` → `index.as_query_engine().query("...")`
- **要点**：`Document` 是原始单位、`Node` 是切块后的单位；`Index` 只是「Node + 向量」的容器；`QueryEngine` = 检索 + 合成；默认走内存向量库（重启即失）
- **验收**：脚本打印出答案 + 命中来源；换一个问题答案跟着变
- **文档**：`/docs/getting_started/starter_example`、`/docs/understanding`

### 第 2 课 · 切块与元数据

- **目标**：切块策略决定检索上限；元数据决定能不能筛
- **示例**：`SentenceSplitter(chunk_size, chunk_overlap)`、`MarkdownNodeParser`、frontmatter → `metadata` 透传
- **要点**：块太大 → 召回后噪声多；太小 → 语义不完整；markdown 要按结构切（标题/代码块/表格不拆开）；`metadata` 要预留可筛字段（目录 / 日期 / 类型）
- **验收**：同一问题在三种切块参数下命中不同，能说出为什么
- **文档**：`/docs/module_guides/loading/node_parsers`、`/docs/optimizing/chunking`

### 第 3 课 · 检索器与过滤

- **目标**：把 `Index` 变成可控的检索器（topK、元数据过滤、返回结构）
- **示例**：`index.as_retriever(similarity_top_k=5, filters=MetadataFilters(...))` + 打印 `NodeWithScore`
- **要点**：`similarity_top_k` 与最终进 prompt 的条数是两件事（中间还有后处理）；相关性分数要打印出来看，别凭感觉；过滤走元数据而不是「检索后再筛」
- **验收**：同一问题加/不加元数据过滤，返回集合可解释
- **文档**：`/docs/module_guides/querying/retriever`

### 第 4 课 · 重排与后处理

- **目标**：召回 → 精排，是 RAG 质量提升性价比最高的一步
- **示例**：`SimilarityPostprocessor(similarity_cutoff)` + `LLMRerank(top_n)`；对比「不重排 / 只过滤 / 过滤 + 重排」
- **要点**：向量召回偏向「语义像」，重排看「能不能回答问题」；阈值过高会丢掉正确答案；LLM 重排有成本和延迟，要说明何时值得
- **验收**：构造一个「向量召回错、重排纠正」的问题，能看到顺序变化
- **文档**：`/docs/module_guides/querying/node_postprocessors`

### 第 5 课 · 混合检索与多查询

- **目标**：关键词 + 语义融合（专有名词/产品名这类语义检索易漏的场景）
- **示例**：`QueryFusionRetriever`（多查询 + RRF）、`BM25Retriever` 与向量检索融合
- **要点**：为什么需要 BM25（专有名词、缩写、精确串）；RRF 是最省事的融合（按排名而非分数）；中文分词要接入 jieba 之类的分词器；**与 `newking` 的 `EnsembleRetriever` 逐条对照**
- **验收**：给一个「语义检索漏、关键词能中」的问题，融合后召回命中
- **文档**：`/docs/examples/retrievers/reciprocal_rerank_fusion`、`/docs/module_guides/querying/retriever/retriever_modes`

### 第 6 课 · 响应合成与引用

- **目标**：从「一段话」升级到「带出处的回答」
- **示例**：`response_mode`（`compact` / `refine` / `tree_summarize`）+ 把 `source_nodes` 映射成 `[1][2]` 引用编号
- **要点**：不同 response_mode 的取舍（成本 / 质量 / 是否会被截断）；回答里必须能指回原文块，否则不可审计；前端渲染引用 = 把 `source_nodes` 的 metadata 传出去（后面第 11 课接得上）
- **验收**：回答带 `[N]`，每个 `[N]` 能对应到具体文件的某一块
- **文档**：`/docs/module_guides/querying/response_synthesizers`

### 第 7 课 · 查询理解与路由

- **目标**：不是所有问题都该走同一条检索路径
- **示例**：`HyDEQueryTransform`（先让模型写假设答案再检索）、`RouterQueryEngine`（按问题类型选索引/引擎）
- **要点**：HyDE 适合短问题、术语不一致的场景；路由的价值是「不同语料用不同索引」；这些都会增加一次模型调用，要算成本
- **验收**：两类问题（事实型 / 汇总型）分别走到不同引擎，日志可验证
- **文档**：`/docs/optimizing/advanced_retrieval/query_transformations`、`/docs/module_guides/querying/router`

### 第 8 课 · 入库流水线与持久化

- **目标**：从「每次重建索引」变成「可增量、可持久、可重跑」
- **示例**：`IngestionPipeline(transformations=[...])` + docstore 去重 + `PGVectorStore`（Postgres + pgvector）+ `persist()`
- **要点**：`docstore` 是增量的关键（按 hash 跳过未变文档）；**表结构差异**（LlamaIndex 自己的表 vs `newking` 的 `chunks` 表）会决定迁移代价；嵌入模型换维度 = 必须重灌
- **验收**：改一篇 md 后重跑，只有该篇被重新切块/向量化（日志与耗时可见）
- **文档**：`/docs/module_guides/loading/ingestion_pipeline`、`/docs/examples/vector_stores/postgres`

### 第 9 课 · 结构化抽取

- **目标**：检索之外的另一半 —— 把非结构化文本变成字段
- **示例**：Pydantic 模型 + `structured_predict` / 抽取程序，给 markdown 自动补 frontmatter（标题 / 摘要 / 标签）
- **要点**：抽取和检索共用同一套 LLM 配置；schema 要小而稳，字段越多越容易失败；抽取结果回写 frontmatter 后，第 3 课的元数据过滤才真正有用
- **验收**：对 5 篇 md 批量抽取，字段完整率可统计
- **文档**：`/docs/module_guides/querying/structured_outputs`

### 第 10 课 · Workflow：事件驱动的流程

- **目标**：把「检索 → 判断 → 再检索 → 合成」写成可维护的流程
- **示例**：LlamaIndex `Workflow`（`@step` + 事件类型）实现：判断是否需要检索 → 检索 → 不足则改写查询再检索 → 合成
- **要点**：**与 LangGraph 的结构对照**（事件驱动 vs 状态机；step 之间传事件 vs 共享状态 + reducer）；什么时候该用哪个（已有 LangGraph 项目不必搬）
- **验收**：构造一个「一次检索不够」的问题，能看到第二次检索被触发
- **文档**：`/docs/module_guides/workflow`

### 第 11 课 · Agent 与工具化检索

- **目标**：把检索器变成 agent 的一个工具，与既有编排对接
- **示例**：`FunctionAgent` + `QueryEngineTool`；再把这个工具包成 LangGraph 节点，跑在 `lab-langgraph` 学过的图里
- **要点**：检索作为工具的输入参数（`query`）由模型决定，比写死一条检索链更灵活；同时要防「该查不查」与「反复查」；这正是 `newking` 现在手写的那段（见 `newking/docs/工具调用待优化.md`）
- **验收**：同一个问题在「固定检索链」与「agent 自主检索」下表现可对比
- **文档**：`/docs/understanding/agent`、`/docs/module_guides/deploying/agents`

### 第 12 课 · 评测：怎么证明检索变好了

- **目标**：没有评测就没有优化 —— 把「感觉更准」变成数字
- **示例**：`RetrieverEvaluator`（hit rate / MRR）+ Faithfulness / Relevancy evaluator；准备 20 条问题 + 期望答案的评测集
- **要点**：评测集要覆盖「事实型 / 汇总型 / 应该拒答型」；检索指标与生成指标分开看（召回没中，别怪模型）；每次改切块/重排/融合都跑一遍，否则改不动
- **验收**：给出一张「改动前后」的指标对比表，能指出哪一步贡献最大
- **文档**：`/docs/module_guides/evaluating`、`/docs/optimizing/evaluation`

---

## 与面试的对应

| 面试常问 | 落点 |
|---|---|
| RAG 怎么做、怎么优化 | 第 2–6 课（切块 / 检索 / 重排 / 合成） |
| 关键词与语义怎么结合 | 第 5 课（BM25 + RRF） |
| 索引怎么增量更新、怎么持久化 | 第 8 课（Pipeline + docstore + pgvector） |
| 怎么评估 RAG 效果 | 第 12 课（hit rate / MRR / faithfulness） |
| 什么时候用框架、什么时候自己写 | 贯穿全课，第 10–11 课集中对照 |
