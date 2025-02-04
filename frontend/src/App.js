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
import { ArrowForward } from "@mui/icons-material";
import APIKeyManager from './components/APIKeyManager';
import {
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
} from "@mui/material";

function PDFViewer({ pdfUrl }) {
  const toolbarPluginInstance = toolbarPlugin();
  const { Toolbar } = toolbarPluginInstance;
  const thumbnailPluginInstance = thumbnailPlugin();
  const { Thumbnails } = thumbnailPluginInstance;
  const searchPluginInstance = searchPlugin();
  const zoomPluginInstance = zoomPlugin();

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "8px", borderBottom: "1px solid rgba(0, 0, 0, 0.12)" }}>
        <Toolbar />
      </div>
      <div style={{ display: "flex", flex: 1 }}>
        <div style={{ width: "20%", borderRight: "1px solid rgba(0, 0, 0, 0.12)", padding: "8px" }}>
          <Thumbnails />
        </div>
        <div style={{ flex: 1 }}>
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

function App() {
  const [markdown, setMarkdown] = useState("");
  const [prompt, setPrompt] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [model, setModel] = useState("gemini");
  const [activeTab, setActiveTab] = useState("pdf"); // pdf, mindmap, summary
  const [modelSummary, setModelSummary] = useState("");

  const svgRef = useRef(null);

  useEffect(() => {
    if (pdfFile) {
      const fileUrl = URL.createObjectURL(pdfFile);
      setPdfUrl(fileUrl);
      return () => URL.revokeObjectURL(fileUrl);
    }
  }, [pdfFile]);

  useEffect(() => {
    if (markdown && svgRef.current && activeTab === "mindmap") {
      svgRef.current.innerHTML = "";
      try {
        const transformer = new Transformer();
        const { root } = transformer.transform(markdown);
        const mm = Markmap.create(svgRef.current, {}, root);
        mm.fit();
      } catch (error) {
        console.error("Error creating Markmap:", error);
      }
    }
  }, [markdown, activeTab]);

  const [apiKeys, setApiKeys] = useState({
    geminiKey: localStorage.getItem('geminiKey') || '',
    claudeKey: localStorage.getItem('claudeKey') || '',
    mistralKey: localStorage.getItem('mistralKey') || ''
  });

  const handleSubmit = async (event) => {


    if (model === "gemini" && !apiKeys.geminiKey) {
      alert("É necessário definir a chave da Gemini antes de enviar.");
      return;
    }
    if (model === "claude" && !apiKeys.claudeKey) {
      alert("É necessário definir a chave do Claude antes de enviar.");
      return;
    }
    if (model === "mistral" && !apiKeys.mistralKey) {
      alert("É necessário definir a chave do Mistral antes de enviar.");
      return;
    }

    event.preventDefault();
    const formData = new FormData();
    formData.append("prompt", prompt);
    formData.append("model", model);
    formData.append("api_keys", JSON.stringify(apiKeys));
    
    if (pdfFile) formData.append("pdf_file", pdfFile);
    if (audioFile) formData.append("audio_file", audioFile);

    try {
      const response = await axios.post("http://localhost:8000/process-file", formData);
      setMarkdown(response.data.markdown);
      setModelSummary(response.data.model_summary);
    } catch (error) {
      console.error("Error generating mind map:", error);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden'
      }}>
        {/* Left Panel */}
        <div style={{
          width: '300px',
          borderRight: '1px solid rgba(0, 0, 0, 0.12)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <APIKeyManager onKeysChange={setApiKeys} />
          <FormControl fullWidth>
            <InputLabel>Modelo</InputLabel>
            <Select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              label="Modelo"
            >
              <MenuItem value="gemini">Gemini</MenuItem>
              <MenuItem value="claude">ClaudeAI</MenuItem>
              <MenuItem value="mistral">Mistral</MenuItem>
              <MenuItem value="ollama">Ollama</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="contained"
            component="label"
            fullWidth
          >
            Submeter PDF
            <input
              type="file"
              accept=".pdf"
              hidden
              onChange={(e) => setPdfFile(e.target.files[0])}
            />
          </Button>
          {pdfFile && (
            <div style={{ marginTop: '5px', fontSize: '0.8rem' }}>
              {pdfFile.name}
            </div>
          )}

          <Button
            variant="contained"
            component="label"
            fullWidth
          >
            Submeter Áudio
            <input
              type="file"
              accept="audio/*"
              hidden
              onChange={(e) => setAudioFile(e.target.files[0])}
            />
          </Button>
          {audioFile && (
            <div style={{ marginTop: '5px', fontSize: '0.8rem' }}>
              {audioFile.name}
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

          {/* Tabs */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
            backgroundColor: '#f5f5f5'
          }}>
            <Button
              onClick={() => setActiveTab('pdf')}
              style={{
                flex: 1,
                padding: '15px',
                borderRadius: 0,
                backgroundColor: activeTab === 'pdf' ? '#ffffff' : 'transparent'
              }}
            >
              PDF Viewer
            </Button>
            <Button
              onClick={() => setActiveTab('mindmap')}
              style={{
                flex: 1,
                padding: '15px',
                borderRadius: 0,
                backgroundColor: activeTab === 'mindmap' ? '#ffffff' : 'transparent'
              }}
            >
              Mapa Mental
            </Button>
            <Button
              onClick={() => setActiveTab('summary')}
              style={{
                flex: 1,
                padding: '15px',
                borderRadius: 0,
                backgroundColor: activeTab === 'summary' ? '#ffffff' : 'transparent'
              }}
            >
              Resumo do modelo
            </Button>
          </div>

          {/* Content Area */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {activeTab === 'pdf' && pdfUrl && (
              <div style={{ height: '100%' }}>
                <PDFViewer pdfUrl={pdfUrl} />
              </div>
            )}

            {activeTab === 'mindmap' && (
              <div style={{ width: '100%', height: '100%' }}>
                <svg ref={svgRef} style={{ width: '100%', height: '100%' }}></svg>
              </div>
            )}

            {activeTab === 'summary' && (
              <div style={{
                padding: '20px',
                overflow: 'auto',
                height: '100%',
                whiteSpace: 'pre-wrap'
              }}>
                {modelSummary}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Prompt Area */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: '300px', // Width of left panel
        right: 0,
        padding: '20px',
        backgroundColor: '#ffffff',
        borderTop: '1px solid rgba(0, 0, 0, 0.12)',
        display: 'flex',
        gap: '10px'
      }}>
        <TextField
          label="Digite o prompt"
          variant="outlined"
          multiline
          rows={2}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          style={{ flex: 1 }}
        />
        <IconButton color="primary" onClick={handleSubmit}>
          <ArrowForward />
        </IconButton>
      </div>
    </div>
  );
}

export default App;