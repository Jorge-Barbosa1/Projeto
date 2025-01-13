import google.generativeai as genai

genai.configure(api_key="AIzaSyAzyh7zZkZGHdLW1lY6Gs9wA3gN_tSJE6U")
model = genai.GenerativeModel("gemini-1.5-flash")
response = model.generate_content("Explain how AI works")
print(response.text)