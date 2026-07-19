import { isPersonalized, withdrawalRightFor } from '../validate'

describe('personalization — per-line withdrawal right (FR-029)', () => {
  it('a face photo makes the line personalized -> excluded', () => {
    const d = { face_layer: { uploaded_photo_id: 'up_1' }, text_values: [] }
    expect(isPersonalized(d)).toBe(true)
    expect(withdrawalRightFor(d)).toBe('excluded')
  })

  it('a non-empty text value makes the line personalized -> excluded', () => {
    const d = { face_layer: null, text_values: [{ value: 'Anna' }] }
    expect(withdrawalRightFor(d)).toBe('excluded')
  })

  it('whitespace-only text does not count as personalization', () => {
    const d = { face_layer: null, text_values: [{ value: '   ' }] }
    expect(isPersonalized(d)).toBe(false)
    expect(withdrawalRightFor(d)).toBe('applies')
  })

  it('a standard-options-only line keeps the 14-day right -> applies', () => {
    const d = { face_layer: null, text_values: [] }
    expect(withdrawalRightFor(d)).toBe('applies')
  })

  it('a deferred photo (no id yet) with no text stays -> applies', () => {
    const d = { face_layer: { uploaded_photo_id: null }, text_values: [] }
    expect(withdrawalRightFor(d)).toBe('applies')
  })
})
