import { IntentFunction } from "../types";

export function createFunction<TParams = any, TReturn = any>(
  definition: Omit<IntentFunction<TParams, TReturn>, "id"> & { id?: string }
): IntentFunction<TParams, TReturn> {
  return {
    id: definition.id || definition.name,
    ...definition,
  };
}
