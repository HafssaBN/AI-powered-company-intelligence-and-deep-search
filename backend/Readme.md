**The backend is :**

An Express.js server written in TypeScript.


wich allow us to : 


Uses modern async/await handlers.

Serves a REST API to interact with an AI agent built using LangChain libraries (ChatGroq, StateGraph, ToolNode, etc.).

Integrates with external tools via API keys (Tavily search, Groq LLM).

Supports SSE (Server-Sent Events) for live streaming status updates to clients.

Keeps in-memory conversation history per session.

Has multiple REST endpoints for running the AI graph, managing memory, health checks, and metadata.