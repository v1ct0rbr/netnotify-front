export type dashboardData = {
    totalMessages: number;
    totalMessagesByLevel: Record<string, number>;
    totalMessagesByType: Record<string, number>;
};