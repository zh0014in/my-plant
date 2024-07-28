<template>
    <div>
        <h1>TheAbout</h1>
        <p>{{ about }}</p>
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
export default defineComponent({
    data() {
        return {
            about: null
        };
    },
    methods: {
        async fetchData() {
            const response = await fetch("/about");
            this.about = await response.json();
        }
    },
    beforeMount(){
        this.fetchData();
    }
})
</script>

<style scoped>
/* Add your styles here */
</style>