/** Base error for anything the constructor engine rejects. */
export class ConstructorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/**
 * A published schema whose DEFAULT selection would cost more than the base price.
 * Under Polish consumer law a pre-selected paid option is refundable on demand, so
 * this is a hard rule enforced at schema publication — never editorial discipline.
 */
export class FreeDefaultViolation extends ConstructorError {
  constructor(public readonly totalDelta: number) {
    super(`default selection carries a non-zero price delta (${totalDelta})`);
  }
}

/** A DesignState that references something the schema does not allow. */
export class DesignStateInvalid extends ConstructorError {}
