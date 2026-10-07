/**
 * Pitch generation via Groq (llama-3.3-70b-versatile) with a deterministic
 * local composer fallback so the pipeline works with no API key configured.
 */

export interface PitchInput {
  companyName: string;
  jobTitle: string;
  techStackTags: string[];
  decisionMakerName: string;
  decisionMakerRole: string;
  location: string;
}

export interface PitchOutput {
  pitch: string;
  subject: string;
  model: string;
}

const SYSTEM_PROMPT = [
  "You write cold outreach emails for a B2B recruiting-data vendor.",
  "Rules:",
  "- Exactly 3 sentences, plain professional English.",
  "- Sentence 1 references the exact open role and one technology from their stack, proving you read the listing.",
  "- Sentence 2 states a concrete, relevant outcome (e.g., pre-verified candidate pipelines, sourcing time reduction).",
  "- Sentence 3 is a low-friction question, not a demand for a meeting.",
  "- No buzzwords. No 'revolutionize', 'seamless', 'empower', 'game-changer'. No exclamation marks.",
  "- Do not invent the sender's company name; refer to it as 'our platform'.",
].join("\n");

function localComposer(input: PitchInput): PitchOutput {
  const stack = input.techStackTags.slice(0, 2).join(" and ") || "the stack listed";
  const firstName = input.decisionMakerName.split(" ")[0] ?? "there";
  const pitch = [
    `${firstName}, saw that ${input.companyName} opened a ${input.jobTitle} role in ${input.location} with ${stack} in the requirements, which usually means the team needs output before the seat is even filled.`,
    `Our platform maintains pre-verified ${stack} candidates with availability data refreshed weekly, and teams using it cut time-to-first-interview by roughly 40%.`,
    `Worth a look at the shortlist before you commit to the full agency route?`,
  ].join(" ");
  const subject = `${input.companyName} — shortlist for the ${input.jobTitle} opening`;
  return { pitch, subject, model: "local-composer-v1" };
}

export async function generatePitch(input: PitchInput): Promise<PitchOutput> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return localComposer(input);

  const userPrompt = [
    `Company: ${input.companyName}`,
    `Open role: ${input.jobTitle}`,
    `Tech stack: ${input.techStackTags.join(", ")}`,
    `Location: ${input.location}`,
    `Recipient: ${input.decisionMakerName} (${input.decisionMakerRole})`,
    "Write the 3-sentence cold email now.",
  ].join("\n");

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 320,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return localComposer(input);

    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = body.choices?.[0]?.message?.content?.trim();
    if (!content) return localComposer(input);

    return {
      pitch: content,
      subject: `${input.companyName} — shortlist for the ${input.jobTitle} opening`,
      model: "llama-3.3-70b-versatile",
    };
  } catch {
    return localComposer(input);
  }
}
