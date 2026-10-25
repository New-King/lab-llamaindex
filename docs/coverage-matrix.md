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
| 摄取流水线（`IngestionPipeline` + docstore） | 7 | 增量、幂等、可重跑 |
| 向量库持久化（`PGVectorStore`） | 7 | 落地的分界线 |
| 结构化抽取（Pydantic / `structured_predict`） | 7 | 非结构化 → 字段 |
| Workflow（事件驱动 step） | 8 | 与 LangGraph 对照 |
| Agent 与工具化检索（`FunctionAgent` / `QueryEngineTool`） | — | 与「把检索做对」主线关系弱；第 8 课末尾一句话点到，不单独开课 |
| 评测（`RetrieverEvaluator` / Faithfulness / Relevancy） | 10 | 把「感觉更准」变成数字 |

## 二、进延伸阅读（不做主线）

| 能力 | 为什么不做主线 | 建议落点 |
|---|---|---|
| 观测 / 回调（instrumentation） | 与 `lab-langgraph` 的 LangSmith 课重叠，且容易变成配置课 | 第 7 课延伸阅读 |
| 查询变换与路由（`HyDEQueryTransform` / `RouterQueryEngine`） | 路由要有多套索引才有意义，本课程只有一套语料；HyDE 在中文站内语料上收益不明显 | 不做，第 5 课注释点一句 |
| 其它索引类型（Summary / Tree / Keyword / KnowledgeGraph） | 概念好讲但缺少刚需场景，塞进主线会散 | 第 3 课延伸阅读（多索引才有路由需求） |
| Sentence-window / auto-merging 检索 | 属于第 4 课「后处理」的进阶变体，主线只保留阈值 + 重排 | 第 4 课延伸阅读 |
| 多模态（图片 / 音频索引） | 课程语料是 markdown，没有载体 | 暂不进 |
| `llama_deploy`（部署） | 与 `lab-langgraph` 第 12 课的部署路径重叠；且与 Agent Server 二选一会让学员混乱 | 不做，文档里点一句 |

## 三、明确不做

| 项 | 原因 |
|---|---|
| 接真实站点语料 / 真实用户 | 课程语料 mock，避免依赖外部服务 |
| 向量库横向对比（Pinecone / Qdrant / Chroma…） | 属于选型科普，不是 RAG 手艺；第 7 课只讲 pgvector 一种，把「换库要改哪几行」说清即可 |

## 四、与其它 lab 的分工

| 主题 | 本课 | 别的 lab |
|---|---|---|
| 图 / 状态 / 中断 / 记忆 | 本课程不涉及 | `lab-langgraph`（主线） |
| Agent 循环与工具 | 不单独成课（第 8 课一句话点到） | `lab-langgraph` 第 4 课、`lab-deepagents` |
| 前端聊天页 | 不重学 | `lab-langgraph` 第 11 课（同一套 `useStream`） |
| 框架自带的 RAG 一条链 | 本课讲「手艺本身」 | `lab-mastra` 第 10 课讲「框架怎么给」 |
