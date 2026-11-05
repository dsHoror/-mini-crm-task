export type UserRole = 'manager' | 'executor'

export type TaskStatus = 'new' | 'in_progress' | 'review' | 'accepted' | 'rework'

export type ProfileRow = {
  id: string
  full_name: string
  role: UserRole
}

export type ObjectRow = {
  id: string
  name: string
  address: string
  created_by: string
  created_at: string
}

export type TaskRow = {
  id: string
  object_id: string
  title: string
  description: string | null
  assignee_id: string | null
  status: TaskStatus
  author_id: string
  created_at: string
  updated_at: string
}

export type TaskStatusHistoryRow = {
  id: string
  task_id: string
  from_status: TaskStatus
  to_status: TaskStatus
  changed_by: string
  comment: string | null
  changed_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow
        Insert: {
          id: string
          full_name: string
          role?: UserRole
        }
        Update: {
          full_name?: string
        }
        Relationships: []
      }
      objects: {
        Row: ObjectRow
        Insert: {
          id?: string
          name: string
          address: string
          created_by?: string
          created_at?: string
        }
        Update: {
          name?: string
          address?: string
        }
        Relationships: []
      }
      tasks: {
        Row: TaskRow
        Insert: {
          id?: string
          object_id: string
          title: string
          description?: string | null
          assignee_id?: string | null
          status?: TaskStatus
          author_id?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          object_id?: string
          title?: string
          description?: string | null
          assignee_id?: string | null
        }
        Relationships: []
      }
      task_status_history: {
        Row: TaskStatusHistoryRow
        Insert: {
          id?: string
          task_id: string
          from_status: TaskStatus
          to_status: TaskStatus
          changed_by: string
          comment?: string | null
          changed_at?: string
        }
        Update: Record<string, never>
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      change_task_status: {
        Args: {
          p_task_id: string
          p_to_status: TaskStatus
          p_comment?: string | null
        }
        Returns: TaskStatusHistoryRow
      }
      is_manager: {
        Args: Record<string, never>
        Returns: boolean
      }
    }
  }
}
