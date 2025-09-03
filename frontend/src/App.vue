<template>
  <div id="app">
     <n-dialog-provider>
    <n-config-provider>
    <n-message-provider>
      <router-view />
    </n-message-provider>
  </n-config-provider>
</n-dialog-provider>
  </div>
</template>

<script setup>
import { NMessageProvider, NConfigProvider, NDialogProvider } from "naive-ui";

</script>

<style>

</style>
