<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useQueryClient } from '@tanstack/vue-query';
import { useAuthStore } from '../stores/auth.js';
import { setPageMeta } from '../utils/meta.js';
import { uploadApi } from '../api/index.js';
import type { User, TierDef, Badge, ProfileStats, UpdateUserDTO } from '../api/types.js';
import { tierStyle } from '../api/types.js';
import { useMe, usePublicProfile, useUpdateProfile } from '../composables/useUsers.js';

interface ProfileData extends Partial<User> {
    score?: number;
    stats?: ProfileStats;
    currentTier?: TierDef;
    nextTier?: TierDef | null;
    progress?: number;
    pointsToNext?: number;
    badges?: Badge[];
}

const props = defineProps<{ id?: string }>();

const authStore = useAuthStore();
const queryClient = useQueryClient();
const isEditing = ref(false);
const editName = ref('');
const editBio = ref('');
const isSaving = ref(false);
const editError = ref('');

// Avatar upload
const avatarInputRef = ref<HTMLInputElement | null>(null);
const isUploadingAvatar = ref(false);
const avatarUploadError = ref('');
const avatarPreview = ref<string | null>(null);

// Banner upload
const bannerInputRef = ref<HTMLInputElement | null>(null);
const isUploadingBanner = ref(false);
const bannerUploadError = ref('');

const isOwnProfile = computed(() => {
    if (props.id) return false;
    return authStore.isAuthenticated;
});

// Own profile and someone else's profile are two separate queries; only one is
// ever enabled at a time based on whether an `id` prop was passed in.
const { data: ownProfileData, isPending: isOwnProfilePending, error: ownProfileError } = useMe(isOwnProfile);
const { data: otherProfileData, isPending: isOtherProfilePending, error: otherProfileError } =
    usePublicProfile(computed(() => props.id ?? ''));

const profileUser = computed<ProfileData | null>(() => {
    const raw = props.id ? otherProfileData.value : ownProfileData.value;
    return (raw as ProfileData | undefined) ?? null;
});

const isLoading = computed(() => {
    if (props.id) return isOtherProfilePending.value;
    if (isOwnProfile.value) return isOwnProfilePending.value;
    return false;
});

const error = computed(() => {
    const err = props.id ? otherProfileError.value : (isOwnProfile.value ? ownProfileError.value : null);
    return err ? (err as Error).message || 'Failed to load profile' : '';
});

const ts = computed(() => tierStyle(profileUser.value?.tier));
const progressPct = computed(() => Math.round((profileUser.value?.progress ?? 0) * 100));
const bannerStyle = computed(() =>
    profileUser.value?.banner ? { backgroundImage: `url(${JSON.stringify(profileUser.value.banner)})` } : {},
);

watch(profileUser, (p) => {
    if (p) {
        setPageMeta({
            title: p.name ?? 'Profile',
            description: p.bio ?? `${p.name ?? 'User'}'s profile on IT.Forum.`,
            image: p.banner ?? p.avatar ?? undefined,
        });
    }
}, { immediate: true });

const { mutateAsync: updateProfileMutation } = useUpdateProfile();

// Persist a profile change via the mutation (single API call + automatic ['me']
// cache invalidation), then keep the app-wide auth store (header/avatar) and the
// query cache in sync immediately so there's no flash of stale data.
async function persistProfileUpdate(data: UpdateUserDTO) {
    const updated = await updateProfileMutation(data);
    if (isOwnProfile.value) {
        authStore.user = updated;
        localStorage.setItem('user', JSON.stringify(updated));
        queryClient.setQueryData(['me'], (old: unknown) =>
            old && typeof old === 'object' ? { ...old, ...updated } : updated,
        );
    }
    return updated;
}

const startEdit = () => {
    editName.value = profileUser.value?.name || '';
    editBio.value = profileUser.value?.bio || '';
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
        await persistProfileUpdate({ name: editName.value, bio: editBio.value });
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

    const reader = new FileReader();
    reader.onload = (e) => { avatarPreview.value = e.target?.result as string; };
    reader.readAsDataURL(file);

    isUploadingAvatar.value = true;
    avatarUploadError.value = '';
    try {
        const url = await uploadApi.uploadAvatar(file);
        await persistProfileUpdate({ avatar: url });
        avatarPreview.value = null;
    } catch (err: any) {
        avatarUploadError.value = err.message || 'Upload failed. Please try again.';
        avatarPreview.value = null;
    } finally {
        isUploadingAvatar.value = false;
        if (avatarInputRef.value) avatarInputRef.value.value = '';
    }
};

const onBannerFileChange = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    isUploadingBanner.value = true;
    bannerUploadError.value = '';
    try {
        const url = await uploadApi.uploadImage(file);
        await persistProfileUpdate({ banner: url });
    } catch (err: any) {
        bannerUploadError.value = err.message || 'Banner upload failed. Please try again.';
    } finally {
        isUploadingBanner.value = false;
        if (bannerInputRef.value) bannerInputRef.value.value = '';
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
    <main class="flex justify-center min-h-screen pt-24 pb-12">
        <div class="w-screen max-w-4xl  mx-auto px-4 sm:px-6">

            <div v-if="isLoading" class="glass rounded-xl p-8 animate-pulse">
                <div class="flex items-center gap-6 mb-6">
                    <div class="w-20 h-20 rounded-full bg-(--color-background-mute)"></div>
                    <div>
                        <div class="h-6 bg-(--color-background-mute) rounded w-40 mb-2"></div>
                        <div class="h-4 bg-(--color-background-mute) rounded w-60"></div>
                    </div>
                </div>
            </div>

            <div v-else-if="error" class="bg-red-500/10 text-(--color-error) rounded-xl p-6 border border-red-500/20 text-center">
                <p class="font-medium">{{ error }}</p>
                <router-link to="/" class="text-sky-600 dark:text-sky-400 hover:underline text-sm mt-2 inline-block">← Back to
                    Home</router-link>
            </div>

            <div v-else-if="profileUser" class="flex flex-col space-y-6 gap-6">
                <!-- Profile Card -->
                <div class="glass rounded-xl overflow-hidden">
                    <!-- Banner -->
                    <div class="relative h-32 group bg-(--color-background-soft)">
                        <div class="absolute inset-0 bg-cover bg-center" :style="bannerStyle"></div>
                        <div v-if="!profileUser.banner"
                            class="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
                        <!-- Banner upload (own profile) -->
                        <label v-if="isOwnProfile"
                            class="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-sm font-medium"
                            :class="{ 'opacity-100 pointer-events-none': isUploadingBanner }" title="Change banner">
                            <span v-if="isUploadingBanner">Uploading banner…</span>
                            <span v-else>📷 Change banner</span>
                            <input ref="bannerInputRef" type="file"
                                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" class="hidden"
                                @change="onBannerFileChange" :disabled="isUploadingBanner" />
                        </label>
                    </div>

                    <div class="px-8 pb-8">
                        <div class="flex items-end gap-6 -mt-10 mb-4">
                            <!-- Avatar with upload overlay -->
                            <div class="relative group">
                                <div v-if="avatarPreview || profileUser.avatar"
                                    class="w-20 h-20 rounded-full border-4 border-(--color-background) shadow-md overflow-hidden bg-(--color-background)">
                                    <img :src="avatarPreview || profileUser.avatar || ''"
                                        class="w-full h-full object-cover" alt="Avatar" />
                                </div>
                                <div v-else
                                    class="w-20 h-20 rounded-full bg-indigo-700 text-white flex items-center justify-center text-2xl font-bold border-4 border-(--color-background) shadow-md">
                                    {{ getInitials(profileUser.name) }}
                                </div>
                                <label v-if="isOwnProfile"
                                    class="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                    :class="{ 'opacity-100 pointer-events-none': isUploadingAvatar }"
                                    title="Change avatar">
                                    <span v-if="isUploadingAvatar"
                                        class="text-white text-xs font-medium">Uploading...</span>
                                    <svg v-else class="w-6 h-6 text-white" fill="none" stroke="currentColor"
                                        viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <input ref="avatarInputRef" type="file"
                                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" class="hidden"
                                        @change="onAvatarFileChange" :disabled="isUploadingAvatar" />
                                </label>
                            </div>
                            <div class="pb-1 flex-1 min-w-0">
                                <template v-if="!isEditing">
                                    <h1 class="text-2xl font-bold text-(--color-heading) truncate">{{ profileUser.name }}</h1>
                                </template>
                                <template v-else>
                                    <input v-model="editName"
                                        class="text-2xl font-bold text-(--color-heading) bg-(--color-background) border border-(--color-border) rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full max-w-xs" />
                                </template>
                                <p class="text-sm text-(--color-text-muted) truncate" v-if="profileUser.email">{{ profileUser.email }}</p>
                            </div>
                        </div>

                        <p v-if="avatarUploadError"
                            class="text-sm text-(--color-error) bg-red-500/10 rounded-lg px-3 py-2 mb-3 border border-red-500/20">{{ avatarUploadError }}</p>
                        <p v-if="bannerUploadError"
                            class="text-sm text-(--color-error) bg-red-500/10 rounded-lg px-3 py-2 mb-3 border border-red-500/20">{{ bannerUploadError }}</p>
                        <div v-if="editError" class="p-3 bg-red-500/10 text-(--color-error) border border-red-500/20 rounded-md text-sm mb-4">{{ editError }}</div>

                        <!-- Badges: tier + role -->
                        <div class="flex items-center flex-wrap gap-2 mb-4">
                            <span class="px-2.5 py-0.5 rounded-full font-bold text-xs border"
                                :style="{ background: ts.bg, color: ts.color, borderColor: ts.ring }">
                                {{ ts.icon }} {{ ts.label }}
                            </span>
                            <span v-if="profileUser.role === 'admin'"
                                class="bg-amber-500/15 text-amber-700 dark:text-amber-300 px-2.5 py-0.5 rounded-full font-bold text-xs uppercase">
                                Admin
                            </span>
                            <span v-else-if="profileUser.role === 'manager'"
                                class="bg-sky-500/15 text-sky-700 dark:text-sky-300 px-2.5 py-0.5 rounded-full font-bold text-xs uppercase">
                                Manager
                            </span>
                            <span v-if="profileUser.createdAt" class="text-sm text-(--color-text-muted) ml-1">📅 Joined {{ formatDate(profileUser.createdAt) }}</span>
                        </div>

                        <!-- Bio -->
                        <div class="mb-4">
                            <template v-if="!isEditing">
                                <p v-if="profileUser.bio" class="text-sm text-(--color-text) whitespace-pre-line">{{ profileUser.bio }}</p>
                                <p v-else class="text-sm text-(--color-text-muted) italic">No bio yet.</p>
                            </template>
                            <template v-else>
                                <label class="block text-xs font-medium text-(--color-text-muted) mb-1">Bio / Description</label>
                                <textarea v-model="editBio" rows="3" maxlength="500"
                                    placeholder="Tell others about yourself…"
                                    class="w-full text-sm text-(--color-text) placeholder-(--color-text-muted) bg-(--color-background) border border-(--color-border) rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"></textarea>
                                <p class="text-xs text-(--color-text-muted) mt-1">{{ editBio.length }}/500</p>
                            </template>
                        </div>

                        <div v-if="isOwnProfile" class="flex gap-2 flex-wrap">
                            <template v-if="!isEditing">
                                <button @click="startEdit"
                                    class="px-4 py-2 text-sm bg-indigo-700 text-white rounded-md hover:bg-indigo-600 transition-colors">
                                    Edit Profile
                                </button>
                                <p class="text-xs text-(--color-text-muted) self-center">Hover the avatar or banner to change images</p>
                            </template>
                            <template v-else>
                                <button @click="cancelEdit"
                                    class="px-4 py-2 text-sm text-(--color-text-muted) border border-(--color-border) rounded-md hover:bg-(--color-background-mute)">Cancel</button>
                                <button @click="saveEdit" :disabled="isSaving"
                                    class="px-4 py-2 text-sm text-white bg-indigo-700 hover:bg-indigo-600 rounded-md disabled:opacity-50">
                                    {{ isSaving ? 'Saving...' : 'Save' }}
                                </button>
                            </template>
                        </div>
                    </div>
                </div>

                <!-- Tier journey -->
                <div class="glass rounded-2xl p-6">
                    <div class="flex items-center gap-4 mb-4">
                        <div class="text-4xl">{{ ts.icon }}</div>
                        <div class="min-w-0">
                            <p class="text-xs text-(--color-text-muted)">ระดับการเดินทาง</p>
                            <h2 class="text-xl font-bold" :style="{ color: ts.color }">{{ ts.label }}</h2>
                        </div>
                        <div class="ml-auto text-right">
                            <p class="text-2xl font-extrabold text-(--color-heading)">{{ profileUser.score ?? 0 }}</p>
                            <p class="text-xs text-(--color-text-muted)">คะแนน</p>
                        </div>
                    </div>
                    <div class="h-3 rounded-full bg-(--color-background-mute) overflow-hidden">
                        <div class="h-full rounded-full transition-all"
                            :style="{ width: progressPct + '%', background: `linear-gradient(90deg, ${ts.color}, #38bdf8)` }">
                        </div>
                    </div>
                    <p v-if="profileUser.nextTier" class="text-xs text-(--color-text-muted) mt-2">
                        อีก <span class="font-bold text-(--color-text)">{{ profileUser.pointsToNext }}</span> คะแนน ถึง
                        <span class="font-bold">{{ profileUser.nextTier.icon }} {{ profileUser.nextTier.label }}</span>
                    </p>
                    <p v-else class="text-xs text-(--color-text-muted) mt-2">🎉 ถึงระดับสูงสุดแล้ว!</p>
                </div>

                <!-- Stats -->
                <div v-if="profileUser.stats" class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div class="glass rounded-2xl p-4 text-center">
                        <p class="text-2xl font-extrabold text-(--color-heading)">{{ profileUser.stats.threads + profileUser.stats.posts }}</p>
                        <p class="text-xs text-(--color-text-muted) mt-1">📝 โพสต์/กระทู้</p>
                    </div>
                    <div class="glass rounded-2xl p-4 text-center">
                        <p class="text-2xl font-extrabold text-(--color-heading)">{{ profileUser.stats.likesReceived }}</p>
                        <p class="text-xs text-(--color-text-muted) mt-1">👍 Like ที่ได้รับ</p>
                    </div>
                    <div class="glass rounded-2xl p-4 text-center">
                        <p class="text-2xl font-extrabold text-(--color-heading)">{{ profileUser.stats.accountAgeDays }}</p>
                        <p class="text-xs text-(--color-text-muted) mt-1">📅 วันกับเรา</p>
                    </div>
                    <div class="glass rounded-2xl p-4 text-center">
                        <p class="text-2xl font-extrabold text-(--color-heading)">{{ profileUser.stats.loginStreak }} 🔥</p>
                        <p class="text-xs text-(--color-text-muted) mt-1">🎯 Streak</p>
                    </div>
                </div>

                <!-- Badges -->
                <div v-if="profileUser.badges && profileUser.badges.length" class="glass rounded-2xl p-6">
                    <h2 class="text-lg font-bold text-(--color-heading) mb-4">🏅 เหรียญตรา</h2>
                    <div class="flex flex-wrap gap-3">
                        <div v-for="b in profileUser.badges" :key="b.key" :title="b.desc"
                            class="flex items-center gap-2 bg-(--color-background-mute) border border-(--color-border) rounded-xl px-3 py-2">
                            <span class="text-2xl">{{ b.icon }}</span>
                            <span class="text-sm font-semibold text-(--color-text)">{{ b.label }}</span>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </main>
</template>
