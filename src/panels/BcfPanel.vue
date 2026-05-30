<template>
  <div class="bcf-panel">

    <BcfToolbar
      v-if="fileStore.fileName"
      @open="openFile"
      @save="saveFile"
      @create="showCreateForm"
      @close="closeFile"
    />

    <BcfEmptyState v-if="!fileStore.fileName" @open="openFile" @create-new="createNewFile" />

    <div v-else class="bcf-workspace">

      <TopicList />

      <TopicCreateForm v-if="uiStore.createFormVisible" />

      <TopicDetail v-else-if="selectedTopic" :topic="selectedTopic" />

      <div v-else class="bcf-detail bcf-detail--empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <p>{{ $tr('Выберите замечание из списка') }}</p>
      </div>

    </div>

  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import BcfToolbar from '../components/BcfToolbar.vue';
import BcfEmptyState from '../components/BcfEmptyState.vue';
import TopicList from '../components/TopicList.vue';
import TopicCreateForm from '../components/TopicCreateForm.vue';
import TopicDetail from '../components/TopicDetail.vue';
import { fileStore, topicStore, uiStore } from '../store';
import * as bcfFileService from '../services/bcfFileService';
import type { BcfTopic } from '../bcf/types';


export default defineComponent({
    name: 'BcfPanel',
    components: { BcfToolbar, BcfEmptyState, TopicList, TopicCreateForm, TopicDetail },
    data() {
        return { fileStore, topicStore, uiStore };
    },
    computed: {
        selectedTopic(): BcfTopic | null {
            if (!topicStore.selectedTopicGuid) return null;
            return topicStore.topics.find(t => t.guid === topicStore.selectedTopicGuid) ?? null;
        },
    },
    methods: {
        async closeFile() { await bcfFileService.close(this.$ctx()); },
        createNewFile() { bcfFileService.createNew(); },
        async openFile() { await bcfFileService.open(this.$ctx()); },
        async saveFile() { await bcfFileService.save(this.$ctx()); },
        showCreateForm() {
            uiStore.newTopic = { title: '', description: '', status: 'Open', priority: '', assignedTo: '', topicType: '' };
            uiStore.newSnapshotBlob = null;
            uiStore.newSnapshotName = null;
            uiStore.capturedCamera = null;
            uiStore.capturedGuids = [];
            uiStore.capturedSmdxUuids = [];
            uiStore.createFormVisible = true;
        },
    },
});
</script>

<style>
/* ── Root ── */
.bcf-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  font-size: 13px;
  color: rgb(var(--v-theme-on-surface));
}

/* ── Toolbar ── */
.bcf-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  flex-shrink: 0;
  background: rgba(var(--v-theme-on-surface), 0.03);
}

.bcf-filename-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 5px;
  overflow: hidden;
  min-width: 0;
}

.bcf-filename-icon {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
  opacity: 0.4;
}

.bcf-filename {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.bcf-dirty-dot {
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ef4444;
  animation: bcf-pulse 1.8s ease-in-out infinite;
}

@keyframes bcf-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.35; }
}

.bcf-toolbar-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.bcf-tbtn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  background: transparent;
  color: inherit;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}
.bcf-tbtn:hover:not(:disabled) { background: rgba(var(--v-theme-on-surface), 0.07); }
.bcf-tbtn:disabled { opacity: 0.3; cursor: not-allowed; }
.bcf-tbtn--primary {
  border-color: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-primary));
}
.bcf-tbtn--primary:hover:not(:disabled) { background: rgba(var(--v-theme-primary), 0.1); }

.bcf-btn-icon {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
}

/* ── Empty state ── */
.bcf-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  flex: 1;
  text-align: center;
  padding: 24px;
}
.bcf-empty-icon { width: 44px; height: 44px; opacity: 0.25; }
.bcf-empty-icon svg { width: 100%; height: 100%; }
.bcf-empty p { margin: 0; font-size: 13px; color: rgba(var(--v-theme-on-surface), 0.5); }
.bcf-empty-actions { display: flex; flex-direction: column; align-items: center; gap: 8px; }

/* ── Workspace ── */
.bcf-workspace {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ── List pane ── */
.bcf-list-pane {
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  overflow: hidden;
}

.bcf-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 10px 4px;
  flex-shrink: 0;
}
.bcf-list-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(var(--v-theme-on-surface), 0.45);
}
.bcf-list-count {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.4);
  font-variant-numeric: tabular-nums;
}

/* ── Filter chips ── */
.bcf-filter-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px;
  padding: 0 8px 7px;
  flex-shrink: 0;
}

.bcf-chip {
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 500;
  border-radius: 20px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.55);
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  line-height: 1.6;
}
.bcf-chip:hover {
  color: rgba(var(--v-theme-on-surface), 0.85);
  background: rgba(var(--v-theme-on-surface), 0.05);
}
.bcf-chip--active {
  border-color: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.1);
}

/* ── Topic list ── */
.bcf-list {
  flex: 1;
  overflow-y: auto;
}

.bcf-list-empty {
  padding: 16px 12px;
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.4);
  font-style: italic;
  text-align: center;
}

.bcf-item {
  display: flex;
  align-items: stretch;
  cursor: pointer;
  border-bottom: 1px solid rgba(var(--v-border-color), calc(var(--v-border-opacity) * 0.5));
  transition: background 0.1s;
}
.bcf-item:hover { background: rgba(var(--v-theme-on-surface), 0.04); }
.bcf-item--selected { background: rgba(var(--v-theme-primary), 0.12); }
.bcf-item--selected:hover { background: rgba(var(--v-theme-primary), 0.17); }

/* ── Status strip ── */
.bcf-item-strip {
  width: 3px;
  flex-shrink: 0;
}
.bcf-strip--open     { background: #3b82f6; }
.bcf-strip--active   { background: #22c55e; }
.bcf-strip--progress { background: #f59e0b; }
.bcf-strip--resolved { background: #22c55e; }
.bcf-strip--closed   { background: rgba(var(--v-theme-on-surface), 0.2); }
.bcf-strip--reopened { background: #ef4444; }
.bcf-strip--default  { background: rgba(var(--v-theme-on-surface), 0.15); }

/* ── Thumbnail ── */
.bcf-item-thumb {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  margin: 8px 7px 8px 7px;
  border-radius: 4px;
  overflow: hidden;
}
.bcf-item-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.bcf-item-thumb-empty {
  width: 100%;
  height: 100%;
  background: rgba(var(--v-theme-on-surface), 0.06);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bcf-item-thumb-empty svg { width: 18px; height: 18px; opacity: 0.22; }
.bcf-item-thumb--clickable { cursor: zoom-in; }
.bcf-item-thumb--clickable:hover img { opacity: 0.8; }

/* ── Item body ── */
.bcf-item-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
  padding: 7px 10px 7px 0;
}
.bcf-item-title {
  font-size: 12px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
}
.bcf-item-meta {
  display: flex;
  align-items: center;
  gap: 5px;
}
.bcf-item-priority {
  font-size: 10px;
  color: rgba(var(--v-theme-on-surface), 0.45);
}
.bcf-item-assignee {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bcf-item-assignee svg { width: 10px; height: 10px; flex-shrink: 0; }

/* ── Status badges ── */
.bcf-badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  padding: 1px 5px;
  border-radius: 3px;
  white-space: nowrap;
}
.bcf-badge--open     { background: rgba(59,130,246,.18); }
.bcf-badge--active   { background: rgba(34,197,94,.18); }
.bcf-badge--progress { background: rgba(245,158,11,.18); }
.bcf-badge--resolved { background: rgba(34,197,94,.18); }
.bcf-badge--closed   { background: rgba(var(--v-theme-on-surface), 0.1); }
.bcf-badge--reopened { background: rgba(239,68,68,.18); }
.bcf-badge--default  { background: rgba(var(--v-theme-on-surface), 0.1); }

/* ── Count badge (comments) ── */
.bcf-count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 14px;
  padding: 0 4px;
  font-size: 10px;
  font-weight: 600;
  border-radius: 7px;
  background: rgba(var(--v-theme-on-surface), 0.1);
  margin-left: 5px;
  vertical-align: middle;
  font-variant-numeric: tabular-nums;
}

/* ── Detail panel ── */
.bcf-detail {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
.bcf-detail--empty {
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: rgba(var(--v-theme-on-surface), 0.3);
}
.bcf-detail--empty svg { width: 30px; height: 30px; }
.bcf-detail--empty p { margin: 0; font-size: 12px; font-style: italic; }

/* ── Detail header ── */
.bcf-detail-head {
  display: flex;
  align-items: stretch;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.bcf-detail-head--flat { align-items: center; padding: 0 10px 0 14px; min-height: 38px; }

.bcf-detail-head-strip {
  width: 4px;
  flex-shrink: 0;
}

.bcf-detail-head-content {
  flex: 1;
  padding: 10px 8px 10px 12px;
  overflow: hidden;
}

.bcf-detail-head-title {
  font-size: 13px;
  font-weight: 600;
  flex: 1;
}

.bcf-detail-title {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.35;
  word-break: break-word;
}
.bcf-detail-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}
.bcf-detail-date   { font-size: 11px; color: rgba(var(--v-theme-on-surface), 0.4); }
.bcf-detail-author { font-size: 11px; color: rgba(var(--v-theme-on-surface), 0.4); }

.bcf-detail-desc {
  margin: 0;
  padding: 10px 14px;
  font-size: 12px;
  line-height: 1.55;
  color: rgba(var(--v-theme-on-surface), 0.7);
  border-bottom: 1px solid rgba(var(--v-border-color), calc(var(--v-border-opacity) * 0.6));
}

/* ── Sections ── */
.bcf-section {
  padding: 10px 14px;
  border-bottom: 1px solid rgba(var(--v-border-color), calc(var(--v-border-opacity) * 0.6));
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.bcf-section--grow { flex: 1; border-bottom: none; }

.bcf-section-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: rgba(var(--v-theme-on-surface), 0.4);
  margin-bottom: 2px;
  display: flex;
  align-items: center;
}

/* ── Property rows ── */
.bcf-prop-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 28px;
}
.bcf-prop-row label {
  width: 100px;
  flex-shrink: 0;
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.55);
}

/* ── Inputs ── */
.bcf-select-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
}
.bcf-select-wrap::after {
  content: '';
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 11px;
  height: 11px;
  pointer-events: none;
  background-color: rgba(var(--v-theme-on-surface), 0.4);
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
}
.bcf-select,
.bcf-input {
  flex: 1;
  width: 100%;
  padding: 4px 7px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  font-size: 12px;
  background: rgba(var(--v-theme-on-surface), 0.04);
  color: inherit;
  min-width: 0;
  color-scheme: inherit;
  transition: border-color 0.15s, background 0.15s;
  box-sizing: border-box;
}
.bcf-select {
  appearance: none;
  -webkit-appearance: none;
  padding-right: 26px;
  cursor: pointer;
}
.bcf-select:focus,
.bcf-input:focus {
  outline: none;
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.05);
}
.bcf-select option {
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
}

/* ── Snapshot ── */
.bcf-snapshot {
  width: calc(100% - 28px);
  margin: 10px 14px;
  max-height: 150px;
  object-fit: contain;
  border-radius: 6px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  display: block;
}
.bcf-snapshot--clickable {
  cursor: zoom-in;
  transition: opacity 0.15s, border-color 0.15s;
}
.bcf-snapshot--clickable:hover {
  opacity: 0.85;
  border-color: rgb(var(--v-theme-primary));
}

/* ── Viewpoints ── */
.bcf-vp-list { display: flex; flex-direction: column; gap: 4px; }
.bcf-vp-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  padding: 5px 12px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  background: transparent;
  color: rgb(var(--v-theme-primary));
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
}
.bcf-vp-btn svg { width: 13px; height: 13px; flex-shrink: 0; }
.bcf-vp-btn:hover { background: rgba(var(--v-theme-primary), 0.1); }
.bcf-vp-btn--replace { color: rgba(var(--v-theme-on-surface), 0.5); }
.bcf-vp-btn--replace:hover { background: rgba(var(--v-theme-on-surface), 0.06); }
.bcf-vp-row { display: flex; align-items: center; gap: 6px; }

/* ── Comments ── */
.bcf-comment {
  background: rgba(var(--v-theme-on-surface), 0.03);
  border: 1px solid rgba(var(--v-border-color), calc(var(--v-border-opacity) * 0.6));
  border-radius: 5px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.bcf-comment-header {
  display: flex;
  align-items: center;
  gap: 6px;
}
.bcf-comment-author { font-size: 11px; font-weight: 600; }
.bcf-comment-time   { font-size: 10px; color: rgba(var(--v-theme-on-surface), 0.4); flex: 1; }
.bcf-comment-del    { opacity: 0; transition: opacity 0.15s !important; }
.bcf-comment:hover .bcf-comment-del { opacity: 0.4; }
.bcf-comment-del:hover { opacity: 1 !important; }

.bcf-comment-body  { font-size: 12px; line-height: 1.5; color: rgba(var(--v-theme-on-surface), 0.85); }
.bcf-comment-empty { font-size: 12px; color: rgba(var(--v-theme-on-surface), 0.35); font-style: italic; }

/* ── Add comment ── */
.bcf-add-comment { display: flex; flex-direction: column; gap: 6px; margin-top: 4px; }
.bcf-add-comment-footer { display: flex; justify-content: flex-end; }

/* ── Textarea ── */
.bcf-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 6px 8px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  font-size: 12px;
  resize: vertical;
  background: rgba(var(--v-theme-on-surface), 0.04);
  color: inherit;
  font-family: inherit;
  transition: border-color 0.15s, background 0.15s;
}
.bcf-textarea:focus {
  outline: none;
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.04);
}

/* ── Shared buttons ── */
.bcf-btn-primary {
  padding: 5px 14px;
  border: none;
  border-radius: 4px;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s;
}
.bcf-btn-primary:hover:not(:disabled) { opacity: 0.85; }
.bcf-btn-primary:disabled { opacity: 0.3; cursor: not-allowed; }
.bcf-btn-primary--green { background: #2e7d32; color: #fff; }

.bcf-outline-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  background: transparent;
  color: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  min-width: 0;
}
.bcf-outline-btn svg { width: 12px; height: 12px; flex-shrink: 0; }
.bcf-outline-btn span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bcf-outline-btn:hover { background: rgba(var(--v-theme-on-surface), 0.06); }
.bcf-outline-btn--captured {
  border-color: #22c55e;
  color: #22c55e;
}

/* ── Icon buttons ── */
.bcf-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  border-radius: 4px;
  opacity: 0.5;
  flex-shrink: 0;
  transition: opacity 0.15s, background 0.15s, color 0.15s;
}
.bcf-icon-btn svg { width: 14px; height: 14px; }
.bcf-icon-btn:hover { opacity: 1; background: rgba(var(--v-theme-on-surface), 0.08); }
.bcf-icon-btn--danger:hover { background: rgba(239,68,68,.15); color: #ef4444; opacity: 1; }
.bcf-icon-btn--sm { width: 22px; height: 22px; border-radius: 3px; }
.bcf-icon-btn--sm svg { width: 11px; height: 11px; }
.bcf-icon-btn--ghost { opacity: 0; }

/* ── Create form ── */
.bcf-create-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.bcf-field-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.bcf-field-group-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(var(--v-theme-on-surface), 0.4);
  padding-bottom: 5px;
  border-bottom: 1px solid rgba(var(--v-border-color), calc(var(--v-border-opacity) * 0.6));
}

.bcf-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.bcf-field--row {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}
.bcf-field--row .bcf-label { width: 85px; flex-shrink: 0; }
.bcf-field--row .bcf-outline-btn { flex: 1; justify-content: flex-start; }
.bcf-field--row .bcf-select-wrap,
.bcf-field--row .bcf-input { flex: 1; }

.bcf-label {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.55);
}
.bcf-required { color: rgb(var(--v-theme-primary)); }

.bcf-create-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  flex-shrink: 0;
}
</style>
