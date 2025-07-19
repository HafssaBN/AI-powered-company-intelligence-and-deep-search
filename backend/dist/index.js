"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// index.ts
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = require("dotenv");
const express_1 = __importDefault(require("express"));
(0, dotenv_1.config)();
const tavily_search_1 = require("@langchain/community/tools/tavily_search");
const messages_1 = require("@langchain/core/messages");
const groq_1 = require("@langchain/groq");
const langgraph_1 = require("@langchain/langgraph");
const prebuilt_1 = require("@langchain/langgraph/prebuilt");
// 🔐 Load LLM
const llm = new groq_1.ChatGroq({
    model: "llama3-70b-8192",
    apiKey: process.env.GROQ_API_KEY,
    temperature: 0.3,
});
// 🌐 Tool
const webSearchTool = new tavily_search_1.TavilySearchResults({
    apiKey: process.env.TAVILY_API_KEY,
});
const tools = [webSearchTool];
const toolNode = new prebuilt_1.ToolNode(tools);
const llmWithTools = llm.bindTools(tools);
// 🔄 SSE & Memory
const sseClients = new Set();
const conversationMemory = new Map();
const broadcastToSseClients = (data) => {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    sseClients.forEach((client) => {
        try {
            client.write(message);
        }
        catch (_a) {
            sseClients.delete(client);
        }
    });
};
// 🤖 Nodes
const callModel = (state) => __awaiter(void 0, void 0, void 0, function* () {
    broadcastToSseClients({ node: "agent", status: "executing" });
    const { messages, conversationHistory } = state;
    const allMessages = [...conversationHistory, ...messages];
    const response = yield llmWithTools.invoke(allMessages);
    broadcastToSseClients({ node: "agent", status: "completed" });
    return {
        messages: [response],
        conversationHistory: allMessages
    };
});
const callTools = (state) => __awaiter(void 0, void 0, void 0, function* () {
    broadcastToSseClients({ node: "tools", status: "executing" });
    const result = yield toolNode.invoke(state);
    const toolMessages = Array.isArray(result.messages) ? result.messages : [result.messages];
    const urls = toolMessages.flatMap((msg) => {
        try {
            const parsed = JSON.parse(msg.content);
            return parsed.map((r) => r.url).filter(Boolean);
        }
        catch (_a) {
            return [];
        }
    });
    broadcastToSseClients({ node: "tools", status: "completed" });
    return {
        messages: result.messages,
        searchedWebsites: urls,
    };
});
// 🔁 Edge Decision
const shouldContinue = (state) => {
    const last = state.messages[state.messages.length - 1];
    if (last instanceof messages_1.AIMessage &&
        Array.isArray(last.tool_calls) &&
        last.tool_calls.length > 0) {
        return "tools";
    }
    broadcastToSseClients({ node: "__end__", status: "completed" });
    return langgraph_1.END;
};
// 🔧 Graph Construction
const workflow = new langgraph_1.StateGraph({
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
    .addEdge(langgraph_1.START, "agent")
    .addConditionalEdges("agent", shouldContinue)
    .addEdge("tools", "agent");
// ⚙️ Raw and Compiled Graphs
const rawGraph = workflow;
const graph = rawGraph.compile();
// 🚀 Express Setup
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
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
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST /run
app.post("/run", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { messages, sessionId = "default" } = req.body;
        if (!messages)
            return res.status(400).json({ error: "Missing messages" });
        // 🆕 ENHANCEMENT: Broadcast execution start
        broadcastToSseClients({ node: "__start__", status: "executing" });
        const conversationHistory = conversationMemory.get(sessionId) || [];
        const systemMessage = new messages_1.SystemMessage("You are a helpful AI assistant. You have access to a web search tool. Only use it when you need current information, recent events, or real-time data. For general questions, math, explanations, or casual conversation, respond directly without using any tools. Remember the conversation history and user's name if mentioned. Always provide detailed, comprehensive, and informative responses. When using search results, synthesize information from multiple sources and provide thorough explanations with context and background information.");
        const currentMessages = [systemMessage, ...messages];
        // 🆕 ENHANCEMENT: Broadcast execution completion
        broadcastToSseClients({ node: "__start__", status: "completed" });
        const result = yield graph.invoke({
            messages: currentMessages,
            searchedWebsites: [],
            conversationHistory: conversationHistory
        });
        const userMessage = messages[messages.length - 1];
        const aiResponse = result.messages[result.messages.length - 1];
        const updatedHistory = [...conversationHistory, userMessage, aiResponse];
        conversationMemory.set(sessionId, updatedHistory);
        // 🆕 ENHANCEMENT: Include execution metadata in response
        res.json(Object.assign(Object.assign({}, result), { metadata: {
                sessionId,
                messageCount: updatedHistory.length,
                searchedWebsites: result.searchedWebsites || []
            } }));
    }
    catch (err) {
        console.error("Run Error:", err);
        // 🆕 ENHANCEMENT: Broadcast error
        broadcastToSseClients({ node: "error", status: "error", message: err.message });
        res.status(500).json({ error: err.message });
    }
}));
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
    }
    catch (err) {
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
