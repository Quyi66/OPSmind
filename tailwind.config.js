/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // OpsMind 主色调
        primary: {
          50: '#e6f4ff',
          100: '#bae7ff',
          200: '#91d5ff',
          300: '#69c0ff',
          400: '#40a9ff',
          500: '#1890ff', // 主蓝色
          600: '#096dd9',
          700: '#0050b3',
          800: '#003a8c',
          900: '#002766'
        },
        // OpsMind 辅助色 - 蓝色
        blue: {
          50: '#e8f4ff',
          100: '#d1e9ff',
          200: '#a6d2ff',
          300: '#7bb8ff',
          400: '#509eff',
          500: '#2D8CF0', // 主要蓝色
          600: '#1c7ed6',
          700: '#1864ab',
          800: '#145a80',
          900: '#0f4c75'
        },
        // OpsMind 成功色 - 绿色
        success: {
          50: '#f6ffed',
          100: '#d9f7be',
          200: '#b7eb8f',
          300: '#95de64',
          400: '#73d13d',
          500: '#52c41a', // 主绿色
          600: '#389e0d',
          700: '#237804',
          800: '#135200',
          900: '#092b00'
        },
        // OpsMind 品牌绿色
        green: {
          50: '#f0f9f0',
          100: '#d9f2d9',
          200: '#b3e6b3',
          300: '#8cd98c',
          400: '#66cc66',
          500: '#19BE6B', // 主要绿色
          600: '#16a85a',
          700: '#139249',
          800: '#107c38',
          900: '#0d6627'
        },
        // 警告色 - 橙色
        warning: {
          50: '#fff7e6',
          100: '#ffe7ba',
          200: '#ffd591',
          300: '#ffc069',
          400: '#ffab40',
          500: '#ff9500', // 主橙色
          600: '#d48806',
          700: '#ad6800',
          800: '#874d00',
          900: '#613400'
        },
        // 错误色 - 红色
        error: {
          50: '#fff1f0',
          100: '#ffccc7',
          200: '#ffa39e',
          300: '#ff7875',
          400: '#ff4d4f',
          500: '#f5222d', // 主红色
          600: '#cf1322',
          700: '#a8071a',
          800: '#820014',
          900: '#5c0011'
        },
        // 中性色
        gray: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#f0f0f0',
          300: '#d9d9d9',
          400: '#bfbfbf',
          500: '#8c8c8c',
          600: '#595959',
          700: '#434343',
          800: '#262626',
          900: '#1f1f1f'
        }
      },
      animation: {
        float: 'float 3s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        }
      },
      boxShadow: {
        card: '0 2px 8px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 16px rgba(0, 0, 0, 0.1)',
        nav: '0 2px 4px rgba(0, 0, 0, 0.1)'
      },
      borderRadius: {
        card: '8px'
      }
    }
  },
  plugins: []
}
