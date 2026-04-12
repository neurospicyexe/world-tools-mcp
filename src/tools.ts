// ── Moon phase calculation ────────────────────────────────────────────────────
// Reference new moon: 2000-01-06 18:14 UTC (J2000.0 epoch new moon)
// Synodic period: 29.53058867 days

const SYNODIC_DAYS = 29.53058867;
const REF_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14, 0);

const PHASE_NAMES = [
  "New Moon",
  "Waxing Crescent",
  "First Quarter",
  "Waxing Gibbous",
  "Full Moon",
  "Waning Gibbous",
  "Last Quarter",
  "Waning Crescent",
];

function getMoonPhase(date = new Date()): { phase_name: string; illumination_pct: number; age_days: number } {
  const elapsedMs = date.getTime() - REF_NEW_MOON_MS;
  const elapsedDays = elapsedMs / 86_400_000;
  const age_days = ((elapsedDays % SYNODIC_DAYS) + SYNODIC_DAYS) % SYNODIC_DAYS;
  const fraction = age_days / SYNODIC_DAYS; // 0..1

  // Illumination: 0 at new, 1 at full, 0 at new again
  const illumination_pct = Math.round((1 - Math.cos(fraction * 2 * Math.PI)) / 2 * 100);

  // 8 named phases, each 1/8 of cycle
  const phaseIndex = Math.floor((fraction + 1 / 16) * 8) % 8;
  const phase_name = PHASE_NAMES[phaseIndex];

  return { phase_name, illumination_pct, age_days: Math.round(age_days * 10) / 10 };
}

// ── Weather via open-meteo (free, no key) ────────────────────────────────────

interface OpenMeteoResponse {
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
    precipitation: number;
  };
}

// WMO weather interpretation codes (full spec)
function describeWmo(code: number): string {
  if (code === 0)  return "Clear sky";
  if (code === 1)  return "Mainly clear";
  if (code === 2)  return "Partly cloudy";
  if (code === 3)  return "Overcast";
  if (code === 45) return "Fog";
  if (code === 48) return "Rime fog";
  if (code === 51) return "Light drizzle";
  if (code === 53) return "Moderate drizzle";
  if (code === 55) return "Dense drizzle";
  if (code === 56) return "Light freezing drizzle";
  if (code === 57) return "Heavy freezing drizzle";
  if (code === 61) return "Slight rain";
  if (code === 63) return "Moderate rain";
  if (code === 65) return "Heavy rain";
  if (code === 66) return "Light freezing rain";
  if (code === 67) return "Heavy freezing rain";
  if (code === 71) return "Slight snow";
  if (code === 73) return "Moderate snow";
  if (code === 75) return "Heavy snow";
  if (code === 77) return "Snow grains";
  if (code === 80) return "Slight rain showers";
  if (code === 81) return "Moderate rain showers";
  if (code === 82) return "Violent rain showers";
  if (code === 85) return "Slight snow showers";
  if (code === 86) return "Heavy snow showers";
  if (code === 95) return "Thunderstorm";
  if (code === 96) return "Thunderstorm with slight hail";
  if (code === 99) return "Thunderstorm with heavy hail";
  return `Unknown conditions (code ${code})`;
}

async function getWeather(lat: number, lon: number): Promise<{
  description: string;
  temperature_c: number;
  feels_like_c: number;
  humidity_pct: number;
  wind_kph: number;
  precipitation_mm: number;
}> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("current", [
    "temperature_2m",
    "apparent_temperature",
    "relative_humidity_2m",
    "weather_code",
    "wind_speed_10m",
    "precipitation",
  ].join(","));
  url.searchParams.set("wind_speed_unit", "kmh");
  url.searchParams.set("forecast_days", "1");

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8_000) });
  if (!res.ok) throw new Error(`open-meteo ${res.status}: ${res.statusText}`);
  const data = await res.json() as OpenMeteoResponse;
  const c = data.current;

  return {
    description: describeWmo(c.weather_code),
    temperature_c: Math.round(c.temperature_2m * 10) / 10,
    feels_like_c: Math.round(c.apparent_temperature * 10) / 10,
    humidity_pct: c.relative_humidity_2m,
    wind_kph: Math.round(c.wind_speed_10m * 10) / 10,
    precipitation_mm: c.precipitation,
  };
}

// ── Tool registry ─────────────────────────────────────────────────────────────

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerTools(server: McpServer, defaultLat: number, defaultLon: number) {
  server.tool(
    "get_time",
    "Get the current date and time in UTC and optionally a named timezone.",
    { timezone: z.string().optional().describe("IANA timezone name e.g. America/New_York. Omit for UTC.") },
    async ({ timezone }) => {
      const now = new Date();
      const utc = now.toISOString();
      let local: string | undefined;
      if (timezone) {
        try {
          local = new Intl.DateTimeFormat("en-US", {
            timeZone: timezone,
            dateStyle: "full",
            timeStyle: "long",
          }).format(now);
        } catch {
          return { content: [{ type: "text", text: `Unknown timezone: ${timezone}` }], isError: true };
        }
      }
      const result: Record<string, string> = { utc };
      if (local && timezone) result[timezone] = local;
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "get_moon_phase",
    "Get the current lunar phase: name, illumination percentage, and age in days.",
    {},
    async () => {
      const phase = getMoonPhase();
      return { content: [{ type: "text", text: JSON.stringify(phase, null, 2) }] };
    },
  );

  server.tool(
    "get_weather",
    "Get current weather conditions via open-meteo (free, no key). Uses configured default location unless lat/lon provided.",
    {
      lat: z.number().min(-90).max(90).optional().describe("Latitude. Defaults to server config."),
      lon: z.number().min(-180).max(180).optional().describe("Longitude. Defaults to server config."),
    },
    async ({ lat, lon }) => {
      try {
        const weather = await getWeather(lat ?? defaultLat, lon ?? defaultLon);
        return { content: [{ type: "text", text: JSON.stringify(weather, null, 2) }] };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Weather fetch failed: ${msg}` }], isError: true };
      }
    },
  );
}
