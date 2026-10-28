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

IVFFlat 先把向量聚成若干簇，查询时只扫离得最近的那几个簇，簇数由 lists 参数定；它要在灌好一批数据之后再建，簇心才分得准。

HNSW 换了个思路：把向量连成一张多层图，插入时沿着图找邻居，所以不要求事先有数据，边写边插也行；代价是图本身占内存，写入比 IVFFlat 慢一截。

两者都只解决「找得快」，不解决「找得准」：相关性还得靠重排和评测兜底。

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

# load_dotenv：把 .env.local 里的 key 读进环境变量（脚本是裸 Python 进程，没人替它读文件）
# Path(__file__).resolve().parent.parent：从本文件往上两级 = 项目根
load_dotenv(Path(__file__).resolve().parent.parent / ".env.local")

# OpenAILike：OpenAI 兼容端点的对话模型客户端，这里接 DeepSeek
Settings.llm = OpenAILike(
    model="deepseek-flash",
    api_base="https://api.deepseek.com/v1",
    api_key=os.environ["DEEPSEEK_API_KEY"],
    is_chat_model=True,
)

# OpenAILikeEmbedding：同样走 OpenAI 兼容端点的嵌入客户端，这里接硅基流动
# 中文语料用中文向量（维度换掉就必须重灌索引）
Settings.embed_model = OpenAILikeEmbedding(
    model_name="BAAI/bge-large-zh-v1.5",
    api_base="https://api.siliconflow.cn/v1",
    api_key=os.environ["SILICONFLOW_API_KEY"],
)

# 切块默认值：用切块器自己传参时，以传的为准
# 256 token 起步：嵌入模型 bge-large-zh 的输入上限是 512 token，块加 metadata 不能顶到上限
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

# ① SimpleDirectoryReader 读目录 → list[Document]（load_data 执行；一篇一个，整篇不切，recursive=True 才会进子目录）
documents: list[Document] = SimpleDirectoryReader("content", recursive=True).load_data()
print("读到", len(documents), "篇文档，每篇是一个 Document")

# ② VectorStoreIndex.from_documents 一步做完切块 + 向量化 + 入库 → Index（内存向量库，重启即失）
index = VectorStoreIndex.from_documents(documents)

# ③ as_query_engine 造查询引擎 → 回答（query 内部先检索、再让模型合成）
query_engine = index.as_query_engine()
response = query_engine.query("切块粒度为什么会影响检索质量")
print(response)

# ④ source_nodes 取出处 → list[NodeWithScore]（这次真正用到的块）
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
        "先看到「文档数 4」和 10 个元数据键（比第 1 课多出 title / date / type / tags），再看到「块数 18」和 5 行「字数 | 类型 | 标题 | 正文开头」——最长的块 198 字，是节内再切之后的结果",
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

# load_dotenv：把 .env.local 里的 key 读进环境变量（脚本是裸 Python 进程，没人替它读文件）
# Path(__file__).resolve().parent.parent：从本文件往上两级 = 项目根
load_dotenv(Path(__file__).resolve().parent.parent / ".env.local")

# OpenAILike：OpenAI 兼容端点的对话模型客户端，这里接 DeepSeek
Settings.llm = OpenAILike(
    model="deepseek-flash",
    api_base="https://api.deepseek.com/v1",
    api_key=os.environ["DEEPSEEK_API_KEY"],
    is_chat_model=True,
)

# OpenAILikeEmbedding：同样走 OpenAI 兼容端点的嵌入客户端，这里接硅基流动
# 中文语料用中文向量（维度换掉就必须重灌索引）
Settings.embed_model = OpenAILikeEmbedding(
    model_name="BAAI/bge-large-zh-v1.5",
    api_base="https://api.siliconflow.cn/v1",
    api_key=os.environ["SILICONFLOW_API_KEY"],
)

# 切块默认值：用切块器自己传参时，以传的为准
# 256 token 起步：嵌入模型 bge-large-zh 的输入上限是 512 token，块加 metadata 不能顶到上限
Settings.chunk_size = 256
Settings.chunk_overlap = 32


def load_documents():
    """读语料，并把 frontmatter 拆进 metadata —— 后面每课都从这里进。

    recursive=True：语料按类型放在 content/ 下的两个子目录里，默认不递归。
    frontmatter 里的 title / date / type 会变成可筛字段，正文里不再留下 --- 那一段
    （读文件时整篇都会被当成正文，frontmatter 要自己拆）。
    """
    # SimpleDirectoryReader 按目录读文件，load_data() 返回 list[Document]（一篇一个）
    # filename_as_id：文档 id 用文件路径，重跑时 id 不变，docstore 才认得出「还是那篇」
    documents = SimpleDirectoryReader("content", recursive=True, filename_as_id=True).load_data()
    for doc in documents:
        if doc.text.startswith("---"):
            _, front, body = doc.text.split("---", 2)
            # yaml.safe_load：把 --- 之间那几行解析成字典（{"title": ..., "type": ...}）
            fields = yaml.safe_load(front) or {}
            # 值统一成字符串：yaml 会把日期解析成 date 对象，落盘成 JSON 时会报错
            doc.metadata.update(
                {k: v if isinstance(v, (list, dict)) else str(v) for k, v in fields.items()}
            )
            # set_content：把正文换成去掉 frontmatter 的那一段
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

# ① load_documents() 读语料 → list[Document]（已把 frontmatter 拆进 metadata）
documents = load_documents()
first = documents[0]
print("文档数：", len(documents))
print("正文开头：", first.text[:24].replace("\\n", " "))
print("元数据键：", list(first.metadata))
print("其中来自 frontmatter：", {k: first.metadata.get(k) for k in ("title", "date", "type", "tags")})

# ② MarkdownNodeParser 按标题分节（get_nodes_from_documents 执行）→ list[TextNode]，一节一个，只分组、不限长度
sections = MarkdownNodeParser().get_nodes_from_documents(documents)

# ③ SentenceSplitter 节内按句子切（get_nodes_from_documents 执行）→ list[TextNode]，单块 ≤256 token（先扣掉 metadata 的 token）
nodes = SentenceSplitter(chunk_size=256, chunk_overlap=32).get_nodes_from_documents(sections)

print("块数：", len(nodes))
for node in nodes[:5]:
    print(" ", len(node.text), "字 |", node.metadata.get("type"), "|", node.metadata.get("title"), "|", node.text[:16].replace("\\n", " "))

# ④ VectorStoreIndex 向量化 + 入库 → Index（只做向量化和入库，切块已经完成）
index = VectorStoreIndex(nodes)

# ⑤ as_query_engine 造查询引擎 → 回答（query 内部先检索、再合成）
query_engine = index.as_query_engine()
print("回答：", query_engine.query("切块粒度为什么会影响检索质量"))
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
      "第 2 课最后用 `index.as_query_engine().query(...)` 拿答案，那一步只看得到回答，看不到它捞了哪几块、每块多少分。这一课先把 `filters` 挂到引擎上，再用 `retrieve` 只看候选（分数和 metadata 都能打印），最后 `query` 拿回答。同一个问题，不加过滤时前 5 条全是 blog 那篇；只留 notes 之后分数掉到 0.37–0.40，答案所在的那篇被排除，模型只能拒答。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-llamaindex-app 目录执行 uv run python -m src.basic",
        "先打印「只留 type=notes： 5 块」和 5 行「分数 | 类型 | 文件名」，分数 0.37–0.40 全是 notes——同一个问题不加 filters 时，这 5 条是 blog 的 pgvector-hnsw.md（0.72–0.75）",
        "再打印「回答：」，变成拒答（大意是资料里没有 HNSW 的内容）——过滤把答案所在的那篇排除了，这就是过滤的代价",
      ],
    },
    concepts: [
      { text: "`similarity_top_k` — 一次召回多少条候选" },
      { text: "`MetadataFilters` — 按元数据过滤，在检索阶段就排除无关内容" },
      { text: "`MetadataFilter` — 单条过滤条件：字段名 + 要匹配的值" },
      { text: "`retrieve` — 查询引擎只跑检索与过滤、不做合成，返回 NodeWithScore 列表" },
      { text: "`QueryBundle` — 把问题包成检索入参；引擎检索只收这个对象，不收裸字符串" },
    ],
    files: [
      {
        path: "src/basic.py",
        order: 1,
        action: "replace",
        hint: "覆盖成带过滤的检索：检索参数一次配在引擎上，retrieve 看过滤后的候选、query 拿回答。",
        code: `from src.settings import load_documents  # 导入即完成模型与嵌入配置
from llama_index.core import VectorStoreIndex
from llama_index.core.node_parser import MarkdownNodeParser, SentenceSplitter
from llama_index.core.schema import QueryBundle
from llama_index.core.vector_stores import MetadataFilter, MetadataFilters

# ① load_documents() 读语料 → list[Document]（整篇，没切）
documents = load_documents()

# ② MarkdownNodeParser 按标题分节（get_nodes_from_documents 执行）→ list[TextNode]，一节一个，只分组、不限长度
sections = MarkdownNodeParser().get_nodes_from_documents(documents)

# ③ SentenceSplitter 节内按句子切（get_nodes_from_documents 执行）→ list[TextNode]，单块 ≤256 token（先扣掉 metadata 的 token）
nodes = SentenceSplitter(chunk_size=256, chunk_overlap=32).get_nodes_from_documents(sections)

# ④ VectorStoreIndex 向量化 + 入库 → Index（块文本到此固定，之后再改文本，向量就过期）
index = VectorStoreIndex(nodes)

question = "HNSW 索引怎么建"

# ⑤ as_query_engine 把 filters 挂上去 → 过滤在检索阶段生效，不是检索完再筛
#    MetadataFilter(key=..., value=...)：key 是 metadata 字段名，value 要匹配的值
#    同一问题不加 filters 时，前 5 条全是 blog 的 pgvector-hnsw.md，分数 0.72–0.75
engine = index.as_query_engine(
    similarity_top_k=5,
    filters=MetadataFilters(
        filters=[MetadataFilter(key="type", value="notes")],
    ),
)

# ⑥ retrieve 只跑「检索 + 过滤」、不做合成 → 看这次捞到哪 5 块（分数掉到 0.37–0.40，全是 notes）
hits = engine.retrieve(QueryBundle(question))
print("只留 type=notes：", len(hits), "块")
for item in hits:
    print(" ", round(item.score or 0, 3), item.node.metadata.get("type"), item.node.metadata.get("file_name"))

# ⑦ query 走同一条链路，末了再合成回答：答案本来在 blog 那篇里，只留 notes 时模型只能拒答
print("回答：", engine.query(question))
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
        href: "https://docs.llamaindex.ai/en/stable/module_guides/indexing/vector_store_guide/",
      },
    ],
  },
  {
    kind: "project",
    slug: "rerank",
    title: "重排与后处理：召回之后还要挑一遍",
    menuTitle: "重排与后处理",
    summary:
      "向量召回看「像不像」，重排看「能不能回答问题」。实际开发里这两件事不是手写串起来的，而是作为参数配在查询引擎上：`similarity_top_k` 管召回几条，`node_postprocessors` 管候选怎么筛、怎么排。配好之后 `retrieve` 只看捞到什么，`query` 拿回答与引用，两个入口共用同一条链路。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-llamaindex-app 目录执行 uv run python -m src.basic",
        "先打印「召回 8 条 → 过完链：3」，跟着 3 行重排分（1–10 的相对分，不是余弦相似度）",
        "再打印一段回答，以及这次引用的 3 个文件名与重排分",
      ],
    },
    concepts: [
      { text: "`node_postprocessors` — 挂在查询引擎上的后处理链，按列表顺序依次执行" },
      { text: "`SimilarityPostprocessor` — 按分数阈值先砍掉一批不相关候选" },
      { text: "`similarity_cutoff` — 阈值：过高会丢掉正确答案" },
      { text: "`LLMRerank` — 让模型按「能否回答问题」把候选重新排序" },
      { text: "`top_n` — 重排后保留几条进 prompt" },
    ],
    files: [
      {
        path: "src/basic.py",
        order: 1,
        action: "replace",
        hint: "覆盖成实际开发里的写法：检索参数与后处理链一次配在查询引擎上，retrieve 看候选、query 拿回答。",
        code: `from src.settings import load_documents  # 导入即完成模型与嵌入配置
from llama_index.core import VectorStoreIndex
from llama_index.core.node_parser import MarkdownNodeParser, SentenceSplitter
from llama_index.core.postprocessor import LLMRerank, SimilarityPostprocessor
from llama_index.core.schema import QueryBundle

# ① load_documents() 读语料 → list[Document]（整篇，没切）
documents = load_documents()

# ② MarkdownNodeParser 按标题分节（get_nodes_from_documents 执行）→ list[TextNode]，一节一个，只分组、不限长度
sections = MarkdownNodeParser().get_nodes_from_documents(documents)

# ③ SentenceSplitter 节内按句子切（get_nodes_from_documents 执行）→ list[TextNode]，单块 ≤256 token（先扣掉 metadata 的 token）
nodes = SentenceSplitter(chunk_size=256, chunk_overlap=32).get_nodes_from_documents(sections)

# ④ VectorStoreIndex 向量化 + 入库 → Index（块文本到此固定）
index = VectorStoreIndex(nodes)

question = "重排和向量召回的分工是什么"

# ⑤ as_query_engine 一次配好两件事：
#    similarity_top_k 决定召回几条候选；node_postprocessors 是后处理链，按列表顺序依次执行
#    它内部就是 index.as_retriever(**kwargs) 造检索器 + RetrieverQueryEngine 组引擎这两步
#    顺序有讲究：先用阈值砍掉低分块（重排只处理高分块，省一次模型调用），再让模型精排
query_engine = index.as_query_engine(
    similarity_top_k=8,
    node_postprocessors=[
        SimilarityPostprocessor(similarity_cutoff=0.6),
        LLMRerank(top_n=3),
    ],
)

# ⑥ retrieve 只跑「检索 + 后处理」、不做合成 → list[NodeWithScore]：召回 8 条，过完链路剩 3 条
#    入参要 QueryBundle；直接传字符串会在重排那步报错（它要读 query_bundle.query_str）
hits = query_engine.retrieve(QueryBundle(question))
print("召回 8 条 → 过完链：", len(hits))
for item in hits:
    # 分数是重排打出的 1–10 相对分，不再和余弦相似度（0–1）比大小
    print(" ", item.score, item.node.metadata.get("file_name"))

# ⑦ query 走同一条链路，末了再合成回答；source_nodes 就是这次引用的块
response = query_engine.query(question)
print("回答：", response)
for node in response.source_nodes:
    print("引用：", node.metadata.get("file_name"), "重排分：", node.score)
`,
      },
    ],
    docLinks: [
      {
        title: "节点后处理器",
        href: "https://developers.llamaindex.ai/python/framework/module_guides/querying/node_postprocessors/",
      },
      {
        title: "查询引擎",
        href: "https://developers.llamaindex.ai/python/framework/module_guides/deploying/query_engine/",
      },
    ],
  },
  {
    kind: "project",
    slug: "hybrid-search",
    title: "混合检索：关键词加语义，再融合",
    menuTitle: "混合检索",
    summary:
      "语义检索擅长「意思像」，关键词检索擅长「字面准」，两个都要。这一课加第二条召回路径（BM25），再让模型把同一个问题改写成 3 种问法一起查，最后按排名融合。「HNSW」这种专有名词，关键词路明显比向量路准。",
    install: {
      command: "uv add llama-index-retrievers-bm25",
      description: "在 my-llamaindex-app 目录执行，装上 BM25 关键词检索器。",
    },
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-llamaindex-app 目录执行 uv run python -m src.basic",
        "三行输出：「向量路」4 个文件名、「关键词路」4 个文件名（问题里带专有名词，两路捞回的都是 pgvector-hnsw.md 的块）、「融合后」4 行分数 0.05–0.10——融合分是排名算出来的，不能和相似度（0–1）比大小",
        "最后打印「回答：…」与「引用：」4 个文件名——融合检索器接进引擎后，一次 query 出答案",
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
        hint: "覆盖成「向量 + BM25 融合」：两路各自召回，每个问题再改写成 3 种问法，最后按排名融合，再接引擎拿回答。",
        code: `from src.settings import load_documents  # 导入即完成模型与嵌入配置
from llama_index.core import VectorStoreIndex
from llama_index.core.node_parser import MarkdownNodeParser, SentenceSplitter
from llama_index.core.query_engine import RetrieverQueryEngine
from llama_index.core.retrievers import QueryFusionRetriever
from llama_index.retrievers.bm25 import BM25Retriever

# ① load_documents() 读语料 → list[Document]（整篇，没切）
documents = load_documents()

# ② MarkdownNodeParser 按标题分节（get_nodes_from_documents 执行）→ list[TextNode]，一节一个，只分组、不限长度
sections = MarkdownNodeParser().get_nodes_from_documents(documents)

# ③ SentenceSplitter 节内按句子切（get_nodes_from_documents 执行）→ list[TextNode]，单块 ≤256 token（先扣掉 metadata 的 token）
nodes = SentenceSplitter(chunk_size=256, chunk_overlap=32).get_nodes_from_documents(sections)

# ④ VectorStoreIndex 向量化 + 入库 → Index（块文本到此固定）
index = VectorStoreIndex(nodes)

# ⑤ as_retriever 造向量检索器 → 语义路（按「意思像」召回）
vector_retriever = index.as_retriever(similarity_top_k=4)

# ⑥ BM25Retriever.from_defaults 造关键词检索器 → 关键词路（按「字面命中」召回）
#    中文没有空格，默认正则会把整句当成一个词，所以换切词规则：中文按字、英文按词
keyword_retriever = BM25Retriever.from_defaults(
    nodes=nodes,
    similarity_top_k=4,
    token_pattern=r"(?u)[\\u4e00-\\u9fa5]|\\b\\w+\\b",
)

question = "pgvector 的 HNSW 索引怎么建"
# 两路各查一次：retrieve 执行检索 → list[NodeWithScore]
print("向量路：", [h.node.metadata.get("file_name") for h in vector_retriever.retrieve(question)])
print("关键词路：", [h.node.metadata.get("file_name") for h in keyword_retriever.retrieve(question)])

# ⑦ QueryFusionRetriever 融合 → list[NodeWithScore]（RRF 按排名合并，不是按分数）
#    num_queries=3：模型先把问题改写成 3 种问法，每种都查两路，再统一按排名合并
fusion = QueryFusionRetriever(
    retrievers=[vector_retriever, keyword_retriever],
    similarity_top_k=4,
    num_queries=3,
    mode="reciprocal_rerank",
    use_async=False,
)
print("融合后：")
for hit in fusion.retrieve(question):
    print(" ", round(hit.score or 0, 3), hit.node.metadata.get("file_name"))

# ⑧ RetrieverQueryEngine.from_args 把融合检索器接进查询引擎 → query 一步出答案
#    as_query_engine 只会用 index.as_retriever() 造一个向量检索器，接不了外部造好的 fusion
#    所以这里直接把 fusion 交给引擎
engine = RetrieverQueryEngine.from_args(fusion)
response = engine.query(question)
print("回答：", response)
print("引用：", [n.metadata.get("file_name") for n in response.source_nodes])
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
      "检索对了不等于回答对。合成阶段决定「几块一起喂模型」和「出处怎么标」。这一课换成带引用的引擎，回答自带 [1][2] 编号，`source_nodes` 按编号对应原文——出处不用自己拼。前一课那套后处理链原样搬进来，引用和重排叠在一起用。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-llamaindex-app 目录执行 uv run python -m src.basic",
        "「回答：…」里带 [1][2][3] 这样的编号，后面 3 行「[1] rag-production.md 重排分：10.0」——编号就是 source_nodes 的顺序，分数是重排打的",
      ],
    },
    concepts: [
      { text: "`CitationQueryEngine` — 带引用的查询引擎：回答里自动标 [1][2]，出处按编号对应" },
      { text: "`citation_chunk_size` — 引用切块粒度：块越小，出处越精确" },
      { text: "`source_nodes` — 回答实际用到的原文节点，编号引用就指它们" },
    ],
    files: [
      {
        path: "src/basic.py",
        order: 1,
        action: "replace",
        hint: "覆盖成带引用的回答：换带引用的引擎，把上一课的后处理链一起带上。",
        code: `from src.settings import load_documents  # 导入即完成模型与嵌入配置
from llama_index.core import VectorStoreIndex
from llama_index.core.node_parser import MarkdownNodeParser, SentenceSplitter
from llama_index.core.postprocessor import LLMRerank, SimilarityPostprocessor
from llama_index.core.query_engine import CitationQueryEngine

# ① load_documents() 读语料 → list[Document]（整篇，没切）
documents = load_documents()

# ② MarkdownNodeParser 按标题分节（get_nodes_from_documents 执行）→ list[TextNode]，一节一个，只分组、不限长度
sections = MarkdownNodeParser().get_nodes_from_documents(documents)

# ③ SentenceSplitter 节内按句子切（get_nodes_from_documents 执行）→ list[TextNode]，单块 ≤256 token（先扣掉 metadata 的 token）
nodes = SentenceSplitter(chunk_size=256, chunk_overlap=32).get_nodes_from_documents(sections)

# ④ VectorStoreIndex 向量化 + 入库 → Index（块文本到此固定）
index = VectorStoreIndex(nodes)

question = "生产环境的 RAG 要重点关注哪几件事"

# ⑤ CitationQueryEngine.from_args 造带引用的引擎 → 回答里的 [1][2] 由它自己编号，不用手拼
#    citation_chunk_size：引用切块粒度，块越小出处越精确（这里和正文切块同尺寸）
#    node_postprocessors：上一课那份后处理链原样搬进来（SimilarityPostprocessor 卡阈值 → LLMRerank 重排）
#    检索器要是自己拼的（如上一课的 fusion），换成 retriever=fusion，其余参数不变
engine = CitationQueryEngine.from_args(
    index,
    similarity_top_k=8,
    citation_chunk_size=256,
    node_postprocessors=[
        SimilarityPostprocessor(similarity_cutoff=0.6),
        LLMRerank(top_n=3),
    ],
)

# ⑥ query → 回答里带 [n]；source_nodes 的第 n 条就是 [n] 对应的原文
response = engine.query(question)
print("回答：", response)
for i, node in enumerate(response.source_nodes):
    print(f"[{i + 1}]", node.metadata.get("file_name"), "重排分：", node.score)
`,
      },
    ],
    docLinks: [
      {
        title: "响应合成器",
        href: "https://docs.llamaindex.ai/en/stable/module_guides/querying/response_synthesizers/",
      },
      {
        title: "引用引擎",
        href: "https://docs.llamaindex.ai/en/stable/examples/query_engine/citation_query_engine/",
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
        "再执行 uv run python -m src.ingest：第一次打印「本次需要处理文档数： 4」「本次处理块数： 19」，并给出一次回答",
        "原样重跑两个数都是 0，回答照样有；改一篇 md 再跑，只有「1 篇 / 4 块」，库里行数从 19 变 20——旧块被删掉换成新的",
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
        hint: "让模型给每篇文章写标题、摘要和三个标签。",
        code: `from pydantic import BaseModel, Field

from src.settings import load_documents  # 导入即完成模型与嵌入配置
from llama_index.core import Document, Settings
from llama_index.core.prompts import PromptTemplate
from llama_index.core.schema import TransformComponent

# PromptTemplate → 带 {占位符} 的提示词模板，调用时把变量填进去
PROMPT = PromptTemplate("从下面的正文里抽出结构化字段：\\n{text}")


# DocFields：要抽的字段清单，Field 描述每个字段的含义（描述越准，抽得越稳）
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


# FieldExtractor → 流水线的一步（TransformComponent）：__call__ 收 list[Document]，
# 返回 list[Document]（每个都多了抽出来的 title / summary / tags）
class FieldExtractor(TransformComponent):
    """流水线的第一步：抽字段写进新文档的 metadata。

    返回新对象而不是原地改：原文档的 hash 保持不动，
    下一次运行才判断得出「这篇正文变没变」，增量才有依据。
    """

    def __call__(self, nodes, **kwargs):
        extracted = []
        for node in nodes:
            fields = extract_fields(node)
            # Document(...)：抽完字段的新文档，原对象不动，所以原 hash 也不变
            extracted.append(
                Document(
                    text=node.text,
                    # id_ 沿用原来的：不传就会生成新 id，增量账本和向量库里的 ref_doc_id 全对不上
                    id_=node.id_,
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
        hint: "读 content 里的文章，让模型给每篇写标题、摘要和标签，再切成小块存进数据库；重跑时只处理改过的。跑之前要先有一个装了 pgvector 插件的 Postgres（向量就存在它里面），把连接地址填进 .env.local 的 DATABASE_URL。",
        code: `import os
from pathlib import Path

from src.extract import FieldExtractor
from src.settings import load_documents  # 导入即完成模型与嵌入配置
from llama_index.core import Settings, VectorStoreIndex
from llama_index.core.ingestion import IngestionPipeline
from llama_index.core.node_parser import MarkdownNodeParser, SentenceSplitter
from llama_index.core.storage.docstore import SimpleDocumentStore
from llama_index.vector_stores.postgres import PGVectorStore

# ① 读语料
documents = load_documents()

# ② 指纹账本：判断哪些文档改过
docstore_path = Path(".storage/docstore.json")
docstore_path.parent.mkdir(exist_ok=True)
docstore = (
    SimpleDocumentStore.from_persist_path(str(docstore_path))
    if docstore_path.exists()
    else SimpleDocumentStore()
)

# ③ 只处理新文档和改过的文档
changed = [doc for doc in documents if docstore.get_document_hash(doc.doc_id) != doc.hash]
print("本次需要处理文档数：", len(changed))

# ④ 初始化向量库（只建对象，不写数据）
db_url = os.environ["DATABASE_URL"]
vector_store = PGVectorStore.from_params(
    connection_string=db_url.replace("postgresql://", "postgresql+psycopg2://"),
    async_connection_string=db_url.replace("postgresql://", "postgresql+asyncpg://"),
    table_name="llama_chunks",
    embed_dim=1024,
)

# ⑤ 改过的先删旧块，否则库里两份
for doc in changed:
    if docstore.get_document_hash(doc.doc_id):
        vector_store.delete(doc.doc_id)

# ⑥ 流水线：抽字段 → 分节 → 切块 → 算向量
pipeline = IngestionPipeline(
    transformations=[
        FieldExtractor(),
        MarkdownNodeParser(),
        SentenceSplitter(chunk_size=256, chunk_overlap=32),
        Settings.embed_model,
    ],
    vector_store=vector_store,
)

# ⑦ 跑流水线入库
nodes = pipeline.run(documents=changed)
print("本次处理块数：", len(nodes))

# ⑧ 指纹写回账本
for doc in changed:
    docstore.set_document_hash(doc.doc_id, doc.hash)
docstore.persist(str(docstore_path))

# ⑨ 从库建索引，问一次
index = VectorStoreIndex.from_vector_store(vector_store)
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
      "一次检索不够时，流程会变成「检索 → 判断 → 再检索 → 合成」。这一课用事件驱动的 Workflow 写这条流程：分数不够就发一个重试事件回到同一个步骤，让模型把问题换个说法再查一次，脚本会把走过哪几步和改写后的新问法打出来。（把检索器包成工具交给 `FunctionAgent`，就是「模型自己决定查不查」的 agent 形态，属于另一条路，本课不展开。）",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-llamaindex-app 目录执行 uv run python -m src.workflow",
        "依次打印「第 1 次检索：最高分 0.xx」→（不到 0.7 时）「→ 改写为：…」（模型给出的新问法）→「第 2 次检索」→「③ 合成回答」→「最终回答：…」",
      ],
    },
    concepts: [
      { text: "`Event` — 自定义事件的基类，字段就是它在步骤间携带的数据" },
      { text: "`Workflow` — 事件驱动的流程容器，负责在步骤之间派发事件" },
      { text: "`step` — 一个处理步骤：接收某类事件，产出新事件" },
      { text: "`StartEvent` — 流程的起点事件，携带初始输入" },
      { text: "`StopEvent` — 流程的终点事件，携带最终结果" },
      { text: "`get_response_synthesizer` — 造合成器，只把节点写成答案，不负责检索" },
      { text: "`synthesize` — 传入问题与节点直接生成回答，不重新检索" },
      { text: "`acomplete` — 异步调用模型拿文本，本课用来改写问题" },
    ],
    files: [
      {
        path: "src/workflow.py",
        order: 1,
        action: "create",
        hint: "事件驱动流程：先检索一次，不够就改写查询再检索，最后合成。",
        code: `import asyncio

from src.settings import load_documents  # 导入即完成模型与嵌入配置
from llama_index.core import Settings, VectorStoreIndex, get_response_synthesizer
from llama_index.core.node_parser import MarkdownNodeParser, SentenceSplitter
from llama_index.core.schema import NodeWithScore
from llama_index.core.workflow import Event, StartEvent, StopEvent, Workflow, step

# ① 读语料
documents = load_documents()

# ② MarkdownNodeParser 按标题分节（get_nodes_from_documents 执行）
sections = MarkdownNodeParser().get_nodes_from_documents(documents)

# ③ SentenceSplitter 节内切块
nodes = SentenceSplitter(chunk_size=256, chunk_overlap=32).get_nodes_from_documents(sections)

# ④ VectorStoreIndex 建索引
index = VectorStoreIndex(nodes)

# ⑤ as_retriever 造检索器，retrieve 执行检索（流程里可能查两次）
retriever = index.as_retriever(similarity_top_k=4)

# ⑥ 合成器：只把检索到的块写成答案，不再检索
synthesizer = get_response_synthesizer()

# ⑦ 两种事件：检索完成 / 需要重试（带第几次）
#    事件类只是数据容器，谁处理它由 step 的参数类型注解决定，跟类名无关
class Retrieved(Event):
    question: str
    hits: list[NodeWithScore]

class Retry(Event):
    question: str
    attempt: int

# ⑧ 按 step 执行：ev 的类型声明它接收哪种事件
#    返回什么事件，就交给声明接收它的 step；所以返回 Retry 会回到 retrieve 自己
class RagFlow(Workflow):
    @step
    async def retrieve(self, ev: StartEvent | Retry) -> Retrieved | Retry:
        attempt = ev.attempt if isinstance(ev, Retry) else 1
        hits = retriever.retrieve(ev.question)
        best = max((h.score or 0) for h in hits)
        print(f"第 {attempt} 次检索：最高分 {best:.2f}")
        # 分数不够且还没到第 2 次 → 让模型换个问法，再回到本 step
        if best < 0.7 and attempt < 2:
            rewritten = (
                await Settings.llm.acomplete(f"把下面的问题换个说法，只输出新问题本身：{ev.question}")
            ).text.strip()
            print(f"   → 改写为：{rewritten}")
            return Retry(question=rewritten, attempt=attempt + 1)
        return Retrieved(question=ev.question, hits=hits)

    @step
    async def synthesize(self, ev: Retrieved) -> StopEvent:
        print("③ 合成回答")
        return StopEvent(result=synthesizer.synthesize(ev.question, nodes=ev.hits))


async def main():
    # run 只抛 StartEvent，之后全按事件类型派发；它是 async，所以套一层 async main
    flow = RagFlow(timeout=120)
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
    slug: "evaluation",
    title: "评测：怎么证明检索真的变好了",
    menuTitle: "评测",
    summary:
      "没有评测就没有优化。这一课先建一个 5 条的评测集（可答 3 条 + 应拒答 2 条），再批量跑出检索指标（hit_rate / mrr）、生成指标（忠实度 / 相关性）和拒答率，把「感觉更准」变成一张能对比的表。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-llamaindex-app 目录执行 uv run python -m src.eval",
        "先逐条打印 3 条可答问题的 {'hit_rate': 1.0, 'mrr': 1.0}，再打印 2 条应拒答题的「已拒答」，最后汇总为 hit_rate 1.0 / mrr 1.0 / 忠实度 1.0 / 相关性 1.0 / 拒答 2/2",
        "给检索器加上 filters=MetadataFilters(filters=[MetadataFilter(key=\"type\", value=\"notes\")]) 再跑：q2 变成 hit_rate 0、mrr 0，汇总掉到 0.667——博客里的 HNSW 被过滤掉了，评测立刻抓到",
      ],
    },
    concepts: [
      { text: "`RetrieverEvaluator` — 用标注好的问题与期望节点算检索指标" },
      { text: "`from_metric_names` — 用字符串清单挑指标：hit_rate / mrr / precision / recall" },
      { text: "`aevaluate` — 单条检索评测，返回每条指标的分数" },
      { text: "`BatchEvalRunner` — 打包多个评估器，一次并发跑完一批问题" },
      { text: "`aevaluate_queries` — 批量跑查询引擎并逐条打分" },
      { text: "`FaithfulnessEvaluator` — 检查回答是否只用了检索到的内容" },
      { text: "`RelevancyEvaluator` — 检查检索到的内容是否真的与问题相关" },
    ],
    files: [
      {
        path: "src/eval_questions.json",
        order: 1,
        action: "create",
        hint: "评测集：每条问题标注该命中哪些文件，以及是不是「语料里没有、应该拒答」的题。",
        code: `[
  {
    "id": "q1",
    "query": "切块粒度为什么会影响检索质量",
    "expected_files": ["chunking.md"],
    "should_refuse": false
  },
  {
    "id": "q2",
    "query": "HNSW 的 m 和 ef_construction 怎么调",
    "expected_files": ["pgvector-hnsw.md"],
    "should_refuse": false
  },
  {
    "id": "q3",
    "query": "召回和重排各自负责什么",
    "expected_files": ["rerank.md"],
    "should_refuse": false
  },
  {
    "id": "q4",
    "query": "Turso 的免费额度是多少",
    "expected_files": [],
    "should_refuse": true
  },
  {
    "id": "q5",
    "query": "明天上海会下雨吗",
    "expected_files": [],
    "should_refuse": true
  }
]
`,
      },
      {
        path: "src/eval.py",
        order: 2,
        action: "create",
        hint: "评测脚本：读评测集 → 逐条算检索指标 → 批量算生成指标 → 跑应拒答题 → 打一张汇总表。",
        code: `import asyncio
import json
from pathlib import Path

from src.settings import load_documents  # 导入即完成模型与嵌入配置
from llama_index.core import VectorStoreIndex
from llama_index.core.evaluation import (
    BatchEvalRunner,
    FaithfulnessEvaluator,
    RelevancyEvaluator,
    RetrieverEvaluator,
)
from llama_index.core.node_parser import MarkdownNodeParser, SentenceSplitter

# ① 读语料、按标题分节、节内切块
documents = load_documents()
sections = MarkdownNodeParser().get_nodes_from_documents(documents)
nodes = SentenceSplitter(chunk_size=256, chunk_overlap=32).get_nodes_from_documents(sections)

# ② 建索引，造检索器与查询引擎（top_k 两边一致，比较才有意义）
index = VectorStoreIndex(nodes)
retriever = index.as_retriever(similarity_top_k=4)
query_engine = index.as_query_engine(similarity_top_k=4)

# ③ 读评测集：query / expected_files / should_refuse
questions = json.loads(
    (Path(__file__).parent / "eval_questions.json").read_text(encoding="utf-8")
)

# ④ 评测集里写的是文件名，这里换算成块 id，评测器才认
#    结果形如 {"chunking.md": ["6941a4…", "5daf85…"]}，类型是 dict[str, list[str]]
ids_by_file = {}
for n in nodes:
    ids_by_file.setdefault(n.metadata.get("file_name"), []).append(n.node_id)

# ⑤ 检索评测器：hit_rate 看有没有命中，mrr 看命中的块排得靠不靠前
retriever_evaluator = RetrieverEvaluator.from_metric_names(
    ["hit_rate", "mrr"], retriever=retriever
)


async def main():
    # ⑥ 检索评测：逐条跑，收集每条分数（当前版本没有批量接口）
    answerable = [q for q in questions if q["expected_files"]]
    per_question = []
    for q in answerable:
        expected = [i for f in q["expected_files"] for i in ids_by_file.get(f, [])]
        result = await retriever_evaluator.aevaluate(query=q["query"], expected_ids=expected)
        per_question.append(result.metric_vals_dict)
        print(f"{q['id']} {q['query']} → {result.metric_vals_dict}")

    # ⑦ 生成评测：BatchEvalRunner 一次跑完所有可答问题（并发 4）
    runner = BatchEvalRunner(
        {"faithfulness": FaithfulnessEvaluator(), "relevancy": RelevancyEvaluator()},
        workers=4,
    )
    gen = await runner.aevaluate_queries(
        query_engine, queries=[q["query"] for q in answerable]
    )

    # ⑧ 应拒答题：语料里没有，看回答有没有拒答
    refusals = [q for q in questions if q["should_refuse"]]
    refused = 0
    for q in refusals:
        answer = str(query_engine.query(q["query"]))
        hit = any(w in answer for w in ("没有", "不知道", "无法", "未提及", "不包含"))
        refused += hit
        print(f"{q['id']} {q['query']} → {'已拒答' if hit else '未拒答：' + answer[:40]}")

    # ⑨ 汇总：多条样本取平均，单条分数没有统计意义
    avg = lambda vals: round(sum(vals) / len(vals), 3) if vals else 0.0
    print("\\n=== 汇总 ===")
    print("检索 hit_rate:", avg([r["hit_rate"] for r in per_question]))
    print("检索 mrr:", avg([r["mrr"] for r in per_question]))
    print("忠实度:", avg([r.score for r in gen["faithfulness"]]))
    print("相关性:", avg([r.score for r in gen["relevancy"]]))
    print(f"拒答: {refused}/{len(refusals)}")


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
