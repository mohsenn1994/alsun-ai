import { validateAnswerValue, type Question } from '../src/index';

const base = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  formId: '550e8400-e29b-41d4-a716-446655440001',
  label: 'Question',
  required: false,
  position: 0,
  visibilityRule: null,
} as const;

const textQuestion: Question = { ...base, type: 'text', config: {} };
const singleChoice: Question = {
  ...base,
  type: 'multiple_choice',
  config: { options: ['A', 'B', 'C'], allowMultiple: false },
};
const multiChoice: Question = {
  ...base,
  type: 'multiple_choice',
  config: { options: ['A', 'B', 'C'], allowMultiple: true },
};
const fileQuestion: Question = { ...base, type: 'file', config: {} };

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440002';

describe('validateAnswerValue — text', () => {
  it('accepts a string', () => {
    expect(validateAnswerValue(textQuestion, 'hello')).toEqual({ ok: true, value: 'hello' });
  });

  it('accepts an empty string (required-ness is enforced elsewhere)', () => {
    expect(validateAnswerValue(textQuestion, '')).toEqual({ ok: true, value: '' });
  });

  it('rejects a non-string', () => {
    expect(validateAnswerValue(textQuestion, 42)).toMatchObject({ ok: false });
    expect(validateAnswerValue(textQuestion, ['a'])).toMatchObject({ ok: false });
  });
});

describe('validateAnswerValue — multiple choice', () => {
  it('accepts a known single option', () => {
    expect(validateAnswerValue(singleChoice, ['A'])).toEqual({ ok: true, value: ['A'] });
  });

  it('accepts multiple known options when allowMultiple', () => {
    expect(validateAnswerValue(multiChoice, ['A', 'C'])).toEqual({ ok: true, value: ['A', 'C'] });
  });

  it('rejects an unknown option', () => {
    const result = validateAnswerValue(singleChoice, ['Z']);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('Z');
  });

  it('rejects multiple selections on a single-select question', () => {
    expect(validateAnswerValue(singleChoice, ['A', 'B'])).toMatchObject({ ok: false });
  });

  it('rejects a non-array value', () => {
    expect(validateAnswerValue(singleChoice, 'A')).toMatchObject({ ok: false });
  });

  it('accepts an empty selection at the value level', () => {
    expect(validateAnswerValue(multiChoice, [])).toEqual({ ok: true, value: [] });
  });
});

describe('validateAnswerValue — file', () => {
  it('accepts a well-formed file reference', () => {
    expect(validateAnswerValue(fileQuestion, { fileId: VALID_UUID })).toEqual({
      ok: true,
      value: { fileId: VALID_UUID },
    });
  });

  it('rejects a missing fileId', () => {
    expect(validateAnswerValue(fileQuestion, {})).toMatchObject({ ok: false });
  });

  it('rejects a non-uuid fileId', () => {
    expect(validateAnswerValue(fileQuestion, { fileId: 'not-a-uuid' })).toMatchObject({ ok: false });
  });

  it('rejects a bare string', () => {
    expect(validateAnswerValue(fileQuestion, VALID_UUID)).toMatchObject({ ok: false });
  });
});
