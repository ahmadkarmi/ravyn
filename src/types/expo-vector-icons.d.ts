declare module '@expo/vector-icons' {
  import type { ComponentType } from 'react';

  export interface IconProps {
    name: string;
    size?: number;
    color?: string;
    style?: any;
  }

  export const Ionicons: ComponentType<IconProps>;
}
