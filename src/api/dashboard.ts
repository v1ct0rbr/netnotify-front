import api from "../config/axios";

type countbyItem = {
    name: string;
    count: number;
};

export type dashboardData = {
    totalMessages: number;
    totalMessagesByLevel: countbyItem[]
    totalMessagesByType: countbyItem[]
};

export async function fetchDashboardData(): Promise<dashboardData> {
    try {
        const response = api.get<dashboardData>('/dashboard/summary');
        return (await response).data;
    } catch (error) {
        throw new Error("Failed to fetch dashboard data");
    }
}