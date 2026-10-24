import type { DocLink } from "@/lib/doc-link";

export type CommandStep = {
  description: string;
  command: string;
  /** 交互式脚手架时的推荐选项 */
  choices?: string[];
};

export type FileAction = "create" | "replace" | "edit" | "run";

export type ProjectFile = {
  path: string;
  code?: string;
  hint?: string;
  steps?: CommandStep[];
  /** 项目课：跟做顺序 */
  order?: number;
  /** 项目课：新建（create）/ 整体覆盖（replace）/ 局部修改（edit）/ 只跑命令（run） */
  action?: FileAction;
};

/**
 * 局部修改（edit）的代码按编号注释拆块：`// ① …`（顶格）当小标题，后面的代码各自成块、各自可复制。
 * 只认 ①~⑩ 编号，所以代码里普通的说明注释不会被误切；只有一块时返回空数组，调用方整块渲染。
 */
export function splitFileCode(code: string): { label: string; code: string }[] {
  const lines = code.split("\n");
  const blocks: { label: string; lines: string[] }[] = [];

  lines.forEach((line) => {
    const isHeading = /^\/\/\s*[①②③④⑤⑥⑦⑧⑨⑩]/.test(line);
    if (isHeading) {
      blocks.push({ label: line.replace(/^\/\/\s*/, "").trim(), lines: [] });
      return;
    }
    if (blocks.length === 0) blocks.push({ label: "", lines: [] });
    blocks[blocks.length - 1].lines.push(line);
  });

  const parts = blocks
    .map((block) => ({ label: block.label, code: block.lines.join("\n").trim() }))
    .filter((block) => block.code.length > 0);

  return parts.length > 1 ? parts : [];
}

export type FollowStep = {
  description: string;
  command: string;
};

/** 课末的验收步骤：去哪儿看、看到什么算通过（每项一行） */
export type ProjectVerify = {
  label: string;
  description: string[];
};

export type LabOperation =
  | {
      kind: "deps";
      id: "deps";
      order: number;
      label: string;
      description: string;
      command: string;
    }
  | {
      kind: "scaffold";
      id: "scaffold";
      order: number;
      label: string;
      description: string;
      command: string;
    }
  | {
      kind: "check";
      id: "verify";
      order: number;
      label: string;
      description: string[];
    }
  | {
      kind: "file";
      id: string;
      order: number;
      label: string;
      file: ProjectFile;
    };

/** 生成 mkdir + touch 脚手架命令（仅包含 action: create 的文件） */
export function buildScaffoldCommand(files: ProjectFile[]): string | null {
  const sorted = [...files]
    .filter((file) => file.order != null && file.action != null)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const createFiles = sorted.filter((file) => file.action === "create");
  if (createFiles.length === 0) return null;

  const dirs = new Set<string>();
  const paths: string[] = [];

  for (const file of createFiles) {
    paths.push(file.path);
    const slash = file.path.lastIndexOf("/");
    if (slash > 0) dirs.add(file.path.slice(0, slash));
  }

  const parts: string[] = [];
  if (dirs.size > 0) {
    parts.push(`mkdir -p ${[...dirs].sort().join(" ")}`);
  }
  parts.push(`touch ${paths.join(" ")}`);
  return parts.join(" && ");
}

/** 操作列表：装依赖 → 创建文件 → 逐文件粘贴代码 → 验收 */
export function getLabOperations(
  files: ProjectFile[],
  verify?: ProjectVerify,
  install?: LabProject["install"],
): LabOperation[] {
  const sorted = [...files]
    .filter((file) => file.order != null && file.action != null)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const operations: LabOperation[] = [];
  let order = 1;

  // 需要新装依赖的课：第一步就是装包，别让它藏在文件说明里
  if (install) {
    operations.push({
      kind: "deps",
      id: "deps",
      order: order++,
      label: "装依赖",
      description:
        install.description ??
        `在 ${PROJECT_DIR} 目录执行，安装本课新增的依赖。`,
      command: install.command,
    });
  }

  const command = buildScaffoldCommand(sorted);
  if (command) {
    operations.push({
      kind: "scaffold",
      id: "scaffold",
      order: order++,
      label: "创建文件",
      description: `在 ${PROJECT_DIR} 目录执行，创建本课需要新建的文件夹和空文件。`,
      command,
    });
  }

  for (const file of sorted) {
    operations.push({
      kind: "file",
      // 同一个文件可能分两步改，id 要带上 order
      id: `${file.path}@${file.order}`,
      order: order++,
      label: getFileName(file.path),
      file,
    });
  }

  if (verify) {
    operations.push({
      kind: "check",
      id: "verify",
      order: order++,
      label: verify.label,
      description: verify.description,
    });
  }

  return operations;
}

export type GuideProject = {
  kind: "guide";
  slug: string;
  /** 课页 h1：完整标题 */
  title: string;
  /** 左侧菜单用：短标题 */
  menuTitle: string;
  files: ProjectFile[];
  docLinks: DocLink[];
};

/** 知识点右上角「延伸阅读」弹窗里的文章 */
export type ConceptArticle = {
  title: string;
  /** 每项一段：`## ` 开头是小标题，`- ` 开头是要点，``` 之间是代码 */
  body: string[];
};

/**
 * 知识点：一句话说清这个方法干什么。
 * `note` 是可选的补充，界面上在条目右侧显示一个灯泡图标，悬停（手机上点一下）浮出气泡；
 * 只在确实需要时写（Python 对应物、常见坑等），尽量短。
 */
export type Concept = {
  text: string;
  note?: string;
};

export type LabProject = {
  kind: "project";
  slug: string;
  /** 课页 h1：完整标题 */
  title: string;
  /** 左侧菜单用：短标题 */
  menuTitle: string;
  summary: string;
  /** 可选：本课新增的依赖，会渲染成操作列表的第一步 */
  install?: {
    command: string;
    description?: string;
  };
  /** 可选：课末验收步骤（操作列表的最后一项） */
  verify?: ProjectVerify;
  concepts: Concept[];
  /** 可选：知识点旁的延伸阅读 */
  conceptArticle?: ConceptArticle;
  files: ProjectFile[];
  docLinks: DocLink[];
};

const ORDER_LABELS = [
  "①",
  "②",
  "③",
  "④",
  "⑤",
  "⑥",
  "⑦",
  "⑧",
  "⑨",
  "⑩",
] as const;

export function getOrderLabel(order: number) {
  return ORDER_LABELS[order - 1] ?? String(order);
}

export function getFileActionLabel(action: FileAction) {
  if (action === "replace") return "覆盖";
  if (action === "edit") return "修改";
  if (action === "run") return "执行";
  return "新建";
}

export function getFileName(path: string) {
  return path.split("/").pop() ?? path;
}

export type NavItem = GuideProject | LabProject;

export const PROJECT_DIR = "my-llamaindex-app";

export const INIT_STEPS: CommandStep[] = [
  {
    description: "创建课程项目目录（站点本身不跑 LlamaIndex，代码都写在这个项目里）。",
    command: `mkdir ${PROJECT_DIR} && cd ${PROJECT_DIR}`,
  },
  {
    description: "用 uv 初始化 Python 3.12 项目。",
    command: "uv init --python 3.12",
  },
  {
    description:
      "装四件套：核心包、对话模型（OpenAI 兼容端点，用于 DeepSeek）、嵌入模型（OpenAI 兼容端点，用于硅基流动），外加读 .env.local 的 python-dotenv。",
    command:
      "uv add llama-index-core llama-index-llms-openai-like llama-index-embeddings-openai-like python-dotenv",
  },
  {
    description:
      "建语料目录与四个空文件：本课程的知识库来自这里的 markdown，按类型分成 notes 与 blog 两个子目录（第 3 课按类型过滤要用）。",
    command: `mkdir -p content/notes content/blog && touch content/notes/chunking.md content/notes/rerank.md content/blog/pgvector-hnsw.md content/blog/rag-production.md`,
  },
  {
    description: "在项目根目录创建 .env.local，填入两个 Key。",
    command: "touch .env.local",
  },
];

export const NAV_ITEMS: NavItem[] = [
  {
    kind: "guide",
    slug: "getting-started",
    title: "初始化",
    menuTitle: "初始化",
    docLinks: [
      {
        title: "LlamaIndex 入门",
        href: "https://docs.llamaindex.ai/en/stable/getting_started/starter_example/",
      },
      {
        title: "uv 使用说明",
        href: "https://docs.astral.sh/uv/",
      },
    ],
    files: [
      {
        path: "终端",
        steps: INIT_STEPS,
      },
      {
        path: ".env.local",
        hint: "对话走 DeepSeek，嵌入走硅基流动（中文向量）；DATABASE_URL 到落 pgvector 那课才用得上：",
        code: `DEEPSEEK_API_KEY=sk-...
SILICONFLOW_API_KEY=sk-...
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres`,
      },
      {
        path: "content/notes/chunking.md",
        hint: "语料之一：切块粒度。前四课的提问都落在这四篇里。",
        code: `---
title: 切块粒度怎么定
date: 2026-03-12
type: notes
tags: [切块, 检索, RAG]
---

# 切块粒度怎么定

## 块太大

- 一个块里混进多个主题，向量被平均，语义指向变糊
- 召回之后进 prompt 的噪声多，模型要自己挑重点
- 同样的 top_k 覆盖到的信息量下降

## 块太小

- 一个论点被切成两半，单块读不通
- 检索命中半句话，合成时缺少上下文
- 块数量上升，写入与检索成本一起涨

## 经验值

中文正文先按 300–600 字起步，overlap 取块长的 10%–20%。

标题、代码块、表格不要被切开：先按 markdown 结构分节，再在节内按句子切。
`,
      },
      {
        path: "content/notes/rerank.md",
        hint: "语料之二：召回与重排的分工。",
        code: `---
title: 召回与重排的分工
date: 2026-04-02
type: notes
tags: [重排, 召回, 向量检索]
---

# 召回与重排的分工

召回看像不像，重排看能不能回答问题，两件事目的不同。

## 向量召回

- 查询与块各自编码，再比向量距离，速度是优势
- 一次近邻检索就能从大量块里捞出几十条候选
- 对「哪句话能回答问题」不敏感，专有名词与数字容易飘

## 重排

- 把查询与每条候选拼在一起送进模型，逐条判断相关性
- 精度高，成本随候选数线性涨
- 所以流程是：先宽召回 20–50 条，再精排留 3–5 条进 prompt

## 阈值放在哪

相似度阈值放在重排之前，用来砍掉明显无关的候选。

阈值过高会把正确答案一起丢掉，先给一个保守值，看指标再动。
`,
      },
      {
        path: "content/blog/pgvector-hnsw.md",
        hint: "语料之三：pgvector 的 HNSW 索引怎么建、怎么调参。",
        code: `---
title: pgvector 的 HNSW 索引怎么建
date: 2026-05-18
type: blog
tags: [pgvector, HNSW, 向量库]
---

# pgvector 的 HNSW 索引怎么建

pgvector 提供两种近似近邻索引：IVFFlat 与 HNSW。

HNSW 建索引慢、占内存多，查询快，且不需要事先聚类，生产上更常用。

## 建索引

\`\`\`sql
CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
\`\`\`

- m：每个节点的邻居数，16 是常用起点，调大召回更准、内存更贵
- ef_construction：建索引时的候选池大小，越大索引质量越好、建索引越慢

## 查询时调参

\`\`\`sql
SET hnsw.ef_search = 40;
\`\`\`

ef_search 越大召回越准、延迟越高，按 top_k 的两到四倍起步。

## 注意

索引要在数据量大起来之前建好，批量导入后再 REINDEX 一次。

向量维度由嵌入模型决定，换模型等于换维度，索引与数据都要重建。
`,
      },
      {
        path: "content/blog/rag-production.md",
        hint: "语料之四：生产环境的 RAG 关注哪几件事。",
        code: `---
title: 生产环境的 RAG 要重点关注哪几件事
date: 2026-06-30
type: blog
tags: [RAG, 工程化, 评测]
---

# 生产环境的 RAG 要重点关注哪几件事

## 一、召回是否真的召回了

把相关性分数打出来看，不要只看最终回答。

召回没中就换块大小、加关键词一路、上重排，在 prompt 上打转解决不了召回问题。

## 二、回答能不能指回原文

每条结论都要能落到具体文件的某一块。

不可审计的回答在客服、法务、运维场景里等于没有。

## 三、语料更新怎么办

按文档指纹去重，改一篇只重处理那一篇。

嵌入模型换了维度，整库重灌。

## 四、有没有数字

留一批评测问题，记录命中率、MRR 与忠实度。

每次改切块或重排都跑一遍，否则改动的好坏无法判断。

## 五、成本与延迟

重排与多轮改写都会成倍放大 token 消耗。

先保证召回准，再决定要不要加这些步骤。
`,
      },
    ],
  },
  {
    kind: "project",
    slug: "minimal-rag",
    title: "最小 RAG 闭环：读文件、建索引、问答",
    menuTitle: "最小闭环",
    summary:
      "只做一件事：让「读文件 → 建索引 → 问答」跑通。跑完会看到一段回答，以及它引用了哪个文件、相似度多少。这一步之后，所有优化都是在这条链上换零件。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-llamaindex-app 目录执行 uv run python -m src.basic",
        "先看到「读到 4 篇文档」，再看到一段回答，最后是 2 行「来源: chunking.md 分数: 0.6xx」——说明检索和合成这两步都通了",
      ],
    },
    concepts: [
      {
        text: "`SimpleDirectoryReader` — 读一个目录下的文档，返回 Document 列表",
      },
      { text: "`Document` — 原始文档单位：正文加 metadata" },
      {
        text: "`VectorStoreIndex.from_documents` — 切块加向量化，建成可检索的索引",
      },
      { text: "`as_query_engine` — 把索引包成「先检索、再合成」的查询引擎" },
      { text: "`query` — 问一次，返回带来源的回答" },
    ],
    files: [
      {
        path: "src/settings.py",
        order: 1,
        action: "create",
        hint: "模型与嵌入统一在这里配置：对话用 DeepSeek，嵌入用硅基流动的中文向量模型。",
        code: `import os
from pathlib import Path

from dotenv import load_dotenv
from llama_index.core import Settings
from llama_index.embeddings.openai_like import OpenAILikeEmbedding
from llama_index.llms.openai_like import OpenAILike

# 读项目根的 .env.local（脚本是裸 Python 进程，没人替它读）
load_dotenv(Path(__file__).resolve().parent.parent / ".env.local")

# 对话模型：DeepSeek 走 OpenAI 兼容端点
Settings.llm = OpenAILike(
    model="deepseek-flash",
    api_base="https://api.deepseek.com/v1",
    api_key=os.environ["DEEPSEEK_API_KEY"],
    is_chat_model=True,
)

# 嵌入模型：中文语料用中文向量（维度换掉就必须重灌索引）
Settings.embed_model = OpenAILikeEmbedding(
    model_name="BAAI/bge-large-zh-v1.5",
    api_base="https://api.siliconflow.cn/v1",
    api_key=os.environ["SILICONFLOW_API_KEY"],
)

# 切块默认值：用切块器自己传参时，以传的为准
# 256 字起步：嵌入模型 bge-large-zh 的输入上限是 512 token，块加 metadata 不能顶到上限
Settings.chunk_size = 256
Settings.chunk_overlap = 32`,
      },
      {
        path: "src/basic.py",
        order: 2,
        action: "create",
        hint: "最小闭环，和官方 starter example 同一套：读语料 → 建索引 → 查一次。配置在上一行的 settings.py 里。",
        code: `from src import settings  # noqa: F401  先配置模型与嵌入（DeepSeek + 硅基流动）
from llama_index.core import Document, SimpleDirectoryReader, VectorStoreIndex

# ① 读语料：content/ 下的 markdown 变成 Document
#    recursive=True 才会进 notes/ 与 blog/ 两个子目录（默认不递归）
documents: list[Document] = SimpleDirectoryReader("content", recursive=True).load_data()

# 一个文件 = 一个 Document，正文就是整个文件（不切块、不解析）
print("读到", len(documents), "篇文档，每篇是一个 Document")

# ② 建索引：切块 + 向量化全在这一行（默认内存向量库，重启即失）
index = VectorStoreIndex.from_documents(documents)

# ③ 查询：先检索相关块，再交给模型合成答案
query_engine = index.as_query_engine()
response = query_engine.query("切块粒度为什么会影响检索质量")

print(response)
for node in response.source_nodes:
    print("来源：", node.metadata.get("file_name"), "分数：", round(node.score or 0, 3))
`,
      },
    ],
    docLinks: [
      {
        title: "LlamaIndex 入门示例",
        href: "https://docs.llamaindex.ai/en/stable/getting_started/starter_example/",
      },
      {
        title: "理解 LlamaIndex",
        href: "https://docs.llamaindex.ai/en/stable/understanding/",
      },
    ],
  },
  {
    kind: "project",
    slug: "chunking",
    title: "切块与元数据：检索质量的上限",
    menuTitle: "切块与元数据",
    summary:
      "第 1 课那一行 `from_documents` 把切块和向量化包在一起，这一课把它拆开：先按 markdown 标题分节，再在节内按句子切块，并且把文件开头的 frontmatter 变成可筛字段。跑完能看到每块多大、带着哪些元数据。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-llamaindex-app 目录执行 uv run python -m src.basic",
        "先看到「文档数 4」和 10 个元数据键（比第 1 课多出 title / date / type / tags），再看到「块数 18」和 5 行「字数 | 类型 | 标题 | 正文开头」",
      ],
    },
    concepts: [
      {
        text: "`SentenceSplitter` — 按句子边界切块，用 chunk_size 与 chunk_overlap 控制粒度",
        note: "上限由嵌入模型定：bge-large-zh 只有 512 token",
      },
      {
        text: "`MarkdownNodeParser` — 按 markdown 结构切块：标题分节、代码块与表格不拆开",
      },
      { text: "`node_parser` — 建索引时指定用哪个切块器" },
      { text: "`metadata` — 挂在节点上的可筛字段，来源是 frontmatter" },
    ],
    files: [
      {
        path: "src/settings.py",
        order: 1,
        action: "edit",
        hint: "补一个 load_documents()：读语料时顺手把 frontmatter 拆进 metadata，后面每课都用它。",
        code: `import os
from pathlib import Path

import yaml
from dotenv import load_dotenv
from llama_index.core import Settings, SimpleDirectoryReader
from llama_index.embeddings.openai_like import OpenAILikeEmbedding
from llama_index.llms.openai_like import OpenAILike

# 读项目根的 .env.local（脚本是裸 Python 进程，没人替它读）
load_dotenv(Path(__file__).resolve().parent.parent / ".env.local")

# 对话模型：DeepSeek 走 OpenAI 兼容端点
Settings.llm = OpenAILike(
    model="deepseek-flash",
    api_base="https://api.deepseek.com/v1",
    api_key=os.environ["DEEPSEEK_API_KEY"],
    is_chat_model=True,
)

# 嵌入模型：中文语料用中文向量（维度换掉就必须重灌索引）
Settings.embed_model = OpenAILikeEmbedding(
    model_name="BAAI/bge-large-zh-v1.5",
    api_base="https://api.siliconflow.cn/v1",
    api_key=os.environ["SILICONFLOW_API_KEY"],
)

# 切块默认值：用切块器自己传参时，以传的为准
# 256 字起步：嵌入模型 bge-large-zh 的输入上限是 512 token，块加 metadata 不能顶到上限
Settings.chunk_size = 256
Settings.chunk_overlap = 32


def load_documents():
    """读语料，并把 frontmatter 拆进 metadata —— 后面每课都从这里进。

    recursive=True：语料按类型放在 content/ 下的两个子目录里，默认不递归。
    frontmatter 里的 title / date / type 会变成可筛字段，正文里不再留下 --- 那一段
    （读文件时整篇都会被当成正文，frontmatter 要自己拆）。
    """
    # filename_as_id：文档 id 用文件路径，重跑时 id 不变，docstore 才认得出「还是那篇」
    documents = SimpleDirectoryReader("content", recursive=True, filename_as_id=True).load_data()
    for doc in documents:
        if doc.text.startswith("---"):
            _, front, body = doc.text.split("---", 2)
            fields = yaml.safe_load(front) or {}
            # 值统一成字符串：yaml 会把日期解析成 date 对象，落盘成 JSON 时会报错
            doc.metadata.update(
                {k: v if isinstance(v, (list, dict)) else str(v) for k, v in fields.items()}
            )
            doc.set_content(body.lstrip())
    return documents
`,
      },
      {
        path: "src/basic.py",
        order: 2,
        action: "replace",
        hint: "覆盖成「先按 markdown 切节、再按句子切块」，并打印每个块的元数据。",
        code: `from src.settings import load_documents  # 导入即完成模型与嵌入配置
from llama_index.core import VectorStoreIndex
from llama_index.core.node_parser import MarkdownNodeParser, SentenceSplitter

documents = load_documents()

# ① 先看一眼：正文开头的 frontmatter 已经被摘走，metadata 里多了 title / date / type / tags
first = documents[0]
print("文档数：", len(documents))
print("正文开头：", first.text[:24].replace("\\n", " "))
print("元数据键：", list(first.metadata))
print("其中来自 frontmatter：", {k: first.metadata.get(k) for k in ("title", "date", "type", "tags")})

# ② 按 markdown 结构切：标题分节、代码块与表格保持完整
md_parser = MarkdownNodeParser()
sections = md_parser.get_nodes_from_documents(documents)

# ③ 再按句子切块：块太大召回噪声多，太小语义不完整
#    切出来的每一块都会继承文档的 metadata（title / type …），后面的元数据过滤靠它
splitter = SentenceSplitter(chunk_size=256, chunk_overlap=32)
nodes = splitter.get_nodes_from_documents(sections)

# 看一眼前几块：字数 | type | title | 正文开头
print("块数：", len(nodes))
for node in nodes[:5]:
    print(" ", len(node.text), "字 |", node.metadata.get("type"), "|", node.metadata.get("title"), "|", node.text[:16].replace("\\n", " "))

# ④ 用切好的块建索引：node_parser 换掉默认切块
index = VectorStoreIndex(nodes)
engine = index.as_query_engine()
print("回答：", engine.query("切块粒度为什么会影响检索质量"))
`,
      },
    ],
    docLinks: [
      {
        title: "节点切块器",
        href: "https://docs.llamaindex.ai/en/stable/module_guides/loading/node_parsers/",
      },
      {
        title: "切块优化",
        href: "https://docs.llamaindex.ai/en/stable/optimizing/production_rag/",
      },
    ],
  },
  {
    kind: "project",
    slug: "retriever-and-filters",
    title: "检索器与过滤：把召回变成可控参数",
    menuTitle: "检索器与过滤",
    summary:
      "上一课的查询引擎是个黑盒，这一课把它拆成两半：检索器负责「捞哪些块」，合成器负责「怎么答」。同一条查询跑两遍——不加过滤、只留 notes——对比两组结果，看得出过滤是在检索阶段就把内容排除了。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-llamaindex-app 目录执行 uv run python -m src.basic",
        "「无过滤」那组前几条是 blog 的 pgvector-hnsw.md；「只留 type=notes」那组 5 条全是 notes，分数也从 0.7 掉到 0.39",
      ],
    },
    concepts: [
      { text: "`as_retriever` — 把索引变成可控的检索器" },
      { text: "`similarity_top_k` — 一次召回多少条候选" },
      { text: "`MetadataFilters` — 按元数据过滤，在检索阶段就排除无关内容" },
      { text: "`NodeWithScore` — 带相关性分数的节点" },
    ],
    files: [
      {
        path: "src/basic.py",
        order: 1,
        action: "replace",
        hint: "覆盖成显式检索：先看分数，再加元数据过滤（过滤字段来自上一课拆出来的 frontmatter）。",
        code: `from src.settings import load_documents  # 导入即完成模型与嵌入配置
from llama_index.core import VectorStoreIndex
from llama_index.core.node_parser import MarkdownNodeParser, SentenceSplitter
from llama_index.core.schema import NodeWithScore
from llama_index.core.vector_stores import MetadataFilter, MetadataFilters

documents = load_documents()
sections = MarkdownNodeParser().get_nodes_from_documents(documents)
nodes = SentenceSplitter(chunk_size=256, chunk_overlap=32).get_nodes_from_documents(sections)
index = VectorStoreIndex(nodes)

question = "HNSW 索引怎么建"

# ① 显式检索器：召回条数由 similarity_top_k 控制
retriever = index.as_retriever(similarity_top_k=5)

# ② 只看分数：NodeWithScore 把分数和节点放在一起
hits: list[NodeWithScore] = retriever.retrieve(question)
print("无过滤：")
for hit in hits:
    print(" ", round(hit.score or 0, 3), hit.node.metadata.get("type"), hit.node.metadata.get("file_name"))

# ③ 加元数据过滤：只在某一类内容里检索，而不是检索完再筛
filtered = index.as_retriever(
    similarity_top_k=5,
    filters=MetadataFilters(
        filters=[MetadataFilter(key="type", value="notes")],
    ),
)
print("只留 type=notes：")
for hit in filtered.retrieve(question):
    print(" ", round(hit.score or 0, 3), hit.node.metadata.get("type"), hit.node.metadata.get("file_name"))
`,
      },
    ],
    docLinks: [
      {
        title: "检索器",
        href: "https://docs.llamaindex.ai/en/stable/module_guides/querying/retriever/",
      },
      {
        title: "元数据过滤",
        href: "https://docs.llamaindex.ai/en/stable/module_guides/store/vector-stores/",
      },
    ],
  },
  {
    kind: "project",
    slug: "rerank",
    title: "重排与后处理：召回之后还要挑一遍",
    menuTitle: "重排与后处理",
    summary:
      "向量召回看「像不像」，重排看「能不能回答问题」。这一课把同一批候选走三条路：直接看分数 → 用阈值砍掉低分 → 再让模型重排，对比三者留下的东西有什么不同。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-llamaindex-app 目录执行 uv run python -m src.basic",
        "召回 8 条（分数 0.3–0.8）→「卡阈值后剩 8」→ 重排打印 1–2 行「重排分 10.0 rerank.md」：注意重排分是 1–10，不是余弦相似度",
      ],
    },
    concepts: [
      { text: "`SimilarityPostprocessor` — 按分数阈值先砍掉一批不相关候选" },
      { text: "`LLMRerank` — 让模型按「能否回答问题」把候选重新排序" },
      { text: "`similarity_cutoff` — 阈值：过高会丢掉正确答案" },
      { text: "`top_n` — 重排后保留几条进 prompt" },
    ],
    files: [
      {
        path: "src/basic.py",
        order: 1,
        action: "replace",
        hint: "覆盖成三段对比：裸召回 → 卡阈值 → 再精排。",
        code: `from src.settings import load_documents  # 导入即完成模型与嵌入配置
from llama_index.core import VectorStoreIndex
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.postprocessor import LLMRerank, SimilarityPostprocessor

documents = load_documents()
nodes = SentenceSplitter(chunk_size=256, chunk_overlap=32).get_nodes_from_documents(documents)
index = VectorStoreIndex(nodes)
retriever = index.as_retriever(similarity_top_k=8)
question = "重排和向量召回的分工是什么"

# ① 裸召回：先看基线（分数是余弦相似度，0 到 1）
base = retriever.retrieve(question)
print("召回：", [(round(h.score or 0, 3), h.node.metadata.get("file_name")) for h in base])

# ② 卡阈值：分数太低直接扔掉（阈值过高会误杀正确答案）
kept = SimilarityPostprocessor(similarity_cutoff=0.3).postprocess_nodes(base, query_str=question)
print("卡阈值后剩：", len(kept))

# ③ 再精排：模型逐条判断「能不能回答问题」，score 是 1 到 10 的相对分
ranked = LLMRerank(top_n=3).postprocess_nodes(kept, query_str=question)
for item in ranked:
    print("重排分：", item.score, item.node.metadata.get("file_name"))
`,
      },
    ],
    docLinks: [
      {
        title: "节点后处理器",
        href: "https://docs.llamaindex.ai/en/stable/module_guides/querying/node_postprocessors/",
      },
      {
        title: "检索优化",
        href: "https://docs.llamaindex.ai/en/stable/optimizing/basic_strategies/",
      },
    ],
  },
  {
    kind: "project",
    slug: "hybrid-search",
    title: "混合检索：关键词加语义，再融合",
    menuTitle: "混合检索",
    summary:
      "语义检索擅长「意思像」，关键词检索擅长「字面准」。这一课加第二条召回路径，再把两路按排名融合。用「HNSW」这种专有名词提问时，关键词路会明显比向量路准。",
    install: {
      command: "uv add llama-index-retrievers-bm25",
      description: "在 my-llamaindex-app 目录执行，装上 BM25 关键词检索器。",
    },
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-llamaindex-app 目录执行 uv run python -m src.basic",
        "三行输出：「向量路」4 个文件名、「关键词路」4 个文件名（pgvector-hnsw.md 更靠前）、「融合后」4 行分数——融合分是排名算出来的，都在 0.0x 量级，不能和相似度比大小",
      ],
    },
    concepts: [
      { text: "`BM25Retriever` — 关键词检索：命中专有名词与精确串" },
      { text: "`QueryFusionRetriever` — 多路召回按排名融合，不用自己写排序" },
      { text: "`num_queries` — 一次生成几路查询，做多查询召回" },
      {
        text: "`token_pattern` — 关键词检索的切词正则：中文没有空格，默认会把整句当成一个词",
      },
    ],
    files: [
      {
        path: "src/basic.py",
        order: 1,
        action: "replace",
        hint: "覆盖成「向量 + BM25 融合」：两路各自召回，再按排名融合。",
        code: `from src.settings import load_documents  # 导入即完成模型与嵌入配置
from llama_index.core import VectorStoreIndex
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.retrievers import QueryFusionRetriever
from llama_index.retrievers.bm25 import BM25Retriever

documents = load_documents()
nodes = SentenceSplitter(chunk_size=256, chunk_overlap=32).get_nodes_from_documents(documents)
index = VectorStoreIndex(nodes)

# ① 语义路：向量检索
vector_retriever = index.as_retriever(similarity_top_k=4)

# ② 关键词路：中文没有空格，默认正则会把整句当成一个词，
#    这里把切词规则换成「中文按字、英文按词」
keyword_retriever = BM25Retriever.from_defaults(
    nodes=nodes,
    similarity_top_k=4,
    token_pattern=r"(?u)[\\u4e00-\\u9fa5]|\\b\\w+\\b",
)

question = "pgvector 的 HNSW 索引怎么建"
print("向量路：", [h.node.metadata.get("file_name") for h in vector_retriever.retrieve(question)])
print("关键词路：", [h.node.metadata.get("file_name") for h in keyword_retriever.retrieve(question)])

# ③ 融合：RRF 按排名（不是分数）合并两路
fusion = QueryFusionRetriever(
    retrievers=[vector_retriever, keyword_retriever],
    similarity_top_k=4,
    num_queries=1,
    mode="reciprocal_rerank",
    use_async=False,
)
print("融合后：")
for hit in fusion.retrieve(question):
    print(" ", round(hit.score or 0, 3), hit.node.metadata.get("file_name"))
`,
      },
    ],
    docLinks: [
      {
        title: "融合检索（RRF）",
        href: "https://docs.llamaindex.ai/en/stable/examples/retrievers/reciprocal_rerank_fusion/",
      },
      {
        title: "检索模式总览",
        href: "https://docs.llamaindex.ai/en/stable/module_guides/querying/retriever/retriever_modes/",
      },
    ],
  },
  {
    kind: "project",
    slug: "response-and-citation",
    title: "响应合成与引用：回答必须能指回原文",
    menuTitle: "合成与引用",
    summary:
      "检索对了不等于回答对。合成阶段决定「几块一起喂模型」和「怎么给出处」。这一课跑两次合成：refine（逐块精炼，边答边改）与 tree_summarize（先分层汇总），并把 source_nodes 编成 [1][2] 这样的出处。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-llamaindex-app 目录执行 uv run python -m src.basic",
        "先看到「回答：…」（refine 合成的），再看到「出处：[1] x.md [2] y.md …」，最后一行「汇总版：…」——编号顺序就是 source_nodes 的顺序",
      ],
    },
    concepts: [
      { text: "`response_mode` — 合成方式：compact 拼块、refine 逐块精炼、tree_summarize 分层汇总" },
      { text: "`refine` — 逐块精炼：先答一次，再用后续块修正答案" },
      { text: "`tree_summarize` — 分层汇总：块多时先把小段汇总再合成" },
      { text: "`source_nodes` — 回答实际用到的原文节点，用来生成引用" },
    ],
    files: [
      {
        path: "src/basic.py",
        order: 1,
        action: "replace",
        hint: "覆盖成带引用的回答：自己拼编号，并对比三种合成方式。",
        code: `from src.settings import load_documents  # 导入即完成模型与嵌入配置
from llama_index.core import VectorStoreIndex
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.response_synthesizers import get_response_synthesizer

documents = load_documents()
nodes = SentenceSplitter(chunk_size=256, chunk_overlap=32).get_nodes_from_documents(documents)
index = VectorStoreIndex(nodes)
retriever = index.as_retriever(similarity_top_k=4)
question = "生产环境的 RAG 要重点关注哪几件事"

# ① refine：逐块精炼，答案会随新块不断修正
synthesizer = get_response_synthesizer(response_mode="refine")
engine = index.as_query_engine(response_synthesizer=synthesizer)
response = engine.query(question)

# ② 引用：把 source_nodes 变成编号，前端才好渲染出处
citations = [f"[{i + 1}] {n.metadata.get('file_name')}" for i, n in enumerate(response.source_nodes)]
print("回答：", response)
print("出处：", " ".join(citations))

# ③ 对比：tree_summarize 在块数多时更省 token
summary = get_response_synthesizer(response_mode="tree_summarize")
print("汇总版：", summary.synthesize(question, nodes=retriever.retrieve(question)))
`,
      },
    ],
    docLinks: [
      {
        title: "响应合成器",
        href: "https://docs.llamaindex.ai/en/stable/module_guides/querying/response_synthesizers/",
      },
      {
        title: "引用与来源",
        href: "https://docs.llamaindex.ai/en/stable/optimizing/production_rag/",
      },
    ],
  },
  {
    kind: "project",
    slug: "ingestion-pipeline",
    title: "入库流水线：抽取、切块与落库",
    menuTitle: "入库流水线",
    summary:
      "前六课每次跑都从零重来。这一课把它变成「建一次、之后只补新的」：正文先被模型抽成字段写进 metadata，再走一条可重跑的流水线落进 Postgres。改一篇 md 重跑，只有那一篇会重新处理。",
    install: {
      command: "uv add llama-index-vector-stores-postgres",
      description: "在 my-llamaindex-app 目录执行，装上 Postgres + pgvector 的向量库适配（另需一个带 pgvector 的 Postgres，见文件说明）。",
    },
    verify: {
      label: "跑两个脚本看结果",
      description: [
        "先执行 uv run python -m src.extract：4 行「文件名 → 抽到的标题 [标签…]」",
        "再执行 uv run python -m src.ingest：第一次打印「本次处理块数 10」；原样重跑是 0；改一篇 md 后重跑，只有那一篇的块数（2 左右）",
      ],
    },
    concepts: [
      { text: "`BaseModel` — Pydantic 模型：定义要抽哪些字段、字段什么类型" },
      { text: "`structured_predict` — 按模型定义让 LLM 直接产出结构化结果" },
      { text: "`as_structured_llm` — 把普通模型包装成结构化输出模型" },
      { text: "`TransformComponent` — 自定义流水线步骤：接一批节点、处理完再交回去" },
      { text: "`IngestionPipeline` — 把抽取、切块与向量化串成可重跑的流水线" },
      { text: "`docstore` — 记录已处理文档的指纹，未变就跳过（增量的关键）" },
      { text: "`PGVectorStore` — Postgres 加 pgvector 的向量库，跨进程持久" },
      { text: "`persist` — 把索引与 docstore 落盘，下次直接加载" },
    ],
    files: [
      {
        path: "src/extract.py",
        order: 1,
        action: "create",
        hint: "抽取模块：先定义要哪些字段，再包成流水线的一步，入库脚本直接复用。",
        code: `from pydantic import BaseModel, Field

from src.settings import load_documents  # 导入即完成模型与嵌入配置
from llama_index.core import Document, Settings
from llama_index.core.prompts import PromptTemplate
from llama_index.core.schema import TransformComponent

PROMPT = PromptTemplate("从下面的正文里抽出结构化字段：\\n{text}")


class DocFields(BaseModel):
    """一篇文档要抽出来的字段。字段越少越稳，别贪多。"""

    title: str = Field(description="一句话标题")
    summary: str = Field(description="两句话以内的摘要")
    tags: list[str] = Field(description="三到五个主题标签")


def extract_fields(doc: Document) -> DocFields:
    """抽字段：抽取器挂在同一个模型上，这一步只调模型，不建索引。

    is_function_calling_model 默认是关的，as_structured_llm 走「提示词里要 JSON、
    再解析」这条路 —— 对 deepseek-flash 这种 thinking 模型，比强制工具调用稳。
    """
    structured_llm = Settings.llm.as_structured_llm(DocFields)
    return structured_llm.structured_predict(DocFields, PROMPT, text=doc.text[:2000])


class FieldExtractor(TransformComponent):
    """流水线的第一步：抽字段写进新文档的 metadata。

    返回新对象而不是原地改：原文档的 hash 保持不动，
    下一次运行才判断得出「这篇正文变没变」，增量才有依据。
    """

    def __call__(self, nodes, **kwargs):
        extracted = []
        for node in nodes:
            fields = extract_fields(node)
            extracted.append(
                Document(
                    text=node.text,
                    metadata={
                        **node.metadata,
                        "title": fields.title,
                        "summary": fields.summary,
                        "tags": fields.tags,
                    },
                    # 抽出来的字段只用来筛和展示：不参与切块预算，也不塞进嵌入文本
                    excluded_embed_metadata_keys=["title", "summary", "tags"],
                    excluded_llm_metadata_keys=["title", "summary", "tags"],
                )
            )
        return extracted


if __name__ == "__main__":
    # 单独跑：先看看每篇语料能抽出什么
    for doc in load_documents():
        fields = extract_fields(doc)
        print(doc.metadata.get("file_name"), "→", fields.title, fields.tags)
`,
      },
      {
        path: "src/ingest.py",
        order: 2,
        action: "create",
        hint: "入库脚本：抽字段、切块、向量化串成一条流水线，靠 docstore 跳过没变的文档，最后落 pgvector。跑之前要先有一个带 pgvector 的 Postgres（本机装或容器起都行），把连接串填进 .env.local 的 DATABASE_URL。",
        code: `import os
from pathlib import Path

from src.extract import FieldExtractor
from src.settings import load_documents  # 导入即完成模型与嵌入配置
from llama_index.core import StorageContext, VectorStoreIndex
from llama_index.core.ingestion import IngestionPipeline
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.storage.docstore import SimpleDocumentStore
from llama_index.vector_stores.postgres import PGVectorStore

# ① 语料：正文 + frontmatter 元数据
documents = load_documents()

# ② docstore：记住已处理文档的指纹，未变就跳过 —— 增量的关键
docstore_path = Path(".storage/docstore.json")
docstore_path.parent.mkdir(exist_ok=True)
docstore = (
    SimpleDocumentStore.from_persist_path(str(docstore_path))
    if docstore_path.exists()
    else SimpleDocumentStore()
)

# ③ 向量库：落 Postgres，跨进程仍在（表结构由适配器自己建）
vector_store = PGVectorStore.from_params(
    connection_string=os.environ["DATABASE_URL"],
    table_name="llama_chunks",
    embed_dim=1024,
)

# ④ 流水线：抽字段 → 切块 → 向量化；docstore 里指纹没变的文档整条跳过
pipeline = IngestionPipeline(
    transformations=[
        FieldExtractor(),
        SentenceSplitter(chunk_size=256, chunk_overlap=32),
    ],
    docstore=docstore,
    vector_store=vector_store,
)

nodes = pipeline.run(documents=documents)
print("本次处理块数：", len(nodes))

# ⑤ 落盘索引与 docstore：下次直接加载，不用重算
storage_context = StorageContext.from_defaults(vector_store=vector_store, docstore=docstore)
index = VectorStoreIndex(nodes, storage_context=storage_context)
index.storage_context.persist(persist_dir=".storage")
print("已落库，提问：", index.as_query_engine().query("切块粒度怎么定"))
`,
      },
    ],
    docLinks: [
      {
        title: "结构化输出",
        href: "https://docs.llamaindex.ai/en/stable/module_guides/querying/structured_outputs/",
      },
      {
        title: "抽取示例",
        href: "https://docs.llamaindex.ai/en/stable/module_guides/querying/structured_outputs/pydantic_program/",
      },
      {
        title: "摄取流水线",
        href: "https://docs.llamaindex.ai/en/stable/module_guides/loading/ingestion_pipeline/",
      },
      {
        title: "pgvector 向量库",
        href: "https://docs.llamaindex.ai/en/stable/examples/vector_stores/postgres/",
      },
    ],
  },
  {
    kind: "project",
    slug: "workflow",
    title: "Workflow：把检索流程写成事件驱动的步骤",
    menuTitle: "Workflow",
    summary:
      "一次检索不够时，流程会变成「检索 → 判断 → 再检索 → 合成」。这一课用事件驱动的 Workflow 写这条流程：每一步接收一种事件、抛出另一种事件，脚本会把走过哪几步打出来。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-llamaindex-app 目录执行 uv run python -m src.workflow",
        "依次打印「① 第一次检索：最高分 0.xx」→（分数不到 0.7 时）「→ 不够用，发一个 Retry 事件」→「② 第二次检索」→「③ 合成回答」→「最终回答：…」",
      ],
    },
    concepts: [
      { text: "`Workflow` — 事件驱动的流程容器，负责在步骤之间派发事件" },
      { text: "`step` — 一个处理步骤：接收某类事件，产出新事件" },
      { text: "`StartEvent` — 流程的起点事件，携带初始输入" },
      { text: "`StopEvent` — 流程的终点事件，携带最终结果" },
    ],
    files: [
      {
        path: "src/workflow.py",
        order: 1,
        action: "create",
        hint: "事件驱动流程：先检索一次，不够就改写查询再检索，最后合成。",
        code: `import asyncio

from src.settings import load_documents  # 导入即完成模型与嵌入配置
from llama_index.core import VectorStoreIndex
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.workflow import (
    Event,
    StartEvent,
    StopEvent,
    Workflow,
    step,
)

documents = load_documents()
nodes = SentenceSplitter(chunk_size=256, chunk_overlap=32).get_nodes_from_documents(documents)
index = VectorStoreIndex(nodes)
retriever = index.as_retriever(similarity_top_k=4)

class Retrieved(Event):
    """检索完成事件：带上命中的块。"""
    question: str
    hits: list

class Retry(Event):
    """需要再检索一次：带上改写过的问题。"""
    question: str

class RagFlow(Workflow):
    @step
    async def first_retrieve(self, ev: StartEvent) -> Retrieved | Retry:
        hits = retriever.retrieve(ev.question)
        best = max((h.score or 0) for h in hits)
        print(f"① 第一次检索：最高分 {best:.2f}")
        # 分数太低就改写问题再来一轮
        if best < 0.7:
            print("   → 不够用，发一个 Retry 事件")
            return Retry(question=f"{ev.question}（换个说法再查一次）")
        return Retrieved(question=ev.question, hits=hits)

    @step
    async def retry_retrieve(self, ev: Retry) -> Retrieved:
        hits = retriever.retrieve(ev.question)
        print(f"② 第二次检索：最高分 {max((h.score or 0) for h in hits):.2f}")
        return Retrieved(question=ev.question, hits=hits)

    @step
    async def synthesize(self, ev: Retrieved) -> StopEvent:
        print("③ 合成回答")
        return StopEvent(result=index.as_query_engine().query(ev.question))

async def main():
    # Workflow.run 要在事件循环里调用，所以套一层 async main 再交给 asyncio.run
    flow = RagFlow(timeout=60)
    print("最终回答：", await flow.run(question="HNSW 索引在生产里怎么调"))

asyncio.run(main())
`,
      },
    ],
    docLinks: [
      {
        title: "Workflow 指南",
        href: "https://docs.llamaindex.ai/en/stable/module_guides/workflow/",
      },
      {
        title: "Workflow 基础",
        href: "https://docs.llamaindex.ai/en/stable/understanding/workflows/",
      },
    ],
  },
  {
    kind: "project",
    slug: "agent-tools",
    title: "工具化检索：让模型决定什么时候查",
    menuTitle: "工具化检索",
    summary:
      "固定检索链的问题是「不该查也查、该查不查都发生了」。这一课把查询引擎包成工具，交给会调工具的 agent 自主决定。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-llamaindex-app 目录执行 uv run python -m src.agent",
        "第一个问题下面出现 1–2 行「调用工具： search_knowledge …」，第二个问题（谢谢）没有任何工具调用，直接给回答",
      ],
    },
    concepts: [
      { text: "`QueryEngineTool` — 把查询引擎包成 agent 能调用的工具" },
      { text: "`ToolMetadata` — 工具的名字与说明，模型据此判断什么时候调用" },
      { text: "`FunctionAgent` — 会调用工具、并根据结果继续推理的 agent" },
      { text: "`system_prompt` — agent 的行为约束：什么时候检索、什么时候直接回答" },
      { text: "`stream_events` — 把执行过程的事件流出来，这里用来观察工具调用" },
      { text: "`ToolCallResult` — 工具执行完的事件，带工具名、入参与返回" },
    ],
    files: [
      {
        path: "src/agent.py",
        order: 1,
        action: "create",
        hint: "工具化检索：查询引擎当工具，agent 自主决定调不调；过程中调了哪些工具会打出来。",
        code: `import asyncio

from src.settings import load_documents  # 导入即完成模型与嵌入配置
from llama_index.core import Settings, VectorStoreIndex
from llama_index.core.agent.workflow import FunctionAgent, ToolCallResult
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.tools import QueryEngineTool, ToolMetadata

documents = load_documents()
nodes = SentenceSplitter(chunk_size=256, chunk_overlap=32).get_nodes_from_documents(documents)
index = VectorStoreIndex(nodes)

# ① 把查询引擎包成工具：说明写得越准，模型越知道何时该调
tool = QueryEngineTool(
    query_engine=index.as_query_engine(),
    metadata=ToolMetadata(
        name="search_knowledge",
        description="检索站内内容（博客、笔记、项目）。问题涉及站内内容时调用。",
    ),
)

# ② FunctionAgent 要求模型支持工具调用：deepseek-flash 支持，默认没开，这里显式打开
Settings.llm.is_function_calling_model = True

# ③ 自己决定调工具，还是直接回答
agent = FunctionAgent(
    tools=[tool],
    llm=Settings.llm,
    system_prompt="回答站内内容相关的问题前，先用 search_knowledge 检索；寒暄类问题直接回答。",
)

async def ask(question):
    """问一次，并把过程中的工具调用打出来。"""
    print(f"\\n=== 问题：{question} ===")
    handler = agent.run(question)
    async for ev in handler.stream_events():
        if isinstance(ev, ToolCallResult):
            print("  调用工具：", ev.tool_name, ev.tool_kwargs)
    print("回答：", await handler)

async def main():
    await ask("切块粒度怎么定")
    await ask("谢谢")

asyncio.run(main())
`,
      },
    ],
    docLinks: [
      {
        title: "Agent 总览",
        href: "https://docs.llamaindex.ai/en/stable/understanding/agent/",
      },
      {
        title: "把查询引擎当工具",
        href: "https://docs.llamaindex.ai/en/stable/module_guides/deploying/query_engine/",
      },
    ],
  },
  {
    kind: "project",
    slug: "evaluation",
    title: "评测：怎么证明检索真的变好了",
    menuTitle: "评测",
    summary:
      "没有评测就没有优化。这一课给一条问题标上「应该命中哪两块」，算出检索指标（MRR / Hit Rate）与生成指标（忠实度 / 相关性），把「感觉更准」变成能对比的数字。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-llamaindex-app 目录执行 uv run python -m src.eval",
        "先看到「检索指标: {'mrr': 1.0, 'hit_rate': 1.0}」，再看到「忠实度: 1.0 相关性: 1.0」——语料小，满分正常",
        "把 chunk_size 改成 96 重跑：块被切碎，检索指标掉到 0.0，这就是评测能看出的变化",
      ],
    },
    concepts: [
      { text: "`RetrieverEvaluator` — 用标注好的问题与期望文档算检索指标" },
      { text: "`FaithfulnessEvaluator` — 检查回答是否只用了检索到的内容" },
      { text: "`RelevancyEvaluator` — 检查检索到的内容是否真的与问题相关" },
      { text: "`aevaluate` — 异步跑一条评测，返回各项指标" },
    ],
    files: [
      {
        path: "src/eval.py",
        order: 1,
        action: "create",
        hint: "评测脚本：造评测集 → 算检索指标 → 算生成指标。",
        code: `import asyncio

from src.settings import load_documents  # 导入即完成模型与嵌入配置
from llama_index.core import VectorStoreIndex
from llama_index.core.evaluation import (
    FaithfulnessEvaluator,
    RelevancyEvaluator,
    RetrieverEvaluator,
)
from llama_index.core.node_parser import SentenceSplitter

documents = load_documents()
nodes = SentenceSplitter(chunk_size=256, chunk_overlap=32).get_nodes_from_documents(documents)
index = VectorStoreIndex(nodes)
retriever = index.as_retriever(similarity_top_k=4)

# 标注：这个问题应该命中讲切块那篇的头两块
expected_ids = [n.node_id for n in nodes if n.metadata.get("file_name") == "chunking.md"][:2]

# ① 检索指标：hit rate 看有没有命中，mrr 看命中的位置靠不靠前
evaluator = RetrieverEvaluator.from_metric_names(
    ["mrr", "hit_rate"], retriever=retriever
)

async def main():
    result = await evaluator.aevaluate(
        query="切块粒度为什么会影响检索质量",
        expected_ids=expected_ids,
    )
    print("检索指标：", result.metric_vals_dict)

    # ② 生成指标：回答是否忠实于检索内容、检索内容是否切题
    response = index.as_query_engine().query("切块粒度为什么会影响检索质量")
    faithful = await FaithfulnessEvaluator().aevaluate_response(response=response)
    relevant = await RelevancyEvaluator().aevaluate_response(
        query="切块粒度为什么会影响检索质量", response=response
    )
    print("忠实度：", faithful.score, "相关性：", relevant.score)

asyncio.run(main())
`,
      },
    ],
    docLinks: [
      {
        title: "评测模块",
        href: "https://docs.llamaindex.ai/en/stable/module_guides/evaluating/",
      },
      {
        title: "检索评测",
        href: "https://docs.llamaindex.ai/en/stable/module_guides/evaluating/usage_pattern_retrieval/",
      },
    ],
  },
];

export function getNavItem(slug: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => item.slug === slug);
}
