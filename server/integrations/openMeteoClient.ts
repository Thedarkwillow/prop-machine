interface WeatherForecast {
  temperature: number;
  windSpeed: number;
  windGusts: number | null;
  precipitation: number;
  humidity: number;
  visibility: number;
  conditions: string;
}

export class OpenMeteoClient {
  private baseUrl = "https://api.open-meteo.com/v1";

  async getForecast(
    latitude: number,
    longitude: number,
    gameTime: Date
  ): Promise<WeatherForecast> {
    try {
      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        hourly: "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_gusts_10m,visibility,weather_code",
        temperature_unit: "fahrenheit",
        wind_speed_unit: "mph",
        precipitation_unit: "inch",
        timezone: "auto",
        forecast_days: "7",
      });

      const response = await fetch(`${this.baseUrl}/forecast?${params}`);
      
      if (!response.ok) {
        throw new Error(`Open-Meteo API error: ${response.statusText}`);
      }

      const data = await response.json();

      const gameTimeISO = gameTime.toISOString();
      const targetHour = gameTimeISO.substring(0, 13) + ":00";

      const hourIndex = data.hourly.time.findIndex((time: string) => time === targetHour);
      
      if (hourIndex === -1) {
        const closestIndex = this.findClosestTimeIndex(data.hourly.time, gameTime);
        return this.extractWeatherData(data, closestIndex);
      }

      return this.extractWeatherData(data, hourIndex);
    } catch (error) {
      console.error("Error fetching weather from Open-Meteo:", error);
      throw error;
    }
  }

  private findClosestTimeIndex(times: string[], targetTime: Date): number {
    const targetTimestamp = targetTime.getTime();
    let closestIndex = 0;
    let closestDiff = Math.abs(new Date(times[0]).getTime() - targetTimestamp);

    for (let i = 1; i < times.length; i++) {
      const diff = Math.abs(new Date(times[i]).getTime() - targetTimestamp);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = i;
      }
    }

    return closestIndex;
  }

  private extractWeatherData(data: any, index: number): WeatherForecast {
    const weatherCode = data.hourly.weather_code[index];
    
    return {
      temperature: Math.round(data.hourly.temperature_2m[index]),
      windSpeed: Math.round(data.hourly.wind_speed_10m[index]),
      windGusts: data.hourly.wind_gusts_10m[index] ? Math.round(data.hourly.wind_gusts_10m[index]) : null,
      precipitation: parseFloat(data.hourly.precipitation[index]?.toFixed(2) || "0"),
      humidity: data.hourly.relative_humidity_2m[index],
      visibility: parseFloat((data.hourly.visibility[index] / 1609.34).toFixed(2)), // meters to miles
      conditions: this.interpretWeatherCode(weatherCode),
    };
  }

  private interpretWeatherCode(code: number): string {
    const weatherCodes: Record<number, string> = {
      0: "Clear sky",
      1: "Mainly clear",
      2: "Partly cloudy",
      3: "Overcast",
      45: "Foggy",
      48: "Foggy with rime",
      51: "Light drizzle",
      53: "Moderate drizzle",
      55: "Dense drizzle",
      61: "Slight rain",
      63: "Moderate rain",
      65: "Heavy rain",
      71: "Slight snow",
      73: "Moderate snow",
      75: "Heavy snow",
      77: "Snow grains",
      80: "Slight rain showers",
      81: "Moderate rain showers",
      82: "Violent rain showers",
      85: "Slight snow showers",
      86: "Heavy snow showers",
      95: "Thunderstorm",
      96: "Thunderstorm with slight hail",
      99: "Thunderstorm with heavy hail",
    };

    return weatherCodes[code] || "Unknown";
  }
}

export const openMeteoClient = new OpenMeteoClient();
