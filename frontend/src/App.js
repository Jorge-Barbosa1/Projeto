import React, { useState } from "react";
import axios from "axios";
import * as d3 from "d3";

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
    svg.selectAll("*").remove(); // Limpar o SVG anterior

    const width = 800;
    const height = 600;

    const treeLayout = d3.tree().size([height, width - 200]);

    const hierarchyData = d3.hierarchy(data, (d) => d.children || Object.entries(d).map(([k, v]) => ({ name: k, children: v })));

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

    // Adiciona círculos aos nós
    node
      .append("circle")
      .attr("r", 10)
      .attr("fill", "lightblue")
      .attr("stroke", "black");

    // Adiciona texto aos nós
    node
      .append("text")
      .attr("dy", 3)
      .attr("x", (d) => (d.children ? -15 : 15))
      .style("text-anchor", (d) => (d.children ? "end" : "start"))
      .text((d) => d.data.name || d.data);
  };

  return (
    <div>
      <h1>Gerador de Mapa Mental</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Digite o prompt"
        />
        <input type="file" onChange={(e) => setPdfFile(e.target.files[0])} />
        <input type="file" onChange={(e) => setAudioFile(e.target.files[0])} />
        <button type="submit">Gerar Mapa Mental</button>
      </form>
      <svg id="mindmap" width="800" height="600"></svg>
      {mindmapData && renderMindmap(mindmapData)}
    </div>
  );
}

export default App;
