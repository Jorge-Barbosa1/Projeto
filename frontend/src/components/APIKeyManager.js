// src/components/APIKeyManager.js
import React, { useState, useEffect } from 'react';

function APIKeyManager({ onKeysChange }) {
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('geminiKey') || '');
  const [claudeKey, setClaudeKey] = useState(localStorage.getItem('claudeKey') || '');
  const [mistralKey, setMistralKey] = useState(localStorage.getItem('mistralKey') || '');

  // Sempre que as chaves mudarem, atualizar o localStorage e
  // informar o componente pai (App.js) via onKeysChange:
  useEffect(() => {
    localStorage.setItem('geminiKey', geminiKey);
    localStorage.setItem('claudeKey', claudeKey);
    localStorage.setItem('mistralKey', mistralKey);
    onKeysChange({ geminiKey, claudeKey, mistralKey });
  }, [geminiKey, claudeKey, mistralKey, onKeysChange]);

  return (
    <div style={{ border: '1px solid #ccc', padding: '10px' }}>
      <h3>API Keys</h3>
      <div>
        <label>Gemini Key:</label>
        <input
          type="text"
          value={geminiKey}
          onChange={(e) => setGeminiKey(e.target.value)}
        />
      </div>
      <div>
        <label>Claude Key:</label>
        <input
          type="text"
          value={claudeKey}
          onChange={(e) => setClaudeKey(e.target.value)}
        />
      </div>
      <div>
        <label>Mistral Key:</label>
        <input
          type="text"
          value={mistralKey}
          onChange={(e) => setMistralKey(e.target.value)}
        />
      </div>
    </div>
  );
}

export default APIKeyManager;
