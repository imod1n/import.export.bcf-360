import { reactive } from 'vue';
import type { BcfTopic, BcfProject, BcfCamera } from './bcf/types';

export interface NewTopicForm {
    title: string;
    description: string;
    status: string;
    priority: string;
    assignedTo: string;
    topicType: string;
}

export const fileStore = reactive({
    fileName: null as string | null,
    isDirty: false,
    version: '2.1',
});

export const topicStore = reactive({
    topics: [] as BcfTopic[],
    selectedTopicGuid: null as string | null,
    project: {} as BcfProject,
});

export function getSelectedTopic(): BcfTopic | undefined {
    if (!topicStore.selectedTopicGuid) return undefined;
    return topicStore.topics.find(t => t.guid === topicStore.selectedTopicGuid);
}

export const uiStore = reactive({
    username: '',
    createFormVisible: false,
    newTopic: {
        title: '',
        description: '',
        status: 'Open',
        priority: '',
        assignedTo: '',
        topicType: '',
    } as NewTopicForm,
    newSnapshotBlob: null as Blob | null,
    newSnapshotName: null as string | null,
    capturedCamera: null as BcfCamera | null,
    capturedGuids: [] as string[],
    capturedSmdxUuids: [] as string[],
});
