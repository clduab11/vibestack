import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'habits',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'icon', type: 'string' },
        { name: 'color', type: 'string' },
        { name: 'frequency_type', type: 'string' }, // daily, weekly, custom
        { name: 'frequency_days', type: 'string' }, // JSON array
        { name: 'reminder_time', type: 'number', isOptional: true },
        { name: 'streak_current', type: 'number' },
        { name: 'streak_best', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'last_completed_at', type: 'number', isOptional: true },
        { name: 'is_archived', type: 'boolean' },
        { name: 'sync_status', type: 'string' }, // pending, synced, error
        { name: 'version', type: 'number' }
      ]
    }),
    
    tableSchema({
      name: 'habit_completions',
      columns: [
        { name: 'habit_id', type: 'string', isIndexed: true },
        { name: 'completed_at', type: 'number' },
        { name: 'note', type: 'string', isOptional: true },
        { name: 'mood', type: 'string', isOptional: true },
        { name: 'duration_minutes', type: 'number', isOptional: true },
        { name: 'sync_status', type: 'string' }
      ]
    }),
    
    tableSchema({
      name: 'sync_queue',
      columns: [
        { name: 'operation_type', type: 'string' }, // create, update, delete
        { name: 'resource_type', type: 'string' }, // habit, completion, etc
        { name: 'resource_id', type: 'string' },
        { name: 'payload', type: 'string' }, // JSON
        { name: 'retry_count', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'last_attempt_at', type: 'number', isOptional: true },
        { name: 'error', type: 'string', isOptional: true }
      ]
    }),
    
    tableSchema({
      name: 'ai_conversations',
      columns: [
        { name: 'personality_type', type: 'string' },
        { name: 'message', type: 'string' },
        { name: 'response', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'user_mood', type: 'string', isOptional: true },
        { name: 'context', type: 'string', isOptional: true } // JSON
      ]
    }),
    
    tableSchema({
      name: 'cached_data',
      columns: [
        { name: 'key', type: 'string', isIndexed: true },
        { name: 'value', type: 'string' }, // JSON
        { name: 'expires_at', type: 'number' },
        { name: 'created_at', type: 'number' }
      ]
    }),
    
    tableSchema({
      name: 'challenges',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'habit_id', type: 'string' },
        { name: 'start_date', type: 'number' },
        { name: 'end_date', type: 'number' },
        { name: 'participants', type: 'string' }, // JSON array
        { name: 'creator_id', type: 'string' },
        { name: 'type', type: 'string' }, // individual, team
        { name: 'status', type: 'string' }, // upcoming, active, completed
        { name: 'sync_status', type: 'string' }
      ]
    }),
    
    tableSchema({
      name: 'friends',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'user_id', type: 'string' },
        { name: 'profile_data', type: 'string' }, // JSON
        { name: 'friendship_status', type: 'string' }, // pending, accepted
        { name: 'connected_at', type: 'number' },
        { name: 'sync_status', type: 'string' }
      ]
    }),
    
    tableSchema({
      name: 'notifications',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'type', type: 'string' },
        { name: 'title', type: 'string' },
        { name: 'message', type: 'string' },
        { name: 'data', type: 'string', isOptional: true }, // JSON
        { name: 'created_at', type: 'number' },
        { name: 'read_at', type: 'number', isOptional: true },
        { name: 'sync_status', type: 'string' }
      ]
    })
  ]
});