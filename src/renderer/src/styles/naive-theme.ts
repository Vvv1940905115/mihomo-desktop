import { darkTheme, lightTheme, type GlobalThemeOverrides } from 'naive-ui'

const accentOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#55E6C1',
    primaryColorHover: '#6feccd',
    primaryColorPressed: '#3ecfaa',
    primaryColorSuppl: '#55E6C1',
    borderRadius: '18px',
    borderRadiusSmall: '10px'
  },
  Switch: {
    railColorActive: '#55E6C1'
  }
}

export const darkThemeOverrides: GlobalThemeOverrides = {
  common: {
    ...accentOverrides.common,
    bodyColor: '#1F2025',
    cardColor: '#2A2D35',
    modalColor: '#2A2D35',
    popoverColor: '#2A2D35',
    tableColor: '#2A2D35',
    tableHeaderColor: '#23262C',
    inputColor: '#1F2025',
    borderColor: '#3A3E48',
    dividerColor: '#3A3E48',
    textColorBase: '#E6E8EC',
    textColor1: '#E6E8EC',
    textColor2: '#B7BCC6',
    textColor3: '#8A8F9C'
  },
  Menu: {
    itemColorActive: 'rgba(85, 230, 193, 0.12)',
    itemColorActiveHover: 'rgba(85, 230, 193, 0.18)',
    itemTextColor: '#8A8F9C',
    itemTextColorActive: '#55E6C1',
    itemIconColor: '#8A8F9C',
    itemIconColorActive: '#55E6C1'
  },
  Switch: accentOverrides.Switch
}

export const lightThemeOverrides: GlobalThemeOverrides = {
  common: { ...accentOverrides.common },
  Switch: accentOverrides.Switch
}

export { darkTheme, lightTheme }
