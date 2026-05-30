<template>
  <div class="bcf-detail bcf-create">

    <div class="bcf-detail-head bcf-detail-head--flat">
      <span class="bcf-detail-head-title">{{ $tr('Новое замечание') }}</span>
      <button class="bcf-icon-btn" @click="uiStore.createFormVisible = false" :title="$tr('Закрыть')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <div class="bcf-create-body">

      <div class="bcf-field-group">
        <div class="bcf-field">
          <label class="bcf-label">{{ $tr('Заголовок') }} <span class="bcf-required">*</span></label>
          <input v-model="uiStore.newTopic.title" class="bcf-input" type="text" autofocus :placeholder="$tr('Краткое описание замечания')" />
        </div>
        <div class="bcf-field">
          <label class="bcf-label">{{ $tr('Описание') }}</label>
          <textarea v-model="uiStore.newTopic.description" class="bcf-textarea" rows="3" :placeholder="$tr('Подробное описание...')"></textarea>
        </div>
      </div>

      <div class="bcf-field-group">
        <div class="bcf-field-group-label">{{ $tr('Свойства') }}</div>
        <div class="bcf-field bcf-field--row">
          <label class="bcf-label">{{ $tr('Статус') }}</label>
          <div class="bcf-select-wrap">
            <select v-model="uiStore.newTopic.status" class="bcf-select">
              <option v-for="s in statuses" :key="s" :value="s">{{ statusLabel(s) }}</option>
            </select>
          </div>
        </div>
        <div class="bcf-field bcf-field--row">
          <label class="bcf-label">{{ $tr('Тип') }}</label>
          <div class="bcf-select-wrap">
            <select v-model="uiStore.newTopic.topicType" class="bcf-select">
              <option value="">—</option>
              <option v-for="t in topicTypes" :key="t" :value="t">{{ topicTypeLabel(t) }}</option>
            </select>
          </div>
        </div>
        <div class="bcf-field bcf-field--row">
          <label class="bcf-label">{{ $tr('Приоритет') }}</label>
          <div class="bcf-select-wrap">
            <select v-model="uiStore.newTopic.priority" class="bcf-select">
              <option value="">—</option>
              <option v-for="p in priorities" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>
        </div>
        <div class="bcf-field bcf-field--row">
          <label class="bcf-label">{{ $tr('Ответственный') }}</label>
          <input v-model="uiStore.newTopic.assignedTo" class="bcf-input" type="text" />
        </div>
      </div>

      <div class="bcf-field-group">
        <div class="bcf-field-group-label">{{ $tr('Данные вида') }}</div>
        <div class="bcf-field bcf-field--row">
          <label class="bcf-label">{{ $tr('Камера') }}</label>
          <button
            class="bcf-outline-btn"
            :class="{ 'bcf-outline-btn--captured': !!uiStore.capturedCamera }"
            @click="onCaptureViewpoint"
            :title="$tr('Захватить текущую позицию камеры и снимок вида')"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            <span>{{ uiStore.capturedCamera ? $tr('Захвачено') + ' ✓' : $tr('Захватить вид') }}</span>
          </button>
        </div>
      </div>

    </div>

    <div class="bcf-create-foot">
      <button class="bcf-outline-btn" @click="uiStore.createFormVisible = false">{{ $tr('Отмена') }}</button>
      <button class="bcf-btn-primary" :disabled="!uiStore.newTopic.title.trim()" @click="onCreateTopic">
        {{ $tr('Создать') }}
      </button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { uiStore } from '../store';
import { BCF_STATUSES, BCF_PRIORITIES, BCF_TOPIC_TYPES } from '../bcf/types';
import { statusLabel as _statusLabel, topicTypeLabel } from '../bcf/labels';
import { captureViewpoint, } from '../composables/useViewpointActions';
import { createTopic } from '../composables/useTopicActions';
import { useCtx } from '../composables/useCtx';

const { ctx, tr } = useCtx();

const statuses = [...BCF_STATUSES];
const priorities = BCF_PRIORITIES.filter(p => p !== '') as string[];
const topicTypes = [...BCF_TOPIC_TYPES] as string[];

const statusLabel = (s: string) => _statusLabel(s, tr);

async function onCaptureViewpoint() {
    await captureViewpoint(ctx());
}

async function onCreateTopic() {
    await createTopic(ctx());
}
</script>
