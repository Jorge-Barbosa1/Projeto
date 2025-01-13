FROM python:3.9-slim

# Instala dependências do sistema (necessário para áudio)
RUN apt-get update && apt-get install -y ffmpeg && apt-get clean

# Define o diretório de trabalho
WORKDIR /app

# Copia o requirements.txt e instala as dependências
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o código do backend
COPY . .

# Expõe a porta 8000
EXPOSE 8000

# Comando padrão para rodar o backend
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
