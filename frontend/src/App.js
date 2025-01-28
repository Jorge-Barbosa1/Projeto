import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Transformer } from "markmap-lib";
import { Markmap } from "markmap-view";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";
import { toolbarPlugin } from "@react-pdf-viewer/toolbar";
import "@react-pdf-viewer/toolbar/lib/styles/index.css";
import { thumbnailPlugin } from "@react-pdf-viewer/thumbnail";
import "@react-pdf-viewer/thumbnail/lib/styles/index.css";
import { searchPlugin } from "@react-pdf-viewer/search";
import "@react-pdf-viewer/search/lib/styles/index.css";
import { zoomPlugin } from "@react-pdf-viewer/zoom";
import "@react-pdf-viewer/zoom/lib/styles/index.css";
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
  Tabs,
  Tab,
  Paper,
} from "@mui/material";
import "./App.css";

function PDFViewer({ pdfUrl }) {
  const toolbarPluginInstance = toolbarPlugin();
  const { Toolbar } = toolbarPluginInstance; // Corrige erro de undefined

  const thumbnailPluginInstance = thumbnailPlugin();
  const { Thumbnails } = thumbnailPluginInstance; // Corrige erro no painel de miniaturas

  const searchPluginInstance = searchPlugin();
  const zoomPluginInstance = zoomPlugin();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Barra de ferramentas */}
      <div style={{ borderBottom: "1px solid #ddd", padding: "8px" }}>
        <Toolbar />
      </div>

      {/* Layout com miniaturas e visualizador */}
      <div style={{ display: "flex", flex: 1 }}>
        {/* Painel de miniaturas */}
        <div style={{ width: "20%", borderRight: "1px solid #ddd", padding: "8px" }}>
          <Thumbnails />
        </div>

        {/* Visualizador principal */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
            <Viewer
              fileUrl={pdfUrl}
              plugins={[
                toolbarPluginInstance,
                thumbnailPluginInstance,
                searchPluginInstance,
                zoomPluginInstance,
              ]}
            />
          </Worker>
        </div>
      </div>
    </div>
  );
}


function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function App() {
  const [markdown, setMarkdown] = useState("");
  const [prompt, setPrompt] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [model, setModel] = useState("gemini");
  const [tabValue, setTabValue] = useState(0);
  const [pdfContent, setPdfContent] = useState("");
  const [modelSummary, setModelSummary] = useState("");
  const svgRef = useRef(null);

  const renderMarkmap = () => {
    if (markdown && svgRef.current) {
      svgRef.current.innerHTML = "";
      try {
        const transformer = new Transformer();
        const { root } = transformer.transform(markdown);
        const mm = Markmap.create(svgRef.current, {}, root);
        mm.fit();
      } catch (error) {
        console.error("Erro ao criar o Markmap:", error);
      }
    }
  };

  useEffect(() => {
    renderMarkmap();
  }, [markdown]);

  useEffect(() => {
    if (tabValue === 0) {
      renderMarkmap();
    }
  }, [tabValue]);

  useEffect(() => {
    // Criar URL para o PDF quando um arquivo for selecionado
    if (pdfFile) {
      const fileUrl = URL.createObjectURL(pdfFile);
      setPdfUrl(fileUrl);
      return () => URL.revokeObjectURL(fileUrl);
    }
  }, [pdfFile]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const formData = new FormData();
    formData.append("prompt", prompt);
    formData.append("model", model);
    if (pdfFile) formData.append("pdf_file", pdfFile);
    if (audioFile) formData.append("audio_file", audioFile);

    try {
      const response = await axios.post(
        "http://localhost:8000/process-file",
        formData
      );
      setMarkdown(response.data.markdown);
      setPdfContent(response.data.original_text);
      setModelSummary(response.data.model_summary);
      setTabValue(0);
    } catch (error) {
      console.error("Erro ao gerar mapa mental:", error);
    }
  };

  return (
    <Container
      maxWidth="lg"
      sx={{ display: "flex", height: "100vh", padding: 2 }}
    >
      {/* Left Column */}
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
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
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
              <MenuItem value="claude">ClaudeAI</MenuItem>
              <MenuItem value="mistral">Mistral</MenuItem>
            </Select>
          </FormControl>
          <Button variant="contained" component="label">
            Escolher PDF
            <input
              type="file"
              accept=".pdf"
              hidden
              onChange={(e) => setPdfFile(e.target.files[0])}
            />
          </Button>
          <Button variant="contained" component="label">
            Escolher Áudio
            <input
              type="file"
              accept="audio/*"
              hidden
              onChange={(e) => setAudioFile(e.target.files[0])}
            />
          </Button>
          <Button type="submit" variant="contained" color="primary" size="large">
            Gerar Mapa Mental
          </Button>
        </form>
      </Box>

      {/* Right Column */}
      <Box sx={{ flex: 3, padding: 2, display: "flex", flexDirection: "column" }}>
        <Paper sx={{ width: "100%", bgcolor: "background.paper" }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            centered
            sx={{ borderBottom: 1, borderColor: "divider" }}
          >
            <Tab label="Mapa Mental" />
            <Tab label="Visualizador PDF" />
            <Tab label="Resumo do Modelo" />
          </Tabs>
        </Paper>

        <TabPanel value={tabValue} index={0}>
          <div
            style={{
              width: "100%",
              height: "calc(100vh - 200px)",
              overflow: "hidden",
            }}
          >
            <svg ref={svgRef} style={{ width: "100%", height: "100%" }}></svg>
          </div>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <div style={{ height: "calc(100vh - 200px)" }}>
            {pdfUrl ? (
              <PDFViewer pdfUrl={pdfUrl} />
            ) : (
              <Typography variant="body1" align="center">
                Selecione um arquivo PDF para visualizar
              </Typography>
            )}
          </div>
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <Paper
            sx={{
              p: 2,
              maxHeight: "calc(100vh - 200px)",
              overflow: "auto",
            }}
          >
            <div style={{ whiteSpace: "pre-wrap" }}>{modelSummary}</div>
          </Paper>
        </TabPanel>
      </Box>
    </Container>
  );
}

export default App;