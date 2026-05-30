export interface BcfComponent {
    ifcGuid: string;
    originatingSystem?: string;
    authoringToolId?: string;
}

export interface BcfCamera {
    viewPoint: [number, number, number];
    direction: [number, number, number];
    upVector: [number, number, number];
    fieldOfView?: number;
    platformData?: any;
}

export interface BcfViewpoint {
    guid: string;
    snapshotFile?: string;
    viewpointFile: string;
    components: BcfComponent[];
    camera?: BcfCamera;
}

export interface BcfComment {
    guid: string;
    date: string;
    author: string;
    comment: string;
    viewpointGuid?: string;
    modifiedDate?: string;
    modifiedAuthor?: string;
}

export interface BcfTopic {
    guid: string;
    title: string;
    description?: string;
    status: string;
    topicType?: string;
    priority?: string;
    assignedTo?: string;
    creationDate: string;
    creationAuthor: string;
    modifiedDate?: string;
    modifiedAuthor?: string;
    dueDate?: string;
    index?: number;
    comments: BcfComment[];
    viewpoints: BcfViewpoint[];
    snapshotDataUrl?: string;
}

export interface BcfProject {
    projectId?: string;
    name?: string;
}

export const BCF_STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed', 'ReOpened'] as const;
export const BCF_PRIORITIES = ['', 'Critical', 'Major', 'Normal', 'Minor'] as const;
export const BCF_TOPIC_TYPES = ['Comment', 'Issue', 'Request', 'Solution'] as const;
export const BCF_TOPIC_TYPE_LABELS: Record<string, string> = {
    Comment: 'Комментарий',
    Issue: 'Задача',
    Request: 'Требование',
    Solution: 'Решение',
};
