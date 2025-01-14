import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Transformer } from "markmap-lib";
import { Markmap } from "markmap-view";
import "./App.css";

function App() {
  const [markdown, setMarkdown] = useState("");
  const [prompt, setPrompt] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const svgRef = useRef(null);

  useEffect(() => {
    if (markdown) {
      const transformer = new Transformer();
      const { root } = transformer.transform(markdown);
      Markmap.create(svgRef.current, {}, root);
    }
  }, [markdown]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const formData = new FormData();
    formData.append("prompt", prompt);
    if (pdfFile) formData.append("pdf_file", pdfFile);
    if (audioFile) formData.append("audio_file", audioFile);

    try {
      const response = await axios.post("http://localhost:8000/process-file", formData);
      setMarkdown(response.data.markdown);
    } catch (error) {
      console.error("Erro ao gerar mapa mental:", error);
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Coluna da esquerda */}
      <div style={{ flex: 1, padding: "20px", borderRight: "1px solid #ccc" }}>
        <h1>Gerador de Mapa Mental</h1>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Digite o prompt"
            style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
          />
          <input type="file" onChange={(e) => setPdfFile(e.target.files[0])} style={{ marginBottom: "10px" }} />
          <input type="file" onChange={(e) => setAudioFile(e.target.files[0])} style={{ marginBottom: "10px" }} />
          <button type="submit" style={{ padding: "10px 20px", cursor: "pointer" }}>
            Gerar Mapa Mental
          </button>
        </form>
      </div>

      {/* Coluna da direita */}
      <div style={{ flex: 3, padding: "20px" }}>
        <svg ref={svgRef} width="100%" height="100%"></svg>
      </div>
    </div>
  );
}

export default App;
