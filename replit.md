# MeuCuidador - Sistema Enterprise de Gestão Médica

## Overview

Sistema completo de gestão médica empresarial com funcionalidades avançadas de notificações, agendamentos, prescrições e auditoria. O sistema utiliza tecnologias modernas como React, Node.js, PostgreSQL e WebSocket para comunicação em tempo real. Atualmente executando com sistema de notificações enterprise ativo e 163 notificações no banco.

## User Preferences

Preferred communication style: Simple, everyday language (Portuguese).

## System Architecture

The application is built with a modern web architecture focusing on a responsive and user-friendly experience.

**Frontend:**
-   **Framework:** React with TypeScript.
-   **State Management:** React Query for efficient server state management, including caching and optimistic updates.
-   **Routing:** Wouter for lightweight client-side navigation.
-   **Styling:** Tailwind CSS with custom CSS variables for flexible theming and shadcn/ui components built on Radix UI primitives for a consistent and accessible UI.
-   **Design Principles:** Mobile-first approach, modular component design, comprehensive design system with dark/light theme support, and a mobile app-like bottom navigation pattern.
-   **UI/UX:** Material Design-inspired components, accessible design patterns, toast notifications, modal dialogs, sheet components, and robust form validation.
-   **Authentication:** JWT-based authentication with token management (refresh, error handling) and protected routes.
-   **API Communication:** Axios-based HTTP client with interceptors for seamless backend interaction.

**Core Technical Implementations:**
-   **User Context Management:** Supports profile switching for caregivers to view different patient data.
-   **Data Flow:** Authentication handles JWT storage and API header configuration. Data fetching leverages React Query for caching, background updates, and optimistic mutations. User interactions trigger mutations with visual feedback (toasts).
-   **Performance Optimization:** Implements lazy loading for medical data and intelligent caching to reduce initial load times, especially for caregivers.
-   **Desktop Layout:** Features a professional desktop layout with a collapsible sidebar and dedicated desktop components.
-   **Form Handling:** Comprehensive validation system across all forms using `useFormValidation` hook.
-   **File Management:** Supports file uploads for exams and prescriptions with previews, progress bars, and optimized storage.
-   **Reporting:** Generates professional PDF reports with detailed adherence charts, recent activities, and customization options.
-   **Visual Identity:** Uses a custom "MeuCuidador" logo and consistent branding across the application.
-   **Dynamic Content:** Includes carousels for quick actions and dynamic status badges.
-   **Enterprise Notification System:** Implemented a scalable notification system with batch processing, precise timing for medication, appointment, and exam reminders, and real-time distribution via WebSockets. It includes audit logging, performance metrics, and rate limiting.
-   **Audit Logging:** Comprehensive audit logging with capture of `before_state`, `after_state`, `user_id`, `ip_address`, `user_agent`, and `session_id` for compliance.
-   **Unified Doctor Dashboard:** Consolidated `/doctor-dashboard` route into `/home`, with intelligent rendering based on user roles and support for patient context URLs.
-   **Route Restructuring:** Changed the main patient overview route from `/prontuario` to `/visao-geral` with corresponding navigation label update from "Inicio" to "Visão Geral". The `/prontuario` route is now available for future dedicated medical record functionality.
-   **Inline Exam Requisition Form:** Implemented a comprehensive inline form in the tests screen at `/tests?tab=requisicoes` route. The form hides the requisitions list when opened, allows creating new exam requisitions with all necessary fields (patient selection, exam details, clinical indication, urgency levels, validity dates), and enables editing existing requisitions by clicking on them. Includes full CRUD operations, form validation, and click-to-edit functionality for medical professionals.

**Feature Specifications:**
-   **Medication Management:** Scheduling, adherence tracking, historical logs with detailed status and reasons.
-   **Appointment & Exam Management:** Scheduling, status tracking, and document uploads.
-   **Vital Signs Monitoring:** Tracking and logging of blood pressure, glucose, heart rate, temperature, and weight, with dedicated forms and statistics.
-   **Patient/Caregiver System:** Allows caregivers to manage multiple patients, with a robust patient selection and context-switching mechanism.
-   **Notifications:** System for medication reminders and other health-related alerts.
-   **User Profiles:** Editable user profiles with photo upload and diverse profile types (Patient, Caregiver, Doctor, Family, Nurse).

## External Dependencies

**Core Framework Dependencies:**
-   React
-   TypeScript
-   Wouter
-   @tanstack/react-query
-   Axios

**UI/UX Dependencies:**
-   Tailwind CSS
-   Radix UI
-   Lucide React (for icons)
-   date-fns (for date manipulation)
-   class-variance-authority (for component variants)