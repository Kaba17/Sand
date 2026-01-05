export interface FlightStatusResult {
  flightStatus: "on_time" | "delayed" | "cancelled" | "diverted" | "unknown";
  actualDeparture: Date | null;
  delayMinutes: number | null;
  source: string;
  rawData: Record<string, unknown>;
}

export async function verifyFlightStatus(
  flightNumber: string,
  scheduledDate: Date,
  departureAirport?: string
): Promise<FlightStatusResult> {
  const apiKey = process.env.AERODATABOX_API_KEY;
  
  if (!apiKey) {
    console.warn("AeroDataBox API key not configured - using mock verification");
    return mockFlightVerification(flightNumber, scheduledDate);
  }

  try {
    const dateStr = scheduledDate.toISOString().split("T")[0];
    
    const url = `https://aerodatabox.p.rapidapi.com/flights/number/${flightNumber}/${dateStr}`;
    
    const response = await fetch(url, {
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          flightStatus: "unknown",
          actualDeparture: null,
          delayMinutes: null,
          source: "aerodatabox",
          rawData: { error: "Flight not found" },
        };
      }
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    const flight = Array.isArray(data) ? data[0] : data;
    
    if (!flight) {
      return {
        flightStatus: "unknown",
        actualDeparture: null,
        delayMinutes: null,
        source: "aerodatabox",
        rawData: { error: "No flight data returned" },
      };
    }

    const departure = flight.departure || {};
    const scheduledTime = departure.scheduledTime?.utc 
      ? new Date(departure.scheduledTime.utc) 
      : null;
    const actualTime = departure.actualTime?.utc 
      ? new Date(departure.actualTime.utc) 
      : null;
    
    let delayMinutes: number | null = null;
    if (scheduledTime && actualTime) {
      delayMinutes = Math.round((actualTime.getTime() - scheduledTime.getTime()) / 60000);
    }

    let flightStatus: FlightStatusResult["flightStatus"] = "unknown";
    const status = (flight.status || "").toLowerCase();
    
    if (status.includes("cancel")) {
      flightStatus = "cancelled";
    } else if (status.includes("divert")) {
      flightStatus = "diverted";
    } else if (delayMinutes !== null) {
      flightStatus = delayMinutes > 15 ? "delayed" : "on_time";
    } else if (status.includes("landed") || status.includes("arrived") || status.includes("scheduled")) {
      flightStatus = "on_time";
    }

    return {
      flightStatus,
      actualDeparture: actualTime,
      delayMinutes,
      source: "aerodatabox",
      rawData: flight,
    };
  } catch (error) {
    console.error("Flight verification API error:", error);
    return {
      flightStatus: "unknown",
      actualDeparture: null,
      delayMinutes: null,
      source: "aerodatabox",
      rawData: { error: error instanceof Error ? error.message : "Unknown error" },
    };
  }
}

function mockFlightVerification(flightNumber: string, scheduledDate: Date): FlightStatusResult {
  const flightHash = flightNumber.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const scenarios = [
    { status: "delayed" as const, delayMinutes: 180 },
    { status: "delayed" as const, delayMinutes: 45 },
    { status: "on_time" as const, delayMinutes: 0 },
    { status: "cancelled" as const, delayMinutes: null },
  ];
  
  const scenario = scenarios[flightHash % scenarios.length];
  
  let actualDeparture: Date | null = null;
  if (scenario.delayMinutes !== null) {
    actualDeparture = new Date(scheduledDate.getTime() + scenario.delayMinutes * 60000);
  }

  return {
    flightStatus: scenario.status,
    actualDeparture,
    delayMinutes: scenario.delayMinutes,
    source: "mock",
    rawData: { 
      note: "This is mock data. Configure AERODATABOX_API_KEY for real verification.",
      flightNumber,
      scheduledDate: scheduledDate.toISOString(),
    },
  };
}
