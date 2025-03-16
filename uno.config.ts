import { defineConfig, presetUno, presetIcons } from 'unocss'

export default defineConfig({
  presets: [
    presetUno({
      dark: 'class',
    }),
    presetIcons({
      scale: 1.2,
      cdn: 'https://esm.sh/'
    })
  ],
  shortcuts: {
    'btn': 'px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors',
    'btn-danger': 'px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600 transition-colors',
    'input-base': 'p-2 rounded border border-gray-300 focus:border-blue-500 outline-none',
  },
  theme: {
    animation: {
      keyframes: {
        'fade-in-down': '{from{opacity:0;transform:translate(-50%,-20px)}to{opacity:1;transform:translate(-50%,0)}}',
      },
      durations: {
        'fade-in-down': '0.3s',
      },
      timingFns: {
        'fade-in-down': 'ease-out',
      },
    },
  },
})
