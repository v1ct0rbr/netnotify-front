export type SimpleResponse<T> = {
    object: T;
    message: string;
    status: "SUCCESS" | "ERROR" | "WARNING" | "INFO";
}