import { NextResponse } from "next/server"
import { readJsonBody, requireAppRole } from "@/lib/server-auth"

const geminiApiKey = process.env.GEMINI_API_KEY
const geminiModel = process.env.GEMINI_MODEL || "gemini-3.5-flash"

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    key_points: {
      type: "array",
      items: { type: "string" },
    },
    limitations: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["summary", "key_points", "limitations"],
}

function parseJsonOutput(data: unknown) {
  const candidates = typeof data === "object" && data && "candidates" in data
    ? (data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }).candidates
    : undefined
  const text = candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text)
    .find((value): value is string => Boolean(value))

  if (!text) throw new Error("Gemini no devolvio una respuesta valida.")
  return JSON.parse(text)
}

export async function POST(request: Request) {
  if (!geminiApiKey) {
    return NextResponse.json({ error: "Falta configurar GEMINI_API_KEY." }, { status: 500 })
  }

  const auth = await requireAppRole(request, ["admin", "supervisor", "auditor"])
  if ("error" in auth) return auth.error

  let body: unknown
  try {
    body = await readJsonBody(request, 64 * 1024)
  } catch {
    return NextResponse.json({ error: "Solicitud invalida o demasiado grande." }, { status: 400 })
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`, {
    method: "POST",
    headers: {
      "x-goog-api-key": geminiApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text: [
              "Eres un asistente de auditoria.",
              "Resume evidencias de forma objetiva y util para justificar una evaluacion.",
              "Si solo recibes nombres/metadatos y no contenido legible, dilo en limitations.",
              "No inventes contenido no provisto.",
              "Devuelve solo JSON valido con el schema solicitado.",
            ].join(" "),
          },
        ],
      },
      contents: [
        {
          parts: [
            { text: JSON.stringify(body) },
          ],
        },
      ],
      generationConfig: {
        responseFormat: {
          text: {
            mimeType: "application/json",
            schema: responseSchema,
          },
        },
      },
    }),
  })

  if (!response.ok) {
    return NextResponse.json({ error: "No se pudo resumir la evidencia." }, { status: response.status })
  }

  try {
    const data = await response.json()
    return NextResponse.json(parseJsonOutput(data))
  } catch {
    return NextResponse.json({ error: "La respuesta de IA no tuvo un formato valido." }, { status: 502 })
  }
}
