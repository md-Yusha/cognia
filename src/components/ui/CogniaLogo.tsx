import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, G } from 'react-native-svg';

interface CogniaLogoProps {
  size?: number;
}

export const CogniaLogo: React.FC<CogniaLogoProps> = ({ size = 56 }) => {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <Defs>
          {/* Main Leaf Gradient */}
          <LinearGradient id="cogniaGreen" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#22C55E" />
            <Stop offset="60%" stopColor="#16704A" />
            <Stop offset="100%" stopColor="#0E442B" />
          </LinearGradient>

          {/* Neural Gold/Amber Accent */}
          <LinearGradient id="cogniaAmber" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FBBF24" />
            <Stop offset="100%" stopColor="#D97706" />
          </LinearGradient>

          {/* Soft Sage Leaf Accent */}
          <LinearGradient id="cogniaSage" x1="0%" y1="100%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#16704A" />
            <Stop offset="100%" stopColor="#86EFAC" />
          </LinearGradient>
        </Defs>

        <G>
          {/* Left Brain Lobe formed by an Assam Tea Leaf arc */}
          <Path
            d="M 50 18 C 30 18 16 32 16 50 C 16 66 28 80 46 84 C 44 74 44 60 48 50 C 42 48 34 42 36 34 C 38 28 46 28 50 32 Z"
            fill="url(#cogniaGreen)"
          />

          {/* Right Brain Lobe / Upward Flourishing Sprout */}
          <Path
            d="M 50 18 C 70 18 84 32 84 50 C 84 66 72 80 54 84 C 56 74 56 60 52 50 C 58 48 66 42 64 34 C 62 28 54 28 50 32 Z"
            fill="url(#cogniaSage)"
          />

          {/* Central Stem & Growth Path */}
          <Path
            d="M 50 86 Q 49 52 50 14"
            stroke="#145332"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Neural Synapse Nodes (Cognitive Memory Dots) */}
          <Circle cx="32" cy="42" r="3.5" fill="url(#cogniaAmber)" />
          <Circle cx="26" cy="56" r="3" fill="url(#cogniaAmber)" />
          <Circle cx="36" cy="70" r="3.2" fill="url(#cogniaAmber)" />

          <Circle cx="68" cy="42" r="3.5" fill="url(#cogniaAmber)" />
          <Circle cx="74" cy="56" r="3" fill="url(#cogniaAmber)" />
          <Circle cx="64" cy="70" r="3.2" fill="url(#cogniaAmber)" />

          {/* Synapse Connecting Pathways */}
          <Path
            d="M 32 42 Q 28 50 26 56 T 36 70"
            stroke="#FDE68A"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeDasharray="2,3"
          />

          <Path
            d="M 68 42 Q 72 50 74 56 T 64 70"
            stroke="#FDE68A"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeDasharray="2,3"
          />

          {/* Crown Sprout / Golden Light of Memory */}
          <Circle cx="50" cy="14" r="4.5" fill="url(#cogniaAmber)" />
        </G>
      </Svg>
    </View>
  );
};
