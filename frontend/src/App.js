import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Transformer } from "markmap-lib";
import { Markmap } from "markmap-view";
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
} from "@mui/material";
import "./App.css";

function App() {
  const [markdown, setMarkdown] = useState("");
  const [prompt, setPrompt] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [model, setModel] = useState("gemini");
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
    formData.append("model", model);
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
    <Container maxWidth="lg" sx={{ display: "flex", height: "100vh", padding: 2 }}>
      {/* Coluna da esquerda */}
      <Box
        sx={{
          flex: 1,
          padding: 2,
          borderRight: "1px solid #ccc",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Typography variant="h4" gutterBottom>
          Gerador de Mapa Mental
        </Typography>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <TextField
            label="Digite o prompt"
            variant="outlined"
            fullWidth
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <FormControl fullWidth>
            <InputLabel>Modelo</InputLabel>
            <Select value={model} onChange={(e) => setModel(e.target.value)}>
              <MenuItem value="gemini">Gemini</MenuItem>
              {/*<MenuItem value="ollama">Ollama</MenuItem>*/}
              <MenuItem value="claude">ClaudeAI</MenuItem>
              <MenuItem value="mistral">Mistral</MenuItem>
            </Select>
          </FormControl>
          <Button variant="contained" component="label">
            Escolher PDF
            <input
              type="file"
              hidden
              onChange={(e) => setPdfFile(e.target.files[0])}
            />
          </Button>
          <Button variant="contained" component="label">
            Escolher Áudio
            <input
              type="file"
              hidden
              onChange={(e) => setAudioFile(e.target.files[0])}
            />
          </Button>
          <Button type="submit" variant="contained" color="primary" size="large">
            Gerar Mapa Mental
          </Button>
        </form>
      </Box>

      {/* Coluna da direita */}
      <Box sx={{ flex: 3, padding: 2 }}>
        <svg ref={svgRef} width="100%" height="100%"></svg>
      </Box>
    </Container>
  );
}

export default App;
