import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const notificationQueue = new Queue('notifications', {
  connection: connection as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
});

export async function sendNotification(data: {
  type: 'sms' | 'email' | 'push';
  recipient: string;
  message: string;
  metadata?: any;
}) {
  await notificationQueue.add('send-notification', data);
}

// Note: This worker should ideally run in a separate process
// but we're defining it here for demonstration.
export const startNotificationWorker = () => {
  const worker = new Worker(
    'notifications',
    async (job: Job) => {
      const { type, recipient, message } = job.data;
      console.log(`Processing ${type} to ${recipient}: ${message}`);
      
      // Implement actual sending logic here
      if (type === 'sms') {
        // call SMS gateway
      } else if (type === 'email') {
        // call Email service (SendGrid, Postmark, etc.)
      }
      
      return { success: true };
    },
    { connection: connection as any }
  );

  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed!`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed with ${err.message}`);
  });
};
