import React from 'react';
import { X, Loader2 } from 'lucide-react';

export interface FieldConfig<T> {
  label: string;
  key: keyof T;
  type?: 'text' | 'tel' | 'email' | 'number' | 'select';
  options?: { label: string; value: string | number }[];
  colSpan?: number;
  disabled?: boolean;
  disabledPlaceholder?: string;
}

interface ModalFormProps<T> {
  title: string;
  isOpen: boolean;
  initialData: Partial<T>;
  fields: FieldConfig<T>[];
  onClose: () => void;
  onSave: (data: Partial<T>) => Promise<void>;
  submitButtonText?: string;
  submitButtonColor?: string;
}

export function ModalForm<T extends Record<string, any>>({
  title,
  isOpen,
  initialData,
  fields,
  onClose,
  onSave,
  submitButtonText = 'Save',
  submitButtonColor = '#2563EB',
}: ModalFormProps<T>) {
  const [form, setForm] = React.useState<Partial<T>>(initialData);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setForm(initialData);
  }, [initialData]);

  if (!isOpen) return null;

  const handleChange = (key: keyof T, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveClick = async () => {
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-[95vw] md:w-full md:max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map((field) => {
            const val = form[field.key] ?? '';
            const isSelect = field.type === 'select';
            const colSpanClass = field.colSpan === 2 ? 'col-span-1 md:col-span-2' : 'col-span-1';

            return (
              <div key={String(field.key)} className={colSpanClass}>
                <label className="block text-xs font-medium text-slate-600 mb-1">{field.label}</label>
                {isSelect ? (
                  <select
                    value={String(val)}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const parsed = field.options?.find((o) => String(o.value) === raw)?.value ?? raw;
                      handleChange(field.key, parsed);
                    }}
                    disabled={field.disabled}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none bg-slate-50 disabled:opacity-50"
                  >
                    {field.disabled && field.disabledPlaceholder && (
                      <option value="">{field.disabledPlaceholder}</option>
                    )}
                    {field.options?.map((opt) => (
                      <option key={String(opt.value)} value={String(opt.value)}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type || 'text'}
                    value={String(val)}
                    onChange={(e) =>
                      handleChange(
                        field.key,
                        field.type === 'number' ? Number(e.target.value) : e.target.value
                      )
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent bg-slate-50"
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="px-4 md:px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-2">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={saving}
            onClick={handleSaveClick}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: submitButtonColor }}
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
              </>
            ) : (
              submitButtonText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
