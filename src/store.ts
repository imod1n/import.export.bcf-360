import { reactive } from 'vue';
import JSZip from 'jszip';
import type { BcfTopic, BcfProject, BcfCamera } from './bcf/types';

export interface NewTopicForm {
    title: string;
    description: string;
    status: string;
    priority: string;
    assignedTo: string;
    topicType: string;
}

export interface StoreState {
    topics: BcfTopic[];
    selectedTopicGuid: string | null;
    project: BcfProject;
    version: string;
    fileName: string | null;
    zip: JSZip | null;
    isDirty: boolean;
    username: string;
    pendingAction: 'open' | 'create' | null;
    createFormVisible: boolean;
    newTopic: NewTopicForm;
    newSnapshotBlob: Blob | null;
    newSnapshotName: string | null;
    capturedCamera: BcfCamera | null;
    capturedGuids: string[];
}

export const store = reactive<StoreState>({
    topics: [],
    selectedTopicGuid: null,
    project: {},
    version: '2.1',
    fileName: null,
    zip: null,
    isDirty: false,
    username: '',
    pendingAction: null,
    createFormVisible: false,
    newTopic: { title: '', description: '', status: 'Open', priority: '', assignedTo: '', topicType: '' },
    newSnapshotBlob: null,
    newSnapshotName: null,
    capturedCamera: null,
    capturedGuids: [],
});

export function getSelectedTopic(): BcfTopic | undefined {
    if (!store.selectedTopicGuid) return undefined;
    return store.topics.find(t => t.guid === store.selectedTopicGuid);
}
