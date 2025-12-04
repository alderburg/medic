
import React from "react";

interface DesktopPageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export default function DesktopPageHeader({ title, subtitle, children }: DesktopPageHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
        </div>
        {children && <div className="flex items-center gap-4">{children}</div>}
      </div>
    </div>
  );
}
