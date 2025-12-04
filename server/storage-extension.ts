// Extensões temporárias para storage enterprise
import { db } from "./db.js";
import { userNotifications } from "../shared/schema.js";
import { eq } from "drizzle-orm";
import type { UserNotification } from "../shared/schema.js";

export async function getUserNotificationById(id: number): Promise<UserNotification | undefined> {
  try {
    const [notification] = await db
      .select()
      .from(userNotifications)
      .where(eq(userNotifications.id, id));
    
    return notification;
  } catch (error) {
    console.error('❌ Erro ao buscar notificação por ID:', error);
    return undefined;
  }
}