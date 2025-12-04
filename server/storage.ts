import { 
  users, 
  medications, 
  medicationSchedules, 
  medicationLogs,
  medicationHistory, 
  appointments, 
  tests, 
  examRequests,
  prescriptions, 
  notifications,
  globalNotifications,
  userNotifications,
  notificationJobs,
  notificationAuditLog,
  careRelationships,
  bloodPressureReadings,
  glucoseReadings,
  heartRateReadings,
  temperatureReadings,
  weightReadings,
  medicalEvolutions,
  healthInsurances,
  paymentMethods,
  notificationRateLimit,
  notificationMetrics,
  type User, 
  type InsertUser,
  type Medication,
  type InsertMedication,
  type MedicationSchedule,
  type InsertMedicationSchedule,
  type MedicationLog,
  type InsertMedicationLog,
  type MedicationHistory,
  type InsertMedicationHistory,
  type Appointment,
  type InsertAppointment,
  type Test,
  type InsertTest,
  type ExamRequest,
  type InsertExamRequest,
  type Prescription,
  type InsertPrescription,
  type Notification,
  type InsertNotification,
  type CareRelationship,
  type BloodPressureReading,
  type InsertBloodPressureReading,
  type GlucoseReading,
  type InsertGlucoseReading,
  type HeartRateReading,
  type InsertHeartRateReading,
  type TemperatureReading,
  type InsertTemperatureReading,
  type WeightReading,
  type InsertWeightReading,
  type MedicalEvolution,
  type InsertMedicalEvolution,
  type HealthInsurance, 
  type InsertHealthInsurance,
  type PaymentMethod,
  type InsertPaymentMethod,
  type GlobalNotification,
  type InsertGlobalNotification,
  type UserNotification,
  type InsertUserNotification,
  type NotificationJob,
  type InsertNotificationJob
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, asc, ne, sql, isNotNull, or, count, avg, like, inArray, max, min, lt } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;

  // Medication methods
  getMedicationsByPatient(patientId: number): Promise<Medication[]>;
  getMedicationById(id: number): Promise<Medication | undefined>;
  createMedication(medication: InsertMedication): Promise<Medication>;
  updateMedication(id: number, medication: Partial<InsertMedication>): Promise<Medication | undefined>;
  deleteMedication(id: number): Promise<boolean>;
  checkMedicationHasTakenLogs(medicationId: number): Promise<boolean>;
  inactivateMedication(id: number): Promise<boolean>;
  reactivateMedication(id: number): Promise<boolean>;

  // Medication schedule methods
  getSchedulesByMedication(medicationId: number): Promise<MedicationSchedule[]>;
  createMedicationSchedule(schedule: InsertMedicationSchedule): Promise<MedicationSchedule>;
  deleteSchedulesByMedication(medicationId: number): Promise<boolean>;

  // Medication log methods
  getMedicationLogs(patientId: number, startDate?: Date | null, endDate?: Date): Promise<MedicationLog[]>;
  getMedicationLogById(id: number): Promise<MedicationLog | undefined>;
  createMedicationLog(log: InsertMedicationLog): Promise<MedicationLog>;
  updateMedicationLog(id: number, log: Partial<InsertMedicationLog>): Promise<MedicationLog | undefined>;
  deleteMedicationLog(id: number): Promise<boolean>;
  checkLogHasHistory(logId: number): Promise<boolean>;
  getTodayMedicationLogs(patientId: number): Promise<MedicationLog[]>;
  markMedicationLogAsTaken(logId: number, userId: number): Promise<MedicationLog | undefined>;

  // Medication history methods
  getMedicationHistoryByPatient(patientId: number): Promise<MedicationHistory[]>;
  getMedicationHistoryByMedication(medicationId: number, patientId: number): Promise<MedicationHistory[]>;
  createMedicationHistory(history: InsertMedicationHistory): Promise<MedicationHistory>;
  updateMedicationHistory(id: number, history: Partial<InsertMedicationHistory>): Promise<MedicationHistory | undefined>;
  deleteMedicationHistory(id: number): Promise<boolean>;

  // Appointment methods
  getAppointmentsByPatient(patientId: number): Promise<Appointment[]>;
  getAllAppointments(): Promise<Appointment[]>;
  getAppointmentById(id: number): Promise<Appointment | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: number, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: number): Promise<boolean>;

  // Test methods
  getTestsByPatient(patientId: number): Promise<Test[]>;
  getAllTests(): Promise<Test[]>;
  getTestById(id: number): Promise<Test | undefined>;
  createTest(test: InsertTest): Promise<Test>;
  updateTest(id: number, test: Partial<Test>): Promise<Test>;
  deleteTest(id: number): Promise<boolean>;
  getTestsListByPatient(patientId: number): Promise<any[]>;

  // Exam Request methods
  getExamRequestsByPatient(patientId: number): Promise<ExamRequest[]>;
  getExamRequestById(id: number): Promise<ExamRequest | undefined>;
  createExamRequest(examRequest: InsertExamRequest): Promise<ExamRequest>;
  updateExamRequest(id: number, examRequest: Partial<InsertExamRequest>): Promise<ExamRequest | undefined>;
  deleteExamRequest(id: number): Promise<boolean>;


  // Prescription methods
  getPrescriptionsByPatient(patientId: number): Promise<Prescription[]>;
  getPrescriptionById(id: number): Promise<Prescription | undefined>;
  createPrescription(prescription: InsertPrescription): Promise<Prescription>;
  updatePrescription(id: number, prescription: Partial<InsertPrescription>): Promise<Prescription | undefined>;
  deletePrescription(id: number): Promise<boolean>;
  getPrescriptionsListByPatient(patientId: number): Promise<any[]>;

  // Notification methods (legacy)
  getNotificationsByUser(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<boolean>;
  markAllNotificationsAsRead(userId: number): Promise<boolean>;
  deleteNotification(id: number): Promise<boolean>;
  deleteAllReadNotifications(userId: number): Promise<boolean>;

  // ENTERPRISE NOTIFICATION METHODS
  createGlobalNotification(notification: InsertGlobalNotification): Promise<GlobalNotification>;
  updateGlobalNotification(id: number, update: Partial<InsertGlobalNotification>): Promise<void>;
  hasActiveGlobalNotificationToday(patientId: number, type: string, relatedId: number): Promise<boolean>;
  getUserNotificationsByUserId(userId: number, limit?: number, offset?: number): Promise<any[]>;
  markUserNotificationAsRead(id: number): Promise<boolean>;
  getUserNotificationSummary(userId: number): Promise<any>;
  createUserNotification(notification: InsertUserNotification): Promise<UserNotification>;
  getAllUsersWithPatientAccess(patientId: number): Promise<any[]>;
  getTotalActivePatients(): Promise<number>;
  getActivePatientsInBatch(offset: number, limit: number): Promise<any[]>;
  countGlobalNotificationsInPeriod(startDate: Date, endDate: Date): Promise<number>;
  countDistributedNotificationsInPeriod(startDate: Date, endDate: Date): Promise<number>;
  countReadNotificationsInPeriod(startDate: Date, endDate: Date): Promise<number>;
  countNotificationsByTypeInPeriod(type: string, startDate: Date, endDate: Date): Promise<number>;
  countActivePatientsInPeriod(startDate: Date, endDate: Date): Promise<number>;
  countActiveUsersInPeriod(startDate: Date, endDate: Date): Promise<number>;
  getAverageJobProcessingTimeInPeriod(startDate: Date, endDate: Date): Promise<number>;
  getFailedNotificationsSince(cutoffTime: Date): Promise<any[]>;
  createNotificationJob(job: InsertNotificationJob): Promise<NotificationJob>;
  updateNotificationJobByJobId(jobId: string, update: Partial<InsertNotificationJob>): Promise<void>;

  // Care relationship methods
  getCareRelationships(userId: number): Promise<CareRelationship[]>;
  createCareRelationship(patientId: number, caregiverId: number): Promise<CareRelationship>;
  getPatientsByCaregiver(caregiverId: number): Promise<User[]>;
  getCaregiversByPatient(patientId: number): Promise<User[]>;

  // 🗃️ MÉTODO OTIMIZADO: Dados básicos do paciente
  getPatientBasicData(patientId: number): Promise<{
    id: number;
    name: string;
    email: string;
    age?: number;
    photo?: string;
    weight?: number;
    profileType: string;
  } | null>;

  // Vital Signs methods
  getBloodPressureReadings(patientId: number): Promise<BloodPressureReading[]>;
  getBloodPressureReadingById(id: number): Promise<BloodPressureReading | undefined>;
  createBloodPressureReading(reading: InsertBloodPressureReading): Promise<BloodPressureReading>;
  updateBloodPressureReading(id: number, data: Partial<InsertBloodPressureReading>): Promise<BloodPressureReading | null>;
  deleteBloodPressureReading(id: number): Promise<boolean>;
  getBloodPressureByEvolution(medicalEvolutionId: number): Promise<BloodPressureReading[]>;

  getGlucoseReadings(patientId: number): Promise<GlucoseReading[]>;
  getGlucoseReadingById(id: number): Promise<GlucoseReading | undefined>;
  createGlucoseReading(reading: InsertGlucoseReading): Promise<GlucoseReading>;
  updateGlucoseReading(id: number, data: Partial<InsertGlucoseReading>): Promise<GlucoseReading | null>;
  deleteGlucoseReading(id: number): Promise<boolean>;
  getGlucoseByEvolution(medicalEvolutionId: number): Promise<GlucoseReading[]>;

  getHeartRateReadings(patientId: number): Promise<HeartRateReading[]>;
  getHeartRateReadingById(id: number): Promise<HeartRateReading | undefined>;
  createHeartRateReading(reading: InsertHeartRateReading): Promise<HeartRateReading>;
  updateHeartRateReading(id: number, data: Partial<InsertHeartRateReading>): Promise<HeartRateReading | null>;
  deleteHeartRateReading(readingId: number): Promise<boolean>;
  getHeartRateByEvolution(medicalEvolutionId: number): Promise<HeartRateReading[]>;

  getTemperatureReadings(patientId: number): Promise<TemperatureReading[]>;
  getTemperatureReadingById(id: number): Promise<TemperatureReading | undefined>;
  createTemperatureReading(reading: InsertTemperatureReading): Promise<TemperatureReading>;
  updateTemperatureReading(id: number, data: Partial<InsertTemperatureReading>): Promise<TemperatureReading | null>;
  deleteTemperatureReading(id: number): Promise<boolean>;
  getTemperatureByEvolution(medicalEvolutionId: number): Promise<TemperatureReading[]>;

  getWeightReadings(patientId: number): Promise<WeightReading[]>;
  getWeightReadingById(id: number): Promise<WeightReading | undefined>;
  createWeightReading(reading: InsertWeightReading): Promise<WeightReading>;
  updateWeightReading(id: number, data: Partial<InsertWeightReading>): Promise<WeightReading | null>;
  deleteWeightReading(id: number): Promise<boolean>;
  getWeightByEvolution(medicalEvolutionId: number): Promise<WeightReading[]>;

  // Medical Evolution methods
  getMedicalEvolutionsByPatient(patientId: number): Promise<MedicalEvolution[]>;
  getAllMedicalEvolutions(): Promise<MedicalEvolution[]>;
  getMedicalEvolutionById(id: number): Promise<MedicalEvolution | undefined>;
  getMedicalEvolutionsByAppointment(appointmentId: number): Promise<MedicalEvolution[]>;
  createMedicalEvolution(evolution: InsertMedicalEvolution): Promise<MedicalEvolution>;
  updateMedicalEvolution(id: number, evolutionData: Partial<InsertMedicalEvolution>): Promise<MedicalEvolution | undefined>;
  deleteMedicalEvolution(id: number): Promise<boolean>;
  deletePrescriptionsByEvolution(evolutionId: number): Promise<boolean>;
  deleteExamRequestsByEvolution(evolutionId: number): Promise<boolean>;

  // Notification Job methods
  createNotificationJob(job: InsertNotificationJob): Promise<NotificationJob>;
  updateNotificationJobByJobId(jobId: string, update: Partial<InsertNotificationJob>): Promise<void>;

  // Methods for medication history
  createMedicationHistory(data: any): Promise<any>;
  updateMedicationHistory(historyId: number, data: any): Promise<any>;
  deleteMedicationHistory(historyId: number): Promise<boolean>;
  getMedicationHistoryByPatient(patientId: number): Promise<any[]>;
  getMedicationHistoryByMedication(medicationId: number, patientId: number): Promise<any[]>;
  getMedicationLogById(logId: number): Promise<any>;
  markMedicationLogAsTaken(logId: number, userId: number): Promise<MedicationLog | undefined>;
  deleteMedicationHistoryByLogId(logId: number): Promise<boolean>;

  // Medical Data Sharing Methods
  updateUserShareCode(userId: number, shareCode: string): Promise<void>;
  getPatientSharedAccess(patientId: number): Promise<any[]>;
  removeSharedAccess(accessId: number, patientId: number): Promise<void>;
  useShareCode(shareCode: string, caregiverId: number): Promise<{ success: boolean; message: string; patient?: any }>;
  getPatientsAccessibleByCaregiverId(caregiverId: number): Promise<any[]>;
  getPatientsAccessibleByCaregiverIdBasic(caregiverId: number): Promise<any[]>;
  checkCareRelationship(patientId: number, caregiverId: number): Promise<boolean>;
  searchPatients(searchQuery: string): Promise<any[]>;
  searchAccessiblePatients(caregiverId: number, searchQuery: string): Promise<any[]>;

  // Get patient basic data
  getPatientBasicData(patientId: number): Promise<{
    id: number;
    name: string;
    email: string;
    age?: number;
    photo?: string;
    weight?: number;
    profileType: string;
  } | null>;

  // Health Insurance methods
  getHealthInsurancesByDoctor(doctorId: number): Promise<HealthInsurance[]>;
  getHealthInsuranceById(id: number): Promise<HealthInsurance | undefined>;
  createHealthInsurance(insurance: InsertHealthInsurance): Promise<HealthInsurance>;
  updateHealthInsurance(id: number, insurance: Partial<InsertHealthInsurance>): Promise<HealthInsurance | undefined>;
  deleteHealthInsurance(id: number): Promise<boolean>;

  // Payment Methods methods
  getPaymentMethodsByDoctorId(doctorId: number): Promise<PaymentMethod[]>;
  getPaymentMethodById(id: number): Promise<PaymentMethod | undefined>;
  createPaymentMethod(paymentMethod: InsertPaymentMethod): Promise<PaymentMethod>;
  updatePaymentMethod(id: number, paymentMethod: Partial<InsertPaymentMethod>): Promise<PaymentMethod | undefined>;
  deletePaymentMethod(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getMedicationsByPatient(patientId: number): Promise<Medication[]> {
    return await db
      .select()
      .from(medications)
      .where(eq(medications.patientId, patientId))
      .orderBy(asc(medications.name));
  }

  async getMedicationById(id: number): Promise<Medication | undefined> {
    const [medication] = await db
      .select()
      .from(medications)
      .where(eq(medications.id, id))
      .limit(1);
    return medication || undefined;
  }

  async createMedication(medication: InsertMedication): Promise<Medication> {
    const [newMedication] = await db
      .insert(medications)
      .values(medication)
      .returning();
    return newMedication;
  }

  async updateMedication(id: number, medicationData: Partial<InsertMedication>): Promise<Medication | undefined> {
    const [medication] = await db
      .update(medications)
      .set(medicationData)
      .where(eq(medications.id, id))
      .returning();
    return medication || undefined;
  }

  async checkMedicationHasTakenLogs(medicationId: number): Promise<boolean> {
    const logs = await db
      .select()
      .from(medicationLogs)
      .where(and(
        eq(medicationLogs.medicationId, medicationId),
        eq(medicationLogs.status, 'taken')
      ))
      .limit(1);
    return logs.length > 0;
  }

  async deleteMedication(id: number): Promise<boolean> {
    try {
      // Primeiro, deletar todos os logs relacionados que não sejam 'taken'
      await db
        .delete(medicationLogs)
        .where(and(
          eq(medicationLogs.medicationId, id),
          ne(medicationLogs.status, 'taken')
        ));

      // Deletar todos os schedules relacionados
      await db
        .delete(medicationSchedules)
        .where(eq(medicationSchedules.medicationId, id));

      // Finalmente, deletar o medicamento
      const result = await db
        .delete(medications)
        .where(eq(medications.id, id));

      return (result.rowCount || 0) > 0;
    } catch (error) {
      return false;
    }
  }

  async inactivateMedication(id: number): Promise<boolean> {
    const result = await db
      .update(medications)
      .set({ isActive: false })
      .where(eq(medications.id, id));
    return (result.rowCount || 0) > 0;
  }

  async reactivateMedication(id: number): Promise<boolean> {
    const result = await db
      .update(medications)
      .set({ isActive: true })
      .where(eq(medications.id, id))
      .returning();

    if (result.length > 0) {
      const medication = result[0];

      // Verificar se o medicamento tem horários ativos
      const existingSchedules = await this.getSchedulesByMedication(id);

      // Se não tem horários, recriar baseado na frequência
      if (existingSchedules.length === 0) {
        const defaultTimes = this.calculateTimesFromFrequency("08:00", medication.frequency);

        for (const time of defaultTimes) {
          await this.createMedicationSchedule({
            medicationId: id,
            scheduledTime: time,
            isActive: true
          });
        }
      }

      // Recriar logs para hoje
      const schedules = await this.getSchedulesByMedication(id);
      if (schedules.length > 0) {
        // Usar horário brasileiro (UTC-3)
        const nowUTC = new Date();
        const nowBrasil = new Date(nowUTC.getTime() - (3 * 60 * 60 * 1000));
        const todayStart = new Date(nowBrasil.getFullYear(), nowBrasil.getMonth(), nowBrasil.getDate(), 0, 0, 0, 0);

        for (const schedule of schedules) {
          const [hours, minutes] = schedule.scheduledTime.split(':');
          const scheduledDateTime = new Date(nowBrasil.getFullYear(), nowBrasil.getMonth(), nowBrasil.getDate(), parseInt(hours), parseInt(minutes), 0, 0);

          // Calcular status baseado no horário atual brasileiro
          const timeDiffMs = nowBrasil.getTime() - scheduledDateTime.getTime();
          const timeDiffMinutes = Math.floor(timeDiffMs / (1000 * 60));

          let status = "pending";
          let delayMinutes = 0;

          if (timeDiffMinutes > 15) {
            status = "overdue";
            delayMinutes = timeDiffMinutes;
          }

          const logData = {
            medicationId: id,
            scheduleId: schedule.id,
            patientId: medication.patientId,
            scheduledDateTime,
            actualDateTime: null,
            status,
            delayMinutes,
            confirmedBy: null,
            notes: null
          };

          await this.createMedicationLogSafe(logData);
        }
      }

      return true;
    }

    return false;
  }

  // Função auxiliar para calcular horários baseado na frequência
  private calculateTimesFromFrequency(startTime: string, frequency: string): string[] {
    if (!startTime) return [];

    const [hours, minutes] = startTime.split(':');
    const startHour = parseInt(hours);
    const startMinute = parseInt(minutes);

    const times = [startTime];

    const formatTime = (hour: number, minute: number) => {
      return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    };

    switch (frequency) {
      case 'twice_daily':
        // 12h de diferença
        times.push(formatTime((startHour + 12) % 24, startMinute));
        break;
      case 'three_times_daily':
        // 8h de diferença
        times.push(formatTime((startHour + 8) % 24, startMinute));
        times.push(formatTime((startHour + 16) % 24, startMinute));
        break;
      case 'four_times_daily':
        // 6h de diferença
        times.push(formatTime((startHour + 6) % 24, startMinute));
        times.push(formatTime((startHour + 12) % 24, startMinute));
        times.push(formatTime((startHour + 18) % 24, startMinute));
        break;
      case 'every_6h':
        // A cada 6h
        times.push(formatTime((startHour + 6) % 24, startMinute));
        times.push(formatTime((startHour + 12) % 24, startMinute));
        times.push(formatTime((startHour + 18) % 24, startMinute));
        break;
      case 'every_8h':
        // A cada 8h
        times.push(formatTime((startHour + 8) % 24, startMinute));
        times.push(formatTime((startHour + 16) % 24, startMinute));
        break;
      case 'every_12h':
        // A cada 12h
        times.push(formatTime((startHour + 12) % 24, startMinute));
        break;
      default:
        // daily - apenas o horário inicial
        break;
    }

    return times;
  }

  async getSchedulesByMedication(medicationId: number): Promise<MedicationSchedule[]> {
    return await db
      .select()
      .from(medicationSchedules)
      .where(and(eq(medicationSchedules.medicationId, medicationId), eq(medicationSchedules.isActive, true)))
      .orderBy(asc(medicationSchedules.scheduledTime));
  }

  async createMedicationSchedule(schedule: InsertMedicationSchedule): Promise<MedicationSchedule> {
    const [newSchedule] = await db
      .insert(medicationSchedules)
      .values(schedule)
      .returning();
    return newSchedule;
  }

  async deleteSchedulesByMedication(medicationId: number): Promise<boolean> {
    const result = await db
      .update(medicationSchedules)
      .set({ isActive: false })
      .where(eq(medicationSchedules.medicationId, medicationId));
    return result.rowCount > 0;
  }

  async getMedicationLogs(patientId: number, startDate?: Date | null, endDate?: Date): Promise<MedicationLog[]> {
    let conditions = [eq(medicationLogs.patientId, patientId)];

    if (startDate) {
      conditions.push(gte(medicationLogs.scheduledDateTime, startDate));
    }

    if (endDate) {
      conditions.push(lte(medicationLogs.scheduledDateTime, endDate));
    }

    const query = db
      .select()
      .from(medicationLogs)
      .where(and(...conditions));

    const results = await query.orderBy(desc(medicationLogs.scheduledDateTime));

    return results;
  }

  async getMedicationLogById(id: number): Promise<MedicationLog | undefined> {
    const [log] = await db
      .select()
      .from(medicationLogs)
      .where(eq(medicationLogs.id, id))
      .limit(1);
    return log || undefined;
  }

  async createMedicationLog(log: InsertMedicationLog): Promise<MedicationLog> {
    const [newLog] = await db
      .insert(medicationLogs)
      .values(log)
      .returning();
    return newLog;
  }

  async updateMedicationLog(id: number, logData: Partial<InsertMedicationLog>): Promise<MedicationLog | undefined> {
    const [log] = await db
      .update(medicationLogs)
      .set(logData)
      .where(eq(medicationLogs.id, id))
      .returning();
    return log || undefined;
  }

  async deleteMedicationLog(id: number): Promise<boolean> {
    // Verificar se há histórico associado
    const hasHistory = await this.checkLogHasHistory(id);
    if (hasHistory) {
      return false;
    }

    const result = await db.delete(medicationLogs).where(eq(medicationLogs.id, id));
    return (result.rowCount || 0) > 0;
  }

  async checkLogHasHistory(logId: number): Promise<boolean> {
    const history = await db
      .select({ id: medicationHistory.id })
      .from(medicationHistory)
      .where(eq(medicationHistory.medicationLogId, logId))
      .limit(1);
    return history.length > 0;
  }

  // Verificar se já existe log para medicamento/schedule no mesmo dia
  async checkMedicationLogExists(patientId: number, medicationId: number, scheduleId: number, targetDate: Date): Promise<boolean> {
    // Usar a data como referência, mas no horário brasileiro
    const nowUTC = new Date();
    const nowBrasil = new Date(nowUTC.getTime() - (3 * 60 * 60 * 1000)); // UTC-3

    const startOfDay = new Date(nowBrasil.getFullYear(), nowBrasil.getMonth(), nowBrasil.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(nowBrasil.getFullYear(), nowBrasil.getMonth(), nowBrasil.getDate(), 23, 59, 59, 999);

    const existingLogs = await db
      .select({ id: medicationLogs.id })
      .from(medicationLogs)
      .where(
        and(
          eq(medicationLogs.patientId, patientId),
          eq(medicationLogs.medicationId, medicationId),
          eq(medicationLogs.scheduleId, scheduleId),
          gte(medicationLogs.scheduledDateTime, startOfDay),
          lte(medicationLogs.scheduledDateTime, endOfDay)
        )
      )
      .limit(1);

    return existingLogs.length > 0;
  }

  // Criar log apenas se não existir (método seguro)
  async createMedicationLogSafe(log: InsertMedicationLog): Promise<MedicationLog | null> {
    const logExists = await this.checkMedicationLogExists(
      log.patientId,
      log.medicationId,
      log.scheduleId,
      log.scheduledDateTime
    );

    if (logExists) {
      return null; // Não criar duplicata
    }

    try {
      return await this.createMedicationLog(log);
    } catch (error) {
      return null;
    }
  }

  async getTodayMedicationLogs(patientId: number) {
    // Usar horário local brasileiro corretamente
    const nowUTC = new Date();
    const nowBrasil = new Date(nowUTC.getTime() - (3 * 60 * 60 * 1000)); // UTC-3

    // Definir início e fim do dia atual no horário brasileiro
    const startOfToday = new Date(nowBrasil.getFullYear(), nowBrasil.getMonth(), nowBrasil.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(nowBrasil.getFullYear(), nowBrasil.getMonth(), nowBrasil.getDate(), 23, 59, 59, 999);

    const logs = await db
      .select({
        id: medicationLogs.id,
        medicationId: medicationLogs.medicationId,
        scheduleId: medicationLogs.scheduleId,
        patientId: medicationLogs.patientId,
        scheduledDateTime: medicationLogs.scheduledDateTime,
        actualDateTime: medicationLogs.actualDateTime,
        status: medicationLogs.status,
        delayMinutes: medicationLogs.delayMinutes,
        confirmedBy: medicationLogs.confirmedBy,
        createdAt: medicationLogs.createdAt,
        medication: {
          id: medications.id,
          name: medications.name,
          dosage: medications.dosage,
          isActive: medications.isActive,
        }
      })
      .from(medicationLogs)
      .leftJoin(medications, eq(medicationLogs.medicationId, medications.id))
      .where(
        and(
          eq(medicationLogs.patientId, patientId),
          gte(medicationLogs.scheduledDateTime, startOfToday),
          lte(medicationLogs.scheduledDateTime, endOfToday)
        )
      )
      .orderBy(medicationLogs.scheduledDateTime);

    const updatedLogs = logs.map(log => {
      const scheduledTime = new Date(log.scheduledDateTime);

      // Usar horário brasileiro para cálculo
      const timeDiffMs = nowBrasil.getTime() - scheduledTime.getTime();
      const timeDiffMinutes = Math.floor(timeDiffMs / (1000 * 60));

      // Se já foi tomado, manter status 'taken'
      if (log.status === 'taken') {
        return log;
      }

      // Se passou mais de 15 minutos do horário, marcar como atrasado
      if (timeDiffMinutes > 15) {
        return {
          ...log,
          status: 'overdue' as const,
          delayMinutes: timeDiffMinutes
        };
      }

      // Senão, manter como pendente
      return {
        ...log,
        status: 'pending' as const,
        delayMinutes: 0
      };
    });

    // Filtrar logs: incluir todos os logs já tomados + logs pendentes/atrasados apenas de medicamentos ativos
    const filteredLogs = updatedLogs.filter(log => {
      // Sempre incluir logs já tomados, mesmo de medicamentos inativos
      if (log.status === 'taken') {
        return true;
      }

      // Para logs pendentes/atrasados, incluir apenas de medicamentos ativos
      return log.medication?.isActive === true;
    });

    return filteredLogs;
  }

  async deleteMedicationHistoryByLogId(logId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(medicationHistory)
        .where(eq(medicationHistory.medicationLogId, logId));
      return (result.rowCount || 0) > 0;
    } catch (error) {
      return false;
    }
  }

  async getAppointmentsByPatient(patientId: number): Promise<Appointment[]> {
    return await db
      .select()
      .from(appointments)
      .where(eq(appointments.patientId, patientId))
      .orderBy(asc(appointments.appointmentDate));
  }

  async getAllAppointments(): Promise<Appointment[]> {
    return await db
      .select()
      .from(appointments)
      .orderBy(asc(appointments.appointmentDate));
  }

  async getAppointmentById(id: number): Promise<Appointment | undefined> {
    const [appointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, id))
      .limit(1);
    return appointment || undefined;
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [newAppointment] = await db
      .insert(appointments)
      .values(appointment)
      .returning();
    return newAppointment;
  }

  async updateAppointment(id: number, appointmentData: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const [appointment] = await db
      .update(appointments)
      .set(appointmentData)
      .where(eq(appointments.id, id))
      .returning();
    return appointment || undefined;
  }

  async deleteAppointment(id: number): Promise<boolean> {
    const result = await db.delete(appointments).where(eq(appointments.id, id));
    return result.rowCount > 0;
  }

  async getTestsByPatient(patientId: number): Promise<Test[]> {
    return await db
      .select()
      .from(tests)
      .where(eq(tests.patientId, patientId))
      .orderBy(asc(tests.testDate));
  }

  async getAllTests(): Promise<Test[]> {
    return await db
      .select()
      .from(tests)
      .orderBy(asc(tests.testDate));
  }

  // Versão otimizada que não carrega o conteúdo dos arquivos (apenas metadados)
  async getTestsListByPatient(patientId: number): Promise<any[]> {
    const results = await db
      .select({
        id: tests.id,
        patientId: tests.patientId,
        name: tests.name,
        type: tests.type,
        location: tests.location,
        testDate: tests.testDate,
        results: tests.results,
        status: tests.status,
        createdAt: tests.createdAt
      })
      .from(tests)
      .where(eq(tests.patientId, patientId))
      .orderBy(asc(tests.testDate));

    // Buscar apenas informação de existência de arquivos sem carregar conteúdo
    const testsWithFiles = await db
      .select({
        id: tests.id,
        hasFile: sql<boolean>`CASE WHEN ${tests.filePath} IS NOT NULL AND ${tests.filePath} != '' THEN true ELSE false END`.as('hasFile')
      })
      .from(tests)
      .where(eq(tests.patientId, patientId));

    // Buscar apenas o início do filePath para detectar o tipo de MIME
    const testsWithFileTypes = await db
      .select({
        id: tests.id,
        mimeStart: sql<string>`SUBSTRING(${tests.filePath}, 1, 50)`
      })
      .from(tests)
      .where(
        and(
          eq(tests.patientId, patientId),
          isNotNull(tests.filePath)
        )
      );

    // Função para detectar extensão do arquivo baseado no MIME type
    const getFileExtension = (mimeStart: string): string => {
      if (!mimeStart) return 'pdf';

      if (mimeStart.includes('data:application/pdf')) return 'pdf';
      if (mimeStart.includes('data:image/png')) return 'png';
      if (mimeStart.includes('data:image/jpeg')) return 'jpg';
      if (mimeStart.includes('data:image/jpg')) return 'jpg';
      if (mimeStart.includes('data:application/msword')) return 'doc';
      if (mimeStart.includes('data:application/vnd.openxml')) return 'docx';
      if (mimeStart.includes('data:image/')) return 'png';
      if (mimeStart.includes('data:application/')) return 'pdf';

      return 'pdf';
    };

    // Combinar resultados
    const processedResults = results.map(test => {
      const fileInfo = testsWithFiles.find(f => f.id === test.id);
      const fileTypeInfo = testsWithFileTypes.find(f => f.id === test.id);
      const hasRealFile = fileInfo?.hasFile || false;
      const fileExtension = getFileExtension(fileTypeInfo?.mimeStart || '');

      return {
        ...test,
        filePath: hasRealFile ? `${test.name}.${fileExtension}` : null,
        hasFile: hasRealFile
      };
    });

    return processedResults;
  }

  async getTestById(id: number): Promise<Test | undefined> {
    const [test] = await db
      .select()
      .from(tests)
      .where(eq(tests.id, id))
      .limit(1);
    return test || undefined;
  }

  async createTest(test: InsertTest): Promise<Test> {
    const [newTest] = await db
      .insert(tests)
      .values(test)
      .returning();
    return newTest;
  }

  async updateTest(id: number, data: Partial<Test>): Promise<Test> {

    // Filtrar campos undefined/null mas manter campos válidos
    const updateData: any = {};

    // Sempre incluir campos que foram explicitamente passados
    if (data.status !== undefined) {
      updateData.status = data.status;
    }
    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.type !== undefined) {
      updateData.type = data.type;
    }
    if (data.testDate !== undefined) {
      updateData.testDate = data.testDate;
    }
    if (data.location !== undefined) {
      updateData.location = data.location;
    }
    if (data.results !== undefined) {
      updateData.results = data.results;
    }
    if (data.filePath !== undefined) {
      updateData.filePath = data.filePath;
    }
    if (data.updatedAt !== undefined) {
      updateData.updatedAt = data.updatedAt;
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error("No valid fields to update");
    }

    const [updated] = await db
      .update(tests)
      .set(updateData)
      .where(eq(tests.id, id))
      .returning();

    if (!updated) {
      throw new Error("Test not found");
    }

    return updated;
  }

  async deleteTest(id: number): Promise<boolean> {
    const result = await db.delete(tests).where(eq(tests.id, id));
    return result.rowCount > 0;
  }

  // ==================== EXAM REQUESTS METHODS ====================

  async getExamRequestsByPatient(patientId: number): Promise<ExamRequest[]> {
    return await db
      .select()
      .from(examRequests)
      .where(eq(examRequests.patientId, patientId))
      .orderBy(desc(examRequests.createdAt));
  }

  async getExamRequestById(id: number): Promise<ExamRequest | undefined> {
    const result = await db
      .select()
      .from(examRequests)
      .where(eq(examRequests.id, id))
      .limit(1);
    return result[0];
  }

  async createExamRequest(examRequest: InsertExamRequest): Promise<ExamRequest> {
    const result = await db
      .insert(examRequests)
      .values(examRequest)
      .returning();
    return result[0];
  }

  async updateExamRequest(id: number, examRequest: Partial<InsertExamRequest>): Promise<ExamRequest | undefined> {
    console.log(`📋 Atualizando requisição ${id} com:`, examRequest);

    const result = await db
      .update(examRequests)
      .set({
        ...examRequest,
        updatedAt: new Date()
      })
      .where(eq(examRequests.id, id))
      .returning();

    console.log(`📋 Requisição ${id} atualizada:`, result[0]);
    return result[0];
  }

  async deleteExamRequest(id: number): Promise<boolean> {
    const result = await db.delete(examRequests).where(eq(examRequests.id, id));
    return result.rowCount > 0;
  }

  async getPrescriptionsByPatient(patientId: number): Promise<Prescription[]> {
    return await db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.patientId, patientId))
      .orderBy(desc(prescriptions.prescriptionDate), desc(prescriptions.createdAt));
  }

  // Método otimizado que não carrega o conteúdo dos arquivos, apenas metadados
  async getPrescriptionsListByPatient(patientId: number): Promise<any[]> {
    // Buscar prescrições básicas - ordenar por data da receita DESC, depois por hora de criação DESC
    const results = await db
      .select({
        id: prescriptions.id,
        patientId: prescriptions.patientId,
        title: prescriptions.title,
        doctorName: prescriptions.doctorName,
        description: prescriptions.description,
        prescriptionDate: prescriptions.prescriptionDate,
        createdAt: prescriptions.createdAt
      })
      .from(prescriptions)
      .where(eq(prescriptions.patientId, patientId))
      .orderBy(desc(prescriptions.prescriptionDate), desc(prescriptions.createdAt));

    // Buscar informações de arquivos (hasFile)
    const prescriptionsWithFiles = await db
      .select({
        id: prescriptions.id,
        hasFile: sql<boolean>`CASE WHEN ${prescriptions.filePath} IS NOT NULL AND ${prescriptions.filePath} != '' THEN true ELSE false END`.as('hasFile')
      })
      .from(prescriptions)
      .where(
        and(
          eq(prescriptions.patientId, patientId),
          isNotNull(prescriptions.filePath)
        )
      );

    // Buscar primeiros caracteres para detectar tipo MIME
    const prescriptionsWithFileTypes = await db
      .select({
        id: prescriptions.id,
        mimeStart: sql<string>`SUBSTRING(${prescriptions.filePath}, 1, 50)`
      })
      .from(prescriptions)
      .where(
        and(
          eq(prescriptions.patientId, patientId),
          isNotNull(prescriptions.filePath)
        )
      );

    // Função para detectar extensão do arquivo baseado no MIME type
    const getFileExtension = (mimeStart: string): string => {
      if (!mimeStart) return 'pdf';

      if (mimeStart.includes('data:application/pdf')) return 'pdf';
      if (mimeStart.includes('data:image/png')) return 'png';
      if (mimeStart.includes('data:image/jpeg')) return 'jpg';
      if (mimeStart.includes('data:image/jpg')) return 'jpg';
      if (mimeStart.includes('data:application/msword')) return'doc';
      if (mimeStart.includes('data:application/vnd.openxml')) return 'docx';
      if (mimeStart.includes('data:image/')) return 'png';
      // Detectar formato JSON com base64 primeiro
      if (mimeStart.includes('{"data":"')) {
        const base64Data = mimeStart.split('{"data":"')[1] || '';

        // Assinaturas de base64 para diferentes tipos de arquivo
        if (base64Data.startsWith('iVBORw0KGgo')) return 'png';  // PNG
        if (base64Data.startsWith('/9j/')) return 'jpg';         // JPEG
        if (base64Data.startsWith('JVBERi0')) return 'pdf';      // PDF
        if (base64Data.startsWith('UEsDBBQ')) return 'docx';     // DOCX
        if (base64Data.startsWith('0M8R4KGx')) return 'doc';     // DOC
      }

      if (mimeStart.includes('data:application/')) return 'pdf';

      return 'pdf';
    };

    // Combinar resultados
    const processedResults = results.map(prescription => {
      const fileInfo = prescriptionsWithFiles.find(f => f.id === prescription.id);
      const fileTypeInfo = prescriptionsWithFileTypes.find(f => f.id === prescription.id);
      const hasRealFile = fileInfo?.hasFile || false;
      const fileExtension = getFileExtension(fileTypeInfo?.mimeStart || '');

      // Determinar o MIME type correto baseado na extensão
      let mimeType = 'application/pdf';
      if (fileExtension === 'png') mimeType = 'image/png';
      else if (fileExtension === 'jpg') mimeType = 'image/jpeg';
      else if (fileExtension === 'doc') mimeType = 'application/msword';
      else if (fileExtension === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      return {
        ...prescription,
        hasFile: hasRealFile,
        fileOriginalName: hasRealFile ? `${prescription.title}.${fileExtension}` : null,
        fileType: hasRealFile ? mimeType : null
      };
    });

    return processedResults;
  }

  async getPrescriptionById(id: number): Promise<Prescription | undefined> {
    const [prescription] = await db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.id, id))
      .limit(1);
    return prescription || undefined;
  }

  async createPrescription(prescription: InsertPrescription): Promise<Prescription> {
    const [newPrescription] = await db
      .insert(prescriptions)
      .values(prescription)
      .returning();
    return newPrescription;
  }

  async getPrescriptionsByEvolution(medicalEvolutionId: number): Promise<Prescription[]> {
    return await db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.medicalEvolutionId, medicalEvolutionId))
      .orderBy(desc(prescriptions.prescriptionDate), desc(prescriptions.createdAt));
  }

  async getExamRequestsByEvolution(medicalEvolutionId: number): Promise<ExamRequest[]> {
    return await db
      .select()
      .from(examRequests)
      .where(eq(examRequests.medicalEvolutionId, medicalEvolutionId))
      .orderBy(desc(examRequests.createdAt));
  }

  async updatePrescription(id: number, prescriptionData: Partial<InsertPrescription>): Promise<Prescription | undefined> {
    const [prescription] = await db
      .update(prescriptions)
      .set(prescriptionData)
      .where(eq(prescriptions.id, id))
      .returning();
    return prescription || undefined;
  }

  async deletePrescription(id: number): Promise<boolean> {
    const result = await db.delete(prescriptions).where(eq(prescriptions.id, id));
    return result.rowCount > 0;
  }

  // ========================================
  // MÉTODOS ANTIGOS DE NOTIFICAÇÃO REMOVIDOS
  // Sistema substituído por Enterprise Notifications
  // ========================================

  async markAllNotificationsAsRead(userId: number): Promise<boolean> {
    try {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.userId, userId));
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  }

  async deleteNotification(id: number): Promise<boolean> {
    const result = await db.delete(notifications).where(eq(notifications.id, id));
    return result.rowCount > 0;
  }

  async deleteAllReadNotifications(userId: number): Promise<boolean> {
    try {
      await db
        .delete(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.isRead, true)));
      return true;
    } catch (error) {
      console.error('Error deleting read notifications:', error);
      return false;
    }
  }

  // ========================================
  // MÉTODOS PARA EVOLUÇÕES MÉDICAS
  // ========================================

  async getMedicalEvolutionsByPatient(patientId: number): Promise<MedicalEvolution[]> {
    return await db
      .select()
      .from(medicalEvolutions)
      .where(eq(medicalEvolutions.patientId, patientId))
      .orderBy(desc(medicalEvolutions.createdAt));
  }

  async getAllMedicalEvolutions(): Promise<MedicalEvolution[]> {
    return await db
      .select()
      .from(medicalEvolutions)
      .orderBy(desc(medicalEvolutions.createdAt));
  }

  async getMedicalEvolutionById(id: number): Promise<MedicalEvolution | undefined> {
    const [evolution] = await db
      .select()
      .from(medicalEvolutions)
      .where(eq(medicalEvolutions.id, id))
      .limit(1);
    return evolution || undefined;
  }

  async getMedicalEvolutionsByAppointment(appointmentId: number): Promise<MedicalEvolution[]> {
    return await db
      .select()
      .from(medicalEvolutions)
      .where(eq(medicalEvolutions.appointmentId, appointmentId))
      .orderBy(desc(medicalEvolutions.createdAt));
  }

  async createMedicalEvolution(evolution: InsertMedicalEvolution): Promise<MedicalEvolution> {
    const [newEvolution] = await db
      .insert(medicalEvolutions)
      .values(evolution)
      .returning();
    return newEvolution;
  }

  async updateMedicalEvolution(id: number, evolutionData: Partial<InsertMedicalEvolution>): Promise<MedicalEvolution | undefined> {
    // Remove updatedAt dos dados se estiver presente, deixando o banco gerenciar automaticamente
    const { updatedAt: _, ...cleanEvolutionData } = evolutionData as any;
    
    const [evolution] = await db
      .update(medicalEvolutions)
      .set(cleanEvolutionData)
      .where(eq(medicalEvolutions.id, id))
      .returning();
    return evolution || undefined;
  }

  async deleteMedicalEvolution(id: number): Promise<boolean> {
    const result = await db.delete(medicalEvolutions).where(eq(medicalEvolutions.id, id));
    return result.rowCount > 0;
  }

  async deletePrescriptionsByEvolution(evolutionId: number): Promise<boolean> {
    try {
      console.log('🗑️ Deletando prescrições da evolução:', evolutionId);
      const result = await db.delete(prescriptions).where(eq(prescriptions.medicalEvolutionId, evolutionId));
      console.log('✅ Prescrições deletadas:', result.rowCount);
      return result.rowCount > 0;
    } catch (error) {
      console.error('❌ Erro ao deletar prescrições por evolução:', error);
      return false;
    }
  }

  async deleteExamRequestsByEvolution(evolutionId: number): Promise<boolean> {
    try {
      console.log('🗑️ Deletando requisições da evolução:', evolutionId);
      const result = await db.delete(examRequests).where(eq(examRequests.medicalEvolutionId, evolutionId));
      console.log('✅ Requisições deletadas:', result.rowCount);
      return result.rowCount > 0;
    } catch (error) {
      console.error('❌ Erro ao deletar requisições por evolução:', error);
      return false;
    }
  }

  // ========================================
  // MÉTODOS PARA SINAIS VITAIS
  // ========================================

  // Pressão Arterial
  async getBloodPressureByEvolution(medicalEvolutionId: number) {
    return await db
      .select()
      .from(bloodPressureReadings)
      .where(eq(bloodPressureReadings.medicalEvolutionId, medicalEvolutionId))
      .orderBy(desc(bloodPressureReadings.measuredAt));
  }

  async createBloodPressureReading(reading: any) {
    const [newReading] = await db
      .insert(bloodPressureReadings)
      .values(reading)
      .returning();
    return newReading;
  }

  async deleteBloodPressureReading(id: number): Promise<boolean> {
    const result = await db.delete(bloodPressureReadings).where(eq(bloodPressureReadings.id, id));
    return result.rowCount > 0;
  }

  // Glicemia
  async getGlucoseByEvolution(medicalEvolutionId: number) {
    return await db
      .select()
      .from(glucoseReadings)
      .where(eq(glucoseReadings.medicalEvolutionId, medicalEvolutionId))
      .orderBy(desc(glucoseReadings.measuredAt));
  }

  async createGlucoseReading(reading: any) {
    const [newReading] = await db
      .insert(glucoseReadings)
      .values(reading)
      .returning();
    return newReading;
  }

  async deleteGlucoseReading(id: number): Promise<boolean> {
    const result = await db.delete(glucoseReadings).where(eq(glucoseReadings.id, id));
    return result.rowCount > 0;
  }

  // Batimentos Cardíacos
  async getHeartRateByEvolution(medicalEvolutionId: number) {
    return await db
      .select()
      .from(heartRateReadings)
      .where(eq(heartRateReadings.medicalEvolutionId, medicalEvolutionId))
      .orderBy(desc(heartRateReadings.measuredAt));
  }

  async createHeartRateReading(reading: any) {
    const [newReading] = await db
      .insert(heartRateReadings)
      .values(reading)
      .returning();
    return newReading;
  }

  async deleteHeartRateReading(id: number): Promise<boolean> {
    const result = await db.delete(heartRateReadings).where(eq(heartRateReadings.id, id));
    return result.rowCount > 0;
  }

  // Temperatura
  async getTemperatureByEvolution(medicalEvolutionId: number) {
    return await db
      .select()
      .from(temperatureReadings)
      .where(eq(temperatureReadings.medicalEvolutionId, medicalEvolutionId))
      .orderBy(desc(temperatureReadings.measuredAt));
  }

  async createTemperatureReading(reading: any) {
    const [newReading] = await db
      .insert(temperatureReadings)
      .values(reading)
      .returning();
    return newReading;
  }

  async deleteTemperatureReading(id: number): Promise<boolean> {
    const result = await db.delete(temperatureReadings).where(eq(temperatureReadings.id, id));
    return result.rowCount > 0;
  }

  // Peso
  async getWeightByEvolution(medicalEvolutionId: number) {
    return await db
      .select()
      .from(weightReadings)
      .where(eq(weightReadings.medicalEvolutionId, medicalEvolutionId))
      .orderBy(desc(weightReadings.measuredAt));
  }

  async createWeightReading(reading: any) {
    const [newReading] = await db
      .insert(weightReadings)
      .values(reading)
      .returning();
    return newReading;
  }

  async deleteWeightReading(id: number): Promise<boolean> {
    const result = await db.delete(weightReadings).where(eq(weightReadings.id, id));
    return result.rowCount > 0;
  }

  async getCareRelationships(userId: number): Promise<CareRelationship[]> {
    return await db
      .select()
      .from(careRelationships)
      .where(
        and(
          eq(careRelationships.patientId, userId),
          eq(careRelationships.status, "active")
        )
      );
  }

  // Método para popular dados de teste
  async seedTestData(): Promise<void> {
    try {
      // Verificar se já existe o usuário ritialdeburg@gmail.com
      const existingUser = await this.getUserByEmail("ritialdeburg@gmail.com");

      if (existingUser) {
        // Verificar se já tem medicamentos
        const medications = await this.getMedicationsByPatient(existingUser.id);
        if (medications.length > 0) {

          return;
        }
      }

      // Criar usuário se não existir
      let user = existingUser;
      if (!user) {
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash("123456", 10);

        user = await this.createUser({
          email: "ritialdeburg@gmail.com",
          password: hashedPassword,
          name: "Rita Lopes",
          age: 58,
          profileType: "patient",
          photo: null
        });

      }

      // Criar medicamentos
      const medicationsData = [
        {
          patientId: user.id,
          name: "Losartana 50mg",
          dosage: "50mg",
          frequency: "daily",
          startDate: new Date("2024-01-01"),
          endDate: null,
          instructions: "Tomar 1 comprimido pela manhã",
          isActive: true
        },
        {
          patientId: user.id,
          name: "Metformina 500mg",
          dosage: "500mg",
          frequency: "twice_daily",
          startDate: new Date("2024-01-01"),
          endDate: null,
          instructions: "Tomar 1 comprimido de manhã e à noite",
          isActive: true
        },
        {
          patientId: user.id,
          name: "Omeprazol 20mg",
          dosage: "20mg",
          frequency: "daily",
          startDate: new Date("2024-01-01"),
          endDate: null,
          instructions: "Tomar 1 comprimido em jejum",
          isActive: true
        },
        {
          patientId: user.id,
          name: "Atorvastatina 40mg",
          dosage: "40mg",
          frequency: "daily",
          startDate: new Date("2024-01-01"),
          endDate: null,
          instructions: "Tomar 1 comprimido à noite",
          isActive: true
        }
      ];

      const createdMedications = [];
      for (const medData of medicationsData) {
        const medication = await this.createMedication(medData);
        createdMedications.push(medication);
      }
      // Criar horários para os medicamentos
      const scheduleData = [
        { medicationId: createdMedications[0].id, scheduledTime: "08:00", isActive: true }, // Losartana
        { medicationId: createdMedications[1].id, scheduledTime: "08:00", isActive: true }, // Metformina manhã
        { medicationId: createdMedications[1].id, scheduledTime: "20:00", isActive: true }, // Metformina noite
        { medicationId: createdMedications[2].id, scheduledTime: "07:00", isActive: true }, // Omeprazol
        { medicationId: createdMedications[3].id, scheduledTime: "22:00", isActive: true }, // Atorvastatina
      ];

      const schedules = [];
      for (const schedData of scheduleData) {
        const schedule = await this.createMedicationSchedule(schedData);
        schedules.push(schedule);
      }
      // Criar logs de medicação para hoje
      const today = new Date();
      for (const schedule of schedules) {
        // Usar horário local sem conversão de timezone
        const [hours, minutes] = schedule.scheduledTime.split(':');
        const scheduledDateTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), parseInt(hours), parseInt(minutes), 0, 0);

        const logData = {
          medicationId: schedule.medicationId,
          scheduleId: schedule.id,
          patientId: user.id,
          scheduledDateTime,
          actualDateTime: null,
          status: "pending",
          delayMinutes: 0,
          confirmedBy: null,
          notes: null
        };

        await this.createMedicationLogSafe(logData);
      }
      // Criar consultas
      const appointmentsData = [
        {
          patientId: user.id,
          title: "Consulta Cardiologista",
          doctorName: "Dr. Pedro Costa",
          location: "Hospital São Lucas",
          appointmentDate: new Date("2025-01-15T10:00:00"),
          notes: "Consulta de rotina para acompanhamento da hipertensão",
          status: "scheduled"
        },
        {
          patientId: user.id,
          title: "Consulta Endocrinologista",
          doctorName: "Dra. Ana Silva",
          location: "Clínica Endocrino",
          appointmentDate: new Date("2025-01-22T14:30:00"),
          notes: "Revisão do tratamento de diabetes",
          status: "scheduled"
        }
      ];

      for (const aptData of appointmentsData) {
        await this.createAppointment(aptData);
      }
      // Criar notificações
      const notificationData = [
        {
          userId: user.id,
          type: "medication_reminder",
          title: "Hora do medicamento",
          message: "Não esqueça de tomar Losartana 50mg às 08:00",
          isRead: false,
          relatedId: createdMedications[0].id,
          scheduledFor: new Date(Date.now() - (3 * 60 * 60 * 1000))
        }
      ];

      for (const notifData of notificationData) {
        await this.createNotification(notifData);
      }
    } catch (error) {

      throw error;
    }
  }

  async createCareRelationship(patientId: number, caregiverId: number): Promise<CareRelationship> {
    const [relationship] = await db
      .insert(careRelationships)
      .values({ patientId, caregiverId })
      .returning();
    return relationship;
  }

  async getPatientsByCaregiver(caregiverId: number): Promise<User[]> {
    const relationships = await db
      .select({ patientId: careRelationships.patientId })
      .from(careRelationships)
      .where(
        and(
          eq(careRelationships.caregiverId, caregiverId),
          eq(careRelationships.status, "active")
        )
      );

    if (relationships.length === 0) return [];

    const patientIds = relationships.map(r => r.patientId);
    return await db
      .select()
      .from(users)
      .where(eq(users.id, patientIds[0])); // Simplified for now
  }

  async getCaregiversByPatient(patientId: number): Promise<User[]> {
    const relationships = await db
      .select({ caregiverId: careRelationships.caregiverId })
      .from(careRelationships)
      .where(
        and(
          eq(careRelationships.patientId, patientId),
          eq(careRelationships.status, "active")
        )
      );

    if (relationships.length === 0) return [];

    const caregiverIds = relationships.map(r => r.caregiverId);
    return await db
      .select()
      .from(users)
      .where(eq(users.id, caregiverIds[0])); // Simplified for now
  }

  // ===== VITAL SIGNS METHODS =====

  async getBloodPressureReadings(patientId: number): Promise<BloodPressureReading[]> {
    return await db
      .select()
      .from(bloodPressureReadings)
      .where(eq(bloodPressureReadings.patientId, patientId))
      .orderBy(desc(bloodPressureReadings.measuredAt));
  }

  async createBloodPressureReading(reading: InsertBloodPressureReading): Promise<BloodPressureReading> {
    const [newReading] = await db
      .insert(bloodPressureReadings)
      .values(reading)
      .returning();
    return newReading;
  }

  async updateBloodPressureReading(id: number, data: Partial<InsertBloodPressureReading>): Promise<BloodPressureReading | undefined> {
    const [reading] = await db
      .update(bloodPressureReadings)
      .set(data)
      .where(eq(bloodPressureReadings.id, id))
      .returning();
    return reading || undefined;
  }

  async getBloodPressureReadingById(id: number): Promise<BloodPressureReading | undefined> {
    const [reading] = await db
      .select()
      .from(bloodPressureReadings)
      .where(eq(bloodPressureReadings.id, id));
    return reading || undefined;
  }

  async deleteBloodPressureReading(id: number): Promise<boolean> {
    const result = await db.delete(bloodPressureReadings).where(eq(bloodPressureReadings.id, id));
    return result.rowCount > 0;
  }

  async getGlucoseReadings(patientId: number): Promise<GlucoseReading[]>;
  async getGlucoseReadingById(id: number): Promise<GlucoseReading | undefined>;
  async createGlucoseReading(reading: InsertGlucoseReading): Promise<GlucoseReading>;
  async updateGlucoseReading(id: number, data: Partial<InsertGlucoseReading>): Promise<GlucoseReading | undefined>;
  async deleteGlucoseReading(id: number): Promise<boolean>;

  async getGlucoseReadings(patientId: number): Promise<GlucoseReading[]> {
    return await db
      .select()
      .from(glucoseReadings)
      .where(eq(glucoseReadings.patientId, patientId))
      .orderBy(desc(glucoseReadings.measuredAt));
  }

  async createGlucoseReading(reading: InsertGlucoseReading): Promise<GlucoseReading> {
    const [newReading] = await db
      .insert(glucoseReadings)
      .values(reading)
      .returning();
    return newReading;
  }

  async updateGlucoseReading(id: number, data: Partial<InsertGlucoseReading>): Promise<GlucoseReading | undefined> {
    const [reading] = await db
      .update(glucoseReadings)
      .set(data)
      .where(eq(glucoseReadings.id, id))
      .returning();
    return reading || undefined;
  }

  async getGlucoseReadingById(id: number): Promise<GlucoseReading | undefined> {
    const [reading] = await db
      .select()
      .from(glucoseReadings)
      .where(eq(glucoseReadings.id, id));
    return reading || undefined;
  }

  async deleteGlucoseReading(id: number): Promise<boolean> {
    const result = await db.delete(glucoseReadings).where(eq(glucoseReadings.id, id));
    return result.rowCount > 0;
  }

  async getHeartRateReadings(patientId: number): Promise<HeartRateReading[]> {
    return await db
      .select()
      .from(heartRateReadings)
      .where(eq(heartRateReadings.patientId, patientId))
      .orderBy(desc(heartRateReadings.measuredAt));
  }

  async createHeartRateReading(reading: InsertHeartRateReading): Promise<HeartRateReading> {
    const [newReading] = await db
      .insert(heartRateReadings)
      .values(reading)
      .returning();
    return newReading;
  }

  async updateHeartRateReading(id: number, data: Partial<InsertHeartRateReading>): Promise<HeartRateReading | undefined> {
    const [reading] = await db
      .update(heartRateReadings)
      .set(data)
      .where(eq(heartRateReadings.id, id))
      .returning();
    return reading || undefined;
  }

  async getHeartRateReadingById(id: number): Promise<HeartRateReading | undefined> {
    const [reading] = await db
      .select()
      .from(heartRateReadings)
      .where(eq(heartRateReadings.id, id));
    return reading || undefined;
  }

  async deleteHeartRateReading(readingId: number): Promise<boolean> {
    const result = await db
      .delete(heartRateReadings)
      .where(eq(heartRateReadings.id, readingId));
    return result.rowCount > 0;
  }

  async getTemperatureReadings(patientId: number): Promise<TemperatureReading[]> {
    return await db
      .select()
      .from(temperatureReadings)
      .where(eq(temperatureReadings.patientId, patientId))
      .orderBy(desc(temperatureReadings.measuredAt));
  }

  async createTemperatureReading(reading: InsertTemperatureReading): Promise<TemperatureReading> {
    const [newReading] = await db
      .insert(temperatureReadings)
      .values(reading)
      .returning();
    return newReading;
  }

  async updateTemperatureReading(id: number, data: Partial<InsertTemperatureReading>): Promise<TemperatureReading | undefined> {
    const [reading] = await db
      .update(temperatureReadings)
      .set(data)
      .where(eq(temperatureReadings.id, id))
      .returning();
    return reading || undefined;
  }

  async getTemperatureReadingById(id: number): Promise<TemperatureReading | undefined> {
    const [reading] = await db
      .select()
      .from(temperatureReadings)
      .where(eq(temperatureReadings.id, id));
    return reading || undefined;
  }

  async deleteTemperatureReading(id: number): Promise<boolean> {
    const result = await db
      .delete(temperatureReadings)
      .where(eq(temperatureReadings.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getWeightReadings(patientId: number): Promise<WeightReading[]> {
    return await db
      .select()
      .from(weightReadings)
      .where(eq(weightReadings.patientId, patientId))
      .orderBy(desc(weightReadings.measuredAt));
  }

  async createWeightReading(reading: InsertWeightReading): Promise<WeightReading> {
    const [newReading] = await db
      .insert(weightReadings)
      .values(reading)
      .returning();
    return newReading;
  }

  async updateWeightReading(id: number, data: Partial<InsertWeightReading>): Promise<WeightReading | null> {
    const [updatedReading] = await db
      .update(weightReadings)
      .set(data)
      .where(eq(weightReadings.id, id))
      .returning();
    return updatedReading || null;
  }

  async getWeightReadingById(id: number): Promise<WeightReading | undefined> {
    const [reading] = await db
      .select()
      .from(weightReadings)
      .where(eq(weightReadings.id, id));
    return reading || undefined;
  }

  async deleteWeightReading(id: number): Promise<boolean> {
    const result = await db.delete(weightReadings).where(eq(weightReadings.id, id));
    return result.rowCount > 0;
  }

  async getMedicationLogsByDateRange(patientId: number, startDate: Date, endDate: Date): Promise<any[]> {
    try {
      const logs = await db
        .select({
          id: medicationLogs.id,
          medicationId: medicationLogs.medicationId,
          scheduleId: medicationLogs.scheduleId,
          patientId: medicationLogs.patientId,
          scheduledDateTime: medicationLogs.scheduledDateTime,
          actualDateTime: medicationLogs.actualDateTime,
          status: medicationLogs.status,
          delayMinutes: medicationLogs.delayMinutes,
          confirmedBy: medicationLogs.confirmedBy,
          createdAt: medicationLogs.createdAt,
          medication: {
            id: medications.id,
            name: medications.name,
            dosage: medications.dosage,
            isActive: medications.isActive,
          }
        })
        .from(medicationLogs)
        .leftJoin(medications, eq(medicationLogs.medicationId, medications.id))
        .where(
          and(
            eq(medicationLogs.patientId, patientId),
            gte(medicationLogs.scheduledDateTime, startDate),
            lte(medicationLogs.scheduledDateTime, endDate)
          )
        )
        .orderBy(desc(medicationLogs.scheduledDateTime));

      return logs || [];
    } catch (error) {
      console.error('Erro ao buscar logs de medicamento por data:', error);
      return [];
    }
  }

  // Medical History Methods
  async createMedicationHistory(data: any) {
    try {
      const result = await db.insert(medicationHistory).values(data).returning();
      return result[0];
    } catch (error) {
      throw error;
    }
  }

  // ========================================
  // ENTERPRISE NOTIFICATION METHODS IMPLEMENTATION
  // ========================================

  // REMOVIDO - MÉTODO ANTIGO QUE CAUSAVA ERRO NO DRIZZLE
  // Este método foi substituído por SQL raw nas rotas enterprise

  async markUserNotificationAsRead(notificationId: number): Promise<void> {
    await db
      .update(userNotifications)
      .set({
        isRead: true,
        readAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(userNotifications.id, notificationId));
  }

  // USANDO SQL RAW PARA CONTORNAR PROBLEMAS DO DRIZZLE
  async getUserNotificationSummary(userId: number): Promise<any> {
    try {
      // Usar SQL raw para garantir contagem correta
      const totalQuery = `
        SELECT COUNT(*) as count
        FROM user_notifications un
        INNER JOIN global_notifications gn ON un.global_notification_id = gn.id
        WHERE un.user_id = $1 AND gn.is_active = true
      `;

      const unreadQuery = `
        SELECT COUNT(*) as count
        FROM user_notifications un
        INNER JOIN global_notifications gn ON un.global_notification_id = gn.id
        WHERE un.user_id = $1 AND un.is_read = false AND gn.is_active = true
      `;

      const [totalResult] = await db.execute(sql.raw(totalQuery, [userId]));
      const [unreadResult] = await db.execute(sql.raw(unreadQuery, [userId]));

      const total = (totalResult as any)?.count || 0;
      const unread = (unreadResult as any)?.count || 0;

      console.log(`📊 Storage Summary: Usuário ${userId} - Total: ${total}, Não lidas: ${unread}`);

      return {
        total: Number(total),
        unread: Number(unread),
        read: Number(total) - Number(unread),
        highPriorityCount: 0,
        criticalCount: Number(unread)
      };
    } catch (error) {
      console.error('❌ Erro no summary de notificações:', error);
      return { total: 0, unread: 0, read: 0, highPriorityCount: 0, criticalCount: 0 };
    }
  }

  // USANDO EXATAMENTE O MESMO PADRÃO DAS PRESCRIÇÕES
  async createGlobalNotification(notification: any, httpContext?: any): Promise<any> {
    console.log('🚀 DEBUG: Iniciando createGlobalNotification com dados:', {
      patientId: notification.patientId,
      type: notification.type,
      title: notification.title,
      hasHttpContext: !!httpContext
    });

    // Usar new Date() padrão como as outras colunas que funcionam corretamente
    const now = new Date();

    // Usar apenas campos que existem na tabela atual
    const insertData: any = {
      userId: notification.userId || null,
      userName: notification.userName || null,
      patientId: notification.patientId,
      patientName: notification.patientName,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      relatedId: notification.relatedId,
      relatedType: notification.relatedType,
      priority: notification.priority || 'normal',
      isActive: true,
      createdAt: now,
      updatedAt: now
    };

    // Adicionar campos opcionais apenas se existirem na tabela
    if (notification.subtype) insertData.subtype = notification.subtype;
    if (notification.relatedItemName) insertData.relatedItemName = notification.relatedItemName;
    if (notification.urgencyScore !== undefined) insertData.urgencyScore = notification.urgencyScore;
    if (notification.originalScheduledTime) insertData.originalScheduledTime = notification.originalScheduledTime;
    if (notification.notificationTriggerTime) insertData.notificationTriggerTime = notification.notificationTriggerTime;
    if (notification.metadata) {
      // Garantir que metadata seja sempre uma string JSON válida
      insertData.metadata = typeof notification.metadata === 'string' ? notification.metadata : JSON.stringify(notification.metadata || {});
    }

    // Campos enterprise (adicionar apenas se as colunas existirem)
    try {
      if (notification.batchId) insertData.batchId = notification.batchId;
      if (notification.processingNode) insertData.processingNode = notification.processingNode;
      if (notification.deduplicationKey) insertData.deduplicationKey = notification.deduplicationKey;
      if (notification.status) insertData.status = notification.status;

      if (notification.processedAt) {
        insertData.processedAt = new Date();
      }

      if (notification.distributedAt) {
        insertData.distributedAt = new Date();
      }

      // processedAt e distributedAt devem ser preenchidos apenas quando realmente processados/distribuídos
      // Não definir estes campos na criação inicial
    } catch (error) {
      console.log('⚠️ Algumas colunas enterprise ainda não foram criadas, usando versão básica');
    }

    console.log('📝 DEBUG: Dados preparados para inserção:', {
      patientId: insertData.patientId,
      type: insertData.type,
      title: insertData.title,
      isActive: insertData.isActive,
      fieldsCount: Object.keys(insertData).length
    });

    try {
      const [newNotification] = await db
        .insert(globalNotifications)
        .values(insertData)
        .returning();

      console.log('✅ DEBUG: Notificação global criada com sucesso:', {
        id: newNotification.id,
        patientId: newNotification.patientId,
        type: newNotification.type,
        title: newNotification.title,
        createdAt: newNotification.createdAt
      });

    // CRIAR AUDIT LOG EXATAMENTE COMO NAS PRESCRIÇÕES
      console.log('🔍 AUDIT DEBUG - Preparando audit log para notificação global ID:', newNotification.id);

      try {
        // Capturar IP real EXATAMENTE como nas prescrições
        const realIP = httpContext?.req?.ip || 
                      httpContext?.req?.connection?.remoteAddress ||
                      httpContext?.req?.socket?.remoteAddress ||
                      (httpContext?.req?.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
                      (httpContext?.req?.headers?.['x-real-ip'] as string) ||
                      '127.0.0.1';

        // Capturar User-Agent EXATAMENTE como nas prescrições  
        const userAgent = httpContext?.req?.get?.('User-Agent') || 
                         httpContext?.req?.headers?.['user-agent'] || 
                         'unknown';

        console.log('🔍 AUDIT DEBUG - IP capturado:', realIP);
        console.log('🔍 AUDIT DEBUG - User-Agent capturado:', userAgent);

        // Usar método direto de audit log COM TODOS OS CAMPOS DE AUDITORIA
        await db.insert(notificationAuditLog).values({
          entityType: 'global_notification',
          entityId: newNotification.id,
          action: 'created',
          patientId: notification.patientId,
          userId: httpContext?.userId || null,
          details: JSON.stringify({ 
            type: notification.type, 
            title: notification.title,
            priority: notification.priority,
            relatedId: notification.relatedId 
          }),
          success: true,
          ipAddress: realIP,
          userAgent: userAgent,
          sessionId: httpContext?.sessionId || httpContext?.req?.session?.id || httpContext?.req?.sessionID || null,
          beforeState: httpContext?.beforeState ? JSON.stringify(httpContext.beforeState) : null,
          afterState: httpContext?.afterState ? JSON.stringify(httpContext.afterState) : JSON.stringify(newNotification),
          processingNode: 'node_primary',
          requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          correlationId: `create_global_notification_${newNotification.id}_${Date.now()}`,
          processingTimeMs: httpContext?.processingStartTime ? Date.now() - httpContext.processingStartTime : null,
          createdAt: new Date()
        });

        console.log('✅ AUDIT DEBUG - Audit log criado diretamente com sucesso');
      } catch (auditError) {
        console.error('❌ AUDIT DEBUG - Erro ao criar audit log direto:', auditError);
      }

      console.log('🎯 DEBUG: Retornando notificação global criada:', {
        id: newNotification.id,
        patientId: newNotification.patientId,
        type: newNotification.type
      });

      return newNotification;

    } catch (insertError) {
      console.error('❌ DEBUG: Erro ao inserir notificação global:', insertError);
      console.error('❌ DEBUG: Dados que falharam:', insertData);
      throw insertError;
    }
  }

  async updateGlobalNotification(id: number, update: Partial<any>): Promise<void> {
    await db
      .update(globalNotifications)
      .set({
        ...update,
        updatedAt: new Date()
      })
      .where(eq(globalNotifications.id, id));
  }

  // Verificar notificação específica por timing para evitar duplicatas
  async hasSpecificNotificationToday(
    patientId: number, 
    type: string,
    relatedId: number,
    timingType: string // "30min_before", "15min_before", "on_time", "15min_overdue", "continuous_overdue"
  ): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Criar deduplicationKey específica para este timing
    const deduplicationPattern = `${type}_${patientId}_${relatedId}_${timingType}_${today.toISOString().split('T')[0]}%`;

    const [result] = await db
      .select({ count: count() })
      .from(globalNotifications)
      .where(
        and(
          eq(globalNotifications.patientId, patientId),
          eq(globalNotifications.type, type),
          eq(globalNotifications.relatedId, relatedId),
          eq(globalNotifications.isActive, true),
          gte(globalNotifications.createdAt, today),
          lte(globalNotifications.createdAt, tomorrow),
          like(globalNotifications.deduplicationKey, deduplicationPattern)
        )
      );

    return (result.count || 0) > 0;
  }

  // Manter compatibilidade com código existente
  async hasActiveGlobalNotificationToday(patientId: number, type: string, relatedId: number): Promise<boolean> {
    return this.hasSpecificNotificationToday(patientId, type, relatedId, "general");
  }

  // USANDO O MESMO PADRÃO DAS OUTRAS TELAS
  async createUserNotification(notification: any): Promise<any> {
    const [newNotification] = await db
      .insert(userNotifications)
      .values(notification)
      .returning();
    return newNotification;
  }

  async getUserNotificationsByUserId(userId: number, limit: number = 50, offset: number = 0): Promise<any[]> {
    try {
      console.log(`🔍 Storage: Buscando notificações para usuário ${userId} (limit: ${limit}, offset: ${offset})`);

      // Primeiro, verificar quantas notificações existem
      const countResult = await db.execute(sql`
        SELECT COUNT(*) as total
        FROM user_notifications un
        INNER JOIN global_notifications gn ON un.global_notification_id = gn.id
        WHERE un.user_id = ${userId} AND gn.is_active = true
      `);

      const totalCount = (countResult.rows[0] as any)?.total || 0;
      console.log(`📊 Storage: Total de notificações encontradas: ${totalCount}`);

      if (totalCount === 0) {
        console.log('⚠️ Storage: Nenhuma notificação encontrada para este usuário');
        return [];
      }

      const result = await db.execute(sql`
        SELECT 
          un.id,
          un.global_notification_id,
          un.user_id,
          un.is_read,
          un.delivery_status,
          un.created_at as user_created_at,
          gn.type,
          gn.title,
          gn.message,
          gn.patient_name,
          gn.related_id,
          gn.priority,
          gn.original_scheduled_time,
          gn.metadata,
          gn.user_id as editor_user_id,
          gn.user_name as editor_user_name,
          gn.is_active as global_is_active,
          gn.created_at as global_created_at
        FROM user_notifications un
        INNER JOIN global_notifications gn ON un.global_notification_id = gn.id
        WHERE un.user_id = ${userId} AND gn.is_active = true
        ORDER BY un.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
      const rows = result.rows as any[];

      console.log(`📊 Storage: Query retornou ${rows.length} notificações`);

      if (rows.length > 0) {
        console.log(`📊 Storage: Primeira notificação detalhada:`, {
          id: rows[0].id,
          globalId: rows[0].global_notification_id,
          type: rows[0].type,
          title: rows[0].title,
          isRead: rows[0].is_read,
          globalActive: rows[0].global_is_active,
          userCreated: rows[0].user_created_at,
          globalCreated: rows[0].global_created_at
        });
      }

      const mappedResults = rows.map(row => {
        // Usar o nome do editor diretamente da coluna user_name da tabela, com fallback para metadata
        let editorName = row.editor_user_name || 'Usuário do sistema';

        // Se não tiver no campo direto, tentar buscar no metadata (dados históricos)
        if (!row.editor_user_name && row.metadata) {
          try {
            const metadata = JSON.parse(row.metadata);
            editorName = metadata.editorName || 'Usuário do sistema';
          } catch (e) {
            // Se erro no parse do JSON, manter valor padrão
          }
        }

        return {
          id: row.id,
          globalNotificationId: row.global_notification_id,
          userId: row.user_id,
          type: row.type || 'system_notification',
          title: row.title || 'Notificação',
          message: row.message || 'Você tem uma nova notificação',
          isRead: row.is_read,
          status: row.delivery_status,
          createdAt: row.user_created_at,
          relatedId: row.related_id,
          scheduledFor: row.original_scheduled_time,
          patientName: row.patient_name,
          priority: row.priority || 'normal',
          editorName: editorName,
          editorUserId: row.editor_user_id
        };
      });

      console.log(`📊 Storage: Retornando ${mappedResults.length} notificações mapeadas`);
      return mappedResults;

    } catch (error) {
      console.error('❌ Erro ao buscar notificações do usuário:', error);
      console.error('❌ Stack trace:', error.stack);
      return [];
    }
  }

  async getUserNotificationSummary(userId: number): Promise<any> {
    const [totalResult] = await db
      .select({ count: count() })
      .from(userNotifications)
      .where(eq(userNotifications.userId, userId));

    const [unreadResult] = await db
      .select({ count: count() })
      .from(userNotifications)
      .where(
        and(
          eq(userNotifications.userId, userId),
          eq(userNotifications.isRead, false)
        )
      );

    return {
      total: totalResult.count || 0,
      unread: unreadResult.count || 0,
      read: (totalResult.count || 0) - (unreadResult.count || 0)
    };
  }

  async markUserNotificationAsRead(notificationId: number): Promise<boolean> {
    try {
      console.log(`🔄 Marcando notificação ${notificationId} como lida...`);

      const [notification] = await db
        .update(userNotifications)
        .set({ 
          isRead: true,
          readAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(userNotifications.id, notificationId))
        .returning();

      if (notification) {
        console.log(`✅ Notificação ${notificationId} marcada como lida com sucesso`);
        return true;
      } else {
        console.log(`⚠️ Notificação ${notificationId} não encontrada`);
        return false;
      }
    } catch (error) {
      console.error('❌ Erro ao marcar notificação como lida:', error);
      return false;
    }
  }

  // ========================================
  // MÉTODOS PARA O SCHEDULER AUTOMÁTICO
  // ========================================

  async getAllActiveMedications(): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT m.*, u.name as patient_name
      FROM medications m
      JOIN users u ON m.patient_id = u.id
      WHERE m.is_active = true
    `);
    return result.rows || [];
  }

  async getMedicationSchedulesToday(medicationId: number): Promise<any[]> {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

    const result = await db.execute(sql`
      SELECT ms.*, m.name as medication_name, m.patient_id
      FROM medication_schedules ms
      JOIN medications m ON ms.medication_id = m.id
      WHERE ms.medication_id = ${medicationId}
      AND ms.is_active = true
    `);

    // Converter scheduled_time (TEXT) para datetime de hoje
    return (result.rows || []).map(row => ({
      ...row,
      scheduledDateTime: new Date(`${todayStr}T${row.scheduled_time}:00`)
    }));
  }

  async getMedicationLogForSchedule(scheduleId: number): Promise<any> {
    const result = await db.execute(sql`
      SELECT * FROM medication_logs 
      WHERE schedule_id = ${scheduleId}
      LIMIT 1
    `);
    return result.rows?.[0] || null;
  }

  async getUpcomingAppointments(): Promise<any[]> {
    const today = new Date();
    const dayAfterTomorrow = new Date(today.getTime() + 48 * 60 * 60 * 1000); // 2 dias para incluir avisos de 24h

    const result = await db.execute(sql`
      SELECT a.*, u.name as patient_name
      FROM appointments a
      JOIN users u ON a.patient_id = u.id
      WHERE a.appointment_date >= ${today}
      AND a.appointment_date <= ${dayAfterTomorrow}
      AND a.status NOT IN ('completed', 'cancelled')
    `);
    return result.rows || [];
  }

  async getUpcomingTests(): Promise<any[]> {
    const today = new Date();
    const dayAfterTomorrow = new Date(today.getTime() + 48 * 60 * 60 * 1000); // 2 dias para incluir avisos de 24h

    const result = await db.execute(sql`
      SELECT t.*, u.name as patient_name
      FROM tests t
      JOIN users u ON t.patient_id = u.id
      WHERE t.test_date >= ${today}
      AND t.test_date <= ${dayAfterTomorrow}
      AND t.status NOT IN ('completed', 'cancelled')
    `);
    return result.rows || [];
  }

  async getAllRecentNotifications(): Promise<any[]> {
    try {
      // Buscar todas as notificações dos últimos 7 dias
      const result = await db.execute(sql`
        SELECT 
          un.id,
          un.global_notification_id as "globalNotificationId",
          un.user_profile_type as "userProfileType", 
          un.user_name as "userName",
          un.access_type as "accessType",
          un.access_level as "accessLevel",
          un.delivery_status as "deliveryStatus",
          un.is_read as "isRead",
          un.delivered_at as "deliveredAt",
          un.read_at as "readAt",
          un.acknowledged_at as "acknowledgedAt",
          un.delivery_method as "deliveryMethod",
          un.delivery_attempts as "deliveryAttempts",
          un.last_delivery_error as "lastDeliveryError",
          un.priority,
          un.expires_at as "expiresAt",
          un.created_at as "createdAt",
          un.updated_at as "updatedAt",
          gn.metadata,
          gn.title,
          gn.message,
          gn.type,
          gn.subtype,
          gn.patient_name as "patientName",
          gn.related_id as "relatedId",
          gn.related_type as "relatedType",
          gn.related_item_name as "relatedItemName"
        FROM user_notifications un
        LEFT JOIN global_notifications gn ON un.global_notification_id = gn.id
        WHERE un.created_at >= NOW() - INTERVAL '7 days'
        ORDER BY un.created_at DESC
        LIMIT 100
      `);

      return result.rows || [];
    } catch (error) {
      console.error('❌ Erro na getAllRecentNotifications:', error);
      return [];
    }
  }

  async getAllUsersWithPatientAccess(patientId: number): Promise<any[]> {
    // 1. O próprio paciente sempre recebe
    const patientAccess = await db
      .select({
        userId: users.id,
        userName: users.name,
        userProfileType: users.profileType,
        accessType: sql<string>`'owner'`,
        accessLevel: sql<string>`'admin'`
      })
      .from(users)
      .where(eq(users.id, patientId));

    // 2. Buscar cuidadores relacionados
    const caregiverAccess = await db
      .select({
        userId: users.id,
        userName: users.name,
        userProfileType: users.profileType,
        accessType: sql<string>`'caregiver'`,
        accessLevel: sql<string>`'write'`
      })
      .from(careRelationships)
      .innerJoin(users, eq(users.id, careRelationships.caregiverId))
      .where(
        and(
          eq(careRelationships.patientId, patientId),
          eq(careRelationships.status, "active")
        )
      );

    // Combinar e remover duplicatas
    const allAccess = [...patientAccess, ...caregiverAccess];
    const uniqueAccess = allAccess.filter((access, index, self) => 
      index === self.findIndex(a => a.userId === access.userId)
    );

    console.log(`👥 Usuários com acesso ao paciente ${patientId}: ${uniqueAccess.length}`);
    return uniqueAccess;
  }

  async getTotalActivePatients(): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.profileType, 'patient'));

    return result.count || 0;
  }

  async getActivePatientsInBatch(offset: number, limit: number): Promise<any[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.profileType, 'patient'))
      .orderBy(asc(users.id))
      .limit(limit)
      .offset(offset);
  }

  async countGlobalNotificationsInPeriod(startDate: Date, endDate: Date): Promise<number> {
    try {
      const [result] = await db
        .select({ count: count() })
        .from(globalNotifications)
        .where(
          and(
            gte(globalNotifications.createdAt, startDate),
            lte(globalNotifications.createdAt, endDate)
          )
        );

      return result.count;
    } catch (error) {
      console.error('❌ Erro contando notificações globais:', error);
      return 0;
    }
  }

  async countDistributedNotificationsInPeriod(startDate: Date, endDate: Date): Promise<number> {
    try {
      const [result] = await db
        .select({ count: count() })
        .from(userNotifications)
        .where(
          and(
            gte(userNotifications.createdAt, startDate),
            lte(userNotifications.createdAt, endDate)
          )
        );

      return result.count;
    } catch (error) {
      console.error('❌ Erro contando notificações distribuídas:', error);
      return 0;
    }
  }

  async countReadNotificationsInPeriod(startDate: Date, endDate: Date): Promise<number> {
    try {
      const [result] = await db
        .select({ count: count() })
        .from(userNotifications)
        .where(
          and(
            eq(userNotifications.isRead, true),
            gte(userNotifications.createdAt, startDate),
            lte(userNotifications.createdAt, endDate)
          )
        );

      return result.count;
    } catch (error) {
      console.error('❌ Erro contando notificações lidas:', error);
      return 0;
    }
  }

  async countNotificationsByTypeInPeriod(type: string, startDate: Date, endDate: Date): Promise<number> {
    try {
      const [result] = await db
        .select({ count: count() })
        .from(globalNotifications)
        .where(
          and(
            eq(globalNotifications.type, type),
            gte(globalNotifications.createdAt, startDate),
            lte(globalNotifications.createdAt, endDate)
          )
        );

      return result.count;
    } catch (error) {
      console.error('❌ Erro contando notificações por tipo:', error);
      return 0;
    }
  }

  async countActivePatientsInPeriod(startDate: Date, endDate: Date): Promise<number> {
    try {
      const [result] = await db
        .select({ count: count() })
        .from(globalNotifications)
        .where(
          and(
            gte(globalNotifications.createdAt, startDate),
            lte(globalNotifications.createdAt, endDate)
          )
        );

      return result.count;
    } catch (error) {
      console.error('❌ Erro contando pacientes ativos:', error);
      return 0;
    }
  }

  async countActiveUsersInPeriod(startDate: Date, endDate: Date): Promise<number> {
    try {
      const [result] = await db
        .select({ count: count() })
        .from(userNotifications)
        .where(
          and(
            gte(userNotifications.createdAt, startDate),
            lte(userNotifications.createdAt, endDate)
          )
        );

      return result.count;
    } catch (error) {
      console.error('❌ Erro contando usuários ativos:', error);
      return 0;
    }
  }

  async getAverageJobProcessingTimeInPeriod(startDate: Date, endDate: Date): Promise<number> {
    try {
      const [result] = await db
        .select({ avgTime: avg(notificationJobs.completedAt) })
        .from(notificationJobs)
        .where(
          and(
            gte(notificationJobs.createdAt, startDate),
            lte(notificationJobs.createdAt, endDate),
            eq(notificationJobs.status, 'completed')
          )
        );

      return result.avgTime ? Number(result.avgTime) : 0;
    } catch (error) {
      console.error('❌ Erro calculando tempo médio:', error);
      return 0;
    }
  }

  async getFailedNotificationsSince(cutoffTime: Date): Promise<any[]> {
    try {
      return await db
        .select()
        .from(userNotifications)
        .where(
          and(
            eq(userNotifications.deliveryStatus, 'failed'),
            gte(userNotifications.createdAt, cutoffTime)
          )
        )
        .limit(100);
    } catch (error) {
      console.error('❌ Erro buscando notificações falhadas:', error);
      return [];
    }
  }

  async getMedicationHistoryByPatient(patientId: number) {
    try {
      const history = await db
        .select({
          id: medicationHistory.id,
          medicationLogId: medicationHistory.medicationLogId,
          medicationId: medicationHistory.medicationId,
          patientId: medicationHistory.patientId,
          scheduledDateTime: medicationHistory.scheduledDateTime,
          actualDateTime: medicationHistory.actualDateTime,
          notes: medicationHistory.notes,
          sideEffects: medicationHistory.sideEffects,
          effectiveness: medicationHistory.effectiveness,
          symptoms: medicationHistory.symptoms,
          additionalInfo: medicationHistory.additionalInfo,
          createdBy: medicationHistory.createdBy,
          createdAt: medicationHistory.createdAt,
          updatedAt: medicationHistory.updatedAt,
          medication: {
            id: medications.id,
            name: medications.name,
            dosage: medications.dosage,
          },
          medicationLog: {
            id: medicationLogs.id,
            status: medicationLogs.status,
            delayMinutes: medicationLogs.delayMinutes,
          }
        })
        .from(medicationHistory)
        .leftJoin(medications, eq(medicationHistory.medicationId, medications.id))
        .leftJoin(medicationLogs, eq(medicationHistory.medicationLogId, medicationLogs.id))
        .where(eq(medicationHistory.patientId, patientId))
        .orderBy(desc(medicationHistory.createdAt));

      return history;
    } catch (error) {
      throw error;
    }
  }

  async getMedicationHistoryByMedication(medicationId: number, patientId: number) {
    try {
      const history = await db
        .select({
          id: medicationHistory.id,
          medicationLogId: medicationHistory.medicationLogId,
          medicationId: medicationHistory.medicationId,
          patientId: medicationHistory.patientId,
          scheduledDateTime: medicationHistory.scheduledDateTime,
          actualDateTime: medicationHistory.actualDateTime,
          notes: medicationHistory.notes,
          sideEffects: medicationHistory.sideEffects,
          effectiveness: medicationHistory.effectiveness,
          symptoms: medicationHistory.symptoms,
          additionalInfo: medicationHistory.additionalInfo,
          createdBy: medicationHistory.createdBy,
          createdAt: medicationHistory.createdAt,
          updatedAt: medicationHistory.updatedAt,
          medication: {
            id: medications.id,
            name: medications.name,
            dosage: medications.dosage,
          },
          medicationLog: {
            id: medicationLogs.id,
            status: medicationLogs.status,
            delayMinutes: medicationLogs.delayMinutes,
          }
        })
        .from(medicationHistory)
        .leftJoin(medications, eq(medicationHistory.medicationId, medications.id))
        .leftJoin(medicationLogs, eq(medicationHistory.medicationLogId, medicationLogs.id))
        .where(
          and(
            eq(medicationHistory.medicationId, medicationId),
            eq(medicationHistory.patientId, patientId)
          )
        )
        .orderBy(desc(medicationHistory.createdAt));

      return history;
    } catch (error) {
      throw error;
    }
  }

  async updateMedicationHistory(historyId: number, data: any) {
    try {
      const result = await db
        .update(medicationHistory)
        .set({ 
          ...data, 
          updatedAt: new Date() // Usar horário UTC padrão
        })
        .where(eq(medicationHistory.id, historyId))
        .returning();
      return result[0];
    } catch (error) {
      throw error;
    }
  }

  async deleteMedicationHistory(historyId: number) {
    try {
      await db.delete(medicationHistory).where(eq(medicationHistory.id, historyId));
      return true;
    } catch (error) {
      return false;
    }
  }

  async markMedicationLogAsTaken(logId: number, userId: number): Promise<MedicationLog | undefined> {
    try {
      const now = new Date();

      const [updatedLog] = await db
        .update(medicationLogs)
        .set({
          status: 'taken',
          actualDateTime: now,
          confirmedBy: userId
        })
        .where(eq(medicationLogs.id, logId))
        .returning();

      return updatedLog || undefined;
    } catch (error) {
      throw error;
    }
  }

  // Medical Data Sharing Methods

  async updateUserShareCode(userId: number, shareCode: string): Promise<void> {
    await db
      .update(users)
      .set({ shareCode })
      .where(eq(users.id, userId));
  }

  async getPatientSharedAccess(patientId: number): Promise<any[]> {
    // Get all caregivers who have access to this patient's data
    const relationships = await db
      .select({
        id: careRelationships.id,
        caregiverId: careRelationships.caregiverId,
        grantedAt: careRelationships.createdAt,
        caregiverName: users.name,
        caregiverEmail: users.email,
        caregiverProfileType: users.profileType
      })
      .from(careRelationships)
      .innerJoin(users, eq(users.id, careRelationships.caregiverId))
      .where(
        and(
          eq(careRelationships.patientId, patientId),
          eq(careRelationships.status, "active")
        )
      )
      .orderBy(desc(careRelationships.createdAt));

    return relationships.map(rel => ({
      id: rel.id,
      patientId,
      caregiverEmail: rel.caregiverEmail,
      caregiverName: rel.caregiverName,
      caregiverProfileType: rel.caregiverProfileType,
      grantedAt: rel.grantedAt,
      permissions: ['read'] // Default permissions
    }));
  }

  async removeSharedAccess(accessId: number, patientId: number): Promise<void> {
    // Remove the care relationship
    await db
      .update(careRelationships)
      .set({ status: "inactive" })
      .where(
        and(
          eq(careRelationships.id, accessId),
          eq(careRelationships.patientId, patientId)
        )
      );
  }

  async useShareCode(shareCode: string, caregiverId: number): Promise<{ success: boolean; message: string; patient?: any }> {
    try {
      // Find the patient with this share code
      const [patient] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.shareCode, shareCode),
            eq(users.profileType, 'patient')
          )
        )
        .limit(1);

      if (!patient) {
        return { success: false, message: "Código de compartilhamento inválido ou expirado" };
      }

      // Check if relationship already exists
      const existingRelationship = await db
        .select()
        .from(careRelationships)
        .where(
          and(
            eq(careRelationships.patientId, patient.id),
            eq(careRelationships.caregiverId, caregiverId),
            eq(careRelationships.status, "active")
          )
        )
        .limit(1);

      if (existingRelationship.length > 0) {
        return { success: false, message: "Você já tem acesso aos dados deste paciente" };
      }

      // Create care relationship
      await this.createCareRelationship(patient.id, caregiverId);

      // Clear the share code (one-time use)
      await db
        .update(users)
        .set({ shareCode: null })
        .where(eq(users.id, patient.id));

      return { 
        success: true, 
        message: "Acesso concedido com sucesso",
        patient: { id: patient.id, name: patient.name, email: patient.email }
      };
    } catch (error) {
      return { success: false, message: "Erro interno do servidor" };
    }
  }

  // Get patients accessible by caregiver
  async getPatientsAccessibleByCaregiverId(caregiverId: number): Promise<any[]> {
    try {
      const result = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          age: users.age,
          profileType: users.profileType,
          photo: users.photo,
        })
        .from(careRelationships)
        .innerJoin(users, eq(users.id, careRelationships.patientId))
        .where(
          and(
            eq(careRelationships.caregiverId, caregiverId),
            eq(careRelationships.status, "active")
          )
        )
        .orderBy(users.name);

      return result;
    } catch (error) {
      console.error('Error getting accessible patients:', error);
      throw error;
    }
  }

  // ⚡ MÉTODO OTIMIZADO: Buscar APENAS dados básicos dos pacientes acessíveis
  async getPatientsAccessibleByCaregiverIdBasic(caregiverId: number): Promise<any[]> {
    try {
      const result = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          photo: users.photo,
          age: users.age,
          profileType: users.profileType,
        })
        .from(careRelationships)
        .innerJoin(users, eq(users.id, careRelationships.patientId))
        .where(
          and(
            eq(careRelationships.caregiverId, caregiverId),
            eq(careRelationships.status, "active")
          )
        )
        .orderBy(users.name);

      return result;
    } catch (error) {
      console.error('Error getting basic accessible patients:', error);
      throw error;
    }
  }

  // Check if caregiver has access to patient
  async checkCareRelationship(patientId: number, caregiverId: number): Promise<boolean> {
    try {
      const relationship = await db
        .select()
        .from(careRelationships)
        .where(
          and(
            eq(careRelationships.patientId, patientId),
            eq(careRelationships.caregiverId, caregiverId),
            eq(careRelationships.status, "active")
          )
        )
        .limit(1);

      return relationship.length > 0;
    } catch (error) {
      console.error('Error checking care relationship:', error);
      return false;
    }
  }

  // Search patients by name or email (for non-patient users)
  async searchPatients(searchQuery: string): Promise<any[]> {
    try {
      const query = `%${searchQuery.toLowerCase()}%`;

      const patients = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          age: users.age,
          profileType: users.profileType,
          photo: users.photo,
        })
        .from(users)
        .where(
          and(
            eq(users.profileType, 'patient'),
            or(
              sql`LOWER(${users.name}) LIKE ${query}`,
              sql`LOWER(${users.email}) LIKE ${query}`
            )
          )
        )
        .limit(10)
        .orderBy(users.name);

      return patients;
    } catch (error) {
      console.error('Error searching patients:', error);
      throw error;
    }
  }

  // Search patients accessible by a specific caregiver (filtered search)
  async searchAccessiblePatients(caregiverId: number, searchQuery: string): Promise<any[]> {
    try {
      const query = `%${searchQuery.toLowerCase()}%`;

      // Only search among patients that this caregiver has access to
      const patients = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          age: users.age,
          profileType: users.profileType,
          photo: users.photo,
        })
        .from(users)
        .innerJoin(careRelationships, eq(careRelationships.patientId, users.id))
        .where(
          and(
            eq(users.profileType, 'patient'),
            eq(careRelationships.caregiverId, caregiverId),
            eq(careRelationships.status, 'active'),
            or(
              sql`LOWER(${users.name}) LIKE ${query}`,
              sql`LOWER(${users.email}) LIKE ${query}`
            )
          )
        )
        .limit(10)
        .orderBy(users.name);

      return patients;
    } catch (error) {
      console.error('Error searching accessible patients:', error);
      throw error;
    }
  }

  // 🗃️ MÉTODO OTIMIZADO: Buscar APENAS dados básicos do paciente
  async getPatientBasicData(patientId: number): Promise<{
    id: number;
    name: string;
    email: string;
    age?: number;
    photo?: string;
    weight?: number;
    profileType: string;
  } | null> {
    try {
      const [patient] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          age: users.age,
          photo: users.photo,
          weight: users.weight,
          profileType: users.profileType,
        })
        .from(users)
        .where(eq(users.id, patientId))
        .limit(1);

      return patient || null;
    } catch (error) {
      console.error('Error getting patient basic data:', error);
      return null;
    }
  }

  // ========================================
  // ENTERPRISE NOTIFICATIONS
  // ========================================

  async markUserNotificationAsRead(notificationId: number): Promise<boolean> {
    try {
      const [notification] = await db
        .update(userNotifications)
        .set({ 
          isRead: true,
          readAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(userNotifications.id, notificationId))
        .returning();

      console.log(`✅ Notificação ${notificationId} marcada como lida`);
      return !!notification;
    } catch (error) {
      console.error('❌ Erro ao marcar notificação como lida:', error);
      return false;
    }
  }

  async getUserNotificationSummary(userId: number): Promise<any> {
    const [totalResult] = await db
      .select({ count: count() })
      .from(userNotifications)
      .where(eq(userNotifications.userId, userId));

    const [unreadResult] = await db
      .select({ count: count() })
      .from(userNotifications)
      .where(
        and(
          eq(userNotifications.userId, userId),
          eq(userNotifications.isRead, false)
        )
      );

    const highPriorityResult = await db
      .select({ count: count() })
      .from(userNotifications)
      .leftJoin(globalNotifications, eq(userNotifications.globalNotificationId, globalNotifications.id))
      .where(
        and(
          eq(userNotifications.userId, userId),
          eq(userNotifications.isRead, false),
          eq(globalNotifications.priority, 'high')
        )
      );

    const criticalResult = await db
      .select({ count: count() })
      .from(userNotifications)
      .leftJoin(globalNotifications, eq(userNotifications.globalNotificationId, globalNotifications.id))
      .where(
        and(
          eq(userNotifications.userId, userId),
          eq(userNotifications.isRead, false),
          eq(globalNotifications.priority, 'critical')
        )
      );

    return {
      total: totalResult[0]?.count || 0,
      unread: unreadResult[0]?.count || 0,
      highPriorityCount: highPriorityResult[0]?.count || 0,
      criticalCount: criticalResult[0]?.count || 0
    };
  }

  async createNotificationJob(job: InsertNotificationJob): Promise<NotificationJob> {
    const [newJob] = await db
      .insert(notificationJobs)
      .values(job)
      .returning();
    return newJob;
  }

  // ========================================
  // MÉTODOS ENTERPRISE ADICIONAIS
  // ========================================

  async getActiveUsersInPeriod(startDate: Date, endDate: Date): Promise<number[]> {
    try {
      const result = await db
        .select({ userId: userNotifications.userId })
        .from(userNotifications)
        .where(
          and(
            gte(userNotifications.createdAt, startDate),
            lte(userNotifications.createdAt, endDate)
          )
        )
        .groupBy(userNotifications.userId);

      return result.map(r => r.userId);
    } catch (error) {
      console.error('❌ Erro ao buscar usuários ativos:', error);
      return [];
    }
  }

  async countUserNotificationsInPeriod(userId: number, startDate: Date, endDate: Date): Promise<number> {
    try {
      const [result] = await db
        .select({ count: count() })
        .from(userNotifications)
        .where(
          and(
            eq(userNotifications.userId, userId),
            gte(userNotifications.createdAt, startDate),
            lte(userNotifications.createdAt, endDate)
          )
        );

      return result.count;
    } catch (error) {
      console.error('❌ Erro contando notificações do usuário:', error);
      return 0;
    }
  }

  async createRateLimit(data: any): Promise<any> {
    try {
      const [rateLimit] = await db
        .insert(notificationRateLimit)
        .values({
          limitType: data.limitType,
          entityId: data.entityId,
          requestCount: data.requestCount,
          windowStart: data.windowStart,
          windowEnd: data.windowEnd,
          maxRequests: data.maxRequests,
          isBlocked: data.isBlocked || false,
          blockedAt: data.isBlocked ? new Date() : null,
          resetAt: data.windowEnd,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      return rateLimit;
    } catch (error) {
      console.error('❌ Erro ao criar rate limit:', error);
      throw error;
    }
  }

  async createNotificationMetric(data: any): Promise<any> {
    try {
      const [metric] = await db
        .insert(notificationMetrics)
        .values({
          metricType: data.metricType,
          date: data.date,
          totalNotificationsCreated: data.totalNotificationsCreated,
          totalNotificationsDistributed: data.totalNotificationsDistributed,
          medicationNotifications: data.medicationNotifications,
          appointmentNotifications: data.appointmentNotifications,
          testNotifications: data.testNotifications,
          avgProcessingTimeMs: data.avgProcessingTimeMs,
          maxProcessingTimeMs: data.maxProcessingTimeMs,
          minProcessingTimeMs: data.minProcessingTimeMs,
          errorRate: data.errorRate,
          additionalData: JSON.stringify(data.additionalData || {}),
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      return metric;
    } catch (error) {
      console.error('❌ Erro ao criar métrica:', error);
      throw error;
    }
  }

  async deleteOldNotificationMetrics(cutoffDate: Date): Promise<number> {
    try {
      const result = await db
        .delete(notificationMetrics)
        .where(lt(notificationMetrics.createdAt, cutoffDate))
        .returning();

      return result.length;
    } catch (error) {
      console.error('❌ Erro ao deletar métricas antigas:', error);
      return 0;
    }
  }

  async updateNotificationJobByJobId(jobId: string, update: Partial<InsertNotificationJob>): Promise<void> {
    await db
      .update(notificationJobs)
      .set(update)
      .where(eq(notificationJobs.jobId, jobId));
  }

  // Health Insurance methods
  async getHealthInsurancesByDoctor(doctorId: number): Promise<HealthInsurance[]> {
    try {
      return await db
        .select()
        .from(healthInsurances)
        .where(eq(healthInsurances.doctorId, doctorId))
        .orderBy(desc(healthInsurances.createdAt));
    } catch (error) {
      console.error('Erro ao buscar convênios do médico:', error);
      return [];
    }
  }

  async getHealthInsuranceById(id: number): Promise<HealthInsurance | undefined> {
    try {
      const [insurance] = await db
        .select()
        .from(healthInsurances)
        .where(eq(healthInsurances.id, id));
      return insurance || undefined;
    } catch (error) {
      console.error('Erro ao buscar convênio por ID:', error);
      return undefined;
    }
  }

  async createHealthInsurance(insurance: InsertHealthInsurance): Promise<HealthInsurance> {
    try {
      const [newInsurance] = await db
        .insert(healthInsurances)
        .values({
          ...insurance,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return newInsurance;
    } catch (error) {
      console.error('Erro ao criar convênio:', error);
      throw error;
    }
  }

  async updateHealthInsurance(id: number, insurance: Partial<InsertHealthInsurance>): Promise<HealthInsurance | undefined> {
    try {
      const [updatedInsurance] = await db
        .update(healthInsurances)
        .set({
          ...insurance,
          updatedAt: new Date()
        })
        .where(eq(healthInsurances.id, id))
        .returning();
      return updatedInsurance || undefined;
    } catch (error) {
      console.error('Erro ao atualizar convênio:', error);
      throw error;
    }
  }

  async deleteHealthInsurance(id: number): Promise<boolean> {
    try {
      await db
        .delete(healthInsurances)
        .where(eq(healthInsurances.id, id));
      return true;
    } catch (error) {
      console.error('Erro ao deletar convênio:', error);
      return false;
    }
  }

  // ========================================
  // PAYMENT METHODS METHODS
  // ========================================

  async getPaymentMethodsByDoctorId(doctorId: number): Promise<PaymentMethod[]> {
    try {
      return await db
        .select()
        .from(paymentMethods)
        .where(eq(paymentMethods.doctorId, doctorId))
        .orderBy(asc(paymentMethods.name));
    } catch (error) {
      console.error('Erro ao buscar formas de pagamento por médico:', error);
      return [];
    }
  }

  async getPaymentMethodById(id: number): Promise<PaymentMethod | undefined> {
    try {
      const [paymentMethod] = await db
        .select()
        .from(paymentMethods)
        .where(eq(paymentMethods.id, id))
        .limit(1);
      return paymentMethod || undefined;
    } catch (error) {
      console.error('Erro ao buscar forma de pagamento por ID:', error);
      return undefined;
    }
  }

  async createPaymentMethod(paymentMethodData: InsertPaymentMethod): Promise<PaymentMethod> {
    try {
      const [newPaymentMethod] = await db
        .insert(paymentMethods)
        .values(paymentMethodData)
        .returning();
      return newPaymentMethod;
    } catch (error) {
      console.error('Erro ao criar forma de pagamento:', error);
      throw error;
    }
  }

  async updatePaymentMethod(id: number, paymentMethodData: Partial<InsertPaymentMethod>): Promise<PaymentMethod | undefined> {
    try {
      const [updatedPaymentMethod] = await db
        .update(paymentMethods)
        .set(paymentMethodData)
        .where(eq(paymentMethods.id, id))
        .returning();
      return updatedPaymentMethod || undefined;
    } catch (error) {
      console.error('Erro ao atualizar forma de pagamento:', error);
      return undefined;
    }
  }

  async deletePaymentMethod(id: number): Promise<boolean> {
    try {
      const result = await db.delete(paymentMethods).where(eq(paymentMethods.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error('Erro ao deletar forma de pagamento:', error);
      return false;
    }
  }
}

export const storage = new DatabaseStorage();