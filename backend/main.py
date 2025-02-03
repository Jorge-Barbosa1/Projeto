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
import anthropic
import requests
from mistralai.client import MistralClient
from mistralai.models.chat_completion import ChatMessage
import base64
import time 
import json
import requests

load_dotenv()
# Instância da aplicação FastAPI
app = FastAPI()

# Configuração de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Adicione o frontend aqui
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Access-Control-Allow-Origin"],
)

# Env Variables
gemini_api_key = os.getenv("GEMINI_KEY")
claude_api_key = os.getenv("CLAUDEAI_KEY")
mistral_api_key= os.getenv("MISTRAL_KEY")


if not gemini_api_key:
    raise ValueError("Erro: A chave GEMINI_KEY não foi encontrada no ambiente ou no arquivo .env.")
if not claude_api_key:
    raise ValueError("Erro: A chave CLAUDE_API_KEY não foi encontrada no ambiente ou no arquivo .env.")
if not mistral_api_key:
    raise ValueError("Erro: A chave MISTRAL_KEY não foi encontrada no ambiente ou no arquivo .env.")

genai.configure(api_key=gemini_api_key)
claude_client = anthropic.Anthropic(api_key=claude_api_key)
mistral_client = MistralClient(api_key=mistral_api_key)

class MindmapResponse(BaseModel):
    model_response: str
    mindmap: dict

def estimate_tokens(text: str) -> int:
    """
    Estimate the number of tokens in the text.
    Using a conservative estimate of 1 token = 3 characters
    """
    return len(text) // 3

def chunk_text(text: str, max_chunk_size: int = 8000) -> list[str]:
    """
    Split text into smaller chunks, with a more conservative max size
    """
    # Rough sentence splitting
    sentences = [s.strip() + '.' for s in text.replace('\n', ' ').split('.') if s.strip()]
    chunks = []
    current_chunk = []
    current_size = 0
    
    for sentence in sentences:
        sentence_tokens = estimate_tokens(sentence)
        
        if current_size + sentence_tokens > max_chunk_size:
            if current_chunk:
                chunks.append(' '.join(current_chunk))
                current_chunk = []
                current_size = 0
            
            # If a single sentence is too long, split it into smaller pieces
            if sentence_tokens > max_chunk_size:
                words = sentence.split()
                temp_chunk = []
                temp_size = 0
                
                for word in words:
                    word_tokens = estimate_tokens(word + ' ')
                    if temp_size + word_tokens > max_chunk_size:
                        if temp_chunk:
                            chunks.append(' '.join(temp_chunk) + '...')
                            temp_chunk = []
                            temp_size = 0
                    temp_chunk.append(word)
                    temp_size += word_tokens
                
                if temp_chunk:
                    chunks.append(' '.join(temp_chunk) + '...')
            else:
                current_chunk = [sentence]
                current_size = sentence_tokens
        else:
            current_chunk.append(sentence)
            current_size += sentence_tokens
    
    if current_chunk:
        chunks.append(' '.join(current_chunk))
    
    return chunks

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

def generate_with_claude(input_text: str) -> str:
    try:
        message = claude_client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[{
                "role": "user",
                "content": f"""Create a mind map structure from the following text. 
                Format the response as a hierarchical structure with main topics in bold (**Topic**) 
                and subtopics with asterisks (*Subtopic*). Additional details should be regular text.
                
                Text to analyze: {input_text}"""
            }]
        )
        return message.content[0].text
    except Exception as e:
        print(f"Error with Claude API: {e}")
        raise

def generate_with_mistral(input_text: str) -> str:
    try:
        # Split text into smaller chunks
        chunks = chunk_text(input_text)
        all_responses = []
        
        system_prompt = """Crie uma estrutura de mapa mental a partir do seguinte texto.
            Formate a saída como uma estrutura hierárquica com:
                -Tópicos principais marcados com 'Tópico'
                -Subtópicos marcados com 'Subtópico'
                -Detalhes adicionais em texto regular
            Mantem a resposta concisa e focada nos pontos principais
            """

        # Process each chunk
        for i, chunk in enumerate(chunks):
            # Estimate total tokens including prompts
            total_tokens = estimate_tokens(system_prompt + chunk)
            if total_tokens > 8000:  # If still too large, skip this chunk
                print(f"Skipping chunk {i+1} due to size: {total_tokens} estimated tokens")
                continue

            if i == 0:
                chunk_prompt = f"Extract the main topics and subtopics from this text: {chunk}"
            else:
                chunk_prompt = f"Continue extracting topics from this part: {chunk}"

            messages = [
                ChatMessage(role="system", content=system_prompt),
                ChatMessage(role="user", content=chunk_prompt)
            ]

            try:
                chat_response = mistral_client.chat(
                    model="mistral-small",  # Using smaller model for better token handling
                    messages=messages
                )
                
                response_text = chat_response.choices[0].message.content
                all_responses.append(response_text)
            except Exception as e:
                print(f"Error processing chunk {i+1}: {e}")
                continue
        
        # Combine responses and remove duplicates
        combined_response = "\n".join(all_responses)
        
        # Clean up and deduplicate topics
        seen_topics = set()
        final_lines = []
        
        for line in combined_response.split('\n'):
            line = line.strip()
            if not line:
                continue
                
            # For main topics (marked with **)
            if line.startswith('**') and line.endswith('**'):
                if line not in seen_topics:
                    seen_topics.add(line)
                    final_lines.append(line)
            else:
                # For subtopics and details
                if line not in seen_topics:
                    seen_topics.add(line)
                    final_lines.append(line)
        
        return '\n'.join(final_lines)
        
    except Exception as e:
        print(f"Error with Mistral AI: {e}")
        raise

def generate_with_ollama(input_text: str, model_name: str = "tinyllama") -> str:
    try:
        ollama_url = os.getenv("OLLAMA_URL", "http://ollama:11434")
        
        # Precise token estimation
        chunks = chunk_text(input_text, max_chunk_size=4000)
        all_responses = []
        
        system_prompt = """Crie uma estrutura de mapa mental concisa a partir do seguinte texto.
        Formato:
        - Tópicos principais em **Negrito**
        - Subtópicos em *Itálico* 
        - Foque nos pontos-chave"""
        
        for i, chunk in enumerate(chunks):
            prompt = f"{system_prompt}\n{'Análise inicial de' if i == 0 else 'Continuar analisando'} este texto:\n{chunk}"
            
            response = requests.post(
                f"{ollama_url}/api/generate",
                json={
                    "model": model_name,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.3,
                        "top_p": 0.9,
                        "num_predict": 400,
                        "repeat_penalty": 1.2
                    }
                },
                timeout=90
            )
            
            if response.status_code == 200:
                result = response.json().get("response", "").strip()
                if result:
                    all_responses.append(result)
        
        combined_response = "\n".join(all_responses)
        final_response = "\n".join(
            line for line in combined_response.split("\n")
            if line.strip() and not line.startswith("#")
        )
        
        return final_response
        
    except Exception as e:
        print(f"Erro na geração com Ollama: {e}")
        raise
    
class ProcessResponse(BaseModel):
    markdown: str
    original_text: str
    model_summary: str

@app.post("/process-file")
async def process_file(
    prompt: str = Form(None),
    pdf_file: UploadFile = File(None),
    audio_file: UploadFile = File(None),
    model: str = Form("gemini"),
    ollama_model: str = Form("tinyllama")
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
        input_text = input_text.strip()
        
        summary_prompt = (
            "Cria um resumo em tópicos do seguinte texto, usando:\n- Tópicos principais\n- Subtópicos\n- Pontos-chave\n\nTexto:"
        ) + f"\n\n{input_text}"
        
        if model == "gemini":
            response_text = generate_with_gemini(input_text)
            summary = generate_with_gemini(summary_prompt)
        elif model == "claude":
            response_text = generate_with_claude(input_text)
            summary = generate_with_claude(summary_prompt)
        elif model == "mistral":
            response_text = generate_with_mistral(input_text)
            summary = generate_with_mistral(summary_prompt)
        elif model == "ollama":
            response_text = generate_with_ollama(input_text, ollama_model)
            summary = generate_with_ollama(summary_prompt, ollama_model)
        else:
            raise ValueError("Modelo desconhecido. Escolha entre 'gemini', 'claude' ou 'mistral'.")

        markdown = generate_mindmap_structure(response_text)
        
        return ProcessResponse(
            markdown=markdown,
            original_text=pdf_text,
            model_summary=summary
        )
    except Exception as e:
        print(f"Erro no backend: {e}")
        raise