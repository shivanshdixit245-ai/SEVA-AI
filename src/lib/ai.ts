import { BookingRequest, ServiceType, UrgencyLevel } from "@/types/booking";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const SYSTEM_PROMPT = `
You are SevaAI, an intelligent home service booking assistant for Indian households.
You MUST understand English, Hindi, Hinglish, phonetic Hindi typing, and casual speech.

### YOUR CORE ABILITY
You are an expert at understanding MESSY, INFORMAL, MISSPELLED user input.
You must:
- Mentally auto-correct typos and spelling errors
- Understand phonetic Hindi written in English script (transliteration)
- Handle incomplete sentences and casual slang
- Infer meaning from context even when words are jumbled

### SERVICE CATEGORIES (pick exactly ONE)
1. Deep Cleaning - ghar ki safai, jhaadu, pocha, bartan, bathroom cleaning, kitchen cleaning, dust, ganda, gnda, sfai
2. Plumbing - pani leak, nal, pipe, tank, flush, tap, washbasin, nalkaa, paani, drainage, blocked
3. Electrician - bijli, bulb, tubelight, fan, pankha, switch, wiring, fuse, MCB, power cut, light, socket, shock
4. Painting - rang, paint, wall, deewar, color, putti, whitewash, distemper
5. Carpentry - furniture, door, darwaza, lock, taala, almari, table, chair, wood, lakdi, hinge, cabinet
6. Appliance Repair - fridge, refrigerator, washing machine, microwave, oven, TV, geyser, chimney, mixer, cooler
7. Pest Control - cockroach, keeda, makdi, machhar, termite, bedbug, chuha, ant, insect, pest, spray, fumigation
8. AC Service - AC, air conditioner, cooling, thanda, gas refill, compressor, split AC, window AC, not cooling

### EXAMPLES OF MESSY INPUT YOU MUST HANDLE
"pst contorl karo" → Pest Control (confidence: 90)
"cockroch problem ho gaya" → Pest Control (confidence: 95)
"ac thnda nai kr rha" → AC Service (confidence: 92)
"pankha nai chal raha" → Electrician (confidence: 95)
"ghar gnda h safai chahiye" → Deep Cleaning (confidence: 93)
"frdge repair krna hai" → Appliance Repair (confidence: 95)
"bulb fix karo" → Electrician (confidence: 97)
"pipe se paani aa rha" → Plumbing (confidence: 95)
"deewar pe paint krwana h" → Painting (confidence: 95)
"drwaza ka lock khrb h" → Carpentry (confidence: 90)

### URGENCY DETECTION
Urgent: "urgent", "jaldi", "abhi", "turant", "asap", "emergency", "fatafat", "jldi"
Normal: everything else

### CONFIDENCE SCORING
- 80-100: You are confident about the service. Proceed with booking.
- 50-79: You are somewhat sure. Still proceed but note lower confidence.
- Below 50: You cannot determine the service. Set service to "unknown".

### OUTPUT FORMAT
Return ONLY valid JSON. No markdown, no explanations, no extra text.
{
  "service_name": "exact category name from list above",
  "priority": "Normal" or "Urgent",
  "confidence": number between 0 and 100,
  "location": "extracted location or Home",
  "description": "brief English summary of what user needs"
}

If you truly cannot determine any service (confidence < 50), return:
{
  "service_name": "unknown",
  "priority": "Normal",
  "confidence": 0,
  "location": "Home",
  "description": "Could not determine service",
  "suggestions": ["Service1", "Service2"]
}
`;

export interface AIResponse {
    service_name: string;
    priority: string;
    confidence: number;
    location: string;
    description: string;
    suggestions?: string[];
}

export async function detectServiceIntent(query: string): Promise<{ booking: BookingRequest | null; clarification: string | null }> {
    if (!OPENROUTER_API_KEY) {
        console.warn("Missing OPENROUTER_API_KEY, using fuzzy fallback");
        return { booking: fuzzyFallback(query), clarification: null };
    }

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://sevaai.vercel.app",
                "X-Title": "SevaAI",
            },
            body: JSON.stringify({
                model: "mistralai/mistral-7b-instruct:free",
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: query }
                ],
                temperature: 0.1,
            })
        });

        if (!response.ok) {
            throw new Error(`OpenRouter API error: ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content?.trim();

        // Strip markdown code blocks if present
        const jsonStr = content.replace(/```json\n?|\n?```/g, "").trim();
        const parsed: AIResponse = JSON.parse(jsonStr);

        // Handle low confidence → ask clarification
        if (parsed.confidence < 50 || parsed.service_name === "unknown") {
            const suggestions = parsed.suggestions || getClosestServices(query);
            const clarification = `I'm not quite sure what service you need. Did you mean one of these?\n\n${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nPlease tell me more specifically what help you need.`;
            return { booking: null, clarification };
        }

        // Valid booking
        return {
            booking: {
                serviceType: validateServiceType(parsed.service_name),
                urgency: parsed.priority === 'Urgent' ? 'Urgent' : 'Normal',
                location: parsed.location || "Home",
                description: parsed.description || query,
                confidence: parsed.confidence
            },
            clarification: null
        };

    } catch (error) {
        console.error("AI Detection Failed:", error);
        return { booking: fuzzyFallback(query), clarification: null };
    }
}

// ─── Fuzzy Fallback (no API key) ───────────────────────────────────────────
// Uses similarity scoring instead of exact keyword matching

interface ServicePattern {
    name: ServiceType;
    patterns: string[];
}

const SERVICE_PATTERNS: ServicePattern[] = [
    {
        name: "Pest Control",
        patterns: ["pest", "pst", "cockroach", "cockroch", "keeda", "makdi", "machhar", "termite", "bedbug", "chuha", "insect", "bug", "spray", "fumig", "khatmal", "kitnashak"]
    },
    {
        name: "Electrician",
        patterns: ["electric", "bijli", "bulb", "light", "fan", "pankha", "pnkha", "switch", "wiring", "fuse", "mcb", "power", "shock", "socket", "tubelight"]
    },
    {
        name: "AC Service",
        patterns: ["ac ", " ac", "ac.", "air cond", "cooling", "thanda", "thnda", "gas refill", "compressor", "split ac", "window ac"]
    },
    {
        name: "Plumbing",
        patterns: ["plumb", "leak", "pipe", "paani", "pani", "water", "tap", "nal", "nalkaa", "flush", "sink", "drainage", "block", "tank"]
    },
    {
        name: "Deep Cleaning",
        patterns: ["clean", "safai", "sfai", "ganda", "gnda", "dust", "jhadu", "jhaadu", "pocha", "wash", "mess", "bartan", "bathroom clean", "kitchen clean"]
    },
    {
        name: "Painting",
        patterns: ["paint", "rang", "wall", "deewar", "diwar", "color", "colour", "putti", "whitewash", "distemper"]
    },
    {
        name: "Carpentry",
        patterns: ["carpent", "wood", "lakdi", "furniture", "door", "darwaza", "drwaza", "lock", "taala", "hinge", "almari", "table", "chair", "cabinet"]
    },
    {
        name: "Appliance Repair",
        patterns: ["fridge", "frdge", "refriger", "washing machine", "microwave", "oven", "tv repair", "geyser", "chimney", "mixer", "cooler", "appliance"]
    }
];

function fuzzyFallback(query: string): BookingRequest {
    const lowerQuery = ` ${query.toLowerCase()} `;

    let bestMatch: ServiceType = "Deep Cleaning";
    let bestScore = 0;

    for (const service of SERVICE_PATTERNS) {
        let score = 0;
        for (const pattern of service.patterns) {
            if (lowerQuery.includes(pattern)) {
                // Longer pattern matches are more valuable
                score += pattern.length;
            }
        }
        // Also check for fuzzy similarity (simple character overlap for typos)
        score += fuzzyScore(lowerQuery, service.patterns);

        if (score > bestScore) {
            bestScore = score;
            bestMatch = service.name;
        }
    }

    let urgency: UrgencyLevel = "Normal";
    const urgentWords = ["urgent", "jaldi", "jldi", "abhi", "asap", "emergency", "turant", "fatafat"];
    if (urgentWords.some(w => lowerQuery.includes(w))) urgency = "Urgent";

    const confidence = bestScore > 10 ? 90 : bestScore > 5 ? 70 : bestScore > 0 ? 50 : 20;

    return {
        serviceType: bestMatch,
        urgency,
        location: "Home",
        description: query,
        confidence
    };
}

// Simple fuzzy matching: checks if any 3+ char substring of query loosely matches patterns
function fuzzyScore(query: string, patterns: string[]): number {
    let score = 0;
    for (const pattern of patterns) {
        if (pattern.length < 3) continue;
        // Check for 3-char subsequence matches (handles typos)
        for (let i = 0; i <= query.length - 3; i++) {
            const chunk = query.substring(i, i + 3);
            if (pattern.includes(chunk) && chunk.trim().length >= 2) {
                score += 1;
                break; // Count each pattern only once
            }
        }
    }
    return score;
}

function getClosestServices(query: string): string[] {
    const lowerQuery = ` ${query.toLowerCase()} `;
    const scores: { name: string; score: number }[] = [];

    for (const service of SERVICE_PATTERNS) {
        let score = 0;
        for (const pattern of service.patterns) {
            if (lowerQuery.includes(pattern)) score += pattern.length;
        }
        score += fuzzyScore(lowerQuery, service.patterns);
        scores.push({ name: service.name, score });
    }

    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, 3).map(s => s.name);
}

function validateServiceType(type: string): ServiceType {
    const validTypes: ServiceType[] = [
        'Deep Cleaning', 'Plumbing', 'Electrician', 'Painting',
        'Carpentry', 'Appliance Repair', 'Pest Control', 'AC Service'
    ];
    // Try case-insensitive match
    const found = validTypes.find(v => v.toLowerCase() === type.toLowerCase());
    return found || 'Deep Cleaning';
}
