import { BookingRequest, ServiceType, UrgencyLevel } from "@/types/booking";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const SYSTEM_PROMPT = `
You are SevaAI, the ultimate home service booking assistant for Indian households. 
Your goal is 100% ACCURACY in identifying the correct professional, even when the user's input is messy, misspelled, or a mix of English and Hindi (Hinglish).

### YOUR CORE INSTRUCTIONS
1. **Phonetic Superiority**: You understand "bijli", "beejli", "bijlee", and "electrition" all mean Electrician.
2. **Contextual Inference**: If a user says "paani tapak raha hai", they need a Plumber. If they say "pankha awaaz kar raha hai", they need an Electrician.
3. **Typo Resilience**: Ignore JUMBLED characters. "pst contorl" is Pest Control. "ac serivce" is AC Service.
4. **Hinglish Mastery**: You handle transliterated Hindi perfectly (e.g., "safai karwani hai", "khatmal ho gaye hain").

### CATEGORY DEFINITIONS (IDENTIFY EXACTLY ONE)

1. **Deep Cleaning**
   - Keywords: safai, sfai, jhadu, pocha, bartan, bathroom, kitchen, floor, dust, ganda, dirt, mess, scrub, deep clean, full house, balcony, corner.
   - Hinglish: "ghar chamkana hai", "safai wala chahiye", "jhaadu katka", "chaka chak".

2. **Plumbing**
   - Keywords: leak, water, paani, pani, tap, nal, nalkaa, pipe, tank, flush, commode, sink, washbasin, drainage, block, overflow, shower, geyser leak.
   - Hinglish: "nal tapak rha", "paani bah rha", "pipe phat gaya", "tanki overflow".

3. **Electrician**
   - Keywords: light, bijli, bulb, fan, pankha, switch, board, wire, fuse, mcb, current, shock, power, socket, generator, inverter, motor, tripping, short circuit.
   - Hinglish: "bijli chali gayi", "board jal gaya", "short circuit ho gaya", "current maar raha hai".

4. **Painting**
   - Keywords: paint, rang, rangai, wall, deewar, diwar, color, colour, whitewash, putty, putti, distemper, texture, fungus, damp, ceiling.
   - Hinglish: "deewar gandi h", "rang karwana h", "puttai karwani h".

5. **Carpentry**
   - Keywords: wood, lakdi, lakri, furniture, door, darwaza, drwaza, lock, taala, hinge, drawer, cupboard, almari, table, chair, bed, repair, fix wood.
   - Hinglish: "darwaza khrab h", "lakdi ka kaam", "chaukhat", "fittings sahi karni h".

6. **Appliance Repair** (EXCLUDES AC)
   - Keywords: fridge, refrigerator, washing machine, microwave, oven, geyser, chimney, mixer, ro, purifier, tv, television, induction, cooler.
   - Hinglish: "fridge thanda nahi kar raha", "machine kapde nahi dho rahi", "tv chal nahi raha".

7. **Pest Control**
   - Keywords: pest, cockroach, cockroch, chuha, rat, mouse, termite, deemak, insects, bug, ant, khatmal, bedbug, mosquito, lizard, spray, fumigation.
   - Hinglish: "ghar me chuhe ho gaye", "cockroach marne hai", "keede ho gaye hain".

8. **AC Service**
   - Keywords: ac, air conditioner, cooling, thanda, gas refill, filter, compressor, leaking, remote, split ac, window ac, filter clean.
   - Hinglish: "ac thandi hawa ni de rha", "ac me gas bharni h", "ac service karwani h".

### STRICT RULES
- **AC priority**: Any query mentioning "AC" MUST go to AC Service, NOT Appliance Repair.
- **Fan priority**: "Pankha" or "Fan" is ALWAYS Electrician.
- **Geyser priority**: "Geyser leak" is Plumbing. "Geyser not heating" is Appliance Repair.
- **Hindi script**: Understand "नल" as Plumbing, "बिजली" as Electrician, "सफाई" as Deep Cleaning.

### OUTPUT JSON FORMAT
Return ONLY valid JSON:
{
  "service_name": "Exact category name",
  "priority": "Normal" or "Urgent",
  "confidence": 0-100,
  "location": "extracted or Home",
  "description": "Short English summary"
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

        if (!response.ok) throw new Error(`OpenRouter API error: ${response.statusText}`);

        const data = await response.json();
        const content = data.choices[0]?.message?.content?.trim();
        const jsonStr = content.replace(/```json\n?|\n?```/g, "").trim();
        const parsed: AIResponse = JSON.parse(jsonStr);

        if (parsed.confidence < 50 || parsed.service_name === "unknown") {
            const suggestions = parsed.suggestions || getClosestServices(query);
            const clarification = `I'm not quite sure what service you need. Did you mean one of these?\n\n${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nPlease be more specific (e.g., "Fridge repair" or "House cleaning").`;
            return { booking: null, clarification };
        }

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

// ─── Enhanced Fuzzy Fallback (Perfect for Hinglish/Typos) ─────────────────

const SERVICE_PATTERNS: ServicePattern[] = [
    {
        name: "AC Service",
        patterns: ["ac ", " ac", "thanda", "thnda", "gas", "filter", "cooling", "air cond", "vindow", "split", "haava", "hawa"]
    },
    {
        name: "Electrician",
        patterns: ["bijli", "electri", "bulb", "light", "pankha", "fan", "switch", "board", "wire", "mcb", "fuse", "shock", "current", "motor", "tripping", "trippin"]
    },
    {
        name: "Plumbing",
        patterns: ["plumb", "paani", "pani", "water", "leak", "tap", "nal", "nalkaa", "pipe", "flush", "sink", "tank", "commode", "basin", "waash"]
    },
    {
        name: "Pest Control",
        patterns: ["pest", "cockroch", "cockroach", "chuha", "rat", "mouse", "termite", "deemak", "insect", "machhar", "machar", "lizard", "keede", "khatmal", "bedbug", "spray"]
    },
    {
        name: "Deep Cleaning",
        patterns: ["clean", "safai", "sfai", "chaka", "ganda", "jhadu", "jhaadu", "pocha", "potcha", "wash", "scrub", "mess", "dust", "maile", "kude"]
    },
    {
        name: "Appliance Repair",
        patterns: ["fridge", "frdge", "washin", "machine", "geyser", "oven", "tv repair", "chimney", "mixer", "ro re", "induction", "cooler", "purifi"]
    },
    {
        name: "Painting",
        patterns: ["paint", "color", "colour", "whitewash", "distemper", "putti", "putty", "wall", "deewar", "diwar", "rang", "rangai"]
    },
    {
        name: "Carpentry",
        patterns: ["carpen", "wood", "lakdi", "lakri", "door", "darwaza", "drwaza", "lock", "taala", "kilda", "hinge", "almaar", "cabinet", "drawer"]
    }
];

interface ServicePattern {
    name: ServiceType;
    patterns: string[];
}

function fuzzyFallback(query: string): BookingRequest {
    const q = ` ${query.toLowerCase()} `;
    let bestMatch: ServiceType = "Deep Cleaning";
    let maxWeight = 0;

    for (const service of SERVICE_PATTERNS) {
        let weight = 0;
        for (const pattern of service.patterns) {
            if (q.includes(pattern)) {
                weight += pattern.length * 2; // Exact keyword matches are very strong
            }
        }
        
        // Handle phonetics/typos via char sequences
        weight += slidingWindowMatch(q, service.patterns);

        if (weight > maxWeight) {
            maxWeight = weight;
            bestMatch = service.name;
        }
    }

    const urgentWords = ["urgent", "jaldi", "jldi", "abhi", "turant", "emergency", "asap", "fatafat"];
    const isUrgent = urgentWords.some(w => q.includes(w));

    return {
        serviceType: bestMatch,
        urgency: isUrgent ? "Urgent" : "Normal",
        location: "Home",
        description: query,
        confidence: maxWeight > 15 ? 95 : maxWeight > 8 ? 75 : 40
    };
}

function slidingWindowMatch(query: string, patterns: string[]): number {
    let score = 0;
    const words = query.split(/\s+/);
    for (const word of words) {
        if (word.length < 3) continue;
        for (const pattern of patterns) {
            if (pattern.length < 3) continue;
            // Check if word and pattern share significant character chunks
            const commonChunks = 0;
            for (let i = 0; i <= word.length - 3; i++) {
                if (pattern.includes(word.substring(i, i + 3))) score += 1;
            }
        }
    }
    return score;
}

function getClosestServices(query: string): string[] {
    const q = query.toLowerCase();
    const list = SERVICE_PATTERNS.map(s => {
        let sc = 0;
        s.patterns.forEach(p => { if (q.includes(p)) sc += p.length; });
        sc += slidingWindowMatch(q, s.patterns);
        return { name: s.name, score: sc };
    }).sort((a, b) => b.score - a.score);
    return list.slice(0, 3).map(l => l.name);
}

function validateServiceType(type: string): ServiceType {
    const valid: ServiceType[] = ["Deep Cleaning", "Plumbing", "Electrician", "Painting", "Carpentry", "Appliance Repair", "Pest Control", "AC Service"];
    const found = valid.find(v => v.toLowerCase() === type.toLowerCase());
    return found || "Deep Cleaning";
}
