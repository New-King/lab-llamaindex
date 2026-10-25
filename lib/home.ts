export type HomeSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

import type { DocLink } from "@/lib/doc-link";

export type HomeDocLink = DocLink;

export type HomeStackItem = {
  label: string;
  value: string;
};

export const HOME_INIT_PATH = "/lab/getting-started";

export const HOME = {
  title: "LlamaIndex Lab",
  sections: [
    {
      title: "什么是 LlamaIndex",
      paragraphs: [
        "LlamaIndex 是围绕「数据接入与检索」的框架：把散落的文档变成可检索的索引，再把索引接到问答、Agent 或工作流上。",
        "它和编排框架的分工很清楚：编排负责「什么时候做、做几步」，检索负责「找到哪几块、怎么排、怎么引用」。本 Lab 只讲后面这一半。",
      ],
    },
    {
      title: "核心组成",
      bullets: [
        "Document 与 Node —— 原始文档与切块后的节点，节点上挂着 metadata（可筛字段）。",
        "Index —— 节点加向量的容器，决定检索时用什么数据结构。",
        "Retriever 与 Postprocessor —— 召回多少条、怎么过滤、怎么重排。",
        "QueryEngine 与 ResponseSynthesizer —— 把命中的块合成为带出处的回答。",
        "IngestionPipeline —— 切块、向量化、去重、落库的流水线，支持增量。",
        "Workflow 与 Agent —— 事件驱动流程、以及把检索器当工具交给模型决定何时调用。",
      ],
    },
    {
      title: "本 Lab 讲什么",
      paragraphs: [
        "本 Lab 采用项目驱动式学习：在独立的 Python 项目 my-llamaindex-app 里，按左侧课程把一个「网站内容知识库」从最小闭环做到可评测。",
        "学习路径：最小闭环 → 切块与元数据 → 检索器与过滤 → 重排 → 混合检索与多路查询 → 合成与引用 → 入库流水线 → 工作流 → 评测。",
      ],
    },
    {
      title: "怎么读这个 Lab",
      bullets: [
        "每课页上半部分是知识点（本课出现的 API），下半部分是操作列表：装依赖 → 创建文件 → 粘贴代码 → 验收。",
        "跟做顺序：先在项目里建好文件，再逐块复制代码，最后按「验收」里的命令跑一次。",
        "右侧是本课用到的官方文档；知识点右上角偶尔会有「延伸阅读」，讲一个相关但不在主线里的概念。",
      ],
    },
  ] satisfies HomeSection[],
  stack: {
    title: "本教程技术栈",
    items: [
      { label: "语言", value: "Python 3.12" },
      { label: "环境工具", value: "uv" },
      { label: "检索框架", value: "llama-index-core" },
      { label: "对话模型", value: "DeepSeek（OpenAI 兼容端点）" },
      { label: "嵌入模型", value: "硅基流动 BAAI/bge-large-zh-v1.5（1024 维）" },
      { label: "向量库", value: "先内存，第 7 课起 Postgres + pgvector" },
      { label: "验证方式", value: "每课一个可独立运行的 Python 脚本" },
    ] satisfies HomeStackItem[],
  },
  cta: {
    label: "立即开始",
    href: HOME_INIT_PATH,
  },
  docLinks: [
    {
      title: "LlamaIndex 文档",
      href: "https://docs.llamaindex.ai/en/stable/",
    },
    {
      title: "入门示例",
      href: "https://docs.llamaindex.ai/en/stable/getting_started/starter_example/",
    },
    {
      title: "检索器",
      href: "https://docs.llamaindex.ai/en/stable/module_guides/querying/retriever/",
    },
    {
      title: "摄取流水线",
      href: "https://docs.llamaindex.ai/en/stable/module_guides/loading/ingestion_pipeline/",
    },
    {
      title: "评测",
      href: "https://docs.llamaindex.ai/en/stable/module_guides/evaluating/",
    },
  ] satisfies HomeDocLink[],
};
