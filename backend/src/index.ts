// index.ts
import cors from "cors";
import { config } from "dotenv";
import express from "express";
config();

import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { AIMessage, BaseMessage, SystemMessage } from "@langchain/core/messages";
import { ChatGroq } from "@langchain/groq";
import { END, START, StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";

// 🔐 Load LLM
const llm = new ChatGroq({
  model: "llama3-70b-8192",
  apiKey: process.env.GROQ_API_KEY,
  temperature: 0.3,
});

// 🌐 Tool
const webSearchTool = new TavilySearchResults({
  apiKey: process.env.TAVILY_API_KEY,
});
const tools = [webSearchTool];
const toolNode = new ToolNode(tools);
const llmWithTools = llm.bindTools(tools);

// 📦 State
interface IAgentState {
  messages: BaseMessage[];
  searchedWebsites: string[];
  conversationHistory: BaseMessage[];
}

// 🔄 SSE & Memory
const sseClients = new Set<express.Response>();
const conversationMemory = new Map<string, BaseMessage[]>();

const broadcastToSseClients = (data: any) => {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.write(message);
    } catch {
      sseClients.delete(client);
    }
  });
};

// 🤖 Nodes
const callModel = async (state: IAgentState) => {
  broadcastToSseClients({ node: "agent", status: "executing" });
  const { messages, conversationHistory } = state;
  
  const allMessages = [...conversationHistory, ...messages];
  const response = await llmWithTools.invoke(allMessages);
  
  broadcastToSseClients({ node: "agent", status: "completed" });
  return { 
    messages: [response],
    conversationHistory: allMessages
  };
};

const callTools = async (state: IAgentState): Promise<Partial<IAgentState>> => {
  broadcastToSseClients({ node: "tools", status: "executing" });
  const result = await toolNode.invoke(state);
  const toolMessages = Array.isArray(result.messages) ? result.messages : [result.messages];

  const urls = toolMessages.flatMap((msg: any) => {
    try {
      const parsed = JSON.parse(msg.content);
      return parsed.map((r: any) => r.url).filter(Boolean);
    } catch {
      return [];
    }
  });

  broadcastToSseClients({ node: "tools", status: "completed" });

  return {
    messages: result.messages,
    searchedWebsites: urls,
  };
};

// 🔁 Edge Decision
const shouldContinue = (state: IAgentState) => {
  const last = state.messages[state.messages.length - 1];
  if (
    last instanceof AIMessage &&
    Array.isArray(last.tool_calls) &&
    last.tool_calls.length > 0
  ) {
    return "tools";
  }
  broadcastToSseClients({ node: "__end__", status: "completed" });
  return END;
};

// 🔧 Graph Construction
const workflow = new StateGraph<IAgentState>({
  channels: {
    messages: {
      value: (x, y) => x.concat(y),
      default: () => [],
    },
    searchedWebsites: {
      value: (x, y) => (x || []).concat(y || []),
      default: () => [],
    },
    conversationHistory: {
      value: (x, y) => x.concat(y),
      default: () => [],
    },
  },
})
  .addNode("agent", callModel)
  .addNode("tools", callTools)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue)
  .addEdge("tools", "agent");

// ⚙️ Raw and Compiled Graphs
const rawGraph = workflow;
const graph = rawGraph.compile();

// 🚀 Express Setup
const app = express();
app.use(cors());
app.use(express.json());

// 🆕 ENHANCEMENT: Add graph metadata endpoint
app.get("/graph-metadata", (req, res) => {
  try {
    const metadata = {
      nodes: ["__start__", "agent", "tools", "__end__"],
      edges: [
        { from: "__start__", to: "agent", type: "normal" },
        { from: "agent", to: "tools", type: "conditional" },
        { from: "agent", to: "__end__", type: "conditional" },
        { from: "tools", to: "agent", type: "normal" }
      ],
      description: "AI Agent with Web Search Tool",
      llmModel: "llama3-70b-8192",
      tools: tools.map(tool => tool.name)
    };
    res.json(metadata);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /run
app.post("/run", async (req, res) => {
  try {
    const { messages, sessionId = "default" } = req.body;
    if (!messages) return res.status(400).json({ error: "Missing messages" });

    // 🆕 ENHANCEMENT: Broadcast execution start
    broadcastToSseClients({ node: "__start__", status: "executing" });

    const conversationHistory = conversationMemory.get(sessionId) || [];
    const systemMessage = new SystemMessage("You are a helpful AI assistant. You have access to a web search tool. Only use it when you need current information, recent events, or real-time data. For general questions, math, explanations, or casual conversation, respond directly without using any tools. Remember the conversation history and user's name if mentioned. Always provide detailed, comprehensive, and informative responses. When using search results, synthesize information from multiple sources and provide thorough explanations with context and background information.");
    
    const currentMessages = [systemMessage, ...messages];
    
    // 🆕 ENHANCEMENT: Broadcast execution completion
    broadcastToSseClients({ node: "__start__", status: "completed" });
    
    const result = await graph.invoke({ 
      messages: currentMessages, 
      searchedWebsites: [],
      conversationHistory: conversationHistory
    });
    
    const userMessage = messages[messages.length - 1];
    const aiResponse = result.messages[result.messages.length - 1];
    
    const updatedHistory = [...conversationHistory, userMessage, aiResponse];
    conversationMemory.set(sessionId, updatedHistory);
    
    // 🆕 ENHANCEMENT: Include execution metadata in response
    res.json({
      ...result,
      metadata: {
        sessionId,
        messageCount: updatedHistory.length,
        searchedWebsites: result.searchedWebsites || []
      }
    });
  } catch (err: any) {
    console.error("Run Error:", err);
    // 🆕 ENHANCEMENT: Broadcast error
    broadcastToSseClients({ node: "error", status: "error", message: err.message });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /clear-memory/:sessionId
app.delete("/clear-memory/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  conversationMemory.delete(sessionId);
  res.json({ message: `Memory cleared for session: ${sessionId}` });
});

// GET /memory/:sessionId
app.get("/memory/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  const history = conversationMemory.get(sessionId) || [];
  res.json({ sessionId, messageCount: history.length, history });
});

// GET /events (SSE)
app.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  // 🆕 ENHANCEMENT: Send initial status
  res.write(`data: ${JSON.stringify({ type: "connected", message: "SSE connected" })}\n\n`);

  sseClients.add(res);
  req.on("close", () => sseClients.delete(res));
});

// GET /graph-structure
app.get("/graph-structure", (req, res) => {
  try {
    const structure = graph.getGraph().toJSON();
    res.json(structure);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 🆕 ENHANCEMENT: Add health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    sseClients: sseClients.size,
    sessions: conversationMemory.size
  });
});

// 🆕 ENHANCEMENT: Serve static files (optional - for hosting the React app)
// app.use(express.static('public'));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ LangGraph backend running at http://localhost:${PORT}`);
  console.log(`📊 Graph structure: http://localhost:${PORT}/graph-structure`);
  console.log(`📡 SSE events: http://localhost:${PORT}/events`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
});