import { OpenAI } from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { ApiMessageThreadFull } from "../../types/threads.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const AppointmentDetailsSchema = z.object({
  date: z
    .string()
    .describe(
      "The date of the open house in YYYY-MM-DD format (e.g., 2025-12-15). Empty string if not found."
    ),
  startTime: z
    .string()
    .describe(
      "The start time of the open house in HH:mm format (e.g., 16:00). Empty string if not found."
    ),
  endTime: z
    .string()
    .describe(
      "The end time of the open house in HH:mm format (e.g., 16:00). Empty string if not found."
    ),
  cancelled: z
    .boolean()
    .describe(
      "Whether the open house is cancelled. True if cancelled, false if not."
    ),
});

export type AppointmentDetails = z.infer<typeof AppointmentDetailsSchema>;

const EXTRACTION_PROMPT = `Du er en dansk tekst-analysator. Ekstraher dato og tidspunkt for åbent hus fra beskeden.

Vigtige regler:
- Datoen SKAL formateres som YYYY-MM-DD (f.eks. 2025-12-15)
- Starttiden SKAL formateres som HH:mm (f.eks. 16:00)
- Sluttiden SKAL formateres som HH:mm (f.eks. 16:00)
- Hvis der ikke findes nogen dato eller start- eller sluttid, returner en tom dato og tidspunkt
- Hvis åbent hus er aflyst, returner cancelled som true, og date, startTime og endTime som tomme dato og tidspunkt
- Hvis der er flere beskeder om åbent hus, skal du bruge den seneste besked
- Antag at året er 2025 hvis det ikke er specificeret`;

export async function extractAppointmentDetailsWithLLM(
  thread: ApiMessageThreadFull
) {
  const messages = thread.messages.sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime());

  // Remove all HTML tags from messages
  const cleanMessages = messages.map((message) => ({
    ...message,
    body: message.body.replace(/<[^>]*>?/g, ""),
  }));

  // Filter out messages where sender.name is findbolig
  const agentMessages = cleanMessages.filter(
    (message) => message.sender?.name?.toLowerCase() !== "findbolig"
  );

  // Filter out messages that do not include 'åbent hus'
  const openHouseMessages = agentMessages.filter((message) =>
    message.body.toLowerCase().includes("åbent hus")
  );

  if (openHouseMessages.length === 0) {
    return { date: "", startTime: "", endTime: "", cancelled: false };
  }

  const context = openHouseMessages.map((message) => message.body).join("\n\n");

  const response = await openai.responses.parse({
    model: "gpt-5-nano",
    input: [
      {
        role: "system",
        content: EXTRACTION_PROMPT,
      },
      {
        role: "user",
        content: `Ekstraher dato og tidspunkt fra følgende besked(er) om åbent hus:\n\n${context}`,
      },
    ],
    text: {
      format: zodTextFormat(AppointmentDetailsSchema, "appointment_details"),
    },
  });

  const openHouseDetails = response.output_parsed;

  if (!openHouseDetails) {
    return { date: "", startTime: "", endTime: "", cancelled: false };
  }
  return openHouseDetails;
}
