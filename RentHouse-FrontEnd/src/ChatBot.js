import React, { useState } from 'react';
import './ChatBot.css';

const ChatBot = () => {
  const [userMessage, setUserMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);

  const sendMessage = async () => {
    if (!userMessage.trim()) return;

    const user = { sender: 'user', text: userMessage };
    setChatHistory([...chatHistory, user]);

    const username = localStorage.getItem("username");
    try {
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage , username: username,  }),
      });

      const data = await response.json();
      const bot = { sender: 'bot', text: data.reply };
      setChatHistory(prev => [...prev, bot]);
    } catch (error) {
      setChatHistory(prev => [...prev, { sender: 'bot', text: 'Error contacting assistant.' }]);
    }

    setUserMessage('');
  };

  return (
    <div className="chatbot-container">
      <h3>Rental Assistant</h3>
      <div className="chat-window">
        {chatHistory.map((msg, i) => (
          <div key={i} className={`message ${msg.sender}`}>
            {msg.text}
          </div>
        ))}
      </div>
      <div className="chat-input">
        <input
          value={userMessage}
          onChange={e => setUserMessage(e.target.value)}
          placeholder="Ask about best locations..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
};

export default ChatBot;
