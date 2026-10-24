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
      "装三件套：核心包、对话模型（OpenAI 兼容端点，用于 DeepSeek）、嵌入模型（OpenAI 兼容端点，用于硅基流动）。",
    command:
      "uv add llama-index-core llama-index-llms-openai-like llama-index-embeddings-openai-like",
  },
  {
    description: "建语料目录：本课程的知识库来自这里的 markdown。",
    command: "mkdir -p content",
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
        hint: "对话走 DeepSeek，嵌入走硅基流动（中文向量），两行都给上：",
        code: `DEEPSEEK_API_KEY=sk-...
SILICONFLOW_API_KEY=sk-...`,
      },
    ],
  },
  {
    kind: "project",
    slug: "minimal-rag",
    title: "最小 RAG 闭环：读文件、建索引、问答",
    menuTitle: "最小闭环",
    summary:
      "先跑通一条最短的链：目录 → Document → 索引 → 查询引擎。这一步之后，所有优化都是在这条链上换零件。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-llamaindex-app 目录执行 uv run python -m src.basic",
        "打印出回答与命中的来源文件名，说明「检索 + 合成」这条链已经通了",
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
    model="deepseek-chat",
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

# 建完索引的提示：默认是内存向量库，进程退出即失
Settings.chunk_size = 512
Settings.chunk_overlap = 64`,
      },
      {
        path: "src/basic.py",
        order: 2,
        action: "create",
        hint: "最小闭环：读语料 → 建索引 → 查一次。",
        code: `from src import settings  # noqa: F401  先配置模型与嵌入
from llama_index.core import SimpleDirectoryReader, VectorStoreIndex

# ① 读语料：content/ 下的 markdown 变成 Document
documents = SimpleDirectoryReader("content").load_data()
print("文档数：", len(documents))

# ② 建索引：切块 + 向量化（默认走内存向量库，重启即失）
index = VectorStoreIndex.from_documents(documents)

# ③ 查询：先检索相关块，再交给模型合成答案
engine = index.as_query_engine()
response = engine.query("切块粒度为什么会影响检索质量")
print("回答：", response)

# ④ 来源：合成时用到了哪些块
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
      "切块决定「能不能被召回」，元数据决定「能不能被筛掉」。这一课把默认切块换成可控的两种策略，并把 frontmatter 变成可筛字段。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-llamaindex-app 目录执行 uv run python -m src.basic",
        "打印出每个块的字符数与 metadata，能看到标题与日期已经从 frontmatter 带上来了",
      ],
    },
    concepts: [
      {
        text: "`SentenceSplitter` — 按句子边界切块，用 chunk_size 与 chunk_overlap 控制粒度",
      },
      {
        text: "`MarkdownNodeParser` — 按 markdown 结构切块：标题分节、代码块与表格不拆开",
      },
      { text: "`node_parser` — 建索引时指定用哪个切块器" },
      { text: "`metadata` — 挂在节点上的可筛字段，来源是 frontmatter" },
    ],
    files: [
      {
        path: "src/basic.py",
        order: 1,
        action: "replace",
        hint: "覆盖成「先按 markdown 切节、再按句子切块」，并打印每块的元数据。",
        code: `from src import settings  # noqa: F401
from llama_index.core import SimpleDirectoryReader, VectorStoreIndex
from llama_index.core.node_parser import MarkdownNodeParser, SentenceSplitter

documents = SimpleDirectoryReader("content").load_data()

# ① 先按 markdown 结构切：标题分节、代码块与表格保持完整
md_parser = MarkdownNodeParser()
sections = md_parser.get_nodes_from_documents(documents)

# ② 再按句子切块：块太大召回噪声多，太小语义不完整
splitter = SentenceSplitter(chunk_size=512, chunk_overlap=64)
nodes = splitter.get_nodes_from_documents(sections)

print("块数：", len(nodes))
for node in nodes[:5]:
    # metadata 里带着 frontmatter 的字段，后面可以用来过滤
    print(len(node.text), "字", node.metadata.get("title"), node.metadata.get("date"))

# ③ 用切好的块建索引：node_parser 换掉默认切块
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
      "查询引擎是黑盒，检索器不是。这一课把索引换成显式检索器，看到每条结果的分数，并用元数据把不该出现的块筛掉。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-llamaindex-app 目录执行 uv run python -m src.basic",
        "打印出每条命中的分数与 metadata，加了过滤条件后返回集合明显变小",
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
        hint: "覆盖成显式检索：先看分数，再加元数据过滤。",
        code: `from src import settings  # noqa: F401
from llama_index.core import SimpleDirectoryReader, VectorStoreIndex
from llama_index.core.node_parser import MarkdownNodeParser, SentenceSplitter
from llama_index.core.vector_stores import MetadataFilter, MetadataFilters

documents = SimpleDirectoryReader("content").load_data()
sections = MarkdownNodeParser().get_nodes_from_documents(documents)
nodes = SentenceSplitter(chunk_size=512, chunk_overlap=64).get_nodes_from_documents(sections)
index = VectorStoreIndex(nodes)

# ① 显式检索器：召回条数由 similarity_top_k 控制
retriever = index.as_retriever(similarity_top_k=5)

# ② 只看分数：NodeWithScore 把分数和节点放在一起
for hit in retriever.retrieve("切块粒度为什么会影响检索质量"):
    print(round(hit.score or 0, 3), hit.node.metadata.get("file_name"))

# ③ 加元数据过滤：只在某一类内容里检索，而不是检索完再筛
filtered = index.as_retriever(
    similarity_top_k=5,
    filters=MetadataFilters(
        filters=[MetadataFilter(key="type", value="notes")],
    ),
)
print("过滤后命中：", len(filtered.retrieve("切块粒度怎么定")))
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
      "向量召回的判断标准是「像不像」，重排的判断标准是「能不能回答问题」。这一课对比不重排、只卡阈值、卡阈值加重排三种效果。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-llamaindex-app 目录执行 uv run python -m src.basic",
        "三段输出里，重排后的头一条明显更贴着问题，且低分噪声被阈值砍掉",
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
        code: `from src import settings  # noqa: F401
from llama_index.core import SimpleDirectoryReader, VectorStoreIndex
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.postprocessor import LLMRerank, SimilarityPostprocessor

documents = SimpleDirectoryReader("content").load_data()
nodes = SentenceSplitter(chunk_size=512, chunk_overlap=64).get_nodes_from_documents(documents)
index = VectorStoreIndex(nodes)
retriever = index.as_retriever(similarity_top_k=8)
question = "重排和向量召回的分工是什么"

# ① 裸召回：先看基线
base = retriever.retrieve(question)
print("召回：", [(round(h.node.score or 0, 3)) for h in base])

# ② 卡阈值：分数太低直接扔掉（阈值过高会误杀）
kept = SimilarityPostprocessor(similarity_cutoff=0.6).postprocess_nodes(base, query_str=question)
print("卡阈值后：", len(kept))

# ③ 再精排：模型按「能不能回答问题」重排，只留 top_n 条进 prompt
ranked = LLMRerank(top_n=3).postprocess_nodes(kept, query_str=question)
for item in ranked:
    print(item.score, item.node.metadata.get("file_name"))
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
      "语义检索擅长「意思像」，关键词检索擅长「字面准」。专有名词、缩写、产品名这类问题，两路一起召回再融合才稳。",
    install: {
      command: "uv add llama-index-retrievers-bm25",
      description: "在 my-llamaindex-app 目录执行，装上 BM25 关键词检索器。",
    },
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-llamaindex-app 目录执行 uv run python -m src.basic",
        "打印出三组结果：单独向量、单独关键词、融合后的顺序，能看到融合把两路的长处合在一起",
      ],
    },
    concepts: [
      { text: "`BM25Retriever` — 关键词检索：命中专有名词与精确串" },
      { text: "`QueryFusionRetriever` — 多路召回按排名融合，不用自己写排序" },
      { text: "`num_queries` — 一次生成几路查询，做多查询召回" },
      { text: "`tokenizer` — 关键词检索先接中文分词器，否则中文被当成整串" },
    ],
    files: [
      {
        path: "src/basic.py",
        order: 1,
        action: "replace",
        hint: "覆盖成「向量 + BM25 融合」：两路各自召回，再按排名融合。",
        code: `import jieba
from src import settings  # noqa: F401
from llama_index.core import SimpleDirectoryReader, VectorStoreIndex
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.retrievers import QueryFusionRetriever
from llama_index.retrievers.bm25 import BM25Retriever

documents = SimpleDirectoryReader("content").load_data()
nodes = SentenceSplitter(chunk_size=512, chunk_overlap=64).get_nodes_from_documents(documents)
index = VectorStoreIndex(nodes)

# ① 语义路：向量检索
vector_retriever = index.as_retriever(similarity_top_k=4)

# ② 关键词路：BM25 要先用分词器切中文
BM25Retriever.tokenizer = jieba.lcut
keyword_retriever = BM25Retriever.from_defaults(nodes=nodes, similarity_top_k=4)

# ③ 融合：RLF 按排名（不是分数）合并两路
fusion = QueryFusionRetriever(
    retrievers=[vector_retriever, keyword_retriever],
    similarity_top_k=4,
    num_queries=1,
    mode="reciprocal_rerank",
    use_async=False,
)
question = "pgvector 的 HNSW 索引怎么建"
for hit in fusion.retrieve(question):
    print(round(hit.score or 0, 3), hit.node.metadata.get("file_name"), hit.node.text[:32])
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
      "检索对了不等于回答对。合成阶段决定「几块一起喂模型」以及「怎么给出处」——不可审计的回答在生产里等于没有。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-llamaindex-app 目录执行 uv run python -m src.basic",
        "回答里出现引用编号，且每个编号都能对应到一条来源文件名",
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
        code: `from src import settings  # noqa: F401
from llama_index.core import SimpleDirectoryReader, VectorStoreIndex
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.response_synthesizers import get_response_synthesizer

documents = SimpleDirectoryReader("content").load_data()
nodes = SentenceSplitter(chunk_size=512, chunk_overlap=64).get_nodes_from_documents(documents)
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
      "两件事串成一条链：入库前先把正文抽成字段，再把「读 → 抽 → 切 → 向量化 → 落库」做成可重跑、可增量的流水线，最终落到 Postgres。",
    install: {
      command: "uv add llama-index-vector-stores-postgres",
      description: "在 my-llamaindex-app 目录执行，装上 Postgres + pgvector 的向量库适配。",
    },
    verify: {
      label: "跑两个脚本看结果",
      description: [
        "在 my-llamaindex-app 目录执行 uv run python -m src.extract，逐篇打印抽到的标题与标签",
        "再执行 uv run python -m src.ingest：第一次打印处理了多少块；改一篇 md 后重跑，只有那一篇被重新处理",
      ],
    },
    concepts: [
      { text: "`BaseModel` — Pydantic 模型：定义要抽哪些字段、字段什么类型" },
      { text: "`structured_predict` — 按模型定义让 LLM 直接产出结构化结果" },
      { text: "`as_structured_llm` — 把普通模型包装成结构化输出模型" },
      { text: "`IngestionPipeline` — 把切块与向量化串成可重跑的流水线" },
      { text: "`docstore` — 记录已处理文档的指纹，未变就跳过（增量的关键）" },
      { text: "`PGVectorStore` — Postgres 加 pgvector 的向量库，跨进程持久" },
      { text: "`persist` — 把索引与 docstore 落盘，下次直接加载" },
    ],
    files: [
      {
        path: "src/extract.py",
        order: 1,
        action: "create",
        hint: "抽取模块：先定义要哪些字段，再写成一个函数，入库脚本直接复用。",
        code: `from pydantic import BaseModel, Field

from src import settings  # noqa: F401
from llama_index.core import Document, SimpleDirectoryReader
from llama_index.core.prompts import PromptTemplate

PROMPT = PromptTemplate("从下面的正文里抽出结构化字段：\\n{text}")


class DocFields(BaseModel):
    """一篇文档要抽出来的字段。字段越少越稳，别贪多。"""

    title: str = Field(description="一句话标题")
    summary: str = Field(description="两句话以内的摘要")
    tags: list[str] = Field(description="三到五个主题标签")


def extract_fields(doc: Document) -> DocFields:
    """抽字段：抽取器挂在同一个模型上，这一步只调模型，不建索引。"""
    structured_llm = settings.Settings.llm.as_structured_llm(DocFields)
    return structured_llm.structured_predict(DocFields, PROMPT, text=doc.text[:2000])


if __name__ == "__main__":
    # 单独跑：先看看这篇语料能抽出什么
    for doc in SimpleDirectoryReader("content").load_data()[:5]:
        fields = extract_fields(doc)
        print(doc.metadata.get("file_name"), "→", fields.title, fields.tags)
`,
      },
      {
        path: "src/ingest.py",
        order: 2,
        action: "create",
        hint: "入库脚本：先抽字段写进 metadata，再走流水线去重、向量化、落 pgvector。",
        code: `import os
from pathlib import Path

from src import settings  # noqa: F401
from src.extract import extract_fields
from llama_index.core import SimpleDirectoryReader, StorageContext, VectorStoreIndex
from llama_index.core.ingestion import IngestionPipeline
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.storage.docstore import SimpleDocumentStore
from llama_index.vector_stores.postgres import PGVectorStore

# ① 先抽字段：正文变成 metadata，后面切块、入库、过滤都带着它走
documents = SimpleDirectoryReader("content").load_data()
for doc in documents[:5]:
    fields = extract_fields(doc)
    doc.metadata.update(
        {"title": fields.title, "summary": fields.summary, "tags": fields.tags}
    )

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

pipeline = IngestionPipeline(
    transformations=[SentenceSplitter(chunk_size=512, chunk_overlap=64)],
    docstore=docstore,
    vector_store=vector_store,
)

nodes = pipeline.run(documents=documents)
print("本次处理块数：", len(nodes))

# ④ 落盘索引与 docstore：下次直接加载，不用重算
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
      "一次检索不够时，需要「判断 → 检索 → 判断 → 再检索」。这一课用事件驱动的 Workflow 把这条流程写清楚，并说明它与状态机式编排的分工。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-llamaindex-app 目录执行 uv run python -m src.workflow",
        "打印出每一步的事件流，一次检索不达标时能看到第二次检索被触发",
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

from src import settings  # noqa: F401
from llama_index.core import SimpleDirectoryReader, VectorStoreIndex
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.workflow import (
    Event,
    StartEvent,
    StopEvent,
    Workflow,
    step,
)

documents = SimpleDirectoryReader("content").load_data()
nodes = SentenceSplitter(chunk_size=512, chunk_overlap=64).get_nodes_from_documents(documents)
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
        # 分数都太低就改写问题再来一轮
        if max((h.score or 0) for h in hits) < 0.7:
            return Retry(question=f"{ev.question}（换个说法再查一次）")
        return Retrieved(question=ev.question, hits=hits)

    @step
    async def retry_retrieve(self, ev: Retry) -> Retrieved:
        return Retrieved(question=ev.question, hits=retriever.retrieve(ev.question))

    @step
    async def synthesize(self, ev: Retrieved) -> StopEvent:
        answer = index.as_query_engine().query(ev.question)
        return StopEvent(result=answer)

flow = RagFlow(timeout=60)
print(asyncio.run(flow.run(question="HNSW 索引在生产里怎么调")))
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
        "打印出工具调用记录：需要查资料的问题出现检索调用，纯寒暄的问题直接回答",
      ],
    },
    concepts: [
      { text: "`QueryEngineTool` — 把查询引擎包成 agent 能调用的工具" },
      { text: "`ToolMetadata` — 工具的名字与说明，模型据此判断什么时候调用" },
      { text: "`FunctionAgent` — 会调用工具、并根据结果继续推理的 agent" },
      { text: "`system_prompt` — agent 的行为约束：什么时候检索、什么时候直接回答" },
    ],
    files: [
      {
        path: "src/agent.py",
        order: 1,
        action: "create",
        hint: "工具化检索：查询引擎当工具，agent 自主决定调不调。",
        code: `import asyncio

from src import settings  # noqa: F401
from llama_index.core import SimpleDirectoryReader, VectorStoreIndex
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.tools import QueryEngineTool, ToolMetadata
from llama_index.core.agent.workflow import FunctionAgent

documents = SimpleDirectoryReader("content").load_data()
nodes = SentenceSplitter(chunk_size=512, chunk_overlap=64).get_nodes_from_documents(documents)
index = VectorStoreIndex(nodes)

# ① 把查询引擎包成工具：说明写得越准，模型越知道何时该调
tool = QueryEngineTool(
    query_engine=index.as_query_engine(),
    metadata=ToolMetadata(
        name="search_knowledge",
        description="检索站点内容（博客、笔记、项目）。问题涉及站内内容时调用。",
    ),
)

# ② FunctionAgent：自己决定调工具，还是直接回答
agent = FunctionAgent(
    tools=[tool],
    llm=settings.Settings.llm,
    system_prompt="回答站点相关问题前，先用 search_knowledge 检索；寒暄类问题直接回答。",
)

async def main():
    print(await agent.run("切块粒度怎么定"))
    print(await agent.run("谢谢"))

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
      "没有评测就没有优化。这一课用一小批评测问题算出检索指标与生成指标，把「感觉更准」变成可以对比的数字。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-llamaindex-app 目录执行 uv run python -m src.eval",
        "打印出 Hit Rate、MRR 与忠实度得分；改一次切块参数后重跑，指标变化可见",
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

from src import settings  # noqa: F401
from llama_index.core import SimpleDirectoryReader, VectorStoreIndex
from llama_index.core.evaluation import (
    FaithfulnessEvaluator,
    RelevancyEvaluator,
    RetrieverEvaluator,
)
from llama_index.core.node_parser import SentenceSplitter

documents = SimpleDirectoryReader("content").load_data()
nodes = SentenceSplitter(chunk_size=512, chunk_overlap=64).get_nodes_from_documents(documents)
index = VectorStoreIndex(nodes)
retriever = index.as_retriever(similarity_top_k=4)

# ① 检索指标：先用两条标注样本算 Hit Rate 与 MRR
evaluator = RetrieverEvaluator.from_metric_names(
    ["mrr", "hit_rate"], retriever=retriever
)

async def main():
    result = await evaluator.aevaluate(
        query="切块粒度为什么会影响检索质量",
        expected_ids=[nodes[0].node_id, nodes[1].node_id],
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
