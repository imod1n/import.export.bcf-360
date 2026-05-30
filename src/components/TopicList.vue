<template>
  <div class="bcf-list-pane">

    <div class="bcf-list-header">
      <span class="bcf-list-title">{{ $tr('Замечания') }}</span>
      <span class="bcf-list-count">
        {{ filteredTopics.length }}<template v-if="filteredTopics.length !== topicStore.topics.length"> / {{ topicStore.topics.length }}</template>
      </span>
    </div>

    <div class="bcf-filter-row">
      <button
        v-for="chip in filterChips"
        :key="chip.value"
        class="bcf-chip"
        :class="{ 'bcf-chip--active': statusFilter === chip.value }"
        @click="statusFilter = chip.value"
      >{{ chip.label }}</button>
    </div>

    <div class="bcf-list">
      <div v-if="filteredTopics.length === 0" class="bcf-list-empty">
        {{ topicStore.topics.length === 0 ? $tr('Замечания отсутствуют') : $tr('Нет замечаний с таким статусом') }}
      </div>
      <div
        v-for="topic in filteredTopics"
        :key="topic.guid"
        class="bcf-item"
        :class="{ 'bcf-item--selected': topicStore.selectedTopicGuid === topic.guid }"
        @click="topicStore.selectedTopicGuid = topic.guid"
      >
        <div class="bcf-item-strip" :class="statusStripClass(topic.status)"></div>
        <div
          class="bcf-item-thumb"
          :class="{ 'bcf-item-thumb--clickable': !!topic.snapshotDataUrl }"
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
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { topicStore } from '../store';
import { statusClass, statusStripClass, statusLabel as _statusLabel } from '../bcf/labels';
import { useCtx } from '../composables/useCtx';

const { tr } = useCtx();

const statusFilter = ref('');

const filteredTopics = computed(() =>
    statusFilter.value ? topicStore.topics.filter(t => t.status === statusFilter.value) : topicStore.topics,
);

const filterChips = computed(() => [
    { value: '',            label: tr('Все') },
    { value: 'Open',        label: tr('Открыто') },
    { value: 'In Progress', label: tr('В работе') },
    { value: 'Resolved',    label: tr('Решено') },
    { value: 'ReOpened',    label: tr('Повторное') },
    { value: 'Closed',      label: tr('Закрыто') },
]);

const statusLabel = (s: string) => _statusLabel(s, tr);
</script>
