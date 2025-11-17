<template>
  <div class="footer-social">
    <a-tooltip title="Homepage">
      <a :href="homepageUrl" target="_blank" rel="noopener noreferrer" class="home-icon" >
        <HomeIcon />
      </a>
    </a-tooltip>

    <a-tooltip title="Email">
      <a :href="emailLink" target="_blank" rel="noopener noreferrer" class="email-icon" >
        <EmailIcon />
      </a>
    </a-tooltip>

    <a-tooltip title="Discord">
      <a :href="discordUrl" target="_blank" rel="noopener noreferrer" class="discord-icon" >
        <img :src="DiscordImage" alt="Discord" />
      </a>
    </a-tooltip>

    <a-tooltip title="Documentation">
      <a :href="docsUrl" target="_blank" rel="noopener noreferrer" class="doc-icon" >
        <DocIcon />
      </a>
    </a-tooltip>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import HomeIcon from '@/assets/svg/home-icon.svg'
import EmailIcon from '@/assets/svg/email-icon.svg'
import DocIcon from '@/assets/svg/doc-icon.svg'
import DiscordImage from '@/assets/image/discord.png'

const homepageUrl = import.meta.env.VITE_HOMEPAGE_URL || 'https://www.lemonai.cc'
const email = import.meta.env.VITE_EMAIL || 'feedback@lemonai.cc'
const discordUrl = import.meta.env.VITE_DISCORD_URL || 'https://discord.gg/gjEXg4UBR4'
const docsUrl = import.meta.env.VITE_DOCS_URL || 'https://lemon-11.gitbook.io/lemonai'

const emailLink = computed(() => `mailto:${email}`)
</script>

<style scoped lang="less">
.footer-social {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-around;
  border-top: 1px solid #E0E0E0;
  height: 48px;
}

.home-icon svg {
  width: 20px;
  height: 20px;
}
.email-icon svg {
  width: 18px;
  height: 18px;
}
.discord-icon{
  width: 20px;
  height: 16px;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.doc-icon svg {
  width: 18px;
  height: 18px;

}
</style>
