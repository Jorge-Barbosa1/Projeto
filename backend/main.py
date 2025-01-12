from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import fitz  # PyMuPDF
import speech_recognition as sr
from pydub import AudioSegment
from io import BytesIO
import os
from langchain_ollama import OllamaLLM

app = FastAPI()

# Inicializa o LLM (Ollama):
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
MODEL_NAME = "llama3"
llm = OllamaLLM(model=MODEL_NAME, base_url=OLLAMA_URL)

# Se quiser usar OpenAI, você pode comentar as linhas acima e usar algo como:
# import openai
# openai.api_key = os.getenv("OPENAI_API_KEY")

# Modelo de dados (opcional) para retornar a estrutura do Mindmap
class MindmapResponse(BaseModel):
    mindmap: dict

def extract_text_from_pdf(pdf_file: bytes) -> str:
    """Extrai texto de um PDF usando PyMuPDF."""
    text = ""
    try:
        with fitz.open(stream=pdf_file, filetype="pdf") as pdf:
            for page in pdf:
                text += page.get_text()
    except Exception as e:
        print(f"Erro processando PDF: {e}")
    return text

def convert_audio_to_text(audio_file: bytes) -> str:
    """Converte áudio para texto usando SpeechRecognition + pydub."""
    recognizer = sr.Recognizer()
    try:
        # Converte para wav
        audio = AudioSegment.from_file(BytesIO(audio_file))
        audio_wav = BytesIO()
        audio.export(audio_wav, format="wav")
        audio_wav.seek(0)

        with sr.AudioFile(audio_wav) as source:
            audio_data = recognizer.record(source)
            return recognizer.recognize_google(audio_data)
    except sr.UnknownValueError:
        return "Não foi possível entender o áudio."
    except Exception as e:
        print(f"Erro processando áudio: {e}")
        return "Erro ao converter áudio."

@app.post("/process-file")
async def process_file(
    prompt: str = Form(None),
    pdf_file: UploadFile = File(None),
    audio_file: UploadFile = File(None)
):
    """
    Recebe:
      - prompt (texto livre)
      - pdf_file (opcional)
      - audio_file (opcional)

    Retorna:
      - JSON com a resposta do LLM e a estrutura para o Mindmap.
    """

    # 1) extrair texto do PDF (se enviado)
    pdf_text = ""
    if pdf_file is not None:
        pdf_bytes = await pdf_file.read()
        pdf_text = extract_text_from_pdf(pdf_bytes)

    # 2) extrair texto do áudio (se enviado)
    audio_text = ""
    if audio_file is not None:
        audio_bytes = await audio_file.read()
        audio_text = convert_audio_to_text(audio_bytes)

    # 3) define o texto base (prompt + pdf_text + audio_text)
    input_text = ""
    if prompt:
        input_text += prompt + "\n\n"
    if pdf_text:
        input_text += pdf_text + "\n\n"
    if audio_text:
        input_text += audio_text + "\n\n"
    
    if not input_text.strip():
        return JSONResponse(
            status_code=400,
            content={"error": "Nenhum texto enviado (prompt, PDF ou áudio)."}
        )

    # 4) chama a LLM (Ollama, OpenAI, etc.) para gerar o "texto estruturado" do MindMap
    final_prompt = (
        f"Escreve tópicos para fazer um mapa mental sobre o seguinte texto:\n\n{input_text}"
        # Se quiser personalizar, pode inserir tokens de parada, etc.
    )

    # Se estiver usando Ollama:
    response = llm.invoke(final_prompt, stop=["<|eot_id|>"])

    # Se estiver usando OpenAI:
    # response = openai.Completion.create(
    #     model="text-davinci-003",
    #     prompt=final_prompt,
    #     max_tokens=1024
    # )
    # response = response["choices"][0]["text"]

    # 5) aqui podemos armazenar a string do LLM em "response". 
    #    Precisamos converter em estrutura JSON para o mindmap
    mindmap = generate_mindmap_structure(response)

    # 6) Retorna em JSON
    return {
        "model_response": response, 
        "mindmap": mindmap
    }

def generate_mindmap_structure(text: str) -> dict:
    """
    Exemplo simples que lê o texto linha a linha:
    Exemplo (texto do LLM):
      Tópico1:
        Subtópico A
        Subtópico B
      Tópico2:
        Subtópico C
    Retorna { "Tópico1": ["Subtópico A", "Subtópico B"], "Tópico2": ["Subtópico C"] }
    """
    mindmap = {}
    lines = text.strip().split('\n')
    
    current_topic = None
    for line in lines:
        line = line.strip()
        if not line:
            continue
        if line.endswith(':'):
            current_topic = line[:-1].strip()
            mindmap[current_topic] = []
        else:
            if current_topic:
                mindmap[current_topic].append(line)
    return mindmap
