import { reactive } from 'vue';
import JSZip from 'jszip';
import type { BcfTopic, BcfProject } from './bcf/types';

export interface StoreState {
    topics: BcfTopic[];
    selectedTopicGuid: string | null;
    project: BcfProject;
    version: string;
    fileName: string | null;
    zip: JSZip | null;
    isDirty: boolean;
    username: string;
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
});

export function getSelectedTopic(): BcfTopic | undefined {
    if (!store.selectedTopicGuid) return undefined;
    return store.topics.find(t => t.guid === store.selectedTopicGuid);
}
