# lab-llamaindex（LlamaIndex 项目制课程）

LlamaIndex 的课程站点，站点结构、UI 与数据文件形状照抄 `lab-ai-sdk`。

主站不跑任何 LlamaIndex 代码 —— 它是「对照学习站」：左侧课程 + 右侧官方文档，学员在自己的项目里跟做。

## 和现有 lab 的关系

| 项目 | 讲什么 | 层 |
|---|---|---|
| `lab-langgraph` | 编排：图 / 状态 / 记忆 / 中断 | 编排层 |
| **`lab-llamaindex`（本项目）** | **数据 → 索引 → 检索 → 查询** 这条链的工程化 | 检索 / RAG 层 |
| `lab-mastra` | TS 全栈的 agent + workflow + RAG + 上线 | 全栈框架 |
| `lab-deepagents` | 预置 agent 架构（planner / 子 agent / 文件系统） | 编排层之上 |

**核心命题**：`lab-langgraph` 教你怎么把流程画成图；本课教你**图里最脏的那一段**（检索）业界怎么做 —— 切块、混合检索、重排、引用、增量入库、评测。

与 `lab-mastra` 第 10 课（Mastra RAG）的关系：那里是「框架自带的一条链」，这里是「检索这门手艺本身」，两边对照着看才看得出取舍。

## 语言选型（重要）

**本课以 Python 为准**，理由是：

1. LlamaIndex 的**功能与文档以 Python 为主线**，TS 版（`llamaindex` npm）覆盖度更低，很多高级检索器 / Workflow 在 TS 侧不齐
2. 学员的真实项目（`newking`）后端本来就是 **Python + FastAPI + pgvector**，学完能直接对照改造，不是纸上谈兵
3. 本课程不做网页：12 课全部靠脚本验证，能独立跑通就算过。需要网页时再把图交给 Agent Server，那属于另一条线

> 若坚持全 TS 栈：需先核实 TS 版对第 4–8 课用到的检索器 / Pipeline / Workflow 的覆盖度，**未核实前不承诺**（见「待办」）。

## 站点结构

```text
lab-llamaindex/
├── AGENTS.md                    # 维护规则（课程结构、知识点规则、覆盖式演进约定）
├── README.md                    # 本文件
├── docs/
│   ├── curriculum.md            # 课表：每课目标/示例/要点/验收/文档
│   └── coverage-matrix.md       # LlamaIndex 官方能力 ↔ 课次映射（含未进主线项与原因）
├── app/
│   └── (shell)/lab/[projectSlug]/page.tsx
├── components/                  # 代码面板 / 文档侧栏 / 延伸阅读弹窗（照抄 lab-ai-sdk）
└── lib/
    ├── projects.ts              # 课次数据（同名同结构：INIT_STEPS / NAV_ITEMS）
    ├── home.ts                  # 首页介绍数据
    └── layout-classes.ts        # 布局 class
```

## 学员项目的演进方式（覆盖式）

学员只维护**一个** Python 项目 `my-llamaindex-app`：语料在 `content/`，代码在 `src/`。

```text
第 0 课  uv venv + pip install llama-index llama-index-embeddings-openai-like + .env.local（DEEPSEEK_API_KEY / SILICONFLOW_API_KEY）
第 1 课  新建 src/settings.py（模型与嵌入配置）+ src/basic.py：SimpleDirectoryReader → VectorStoreIndex.from_documents → as_query_engine().query()（内存向量库，先把链条跑通）
第 2 课  覆盖 basic.py：SentenceSplitter（chunk_size / overlap）+ MarkdownNodeParser + frontmatter → metadata 透传
第 3 课  覆盖 basic.py：as_retriever(similarity_top_k) + MetadataFilters（按目录/日期筛）+ 打印 source_nodes
第 4 课  覆盖 basic.py：SimilarityPostprocessor 阈值 + LLMRerank 精排（对比不重排的命中质量）
第 5 课  覆盖 basic.py：QueryFusionRetriever（多查询 + RRF）与 BM25 关键词检索融合 —— 与 newking 的 EnsembleRetriever 对照
第 6 课  覆盖 basic.py：response_mode（compact / refine / tree_summarize）+ 引用编号（source_nodes → [N]）
第 7 课  覆盖 basic.py：查询理解与路由 —— HyDEQueryTransform、RouterQueryEngine（不同问题走不同索引）
第 8 课  新建 src/ingest.py：IngestionPipeline（transformations + docstore 去重）+ 落 Postgres/pgvector + persist/增量刷新
第 9 课  新建 src/extract.py：结构化抽取（Pydantic 模型 → frontmatter 自动生成），复用同一套 LLM 配置
第 10 课 新建 src/workflow.py：LlamaIndex Workflow（事件驱动 step）—— 与 LangGraph 的图做结构对照
第 11 课 新建 src/agent.py：FunctionAgent + QueryEngineTool（把检索器当工具）—— 与 LangGraph 的 agent 循环对照
第 12 课 新建 src/eval.py：RetrieverEvaluator（hit rate / MRR）+ Faithfulness/Relevancy evaluator；并演示把 QueryEngineTool 塞进 LangGraph 图
```

## 技术栈

- 站点：Next.js（App Router）+ Tailwind + shiki（与 `lab-ai-sdk` 一致）
- 课程主体：Python 3.12 + `llama-index`（含 `llama-index-core` / `llama-index-vector-stores-postgres` / `llama-index-retrievers-bm25`）、`uv` 管环境
- 模型：DeepSeek（对话，`deepseek-chat`）+ 硅基流动 `BAAI/bge-large-zh-v1.5`（中文嵌入，1024 维）—— **与 `newking` 一致**，便于对照
- 向量库：第 1–7 课用内存（`VectorStoreIndex` 默认），第 8 课起落 **Postgres + pgvector**
- 场景：**网站内容知识库** —— 把一批 markdown（博客 / 笔记 / 项目）变成可问答、带引用的知识库；语料 mock，不接真实站点

## 开发

```bash
pnpm install
pnpm dev          # 站点
```

## 待办

- [ ] **TS 版覆盖度核实**：`llamaindex` npm 是否具备 QueryFusionRetriever / IngestionPipeline / Workflow / RetrieverEvaluator（决定是否提供 TS 支线）
- [ ] **第 4 课待核实**：`LLMRerank` 与 DeepSeek 的兼容性（是否要求特定 `choice_batch_size` / 结构化输出）
- [ ] **第 8 课待核实**：`PGVectorStore` 的表结构与 `newking` 现有 `chunks` 表的差异（迁移代价写进课里）
- [ ] **第 10 课待核实**：LlamaIndex Workflow 与 LangGraph 的对照点（事件驱动 vs 状态机）要写清，避免学员以为二者等价
- [ ] 站点脚手架（照抄 `lab-ai-sdk` 的 components / layout-classes）
- [ ] 学员项目模板（每课「跟做」需要的最终代码）
- [ ] 每课右侧 `docLinks` 全部校验可访问（LlamaIndex 文档路径会变）
