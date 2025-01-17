from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import google.generativeai as genai
import fitz
import speech_recognition as sr
from pydub import AudioSegment
from io import BytesIO
from dotenv import load_dotenv

load_dotenv()
# Instância da aplicação FastAPI
app = FastAPI()

# Configuração de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permitir todas as origens
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Access-Control-Allow-Origin"],  # Exponha o header necessário
)

# Env Variables
ollama_url = os.getenv("OLLAMA_URL", "http://ollama:11434")
gemini_api_key = os.getenv("GEMINI_KEY")

if not gemini_api_key:
    raise ValueError("Erro: A chave GEMINI_KEY não foi encontrada no ambiente ou no arquivo .env.")

genai.configure(api_key=gemini_api_key)
ollama_url = os.getenv("OLLAMA_URL", "http://ollama:11434")
class MindmapResponse(BaseModel):
    model_response: str
    mindmap: dict

def convert_audio_to_text(audio_file: bytes) -> str:
    recognizer = sr.Recognizer()
    try:
        # Convertendo o arquivo para WAV
        audio = AudioSegment.from_file(BytesIO(audio_file))
        audio_wav = BytesIO()
        audio.export(audio_wav, format="wav")
        audio_wav.seek(0)

        # Reconhecimento de fala
        with sr.AudioFile(audio_wav) as source:
            audio_data = recognizer.record(source)
            return recognizer.recognize_google(audio_data)
    except sr.UnknownValueError:
        return "Áudio não compreendido."
    except sr.RequestError as e:
        print(f"Erro no reconhecimento de fala: {e}")
        raise
    except Exception as e:
        print(f"Erro geral ao processar áudio: {e}")
        raise

def generate_mindmap_structure(text: str) -> str:
    """
    Converte o texto em Markdown para estrutura do mapa mental com mais hierarquias.
    """
    lines = text.strip().split("\n")
    markdown = "# Tópico Principal\n"
    for line in lines:
        if line.startswith("**") and line.endswith("**"):  # Tópicos principais
            markdown += f"## {line.strip('**')}\n"
        elif line.startswith("*"):  # Subtópicos
            markdown += f"### {line.strip('*')}\n"
        else:  # Sub-subtópicos
            markdown += f"- {line.strip()}\n"
    return markdown


def extract_text_from_pdf(pdf_file: bytes) -> str:
    """
    Função para extrair texto de PDF usando PyMuPDF.
    """
    text = ""
    try:
        with fitz.open(stream=pdf_file, filetype="pdf") as pdf:
            for page in pdf:
                text += page.get_text()
    except Exception as e:
        print(f"Erro ao processar PDF: {e}")
        raise
    return text

def generate_with_gemini(input_text: str) -> str:
    model = genai.GenerativeModel("gemini-1.5-flash")
    response = model.generate_content(input_text)
    return response.text

def generate_with_ollama(input_text: str) -> str:
    response = requests.post(
        f"{ollama_url}/api/generate",
        json={"prompt": input_text},
    )
    if response.status_code != 200:
        raise ValueError(f"Erro ao se comunicar com o Ollama: {response.text}")
    return response.json().get("content", "")

@app.post("/process-file")
async def process_file(
    prompt: str = Form(None),
    pdf_file: UploadFile = File(None),
    audio_file: UploadFile = File(None),
    model: str = Form("gemini"),
):
    try:
        pdf_text = ""
        if pdf_file is not None:
            pdf_bytes = await pdf_file.read()
            pdf_text = extract_text_from_pdf(pdf_bytes)

        audio_text = ""
        if audio_file is not None:
            audio_bytes = await audio_file.read()
            audio_text = convert_audio_to_text(audio_bytes)

        input_text = (prompt or "") + "\n" + pdf_text + "\n" + audio_text

        if model == "gemini":
            response_text = generate_with_gemini(input_text)
        elif model == "ollama":
            response_text = generate_with_ollama(input_text)
        else:
            raise ValueError("Modelo desconhecido. Escolha entre 'gemini' ou 'ollama'.")

        markdown = generate_mindmap_structure(response_text)
        print(markdown)
        return {"markdown": markdown}
    except Exception as e:
        print(f"Erro no backend: {e}")
        raise
