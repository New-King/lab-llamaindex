# 课表：LlamaIndex（RAG 工程化）

> 主线 9 课，全部围绕一个目标：**把检索做对** —— 从「能跑通」到「能用、能落地、能评测」。
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
- **示例**：`BM25Retriever` 与向量检索两路召回；`QueryFusionRetriever` 用 `num_queries=3` 让模型改写问题，再按 RRF 融合
- **要点**：为什么需要 BM25（专有名词、缩写、精确串）；RRF 是最省事的融合（按排名而非分数）；中文没有空格，切词规则要显式给（`token_pattern`）；多路查询靠改写问题扩大召回面
- **验收**：给一个「语义检索漏、关键词能中」的问题，融合后召回命中
- **文档**：`/docs/examples/retrievers/reciprocal_rerank_fusion`、`/docs/module_guides/querying/retriever/retriever_modes`

### 第 6 课 · 响应合成与引用

- **目标**：从「一段话」升级到「带出处的回答」
- **示例**：`response_mode`（`compact` / `refine` / `tree_summarize`）+ 把 `source_nodes` 映射成 `[1][2]` 引用编号
- **要点**：不同 response_mode 的取舍（成本 / 质量 / 是否会被截断）；回答里必须能指回原文块，否则不可审计；前端渲染引用 = 把 `source_nodes` 的 metadata 传出去
- **验收**：回答带 `[N]`，每个 `[N]` 能对应到具体文件的某一块
- **文档**：`/docs/module_guides/querying/response_synthesizers`

### 第 7 课 · 入库流水线：抽取、切块与落库

- **目标**：从「每次重建索引」变成「可增量、可持久、可重跑」，并且入库时就带上可筛字段
- **示例**：`src/extract.py` 用 Pydantic + `as_structured_llm` / `structured_predict` 抽标题 / 摘要 / 标签写进 metadata；`src/ingest.py` 用 `IngestionPipeline` + docstore 去重，落 `PGVectorStore` 并 `persist`
- **要点**：`docstore` 是增量的关键（按 hash 跳过未变文档）；抽取与检索共用同一套 LLM 配置，schema 越小越稳；抽出来的字段回写 metadata 后，第 3 课的元数据过滤才真正有用；嵌入模型换维度 = 必须重灌；表结构差异（LlamaIndex 自己的表 vs 业务已有的表）决定迁移代价
- **验收**：`uv run python -m src.extract` 逐篇打印标题与标签；`uv run python -m src.ingest` 首次打印处理块数，改一篇 md 后重跑只重新处理那一篇
- **文档**：`/docs/module_guides/querying/structured_outputs`、`/docs/module_guides/loading/ingestion_pipeline`、`/docs/examples/vector_stores/postgres`

### 第 8 课 · Workflow：事件驱动的流程

- **目标**：把「检索 → 判断 → 再检索 → 合成」写成可维护的流程
- **示例**：LlamaIndex `Workflow`（`@step` + 事件类型）实现：判断是否需要检索 → 检索 → 不足则改写查询再检索 → 合成
- **要点**：**与 LangGraph 的结构对照**（事件驱动 vs 状态机；step 之间传事件 vs 共享状态 + reducer）；什么时候该用哪个（已有 LangGraph 项目不必搬）
- **验收**：构造一个「一次检索不够」的问题，能看到第二次检索被触发
- **文档**：`/docs/module_guides/workflow`

### 第 9 课 · 评测：怎么证明检索变好了

- **目标**：没有评测就没有优化 —— 把「感觉更准」变成数字
- **示例**：`RetrieverEvaluator`（hit rate / MRR）+ Faithfulness / Relevancy evaluator；准备 20 条问题 + 期望答案的评测集
- **要点**：评测集要覆盖「事实型 / 汇总型 / 应该拒答型」；检索指标与生成指标分开看（召回没中，别怪模型）；每次改切块/重排/融合都跑一遍，否则改不动
- **验收**：给出一张「改动前后」的指标对比表，能指出哪一步贡献最大
- **文档**：`/docs/module_guides/evaluating`、`/docs/optimizing/evaluation`

---

## 为什么是这 9 课

- **不铺「查询改写 / 路由」**：`RouterQueryEngine` 要有**多套索引**才有意义，本课程只有一套语料，讲不深就会退化成 API 演示；HyDE 在中文站内语料上收益不明显。
- **抽取与入库合并**：两者是同一条 ETL 链（抽字段 → 切块 → 去重 → 落库），拆成两课会让同一段代码讲两遍。
- **不单独开 Agent 课**：把检索器包成工具交给 `FunctionAgent` 是另一条编排路线，与「把检索做对」的主线关系弱；第 8 课末尾一句话点到为止，要深入时按官方 Agent 文档自学。
- **保留的部分各有独立验收**：过滤（集合可解释）与重排（顺序变化）是不同机制；Workflow（事件驱动）是可维护的多步编排；引用与评测是「能用 / 能证明」的落点。

## 与面试的对应

| 面试常问 | 落点 |
|---|---|
| RAG 怎么做、怎么优化 | 第 2–6 课（切块 / 检索 / 重排 / 合成） |
| 关键词与语义怎么结合 | 第 5 课（BM25 + RRF + 多路查询） |
| 索引怎么增量更新、怎么持久化 | 第 7 课（Pipeline + docstore + pgvector） |
| 怎么评估 RAG 效果 | 第 9 课（hit rate / MRR / faithfulness） |
| 什么时候用框架、什么时候自己写 | 贯穿全课，第 8 课集中对照 |
