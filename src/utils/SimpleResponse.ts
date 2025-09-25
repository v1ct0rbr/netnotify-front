export type SimpleResponse<T> = {
    object: T;
    message: string;
    status: "success" | "error" | "warning" | "info";
}