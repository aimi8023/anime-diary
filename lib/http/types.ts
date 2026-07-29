export interface ApiErrorBody<TIssue = unknown> {
  error: string;
  code?: string;
  issues?: TIssue[];
  existingId?: string;
}
