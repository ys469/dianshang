import { defineStore } from 'pinia';
import { apiClient, type HomePayload } from '../services/api';

export const useHomeStore = defineStore('home', {
  state: () => ({
    banners: [] as HomePayload['banners'],
    categories: [] as HomePayload['categories'],
    notice: '',
    sections: [] as HomePayload['sections']
  }),
  actions: {
    async fetchHome() {
      const payload = await apiClient.getHome();
      this.banners = payload.banners;
      this.categories = payload.categories;
      this.notice = payload.notice;
      this.sections = payload.sections;
    }
  }
});
