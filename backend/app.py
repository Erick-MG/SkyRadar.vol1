from flask import Flask, jsonify
import requests
import os
from dotenv import load_dotenv

app = Flask(__name__)

# Load API keys from .env
load_dotenv()
WEATHER_API_KEY = os.getenv("WEATHER_API_KEY")

@app.route('/')
def home():
    return jsonify({"message": "SkyRadar API is running!"})

@app.route('/weather/<city>', methods=['GET'])
def get_weather(city):
    url = f"https://api.openweathermap.org/data/2.5/weather?q={city}&appid={WEATHER_API_KEY}&units=metric"
    response = requests.get(url)
    return jsonify(response.json())

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)