/**
 * State selectors entry — re-exports the index barrel plus intent-registry
 * discovery helpers intentionally omitted from `selectors/index` (no instance denormalization).
 */
export * from "./selectors/index"
export { getInstancesWithIntentListener } from "./selectors/intent"
