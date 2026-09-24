import { resources } from '../src/i18n';

describe('Multilingual i18n Completeness', () => {
  const englishKeys = Object.keys(resources.en.translation);

  it('should support Assamese with complete key parity', () => {
    const assameseKeys = Object.keys(resources.as.translation);
    englishKeys.forEach((key) => {
      expect(assameseKeys).toContain(key);
    });
  });

  it('should support Khasi with complete key parity', () => {
    const khasiKeys = Object.keys(resources.kha.translation);
    englishKeys.forEach((key) => {
      expect(khasiKeys).toContain(key);
    });
  });

  it('should support Bengali with complete key parity', () => {
    const bengaliKeys = Object.keys(resources.bn.translation);
    englishKeys.forEach((key) => {
      expect(bengaliKeys).toContain(key);
    });
  });
});
