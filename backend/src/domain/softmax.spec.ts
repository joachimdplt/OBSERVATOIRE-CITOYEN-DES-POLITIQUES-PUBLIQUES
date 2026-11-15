import { trainSoftmax } from './softmax';

describe('le classeur appris sur les vecteurs', () => {
  it('apprend deux classes séparables et dit qu’il en est sûr', () => {
    const data = Array.from({ length: 60 }, (_, i) => ({
      x: new Float32Array(
        i % 2 ? [1, 0.1 * Math.random()] : [0.1 * Math.random(), 1],
      ),
      y: i % 2,
    }));
    const predict = trainSoftmax(data, 2, { epochs: 200, lr: 0.05 });
    expect(predict(new Float32Array([1, 0])).k).toBe(1);
    expect(predict(new Float32Array([0, 1])).k).toBe(0);
    expect(predict(new Float32Array([1, 0])).p).toBeGreaterThan(0.7);
  });
});
