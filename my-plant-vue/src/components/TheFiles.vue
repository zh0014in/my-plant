<template>
    <div class="TheFiles">
        <h1>Files</h1>
        <p>
            <li v-for="item in files">
            {{ item }}
            </li>
        </p>
        <button @click="viewTestFile">View test file</button>
        {{ testfile }}
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
export default defineComponent({
    data() {
        return {
            files: [],
            testfile: null
        };
    },
    methods: {
        async fetchData() {
            const response = await fetch("/files");
            this.files = await response.json();
        },
        async viewTestFile() {
            const response = await fetch("/testfile");
            this.testfile = await response.json();
        }
    },
    beforeMount(){
        this.fetchData();
    }
});
</script>

<style scoped>
/* Add your styles here */
</style>