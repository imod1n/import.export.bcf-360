<template>
  <div class="bcf-panel">

    <!-- Toolbar -->
    <div v-if="store.zip" class="bcf-toolbar">
      <div class="bcf-filename-wrap">
        <svg class="bcf-filename-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
        <span class="bcf-filename" :title="store.fileName ?? ''">
          {{ store.fileName ?? $tr('Файл не открыт') }}
        </span>
        <span v-if="store.isDirty" class="bcf-dirty-dot" :title="$tr('Есть несохранённые изменения')"></span>
      </div>
      <div class="bcf-toolbar-actions">
        <button v-if="!store.zip" class="bcf-tbtn" @click="createNewFile" :title="$tr('Создать новый файл замечаний')">
          <svg class="bcf-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="18" x2="12" y2="12"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
          {{ $tr('Новый') }}
        </button>
        <button class="bcf-tbtn" @click="openFile" :title="$tr('Открыть BCF-файл')">
          <svg class="bcf-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          {{ $tr('Открыть') }}
        </button>
        <button class="bcf-tbtn" @click="saveFile" :disabled="!store.isDirty || !store.zip" :title="$tr('Сохранить')">
          <svg class="bcf-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          {{ $tr('Сохранить') }}
        </button>
        <button class="bcf-tbtn bcf-tbtn--primary" @click="showCreateForm" :disabled="!store.zip" :title="$tr('Создать замечание')">
          <svg class="bcf-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          {{ $tr('Создать') }}
        </button>
        <button class="bcf-icon-btn" @click="closeFile" :title="$tr('Закрыть файл')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="!store.zip" class="bcf-empty">
      <div class="bcf-empty-actions">
        <button class="bcf-btn-primary" @click="openFile">{{ $tr('Открыть BCF') }}</button>
        <button class="bcf-btn-primary bcf-btn-primary--green" @click="createNewFile">{{ $tr('Создать новый файл') }}</button>
      </div>
    </div>

    <!-- Main workspace -->
    <div v-else class="bcf-workspace">

      <!-- Left: topic list pane -->
      <div class="bcf-list-pane">

        <!-- List header -->
        <div class="bcf-list-header">
          <span class="bcf-list-title">{{ $tr('Замечания') }}</span>
          <span class="bcf-list-count">
            {{ filteredTopics.length }}<template v-if="filteredTopics.length !== store.topics.length"> / {{ store.topics.length }}</template>
          </span>
        </div>

        <!-- Filter chips -->
        <div class="bcf-filter-row">
          <button
            v-for="chip in filterChips"
            :key="chip.value"
            class="bcf-chip"
            :class="{ 'bcf-chip--active': statusFilter === chip.value }"
            @click="statusFilter = chip.value"
          >{{ chip.label }}</button>
        </div>

        <!-- Topic list -->
        <div class="bcf-list">
          <div v-if="filteredTopics.length === 0" class="bcf-list-empty">
            {{ store.topics.length === 0 ? $tr('Замечания отсутствуют') : $tr('Нет замечаний с таким статусом') }}
          </div>
          <div
            v-for="topic in filteredTopics"
            :key="topic.guid"
            class="bcf-item"
            :class="{ 'bcf-item--selected': store.selectedTopicGuid === topic.guid }"
            @click="selectTopic(topic.guid)"
          >
            <div class="bcf-item-strip" :class="statusStripClass(topic.status)"></div>
            <div
              class="bcf-item-thumb"
              :class="{ 'bcf-item-thumb--clickable': !!topic.snapshotDataUrl }"
              @click.stop="onThumbClick(topic)"
            >
              <img v-if="topic.snapshotDataUrl" :src="topic.snapshotDataUrl" alt="" />
              <div v-else class="bcf-item-thumb-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </div>
            </div>
            <div class="bcf-item-body">
              <div class="bcf-item-title">{{ topic.title }}</div>
              <div class="bcf-item-meta">
                <span class="bcf-badge" :class="statusClass(topic.status)">{{ statusLabel(topic.status) }}</span>
                <span v-if="topic.priority" class="bcf-item-priority">{{ topic.priority }}</span>
              </div>
              <div v-if="topic.assignedTo" class="bcf-item-assignee">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                {{ topic.assignedTo }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: create form -->
      <div v-if="store.createFormVisible" class="bcf-detail bcf-create">

        <div class="bcf-detail-head bcf-detail-head--flat">
          <span class="bcf-detail-head-title">{{ $tr('Новое замечание') }}</span>
          <button class="bcf-icon-btn" @click="store.createFormVisible = false" :title="$tr('Закрыть')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="bcf-create-body">

          <!-- Group: Основное -->
          <div class="bcf-field-group">
            <div class="bcf-field">
              <label class="bcf-label">{{ $tr('Заголовок') }} <span class="bcf-required">*</span></label>
              <input v-model="store.newTopic.title" class="bcf-input" type="text" autofocus :placeholder="$tr('Краткое описание замечания')" />
            </div>
            <div class="bcf-field">
              <label class="bcf-label">{{ $tr('Описание') }}</label>
              <textarea v-model="store.newTopic.description" class="bcf-textarea" rows="3" :placeholder="$tr('Подробное описание...')"></textarea>
            </div>
          </div>

          <!-- Group: Свойства -->
          <div class="bcf-field-group">
            <div class="bcf-field-group-label">{{ $tr('Свойства') }}</div>
            <div class="bcf-field bcf-field--row">
              <label class="bcf-label">{{ $tr('Статус') }}</label>
              <div class="bcf-select-wrap">
                <select v-model="store.newTopic.status" class="bcf-select">
                  <option v-for="s in statuses" :key="s" :value="s">{{ statusLabel(s) }}</option>
                </select>
              </div>
            </div>
            <div class="bcf-field bcf-field--row">
              <label class="bcf-label">{{ $tr('Тип') }}</label>
              <div class="bcf-select-wrap">
                <select v-model="store.newTopic.topicType" class="bcf-select">
                  <option value="">—</option>
                  <option v-for="t in topicTypes" :key="t" :value="t">{{ topicTypeLabel(t) }}</option>
                </select>
              </div>
            </div>
            <div class="bcf-field bcf-field--row">
              <label class="bcf-label">{{ $tr('Приоритет') }}</label>
              <div class="bcf-select-wrap">
                <select v-model="store.newTopic.priority" class="bcf-select">
                  <option value="">—</option>
                  <option v-for="p in priorities" :key="p" :value="p">{{ p }}</option>
                </select>
              </div>
            </div>
            <div class="bcf-field bcf-field--row">
              <label class="bcf-label">{{ $tr('Ответственный') }}</label>
              <input v-model="store.newTopic.assignedTo" class="bcf-input" type="text" />
            </div>
          </div>

          <!-- Group: Данные вида -->
          <div class="bcf-field-group">
            <div class="bcf-field-group-label">{{ $tr('Данные вида') }}</div>
            <div class="bcf-field bcf-field--row">
              <label class="bcf-label">{{ $tr('Камера') }}</label>
              <button class="bcf-outline-btn" :class="{ 'bcf-outline-btn--captured': !!store.capturedCamera }" @click="captureViewpoint" :title="$tr('Захватить текущую позицию камеры и снимок вида')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <span>{{ store.capturedCamera ? $tr('Захвачено') + ' ✓' : $tr('Захватить вид') }}</span>
              </button>
            </div>
          </div>

        </div>

        <div class="bcf-create-foot">
          <button class="bcf-outline-btn" @click="store.createFormVisible = false">{{ $tr('Отмена') }}</button>
          <button class="bcf-btn-primary" :disabled="!store.newTopic.title.trim()" @click="createTopic">
            {{ $tr('Создать') }}
          </button>
        </div>

      </div>

      <!-- Right: detail -->
      <div class="bcf-detail" v-else-if="selectedTopic">

        <!-- Header with status strip -->
        <div class="bcf-detail-head">
          <div class="bcf-detail-head-strip" :class="statusStripClass(selectedTopic.status)"></div>
          <div class="bcf-detail-head-content">
            <h3 class="bcf-detail-title">{{ selectedTopic.title }}</h3>
            <div class="bcf-detail-meta">
              <time class="bcf-detail-date">{{ formatDate(selectedTopic.creationDate) }}</time>
              <span v-if="selectedTopic.creationAuthor" class="bcf-detail-author">{{ selectedTopic.creationAuthor }}</span>
            </div>
          </div>
          <template v-if="isOwner">
            <button class="bcf-icon-btn" @click="editTopicFields" :title="$tr('Редактировать')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="bcf-icon-btn bcf-icon-btn--danger" @click="deleteTopic(selectedTopic.guid)" :title="$tr('Удалить замечание')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          </template>
        </div>

        <!-- Snapshot — первым делом после заголовка -->
        <img
          v-if="selectedTopic.snapshotDataUrl"
          :src="selectedTopic.snapshotDataUrl"
          class="bcf-snapshot bcf-snapshot--clickable"
          alt="snapshot"
          :title="$tr('Открыть снимок')"
          @click="onThumbClick(selectedTopic)"
        />

        <p v-if="selectedTopic.description" class="bcf-detail-desc">{{ selectedTopic.description }}</p>

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
        <div v-if="selectedTopic.viewpoints.some(vp => vp.camera) || isOwner" class="bcf-section">
          <div class="bcf-section-label">{{ $tr('Просмотр в модели') }}</div>
          <div class="bcf-vp-list">
            <template v-for="(vp, i) in selectedTopic.viewpoints.filter(v => v.camera)" :key="vp.guid">
              <div class="bcf-vp-row">
                <button class="bcf-vp-btn" @click="navigateViewpoint(vp)">
                  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
                    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                    <polygon points="10,8 17,12 10,16"/>
                  </svg>
                  {{ $tr('Перейти к виду') }}{{ selectedTopic.viewpoints.filter(v => v.camera).length > 1 ? ` ${i + 1}` : '' }}
                </button>
                <button v-if="isOwner" class="bcf-vp-btn bcf-vp-btn--replace" @click="replaceViewpoint(vp)" :title="$tr('Заменить текущим видом камеры')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 4v6h6"/><path d="M23 20v-6h-6"/>
                    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/>
                  </svg>
                  {{ $tr('Заменить вид') }}
                </button>
              </div>
            </template>
            <button v-if="isOwner && !selectedTopic.viewpoints.some(vp => vp.camera)" class="bcf-vp-btn" @click="addViewpoint">
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
            <span class="bcf-count-badge">{{ selectedTopic.comments.length }}</span>
          </div>

          <div v-for="c in selectedTopic.comments" :key="c.guid" class="bcf-comment">
            <div class="bcf-comment-header">
              <span class="bcf-comment-author">{{ c.author }}</span>
              <time class="bcf-comment-time">{{ formatDate(c.date) }}</time>
              <button v-if="isOwner || c.author === store.username" class="bcf-icon-btn bcf-icon-btn--sm bcf-icon-btn--ghost bcf-comment-del" @click="deleteComment(c.guid)" :title="$tr('Удалить комментарий')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div class="bcf-comment-body">{{ c.comment }}</div>
          </div>

          <div v-if="selectedTopic.comments.length === 0" class="bcf-comment-empty">
            {{ $tr('Нет комментариев') }}
          </div>

          <div class="bcf-add-comment">
            <textarea
              v-model="newComment"
              class="bcf-textarea"
              :placeholder="$tr('Введите комментарий...')"
              rows="2"
            ></textarea>
            <div class="bcf-add-comment-footer">
              <button class="bcf-btn-primary" :disabled="!newComment.trim()" @click="addComment">
                {{ $tr('Добавить') }}
              </button>
            </div>
          </div>
        </div>

      </div>

      <!-- Right: empty hint -->
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
import { defineComponent, createApp } from 'vue';
import JSZip from 'jszip';
import SnapshotEditor from '../components/SnapshotEditor.vue';
import { toBlob as domToBlob } from 'html-to-image';
import { store } from '../store';
import { parseBcfFile } from '../bcf/parser';
import { serializeBcf, createNewTopicFolder, buildViewpointFromCamera } from '../bcf/writer';
import { BCF_STATUSES, BCF_PRIORITIES, BCF_TOPIC_TYPES, BCF_TOPIC_TYPE_LABELS } from '../bcf/types';
import type { BcfViewpoint } from '../bcf/types';

export default defineComponent({
    name: 'BcfPanel',
    data() {
        return {
            store,
            statuses: [...BCF_STATUSES],
            priorities: BCF_PRIORITIES.filter(p => p !== '') as string[],
            topicTypes: [...BCF_TOPIC_TYPES] as string[],

            statusFilter: '' as string,

            editStatus: '',
            editPriority: '',
            editAssignedTo: '',
            editTopicType: '',
            newComment: '',

            snapshotWindows: {} as Record<string, any>,
        };
    },
    computed: {
        selectedTopic() {
            if (!store.selectedTopicGuid) return null;
            return store.topics.find(t => t.guid === store.selectedTopicGuid) ?? null;
        },
        filteredTopics() {
            if (!this.statusFilter) return store.topics;
            return store.topics.filter(t => t.status === this.statusFilter);
        },
        filterChips() {
            return [
                { value: '',             label: this.$tr('Все') },
                { value: 'Open',         label: this.$tr('Открыто') },
                { value: 'In Progress',  label: this.$tr('В работе') },
                { value: 'Resolved',     label: this.$tr('Решено') },
                { value: 'ReOpened',     label: this.$tr('Повторное') },
                { value: 'Closed',       label: this.$tr('Закрыто') },
            ];
        },
        isOwner(): boolean {
            const t = this.selectedTopic;
            if (!t) return false;
            const u = store.username;
            return !!u && t.creationAuthor === u;
        },
    },
    async mounted() {
        const action = store.pendingAction;
        if (action) {
            store.pendingAction = null;
            if (action === 'create') this.createNewFile();
            else if (action === 'open') await this.openFile();
        }
    },
    watch: {
        'store.selectedTopicGuid'(guid: string | null) {
            const topic = guid ? store.topics.find(t => t.guid === guid) : null;
            this.editStatus = topic?.status ?? 'Open';
            this.editPriority = topic?.priority ?? '';
            this.editAssignedTo = topic?.assignedTo ?? '';
            this.editTopicType = topic?.topicType ?? '';
            this.newComment = '';
        },
        async 'store.pendingAction'(action: string | null) {
            if (!action) return;
            store.pendingAction = null;
            if (action === 'create') this.createNewFile();
            else if (action === 'open') await this.openFile();
        },
    },
    methods: {
        async closeFile() {
            const isEmptyNew = store.isDirty && store.topics.length === 0 && store.fileName === 'новый_файл.bcf';
            if (store.isDirty && !isEmptyNew) {
                const ctx = this.$ctx();
                let wantSave: boolean;
                try {
                    await ctx.showMessage(
                        this.$tr('Есть несохранённые изменения. Сохранить файл перед закрытием?'),
                        'question',
                        { resolveTitle: this.$tr('Сохранить'), rejectTitle: this.$tr('Закрыть без сохранения') },
                    );
                    wantSave = true;
                } catch {
                    wantSave = false;
                }
                if (wantSave) {
                    const saved = await this.saveFile();
                    if (!saved) return; // пользователь отменил диалог сохранения
                }
            }
            store.zip = null;
            store.topics = [];
            store.project = {};
            store.version = '2.1';
            store.fileName = null;
            store.isDirty = false;
            store.selectedTopicGuid = null;
        },

        createNewFile() {
            const zip = new JSZip();
            zip.file('bcf.version', `<?xml version="1.0" encoding="utf-8"?>\n<Version VersionId="2.1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="version.xsd">\n  <DetailedVersion>2.1</DetailedVersion>\n</Version>`);
            const projectId = crypto.randomUUID();
            zip.file('project.bcfp', `<?xml version="1.0" encoding="utf-8"?>\n<ProjectExtension xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">\n  <Project ProjectId="${projectId}">\n    <Name></Name>\n  </Project>\n</ProjectExtension>`);
            store.zip = zip;
            store.topics = [];
            store.project = { projectId };
            store.version = '2.1';
            store.fileName = 'новый_файл.bcf';
            store.isDirty = true;
            store.selectedTopicGuid = null;
        },

        async openFile() {
            const ctx = this.$ctx();
            const isEmptyNew = store.isDirty && store.topics.length === 0 && store.fileName === 'новый_файл.bcf';
            if (store.isDirty && !isEmptyNew) {
                let wantSave: boolean;
                try {
                    await ctx.showMessage(
                        this.$tr('Есть несохранённые изменения. Сохранить файл перед открытием?'),
                        'question',
                        { resolveTitle: this.$tr('Сохранить'), rejectTitle: this.$tr('Открыть без сохранения') },
                    );
                    wantSave = true;
                } catch {
                    wantSave = false;
                }
                if (wantSave) {
                    const saved = await this.saveFile();
                    if (!saved) return;
                }
            }
            let ws;
            try {
                const opened = await ctx.openDialog({
                    buttonLabel: 'Открыть',
                    filters: [{ name: 'BCF', extensions: ['bcf', 'bcfzip'] }],
                });
                ws = Array.isArray(opened) ? opened[0] : opened;
            } catch {
                return;
            }
            if (!ws) return;
            const statusMsg = ctx.setStatusBarMessage(this.$tr('Загрузка BCF...'));
            try {
                const data = await ws.root.get();
                const parsed = await parseBcfFile(data, ws.root.title);
                store.topics = parsed.topics;
                store.project = parsed.project;
                store.version = parsed.version;
                store.fileName = parsed.fileName;
                store.zip = parsed.zip;
                store.isDirty = false;
                store.selectedTopicGuid = parsed.topics[0]?.guid ?? null;
            } catch (e) {
                ctx.showMessage(this.$tr('Ошибка загрузки: {0}', (e as Error).message), 'error');
            } finally {
                statusMsg.dispose();
            }
        },

        async saveFile(): Promise<boolean> {
            if (!store.zip || !store.fileName) return false;
            const ctx = this.$ctx();
            let ws;
            try {
                ws = await ctx.saveDialog({
                    suggestedName: store.fileName,
                    filters: [{ name: 'BCF', extensions: ['bcf'] }],
                    folder: false,
                });
            } catch {
                return false;
            }
            if (!ws) return false;
            const statusMsg = ctx.setStatusBarMessage(this.$tr('Сохранение BCF...'));
            try {
                const blob = await serializeBcf(store.zip, store.topics, store.project);
                const buf = await blob.arrayBuffer();
                await ws.root.put(new Uint8Array(buf));
                await ws.flush();
                store.isDirty = false;
                ctx.showMessage(this.$tr('Файл сохранён'), 'info');
                return true;
            } catch (e) {
                ctx.showMessage(this.$tr('Ошибка сохранения: {0}', (e as Error).message), 'error');
                return false;
            } finally {
                statusMsg.dispose();
            }
        },

        selectTopic(guid: string) {
            store.selectedTopicGuid = guid;
        },

        statusClass(status: string): string {
            const map: Record<string, string> = {
                'Open':        'bcf-badge--open',
                'Active':      'bcf-badge--active',
                'In Progress': 'bcf-badge--progress',
                'Resolved':    'bcf-badge--resolved',
                'Closed':      'bcf-badge--closed',
                'ReOpened':    'bcf-badge--reopened',
            };
            return map[status] ?? 'bcf-badge--default';
        },

        statusStripClass(status: string): string {
            const map: Record<string, string> = {
                'Open':        'bcf-strip--open',
                'Active':      'bcf-strip--active',
                'In Progress': 'bcf-strip--progress',
                'Resolved':    'bcf-strip--resolved',
                'Closed':      'bcf-strip--closed',
                'ReOpened':    'bcf-strip--reopened',
            };
            return map[status] ?? 'bcf-strip--default';
        },

        statusLabel(status: string): string {
            const map: Record<string, string> = {
                'Open':        this.$tr('Открыто'),
                'Active':      this.$tr('Активно'),
                'In Progress': this.$tr('В работе'),
                'Resolved':    this.$tr('Решено'),
                'Closed':      this.$tr('Закрыто'),
                'ReOpened':    this.$tr('Повторное'),
            };
            return map[status] ?? status;
        },

        topicTypeLabel(type: string): string {
            return BCF_TOPIC_TYPE_LABELS[type] ?? type;
        },

        formatDate(iso: string): string {
            try {
                return new Date(iso).toLocaleDateString('ru-RU');
            } catch {
                return iso;
            }
        },

        markDirty(topicGuid: string) {
            const topic = store.topics.find(t => t.guid === topicGuid);
            if (topic) topic.modifiedDate = new Date().toISOString();
            store.isDirty = true;
        },

        updateStatus() {
            const t = this.selectedTopic;
            if (!t) return;
            const prev = t.status;
            const next = this.editStatus;
            if (prev === next) return;
            t.status = next;
            const ctx = this.$ctx();
            const prevLabel = this.statusLabel(prev);
            const nextLabel = this.statusLabel(next);
            t.comments.push({
                guid: crypto.randomUUID(),
                date: new Date().toISOString(),
                author: store.username || (ctx.manager as any)?.username || 'Unknown',
                comment: `Статус замечания изменён с "${prevLabel}" на "${nextLabel}"`,
            });
            this.markDirty(t.guid);
        },

        updatePriority() {
            const t = this.selectedTopic;
            if (!t) return;
            t.priority = this.editPriority || undefined;
            this.markDirty(t.guid);
        },

        updateTopicType() {
            const t = this.selectedTopic;
            if (!t) return;
            t.topicType = this.editTopicType || undefined;
            this.markDirty(t.guid);
        },

        updateAssignedTo() {
            const t = this.selectedTopic;
            if (!t) return;
            t.assignedTo = this.editAssignedTo || undefined;
            this.markDirty(t.guid);
        },

        async deleteTopic(guid: string) {
            const ctx = this.$ctx();
            try {
                await ctx.showMessage(
                    this.$tr('Удалить замечание? Это действие необратимо.'),
                    'question',
                    { destructive: true, resolveTitle: this.$tr('Удалить'), rejectTitle: this.$tr('Отмена') }
                );
            } catch {
                return;
            }
            if (store.zip) {
                store.zip.remove(`${guid}/`);
            }
            store.topics = store.topics.filter(t => t.guid !== guid);
            if (store.selectedTopicGuid === guid) {
                store.selectedTopicGuid = store.topics[0]?.guid ?? null;
            }
            store.isDirty = true;
        },

        async deleteComment(commentGuid: string) {
            const ctx = this.$ctx();
            try {
                await ctx.showMessage(
                    this.$tr('Удалить комментарий?'),
                    'question',
                    { resolveTitle: this.$tr('Удалить'), rejectTitle: this.$tr('Отмена') }
                );
            } catch {
                return;
            }
            const t = this.selectedTopic;
            if (!t) return;
            t.comments = t.comments.filter(c => c.guid !== commentGuid);
            this.markDirty(t.guid);
        },

        addComment() {
            const t = this.selectedTopic;
            if (!t || !this.newComment.trim()) return;
            const ctx = this.$ctx();
            t.comments.push({
                guid: crypto.randomUUID(),
                date: new Date().toISOString(),
                author: store.username || (ctx.manager as any)?.username || 'Unknown',
                comment: this.newComment.trim(),
            });
            this.newComment = '';
            this.markDirty(t.guid);
        },

        async navigateViewpoint(vp: BcfViewpoint) {
            const ctx = this.$ctx();
            const cadview = ctx.cadview;

            if (!cadview) {
                ctx.showMessage(this.$tr('Нет активного вида'), 'warning');
                return;
            }

            const cadLayer = cadview.layer as any;

            try { cadLayer.clearSelected(); } catch { /* ignore */ }

            const guidSet = new Set(vp.components.map(c => c.ifcGuid));
            if (guidSet.size > 0) {
                let matchCount = 0;
                try {
                    cadLayer.selectObjects((obj: any) => {
                        const layer = obj?.layer ?? obj;
                        if (typeof layer?.typedValueExpanded !== 'function') return false;
                        try {
                            const id = layer.typedValueExpanded('ifc.id')?.$value;
                            if (id && guidSet.has(String(id))) { matchCount++; return true; }
                        } catch { /* ignore */ }
                        return false;
                    }, true);
                } catch { /* ignore */ }
                if (matchCount === 0) {
                    ctx.showMessage(this.$tr('IFC-компоненты не найдены в текущей модели'), 'warning');
                }
            }

            if (vp.camera) {
                if (vp.camera.platformData) {
                    const raw = JSON.parse(JSON.stringify(vp.camera.platformData));
                    cadview.restoreView(raw);
                } else {
                    const pos    = vp.camera.viewPoint as [number, number, number];
                    const dir    = vp.camera.direction as [number, number, number];
                    const up     = vp.camera.upVector  as [number, number, number];
                    const target: [number, number, number] = [pos[0] + dir[0], pos[1] + dir[1], pos[2] + dir[2]];
                    cadview.lookAt(pos, target, up, false);
                }
            }
        },

        showCreateForm() {
            store.newTopic = { title: '', description: '', status: 'Open', priority: '', assignedTo: '', topicType: '' };
            store.newSnapshotBlob = null;
            store.newSnapshotName = null;
            store.capturedCamera = null;
            store.capturedGuids = [];
            store.createFormVisible = true;
        },

        async captureViewSnapshot() {
            const blob = await this.tryCanvasCapture();
            if (blob) {
                store.newSnapshotBlob = blob;
                store.newSnapshotName = 'snapshot.png';
                return;
            }
            await this.pickSnapshot();
        },

        async tryCanvasCapture(): Promise<Blob | null> {
            const cadview = this.$ctx().cadview;

            // 1. Repaint + toDataURL synchronously — reads WebGL framebuffer before it's cleared.
            cadview?.repaint();
            const canvases = Array.from(document.querySelectorAll('canvas'));
            if (!canvases.length) return null;
            const glCanvas = canvases.reduce((a, b) =>
                a.width * a.height > b.width * b.height ? a : b
            );

            let webglDataUrl: string;
            try {
                webglDataUrl = glCanvas.toDataURL('image/png');
                if (webglDataUrl.length < 5000) return null;
            } catch { return null; }

            // 2. Find container holding annotation overlays as siblings of the canvas.
            let container: HTMLElement = glCanvas;
            for (let i = 0; i < 5; i++) {
                const p = container.parentElement;
                if (!p || p === document.body) break;
                container = p;
                if (Array.from(container.children).some(c => c.tagName !== 'CANVAS')) break;
            }

            const hasOverlays = Array.from(container.children).some(c => c.tagName !== 'CANVAS');
            if (!hasOverlays) {
                return fetch(webglDataUrl).then(r => r.blob()).catch(() => null);
            }

            // 3. Preload the captured WebGL frame.
            const webglImg = await new Promise<HTMLImageElement>((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = webglDataUrl;
            });

            // 4. html-to-image cannot read a WebGL canvas with preserveDrawingBuffer=false.
            //    Temporarily swap it with a plain 2D canvas containing the captured frame,
            //    let html-to-image render the composite, then restore the original.
            const parent = glCanvas.parentElement;
            if (!parent) return fetch(webglDataUrl).then(r => r.blob()).catch(() => null);

            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = glCanvas.width;
            tempCanvas.height = glCanvas.height;
            tempCanvas.className = glCanvas.className;
            tempCanvas.style.cssText = glCanvas.style.cssText;
            tempCanvas.getContext('2d')?.drawImage(webglImg, 0, 0);
            parent.replaceChild(tempCanvas, glCanvas);

            try {
                const blob = await domToBlob(container, { pixelRatio: 1 });
                return blob ?? null;
            } catch {
                return fetch(webglDataUrl).then(r => r.blob()).catch(() => null);
            } finally {
                parent.replaceChild(glCanvas, tempCanvas);
            }
        },

        async pickSnapshot() {
            const ctx = this.$ctx();
            let ws;
            try {
                const opened = await ctx.openDialog({
                    buttonLabel: 'Выбрать',
                    filters: [{ name: 'Изображения', extensions: ['png', 'jpg', 'jpeg'] }],
                });
                ws = Array.isArray(opened) ? opened[0] : opened;
            } catch {
                return;
            }
            if (!ws) return;
            const data = await ws.root.get();
            store.newSnapshotBlob = new Blob([data], { type: ws.root.mimeType || 'image/png' });
            store.newSnapshotName = ws.root.title;
        },

        async captureViewpoint() {
            const ctx = this.$ctx();
            const cadview = ctx.cadview;

            if (!cadview) {
                ctx.showMessage(this.$tr('Нет активного вида'), 'warning');
                return;
            }

            let stored: any;
            try {
                stored = cadview.storeView();
            } catch {
                ctx.showMessage(this.$tr('Не удалось захватить вид'), 'error');
                return;
            }

            // Deep copy immediately — preserves id + pivot, avoids platform buffer mutation
            const snap = JSON.parse(JSON.stringify(stored));
            const pos: [number, number, number] = [snap.position[0], snap.position[1], snap.position[2]];
            const dir: [number, number, number] = [snap.dir[0], snap.dir[1], snap.dir[2]];
            const up:  [number, number, number] = [snap.up[0],  snap.up[1],  snap.up[2]];

            store.capturedCamera = {
                viewPoint: pos,
                direction: dir,
                upVector:  up,
                fieldOfView: 60,
                platformData: snap,
            };

            const blob = await this.tryCanvasCapture();
            if (blob) {
                store.newSnapshotBlob = blob;
                store.newSnapshotName = 'snapshot.png';
            }

            // Automatically capture current IFC selection (silent — empty list is valid)
            const guids: string[] = [];
            const seen = new Set<string>();
            try {
                for (const obj of cadview.layer.selectedObjects()) {
                    const layer = (obj as any)?.layer ?? obj;
                    if (!layer || typeof layer.typedValueExpanded !== 'function') continue;
                    try {
                        const v = layer.typedValueExpanded('ifc.id')?.$value;
                        const id = v ? String(v) : undefined;
                        if (id && !seen.has(id)) { seen.add(id); guids.push(id); }
                    } catch { /* ignore */ }
                }
            } catch { /* ignore */ }
            store.capturedGuids = guids;

            ctx.showMessage(this.$tr('Вид захвачен'), 'info');
        },

        async replaceViewpoint(vp: BcfViewpoint) {
            const ctx = this.$ctx();
            const cadview = ctx.cadview;
            if (!cadview) {
                ctx.showMessage(this.$tr('Нет активного вида'), 'warning');
                return;
            }

            // Capture camera
            let stored: any;
            try {
                stored = cadview.storeView();
            } catch {
                ctx.showMessage(this.$tr('Не удалось захватить вид'), 'error');
                return;
            }
            const snap = JSON.parse(JSON.stringify(stored));

            // Capture current IFC selection (same logic as captureSelection)
            const newGuids: string[] = [];
            const seen = new Set<string>();
            const extractGuid = (layer: any): string | undefined => {
                if (!layer || typeof layer.typedValueExpanded !== 'function') return undefined;
                try {
                    const v = layer.typedValueExpanded('ifc.id')?.$value;
                    if (v) return String(v);
                } catch { /* ignore */ }
                return undefined;
            };
            try {
                for (const obj of cadview.layer.selectedObjects()) {
                    const layer = (obj as any)?.layer ?? obj;
                    const id = extractGuid(layer);
                    if (id && !seen.has(id)) { seen.add(id); newGuids.push(id); }
                }
            } catch { /* ignore */ }

            // Resolve components update via showQuickPick
            const existingGuids = new Set(vp.components.map(c => c.ifcGuid));
            const freshGuids = newGuids.filter(g => !existingGuids.has(g));
            let newComponents = vp.components;

            if (newGuids.length === 0) {
                // No selection — ask whether to clear or keep (only if there's something to keep)
                if (vp.components.length > 0) {
                    const choice = await ctx.showQuickPick(
                        [
                            { label: this.$tr('Оставить прежний список'), description: this.$tr('Элементов: {0}', vp.components.length) },
                            { label: this.$tr('Обнулить список элементов') },
                        ],
                        { title: this.$tr('Выделенные IFC-элементы'), placeHolder: this.$tr('Нет выделения в модели') },
                    );
                    if ((choice as any)?.label === this.$tr('Обнулить список элементов')) {
                        newComponents = [];
                    }
                }
            } else {
                // Selection is identical to existing components — nothing to ask
                const isIdentical = freshGuids.length === 0 && newGuids.length === vp.components.length;
                if (!isIdentical) {
                    // Has selection — ask replace / merge / keep
                    const items: { label: string; description?: string }[] = [
                        { label: this.$tr('Заменить на выделенные'), description: this.$tr('Элементов: {0}', newGuids.length) },
                    ];
                    if (freshGuids.length > 0) {
                        items.push({ label: this.$tr('Дополнить выделенными'), description: this.$tr('+{0} новых, итого: {1}', freshGuids.length, vp.components.length + freshGuids.length) });
                    }
                    items.push({ label: this.$tr('Оставить прежний список'), description: this.$tr('Элементов: {0}', vp.components.length) });

                    const choice = await ctx.showQuickPick(items, {
                        title: this.$tr('Выделенные IFC-элементы'),
                        placeHolder: this.$tr('Выделено в модели: {0}', newGuids.length),
                    });
                    const chosen = (choice as any)?.label;
                    if (chosen === this.$tr('Заменить на выделенные')) {
                        newComponents = newGuids.map(g => ({ ifcGuid: g }));
                    } else if (chosen === this.$tr('Дополнить выделенными')) {
                        newComponents = [
                            ...vp.components,
                            ...freshGuids.map(g => ({ ifcGuid: g })),
                        ];
                    }
                }
            }

            vp.camera = {
                viewPoint: [snap.position[0], snap.position[1], snap.position[2]],
                direction: [snap.dir[0], snap.dir[1], snap.dir[2]],
                upVector:  [snap.up[0],  snap.up[1],  snap.up[2]],
                fieldOfView: 60,
                platformData: snap,
            };
            vp.components = newComponents;

            const t = this.selectedTopic;

            const snapshotBlob = await this.tryCanvasCapture();
            if (snapshotBlob && t && store.zip) {
                if (!vp.snapshotFile) vp.snapshotFile = 'snapshot.png';
                store.zip.file(`${t.guid}/${vp.snapshotFile}`, snapshotBlob);
                t.snapshotDataUrl = await blobToDataUrl(snapshotBlob);
            }

            if (t) this.markDirty(t.guid);
            ctx.showMessage(this.$tr('Вид заменён'), 'info');
        },

        async editTopicFields() {
            const t = this.selectedTopic;
            if (!t) return;
            const ctx = this.$ctx();

            const hasSnapshot = !!t.snapshotDataUrl;
            const snapshotLabel = hasSnapshot
                ? this.$tr('Заменить изображение')
                : this.$tr('Добавить изображение');

            const choice = await ctx.showQuickPick(
                [
                    { label: this.$tr('Редактировать заголовок'), description: t.title },
                    { label: this.$tr('Редактировать описание'), description: t.description || '—' },
                    { label: snapshotLabel },
                ],
                { title: this.$tr('Редактирование замечания'), placeHolder: this.$tr('Выберите поле') },
            );

            const chosen = (choice as any)?.label;
            if (chosen === this.$tr('Редактировать заголовок')) {
                const val = await ctx.showInputBox({
                    title: this.$tr('Заголовок'),
                    value: t.title,
                    validateInput: (v: string) => v.trim() ? undefined : this.$tr('Заголовок не может быть пустым'),
                });
                if (val?.trim()) { t.title = val.trim(); this.markDirty(t.guid); }
            } else if (chosen === this.$tr('Редактировать описание')) {
                const val = await ctx.showInputBox({
                    title: this.$tr('Описание'),
                    value: t.description ?? '',
                    placeHolder: this.$tr('Подробное описание замечания'),
                });
                if (val !== undefined) { t.description = val.trim() || undefined; this.markDirty(t.guid); }
            } else if (chosen === snapshotLabel) {
                let ws;
                try {
                    const opened = await ctx.openDialog({
                        buttonLabel: this.$tr('Выбрать'),
                        filters: [{ name: 'Изображения', extensions: ['png', 'jpg', 'jpeg'] }],
                    });
                    ws = Array.isArray(opened) ? opened[0] : opened;
                } catch { return; }
                if (!ws) return;

                const data = await ws.root.get();
                const blob = new Blob([data], { type: ws.root.mimeType || 'image/png' });
                t.snapshotDataUrl = await blobToDataUrl(blob);

                // Ensure the first viewpoint has snapshotFile and write blob to ZIP
                if (store.zip) {
                    let vp = t.viewpoints[0];
                    if (!vp) {
                        vp = { guid: crypto.randomUUID(), viewpointFile: 'viewpoint.bcfv', snapshotFile: 'snapshot.png', components: [] };
                        t.viewpoints.push(vp);
                    }
                    if (!vp.snapshotFile) vp.snapshotFile = 'snapshot.png';
                    store.zip.file(`${t.guid}/${vp.snapshotFile}`, data);
                }

                this.markDirty(t.guid);
            }
        },

        async addViewpoint() {
            const ctx = this.$ctx();
            const cadview = ctx.cadview;
            if (!cadview) {
                ctx.showMessage(this.$tr('Нет активного вида'), 'warning');
                return;
            }
            const t = this.selectedTopic;
            if (!t) return;

            let stored: any;
            try {
                stored = cadview.storeView();
            } catch {
                ctx.showMessage(this.$tr('Не удалось захватить вид'), 'error');
                return;
            }
            const snap = JSON.parse(JSON.stringify(stored));

            const guids: string[] = [];
            const seen = new Set<string>();
            try {
                for (const obj of cadview.layer.selectedObjects()) {
                    const layer = (obj as any)?.layer ?? obj;
                    if (typeof layer?.typedValueExpanded !== 'function') continue;
                    try {
                        const v = layer.typedValueExpanded('ifc.id')?.$value;
                        if (v) { const s = String(v); if (!seen.has(s)) { seen.add(s); guids.push(s); } }
                    } catch { /* ignore */ }
                }
            } catch { /* ignore */ }

            const vpGuid = crypto.randomUUID();
            const viewpoint = buildViewpointFromCamera(
                vpGuid,
                [snap.position[0], snap.position[1], snap.position[2]],
                [snap.dir[0], snap.dir[1], snap.dir[2]],
                [snap.up[0], snap.up[1], snap.up[2]],
                guids,
                snap,
            );

            const snapshotBlob = await this.tryCanvasCapture();
            if (snapshotBlob && store.zip) {
                viewpoint.snapshotFile = 'snapshot.png';
                store.zip.file(`${t.guid}/snapshot.png`, snapshotBlob);
                t.snapshotDataUrl = await blobToDataUrl(snapshotBlob);
            }

            t.viewpoints.push(viewpoint);
            this.markDirty(t.guid);
            ctx.showMessage(this.$tr('Вид добавлен'), 'info');
        },

        captureSelection() {
            const ctx = this.$ctx();
            const cadview = ctx.cadview;

            if (!cadview) {
                ctx.showMessage(this.$tr('Нет активного чертежа'), 'warning');
                return;
            }

            const guids: string[] = [];
            const seen = new Set<string>();

            const extractFromLayer = (layer: any): string | undefined => {
                if (!layer || typeof layer.typedValueExpanded !== 'function') return undefined;
                try {
                    const prop = layer.typedValueExpanded('ifc.id');
                    const v = prop?.$value;
                    if (v) return String(v);
                } catch { /* ignore */ }
                return undefined;
            };

            try {
                for (const obj of cadview.layer.selectedObjects()) {
                    // selectedObjects() returns DwgEntity (e.g. DwgModel3d).
                    // IFC properties live on the entity's DwgLayer, not on the entity itself.
                    const layer = (obj as any)?.layer ?? obj;
                    const id = extractFromLayer(layer);
                    if (id && !seen.has(id)) {
                        seen.add(id);
                        guids.push(id);
                    }
                }
            } catch { /* ignore */ }

            store.capturedGuids = guids;
            ctx.showMessage(this.$tr('Захвачено IFC-объектов: {0}', guids.length), 'info');
        },

        onThumbClick(topic: typeof store.topics[0]) {
            if (!topic.snapshotDataUrl) return;
            const existing = this.snapshotWindows[topic.guid];
            if (existing) {
                existing.close();
                delete this.snapshotWindows[topic.guid];
            } else {
                const isAuthor = !!store.username && topic.creationAuthor === store.username;
                this.openSnapshotWindow(topic.guid, topic.snapshotDataUrl, topic.title, !isAuthor);
            }
        },

        openSnapshotWindow(guid: string, dataUrl: string, title: string, readOnly = false) {
            const theme = this.$el?.closest('[class*="v-theme--"]')
                ?.className.match(/v-theme--(\w+)/)?.[1] ?? 'light';
            const ctx = this.$ctx();
            const app = ctx.app ?? ctx.manager.activeApp ?? (ctx.manager.apps.length ? ctx.manager.apps[0] : null);

            if (!app) {
                this.openSnapshotDialog(guid, dataUrl, title, readOnly, theme);
                return;
            }

            const tag = `bcf-snap-${guid}`;
            let vueApp: ReturnType<typeof createApp> | null = null;

            const onSave = async (blob: Blob) => {
                const topic = store.topics.find(t => t.guid === guid);
                if (!topic || !store.zip) return;
                topic.snapshotDataUrl = await blobToDataUrl(blob);
                let vp = topic.viewpoints[0];
                if (!vp) {
                    vp = { guid: crypto.randomUUID(), viewpointFile: 'viewpoint.bcfv', snapshotFile: 'snapshot.png', components: [] };
                    topic.viewpoints.push(vp);
                }
                if (!vp.snapshotFile) vp.snapshotFile = 'snapshot.png';
                store.zip.file(`${guid}/${vp.snapshotFile}`, blob);
                store.isDirty = true;
                ctx.showMessage(this.$tr('Снимок обновлён'), 'info');
            };

            const win = (app as any).addDefinedWindow({
                tag,
                id: tag,
                title: title.length > 20 ? title.slice(0, 20).trimEnd() + '…' : title,
                icon: 'image',
                actions: [],
                mount: (el: HTMLElement) => {
                    el.style.cssText = 'height:100%;overflow:hidden;';
                    const onCancel = () => win.close();
                    const showConfirm = async (): Promise<boolean> => {
                        try {
                            await ctx.showMessage(
                                this.$tr('Есть несохранённые изменения в снимке. Закрыть без сохранения?'),
                                'question',
                                { resolveTitle: this.$tr('Закрыть'), rejectTitle: this.$tr('Отмена') },
                            );
                            return true;
                        } catch {
                            return false;
                        }
                    };
                    vueApp = createApp(SnapshotEditor, { dataUrl, guid, readOnly, theme, onSave, onCancel, showConfirm });
                    ctx.mountVue(el, vueApp);
                },
                unmount: () => {
                    vueApp?.unmount();
                    vueApp = null;
                },
                close: async () => { delete this.snapshotWindows[guid]; },
            });
            this.snapshotWindows[guid] = win;
            (ctx.manager as any).activeWindow = win;
        },

        async openSnapshotDialog(guid: string, dataUrl: string, title: string, readOnly = false, theme = 'light') {
            const ctx = this.$ctx();
            let vueApp: ReturnType<typeof createApp> | null = null;
            let doSave: (() => Promise<void>) | null = null;

            const onSave = async (blob: Blob) => {
                const topic = store.topics.find(t => t.guid === guid);
                if (!topic || !store.zip) return;
                topic.snapshotDataUrl = await blobToDataUrl(blob);
                let vp = topic.viewpoints[0];
                if (!vp) {
                    vp = { guid: crypto.randomUUID(), viewpointFile: 'viewpoint.bcfv', snapshotFile: 'snapshot.png', components: [] };
                    topic.viewpoints.push(vp);
                }
                if (!vp.snapshotFile) vp.snapshotFile = 'snapshot.png';
                store.zip.file(`${guid}/${vp.snapshotFile}`, blob);
                store.isDirty = true;
                ctx.showMessage(this.$tr('Снимок обновлён'), 'info');
            };

            try {
                await (ctx as any).showDefinedDialog({
                    title: title.length > 20 ? title.slice(0, 20).trimEnd() + '…' : title,
                    resolveTitle: this.$tr('Сохранить'),
                    mount: (el: HTMLElement) => {
                        el.style.cssText = 'width:820px;height:600px;overflow:hidden;';
                        vueApp = createApp(SnapshotEditor, {
                            dataUrl, guid, readOnly, theme, onSave,
                            onCancel: () => {},
                            showConfirm: async () => true,
                            hideActions: true,
                            registerSave: (fn: () => Promise<void>) => { doSave = fn; },
                        });
                        ctx.mountVue(el, vueApp);
                    },
                });
                // "Сохранить" нажато
                if (doSave) await doSave();
            } catch {
                // "Отмена" нажато → отбросить изменения
            } finally {
                vueApp?.unmount();
            }
        },

        async createTopic() {
            if (!store.newTopic.title.trim() || !store.zip) return;

            const ctx = this.$ctx();
            const guid = crypto.randomUUID();
            const now = new Date().toISOString();
            const author = store.username || (ctx.manager as any)?.username || 'Unknown';

            const vpGuid = crypto.randomUUID();
            const viewpoint = buildViewpointFromCamera(
                vpGuid,
                store.capturedCamera?.viewPoint ?? [0, 0, 0],
                store.capturedCamera?.direction ?? [0, 0, -1],
                store.capturedCamera?.upVector ?? [0, 1, 0],
                store.capturedGuids,
                store.capturedCamera?.platformData,
            );
            if (!store.capturedCamera) viewpoint.camera = undefined;
            if (store.newSnapshotBlob) viewpoint.snapshotFile = 'snapshot.png';

            const topic = {
                guid,
                title: store.newTopic.title.trim(),
                description: store.newTopic.description.trim() || undefined,
                status: store.newTopic.status,
                topicType: store.newTopic.topicType || undefined,
                priority: store.newTopic.priority || undefined,
                assignedTo: store.newTopic.assignedTo.trim() || undefined,
                creationDate: now,
                creationAuthor: author,
                comments: [],
                viewpoints: [viewpoint],
                snapshotDataUrl: store.newSnapshotBlob
                    ? await blobToDataUrl(store.newSnapshotBlob)
                    : undefined,
            };

            createNewTopicFolder(store.zip, topic, store.newSnapshotBlob ?? undefined);
            store.topics.push(topic);
            store.isDirty = true;
            store.selectedTopicGuid = guid;
            store.createFormVisible = false;
            ctx.showMessage(this.$tr('Замечание создано'), 'info');
        },
    },
});

async function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}
</script>

<style scoped>
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
  /* text color inherits from panel (theme-aware) */
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
