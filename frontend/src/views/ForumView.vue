<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
    forum: string
}>()

//  backend state pulling
const forumDetails = ref<any>(null)
const isLoading = ref<boolean>(true)

const fetchForumData = async (forumId: string) => {
    isLoading.value = true
    try {
        forumDetails.value = {
            id: forumId,
            name: forumId === ''
        }
    }

}
</script>

<template>
    
</template>