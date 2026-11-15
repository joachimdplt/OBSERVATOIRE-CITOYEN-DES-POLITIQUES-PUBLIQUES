import { Injectable } from '@nestjs/common';
import type {
  GridTopic,
  TopicChoice,
  TopicClassifier,
  UnitText,
} from '../../ports/topic-classifier';

const URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';

const SYSTEM =
  'Tu ranges des chapitres de programmes politiques dans la grille internationale du Comparative Agendas Project (CAP). ' +
  'Tu choisis le sujet dont le chapitre parle principalement. Tu ne juges pas, tu ne résumes pas, tu ne donnes aucune position. ' +
  'Tu réponds uniquement par le code demandé.';

/**
 * Le classeur local servi par Ollama (Qwen3 par défaut, licence Apache 2.0) :
 * pour chaque chapitre, il choisit le grand sujet de la grille dont il parle
 * principalement, en lisant leurs intitulés et leurs sous-sujets officiels. Sa réponse
 * est contrainte à la liste des codes : il ne peut rien inventer. La
 * température est nulle : un même chapitre reçoit toujours la même réponse.
 */
@Injectable()
export class OllamaTopicClassifier implements TopicClassifier {
  readonly model = process.env.CLASSIFIER_MODEL ?? 'qwen3:8b';

  async classify(grid: GridTopic[], units: UnitText[]): Promise<TopicChoice[]> {
    // Chaque grand sujet avec ses sous-sujets en exemples ; un sujet qui
    // n'a qu'un sous-sujet (Immigration) est décrit par sa définition, sans
    // quoi l'exemple « Migrant and Seasonal » du sujet Travail l'emporte.
    const majors = grid
      .map((t) => {
        const named = t.subtopics.filter(
          (s) => !/^(General|Other)$/.test(s.title),
        );
        const examples =
          named.length > 1
            ? named.map((s) => s.title).join(', ')
            : (named[0]?.description ?? t.title);
        return `${t.code} — ${t.title} (${t.label}) : ${examples}`;
      })
      .join('\n');
    const out: TopicChoice[] = [];
    for (const unit of units) {
      const major = await this.choose(
        `Grands sujets de la grille CAP (code — intitulé : exemples) :\n${majors}\n\nChapitre :\n« ${unit.text} »\n\nQuel est le grand sujet principal de ce chapitre ?`,
        grid.map((t) => t.code),
      );
      out.push({ id: unit.id, code: major });
    }
    return out;
  }

  /** Une question, et une réponse contrainte à l'un des codes donnés. */
  private async choose(question: string, codes: string[]) {
    const res = await fetch(`${URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(300_000),
      body: JSON.stringify({
        model: this.model,
        stream: false,
        think: false,
        options: { temperature: 0, num_ctx: 8192 },
        format: {
          type: 'object',
          properties: { code: { type: 'string', enum: codes } },
          required: ['code'],
        },
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: question },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Ollama : ${res.status} ${await res.text()}`);
    const body = (await res.json()) as { message?: { content?: string } };
    try {
      const { code } = JSON.parse(body.message?.content ?? '{}') as {
        code?: string;
      };
      return code && codes.includes(code) ? code : null;
    } catch {
      return null;
    }
  }
}
