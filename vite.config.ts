import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default {
  server: {
    host: true
  }
},
  preview: {
    allowedHosts: true, // Permite qualquer host no modo preview
  },
})
