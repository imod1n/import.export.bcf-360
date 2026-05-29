<template>
  <div class="bcf-panel">

    <!-- Toolbar -->
    <div class="bcf-toolbar">
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
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="!store.zip" class="bcf-empty">
      <div class="bcf-empty-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <line x1="10" y1="9" x2="8" y2="9"/>
        </svg>
      </div>
      <p>{{ $tr('Откройте BCF-файл для просмотра замечаний') }}</p>
      <button class="bcf-btn-primary" @click="openFile">{{ $tr('Открыть BCF') }}</button>
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
      <div v-if="createFormVisible" class="bcf-detail bcf-create">

        <div class="bcf-detail-head bcf-detail-head--flat">
          <span class="bcf-detail-head-title">{{ $tr('Новое замечание') }}</span>
          <button class="bcf-icon-btn" @click="createFormVisible = false" :title="$tr('Закрыть')">
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
              <input v-model="newTopic.title" class="bcf-input" type="text" autofocus :placeholder="$tr('Краткое описание замечания')" />
            </div>
            <div class="bcf-field">
              <label class="bcf-label">{{ $tr('Описание') }}</label>
              <textarea v-model="newTopic.description" class="bcf-textarea" rows="3" :placeholder="$tr('Подробное описание...')"></textarea>
            </div>
          </div>

          <!-- Group: Свойства -->
          <div class="bcf-field-group">
            <div class="bcf-field-group-label">{{ $tr('Свойства') }}</div>
            <div class="bcf-field bcf-field--row">
              <label class="bcf-label">{{ $tr('Статус') }}</label>
              <div class="bcf-select-wrap">
                <select v-model="newTopic.status" class="bcf-select">
                  <option v-for="s in statuses" :key="s" :value="s">{{ statusLabel(s) }}</option>
                </select>
              </div>
            </div>
            <div class="bcf-field bcf-field--row">
              <label class="bcf-label">{{ $tr('Приоритет') }}</label>
              <div class="bcf-select-wrap">
                <select v-model="newTopic.priority" class="bcf-select">
                  <option value="">—</option>
                  <option v-for="p in priorities" :key="p" :value="p">{{ p }}</option>
                </select>
              </div>
            </div>
            <div class="bcf-field bcf-field--row">
              <label class="bcf-label">{{ $tr('Ответственный') }}</label>
              <input v-model="newTopic.assignedTo" class="bcf-input" type="text" />
            </div>
          </div>

          <!-- Group: Данные вида -->
          <div class="bcf-field-group">
            <div class="bcf-field-group-label">{{ $tr('Данные вида') }}</div>
            <div class="bcf-field bcf-field--row">
              <label class="bcf-label">{{ $tr('Снимок') }}</label>
              <button class="bcf-outline-btn" :class="{ 'bcf-outline-btn--captured': !!newSnapshotName }" @click="pickSnapshot">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <span>{{ newSnapshotName ?? $tr('Выбрать файл') }}</span>
              </button>
            </div>
            <div class="bcf-field bcf-field--row">
              <label class="bcf-label">{{ $tr('Камера') }}</label>
              <button class="bcf-outline-btn" :class="{ 'bcf-outline-btn--captured': !!capturedCamera }" @click="captureViewpoint" :title="$tr('Захватить текущую позицию камеры')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <span>{{ capturedCamera ? $tr('Захвачено') + ' ✓' : $tr('Захватить вид') }}</span>
              </button>
            </div>
            <div class="bcf-field bcf-field--row">
              <label class="bcf-label">{{ $tr('IFC-объекты') }}</label>
              <button class="bcf-outline-btn" :class="{ 'bcf-outline-btn--captured': capturedGuids.length > 0 }" @click="captureSelection" :title="$tr('Добавить выделенные IFC-объекты')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5"/>
                </svg>
                <span>{{ capturedGuids.length > 0 ? $tr('{0} объектов', capturedGuids.length) : $tr('Из выделения') }}</span>
              </button>
            </div>
          </div>

        </div>

        <div class="bcf-create-foot">
          <button class="bcf-outline-btn" @click="createFormVisible = false">{{ $tr('Отмена') }}</button>
          <button class="bcf-btn-primary" :disabled="!newTopic.title.trim()" @click="createTopic">
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
          <button class="bcf-icon-btn bcf-icon-btn--danger" @click="deleteTopic(selectedTopic.guid)" :title="$tr('Удалить замечание')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </div>

        <!-- Snapshot — первым делом после заголовка -->
        <img
          v-if="selectedTopic.snapshotDataUrl"
          :src="selectedTopic.snapshotDataUrl"
          class="bcf-snapshot bcf-snapshot--clickable"
          alt="snapshot"
          :title="$tr('Открыть в новой вкладке')"
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
            <label>{{ $tr('Приоритет') }}</label>
            <div class="bcf-select-wrap">
              <select v-model="editPriority" @change="updatePriority" class="bcf-select">
                <option value="">—</option>
                <option v-for="p in priorities" :key="p" :value="p">{{ p }}</option>
              </select>
            </div>
          </div>
          <div class="bcf-prop-row">
            <label>{{ $tr('Ответственный') }}</label>
            <input v-model="editAssignedTo" @change="updateAssignedTo" class="bcf-input" type="text" />
          </div>
        </div>

        <!-- Viewpoints -->
        <div v-if="selectedTopic.viewpoints.length" class="bcf-section">
          <div class="bcf-section-label">{{ $tr('Просмотр в модели') }}</div>
          <div class="bcf-vp-list">
            <button
              v-for="(vp, i) in selectedTopic.viewpoints"
              :key="vp.guid"
              class="bcf-vp-btn"
              @click="navigateViewpoint(vp)"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                <polygon points="10,8 17,12 10,16"/>
              </svg>
              {{ $tr('Перейти к виду') }}{{ selectedTopic.viewpoints.length > 1 ? ` ${i + 1}` : '' }}
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
              <button class="bcf-icon-btn bcf-icon-btn--sm bcf-icon-btn--ghost bcf-comment-del" @click="deleteComment(c.guid)" :title="$tr('Удалить комментарий')">
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
import { defineComponent } from 'vue';
import { store } from '../store';
import { parseBcfFile } from '../bcf/parser';
import { serializeBcf, createNewTopicFolder, buildViewpointFromCamera } from '../bcf/writer';
import { BCF_STATUSES, BCF_PRIORITIES } from '../bcf/types';
import type { BcfViewpoint, BcfCamera } from '../bcf/types';

export default defineComponent({
    name: 'BcfPanel',
    data() {
        return {
            store,
            statuses: [...BCF_STATUSES],
            priorities: BCF_PRIORITIES.filter(p => p !== '') as string[],

            statusFilter: '' as string,

            editStatus: '',
            editPriority: '',
            editAssignedTo: '',
            newComment: '',

            createFormVisible: false,
            newTopic: {
                title: '',
                description: '',
                status: 'Open',
                priority: '',
                assignedTo: '',
            },
            newSnapshotBlob: null as Blob | null,
            newSnapshotName: null as string | null,
            capturedCamera: null as BcfCamera | null,
            capturedGuids: [] as string[],
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
    },
    watch: {
        'store.selectedTopicGuid'(guid: string | null) {
            const topic = guid ? store.topics.find(t => t.guid === guid) : null;
            this.editStatus = topic?.status ?? 'Open';
            this.editPriority = topic?.priority ?? '';
            this.editAssignedTo = topic?.assignedTo ?? '';
            this.newComment = '';
        },
    },
    methods: {
        async openFile() {
            const ctx = this.$ctx();
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

        async saveFile() {
            if (!store.zip || !store.fileName) return;
            const ctx = this.$ctx();
            let ws;
            try {
                ws = await ctx.saveDialog({
                    suggestedName: store.fileName,
                    filters: [{ name: 'BCF', extensions: ['bcf'] }],
                    folder: false,
                });
            } catch {
                return;
            }
            if (!ws) return;
            const statusMsg = ctx.setStatusBarMessage(this.$tr('Сохранение BCF...'));
            try {
                const blob = await serializeBcf(store.zip, store.topics, store.project);
                const buf = await blob.arrayBuffer();
                await ws.root.put(new Uint8Array(buf));
                await ws.flush();
                store.isDirty = false;
                ctx.showMessage(this.$tr('Файл сохранён'), 'info');
            } catch (e) {
                ctx.showMessage(this.$tr('Ошибка сохранения: {0}', (e as Error).message), 'error');
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
            t.status = this.editStatus;
            this.markDirty(t.guid);
        },

        updatePriority() {
            const t = this.selectedTopic;
            if (!t) return;
            t.priority = this.editPriority || undefined;
            this.markDirty(t.guid);
        },

        updateAssignedTo() {
            const t = this.selectedTopic;
            if (!t) return;
            t.assignedTo = this.editAssignedTo || undefined;
            this.markDirty(t.guid);
        },

        deleteTopic(guid: string) {
            if (!confirm(this.$tr('Удалить замечание? Это действие необратимо.'))) return;
            if (store.zip) {
                store.zip.remove(`${guid}/`);
            }
            store.topics = store.topics.filter(t => t.guid !== guid);
            if (store.selectedTopicGuid === guid) {
                store.selectedTopicGuid = store.topics[0]?.guid ?? null;
            }
            store.isDirty = true;
        },

        deleteComment(commentGuid: string) {
            if (!confirm(this.$tr('Удалить комментарий?'))) return;
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
            this.newTopic = { title: '', description: '', status: 'Open', priority: '', assignedTo: '' };
            this.newSnapshotBlob = null;
            this.newSnapshotName = null;
            this.capturedCamera = null;
            this.capturedGuids = [];
            this.createFormVisible = true;
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
            this.newSnapshotBlob = new Blob([data], { type: ws.root.mimeType || 'image/png' });
            this.newSnapshotName = ws.root.title;
        },

        captureViewpoint() {
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

            this.capturedCamera = {
                viewPoint: pos,
                direction: dir,
                upVector:  up,
                fieldOfView: 60,
                platformData: snap,
            };
            ctx.showMessage(this.$tr('Позиция камеры захвачена'), 'info');
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

            this.capturedGuids = guids;
            ctx.showMessage(this.$tr('Захвачено IFC-объектов: {0}', guids.length), 'info');
        },

        onThumbClick(topic: typeof store.topics[0]) {
            if (!topic.snapshotDataUrl) return;
            const existing = this.snapshotWindows[topic.guid];
            if (existing) {
                existing.close();
                delete this.snapshotWindows[topic.guid];
            } else {
                this.openSnapshotWindow(topic.guid, topic.snapshotDataUrl, topic.title);
            }
        },

        openSnapshotWindow(guid: string, dataUrl: string, title: string) {
            const ctx = this.$ctx();
            const app = ctx.app;
            if (!app) return;

            const tag = `bcf-snap-${guid}`;
            const win = (app as any).addDefinedWindow({
                tag,
                id: tag,
                title: title.length > 20 ? title.slice(0, 20).trimEnd() + '…' : title,
                icon: 'image',
                actions: [],
                mount: (el: HTMLElement) => {
                    el.style.cssText = 'display:flex;align-items:center;justify-content:center;height:100%;background:#111;overflow:auto;padding:8px;box-sizing:border-box;';
                    const img = document.createElement('img');
                    img.src = dataUrl;
                    img.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;border-radius:4px;';
                    el.appendChild(img);
                },
                unmount: () => {},
                close: async () => { delete this.snapshotWindows[guid]; },
            });
            this.snapshotWindows[guid] = win;
            (ctx.manager as any).activeWindow = win;
        },

        async createTopic() {
            if (!this.newTopic.title.trim() || !store.zip) return;

            const ctx = this.$ctx();
            const guid = crypto.randomUUID();
            const now = new Date().toISOString();
            const author = store.username || (ctx.manager as any)?.username || 'Unknown';

            const vpGuid = crypto.randomUUID();
            const viewpoint = buildViewpointFromCamera(
                vpGuid,
                this.capturedCamera?.viewPoint ?? [0, 0, 0],
                this.capturedCamera?.direction ?? [0, 0, -1],
                this.capturedCamera?.upVector ?? [0, 1, 0],
                this.capturedGuids,
                this.capturedCamera?.platformData,
            );
            if (!this.capturedCamera) viewpoint.camera = undefined;

            const topic = {
                guid,
                title: this.newTopic.title.trim(),
                description: this.newTopic.description.trim() || undefined,
                status: this.newTopic.status,
                priority: this.newTopic.priority || undefined,
                assignedTo: this.newTopic.assignedTo.trim() || undefined,
                creationDate: now,
                creationAuthor: author,
                comments: [],
                viewpoints: [viewpoint],
                snapshotDataUrl: this.newSnapshotBlob
                    ? await blobToDataUrl(this.newSnapshotBlob)
                    : undefined,
            };

            createNewTopicFolder(store.zip, topic, this.newSnapshotBlob ?? undefined);
            store.topics.push(topic);
            store.isDirty = true;
            store.selectedTopicGuid = guid;
            this.createFormVisible = false;
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
