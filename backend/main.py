from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import google.generativeai as genai
import fitz  # PyMuPDF para extrair texto de PDF
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

gemini_api_key = os.getenv("GEMINI_KEY")
if not gemini_api_key:
    raise ValueError("Erro: A chave GEMINI_KEY não foi encontrada no ambiente ou no arquivo .env.")

genai.configure(api_key=gemini_api_key)

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

def generate_mindmap_structure(text: str) -> dict:
    """
    Função para converter o texto em uma estrutura hierárquica para o mapa mental.
    """
    mindmap = {"title": "Mapa Mental", "children": []}
    lines = text.strip().split("\n")
    stack = [mindmap]  # Pilha para manter hierarquia

    for line in lines:
        line = line.strip()
        if not line:
            continue

        if line.startswith("**") and line.endswith("**"):  # Tópico principal
            node = {"title": line.strip("**"), "children": []}
            mindmap["children"].append(node)
            stack = [mindmap, node]  # Atualiza a pilha com o novo tópico principal

        elif line.startswith("*"):  # Subtópico
            if len(stack) > 1:  # Verifica se há um tópico principal na pilha
                node = {"title": line.strip("*"), "children": []}
                stack[-1]["children"].append(node)
                stack.append(node)  # Adiciona o subtópico à pilha
            else:
                print(f"Subtópico encontrado sem tópico principal: {line}")

        else:  # Sub-subtópico
            if len(stack) > 2:  # Verifica se há pelo menos um subtópico na pilha
                node = {"title": line, "children": []}
                stack[-1]["children"].append(node)
            else:
                print(f"Sub-subtópico encontrado sem subtópico: {line}")

    return mindmap





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


@app.post("/process-file", response_model=MindmapResponse)
async def process_file(
    prompt: str = Form(None),
    pdf_file: UploadFile = File(None),
    audio_file: UploadFile = File(None),
):
    try:
        pdf_text = ""
        if pdf_file is not None:
            pdf_bytes = await pdf_file.read()
            pdf_text = extract_text_from_pdf(pdf_bytes)
            #print("Texto extraído do PDF:", pdf_text)

        audio_text = ""
        if audio_file is not None:
            audio_bytes = await audio_file.read()
            audio_text = convert_audio_to_text(audio_bytes)
            #print("Texto extraído do áudio:", audio_text)

        input_text = (prompt or "") + "\n" + pdf_text + "\n" + audio_text
        #print("Texto final enviado para a API Gemini:", input_text)

        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(input_text)
        #print("Resposta da API Gemini:", response.text)

        mindmap_dict = generate_mindmap_structure(response.text)
        return {"model_response": response.text, "mindmap": mindmap_dict}

    except Exception as e:
        print(f"Erro no backend: {e}")
        raise