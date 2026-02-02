import twilio from "twilio";

// Initialize Twilio client (only if valid credentials provided)
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client =
  accountSid?.startsWith("AC") && authToken
    ? twilio(accountSid, authToken)
    : null;

const FROM_PHONE = process.env.TWILIO_PHONE_NUMBER;

export interface SendSmsParams {
  to: string;
  message: string;
}

export async function sendSms(params: SendSmsParams): Promise<boolean> {
  try {
    if (!client || !FROM_PHONE) {
      console.warn("Twilio not configured. SMS not sent:", params.message.substring(0, 50));
      return false;
    }

    // Ensure phone number is in E.164 format
    const toNumber = params.to.startsWith("+") ? params.to : `+${params.to}`;

    await client.messages.create({
      body: params.message,
      from: FROM_PHONE,
      to: toNumber,
    });

    return true;
  } catch (error) {
    console.error("Failed to send SMS:", error);
    throw error;
  }
}

// SMS templates
export function checkInReminderSms(userName: string, checkInUrl: string): string {
  return `Eternal Sentinel: Hi ${userName}, please confirm you're OK by visiting: ${checkInUrl}`;
}

export function escalationWarningSms(
  userName: string,
  missedCount: number,
  checkInUrl: string
): string {
  return `URGENT Eternal Sentinel: ${userName}, you've missed ${missedCount} check-ins. Confirm you're OK now: ${checkInUrl}`;
}

export function trusteeNotificationSms(
  trusteeName: string,
  userName: string,
  accessUrl: string
): string {
  return `Eternal Sentinel: ${trusteeName}, you've been granted access to ${userName}'s digital vault. Visit: ${accessUrl}`;
}
