import { v } from "convex/values";
import { action, env, query } from "./_generated/server";
import { api } from "./_generated/api";
import { requireCrmPermission } from "./lib";

type SnapshotRequest = {
  id: string;
  reference: string;
  type: string;
  collecteType: string | null;
  stage: string;
  displayedStage: string;
  outcome: string;
  complete: boolean;
  scheduledDate: number | null;
  assignedTo: string | null;
  assignedName: string | null;
  site: string | null;
  city: string | null;
  postalCode: string | null;
  customerName: string;
  createdAt: number;
  updatedAt: number;
};

type AnalysisSnapshot = {
  generatedAt: number;
  requests: SnapshotRequest[];
  team: Array<{ id: string; name: string }>;
};

const TYPE_LABELS: Record<string, string> = {
  aerogommage: "Aérogommage",
  collecte: "Collecte",
  article: "Boutique",
  velo: "Cycle en Bray",
};

function displayedStage(request: {
  completedSteps: number;
  processSteps: string[];
}) {
  if (request.completedSteps <= 0) return "Nouveau";
  const doneStep = request.processSteps[Math.min(request.completedSteps, request.processSteps.length) - 1];
  return doneStep ?? "Nouveau";
}

function responseText(data: {
  output_text?: string;
  output?: Array<{
    content?: Array<{ text?: string; type?: string }>;
  }>;
}) {
  if (data.output_text) return data.output_text;
  return (
    data.output
      ?.flatMap((item) => item.content ?? [])
      .map((part) => part.text ?? "")
      .join("")
      .trim() ?? ""
  );
}

export const snapshot = query({
  args: {},
  handler: async (ctx): Promise<AnalysisSnapshot> => {
    await requireCrmPermission(ctx, "demandes", "read");
    const [requests, team] = await Promise.all([
      ctx.db.query("requests").order("desc").collect(),
      ctx.db.query("teamMembers").order("desc").collect(),
    ]);
    const teamNames = new Map(team.map((member) => [String(member._id), member.name]));

    return {
      generatedAt: Date.now(),
      team: team.map((member) => ({
        id: String(member._id),
        name: member.name,
      })),
      requests: requests.map((request) => ({
        id: String(request._id),
        reference: request.reference ?? String(request._id).slice(-6),
        type: TYPE_LABELS[request.type] ?? request.type,
        collecteType: request.collecteType ?? null,
        stage: request.stage,
        displayedStage: displayedStage(request),
        outcome: request.outcome,
        complete: request.complete,
        scheduledDate: request.scheduledDate ?? null,
        assignedTo: request.assignedTo ? String(request.assignedTo) : null,
        assignedName: request.assignedTo ? teamNames.get(String(request.assignedTo)) ?? null : null,
        site: request.site ?? null,
        city: request.customer.city ?? null,
        postalCode: request.customer.postalCode ?? null,
        customerName: [request.customer.firstName, request.customer.lastName]
          .filter(Boolean)
          .join(" ")
          .trim(),
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
      })),
    };
  },
});

export const chat = action({
  args: {
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
      }),
    ),
  },
  handler: async (ctx, { messages }) => {
    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("Clé OpenAI non configurée. Ajoutez OPENAI_API_KEY dans les variables Convex.");
    }

    const snapshotData: AnalysisSnapshot = await ctx.runQuery(api.requestAnalysis.snapshot, {});
    const model = env.OPENAI_REQUEST_ANALYSIS_MODEL ?? "gpt-5.4-mini";
    const compactMessages = messages.slice(-10);

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content:
              "Tu es l'assistant manager CRM de Recycapp. Analyse les demandes et aide à organiser les collectes, le planning, les encadrants et les priorités. Réponds en français, de façon opérationnelle, concise et actionnable. Quand tu cites une demande, utilise toujours sa référence au format #000123 pour que l'interface puisse la rendre cliquable. Ne prétends jamais avoir modifié les données.",
          },
          {
            role: "user",
            content:
              "Voici le snapshot CRM à analyser. Les dates sont des timestamps Unix en millisecondes. Donne des recommandations concrètes, repère les demandes en attente, les regroupements possibles par date/ville/type, les journées chargées et les assignations.\n\n" +
              JSON.stringify(snapshotData),
          },
          ...compactMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        ],
        reasoning: { effort: "medium" },
        text: { verbosity: "medium" },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Erreur OpenAI (${response.status}) : ${errorBody.slice(0, 300)}`);
    }

    const data = await response.json();
    const answer = responseText(data);
    if (!answer) throw new Error("OpenAI n'a pas renvoyé de réponse exploitable.");

    return {
      answer,
      model,
      requestRefs: snapshotData.requests.map((request) => ({
        id: request.id,
        reference: request.reference,
        label: `${request.type} #${request.reference}`,
      })),
    };
  },
});
