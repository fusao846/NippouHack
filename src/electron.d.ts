export type Settings = {
    login_id: string;
    password?: string;
    url?: string;
    dev_tool?: boolean;
    project_sort_order: string[];
};

export type Project = {
    projectCode: string;
    projectName: string;
    processList: { processCode: string; processName: string }[];
};

export type Task = {
    projectCode: string;
    projectName: string;
    processCode: string;
    processName: string;
    hour: number | string;
};

type InitStats = { status: 'OK' | 'ERROR_NETWORK' | 'ERROR_LOGIN'; message?: string };

declare global {
    interface Window {
        api: {
            get: <T>(key: string) => Promise<T>;
            set: (key: string, value: unknown) => Promise<void>;
            onInitDates: (callback: (stats: InitStats, settings: Settings, dates: string[], projects: Project[]) => void) => void;
            submitWork: (param: Record<string, unknown>) => Promise<unknown>;
        };
    }
}

export { };
