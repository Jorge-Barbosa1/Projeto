import React, { useState } from "react";
import axios from "axios";
import Tree from "react-d3-tree";

function App() {
  const [prompt, setPrompt] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [modelResponse, setModelResponse] = useState("");
  const [mindmapData, setMindmapData] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Monta o form data
    const formData = new FormData();
    formData.append("prompt", prompt);
    if (pdfFile) formData.append("pdf_file", pdfFile);
    if (audioFile) formData.append("audio_file", audioFile);

    try {
      // Ajuste a URL se necessário (ex.: ip do container)
      const response = await axios.post("http://localhost:8000/process-file", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setModelResponse(response.data.model_response);

      // Exemplo de "mindmap": { "Tópico1": ["Sub1", "Sub2"], "Tópico2": ["Sub3"] }
      const mapData = response.data.mindmap;

      // Converter esse dicionário para o formato que o "react-d3-tree" gosta:
      // { name: 'Root', children: [{ name:'Tópico1', children:[{name:'Sub1'},{name:'Sub2'}] }, ...] }
      const convertedTree = convertToTreeData(mapData);
      setMindmapData(convertedTree);

    } catch (err) {
      console.error("Erro ao enviar dados:", err);
    }
  };

  const convertToTreeData = (mindmapObj) => {
    // Cria um nó raíz fictício
    const root = {
      name: "Mapa Mental",
      children: [],
    };

    // Para cada tópico, cria um node
    for (const topic of Object.keys(mindmapObj)) {
      const subtopics = mindmapObj[topic];
      const topicNode = {
        name: topic,
        children: subtopics.map((s) => ({ name: s }))
      };
      root.children.push(topicNode);
    }

    return root;
  };

  return (
    <div style={{ width: "100vw", height: "100vh", padding: "1rem" }}>
      <h1>Gerador de Mapa Mental (OpenAI)</h1>
      <form onSubmit={handleSubmit} style={{ marginBottom: "1rem" }}>
        <div>
          <label>Prompt:</label>
          <br />
          <textarea
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        <div>
          <label>PDF (opcional):</label>
          <br />
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setPdfFile(e.target.files[0])}
          />
        </div>

        <div>
          <label>Áudio (opcional):</label>
          <br />
          <input
            type="file"
            accept=".mp3, .wav"
            onChange={(e) => setAudioFile(e.target.files[0])}
          />
        </div>

        <button type="submit" style={{ marginTop: "1rem" }}>Enviar</button>
      </form>

      {modelResponse && (
        <div style={{ marginBottom: "1rem" }}>
          <h2>Resposta do Modelo:</h2>
          <pre>{modelResponse}</pre>
        </div>
      )}

      {mindmapData && (
        <div style={{ width: "100%", height: "600px", border: "1px solid #ccc" }}>
          {/* Para melhor visualização, orientamos "horizontal" */}
          <Tree
            data={mindmapData}
            orientation="horizontal"
            translate={{ x: 300, y: 300 }}
            zoomable={true}
          />
        </div>
      )}
    </div>
  );
}

export default App;
