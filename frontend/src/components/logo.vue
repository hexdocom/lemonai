<template>
    <div class="logo-title">
        <img class="logo" :src="LemonAI" alt="logo" />
        <!-- <span class="beta-tag">Beta</span> -->
    </div>
</template>
<script setup> 
import LemonAI from '@/assets/LemonAI.png'
</script>
<style scoped> 
.logo-title {
    font-size: 36px;
    font-weight: 600;
    color: #333;
    line-height: 1.2;
}

.logo-title .logo {
    width: 110px;
    height: 48px;
}

.beta-tag {
    font-size: 11px;
    background-color: #FFD43B;
    color: #fff;
    padding: 2px;
    border-radius: 8px;
    margin-left: 8px;
}

</style>