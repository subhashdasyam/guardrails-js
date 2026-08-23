<template>
  <form @submit.prevent="save">
    <label for="name">Display name</label>
    <input id="name" v-model="form.displayName" />

    <ul>
      <li v-for="item in visibleItems" :key="item.id">{{ item.label }}</li>
    </ul>

    <button type="submit" :disabled="saving">Save</button>
    <p v-if="error">{{ error }}</p>
  </form>
</template>

<script setup>
import { computed, ref, shallowRef } from 'vue';

const props = defineProps({ items: { type: Array, default: () => [] } });

const form = ref({ displayName: '' });
const saving = ref(false);
const error = ref('');
const cache = shallowRef(new Map());

const visibleItems = computed(() => props.items.filter((item) => item.visible));

async function save() {
  saving.value = true;
  error.value = '';

  try {
    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: form.value.displayName }),
      redirect: 'error',
    });

    if (!response.ok) throw new Error('save failed');
    cache.value.set('settings', await response.json());
  } catch (err) {
    error.value = 'Could not save. Try again.';
    console.error(err);
  } finally {
    saving.value = false;
  }
}
</script>
