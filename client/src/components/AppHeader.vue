<script setup lang="ts">
import LoginForm from "./LoginForm.vue";
import LanguageSwitcher from "./LanguageSwitcher.vue";
import { useI18n } from "../i18n";

const { t } = useI18n();
</script>

<template>
  <div class="flex justify-end items-end">
    <LanguageSwitcher />
    <h1 class="mx-auto">{{ t("common.appTitle") }}</h1>
    <LoginForm />
  </div>
</template>
