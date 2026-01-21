import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Ouve em todos os endereços de rede
    allowedHosts: true, // Permite qualquer host (necessário para ambientes de preview como EasyPanel)
  },
  preview: {
    allowedHosts: true, // Permite qualquer host no modo preview
  },
})