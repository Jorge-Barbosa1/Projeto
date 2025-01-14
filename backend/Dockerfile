FROM python:3.9-slim

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y ffmpeg && apt-get clean

# Configurar diretório de trabalho
WORKDIR /app

# Copiar o arquivo de requisitos
COPY requirements.txt .

# Atualizar pip e instalar dependências
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Copiar o código do projeto
COPY . .

# Comando padrão para iniciar a aplicação
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
