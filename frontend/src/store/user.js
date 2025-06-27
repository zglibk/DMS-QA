import { defineStore } from 'pinia'
import axios from 'axios'

export const useUserStore = defineStore('user', {
  state: () => ({
    user: {
      Username: '',
      RealName: '',
      Avatar: '',
      Email: '',
      Phone: '',
      Department: '',
      Role: '',
      CreatedAt: ''
    }
  }),
  actions: {
    async fetchProfile() {
      const token = localStorage.getItem('token')
      const res = await axios.get('/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data.success) {
        this.user = res.data.data
      }
    },
    setUser(data) {
      this.user = { ...this.user, ...data }
    }
  }
})