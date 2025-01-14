import React, { useState } from "react";
import axios from "axios";
import * as d3 from "d3";
import "./App.css";

function App() {
  const [mindmapData, setMindmapData] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const formData = new FormData();
    formData.append("prompt", prompt);
    if (pdfFile) formData.append("pdf_file", pdfFile);
    if (audioFile) formData.append("audio_file", audioFile);

    try {
      const response = await axios.post("http://localhost:8000/process-file", formData);
      setMindmapData(response.data.mindmap);
    } catch (error) {
      console.error("Erro ao gerar mapa mental:", error);
    }
  };

  const renderMindmap = (data) => {
    if (!data) return;

    const svg = d3.select("#mindmap");
    svg.selectAll("*").remove();

    const width = 1200; // Largura do SVG
    const height = 800; // Altura do SVG
    const treeLayout = d3.tree().size([height, width - 200]);
    const hierarchyData = d3.hierarchy(data, (d) => d.children);

    const treeData = treeLayout(hierarchyData);
    const nodes = treeData.descendants();
    const links = treeData.links();

    // Cria links
    svg
      .selectAll(".link")
      .data(links)
      .enter()
      .append("line")
      .attr("class", "link")
      .attr("x1", (d) => d.source.y)
      .attr("y1", (d) => d.source.x)
      .attr("x2", (d) => d.target.y)
      .attr("y2", (d) => d.target.x)
      .attr("stroke", "#ccc");

    // Cria nós
    const node = svg
      .selectAll(".node")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d) => `translate(${d.y},${d.x})`);

    node
      .append("circle")
      .attr("r", 10)
      .attr("fill", "#007BFF")
      .attr("stroke", "black");

    node
      .append("text")
      .attr("dy", 4)
      .attr("x", (d) => (d.children ? -20 : 20))
      .style("text-anchor", (d) => (d.children ? "end" : "start"))
      .text((d) => d.data.title || d.data);
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Coluna da esquerda */}
      <div style={{ flex: 1, padding: "20px", borderRight: "1px solid #ccc" }}>
        <h1>Gerador de Mapa Mental</h1>
        <form onSubmit={handleSubmit}>
          <div>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Digite o prompt"
              style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
            />
          </div>
          <div>
            <input type="file" onChange={(e) => setPdfFile(e.target.files[0])} style={{ marginBottom: "10px" }} />
          </div>
          <div>
            <input type="file" onChange={(e) => setAudioFile(e.target.files[0])} style={{ marginBottom: "10px" }} />
          </div>
          <button type="submit" style={{ padding: "10px 20px", cursor: "pointer" }}>Gerar Mapa Mental</button>
        </form>
      </div>

      {/* Coluna da direita */}
      <div style={{ flex: 3, padding: "20px" }}>
        <svg id="mindmap" width="100%" height="100%"></svg>
        {mindmapData && renderMindmap(mindmapData)}
      </div>
    </div>
  );
}

export default App;
