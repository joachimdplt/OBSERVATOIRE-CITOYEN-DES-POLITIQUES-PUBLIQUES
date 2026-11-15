import { Injectable } from '@nestjs/common';
import type {
  GridTopic,
  TopicChoice,
  TopicClassifier,
  UnitText,
} from '../../ports/topic-classifier';

const URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';

const SYSTEM =
  'Tu ranges des extraits de programmes politiques français dans la grille du Comparative Agendas Project (CAP). ' +
  'Tu choisis le grand sujet dont l’extrait parle principalement, d’après les mesures proposées, pas d’après les mots employés. ' +
  'Tu ne juges pas, tu ne résumes pas, tu ne donnes aucune position. Tu réponds uniquement par le code.';

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
    // Chaque grand sujet en français, avec ses sous-sujets en exemples :
    // des extraits français se rangent mieux dans une grille en français
    // (19 bons sur 26 extraits relus, contre 15 avec les intitulés anglais).
    const majors = grid
      .map(
        (t) =>
          `${t.code} — ${t.label} : ${t.subtopics
            .filter((s) => !/^(General|Other)$/.test(s.title))
            .map((s) => s.label)
            .join(', ')}`,
      )
      .join('\n');
    const out: TopicChoice[] = [];
    for (const unit of units) {
      const major = await this.choose(
        `Grands sujets (code — intitulé : sous-sujets) :\n${majors}\n\nExtrait :\n« ${unit.text} »\n\nQuel est le grand sujet principal de cet extrait ?`,
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
