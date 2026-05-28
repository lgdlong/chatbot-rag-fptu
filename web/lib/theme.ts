import { createTheme } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'deepBlue',
  primaryShade: 7,
  colors: {
    deepBlue: [
      '#e6f0ff',
      '#ccdeff',
      '#99bcff',
      '#6699ff',
      '#3377ff',
      '#0055ff',
      '#0044cc',
      '#003399', // primary shade
      '#002266',
      '#001f3f', // dark navy
    ],
    gold: [
      '#fffce6',
      '#fff8cc',
      '#fff199',
      '#ffea66',
      '#ffe333',
      '#ffdc00', // gold
      '#ccb000',
      '#998400',
      '#665800',
      '#332c00',
    ],
  },
  defaultRadius: 'xs', // Sắc cạnh, border-radius cực nhỏ tạo cảm giác Premium
  fontFamily: 'var(--font-roboto), Arial, Helvetica, sans-serif',
});
