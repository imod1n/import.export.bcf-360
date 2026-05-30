<template>
  <div class="bcf-detail">

    <div class="bcf-detail-head">
      <div class="bcf-detail-head-strip" :class="statusStripClass(topic.status)"></div>
      <div class="bcf-detail-head-content">
        <h3 class="bcf-detail-title">{{ topic.title }}</h3>
        <div class="bcf-detail-meta">
          <time class="bcf-detail-date">{{ formatDate(topic.creationDate) }}</time>
          <span v-if="topic.creationAuthor" class="bcf-detail-author">{{ topic.creationAuthor }}</span>
        </div>
      </div>
      <template v-if="isOwner">
        <button class="bcf-icon-btn" @click="onEditTopicFields" :title="$tr('Редактировать')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="bcf-icon-btn bcf-icon-btn--danger" @click="onDeleteTopic" :title="$tr('Удалить замечание')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </button>
      </template>
    </div>

    <img
      v-if="topic.snapshotDataUrl"
      :src="topic.snapshotDataUrl"
      class="bcf-snapshot bcf-snapshot--clickable"
      alt="snapshot"
      :title="$tr('Открыть снимок')"
      @click="onThumbClick(topic)"
    />

    <p v-if="topic.description" class="bcf-detail-desc">{{ topic.description }}</p>

    <!-- Properties -->
    <div class="bcf-section">
      <div class="bcf-section-label">{{ $tr('Свойства') }}</div>
      <div class="bcf-prop-row">
        <label>{{ $tr('Статус') }}</label>
        <div class="bcf-select-wrap">
          <select v-model="editStatus" @change="updateStatus" class="bcf-select">
            <option v-if="!statuses.includes(editStatus as any)" :value="editStatus">{{ statusLabel(editStatus) }}</option>
            <option v-for="s in statuses" :key="s" :value="s">{{ statusLabel(s) }}</option>
          </select>
        </div>
      </div>
      <div class="bcf-prop-row">
        <label>{{ $tr('Тип') }}</label>
        <div class="bcf-select-wrap">
          <select v-model="editTopicType" @change="updateTopicType" class="bcf-select" :disabled="!isOwner">
            <option value="">—</option>
            <option v-for="t in topicTypes" :key="t" :value="t">{{ topicTypeLabel(t) }}</option>
          </select>
        </div>
      </div>
      <div class="bcf-prop-row">
        <label>{{ $tr('Приоритет') }}</label>
        <div class="bcf-select-wrap">
          <select v-model="editPriority" @change="updatePriority" class="bcf-select" :disabled="!isOwner">
            <option value="">—</option>
            <option v-for="p in priorities" :key="p" :value="p">{{ p }}</option>
          </select>
        </div>
      </div>
      <div class="bcf-prop-row">
        <label>{{ $tr('Ответственный') }}</label>
        <input v-model="editAssignedTo" @change="updateAssignedTo" class="bcf-input" type="text" :disabled="!isOwner" />
      </div>
    </div>

    <!-- Viewpoints -->
    <div v-if="topic.viewpoints.some(vp => vp.camera) || isOwner" class="bcf-section">
      <div class="bcf-section-label">{{ $tr('Просмотр в модели') }}</div>
      <div class="bcf-vp-list">
        <template v-for="(vp, i) in topic.viewpoints.filter(v => v.camera)" :key="vp.guid">
          <div class="bcf-vp-row">
            <button class="bcf-vp-btn" @click="onNavigateViewpoint(vp)">
              <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                <polygon points="10,8 17,12 10,16"/>
              </svg>
              {{ $tr('Перейти к виду') }}{{ topic.viewpoints.filter(v => v.camera).length > 1 ? ` ${i + 1}` : '' }}
            </button>
            <button v-if="isOwner" class="bcf-vp-btn bcf-vp-btn--replace" @click="onReplaceViewpoint(vp)" :title="$tr('Заменить текущим видом камеры')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 4v6h6"/><path d="M23 20v-6h-6"/>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/>
              </svg>
              {{ $tr('Заменить вид') }}
            </button>
          </div>
        </template>
        <button v-if="isOwner && !topic.viewpoints.some(vp => vp.camera)" class="bcf-vp-btn" @click="onAddViewpoint">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="16"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
          {{ $tr('Добавить вид') }}
        </button>
      </div>
    </div>

    <!-- Comments -->
    <div class="bcf-section bcf-section--grow">
      <div class="bcf-section-label">
        {{ $tr('Комментарии') }}
        <span class="bcf-count-badge">{{ topic.comments.length }}</span>
      </div>

      <div v-for="c in topic.comments" :key="c.guid" class="bcf-comment">
        <div class="bcf-comment-header">
          <span class="bcf-comment-author">{{ c.author }}</span>
          <time class="bcf-comment-time">{{ formatDate(c.date) }}</time>
          <button
            v-if="isOwner || c.author === uiStore.username"
            class="bcf-icon-btn bcf-icon-btn--sm bcf-icon-btn--ghost bcf-comment-del"
            @click="onDeleteComment(c.guid)"
            :title="$tr('Удалить комментарий')"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="bcf-comment-body">{{ c.comment }}</div>
      </div>

      <div v-if="topic.comments.length === 0" class="bcf-comment-empty">
        {{ $tr('Нет комментариев') }}
      </div>

      <div class="bcf-add-comment">
        <textarea v-model="newComment" class="bcf-textarea" :placeholder="$tr('Введите комментарий...')" rows="2"></textarea>
        <div class="bcf-add-comment-footer">
          <button class="bcf-btn-primary" :disabled="!newComment.trim()" @click="onAddComment">
            {{ $tr('Добавить') }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, createApp } from 'vue';
import SnapshotEditor from './SnapshotEditor.vue';
import { fileStore, topicStore, uiStore } from '../store';
import * as bcfFileService from '../services/bcfFileService';
import { BCF_STATUSES, BCF_PRIORITIES, BCF_TOPIC_TYPES } from '../bcf/types';
import type { BcfViewpoint } from '../bcf/types';
import { statusStripClass, statusLabel as _statusLabel, topicTypeLabel, formatDate } from '../bcf/labels';
import { markDirty, deleteTopic, editTopicFields, addComment, deleteComment } from '../composables/useTopicActions';
import { navigateViewpoint, addViewpoint, replaceViewpoint } from '../composables/useViewpointActions';
import { useCtx } from '../composables/useCtx';
import type { BcfTopic } from '../bcf/types';

const props = defineProps<{ topic: BcfTopic }>();

const { ctx, tr } = useCtx();

const statuses = [...BCF_STATUSES];
const priorities = BCF_PRIORITIES.filter(p => p !== '') as string[];
const topicTypes = [...BCF_TOPIC_TYPES] as string[];

const statusLabel = (s: string) => _statusLabel(s, tr);

const editStatus = ref(props.topic.status);
const editPriority = ref(props.topic.priority ?? '');
const editAssignedTo = ref(props.topic.assignedTo ?? '');
const editTopicType = ref(props.topic.topicType ?? '');
const newComment = ref('');
const snapshotWindows: Record<string, any> = {};

const isOwner = computed(() => !!uiStore.username && props.topic.creationAuthor === uiStore.username);

watch(() => props.topic, (t) => {
    editStatus.value = t.status;
    editPriority.value = t.priority ?? '';
    editAssignedTo.value = t.assignedTo ?? '';
    editTopicType.value = t.topicType ?? '';
    newComment.value = '';
});

function updateStatus() {
    const prev = props.topic.status;
    const next = editStatus.value;
    if (prev === next) return;
    props.topic.status = next;
    addComment(props.topic, `Статус замечания изменён с "${statusLabel(prev)}" на "${statusLabel(next)}"`, ctx());
}
function updatePriority() { props.topic.priority = editPriority.value || undefined; markDirty(props.topic.guid); }
function updateTopicType() { props.topic.topicType = editTopicType.value || undefined; markDirty(props.topic.guid); }
function updateAssignedTo() { props.topic.assignedTo = editAssignedTo.value || undefined; markDirty(props.topic.guid); }

async function onDeleteTopic() { await deleteTopic(props.topic.guid, ctx()); }
async function onEditTopicFields() { await editTopicFields(props.topic, ctx()); }
async function onNavigateViewpoint(vp: BcfViewpoint) { await navigateViewpoint(vp, ctx()); }
async function onAddViewpoint() { await addViewpoint(props.topic, ctx()); }
async function onReplaceViewpoint(vp: BcfViewpoint) { await replaceViewpoint(vp, props.topic, ctx()); }
async function onDeleteComment(commentGuid: string) { await deleteComment(props.topic, commentGuid, ctx()); }
function onAddComment() {
    if (!newComment.value.trim()) return;
    addComment(props.topic, newComment.value.trim(), ctx());
    newComment.value = '';
}

function onThumbClick(topic: BcfTopic) {
    if (!topic.snapshotDataUrl) return;
    const existing = snapshotWindows[topic.guid];
    if (existing) { existing.close(); delete snapshotWindows[topic.guid]; return; }
    const isAuthor = !!uiStore.username && topic.creationAuthor === uiStore.username;
    openSnapshotWindow(topic.guid, topic.snapshotDataUrl, topic.title, !isAuthor);
}

function openSnapshotWindow(guid: string, dataUrl: string, title: string, readOnly = false) {
    const instance = ctx();
    const theme = document.querySelector('[class*="v-theme--"]')?.className.match(/v-theme--(\w+)/)?.[1] ?? 'light';
    const app = instance.app ?? instance.manager.activeApp ?? (instance.manager.apps.length ? instance.manager.apps[0] : null);

    if (!app) { openSnapshotDialog(guid, dataUrl, title, readOnly, theme); return; }

    const tag = `bcf-snap-${guid}`;
    let vueApp: ReturnType<typeof createApp> | null = null;

    const onSave = async (blob: Blob) => {
        const topic = topicStore.topics.find(t => t.guid === guid);
        const zip = bcfFileService.getZip();
        if (!topic || !zip) return;
        topic.snapshotDataUrl = await blobToDataUrl(blob);
        let vp = topic.viewpoints[0];
        if (!vp) { vp = { guid: crypto.randomUUID(), viewpointFile: 'viewpoint.bcfv', snapshotFile: 'snapshot.png', components: [] }; topic.viewpoints.push(vp); }
        if (!vp.snapshotFile) vp.snapshotFile = 'snapshot.png';
        zip.file(`${guid}/${vp.snapshotFile}`, blob);
        fileStore.isDirty = true;
        instance.showMessage(tr('Снимок обновлён'), 'info');
    };

    const win = (app as any).addDefinedWindow({
        tag, id: tag,
        title: title.length > 20 ? title.slice(0, 20).trimEnd() + '…' : title,
        icon: 'image', actions: [],
        mount: (el: HTMLElement) => {
            el.style.cssText = 'height:100%;overflow:hidden;';
            const onCancel = () => win.close();
            const showConfirm = async (): Promise<boolean> => {
                try { await instance.showMessage(tr('Есть несохранённые изменения в снимке. Закрыть без сохранения?'), 'question', { resolveTitle: tr('Закрыть'), rejectTitle: tr('Отмена') }); return true; }
                catch { return false; }
            };
            vueApp = createApp(SnapshotEditor, { dataUrl, guid, readOnly, theme, onSave, onCancel, showConfirm });
            instance.mountVue(el, vueApp);
        },
        unmount: () => { vueApp?.unmount(); vueApp = null; },
        close: async () => { delete snapshotWindows[guid]; },
    });
    snapshotWindows[guid] = win;
    (instance.manager as any).activeWindow = win;
}

async function openSnapshotDialog(guid: string, dataUrl: string, title: string, readOnly = false, theme = 'light') {
    const instance = ctx();
    let vueApp: ReturnType<typeof createApp> | null = null;
    let doSave: (() => Promise<void>) | null = null;

    const onSave = async (blob: Blob) => {
        const topic = topicStore.topics.find(t => t.guid === guid);
        const zip = bcfFileService.getZip();
        if (!topic || !zip) return;
        topic.snapshotDataUrl = await blobToDataUrl(blob);
        let vp = topic.viewpoints[0];
        if (!vp) { vp = { guid: crypto.randomUUID(), viewpointFile: 'viewpoint.bcfv', snapshotFile: 'snapshot.png', components: [] }; topic.viewpoints.push(vp); }
        if (!vp.snapshotFile) vp.snapshotFile = 'snapshot.png';
        zip.file(`${guid}/${vp.snapshotFile}`, blob);
        fileStore.isDirty = true;
        instance.showMessage(tr('Снимок обновлён'), 'info');
    };

    try {
        await (instance as any).showDefinedDialog({
            title: title.length > 20 ? title.slice(0, 20).trimEnd() + '…' : title,
            resolveTitle: tr('Сохранить'),
            mount: (el: HTMLElement) => {
                el.style.cssText = 'width:820px;height:600px;overflow:hidden;';
                vueApp = createApp(SnapshotEditor, { dataUrl, guid, readOnly, theme, onSave, onCancel: () => {}, showConfirm: async () => true, hideActions: true, registerSave: (fn: () => Promise<void>) => { doSave = fn; } });
                instance.mountVue(el, vueApp);
            },
        });
        if (doSave) await doSave();
    } catch { /* user cancelled */ } finally {
        vueApp?.unmount();
    }
}

function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}
</script>
