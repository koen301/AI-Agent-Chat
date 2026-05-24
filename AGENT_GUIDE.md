# Agent 深度讲解：从 ReAct 到 Tool Calling

> 基于 Vercel AI SDK 的 TypeScript Agent 实现详解

---

## 一、Agent 到底是什么？

### 1.1 一句话定义

**Agent = LLM + 工具（Tools）+ 自主决策循环**

传统 Chain（链）是固定流程：A → B → C，每一步都是程序员写死的。

Agent 是动态流程：LLM 自己决定下一步做什么，可能 A → B → A → C，循环直到任务完成。

### 1.2 为什么需要 Agent？

场景：用户问 **"我上传的预算文档里，Q1 和 Q2 的预算总和是多少？"**

**纯 RAG 的问题：**
- 检索到文档片段 → 拼接给 LLM → LLM 心算 → 可能算错
- LLM 不擅长精确数学计算

**Agent 的解决方式：**
```
Thought: 用户问预算总和，我需要先找到相关文档，然后计算
Action: searchKnowledgeBase("Q1 Q2 预算")
Observation: [检索到 3 个片段，包含 Q1: 100万, Q2: 150万]
Thought: 找到了数据，现在需要计算总和
Action: calculator("100 + 150")
Observation: { result: 250 }
Thought: 得到结果了，可以回答用户
Final Answer: Q1 和 Q2 的预算总和是 250 万元。
```

---

## 二、ReAct 模式详解

### 2.1 ReAct = Reasoning + Acting

来自论文《ReAct: Synergizing Reasoning and Acting in Language Models》（2022）

核心思想：让 LLM **先思考（Thought），再行动（Action），观察结果（Observation），再思考**，形成循环。

### 2.2 循环结构

```
┌─────────────────────────────────────┐
│  User Input: "预算总和是多少？"       │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│  Thought 1: 需要检索预算文档         │
│  Action 1: searchKnowledgeBase(...) │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│  Observation 1: [文档片段...]        │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│  Thought 2: 需要计算数值             │
│  Action 2: calculator(...)          │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│  Observation 2: { result: 250 }      │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│  Thought 3: 可以给出最终答案         │
│  Final Answer: 总和是 250 万         │
└─────────────────────────────────────┘
```

### 2.3 与 Chain 的对比

| 维度 | Chain | Agent |
|------|-------|-------|
| 流程 | 固定 | 动态 |
| 决策 | 程序员控制 | LLM 自主 |
| 工具调用 | 固定顺序 | 按需调用 |
| 适用场景 | 标准化任务 | 复杂、多步骤任务 |
| Token 消耗 | 少 | 多（多轮思考） |
| 延迟 | 低 | 高（多轮 API 调用） |

---

## 三、Vercel AI SDK 的 Tool Calling 实现

### 3.1 核心 API：`generateText` + `tools`

```typescript
import { generateText, tool } from 'ai';
import { z } from 'zod';

const result = await generateText({
  model: openai('gpt-4'),
  system: '你是助手，可以调用工具',
  prompt: '用户问题',
  tools: {
    searchKnowledgeBase: tool({
      description: '从知识库检索信息',
      parameters: z.object({ query: z.string() }),
      execute: async ({ query }) => { /* ... */ },
    }),
    calculator: tool({
      description: '执行计算',
      parameters: z.object({ expression: z.string() }),
      execute: async ({ expression }) => { /* ... */ },
    }),
  },
  maxSteps: 5, // 最多 5 轮 Tool Calling
});
```

### 3.2 内部发生了什么？

`generateText` 的 `maxSteps` 参数开启了一个**自动循环**：

**Step 1: 初始生成**
```
LLM 收到：system + prompt
LLM 输出：Thought + Action（调用 tool）
```

**Step 2: 执行 Tool**
```
SDK 解析 Action → 找到对应 tool → 执行 execute 函数
获取 Observation（Tool 返回结果）
```

**Step 3: 再次生成**
```
LLM 收到：system + prompt + Thought + Action + Observation
LLM 输出：新的 Thought + 可能的新 Action
```

**循环直到：**
- LLM 不再调用 Tool，直接给出 Final Answer
- 达到 maxSteps 上限
- 出现错误

### 3.3 Tool 定义的三要素

```typescript
const myTool = tool({
  // 1. description: 告诉 LLM 这个工具是干什么的
  //    LLM 根据 description 决定是否调用
  description: '从知识库中检索与用户问题相关的文档片段',

  // 2. parameters: Zod Schema，定义工具需要的参数
  //    LLM 会根据这个 Schema 生成参数
  parameters: z.object({
    query: z.string().describe('用于检索的关键词'),
  }),

  // 3. execute: 实际执行的函数
  //    可以是任何异步操作：查数据库、调 API、计算...
  execute: async ({ query }) => {
    const docs = await searchVectorStore(query);
    return docs;
  },
});
```

**关键点：**
- `description` 是 Prompt Engineering 的一部分，写得好坏直接决定 Agent 会不会正确调用
- `parameters` 用 Zod 定义，SDK 会自动把 Schema 转成 JSON Schema 发给 LLM
- `execute` 里可以写任何逻辑，这是 Agent 的"手脚"

---

## 四、我们的 Agent 实现拆解

### 4.1 两个 Tool 的设计

**Tool 1: searchKnowledgeBase（知识库检索）**

```typescript
const searchKnowledgeBase = tool({
  description: '从个人知识库中检索与用户问题相关的文档片段。当问题涉及已上传的文档、技术资料、产品说明时使用此工具。',
  parameters: z.object({
    query: z.string().describe('用于检索的关键词或问题，建议提取核心实体'),
  }),
  execute: async ({ query }) => {
    const { context, sources } = await retrieveContext(query);
    return { found: sources.length > 0, context, sources };
  },
});
```

**设计要点：**
- `description` 明确限定了使用场景（"涉及已上传文档时"），避免 LLM 滥用
- `query` 参数让 LLM 自己决定检索关键词，可能比用户原问题更精准
- 返回结构化数据，方便 LLM 后续处理

**Tool 2: calculator（计算器）**

```typescript
const calculator = tool({
  description: '执行数学计算。当问题涉及加减乘除、百分比、统计计算时使用此工具。',
  parameters: z.object({
    expression: z.string().describe('数学表达式，例如 "15 * 23 + 100"'),
  }),
  execute: async ({ expression }) => {
    const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
    const result = Function('"use strict"; return (' + sanitized + ')')();
    return { result, expression: sanitized };
  },
});
```

**设计要点：**
- 用正则过滤危险字符，防止代码注入
- LLM 可能生成 `"100万 + 150万"`，需要在 description 里引导它用纯数字
- 返回原始表达式 + 结果，方便 LLM 引用

### 4.2 System Prompt 的设计

```typescript
const systemPrompt = `你是一位专业的 AI 助手...

工作原则：
1. 如果用户问题涉及已上传的文档内容，优先调用 searchKnowledgeBase
2. 如果涉及数值计算，必须调用 calculator，不要心算
3. 基于检索到的信息给出准确、简洁的回答
4. 如果知识库中没有相关信息，坦诚告知用户
`;
```

**这是 Agent 的"宪法"：**
- 明确 Tool 的优先级和使用规则
- 约束 LLM 的行为边界（"不要心算"）
- 定义失败时的处理方式

### 4.3 多轮对话记忆

```typescript
const history = messages.slice(-6).map(h => `${h.role}: ${h.content}`).join('\n');

const result = await generateText({
  system: systemPrompt + "\n当前对话历史：\n" + history,
  prompt: question,
  // ...
});
```

- 只取最近 6 轮，控制 Token 消耗
- 把历史拼进 System Prompt，让 LLM 保持上下文

---

## 五、常见陷阱与优化

### 5.1 LLM 不调用 Tool，直接瞎答

**原因：**
- Tool description 不够清晰
- System Prompt 没有强制要求
- 模型温度太高，太"有创意"

**解决：**
```typescript
temperature: 0.3, // 降低随机性
// System Prompt 里加："你必须调用工具获取信息，禁止凭记忆回答"
```

### 5.2 Tool 参数生成错误

**原因：**
- Zod Schema 的 `describe` 不够详细
- LLM 理解错了参数含义

**解决：**
```typescript
parameters: z.object({
  query: z.string()
    .describe('用于向量检索的短查询，提取用户问题中的核心实体，去除修饰词。例如用户问"这份文档的预算多少"，query应为"预算"'),
}),
```

### 5.3 无限循环

**原因：**
- LLM 一直在调用同一个 Tool，得不到满意结果
- Observation 不够明确，LLM 认为还需要更多信息

**解决：**
```typescript
maxSteps: 5, // 限制循环次数
// execute 里加超时和错误处理
// 返回明确的 "not found" 让 LLM 放弃
```

### 5.4 Token 消耗爆炸

**原因：**
- 每轮 Tool Calling 都要把历史 + Observation 重新发给 LLM
- 检索到的文档片段太长

**解决：**
- 控制 `chunkSize`（500 字符左右）
- 控制 `topK`（3-4 个片段）
- 对 Observation 做摘要后再返回

---

## 六、从 Agent 到更复杂的编排

### 6.1 Multi-Agent（多智能体）

一个任务拆给多个 Agent：
- **Research Agent**：专门检索和总结
- **Math Agent**：专门计算
- **Writer Agent**：专门生成最终回复

用 Supervisor 协调：
```typescript
const supervisor = await generateText({
  prompt: `任务：${task}\n可用 Agent：${agents.map(a => a.name).join(', ')}\n请决定由哪个 Agent 执行`,
});
```

### 6.2 与 LangGraph 对比

Vercel AI SDK 的 `generateText` 是**高层封装**，适合快速实现。

LangGraph（LangChain 的图编排）是**底层框架**，适合复杂状态机：
- 条件分支（if/else 节点）
- 循环（while 节点）
- 并行执行（map-reduce）

**建议：**
- 简单 Agent（2-3 个 Tool）→ Vercel AI SDK
- 复杂工作流（审批、多轮确认）→ LangGraph

---

## 七、面试高频问题

**Q: Agent 和 RAG 的区别？**
A: RAG 是固定流程（检索→生成），Agent 是动态流程（LLM 自主决定要不要检索、要不要计算）。Agent 可以包含 RAG 作为一个 Tool。

**Q: Tool Calling 和 Function Calling 的区别？**
A: 本质一样，OpenAI 叫 Function Calling，Vercel AI SDK 抽象为 Tool Calling。都是让 LLM 生成结构化参数，由外部程序执行。

**Q: 怎么防止 Agent 无限循环？**
A: 设置 maxSteps 上限；给 Tool 返回明确的终止信号；在 System Prompt 里限制调用次数。

**Q: 如果 Tool 执行失败怎么办？**
A: execute 里 try-catch，返回错误信息给 LLM，LLM 会重新思考或告知用户。

---

## 八、推荐阅读

1. **ReAct 论文**：《ReAct: Synergizing Reasoning and Acting in Language Models》
2. **Vercel AI SDK 文档**：https://sdk.vercel.ai/docs
3. **Tool Calling 指南**：https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling
4. **LangGraph（进阶）**：https://langchain-ai.github.io/langgraph/
