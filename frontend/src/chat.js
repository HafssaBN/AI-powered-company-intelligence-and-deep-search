async function sendMessage() {
  const input = document.getElementById("userInput");
  const message = input.value.trim();
  if (!message) return;

  const messagesDiv = document.getElementById("messages");
  const websiteList = document.getElementById("websiteList");

  // Show user message
  const userMessage = document.createElement("div");
  userMessage.className = "message user";
  userMessage.innerHTML = `
    <div class="message-content">
      <div class="message-text">${message}</div>
    </div>
  `;
  messagesDiv.appendChild(userMessage);
  input.value = "";

  // Add thinking indicator
  const thinkingMessage = document.createElement("div");
  thinkingMessage.className = "message ai thinking";
  thinkingMessage.innerHTML = `
    <div class="message-content">
      <div class="thinking-indicator">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>
      <div class="message-text">Thinking...</div>
    </div>
  `;
  messagesDiv.appendChild(thinkingMessage);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  try {
    const res = await fetch("http://localhost:4000/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ type: "human", content: message }] }),
    });

    const data = await res.json();

    messagesDiv.removeChild(thinkingMessage);

    const messages = data.messages || [];

    const aiMsg = [...messages].reverse().find(
      (m) => m.type === "constructor" && m.id && m.id.includes("AIMessage")
    );
    const aiContent = aiMsg?.kwargs?.content || "No reply";

    const aiDiv = document.createElement("div");
    aiDiv.className = "message ai";
    aiDiv.innerHTML = `
      <div class="message-content">
        <div class="message-text">${aiContent}</div>
      </div>
    `;
    messagesDiv.appendChild(aiDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    websiteList.innerHTML = "";

    const websites = data.searchedWebsites || [];
    if (websites.length) {
      websites.forEach((url) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = new URL(url).hostname;
        a.title = url;
        li.appendChild(a);
        websiteList.appendChild(li);
      });
    } else {
      const li = document.createElement("li");
      li.className = "no-sources";
      li.textContent = "No sources found";
      websiteList.appendChild(li);
    }
  } catch (err) {
    console.error(err);
    if (messagesDiv.contains(thinkingMessage)) {
      messagesDiv.removeChild(thinkingMessage);
    }
    const errorDiv = document.createElement("div");
    errorDiv.className = "message ai error";
    errorDiv.innerHTML = `
      <div class="message-content">
        <div class="message-text">Sorry, I encountered an error. Please try again.</div>
      </div>
    `;
    messagesDiv.appendChild(errorDiv);
  }
}

// Populate input when recent items clicked
document.addEventListener("DOMContentLoaded", function () {
  const recentSearches = document.querySelector(".recent-searches");
  const items = recentSearches.querySelectorAll(".recent-item");

  items.forEach((item) => {
    item.addEventListener("click", function () {
      document.getElementById("userInput").value = this.textContent;
    });
  });
});
