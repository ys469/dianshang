import { createPinia } from 'pinia';
import { createApp } from 'vue';
import H5PreviewApp from './h5-preview/App.vue';

const app = createApp(H5PreviewApp);

app.use(createPinia());
app.mount('#app');
