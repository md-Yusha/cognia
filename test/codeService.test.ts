import { generateMemorableCode } from '../src/services/codeService';

describe('Patient Code Service', () => {
  it('should generate a memorable code with regional NER prefix and 3 digits', () => {
    const code = generateMemorableCode();
    expect(code).toBeDefined();
    expect(typeof code).toBe('string');
    
    // Format must match PREFIX-NUM (e.g. TEA-204)
    const parts = code.split('-');
    expect(parts.length).toBe(2);
    expect(parts[0].length).toBeGreaterThanOrEqual(3);
    const num = parseInt(parts[1], 10);
    expect(num).toBeGreaterThanOrEqual(100);
    expect(num).toBeLessThanOrEqual(999);
  });

  it('should produce distinct codes on consecutive calls', () => {
    const codes = new Set();
    for (let i = 0; i < 20; i++) {
      codes.add(generateMemorableCode());
    }
    expect(codes.size).toBeGreaterThan(15);
  });
});
