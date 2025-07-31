<!--
  Copyright 2024 DMS-QA Project

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
-->

<template>
  <AppLayout>
    <ContentWrapper>
      <HomeContent />
    </ContentWrapper>
  </AppLayout>
</template>

<script setup>
import AppLayout from '@/components/common/AppLayout.vue'
import ContentWrapper from '@/components/common/ContentWrapper.vue'
import HomeContent from '@/components/HomeContent.vue'
</script>

<style scoped>
/* Home页面特定样式可以在这里添加 */
</style>