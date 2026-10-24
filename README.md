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

1. LlamaIndex 的**功能与文档以 Python 为主线**，高级检索器 / Workflow / 评测都在 Python 侧
2. 学员的真实项目（`newking`）后端本来就是 **Python + FastAPI + pgvector**，学完能直接对照改造，不是纸上谈兵
3. 本课程不做网页：10 课全部靠脚本验证，能独立跑通就算过。需要网页时再把图交给 Agent Server，那属于另一条线

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
第 2 课  覆盖 settings.py（加 load_documents：recursive 读语料 + frontmatter → metadata）与 basic.py：SentenceSplitter（chunk_size / overlap）+ MarkdownNodeParser
第 3 课  覆盖 basic.py：as_retriever(similarity_top_k) + MetadataFilters（按目录/日期筛）+ 打印 source_nodes
第 4 课  覆盖 basic.py：SimilarityPostprocessor 阈值 + LLMRerank 精排（对比不重排的命中质量）
第 5 课  覆盖 basic.py：QueryFusionRetriever（多查询 + RRF）与 BM25 关键词检索融合 —— 与 newking 的 EnsembleRetriever 对照
第 6 课  覆盖 basic.py：response_mode（compact / refine / tree_summarize）+ 引用编号（source_nodes → [N]）
第 7 课  新建 src/extract.py（Pydantic + structured_predict）与 src/ingest.py（IngestionPipeline + docstore 去重 + pgvector）：先抽字段，再增量入库
第 8 课  新建 src/workflow.py：LlamaIndex Workflow（事件驱动 step）—— 与 LangGraph 的图做结构对照
第 9 课  新建 src/agent.py：FunctionAgent + QueryEngineTool（把检索器当工具）—— 与 LangGraph 的 agent 循环对照
第 10 课 新建 src/eval.py：RetrieverEvaluator（hit rate / MRR）+ Faithfulness/Relevancy evaluator
```

## 技术栈

- 站点：Next.js（App Router）+ Tailwind + shiki（与 `lab-ai-sdk` 一致）
- 课程主体：Python 3.12 + `llama-index`（含 `llama-index-core` / `llama-index-vector-stores-postgres` / `llama-index-retrievers-bm25`）、`uv` 管环境
- 模型：DeepSeek（对话，`deepseek-flash`）+ 硅基流动 `BAAI/bge-large-zh-v1.5`（中文嵌入，1024 维）—— **与 `newking` 一致**，便于对照
- 向量库：第 1–6 课用内存（`VectorStoreIndex` 默认），第 7 课起落 **Postgres + pgvector**
- 场景：**网站内容知识库** —— 把一批 markdown（博客 / 笔记 / 项目）变成可问答、带引用的知识库；语料 mock，不接真实站点

## 开发

```bash
pnpm install
pnpm dev          # 站点
```

## 待办

**实测结论（llama-index-core 0.14.25 + deepseek-flash + bge-large-zh-v1.5，2026-10-24）**

- 第 1–6、8–10 课在本机跑通（`.env.local` 用真实 key）；第 7 课 pgvector 落库部分**未验证**：本机无 Docker / Postgres，只有 `extract.py` 与流水线逻辑用内存向量库替身验证过。
- `deepseek-flash` 是思考型模型：**默认不开 function calling**（`is_function_calling_model=False`），结构化输出走提示词解析；第 9 课的 `FunctionAgent` 必须显式打开，否则报 `LLM must be a FunctionCallingLLM`。打开后 `as_structured_llm` 会走工具调用路径，DeepSeek 会拒绝（`Thinking mode does not support this tool_choice`），所以两课不能共用同一个开关。
- 嵌入模型 `bge-large-zh-v1.5` 输入上限 512 token，**块长 512 会被硅基流动直接拒**（400 / code 20015，实测）。课程统一 `chunk_size=256`。
- `SimpleDirectoryReader` 的 `recursive` 默认 `False`，语料在子目录时必须显式开；文档 id 默认随机，增量入库必须 `filename_as_id=True`。
- `Document.hash` 含 metadata，**入库前把抽取字段原地写进 metadata 会让去重永远失效**；抽取要作为 `IngestionPipeline` 的一步、返回新文档。

- [ ] **第 4 课待定**：`LLMRerank` 能跑，但 deepseek-flash 只给部分候选打分（`top_n=3` 实测常回 1–2 条）。要么接受这个行为并在文案里说明，要么换硅基流动的 rerank 模型（要加依赖与接口）。
- [ ] **第 7 课待补**：pgvector 落库怎么起 Postgres（Docker 镜像 / 本机安装二选一）写进课里；本机无环境，未能验证 `PGVectorStore` 表结构。
- [ ] **第 7 课待核实**：`PGVectorStore` 的表结构与 `newking` 现有 `chunks` 表的差异（迁移代价写进课里）
- [ ] **第 8 课待核实**：LlamaIndex Workflow 与 LangGraph 的对照点（事件驱动 vs 状态机）要写清，避免学员以为二者等价
- [ ] 学员项目模板（每课「跟做」需要的最终代码）
- [ ] 每课右侧 `docLinks` 全部校验可访问（LlamaIndex 文档路径会变）
