<script setup lang="ts">
import MarkdownRenderer from '../components/MarkdownRenderer.vue';

const content = `# วิธีใช้งาน IT.FORUM

## เริ่มต้น
1. [สมัครสมาชิก](/register) หรือ [เข้าสู่ระบบ](/login)
2. ไปที่ [Forums](/forums) เลือกหมวด
3. กด **+ New Thread** เพื่อตั้งกระทู้

## Markdown
- **ตัวหนา** ใช้ \`**ข้อความ**\`
- วางรูปใน editor ได้โดยตรง
- ไฟล์ใหญ่ใช้อัปโหลดแบบ chunked

## ตอบกลับและ Quote
- กด **Quote** บนโพสต์เพื่อใส่ blockquote ในกล่องตอบ
- พิมพ์ \`@\` แล้วเลือกชื่อ (ถ้า login แล้ว) จะได้ mention แบบ \`[@name](user:id)\`

## แจ้งเตือน
- กระดิ่งบนแถบนำทางแสดงเมื่อมีคนตอบกระทู้หรือ mention คุณ

## ติดปัญหา?
โพสต์ในหมวด **Help & Feedback** หรืออ่าน [กฎชุมชน](/rules)
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
