<template>
  <router-view />
  <!-- Global dialogs: Toast, Confirm, Badge popup, Resume exam popup -->
</template>

<script setup>
// App root component
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: #f7f8fa;
  color: #323233;
  max-width: 414px;
  margin: 0 auto;
  min-height: 100vh;
}
@media (min-width: 415px) {
  body {
    border-left: 1px solid #ebedf0;
    border-right: 1px solid #ebedf0;
  }
}
</style>
