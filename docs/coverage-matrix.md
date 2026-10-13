# 覆盖矩阵：LlamaIndex 能力 ↔ 课次

> 用途：确认「该讲的都讲了」+ 记录**没进主线**的能力与原因（避免以后重复讨论）。
> 课次编号见 `docs/curriculum.md`。

## 一、进主线

| LlamaIndex 能力 | 课次 | 说明 |
|---|---|---|
| 数据加载（`SimpleDirectoryReader`） | 1 | 最小闭环的入口 |
| 索引与查询（`VectorStoreIndex` / `QueryEngine`） | 1 | 世界观建立：Document / Node / Index |
| 切块（`SentenceSplitter` / `MarkdownNodeParser`） | 2 | 决定召回上限 |
| 元数据与过滤（`MetadataFilters`） | 2、3 | frontmatter → metadata → 过滤 |
| 检索器（`as_retriever` / `similarity_top_k`） | 3 | 把索引变成可控参数 |
| 后处理与重排（`SimilarityPostprocessor` / `LLMRerank`） | 4 | 质量提升性价比最高 |
| 融合检索（`QueryFusionRetriever` / BM25） | 5 | 关键词 + 语义，专有名词场景 |
| 响应合成（`response_mode` / `source_nodes`） | 6 | 带出处的回答 |
| 查询变换与路由（`HyDEQueryTransform` / `RouterQueryEngine`） | 7 | 不同问题走不同路径 |
| 摄取流水线（`IngestionPipeline` + docstore） | 8 | 增量、幂等、可重跑 |
| 向量库持久化（`PGVectorStore`） | 8 | 落地的分界线 |
| 结构化抽取（Pydantic / `structured_predict`） | 9 | 非结构化 → 字段 |
| Workflow（事件驱动 step） | 10 | 与 LangGraph 对照 |
| Agent 与工具化检索（`FunctionAgent` / `QueryEngineTool`） | 11 | 与既有编排对接 |
| 评测（`RetrieverEvaluator` / Faithfulness / Relevancy） | 12 | 把「感觉更准」变成数字 |

## 二、进延伸阅读（不做主线）

| 能力 | 为什么不做主线 | 建议落点 |
|---|---|---|
| 观测 / 回调（instrumentation） | 与 `lab-langgraph` 第 12 课的 LangSmith 重叠，且容易变成配置课 | 第 8 课延伸阅读 |
| 其它索引类型（Summary / Tree / Keyword / KnowledgeGraph） | 概念好讲但缺少刚需场景，塞进主线会散 | 第 7 课延伸阅读（路由会用到不同索引） |
| Sentence-window / auto-merging 检索 | 属于第 4 课「后处理」的进阶变体，主线只保留阈值 + 重排 | 第 4 课延伸阅读 |
| 多模态（图片 / 音频索引） | 课程语料是 markdown，没有载体 | 暂不进 |
| `llama_deploy`（部署） | 与 `lab-langgraph` 第 12 课的部署路径重叠；且与 Agent Server 二选一会让学员混乱 | 不做，文档里点一句 |

## 三、明确不做

| 项 | 原因 |
|---|---|
| 换成 TS 版（`llamaindex` npm）重写全课 | 覆盖度未核实；且与本课程「对照 `newking` 真实项目」的目标不符（见 `README.md` 语言选型） |
| 接真实站点语料 / 真实用户 | 课程语料 mock，避免依赖外部服务 |
| 向量库横向对比（Pinecone / Qdrant / Chroma…） | 属于选型科普，不是 RAG 手艺；第 8 课只讲 pgvector 一种，把「换库要改哪几行」说清即可 |

## 四、与其它 lab 的分工

| 主题 | 本课 | 别的 lab |
|---|---|---|
| 图 / 状态 / 中断 / 记忆 | 只在第 11 课提「如何接进图」 | `lab-langgraph`（主线） |
| Agent 循环与工具 | 第 11 课讲检索工具化 | `lab-langgraph` 第 4 课、`lab-deepagents` |
| 前端聊天页 | 不重学 | `lab-langgraph` 第 11 课（同一套 `useStream`） |
| 框架自带的 RAG 一条链 | 本课讲「手艺本身」 | `lab-mastra` 第 10 课讲「框架怎么给」 |
