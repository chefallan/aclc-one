import { getAiClient, isAiConfigured } from "@/lib/ai-client";

export interface AiProvider {
  generateDailySummary(input: DailySummaryInput): Promise<AiSummaryResult>;
  generateWeeklySummary(input: WeeklySummaryInput): Promise<AiSummaryResult>;
  generateFinalReport(input: FinalReportInput): Promise<AiSummaryResult>;
}

export interface ActivityEntry {
  timestamp: string;
  taskDescription: string;
  learningDescription?: string | null;
  taskCategory: string;
  hours: number;
}

export interface DailySummaryInput {
  studentName: string;
  date: string;
  workplace: string;
  totalHours: number;
  activities: ActivityEntry[];
}

export interface WeeklySummaryInput {
  studentName: string;
  weekStart: string;
  weekEnd: string;
  workplace: string;
  totalHours: number;
  daysPresent: number;
  daysAbsent: number;
  activities: ActivityEntry[];
  dailySummaries: string[];
}

export interface FinalReportInput {
  studentName: string;
  schoolName: string;
  program: string;
  workplace: string;
  startDate: string;
  endDate: string;
  totalHours: number;
  attendance: { present: number; absent: number; late: number };
  activities: ActivityEntry[];
  weeklySummaries: string[];
}

export interface AiSummaryResult {
  summary: string;
  keyActivities: string[];
  skillsPracticed: string[];
  learningOutcomes: string[];
  reflectionDraft: string;
}

/**
 * Summary generation for immersion reports.
 *
 * Provider-agnostic: it goes through the shared AI client, so it follows
 * AI_PROVIDER to OpenAI or Ollama without knowing which is configured. When no
 * provider is usable it falls back to a deterministic summary assembled from
 * the logs themselves rather than failing the request.
 */
class ConfiguredAiProvider implements AiProvider {
  private configured(): boolean {
    return isAiConfigured();
  }

  async generateDailySummary(input: DailySummaryInput): Promise<AiSummaryResult> {
    if (!this.configured()) {
      return this.fallbackDailySummary(input);
    }

    const prompt = this.buildDailyPrompt(input);
    return this.callAi(prompt);
  }

  async generateWeeklySummary(input: WeeklySummaryInput): Promise<AiSummaryResult> {
    if (!this.configured()) {
      return this.fallbackWeeklySummary(input);
    }

    const prompt = this.buildWeeklyPrompt(input);
    return this.callAi(prompt);
  }

  async generateFinalReport(input: FinalReportInput): Promise<AiSummaryResult> {
    if (!this.configured()) {
      return this.fallbackFinalReport(input);
    }

    const prompt = this.buildFinalPrompt(input);
    return this.callAi(prompt);
  }

  private async callAi(prompt: string): Promise<AiSummaryResult> {
    try {
      const ai = await getAiClient();

      const completion = await ai.client.chat.completions.create({
        model: ai.model,
        temperature: 0.3,
        max_tokens: 1500,
        messages: [
          {
            role: "system",
            content:
              "You are an educational AI assistant that generates factual summaries of student work immersion activities. " +
              "You must ONLY use the provided data. Do NOT invent activities, hours, workplaces, people, or achievements. " +
              "If data is insufficient, state that clearly.",
          },
          { role: "user", content: prompt },
        ],
      });

      const content = completion.choices[0]?.message?.content || "";
      return this.parseAiResponse(content);
    } catch (error) {
      console.error("AI generation failed:", error);
      return {
        summary: "AI summary generation failed. Please try again later.",
        keyActivities: [],
        skillsPracticed: [],
        learningOutcomes: [],
        reflectionDraft: "",
      };
    }
  }

  private parseAiResponse(content: string): AiSummaryResult {
    // Simple parsing - in production, use structured output or JSON mode
    return {
      summary: content.slice(0, 500),
      keyActivities: [],
      skillsPracticed: [],
      learningOutcomes: [],
      reflectionDraft: content.slice(500, 1000),
    };
  }

  private buildDailyPrompt(input: DailySummaryInput): string {
    const activities = input.activities
      .map(
        (a) =>
          `- ${a.timestamp}: ${a.taskCategory} - ${a.taskDescription}${a.learningDescription ? ` (Learning: ${a.learningDescription})` : ""}`
      )
      .join("\n");

    return `Generate a daily work immersion summary for ${input.studentName} at ${input.workplace} on ${input.date}.

Total hours: ${input.totalHours}

Activities:
${activities}

Provide:
1. A factual summary (2-3 sentences)
2. Key activities performed
3. Skills practiced (only if evidenced by activities)
4. Learning outcomes (only if evidenced)
5. A brief reflection draft (1 paragraph)`;
  }

  private buildWeeklyPrompt(input: WeeklySummaryInput): string {
    return `Generate a weekly work immersion summary for ${input.studentName} at ${input.workplace} (${input.weekStart} to ${input.weekEnd}).

Total hours: ${input.totalHours}
Days present: ${input.daysPresent}
Days absent: ${input.daysAbsent}

Generate a structured summary.`;
  }

  private buildFinalPrompt(input: FinalReportInput): string {
    return `Generate a final work immersion report for ${input.studentName}.

School: ${input.schoolName}
Program: ${input.program}
Workplace: ${input.workplace}
Period: ${input.startDate} to ${input.endDate}
Total hours: ${input.totalHours}
Attendance: ${input.attendance.present} present, ${input.attendance.absent} absent, ${input.attendance.late} late

Generate a comprehensive final report.`;
  }

  private fallbackDailySummary(input: DailySummaryInput): AiSummaryResult {
    const activities = input.activities;
    const summary = `On ${input.date}, ${input.studentName} worked ${input.totalHours} hours at ${input.workplace}. ${activities.length} activity log(s) were recorded.`;

    return {
      summary,
      keyActivities: activities.map((a) => a.taskDescription),
      skillsPracticed: [],
      learningOutcomes: activities
        .filter((a) => a.learningDescription)
        .map((a) => a.learningDescription!),
      reflectionDraft: `During this day at ${input.workplace}, ${input.studentName} engaged in various work activities totaling ${input.totalHours} hours.`,
    };
  }

  private fallbackWeeklySummary(input: WeeklySummaryInput): AiSummaryResult {
    return {
      summary: `Week of ${input.weekStart} to ${input.weekEnd}: ${input.studentName} worked ${input.totalHours} hours at ${input.workplace}. Present: ${input.daysPresent}, Absent: ${input.daysAbsent}.`,
      keyActivities: [],
      skillsPracticed: [],
      learningOutcomes: [],
      reflectionDraft: ``,
    };
  }

  private fallbackFinalReport(input: FinalReportInput): AiSummaryResult {
    return {
      summary: `${input.studentName} completed ${input.totalHours} hours of work immersion at ${input.workplace} from ${input.startDate} to ${input.endDate}.`,
      keyActivities: [],
      skillsPracticed: [],
      learningOutcomes: [],
      reflectionDraft: ``,
    };
  }
}

export function getAiProvider(): AiProvider {
  const provider = process.env.AI_PROVIDER || "openai";

  switch (provider) {
    case "openai":
    case "ollama":
      return new ConfiguredAiProvider();
    default:
      // This used to return the OpenAI provider for every value, so setting
      // AI_PROVIDER=anthropic quietly sent traffic to OpenAI with an OpenAI
      // key. An abstraction that silently substitutes a different vendor is
      // worse than one that names what it supports.
      throw new Error(
        `Unsupported AI_PROVIDER "${provider}". Supported providers: openai, ollama.`
      );
  }
}
