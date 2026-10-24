# AGENTS.md — lab-llamaindex 维护规则

LlamaIndex 课程（lab-llamaindex）的约定。改这个仓库前先读本文件；与 `docs/curriculum.md` 冲突时以本文件为准。

## 一、回复风格

- **一句话先给结论**，用户追问再展开；不要先铺垫「分几种情况」再给结论。
- 只答被问的那一点：不引申相邻概念，不主动加对比表、包名对照、源码条款、备选方案。
- 只有用户明确要细节（「展开」「为什么」「依据在哪」）时，才给来源与出处。
- 改动说完就停，不要顺手补一句「要不要我顺便…」。

## 二、信息架构

- **左侧菜单 = 主线课**，顺序见 `docs/curriculum.md`（10 课）。
- 每课页 = 跟做步骤 + 知识点 + 文件 + 代码 + 右侧官方文档（`docLinks`），可选「延伸阅读」弹窗。
- 每课有两个标题字段：`title`（页内 h1，完整、可带「：说明」）与 `menuTitle`（左侧菜单，短名）。**两个都必填**。
- **验收写法**：2～3 行**陈述句** —— ① 怎么跑（哪条命令）；② 跑完能看到什么。不写问句、不写检查清单。
- 站点结构、组件、布局 class：照抄 `lab-ai-sdk`（`app/`、`components/`、`lib/layout-classes.ts`）；数据文件沿用同名 `lib/projects.ts`（`INIT_STEPS` / `NAV_ITEMS` / 类型与辅助函数）与 `lib/home.ts`。

## 三、动笔前必做：先查文档，不清楚就问

1. **先查官方文档**：`https://docs.llamaindex.ai/**`（Python 主线）。API 名、参数、导入路径逐项对着文档写，**不凭印象**；以本机 `pip show llama-index` 的版本为准。
2. **LlamaIndex 迭代快、包已拆细**：很多类要从子包导入（如向量库、BM25、重排），**导入路径必须查**；旧的 `llama_index.xxx` 单包写法已过时。
3. **Python 与 TS 版不等价**：本课程固定 Python（见 `README.md` 语言选型）。**禁止**把 TS 版文档里的写法当 Python 用法写进课里。
4. **文档没写的、或与实际不符的**：先问用户，不要自己跑命令试探、也不要写进课里当事实。
5. **没实测过的不要写成事实**：确认过的才写进步骤说明，未验证的在课里标「待验证」，并同步进 `README.md` 待办。
6. **改 `lib/projects.ts` 前先 `git diff` 或重读文件**：整段替换会**静默覆盖**别人的改动。

### 出处制（写任何 API 前先过这一关）

7. **每个类名 / 方法 / 参数 / 导入路径都要能指出处**：官方文档 URL，或本机包里的源码位置（`uv run python -c "import llama_index.core; print(llama_index.core.__file__)"`）。指不出来就不写进课。
8. **查的顺序固定**：官方文档 → `site-packages` 里的真实签名 → 官方示例仓库。**不允许**把「跑一下试试」当第一手段 —— 运行是确认，不是发现。
9. **同一个问题修两次还不对就停手**：回头确认前提（版本、包名、导入路径），不许在上面继续打补丁。
10. **版本锚点**：动笔前记下 `uv pip show llama-index-core` 的版本写进 `README.md`；拆分包名（`llama-index-retrievers-bm25` 这类）先确认 PyPI 上存在，**别凭记忆猜**。

## 四、知识点规则

只写 **LlamaIndex 真实存在的 API / 概念**（来源：`docs.llamaindex.ai`），每条 = **名称 + 一句中文说明它干什么**，并且**只列本课示例代码里真实出现过的方法与参数**。例如：

```text
VectorStoreIndex.from_documents — 把一批 Document 切块、向量化、建成可检索的索引
```

不要写：

- 自写函数（本课程自己的工具函数、脚本辅助函数）
- 「我们把参数传到哪」这类代码层面知识
- 同一个能力在后续课重复列（哪课首次出现就在哪课写）

只有讲**重要概念**（如切块粒度为什么决定召回上限、召回与重排的分工）时，才允许写示例代码里没出现的东西 —— 这种内容放 `conceptArticle`（延伸阅读弹窗）或示例代码的中文注释里。

## 五、覆盖式演进（学员项目）

学员只维护**一个** Python 项目 `my-llamaindex-app`：语料在 `content/`，代码在 `src/`。逐课叠加：

| 课 | 新增 | 覆盖 |
|---|---|---|
| 1 | `src/settings.py`、`src/basic.py` | — |
| 2 | — | `src/settings.py`（加 `load_documents`）、`src/basic.py` |
| 3 | — | `src/basic.py` |
| 4 | — | `src/basic.py` |
| 5 | — | `src/basic.py`（加依赖 `llama-index-retrievers-bm25`） |
| 6 | — | `src/basic.py` |
| 7 | `src/extract.py`、`src/ingest.py` | — |
| 8 | `src/workflow.py` | — |
| 9 | `src/agent.py` | — |
| 10 | `src/eval.py` | — |

禁止每课新建项目、新建平行目录；同一能力只在同一处演进。

**每课的文件只包含本课要展示的内容**：后面课覆盖同一个文件时，把本课用不到的参数、检索器、流程删掉，不要为了「兼容前面课的脚本」而留着。代价是前一课的脚本在被覆盖后不再能直接跑通 —— 要练就回到那一课重贴文件。

## 六、代码与依赖约定

- **场景**：**网站内容知识库** —— 把一批 markdown 变成可问答、带引用的知识库。语料 mock，不接真实站点、不加虚构公司与角色设定。
- **语言固定 Python 3.12**，用 `uv` 管环境；**不混 TS 写法**（站点本身是 Next.js，但那是教程站，不是课程内容）。
- 模型统一 **DeepSeek**（`deepseek-flash`）；嵌入统一 **硅基流动 `BAAI/bge-large-zh-v1.5`**（1024 维中文）。
  - **不换嵌入模型**：换模型 = 维度变 = 必须重灌，课程里要讲清这个代价（第 8 课）。
- **新增依赖要写成一步**：需要装包的课在课数据里写 `install: { command, description }`，它会渲染成操作列表第一步「装依赖」。
- 依赖只加课程真需要的包：`llama-index-core`、`llama-index-embeddings-openai-like`（或官方对应包）、`llama-index-retrievers-bm25`、`llama-index-postprocessor-*`、`llama-index-vector-stores-postgres`。**不要**引入其它 provider 或云服务。
- 跑脚本统一用 `uv run python -m src.xxx`：**不带任何参数**；脚本靠**用模型的那个文件**顶部读 `.env.local`（不额外建配置文件）。
- 持久化分两段：第 1–7 课用内存索引（重启即失，课程里明确说明），第 8 课起落 **Postgres + pgvector**。

## 七、写课约定

- **【强制】课页文案无人称**：`lib/home.ts` 与 `lib/projects.ts` 里**会渲染到页面上的文字** —— 包括示例代码中的字符串、`verify` 里的期望输出 —— 一律不出现人称代词：`我`、`你`、`他`，以及「学员」「学习者」这类称谓。
  - 写法：用**无主语叙述**，或直接写文件名 / 变量名。
  - **维护文档不受此限制**：本文件、`README.md`、`docs/**` 可以使用。
- **课页里不出现别的课程 / 仓库的名字**（`lab-langgraph`、`lab-mastra`、`newking` 等）：需要对照就在维护文档里写，课页里按官方口径讲。
- **知识点是 `{ text, note? }`**：`text` 一句话说清干什么；`note` 是**可选**补充，只在确实需要时写，**尽量短（≤ 48 字，体检脚本会提醒）**。
- 示例代码写**中文注释**，讲清关键行为；知识点列表只列方法名，注释解释用法。
- 每课示例必须能独立跑通：脚本自带最小输入，不依赖上一课残留的本地状态。

## 八、开发约定

- **只改 lab-llamaindex**；`lab-ai-sdk`、`lab-langgraph`、`lab-mastra`、`lab-deepagents`、`newking` 等既有仓库禁止改动（包括「顺手优化」）。
- 站点本身**不装课程依赖**：`package.json` 只有 `next` / `react` / `shiki` 与 Tailwind、TypeScript 工具链，不引 LlamaIndex。
- `scripts/audit-course.mjs` 已就位：**改完必须跑**（交叉核对课页文案 ↔ 代码 ↔ 命令 ↔ 目录 ↔ 文档）。
- 改前先说明；改完列出文件清单。
- 不主动 commit / push。
