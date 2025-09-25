export type ApiResponse<T> = {
    object: T;
    status?: "success" | "error" | "warning" | "info";
    message?: string;
}
    