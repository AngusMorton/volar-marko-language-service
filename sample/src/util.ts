import type { Input } from "./components/my-let.marko"

export function isFruit(value: string): Input {
    if (value === "apple" || value === "banana") {
        return {test: true};
    }
    return false;
}