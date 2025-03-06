from flask import Flask, jsonify, request
import requests
import os

app = Flask(__name__)

# Weather Route
@app.route('/weather', methods=['GET'])
def get_weather():
    city = request.args.get('city')  # Fetch city from URL like ?city=Berlin
    api_key = os.getenv("WEATHER_API_KEY")

    if not city:
        return jsonify({"error": "City parameter is required"}), 400

    url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={api_key}&units=metric"

    response = requests.get(url)
    weather_data = response.json()

    if response.status_code == 200:
        return jsonify(weather_data)
    else:
        return jsonify({"error": "City not found"}), 404


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')