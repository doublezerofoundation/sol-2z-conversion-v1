import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import Config from "./config";

const snsClient = new SNSClient({});

export interface ErrorNotificationData {
     signature: string;
     errorName: string;
     slot: number;
     timestamp: number;
     logMessages: string[];
}

export async function sendErrorNotification(data: ErrorNotificationData): Promise<void> {
     try {
          // Skip if no SNS topic is configured
          if (!Config.SNS_ERROR_TOPIC_ARN) {
               console.log(`No SNS topic configured, skipping error notification for ${data.signature}`);
               return;
          }

          const message = formatErrorMessage(data);
          
          const command = new PublishCommand({
               TopicArn: Config.SNS_ERROR_TOPIC_ARN,
               Subject: `🚨 DoubleZero Transaction Error - ${data.errorName}`,
               Message: message,
          });

          await snsClient.send(command);
          console.log(`Error notification sent for transaction ${data.signature}`);
     } catch (error) {
          console.error(`Failed to send error notification for ${data.signature}:`, error);
     }
}

function formatErrorMessage(data: ErrorNotificationData): string {
     const date = new Date(data.timestamp * 1000).toISOString();
     
     return `
          🚨 Transaction Processing Error Alert

          Transaction Details:
          • Signature: ${data.signature}
          • Error: ${data.errorName}
          • Slot: ${data.slot}
          • Timestamp: ${date}

          Log Messages:
          ${data.logMessages.map(log => `• ${log}`).join('\n')}

          ---
          This is an automated alert from the DoubleZero indexer service.
          Please investigate this transaction error promptly.
     `.trim();
}
