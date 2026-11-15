import { Injectable } from '@nestjs/common';
import { nearestCorrections, type Correction } from '../../domain/corrections';
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
  'Tu ne juges pas, tu ne résumes pas, tu ne donnes aucune position. Tu réponds uniquement par le code. Les réponses déjà données ont été vérifiées par l’équipe : suis-les pour des extraits semblables.';

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

  async classify(
    grid: GridTopic[],
    units: UnitText[],
    corrections: Correction[] = [],
  ): Promise<TopicChoice[]> {
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
    // La grille dans la consigne, la même pour tous les extraits : Ollama
    // la garde en mémoire d'un extrait à l'autre.
    const system = `${SYSTEM}\n\nGrands sujets (code — intitulé : sous-sujets) :\n${majors}`;
    const ask = (text: string) =>
      `Extrait :\n« ${text} »\n\nQuel est le grand sujet principal de cet extrait ?`;
    const out: TopicChoice[] = [];
    for (const unit of units) {
      // Les erreurs déjà corrigées par l'équipe, les plus proches de cet
      // extrait, posées comme des réponses déjà données.
      const examples = nearestCorrections(unit.text, corrections).flatMap(
        (c) => [
          {
            role: 'user',
            content: `${ask(c.text.slice(0, 600))}${c.reason ? `\n(Note de l’équipe : ${c.reason})` : ''}`,
          },
          { role: 'assistant', content: JSON.stringify({ code: c.code }) },
        ],
      );
      const major = await this.choose(
        system,
        examples,
        ask(unit.text),
        grid.map((t) => t.code),
      );
      out.push({ id: unit.id, code: major });
    }
    return out;
  }

  /** Une question, et une réponse contrainte à l'un des codes donnés. */
  private async choose(
    system: string,
    examples: { role: string; content: string }[],
    question: string,
    codes: string[],
  ) {
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
          { role: 'system', content: system },
          ...examples,
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
