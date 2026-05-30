<template>
  <div class="bcf-toolbar">
    <div class="bcf-filename-wrap">
      <svg class="bcf-filename-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
      <span class="bcf-filename" :title="fileStore.fileName ?? ''">
        {{ fileStore.fileName ?? $tr('Файл не открыт') }}
      </span>
      <span v-if="fileStore.isDirty" class="bcf-dirty-dot" :title="$tr('Есть несохранённые изменения')"></span>
    </div>
    <div class="bcf-toolbar-actions">
      <button class="bcf-tbtn" @click="$emit('open')" :title="$tr('Открыть BCF-файл')">
        <svg class="bcf-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
        {{ $tr('Открыть') }}
      </button>
      <button class="bcf-tbtn" @click="$emit('save')" :disabled="!fileStore.isDirty" :title="$tr('Сохранить')">
        <svg class="bcf-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
          <polyline points="17 21 17 13 7 13 7 21"/>
          <polyline points="7 3 7 8 15 8"/>
        </svg>
        {{ $tr('Сохранить') }}
      </button>
      <button class="bcf-tbtn bcf-tbtn--primary" @click="$emit('create')" :title="$tr('Создать замечание')">
        <svg class="bcf-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        {{ $tr('Создать') }}
      </button>
      <button class="bcf-icon-btn" @click="$emit('close')" :title="$tr('Закрыть файл')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { fileStore } from '../store';

defineEmits<{ open: []; save: []; create: []; close: [] }>();
</script>
