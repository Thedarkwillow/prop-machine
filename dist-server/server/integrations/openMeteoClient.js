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
var OpenMeteoClient = /** @class */ (function () {
    function OpenMeteoClient() {
        this.baseUrl = "https://api.open-meteo.com/v1";
    }
    OpenMeteoClient.prototype.getForecast = function (latitude, longitude, gameTime) {
        return __awaiter(this, void 0, void 0, function () {
            var params, response, data, gameTimeISO, targetHour_1, hourIndex, closestIndex, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        params = new URLSearchParams({
                            latitude: latitude.toString(),
                            longitude: longitude.toString(),
                            hourly: "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_gusts_10m,visibility,weather_code",
                            temperature_unit: "fahrenheit",
                            wind_speed_unit: "mph",
                            precipitation_unit: "inch",
                            timezone: "auto",
                            forecast_days: "7",
                        });
                        return [4 /*yield*/, fetch("".concat(this.baseUrl, "/forecast?").concat(params))];
                    case 1:
                        response = _a.sent();
                        if (!response.ok) {
                            throw new Error("Open-Meteo API error: ".concat(response.statusText));
                        }
                        return [4 /*yield*/, response.json()];
                    case 2:
                        data = _a.sent();
                        gameTimeISO = gameTime.toISOString();
                        targetHour_1 = gameTimeISO.substring(0, 13) + ":00";
                        hourIndex = data.hourly.time.findIndex(function (time) { return time === targetHour_1; });
                        if (hourIndex === -1) {
                            closestIndex = this.findClosestTimeIndex(data.hourly.time, gameTime);
                            return [2 /*return*/, this.extractWeatherData(data, closestIndex)];
                        }
                        return [2 /*return*/, this.extractWeatherData(data, hourIndex)];
                    case 3:
                        error_1 = _a.sent();
                        console.error("Error fetching weather from Open-Meteo:", error_1);
                        throw error_1;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    OpenMeteoClient.prototype.findClosestTimeIndex = function (times, targetTime) {
        var targetTimestamp = targetTime.getTime();
        var closestIndex = 0;
        var closestDiff = Math.abs(new Date(times[0]).getTime() - targetTimestamp);
        for (var i = 1; i < times.length; i++) {
            var diff = Math.abs(new Date(times[i]).getTime() - targetTimestamp);
            if (diff < closestDiff) {
                closestDiff = diff;
                closestIndex = i;
            }
        }
        return closestIndex;
    };
    OpenMeteoClient.prototype.extractWeatherData = function (data, index) {
        var _a;
        var weatherCode = data.hourly.weather_code[index];
        return {
            temperature: Math.round(data.hourly.temperature_2m[index]),
            windSpeed: Math.round(data.hourly.wind_speed_10m[index]),
            windGusts: data.hourly.wind_gusts_10m[index] ? Math.round(data.hourly.wind_gusts_10m[index]) : null,
            precipitation: parseFloat(((_a = data.hourly.precipitation[index]) === null || _a === void 0 ? void 0 : _a.toFixed(2)) || "0"),
            humidity: data.hourly.relative_humidity_2m[index],
            visibility: parseFloat((data.hourly.visibility[index] / 1609.34).toFixed(2)), // meters to miles
            conditions: this.interpretWeatherCode(weatherCode),
        };
    };
    OpenMeteoClient.prototype.interpretWeatherCode = function (code) {
        var weatherCodes = {
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
    };
    return OpenMeteoClient;
}());
export { OpenMeteoClient };
export var openMeteoClient = new OpenMeteoClient();
