export type Semester = { id: number; name: string };
export type Subject = Semester & { semester_id: number };
export type Unit = Semester & { subject_id: number };
export type Topic = Semester & { unit_id: number; completed: boolean };
export type Workspace = { semesters: Semester[]; subjects: Subject[]; units: Unit[]; topics: Topic[] };
export type Resource = keyof Workspace;

export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const multipart = body instanceof FormData;
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? ''}/api${path}`, {
    method, headers: body && !multipart ? { 'Content-Type': 'application/json' } : undefined,
    body: multipart ? body : body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(path === '/ai/ask' ? 1800000 : multipart ? 120000 : 10000),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(typeof error.detail === 'string' ? error.detail : response.status === 422 ? 'Check the required fields and supported input limits.' : 'Request failed. Please try again.');
  }
  return response.status === 204 ? undefined as T : response.json();
}
