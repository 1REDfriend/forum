<script setup lang="ts">
import MarkdownRenderer from '../components/MarkdownRenderer.vue';

const content = `# กฎของชุมชน IT.FORUM

ยินดีต้อนรับ — โปรดอ่านก่อนโพสต์

1. **เคารพผู้อื่น** — ไม่ดูถูก คุกคาม หรือเหยียด
2. **ห้ามสแปม** — ห้ามโฆษณาซ้ำ ๆ หรือเนื้อหาที่ไม่เกี่ยวข้อง
3. **ใช้ Markdown** — จัดรูปแบบให้อ่านง่าย แนบรูป/ไฟล์ตามที่ระบบรองรับ
4. **รายงานเมื่อเจอปัญหา** — ใช้ปุ่ม Report แทนการโต้เถียง
5. **หมวด Announcements** — โพสต์ได้เฉพาะผู้ดูแล (manager/admin)

การละเมิดซ้ำอาจถูกระงับบัญชี

ดูหน้า [Help](/help) สำหรับวิธีใช้งาน
`;
</script>

<template>
  <div class="flex min-h-screen w-full justify-center">
    <div class="w-full max-w-2xl mx-auto pt-24 px-4 sm:px-6 pb-12">
      <div class="glass p-6 sm:p-8">
        <MarkdownRenderer :content="content" />
      </div>
    </div>
  </div>
</template>
