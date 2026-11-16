/** Un exemple d'apprentissage : un vecteur et sa classe. */
export type Example = { x: Float32Array; y: number };

/**
 * Un classeur appris sur les vecteurs : une régression logistique à
 * plusieurs classes, apprise par Adam. Il donne la classe la plus probable
 * et sa probabilité, qui dit à quel point il est sûr.
 */
export function trainSoftmax(
  data: Example[],
  classes: number,
  { epochs = 60, lr = 0.01, l2 = 1e-4, batchSize = 32 } = {},
) {
  const dim = data[0]?.x.length ?? 0;
  const W = new Float32Array(classes * dim);
  const b = new Float32Array(classes);
  const mW = new Float32Array(W.length);
  const vW = new Float32Array(W.length);
  const mB = new Float32Array(classes);
  const vB = new Float32Array(classes);
  const [b1, b2, eps] = [0.9, 0.999, 1e-8];
  let t = 0;
  const scores = (x: Float32Array, out: Float32Array) => {
    let max = -Infinity;
    for (let k = 0; k < classes; k++) {
      let s = b[k];
      const o = k * dim;
      for (let j = 0; j < dim; j++) s += W[o + j] * x[j];
      out[k] = s;
      if (s > max) max = s;
    }
    let sum = 0;
    for (let k = 0; k < classes; k++) sum += out[k] = Math.exp(out[k] - max);
    for (let k = 0; k < classes; k++) out[k] /= sum;
  };
  const p = new Float32Array(classes);
  for (let e = 0; e < epochs; e++) {
    // Un mélange équitable (Fisher-Yates) : chaque ordre a la même chance.
    const order = [...data.keys()];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    for (let start = 0; start < order.length; start += batchSize) {
      const batch = order.slice(start, start + batchSize);
      const gW = new Float32Array(W.length);
      const gB = new Float32Array(classes);
      for (const i of batch) {
        const { x, y } = data[i];
        scores(x, p);
        for (let k = 0; k < classes; k++) {
          const g = p[k] - (k === y ? 1 : 0);
          gB[k] += g;
          const o = k * dim;
          for (let j = 0; j < dim; j++) gW[o + j] += g * x[j];
        }
      }
      t++;
      const n = batch.length;
      const step = (
        w: Float32Array,
        m: Float32Array,
        v: Float32Array,
        g: Float32Array,
        decay: number,
      ) => {
        for (let i = 0; i < w.length; i++) {
          const gi = g[i] / n + decay * w[i];
          m[i] = b1 * m[i] + (1 - b1) * gi;
          v[i] = b2 * v[i] + (1 - b2) * gi * gi;
          w[i] -=
            (lr * (m[i] / (1 - b1 ** t))) /
            (Math.sqrt(v[i] / (1 - b2 ** t)) + eps);
        }
      };
      step(W, mW, vW, gW, l2);
      step(b, mB, vB, gB, 0);
    }
  }
  return (x: Float32Array) => {
    const out = new Float32Array(classes);
    scores(x, out);
    let best = 0;
    for (let k = 1; k < classes; k++) if (out[k] > out[best]) best = k;
    return { k: best, p: out[best], probabilities: out };
  };
}

/**
 * L'entropie croisée catégorielle sur des exemples : la moyenne de
 * − log p(bon sujet). C'est la perte que l'apprentissage minimise ; mesurée
 * sur des exemples jamais vus, elle dit si le classeur se trompe avec
 * assurance. Au hasard, elle vaut log(nombre de classes).
 */
export function crossEntropy(
  predict: (x: Float32Array) => { probabilities: Float32Array },
  data: Example[],
) {
  if (data.length === 0) return null;
  let sum = 0;
  for (const { x, y } of data)
    sum -= Math.log(Math.max(1e-12, predict(x).probabilities[y]));
  return sum / data.length;
}
