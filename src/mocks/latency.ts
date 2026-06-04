/** Simulate realistic network latency so the demo feels like a real app. */
export function randomLatency(min = 120, max = 380): Promise<void> {
  const ms = Math.floor(min + Math.random() * (max - min));
  return new Promise((resolve) => setTimeout(resolve, ms));
}
