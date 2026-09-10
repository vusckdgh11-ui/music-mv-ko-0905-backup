import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import zhCN from './zh-CN.json'
import en from './en.json'
import ko from './ko.json'

const savedLang = localStorage.getItem('lang') || 'ko'

i18n.use(initReactI18next).init({
  resources: {
    ko: { translation: ko },
    'zh-CN': { translation: zhCN },
    en: { translation: en },
  },
  lng: savedLang,
  fallbackLng: 'ko',
  interpolation: { escapeValue: false },
})

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('lang', lng)
  document.documentElement.lang = lng
})

document.documentElement.lang = i18n.language

export default i18n
