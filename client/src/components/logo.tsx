import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 24 }) => {
  return (
    <img
      src="/images/meu-cuidador-logo.png"
      alt="Meu Cuidador Logo"
      width={size}
      height={size}
      className={`${className} rounded-xl`}
      style={{ objectFit: 'cover' }}
    />
  );
};

export const LogoIcon: React.FC<LogoProps> = ({ className = '', size = 24 }) => {
  return (
    <img
      src="/images/meu-cuidador-logo.png"
      alt="Meu Cuidador Logo"
      width={size}
      height={size}
      className={`${className} rounded-xl`}
      style={{ objectFit: 'cover' }}
    />
  );
};