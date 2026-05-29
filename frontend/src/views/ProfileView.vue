<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useAuthStore } from '../stores/auth.js';
import { usersApi, uploadApi } from '../api/index.js';
import type { User } from '../api/types.js';

const props = defineProps<{ id?: string }>();

const authStore = useAuthStore();
const profileUser = ref<Partial<User> | null>(null);
const isLoading = ref(true);
const error = ref('');
const isEditing = ref(false);
const editName = ref('');
const isSaving = ref(false);
const editError = ref('');

// Avatar upload
const avatarInputRef = ref<HTMLInputElement | null>(null);
const isUploadingAvatar = ref(false);
const avatarUploadError = ref('');
const avatarPreview = ref<string | null>(null);

const isOwnProfile = computed(() => {
    if (props.id) return false;
    return authStore.isAuthenticated;
});

onMounted(async () => {
    try {
        if (props.id) {
            profileUser.value = await usersApi.getUserById(Number(props.id));
        } else if (authStore.isAuthenticated) {
            profileUser.value = await usersApi.getMe();
        }
    } catch (err: any) {
        error.value = err.message || 'Failed to load profile';
    } finally {
        isLoading.value = false;
    }
});

const startEdit = () => {
    editName.value = profileUser.value?.name || '';
    isEditing.value = true;
    editError.value = '';
    avatarUploadError.value = '';
};

const cancelEdit = () => {
    isEditing.value = false;
    editError.value = '';
    avatarPreview.value = null;
};

const saveEdit = async () => {
    isSaving.value = true;
    editError.value = '';
    try {
        await authStore.updateProfile({ name: editName.value });
        profileUser.value = { ...profileUser.value, name: editName.value };
        isEditing.value = false;
    } catch (err: any) {
        editError.value = err.message || 'Failed to update profile';
    } finally {
        isSaving.value = false;
    }
};

const onAvatarFileChange = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e) => { avatarPreview.value = e.target?.result as string; };
    reader.readAsDataURL(file);

    // Upload
    isUploadingAvatar.value = true;
    avatarUploadError.value = '';
    try {
        const url = await uploadApi.uploadAvatar(file);
        // Update profile avatar via auth store
        await authStore.updateProfile({ avatar: url });
        profileUser.value = { ...profileUser.value, avatar: url };
        avatarPreview.value = null;
    } catch (err: any) {
        avatarUploadError.value = err.message || 'Upload failed. Please try again.';
        avatarPreview.value = null;
    } finally {
        isUploadingAvatar.value = false;
        if (avatarInputRef.value) avatarInputRef.value.value = '';
    }
};

const getInitials = (name: string | undefined) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
};
</script>

<template>
    <main class="min-h-screen bg-gray-50 pt-24 pb-12">
        <div class="max-w-2xl mx-auto px-4 sm:px-6">

            <div v-if="isLoading" class="bg-white rounded-xl border border-gray-100 p-8 animate-pulse">
                <div class="flex items-center gap-6 mb-6">
                    <div class="w-20 h-20 rounded-full bg-gray-200"></div>
                    <div>
                        <div class="h-6 bg-gray-200 rounded w-40 mb-2"></div>
                        <div class="h-4 bg-gray-100 rounded w-60"></div>
                    </div>
                </div>
            </div>

            <div v-else-if="error" class="bg-red-50 text-red-600 rounded-xl p-6 border border-red-100 text-center">
                <p class="font-medium">{{ error }}</p>
                <router-link to="/" class="text-indigo-600 hover:underline text-sm mt-2 inline-block">← Back to Home</router-link>
            </div>

            <div v-else-if="profileUser" class="space-y-6">
                <!-- Profile Card -->
                <div class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div class="h-24 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
                    <div class="px-8 pb-8">
                        <div class="flex items-end gap-6 -mt-10 mb-6">
                            <!-- Avatar with upload overlay -->
                            <div class="relative group">
                                <div v-if="avatarPreview || profileUser.avatar" class="w-20 h-20 rounded-full border-4 border-white shadow-md overflow-hidden">
                                    <img :src="avatarPreview || profileUser.avatar || ''" class="w-full h-full object-cover" alt="Avatar" />
                                </div>
                                <div v-else class="w-20 h-20 rounded-full bg-indigo-600 text-white flex items-center justify-center text-2xl font-bold border-4 border-white shadow-md">
                                    {{ getInitials(profileUser.name) }}
                                </div>
                                <!-- Upload overlay (only for own profile) -->
                                <label v-if="isOwnProfile"
                                    class="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                    :class="{ 'opacity-100 pointer-events-none': isUploadingAvatar }"
                                    title="Change avatar"
                                >
                                    <span v-if="isUploadingAvatar" class="text-white text-xs font-medium">Uploading...</span>
                                    <svg v-else class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                                    </svg>
                                    <input
                                        ref="avatarInputRef"
                                        type="file"
                                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                        class="hidden"
                                        @change="onAvatarFileChange"
                                        :disabled="isUploadingAvatar"
                                    />
                                </label>
                            </div>
                            <div class="pb-1">
                                <template v-if="!isEditing">
                                    <h1 class="text-2xl font-bold text-gray-900">{{ profileUser.name }}</h1>
                                </template>
                                <template v-else>
                                    <input v-model="editName"
                                        class="text-2xl font-bold text-gray-900 border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                                </template>
                                <p class="text-sm text-gray-500" v-if="profileUser.email">{{ profileUser.email }}</p>
                            </div>
                        </div>

                        <p v-if="avatarUploadError" class="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3 border border-red-100">{{ avatarUploadError }}</p>
                        <div v-if="editError" class="p-3 bg-red-50 text-red-600 rounded-md text-sm mb-4">{{ editError }}</div>

                        <div class="flex items-center gap-6 text-sm text-gray-500 mb-4">
                            <span v-if="profileUser.createdAt">📅 Joined {{ formatDate(profileUser.createdAt) }}</span>
                            <span v-if="(profileUser as any).role" class="bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full font-medium text-xs uppercase">
                                {{ (profileUser as any).role }}
                            </span>
                        </div>

                        <div v-if="isOwnProfile" class="flex gap-2 flex-wrap">
                            <template v-if="!isEditing">
                                <button @click="startEdit" class="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
                                    Edit Name
                                </button>
                                <p class="text-xs text-gray-400 self-center">Hover over your avatar to change it</p>
                            </template>
                            <template v-else>
                                <button @click="cancelEdit" class="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                                <button @click="saveEdit" :disabled="isSaving" class="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50">
                                    {{ isSaving ? 'Saving...' : 'Save Name' }}
                                </button>
                            </template>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </main>
</template>
