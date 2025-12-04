import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  min?: number;
  max?: number;
  custom?: (value: any) => string | null;
}

export interface ValidationRules {
  [key: string]: ValidationRule;
}

export interface FormErrors {
  [key: string]: string;
}

export function useFormValidation<T extends Record<string, any>>(
  initialData: T,
  validationRules: ValidationRules = {}
) {
  const [formData, setFormData] = useState<T>(initialData);
  const [errors, setErrors] = useState<FormErrors>({});
  const { toast } = useToast();

  const validateField = useCallback((fieldName: string, value: any): string | null => {
    const rule = validationRules[fieldName];
    if (!rule) return null;

    // Required validation
    if (rule.required && (!value || value.toString().trim() === '')) {
      return `${getFieldLabel(fieldName)} é obrigatório`;
    }

    // Skip other validations if field is empty and not required
    if (!value || value.toString().trim() === '') {
      return null;
    }

    // String length validations
    if (typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        return `${getFieldLabel(fieldName)} deve ter pelo menos ${rule.minLength} caracteres`;
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        return `${getFieldLabel(fieldName)} deve ter no máximo ${rule.maxLength} caracteres`;
      }
    }

    // Pattern validation
    if (rule.pattern && !rule.pattern.test(value.toString())) {
      return getPatternErrorMessage(fieldName, rule.pattern);
    }

    // Number validations
    if (typeof value === 'number' || !isNaN(Number(value))) {
      const numValue = Number(value);
      if (rule.min !== undefined && numValue < rule.min) {
        return `${getFieldLabel(fieldName)} deve ser maior que ${rule.min}`;
      }
      if (rule.max !== undefined && numValue > rule.max) {
        return `${getFieldLabel(fieldName)} deve ser menor que ${rule.max}`;
      }
    }

    // Custom validation
    if (rule.custom) {
      return rule.custom(value);
    }

    return null;
  }, [validationRules]);

  const getFieldLabel = (fieldName: string): string => {
    const labels: { [key: string]: string } = {
      name: 'Nome completo',
      email: 'Email',
      password: 'Senha',
      confirmPassword: 'Confirmação de senha',
      whatsapp: 'WhatsApp',
      age: 'Idade',
      gender: 'Gênero',
      weight: 'Peso',
      profileType: 'Tipo de perfil',
      medicationName: 'Nome do medicamento',
      dosage: 'Dosagem',
      doctorName: 'Nome do médico',
      appointmentDate: 'Data da consulta',
      location: 'Local',
      glucose: 'Glicose',
      glucoseLevel: 'Nível de glicose',
      measurementType: 'Tipo de medição',
      systolic: 'Sistólica',
      diastolic: 'Diastólica',
      temperature: 'Temperatura',
      heartRate: 'Batimentos cardíacos',
      weight_reading: 'Peso',
      type: 'Tipo',
      testDate: 'Data e hora',
      startDate: 'Data de início',
      measuredAt: 'Data e hora da medição',
      notes: 'Observações'
    };
    return labels[fieldName] || fieldName;
  };

  const getPatternErrorMessage = (fieldName: string, pattern: RegExp): string => {
    if (fieldName === 'email') {
      return 'Email deve ter um formato válido';
    }
    if (fieldName === 'whatsapp') {
      return 'WhatsApp deve ter um formato válido';
    }
    return `${getFieldLabel(fieldName)} tem formato inválido`;
  };

  const validateForm = useCallback((): { isValid: boolean; errorCount: number, firstError: string | null, errors: FormErrors } => {
    const newErrors: Record<string, string> = {};
    let firstError: string | null = null;

    Object.keys(formData).forEach(fieldName => {
      const error = validateField(fieldName, formData[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
        if (!firstError) {
          firstError = error;
        }
      }
    });

    setErrors(newErrors);
    return { 
      isValid: Object.keys(newErrors).length === 0, 
      firstError,
      errors: newErrors
    };
  }, [formData, validateField]);

  const updateField = useCallback((fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));

    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  }, [errors]);

  const clearError = useCallback((fieldName: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  const resetForm = useCallback((newData?: T) => {
    setFormData(newData || initialData);
    setErrors({});
  }, [initialData]);

  return {
    formData,
    setFormData,
    errors,
    validateForm,
    updateField,
    clearError,
    clearAllErrors,
    resetForm,
    hasErrors: Object.keys(errors).length > 0
  };
}