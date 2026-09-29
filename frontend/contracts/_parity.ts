/**
 * Parity checks — type-level, custo zero em runtime.
 *
 * Garante que cada schema zod (`z.infer`) espelha EXATAMENTE o type TS correspondente
 * (fonte de verdade em `src/contracts/<feature>/types.ts`). Se divergir, o typecheck falha.
 * OpenAPI é artefato DERIVADO; o contrato que manda é o TypeScript.
 */
export type IsEqual<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false

/**
 * Para tipos com intersection (ex.: `ProfileTeams = ProfileTabCommon & { color }`):
 * o check estrito não reconhece `A & B` como igual ao objeto flat do zod. Este é o
 * check de atribuibilidade mútua — equivalente para os shapes do contrato.
 */
export type IsMutuallyAssignable<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false

export type Expect<T extends true> = T
