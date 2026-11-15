'use client';

import React, { useState } from 'react';
import { LucideIcon, Plus, Info, Sparkles, Filter, RefreshCw } from 'lucide-react';
import { PageHeader } from './ui/PageHeader';
import { PrimaryButton, SecondaryButton } from './ui/Buttons';
import { SearchInput, FilterBar } from './ui/SearchInput';
import { EmptyState } from './ui/EmptyState';
import { FormSection, FormField } from './ui/FormComponents';

export interface ModuleShellViewProps {
  moduleId: string;
  moduleName: string;
  category: string;
  icon: LucideIcon;
  description: string;
  itemTypeLabel: string;
  fields?: { name: string; label: string; type?: string; placeholder?: string; required?: boolean }[];
}

export const ModuleShellView: React.FC<ModuleShellViewProps> = ({
  moduleId,
  moduleName,
  category,
  icon: Icon,
  description,
  itemTypeLabel,
  fields = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <PageHeader
        title={moduleName}
        description={description}
        breadcrumbs={[{ label: category }, { label: moduleName }]}
        badge={
          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#EDF5FD] text-[#2075E8] border border-[#B8D8FA]">
            UI Foundation Shell
          </span>
        }
        actions={
          <PrimaryButton
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsPreviewModalOpen(true)}
          >
            Add {itemTypeLabel}
          </PrimaryButton>
        }
      />

      {/* FILTER & SEARCH BAR */}
      <FilterBar
        actions={
          <SecondaryButton
            size="sm"
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={() => setSearchTerm('')}
          >
            Reset
          </SecondaryButton>
        }
      >
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder={`Search ${moduleName.toLowerCase()}...`}
          className="w-full sm:w-80"
        />
      </FilterBar>

      {/* MAIN CONTAINER / STANDARDIZED EMPTY STATE */}
      <div className="bg-white rounded-xl border border-[#E3E8F0] shadow-subtle p-8 sm:p-12">
        <EmptyState
          icon={Icon}
          title={`No ${moduleName} Records Found`}
          description={`${description} Standardized UI controls and layouts are initialized. Backend database persistence will be integrated in its designated feature sprint.`}
          actionLabel={`Preview Create ${itemTypeLabel} Modal`}
          onAction={() => setIsPreviewModalOpen(true)}
        />
      </div>

      {/* PREVIEW FORM MODAL (SHOWCASING REUSABLE FORMSECTIONS & FORMFIELDS) */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#14233F]/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-[#E3E8F0] shadow-elevated max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#EDF1F7]">
              <div>
                <h3 className="text-sm font-bold text-[#172B4D]">
                  New {itemTypeLabel}
                </h3>
                <p className="text-[11px] text-[#6B7890] mt-0.5">
                  Standardized SaaS Form Section & Field Foundation
                </p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#FEF8EC] text-[#E6A23C] border border-[#FBDCA6]">
                Preview Mode
              </span>
            </div>

            <div className="p-3 bg-[#F6F8FC] border border-[#E3E8F0] rounded-lg text-xs text-[#6B7890] flex items-start gap-2">
              <Info className="w-4 h-4 text-[#1455C0] shrink-0 mt-0.5" />
              <span>
                <b>UI Foundation Only:</b> This modal displays the standardized input styling and layout. Backend CRUD persistence will be implemented in its respective phase without modifying existing production data.
              </span>
            </div>

            <div className="space-y-4 py-2">
              {fields.length > 0 ? (
                fields.map((f, i) => (
                  <FormField
                    key={i}
                    label={f.label}
                    required={f.required}
                  >
                    {f.type === 'textarea' ? (
                      <textarea
                        rows={3}
                        placeholder={f.placeholder || `Enter ${f.label.toLowerCase()}...`}
                        className="w-full p-3 bg-white border border-[#E3E8F0] rounded-lg text-xs text-[#172B4D] focus:outline-none focus:border-[#1455C0]"
                      />
                    ) : (
                      <input
                        type={f.type || 'text'}
                        placeholder={f.placeholder || `Enter ${f.label.toLowerCase()}...`}
                        className="w-full px-3 py-2 bg-white border border-[#E3E8F0] rounded-lg text-xs text-[#172B4D] focus:outline-none focus:border-[#1455C0]"
                      />
                    )}
                  </FormField>
                ))
              ) : (
                <>
                  <FormField label={`${itemTypeLabel} Title / Name`} required>
                    <input
                      type="text"
                      placeholder={`Enter ${itemTypeLabel.toLowerCase()} title...`}
                      className="w-full px-3 py-2 bg-white border border-[#E3E8F0] rounded-lg text-xs text-[#172B4D] focus:outline-none focus:border-[#1455C0]"
                    />
                  </FormField>
                  <FormField label="Description / Summary">
                    <textarea
                      rows={3}
                      placeholder={`Enter ${itemTypeLabel.toLowerCase()} description...`}
                      className="w-full p-3 bg-white border border-[#E3E8F0] rounded-lg text-xs text-[#172B4D] focus:outline-none focus:border-[#1455C0]"
                    />
                  </FormField>
                </>
              )}
            </div>

            <div className="pt-3 border-t border-[#EDF1F7] flex items-center justify-end gap-2">
              <SecondaryButton
                size="sm"
                onClick={() => setIsPreviewModalOpen(false)}
              >
                Close Preview
              </SecondaryButton>
              <PrimaryButton
                size="sm"
                onClick={() => {
                  alert('UI Foundation: Form structure validated. Backend API will connect in future sprint.');
                  setIsPreviewModalOpen(false);
                }}
              >
                Save (UI Preview)
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
