/**
 * Message Prioritizer
 * Stabilizes feedback messages by prioritizing and debouncing
 */

import { FeedbackPriority } from './cprRules';

export interface PrioritizedMessage {
  message: string;
  color: 'green' | 'orange' | 'red';
  priority: FeedbackPriority;
  timestamp: number;
}

class MessagePrioritizer {
  private currentMessage: PrioritizedMessage | null = null;
  private messageQueue: PrioritizedMessage[] = [];
  private lastUpdateTime: number = 0;
  private readonly DEBOUNCE_MS = 4000; // Minimum time before changing message (increased to slow down warnings)
  private readonly MIN_PRIORITY_TO_OVERRIDE = FeedbackPriority.HIGH;

  /**
   * Add a new message to the queue
   */
  addMessage(message: string, color: 'green' | 'orange' | 'red', priority: FeedbackPriority): PrioritizedMessage {
    const prioritizedMessage: PrioritizedMessage = {
      message,
      color,
      priority,
      timestamp: Date.now(),
    };

    // If no current message, set it immediately
    if (!this.currentMessage) {
      this.currentMessage = prioritizedMessage;
      this.lastUpdateTime = Date.now();
      return prioritizedMessage;
    }

    // If new message has higher priority and enough time has passed, update immediately
    const timeSinceLastUpdate = Date.now() - this.lastUpdateTime;
    if (
      priority > this.currentMessage.priority &&
      priority >= this.MIN_PRIORITY_TO_OVERRIDE &&
      timeSinceLastUpdate > 2000 // Shorter debounce for critical messages (still slower)
    ) {
      this.currentMessage = prioritizedMessage;
      this.lastUpdateTime = Date.now();
      return prioritizedMessage;
    }

    // Otherwise, add to queue
    this.messageQueue.push(prioritizedMessage);
    
    // Sort queue by priority (higher first)
    this.messageQueue.sort((a, b) => b.priority - a.priority);

    // Check if we should update (debounce period passed)
    if (timeSinceLastUpdate > this.DEBOUNCE_MS) {
      return this.updateFromQueue();
    }

    return this.currentMessage;
  }

  /**
   * Update message from queue if debounce period has passed
   */
  updateFromQueue(): PrioritizedMessage {
    const timeSinceLastUpdate = Date.now() - this.lastUpdateTime;

    if (timeSinceLastUpdate > this.DEBOUNCE_MS && this.messageQueue.length > 0) {
      // Get highest priority message from queue
      const nextMessage = this.messageQueue.shift()!;
      
      // Only update if it's different or higher priority
      if (
        !this.currentMessage ||
        nextMessage.priority > this.currentMessage.priority ||
        nextMessage.message !== this.currentMessage.message
      ) {
        this.currentMessage = nextMessage;
        this.lastUpdateTime = Date.now();
        
        // Clear queue of old messages (keep only recent ones)
        this.messageQueue = this.messageQueue.filter(
          (msg) => Date.now() - msg.timestamp < 3000
        );
      }
    }

    return this.currentMessage || {
      message: 'Waiting for compressions...',
      color: 'green',
      priority: FeedbackPriority.NONE,
      timestamp: Date.now(),
    };
  }

  /**
   * Get current message
   */
  getCurrentMessage(): PrioritizedMessage {
    if (this.currentMessage) {
      return this.updateFromQueue();
    }
    return {
      message: 'Waiting for compressions...',
      color: 'green',
      priority: FeedbackPriority.NONE,
      timestamp: Date.now(),
    };
  }

  /**
   * Reset prioritizer
   */
  reset(): void {
    this.currentMessage = null;
    this.messageQueue = [];
    this.lastUpdateTime = 0;
  }
}

// Export singleton instance
export const messagePrioritizer = new MessagePrioritizer();

