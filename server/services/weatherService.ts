import { openMeteoClient } from "../integrations/openMeteoClient";
import { getStadiumForTeam } from "../data/nflStadiums";
import type { IStorage } from "../storage";
import type { InsertWeatherData } from "@shared/schema";

interface WeatherImpact {
  windImpact: number;
  precipitationImpact: number;
  temperatureImpact: number;
  overallImpact: number;
  reasoning: string[];
}

export class WeatherService {
  constructor(private storage: IStorage) {}

  async fetchAndStoreWeather(
    gameId: string,
    homeTeam: string,
    gameTime: Date
  ): Promise<InsertWeatherData | null> {
    try {
      const stadium = getStadiumForTeam(homeTeam);
      
      if (!stadium) {
        console.warn(`No stadium data for team: ${homeTeam}`);
        return null;
      }

      if (stadium.isDome) {
        const domeWeather: InsertWeatherData = {
          gameId,
          stadium: stadium.stadium,
          latitude: stadium.latitude.toString(),
          longitude: stadium.longitude.toString(),
          temperature: "72",
          windSpeed: "0",
          windGusts: null,
          precipitation: "0",
          humidity: 50,
          visibility: "10",
          conditions: "Indoor (Climate Controlled)",
          isDome: true,
          forecastTime: new Date(),
        };

        await this.storage.createWeatherData(domeWeather);
        return domeWeather;
      }

      const forecast = await openMeteoClient.getForecast(
        stadium.latitude,
        stadium.longitude,
        gameTime
      );

      const weatherData: InsertWeatherData = {
        gameId,
        stadium: stadium.stadium,
        latitude: stadium.latitude.toString(),
        longitude: stadium.longitude.toString(),
        temperature: forecast.temperature.toString(),
        windSpeed: forecast.windSpeed.toString(),
        windGusts: forecast.windGusts?.toString() || null,
        precipitation: forecast.precipitation.toString(),
        humidity: forecast.humidity,
        visibility: forecast.visibility.toString(),
        conditions: forecast.conditions,
        isDome: false,
        forecastTime: new Date(),
      };

      await this.storage.createWeatherData(weatherData);
      return weatherData;
    } catch (error) {
      console.error(`Error fetching weather for game ${gameId}:`, error);
      return null;
    }
  }

  async getWeatherForGame(gameId: string) {
    return await this.storage.getWeatherDataByGameId(gameId);
  }

  analyzeWeatherImpact(
    weather: any,
    stat: string,
    position: string = "unknown"
  ): WeatherImpact {
    if (weather.isDome) {
      return {
        windImpact: 0,
        precipitationImpact: 0,
        temperatureImpact: 0,
        overallImpact: 0,
        reasoning: ["Indoor game - no weather impact"],
      };
    }

    const windSpeed = parseFloat(weather.windSpeed || "0");
    const windGusts = parseFloat(weather.windGusts || "0");
    const precipitation = parseFloat(weather.precipitation || "0");
    const temperature = parseFloat(weather.temperature || "50");

    const reasoning: string[] = [];
    let windImpact = 0;
    let precipitationImpact = 0;
    let temperatureImpact = 0;

    const effectiveWind = Math.max(windSpeed, windGusts);
    
    if (effectiveWind > 20) {
      windImpact = -15;
      reasoning.push(`High winds (${effectiveWind}mph) significantly impact passing accuracy`);
    } else if (effectiveWind > 15) {
      windImpact = -8;
      reasoning.push(`Moderate winds (${effectiveWind}mph) reduce passing efficiency`);
    } else if (effectiveWind > 10) {
      windImpact = -3;
      reasoning.push(`Light winds (${effectiveWind}mph) may affect deep passes`);
    }

    if (precipitation > 0.5) {
      precipitationImpact = -12;
      reasoning.push(`Heavy precipitation (${precipitation}in) favors rushing, reduces passing`);
    } else if (precipitation > 0.2) {
      precipitationImpact = -6;
      reasoning.push(`Moderate precipitation (${precipitation}in) impacts ball handling`);
    } else if (precipitation > 0) {
      precipitationImpact = -2;
      reasoning.push(`Light precipitation (${precipitation}in) may cause minor slippage`);
    }

    if (temperature < 20) {
      temperatureImpact = -10;
      reasoning.push(`Extreme cold (${temperature}°F) impacts ball handling and passing`);
    } else if (temperature < 32) {
      temperatureImpact = -5;
      reasoning.push(`Freezing conditions (${temperature}°F) reduce offensive efficiency`);
    } else if (temperature > 95) {
      temperatureImpact = -5;
      reasoning.push(`Extreme heat (${temperature}°F) impacts player stamina`);
    }

    const statLower = stat.toLowerCase();
    let statMultiplier = 1.0;

    if (statLower.includes("pass") || statLower === "receiving yards" || statLower === "receptions") {
      statMultiplier = 1.5;
      if (effectiveWind > 15 || precipitation > 0.2) {
        reasoning.push("Passing stats particularly impacted by weather conditions");
      }
    } else if (statLower.includes("rush") || statLower === "rushing yards") {
      statMultiplier = 0.5;
      if (precipitation > 0.2) {
        reasoning.push("Rushing attempts may increase in bad weather");
      }
    } else if (statLower.includes("fg") || statLower.includes("field goal")) {
      statMultiplier = 2.0;
      if (effectiveWind > 10) {
        reasoning.push("Kicking significantly impacted by wind");
      }
    }

    const overallImpact = (windImpact + precipitationImpact + temperatureImpact) * statMultiplier;

    if (reasoning.length === 0) {
      reasoning.push(`Good conditions (${temperature}°F, ${effectiveWind}mph wind)`);
    }

    return {
      windImpact: Math.round(windImpact * statMultiplier),
      precipitationImpact: Math.round(precipitationImpact * statMultiplier),
      temperatureImpact: Math.round(temperatureImpact * statMultiplier),
      overallImpact: Math.round(overallImpact),
      reasoning,
    };
  }
}
