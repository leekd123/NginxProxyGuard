import type { GlobalSettings } from '../../types/settings';

export interface TabContentProps {
  getValue: (key: keyof GlobalSettings) => string | number | boolean | undefined;
  getNumberValue: (key: keyof GlobalSettings, defaultValue?: number) => number;
  getStringValue: (key: keyof GlobalSettings, defaultValue?: string) => string;
  getBoolValue: (key: keyof GlobalSettings) => boolean;
  handleChange: (key: keyof GlobalSettings, value: string | number | boolean) => void;
}

export type TabType = 'worker' | 'http' | 'performance' | 'compression' | 'ssl' | 'timeout' | 'advanced';
