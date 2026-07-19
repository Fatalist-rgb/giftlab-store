import { isPersonalized, withdrawalRightFor } from '../validate'

describe('personalization — per-line withdrawal right (FR-029, via @gl/constructor)', () => {
  it('a face photo makes the line personalized -> excluded', () => {
    const d = { face_layer: { uploaded_photo_id: 'up_1' }, photo_status: 'ready', text_values: [] }
    expect(withdrawalRightFor(d)).toBe('excluded')
    expect(isPersonalized(d)).toBe(true)
  })

  it('a non-empty name -> excluded', () => {
    const d = { face_layer: null, photo_status: 'ready', text_values: [{ value: 'Anna' }] }
    expect(withdrawalRightFor(d)).toBe('excluded')
  })

  it('a whitespace-only name is not personalization -> applies', () => {
    const d = { face_layer: null, photo_status: 'ready', text_values: [{ value: '   ' }] }
    expect(isPersonalized(d)).toBe(false)
    expect(withdrawalRightFor(d)).toBe('applies')
  })

  it('a standard-options-only line keeps the 14-day right -> applies', () => {
    const d = { face_layer: null, photo_status: 'ready', text_values: [] }
    expect(withdrawalRightFor(d)).toBe('applies')
  })

  it('a DEFERRED photo is a committed personalization -> excluded', () => {
    // the engine treats a deferred photo as made-to-order (this is the drift the shared
    // engine fixes vs. a naive "no photo id yet -> applies")
    const d = { face_layer: null, photo_status: 'deferred', text_values: [] }
    expect(withdrawalRightFor(d)).toBe('excluded')
  })
})
