
# 🤖 AI-Powered Company Intelligence & Deep Search
<!-- Badges: Replace placeholders with your actual links -->

<p align="center">

<img src="https://img.shields.io/badge/LangGraph-Powered-blue?style=for-the-badge" alt="LangGraph">
<img src="https://img.shields.io/badge/TypeScript-Ready-orange?style=for-the-badge" alt="TypeScript">
</p>


An advanced full-stack conversational agent that leverages a stateful, graph-based AI workflow to provide deep company intelligence and real-time search capabilities.

✨ Overview

This project is a full-stack AI-powered conversational agent built to demonstrate a modern, scalable architecture. It combines a sleek frontend with a robust, AI-orchestrated backend.

🖥️ Frontend: A sleek, performant single-page application (SPA) built with Vite, vanilla HTML, CSS, and JavaScript. The UI communicates with the backend API via fetch calls and listens to Server-Sent Events (SSE) for a real-time, streaming response experience.

⚙️ Backend: A robust TypeScript backend built on Express.js, orchestrating complex AI workflows using LangGraph.js. LangGraph enables stateful, modular orchestration of multiple AI agents and tools within a graph, supporting advanced, multi-step conversation logic.

🧠 AI & Tools: The backend leverages powerful LLMs like OpenAI or Anthropic Claude (via the OpenRouter API) as the core reasoning engine. This is augmented by external tools like the Tavily Web Search API for live information retrieval.

⚡ Real-Time Interaction: Server-Sent Events (SSE) are used to push incremental updates, tool statuses, and final responses from the backend to the frontend, creating a responsive and transparent conversational experience.

🏗️ Architecture

The system follows a clean, decoupled architecture. The frontend is responsible for the user experience, while the backend manages state, orchestrates AI logic, and interacts with external services.


## 🚀 Getting Started
Prerequisites : 

Node.js v18+ & Yarn or npm

OpenRouter API Key

Tavily API Key

## 🚀 Getting Started

### Prerequisites

*   [Node.js](https://nodejs.org/) v18+ & Yarn or npm
*   [OpenRouter API Key](https://openrouter.ai/keys)
*   [Tavily API Key](https://app.tavily.com/)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/your-repo.git
    cd your-repo
    ```

2.  **Install backend dependencies:**
    ```bash
    cd backend
    yarn install
    ```

3.  **Set up backend environment variables:**
    Create a `.env` file in the `backend` directory and add your API keys:
    ```env
    # .env file inside /backend
    OPENROUTER_API_KEY=your_openrouter_api_key_here
    TAVILY_API_KEY=your_tavily_api_key_here
    PORT=4000
    ```

4.  **Install frontend dependencies:**
    ```bash
    cd ../frontend
    yarn install
    ```

### Running Locally

1.  ▶️ **Start the backend server:**
    ```bash
    # From the /backend directory
    yarn dev
    ```

2.  ▶️ **Start the frontend development server:**
    ```bash
    # From the /frontend directory
    yarn dev
    ```

3.  🎉 **Open your browser** and navigate to `http://localhost:5173` (or the port specified by Vite).

▶️ Start the frontend development server:

Generated bash
# From the /frontend directory
yarn dev
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
Bash
IGNORE_WHEN_COPYING_END

🎉 Open your browser and navigate to http://localhost:5173 (or the port specified by Vite).

💬 Usage

Open the web interface and start a conversation in the chat box.

The backend will process your input, running the appropriate AI agent workflows.

Watch as the UI updates in real-time with streaming responses and status indicators for tool calls (e.g., "Searching the web...").

🧩 Extending the Project

This project is designed to be easily extensible:

Add New Tools: Create new tool classes in the backend following the LangChain tool structure and integrate them into the LangGraph workflow.

Enhance the UI: Build richer frontend components or add support for multi-modal inputs like file uploads.

Deploy: Deploy the frontend and backend separately (e.g., Vercel for frontend, Render/Fly.io for backend) or as a unified, containerized application using Docker.

🙌 Contributing

Contributions, bug reports, and feature requests are welcome! Please feel free to open an issue or submit a pull request on GitHub.

📄 License

This project is licensed under the MIT License. See the LICENSE file for details.
