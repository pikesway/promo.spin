import {
  FiHeart, FiStar, FiAward, FiCoffee, FiGift, FiMusic,
  FiSun, FiMoon, FiCloud, FiDroplet, FiFeather, FiAnchor,
  FiZap, FiUmbrella, FiShoppingBag, FiCamera
} from 'react-icons/fi';
import { LuWine, LuPizza, LuScissors } from 'react-icons/lu';

export const LOYALTY_ICONS = [
  { id: 'heart', name: 'Heart', icon: FiHeart, color: '#EF4444' },
  { id: 'star', name: 'Star', icon: FiStar, color: '#F59E0B' },
  { id: 'award', name: 'Award', icon: FiAward, color: '#8B5CF6' },
  { id: 'coffee', name: 'Coffee', icon: FiCoffee, color: '#92400E' },
  { id: 'wine', name: 'Wine', icon: LuWine, color: '#7C3AED' },
  { id: 'pizza', name: 'Pizza', icon: LuPizza, color: '#EA580C' },
  { id: 'gift', name: 'Gift', icon: FiGift, color: '#EC4899' },
  { id: 'music', name: 'Music', icon: FiMusic, color: '#06B6D4' },
  { id: 'sun', name: 'Sun', icon: FiSun, color: '#FBBF24' },
  { id: 'moon', name: 'Moon', icon: FiMoon, color: '#6366F1' },
  { id: 'cloud', name: 'Cloud', icon: FiCloud, color: '#94A3B8' },
  { id: 'droplet', name: 'Droplet', icon: FiDroplet, color: '#3B82F6' },
  { id: 'feather', name: 'Feather', icon: FiFeather, color: '#10B981' },
  { id: 'anchor', name: 'Anchor', icon: FiAnchor, color: '#475569' },
  { id: 'zap', name: 'Lightning', icon: FiZap, color: '#EAB308' },
  { id: 'umbrella', name: 'Umbrella', icon: FiUmbrella, color: '#F43F5E' },
  { id: 'shopping', name: 'Shopping', icon: FiShoppingBag, color: '#14B8A6' },
  { id: 'camera', name: 'Camera', icon: FiCamera, color: '#64748B' },
  { id: 'scissors', name: 'Scissors', icon: LuScissors, color: '#71717A' }
];

export const getIconById = (id) => {
  return LOYALTY_ICONS.find(icon => icon.id === id);
};

export const getRandomIcons = (count, excludeIds = []) => {
  const available = LOYALTY_ICONS.filter(icon => !excludeIds.includes(icon.id));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

export const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};
