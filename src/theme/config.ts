export interface ThemeConfig {
  id: string;
  name: string;
  primaryColor: string;    // Used for active highlights, glowing buttons
  secondaryColor: string;  // Used for secondary elements, charts
  bgImage?: string;        // URL path to background image, undefined for default
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'default',
    name: 'Default Dark',
    primaryColor: '#2ED689',   // Neon Green
    secondaryColor: '#38BDF8', // Light Blue
  },
  {
    id: 'plants',
    name: 'Nature & Plants',
    primaryColor: '#4ADE80',   // Leaf Green
    secondaryColor: '#FDE047', // Sun Yellow
    bgImage: '/themes/plants.jpg'
  },
  {
    id: 'medical',
    name: 'Medical Room',
    primaryColor: '#2DD4BF',   // Teal
    secondaryColor: '#60A5FA', // Blue
    bgImage: '/themes/medical.jpg'
  },
  {
    id: 'robot',
    name: 'Cyber Factory',
    primaryColor: '#F43F5E',   // Neon Red/Pink
    secondaryColor: '#FB923C', // Cyber Orange
    bgImage: '/themes/robot.jpg'
  },
  {
    id: 'science',
    name: 'Sci-Fi Lab',
    primaryColor: '#C084FC',   // Neon Purple
    secondaryColor: '#22D3EE', // Cyan
    bgImage: '/themes/science.jpg'
  },
  {
    id: 'circuit',
    name: 'Circuit Board',
    primaryColor: '#F59E0B',   // Copper Orange
    secondaryColor: '#38BDF8', // Wire Blue
    bgImage: '/themes/circuit.jpg'
  },
  {
    id: 'home',
    name: 'Smart Home',
    primaryColor: '#FBBF24',   // Warm Amber
    secondaryColor: '#A78BFA', // Soft Purple
    bgImage: '/themes/home.jpg'
  }
];
