var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import { openMeteoClient } from "../integrations/openMeteoClient";
import { getStadiumForTeam } from "../data/nflStadiums";
var WeatherService = /** @class */ (function () {
    function WeatherService(storage) {
        this.storage = storage;
    }
    WeatherService.prototype.fetchAndStoreWeather = function (gameId, homeTeam, gameTime) {
        return __awaiter(this, void 0, void 0, function () {
            var stadium, domeWeather, forecast, weatherData, error_1;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 5, , 6]);
                        stadium = getStadiumForTeam(homeTeam);
                        if (!stadium) {
                            console.warn("No stadium data for team: ".concat(homeTeam));
                            return [2 /*return*/, null];
                        }
                        if (!stadium.isDome) return [3 /*break*/, 2];
                        domeWeather = {
                            gameId: gameId,
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
                        return [4 /*yield*/, this.storage.createWeatherData(domeWeather)];
                    case 1:
                        _b.sent();
                        return [2 /*return*/, domeWeather];
                    case 2: return [4 /*yield*/, openMeteoClient.getForecast(stadium.latitude, stadium.longitude, gameTime)];
                    case 3:
                        forecast = _b.sent();
                        weatherData = {
                            gameId: gameId,
                            stadium: stadium.stadium,
                            latitude: stadium.latitude.toString(),
                            longitude: stadium.longitude.toString(),
                            temperature: forecast.temperature.toString(),
                            windSpeed: forecast.windSpeed.toString(),
                            windGusts: ((_a = forecast.windGusts) === null || _a === void 0 ? void 0 : _a.toString()) || null,
                            precipitation: forecast.precipitation.toString(),
                            humidity: forecast.humidity,
                            visibility: forecast.visibility.toString(),
                            conditions: forecast.conditions,
                            isDome: false,
                            forecastTime: new Date(),
                        };
                        return [4 /*yield*/, this.storage.createWeatherData(weatherData)];
                    case 4:
                        _b.sent();
                        return [2 /*return*/, weatherData];
                    case 5:
                        error_1 = _b.sent();
                        console.error("Error fetching weather for game ".concat(gameId, ":"), error_1);
                        return [2 /*return*/, null];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    WeatherService.prototype.getWeatherForGame = function (gameId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.storage.getWeatherDataByGameId(gameId)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    WeatherService.prototype.analyzeWeatherImpact = function (weather, stat, position) {
        if (position === void 0) { position = "unknown"; }
        if (weather.isDome) {
            return {
                windImpact: 0,
                precipitationImpact: 0,
                temperatureImpact: 0,
                overallImpact: 0,
                reasoning: ["Indoor game - no weather impact"],
            };
        }
        var windSpeed = parseFloat(weather.windSpeed || "0");
        var windGusts = parseFloat(weather.windGusts || "0");
        var precipitation = parseFloat(weather.precipitation || "0");
        var temperature = parseFloat(weather.temperature || "50");
        var reasoning = [];
        var windImpact = 0;
        var precipitationImpact = 0;
        var temperatureImpact = 0;
        var effectiveWind = Math.max(windSpeed, windGusts);
        if (effectiveWind > 20) {
            windImpact = -15;
            reasoning.push("High winds (".concat(effectiveWind, "mph) significantly impact passing accuracy"));
        }
        else if (effectiveWind > 15) {
            windImpact = -8;
            reasoning.push("Moderate winds (".concat(effectiveWind, "mph) reduce passing efficiency"));
        }
        else if (effectiveWind > 10) {
            windImpact = -3;
            reasoning.push("Light winds (".concat(effectiveWind, "mph) may affect deep passes"));
        }
        if (precipitation > 0.5) {
            precipitationImpact = -12;
            reasoning.push("Heavy precipitation (".concat(precipitation, "in) favors rushing, reduces passing"));
        }
        else if (precipitation > 0.2) {
            precipitationImpact = -6;
            reasoning.push("Moderate precipitation (".concat(precipitation, "in) impacts ball handling"));
        }
        else if (precipitation > 0) {
            precipitationImpact = -2;
            reasoning.push("Light precipitation (".concat(precipitation, "in) may cause minor slippage"));
        }
        if (temperature < 20) {
            temperatureImpact = -10;
            reasoning.push("Extreme cold (".concat(temperature, "\u00B0F) impacts ball handling and passing"));
        }
        else if (temperature < 32) {
            temperatureImpact = -5;
            reasoning.push("Freezing conditions (".concat(temperature, "\u00B0F) reduce offensive efficiency"));
        }
        else if (temperature > 95) {
            temperatureImpact = -5;
            reasoning.push("Extreme heat (".concat(temperature, "\u00B0F) impacts player stamina"));
        }
        var statLower = stat.toLowerCase();
        var statMultiplier = 1.0;
        if (statLower.includes("pass") || statLower === "receiving yards" || statLower === "receptions") {
            statMultiplier = 1.5;
            if (effectiveWind > 15 || precipitation > 0.2) {
                reasoning.push("Passing stats particularly impacted by weather conditions");
            }
        }
        else if (statLower.includes("rush") || statLower === "rushing yards") {
            statMultiplier = 0.5;
            if (precipitation > 0.2) {
                reasoning.push("Rushing attempts may increase in bad weather");
            }
        }
        else if (statLower.includes("fg") || statLower.includes("field goal")) {
            statMultiplier = 2.0;
            if (effectiveWind > 10) {
                reasoning.push("Kicking significantly impacted by wind");
            }
        }
        var overallImpact = (windImpact + precipitationImpact + temperatureImpact) * statMultiplier;
        if (reasoning.length === 0) {
            reasoning.push("Good conditions (".concat(temperature, "\u00B0F, ").concat(effectiveWind, "mph wind)"));
        }
        return {
            windImpact: Math.round(windImpact * statMultiplier),
            precipitationImpact: Math.round(precipitationImpact * statMultiplier),
            temperatureImpact: Math.round(temperatureImpact * statMultiplier),
            overallImpact: Math.round(overallImpact),
            reasoning: reasoning,
        };
    };
    return WeatherService;
}());
export { WeatherService };
