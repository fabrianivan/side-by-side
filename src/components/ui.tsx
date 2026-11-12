import React from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * Kepala halaman seragam: lencana kecil (opsional), judul, deskripsi, dan aksi utama.
 * Ditaruh langsung di atas kanvas (bukan di dalam kartu) agar hierarki halaman terbaca jelas.
 */
export const PageHeader: React.FC<{
  eyebrow?: React.ReactNode;
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}> = ({ eyebrow, icon: Icon, title, description, actions, children }) => (
  <header className="space-y-4">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-2.5 min-w-0">
        {eyebrow && (
          <div className="badge badge-teal max-w-full">
            {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
            <span className="truncate">{eyebrow}</span>
          </div>
        )}
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-lead">{description}</p>}
      </div>
      {actions && <div className="no-print flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
    {children}
  </header>
);
